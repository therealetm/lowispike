/* LOWiSPIKE feedback, pure core (Nov 5 2026). No DOM, no network: the rules feedback.js and the tests share.

   Emmanuel: "Add a feedback form in Settings ... so the admin can easily export and copy the feedback for the developer",
   "Highlight the voice note ... that's basically what most people would want to choose because it's very simple", "let's say they
   took seven screenshots or even more ... they should be able to flip through the pictures as they're talking", "a Transcribe all
   button and then Copy all transcribed", "saves and bundles all the images ... so you will know exactly what user said what",
   "They can choose to be anonymous."

   Backend: public.app_feedback + the private 'feedback' bucket (supabase/proposals/feedback_20261105.sql); transcripts come from
   supabase/functions/feedback-transcribe (owner only, only when the owner presses Transcribe).
   Every submission has a stable reference (FB-1A2B3C4D, from its id) that names its folder in the package, so a developer always
   knows which screenshots and which voice note belong to which feedback, however many times it is exported. */
(function (root) {
    'use strict';
    const MAX_SHOTS = 30, MAX_VOICE = 300, MAX_TEXT = 4000, SHOT_EDGE = 1600, SHOT_Q = 0.82;
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    /* a random folder key for one submission: never an account id, so an anonymous sender's files point to no one */
    function newKey(rand) {
        let r = typeof rand === 'function' ? rand : null;
        if (!r && root && root.crypto && root.crypto.getRandomValues) { const b = new Uint32Array(24); root.crypto.getRandomValues(b); let i = 0; r = () => b[i++] / 4294967296; }
        if (!r) r = Math.random;
        let s = '';
        for (let i = 0; i < 24; i++) s += '0123456789abcdefghijklmnopqrstuvwxyz'[Math.floor(r() * 36) % 36];
        return s;
    }
    const shotPath = (key, i) => 'fb/' + key + '/shot-' + (i + 1) + '.jpg';
    const voiceExt = type => { const t = String(type || ''); return /webm/.test(t) ? 'webm' : /ogg/.test(t) ? 'ogg' : /aac/.test(t) ? 'aac' : 'm4a'; };
    const voicePath = (key, type) => 'fb/' + key + '/voice.' + voiceExt(type);
    const PATH_SHOT = /^fb\/[0-9a-z-]{8,40}\/shot-[0-9]{1,2}\.jpg$/, PATH_VOICE = /^fb\/[0-9a-z-]{8,40}\/voice\.(m4a|webm|ogg|aac)$/;

    /* the row the app inserts; the server sets the account, the name (from the profile), the time and the flood guard itself */
    function row(d) {
        d = d || {};
        const anon = !!d.anonymous, msg = String(d.message || '').trim().slice(0, MAX_TEXT);
        const shots = (d.shots || []).filter(p => PATH_SHOT.test(p)).slice(0, MAX_SHOTS);
        const voice = d.voicePath && PATH_VOICE.test(d.voicePath) ? d.voicePath : null;
        const out = {
            anonymous: anon, message: msg || null,
            voice_path: voice, voice_secs: voice ? Math.max(0, Math.min(600, Math.round(+d.voiceSecs || 0))) : null,
            shots, lang: String(d.lang || 'en').slice(0, 8), app_version: String(d.version || '').slice(0, 40) || null,
            device: anon ? null : (String(d.device || '').slice(0, 200) || null)
        };
        return out;
    }
    const ready = d => !!(d && (String(d.message || '').trim() || d.voice || (d.shots && d.shots.length)));

    /* why a call failed, so the UI can say something useful (and keep the draft) */
    function classify(err, status) {
        const e = err || {}, code = String(e.code || ''), msg = String(e.message || e.error || e || '');
        const st = +status || +e.status || +e.statusCode || 0;
        if (/rate_limited/i.test(msg) || st === 429) return 'limit';
        if (/feedback_file_missing|bad_shot_path|bad_voice_path/i.test(msg)) return 'files';
        if (st === 413 || /too large|exceeded the maximum|Payload too large|too_big/i.test(msg)) return 'size';
        if (code === 'PGRST205' || code === '42P01' || /Bucket not found|could not find the table|does not exist/i.test(msg) || st === 404) return 'missing';
        if (code === '42501' || st === 401 || st === 403 || /not_signed_in|row-level security|not_owner/i.test(msg)) return 'denied';
        if (/Failed to fetch|NetworkError|network|offline|timeout|Load failed/i.test(msg)) return 'offline';
        return 'error';
    }

    /* Nov 5 mic fix. What a failed voice-note start means, so the sheet never blames phone settings for something else.
       name: the error name from getUserMedia; perm: 'granted' | 'denied' | 'prompt' | null (unknown, from the Permissions API);
       fails: how many NotAllowed refusals in a row this sheet has seen (this one included).
       'denied' only when the browser says denied, or when it is unknown and the same tap was refused twice in a row;
       'ask' when iPhone refused without showing its question (the person never said no): tap again;
       'busy' another app holds it; 'none' no microphone; 'old' this browser cannot record. */
    function micError(name, perm, fails) {
        const n = String(name || '');
        if (/NotFound|DevicesNotFound/.test(n)) return 'none';
        if (/NotReadable|TrackStart|Abort/.test(n)) return 'busy';
        if (/NotSupported|TypeError|InvalidState|Security|Overconstrained|Constraint/.test(n)) return 'old';
        if (/NotAllowed|PermissionDenied/.test(n)) {
            if (perm === 'denied') return 'denied';
            if (perm === 'granted' || perm === 'prompt') return 'ask';
            return (+fails || 0) >= 2 ? 'denied' : 'ask';
        }
        return 'ask';
    }
    /* where to switch the microphone back on, by setup: 'iosApp' (the App Store wrapper: iPhone Settings > LOWiSPIKE),
       'iosWeb' (Home Screen web app or Safari: the microphone belongs to Safari, so LOWiSPIKE is not listed under
       Privacy > Microphone), 'web' (any other browser) */
    function micSetup(ua, native, touchPoints) {
        if (native) return 'iosApp';
        const u = String(ua || '');
        if (/iPhone|iPad|iPod/.test(u) || (/Macintosh/.test(u) && (+touchPoints || 0) > 1)) return 'iosWeb';
        return 'web';
    }
    /* the upload type for a recording: always one the 'feedback' bucket accepts (audio/mp4 is what iPhone records) */
    function voiceType(t) {
        const s = String(t || '').split(';')[0].trim().toLowerCase();
        if (/webm/.test(s)) return 'audio/webm';
        if (/ogg|opus/.test(s)) return 'audio/ogg';
        if (/aac/.test(s)) return 'audio/aac';
        return 'audio/mp4';
    }
    /* MediaRecorder formats to try, best first. iPhone Safari records audio/mp4 only; asking it for webm makes the recorder
       throw, so each option is only used when the browser says it can, and a plain recorder (browser default) is last. */
    function recOptions(isSupported) {
        const ok = m => { try { return !!(isSupported && isSupported(m)); } catch (e) { return false; } };
        const out = [];
        ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'].forEach(m => { if (ok(m)) { out.push({ mimeType: m, audioBitsPerSecond: 64000 }); out.push({ mimeType: m }); } });
        out.push({ audioBitsPerSecond: 64000 });
        out.push(null);
        return out;
    }

    /* the person a row came from, as the owner sees it */
    const who = (r, anonLabel) => r && r.anonymous ? (anonLabel || 'Anonymous') : (String(r && r.name || '').trim() || (r && r.user_id ? 'User ' + String(r.user_id).slice(0, 8) : (anonLabel || 'Anonymous')));
    const pad = n => (n < 10 ? '0' : '') + n;
    function stamp(iso) {
        const d = new Date(iso);
        if (isNaN(d)) return '';
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }
    const slug = s => String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'x';
    /* stable reference of one submission: FB- + the first 8 characters of its id. It never changes, unlike a list position */
    function ref(r) {
        const id = String(r && r.id || '').replace(/[^0-9a-f]/gi, '');
        return 'FB-' + (id.slice(0, 8).toUpperCase() || '00000000');
    }
    function label(r, i, anonLabel) { return ref(r) + ' ' + who(r, anonLabel); }
    /* folder in the package: date first so it sorts by time, then the reference, then who sent it */
    function folder(r, i, anonLabel) {
        const d = new Date(r && r.created_at);
        const day = isNaN(d) ? '' : d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + '_';
        return day + ref(r) + '_' + slug(who(r, anonLabel));
    }
    const shotName = (r, i, k, anonLabel) => folder(r, i, anonLabel) + '/screenshot-' + String(k + 1).padStart(2, '0') + '.jpg';
    const voiceName = (r, i, anonLabel) => folder(r, i, anonLabel) + '/voice-note.' + voiceExt((String(r && r.voice_path || '').split('.').pop()));

    /* feedback.json in the package: the same entries as data, with the file names inside the package */
    function manifest(rows, opt) {
        opt = opt || {};
        const A = opt.anon || 'Anonymous';
        return {
            app: 'LOWiSPIKE', exported_at: opt.when ? new Date(opt.when).toISOString() : new Date().toISOString(), count: rows.length,
            feedback: rows.map((r, i) => ({
                ref: ref(r), id: r.id || null, created_at: r.created_at || null, from: who(r, A), anonymous: !!r.anonymous,
                user_id: r.anonymous ? null : (r.user_id || null), status: r.status || 'new', lang: r.lang || null, app_version: r.app_version || null,
                device: r.anonymous ? null : (r.device || null), text: r.message || null,
                voice_note: r.voice_path ? { file: voiceName(r, i, A), seconds: r.voice_secs || 0 } : null,
                transcript: String(r.transcript || '').trim() || null, transcript_by: r.transcript_by || null,
                screenshots: (Array.isArray(r.shots) ? r.shots : []).map((_, k) => shotName(r, i, k, A))
            }))
        };
    }
    /* move one screenshot left (-1) or right (+1); the order the sender chose is the order they talk about them */
    function move(list, i, dir) {
        const a = (list || []).slice(), j = i + dir;
        if (i < 0 || i >= a.length || j < 0 || j >= a.length) return a;
        const t = a[i]; a[i] = a[j]; a[j] = t;
        return a;
    }

    /* "Copy all": one plain text a developer can read, every entry with who, when, text, transcript and the names of its pictures */
    function exportText(rows, opt) {
        opt = opt || {};
        const A = opt.anon || 'Anonymous', L = opt.labels || {};
        const lines = [(L.head || 'LOWiSPIKE feedback') + ' (' + rows.length + ')', ''];
        rows.forEach((r, i) => {
            const idx = i;
            lines.push('--- ' + label(r, idx, A) + ' · ' + stamp(r.created_at) + (r.app_version ? ' · v' + r.app_version : '') + (r.lang ? ' · ' + r.lang : '') + ' ---');
            if (r.message) lines.push((L.text || 'Text') + ': ' + String(r.message).trim());
            if (r.voice_path) {
                const tr = String(r.transcript || '').trim();
                lines.push((L.voice || 'Voice note') + ' (' + (r.voice_secs || 0) + ' s): ' + (tr ? tr : '[' + (L.noTr || 'not transcribed yet') + ']'));
            }
            const shots = Array.isArray(r.shots) ? r.shots : [];
            if (shots.length) lines.push((L.shots || 'Screenshots') + ' (' + shots.length + '): ' + shots.map((_, k) => shotName(r, idx, k, A)).join(', '));
            if (r.voice_path) lines.push((L.voiceFile || 'Voice file') + ': ' + voiceName(r, idx, A));
            if (r.device && !r.anonymous) lines.push((L.device || 'Device') + ': ' + r.device);
            lines.push('');
        });
        return lines.join('\n').trim() + '\n';
    }
    const needsTranscript = r => !!(r && r.voice_path && !String(r.transcript || '').trim());

    /* "Save all": a plain zip (stored, no compression: JPEG and audio are compressed already) built in the browser */
    let CRC = null;
    function crc32(u8) {
        if (!CRC) { CRC = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; } }
        let c = 0xFFFFFFFF;
        for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
        return (c ^ 0xFFFFFFFF) >>> 0;
    }
    function utf8(s) { return typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(s) : Uint8Array.from(Buffer.from(s, 'utf8')); }
    /* files = [{ name, data: Uint8Array }] -> Uint8Array of a .zip */
    function zip(files, when) {
        const d = when instanceof Date ? when : new Date();
        const dt = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF;
        const dd = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
        const parts = [], central = [];
        let off = 0;
        for (const f of files) {
            const name = utf8(f.name), data = f.data, crc = crc32(data);
            const h = new DataView(new ArrayBuffer(30));
            h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
            h.setUint16(10, dt, true); h.setUint16(12, dd, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true);
            h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
            parts.push(new Uint8Array(h.buffer), name, data);
            const c = new DataView(new ArrayBuffer(46));
            c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
            c.setUint16(12, dt, true); c.setUint16(14, dd, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
            c.setUint16(28, name.length, true); c.setUint32(42, off, true);
            central.push(new Uint8Array(c.buffer), name);
            off += 30 + name.length + data.length;
        }
        const cSize = central.reduce((n, p) => n + p.length, 0);
        const e = new DataView(new ArrayBuffer(22));
        e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
        e.setUint32(12, cSize, true); e.setUint32(16, off, true);
        const all = parts.concat(central, [new Uint8Array(e.buffer)]);
        const out = new Uint8Array(all.reduce((n, p) => n + p.length, 0));
        let p = 0;
        for (const a of all) { out.set(a, p); p += a.length; }
        return out;
    }
    /* fit a screenshot inside SHOT_EDGE x SHOT_EDGE, never larger than it was */
    function fit(w, h, edge) {
        const m = edge || SHOT_EDGE, s = Math.min(1, m / Math.max(1, w, h));
        return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
    }
    const mmss = s => { s = Math.max(0, Math.floor(+s || 0)); return Math.floor(s / 60) + ':' + pad(s % 60); };

    /* Nov 5 2026 (Emmanuel: "I can't delete it. I should be able to delete it so it's deleted completely ... it doesn't fill up memory
       or space or storage ... a simple delete or delete all"). The files of some feedback rows: their voice notes and screenshots in the
       private 'feedback' bucket, each once; only names of the form the server itself accepts (fb/<key>/shot-N.jpg | voice.*). */
    const FILE_RE = /^fb\/[0-9a-z-]{8,40}\/(shot-[0-9]{1,2}\.jpg|voice\.(m4a|webm|ogg|aac))$/;
    function filesOf(rows) {
        const out = [], seen = new Set();
        (rows || []).forEach(r => {
            if (!r) return;
            [r.voice_path].concat(Array.isArray(r.shots) ? r.shots : []).forEach(p => { if (typeof p === 'string' && FILE_RE.test(p) && !seen.has(p)) { seen.add(p); out.push(p); } });
        });
        return out;
    }
    /* delete feedback for good: the files first, then the rows (the owner's delete rights: supabase/proposals/feedback_20261105.sql),
       so no file is ever left behind that nobody can reach any more. signed = the files known to exist (the inbox signed links to
       them): if some exist and the bucket deleted none, the owner has no delete right on it and nothing is deleted. The rows come
       back from the delete, so a row the server kept (no delete right) is never counted as gone.
       -> { ok, rows, files, ids, why ('denied' | 'missing' | 'offline' | ...), stage ('files' | 'rows') } */
    async function removeAll(sb, rows, signed) {
        rows = (rows || []).filter(r => r && r.id);
        if (!rows.length) return { ok: true, rows: 0, files: 0, ids: [] };
        if (!sb) return { ok: false, rows: 0, files: 0, ids: [], why: 'offline', stage: 'files' };
        const paths = filesOf(rows);
        let files = 0;
        for (let i = 0; i < paths.length; i += 100) {
            let r;
            try { r = await sb.storage.from('feedback').remove(paths.slice(i, i + 100)); } catch (e) { r = { error: e }; }
            if (!r || r.error) return { ok: false, rows: 0, files, ids: [], why: classify(r && r.error), stage: 'files' };
            files += Array.isArray(r.data) ? r.data.length : 0;
        }
        const known = signed && typeof signed.has === 'function' ? paths.filter(p => signed.has(p)).length : 0;
        if (known && !files) return { ok: false, rows: 0, files: 0, ids: [], why: 'denied', stage: 'files' };
        let r;
        try { r = await sb.from('app_feedback').delete().in('id', rows.map(x => x.id)).select('id'); } catch (e) { r = { error: e }; }
        if (!r || r.error) return { ok: false, rows: 0, files, ids: [], why: classify(r && r.error), stage: 'rows' };
        const ids = (Array.isArray(r.data) ? r.data : []).map(x => x && x.id).filter(Boolean);
        if (!ids.length) return { ok: false, rows: 0, files, ids: [], why: 'denied', stage: 'rows' };
        return { ok: true, rows: ids.length, files, ids };
    }

    const api = { MAX_SHOTS, MAX_VOICE, MAX_TEXT, SHOT_EDGE, SHOT_Q, UUID, filesOf, removeAll, newKey, shotPath, voicePath, voiceExt, row, ready, classify, who, stamp, ref, label, folder, shotName, voiceName, exportText, manifest, move, needsTranscript, crc32, zip, fit, mmss, micError, micSetup, voiceType, recOptions, PATH_SHOT, PATH_VOICE };
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.LowiFeedbackCore = api;
})(typeof window !== 'undefined' ? window : null);
