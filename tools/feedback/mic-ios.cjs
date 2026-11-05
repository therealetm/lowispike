/* Feedback voice note on an iPhone-like WebKit (Nov 5 2026 mic fix). Real app from a folder, iPhone 13 WebKit (Safari engine),
   a fake signed-in cloud client (records uploads and the row, nothing leaves the machine).
   iPhone behaviour stand-ins, installed in the page (this Linux WebKit build has no MediaRecorder and no audio session):
   - navigator.audioSession with a type; getUserMedia refuses at once, WITHOUT asking, while the type is 'ambient' (what iPhone
     WebKit does: ambient has no microphone input). Otherwise the first call "asks" (counted as one Allow-microphone prompt).
   - navigator.permissions.query({name:'microphone'}) answers with the simulated state.
   - MediaRecorder like iPhone Safari: only audio/mp4; any other mimeType throws NotSupportedError.
   The microphone stream itself is a real WebKit MediaStream (an oscillator). Taps are real touch taps.
   Usage: node tools/feedback/mic-ios.cjs [--root DIR] [--before] [outdir]
   --before: only the reproduction of the owner's screenshot (used against the old code). */
'use strict';
process.env.SIM_REDUCED_MOTION = process.env.SIM_REDUCED_MOTION || '1';
const H = require('../sim/harness.cjs'), fs = require('fs'), path = require('path');
const argv = process.argv.slice(2), opt = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const ROOT = opt('--root'), BEFORE = argv.includes('--before');
const OUT = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--root')[0] || '/tmp/fbk-mic-shots';
fs.mkdirSync(OUT, { recursive: true });
const ok = [], bad = [];
const check = (c, m) => { (c ? ok : bad).push(m); console.log((c ? 'ok   ' : 'FAIL ') + m); };

const IOS = () => {
    const log = window.__ios = { prompts: 0, gum: 0, typeAtGum: [], perm: 'prompt', answer: 'allow', gumError: null, mrRejectOpts: false, recorders: [], uploads: [], inserts: [] };
    let type = 'auto';
    const as = { get type() { return type; }, set type(v) { type = String(v); } };
    /* on the prototypes: WebKit can drop properties set on the navigator.mediaDevices wrapper object (seen in this sim) */
    Object.defineProperty(Navigator.prototype, 'audioSession', { configurable: true, get: () => as });
    const realQ = Permissions.prototype.query;
    Permissions.prototype.query = function (d) { return (d && d.name === 'microphone') ? Promise.resolve({ state: log.perm }) : realQ.call(this, d); };
    MediaDevices.prototype.getUserMedia = async () => {
        log.gum++; log.typeAtGum.push(type);
        if (log.gumError) throw new DOMException('simulated', log.gumError);
        if (type === 'ambient') throw new DOMException('The request is not allowed by the user agent or the platform in the current context.', 'NotAllowedError');
        if (log.perm === 'denied') throw new DOMException('denied', 'NotAllowedError');
        if (log.perm === 'prompt') { log.prompts++; if (log.answer !== 'allow') { log.perm = 'denied'; throw new DOMException('denied', 'NotAllowedError'); } log.perm = 'granted'; }
        const ac = new AudioContext(), o = ac.createOscillator(), d = ac.createMediaStreamDestination(); o.frequency.value = 440; o.connect(d); o.start(); window.__micAc = ac;
        return d.stream;
    };
    class MR {
        static isTypeSupported(m) { return /^(audio|video)\/mp4/.test(String(m)); }
        constructor(stream, o) {
            if (o && o.mimeType && !MR.isTypeSupported(o.mimeType)) throw new DOMException('unsupported', 'NotSupportedError');
            if (o && log.mrRejectOpts) throw new DOMException('options', 'NotSupportedError');
            if (!stream || !stream.getAudioTracks || !stream.getAudioTracks().length) throw new DOMException('no track', 'NotSupportedError');
            this.stream = stream; this.mimeType = 'audio/mp4'; this.state = 'inactive'; this.ondataavailable = null; this.onstop = null; this.onerror = null;
            log.recorders.push(o || null);
        }
        start(ts) { if (this.state !== 'inactive') throw new DOMException('state', 'InvalidStateError'); this.state = 'recording'; this._t = setInterval(() => this._emit(), ts || 1000); }
        _emit() { const live = this.stream.getAudioTracks()[0]; const b = new Blob([new Uint8Array(live && live.readyState === 'live' ? 6000 : 10)], { type: 'audio/mp4' }); if (this.ondataavailable) this.ondataavailable({ data: b }); }
        stop() { if (this.state === 'inactive') return; clearInterval(this._t); this._emit(); this.state = 'inactive'; setTimeout(() => { if (this.onstop) this.onstop({}); }, 10); }
    }
    window.MediaRecorder = MR;
    const q = () => { const b = { select() { return b; }, order() { return b; }, limit() { return Promise.resolve({ data: [], error: null }); }, insert(r) { log.inserts.push(r); return Promise.resolve({ data: null, error: null }); } }; return b; };
    const client = { from: q, storage: { from: () => ({ upload: (p, blob, o) => new Promise(r => setTimeout(() => { log.uploads.push({ p, size: blob.size, type: o.contentType, blobType: blob.type }); r({ data: { path: p }, error: null }); }, 20)) }) }, functions: { invoke: () => Promise.resolve({ data: null, error: null }) } };
    window.LOWI_CLOUD_X = { state: () => ({ uid: 'u-sim', live: true }), client: async () => client };
};

(async () => {
    const R = await H.open(Object.assign({ engine: 'webkit', lang: 'en', members: 3, messages: 4, device: 'iPhone 13' }, ROOT ? { root: path.resolve(ROOT) } : {}));
    const P = R.page, ev = (f, a) => P.evaluate(f, a), sleep = H.sleep;
    const tapIn = async (sel) => { await ev(q => { const e = document.querySelector(q); if (e) e.scrollIntoView({ block: 'center' }); }, sel); await sleep(300); await R.tap(sel); };
    const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await f()) return true; await sleep(200); } return !!(await f()); };
    const status = () => ev(() => { const s = document.querySelector('.fbk-status'); return s ? { t: s.textContent, warn: s.classList.contains('warn') } : null; });
    const S = () => ev(() => { const s = window.LowiFeedback._S, r = s.rec; return { rec: !!r, state: r && r.mr.state, voice: s.voice && { type: s.voice.type, secs: s.voice.secs, size: s.voice.blob.size }, type: navigator.audioSession.type, held: window.LowiMicSession ? window.LowiMicSession.active() : null }; });
    const fresh = async (setup) => { await ev(s => { const S = window.LowiFeedback._S; if (S.rec) { try { S.rec.mr.stop(); } catch (e) { } } window.LowiFeedback.close(); document.querySelectorAll('.fbk-ov').forEach(o => o.remove()); Object.assign(window.__ios, { prompts: 0, gum: 0, typeAtGum: [], gumError: null, mrRejectOpts: false, recorders: [] }, s); navigator.audioSession.type = 'ambient'; if (window.LowiMicSession) window.LowiMicSession.ambient(); window.LowiFeedback.open(); }, setup || {}); await sleep(500); };
    try {
        await R.goto(); await sleep(1500);
        await ev(() => { try { LowiLang.set('en'); } catch (e) { } document.documentElement.setAttribute('data-theme', 'dark'); });
        await ev(IOS);
        await ev(() => { document.querySelectorAll('.r2-ov').forEach(o => o.remove()); });
        const ua = await ev(() => navigator.userAgent);
        check(/iPhone/.test(ua), 'running in WebKit with the iPhone 13 user agent and screen (' + (await ev(() => innerWidth + 'x' + innerHeight)) + ')');

        /* the owner's steps: app sounds already played (session = ambient), open Send feedback, add 2 screenshots, tap Record */
        await fresh();
        const files = [];
        for (let i = 1; i <= 2; i++) {
            const b64 = await ev(i => { const c = document.createElement('canvas'); c.width = 585; c.height = 1266; const g = c.getContext('2d'); g.fillStyle = 'hsl(' + i * 90 + ',50%,35%)'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#fff'; g.font = 'bold 300px sans-serif'; g.fillText(String(i), 200, 700); return c.toDataURL('image/png').split(',')[1]; }, i);
            files.push({ name: 'shot' + i + '.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') });
        }
        await P.setInputFiles('#fbkFile', files);
        await P.waitForFunction(() => document.querySelectorAll('.fbk-slide').length === 2, null, { timeout: 60000 }).catch(() => { });
        check(await ev(() => document.querySelectorAll('.fbk-slide').length === 2), '2 screenshots added');
        check(await ev(() => navigator.audioSession.type === 'ambient'), 'before the tap the audio session is "ambient" (set by the app sounds), as on the phone');
        await tapIn('[data-fbk="rec"]');
        await sleep(1500);
        const a = await ev(() => Object.assign({}, window.__ios, { uploads: undefined }));
        const st = await status(), s1 = await S();
        await R.shot(path.join(OUT, (BEFORE ? 'before' : 'after') + '-1-tap-record.png'));
        if (BEFORE) {
            check(a.prompts === 0 && a.typeAtGum[0] === 'ambient', 'OLD CODE: getUserMedia ran with the session still "ambient": iOS question never shown (prompts ' + a.prompts + ')');
            check(st && /not available\. Allow it in your phone settings/.test(st.t), 'OLD CODE: the owner\'s red line appears: "' + (st && st.t) + '"');
        } else {
            check(a.typeAtGum[0] === 'auto', 'the tap switched the audio session to "auto" before getUserMedia (was ambient)');
            check(a.prompts === 1, 'iOS Allow-microphone question shown once (prompts ' + a.prompts + ')');
            check(s1.rec && s1.state === 'recording', 'tapping Allow starts recording right away, no trip to Settings');
            check(a.recorders.length === 1 && a.recorders[0] && a.recorders[0].mimeType === 'audio/mp4', 'recorder asked for audio/mp4 (what iPhone records): ' + JSON.stringify(a.recorders));
            check(st && !st.warn && !/Settings|settings/.test(st.t), 'no warning while recording (status "' + (st && st.t) + '")');
            check(await ev(() => !!document.querySelector('.fbk-recbox .fbk-time')), 'recording timer shown');
            await sleep(2600);
            await tapIn('[data-fbk="stop"]');
            await sleep(900);
            await until(async () => (await S()).type === 'ambient', 4000);
            const s2 = await S();
            check(s2.voice && s2.voice.type === 'audio/mp4' && s2.voice.secs >= 3 && s2.voice.size > 10000, 'voice note kept: ' + JSON.stringify(s2.voice));
            check(await ev(() => !!document.querySelector('.fbk-voicebox audio')), 'player shown for the voice note');
            check(s2.type === 'ambient' && s2.held === false, 'after Stop the microphone is released and the app sounds go back to mixing with music (session ' + s2.type + ')');
            /* Record again: already allowed, no second question */
            await tapIn('[data-fbk="rec"]');
            await sleep(1200);
            const s3 = await S(), a3 = await ev(() => ({ prompts: window.__ios.prompts }));
            check(s3.rec && s3.state === 'recording' && a3.prompts === 1, 'Record again records at once, without asking a second time' + (s3.rec ? '' : ' ' + JSON.stringify(s3) + JSON.stringify(await status()) + JSON.stringify(await ev(() => ({ io: Object.assign({}, window.__ios, { uploads: 0 }), mw: window.LowiFeedback._S.micWait, btn: (() => { const b = document.querySelector('[data-fbk="rec"]'); const r = b && b.getBoundingClientRect(); return r && [r.x, r.y, r.width, r.height, innerHeight, document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === b || b.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))]; })() })))));
            await sleep(1500);
            await tapIn('[data-fbk="stop"]');
            await sleep(900);
            /* send */
            await ev(() => { const t = document.querySelector('#fbkText'); t.value = 'Mic works now'; t.dispatchEvent(new Event('input', { bubbles: true })); });
            await R.shot(path.join(OUT, 'after-2-voice-ready.png'));
            await ev(() => { const b = document.querySelector('.fbk-body'); b.scrollTop = b.scrollHeight; }); await sleep(400);
            const cov = await ev(() => { const b = document.querySelector('[data-fbk="send"]'), r = b.getBoundingClientRect(), e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { onTop: e === b || b.contains(e), hit: e && (e.id || e.className) }; });
            check(cov.onTop, 'Send feedback is not covered by the floating close button (' + JSON.stringify(cov) + ')');
            await R.tap('[data-fbk="send"]');
            await P.waitForFunction(() => !!document.querySelector('.fbk-thanks'), null, { timeout: 20000 }).catch(() => { });
            const up = await ev(() => ({ uploads: window.__ios.uploads, row: window.__ios.inserts[0] }));
            const v = up.uploads.find(u => /voice/.test(u.p));
            if (up.uploads.length !== 3) console.log('send status:', JSON.stringify(await status()), JSON.stringify(up), JSON.stringify(await ev(() => { const b = document.querySelector('[data-fbk="send"]'), S = window.LowiFeedback._S; const r = b && b.getBoundingClientRect(); return { dis: b && b.disabled, txt: b && b.textContent, rec: !!S.rec, busy: S.busy, voice: !!S.voice, r: r && [r.x, r.y, r.width, r.height], hit: r && (document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) || {}).className, thanks: !!document.querySelector('.fbk-thanks'), ov: !!document.querySelector('.fbk-ov') }; })));
            check(up.uploads.length === 3 && v && /voice\.m4a$/.test(v.p) && v.type === 'audio/mp4' && v.size > 10000, 'upload: 2 screenshots + voice.m4a as audio/mp4 (' + (v && Math.round(v.size / 1024)) + ' KB)');
            check(up.row && /voice\.m4a$/.test(up.row.voice_path || '') && up.row.shots.length === 2 && up.row.voice_secs >= 2, 'row links the voice note and both screenshots');
            check(await ev(() => !!document.querySelector('.fbk-thanks')), 'thank-you screen shown');
            await R.shot(path.join(OUT, 'after-3-thanks.png'));

            /* errors told apart */
            const tapRec = async () => { await tapIn('[data-fbk="rec"]'); await sleep(900); return { st: await status(), s: await S(), a: await ev(() => ({ prompts: window.__ios.prompts })) }; };
            await fresh({ perm: 'denied' });
            let r = await tapRec();
            check(r.st.warn && /Settings \u203a Apps \u203a Safari \u203a Microphone/.test(r.st.t) && !r.s.rec, 'really denied (Don\'t Allow earlier): points to Settings \u203a Apps \u203a Safari \u203a Microphone: "' + r.st.t + '"');
            check(await until(async () => (await S()).type === 'ambient', 4000), 'after a refusal the audio session is given back');
            await R.shot(path.join(OUT, 'after-4-denied.png'));
            await fresh({ perm: 'prompt', answer: 'deny' });
            r = await tapRec();
            check(r.a.prompts === 1 && /Safari/.test(r.st.t), 'tapping Don\'t Allow in the iOS question shows the Safari help');
            await fresh({ perm: 'prompt', gumError: 'NotAllowedError' });
            r = await tapRec();
            check(r.st.warn && /did not ask for the microphone yet/.test(r.st.t) && !/Settings/.test(r.st.t), 'refused without asking (person never said no): "tap again and choose Allow", no Settings: "' + r.st.t + '"');
            await fresh({ perm: 'granted', gumError: 'NotReadableError' });
            r = await tapRec();
            check(/Another app is using the microphone/.test(r.st.t) && !/Settings/.test(r.st.t), 'microphone busy: "' + r.st.t + '"');
            await fresh({ perm: 'granted', gumError: 'NotFoundError' });
            r = await tapRec();
            check(/No microphone was found/.test(r.st.t), 'no microphone: "' + r.st.t + '"');
            await fresh({ perm: 'granted', mrRejectOpts: true });
            r = await tapRec();
            const rec = await ev(() => window.__ios.recorders);
            check(r.s.rec && r.s.state === 'recording' && !r.st.warn && rec[rec.length - 1] === null, 'recorder refusing every format option: falls back quietly to its default and records');
            await tapIn('[data-fbk="stop"]'); await sleep(800);

            /* the small dictation mic in the text box */
            await fresh({ perm: 'granted' });
            const m = await ev(() => { const b = document.querySelector('.fbk-ov .mic-btn'); if (!b) return null; const cs = getComputedStyle(b), r = b.getBoundingClientRect(), t = document.querySelector('#fbkText').getBoundingClientRect(); return { pe: cs.pointerEvents, inside: r.left >= t.left - 2 && r.right <= t.right + 2 && r.top >= t.top - 2 && r.bottom <= t.bottom + 2, w: Math.round(r.width) }; });
            check(m && m.pe !== 'none' && m.inside, 'text box dictation mic still there inside the field and tappable: ' + JSON.stringify(m));
            await tapIn('[data-fbk="rec"]'); await sleep(900);
            check(await ev(() => getComputedStyle(document.querySelector('.fbk-ov .mic-btn')).pointerEvents === 'none'), 'while a voice note records the dictation mic is paused (one microphone at a time)');
            await tapIn('[data-fbk="stop"]'); await sleep(800);
            check(await ev(() => getComputedStyle(document.querySelector('.fbk-ov .mic-btn')).pointerEvents !== 'none'), 'after Stop the dictation mic works again');

            /* true black Dark */
            const bg = await ev(() => getComputedStyle(document.querySelector('.fbk-panel')).backgroundColor);
            const mm = /(\d+), (\d+), (\d+)/.exec(bg);
            check(mm && +mm[3] - +mm[1] <= 4 && +mm[1] <= 30, 'Dark sheet is neutral black, no blue (' + bg + ')');
            await ev(() => window.LowiFeedback.close());
        }
        check(!R.errs.length, 'no page errors (' + R.errs.length + ')' + (R.errs.length ? ' ' + JSON.stringify(R.errs.slice(0, 3)) : ''));
    } catch (e) { check(false, 'run threw: ' + (e && e.stack || e)); }
    await R.close();
    console.log('\n' + ok.length + ' ok, ' + bad.length + ' failed');
    process.exit(bad.length ? 1 : 0);
})();
