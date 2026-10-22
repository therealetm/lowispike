/* app-voice.js: one human voice for the whole app (Oct 21 2026, Emmanuel loved the tutorial's natural voice: "use it everywhere").
   Every place that talks (Mirror mode, the Move player and its voice cues, Learn while you move, Audio mode and Listen and learn,
   the scan-ball guide and its update news) calls LowiVoice.speak(text, opts) instead of the browser's speechSynthesis.
   - The voice: the same Microsoft neural voices as the tutorial (English Ava, German Seraphina, Spanish Ximena), recorded ahead of time
     by tools/app-voice/build.py into app-voice/<lang>/<id>.mp3, one clip per sentence. Any text is cut into sentences (pieces());
     each sentence plays its clip, back to back, so composed lines ("Squats. Feet wide..." or "Chapter two. Your muscles.") are
     stitched from clips. The id is a hash of voice + sentence, so a changed sentence simply has no clip yet.
   - A sentence without a clip (truly dynamic text: a toast with a number in it, a food someone shared) is the only thing still said by
     the device's own voice (Web Speech), and only that sentence. A sentence not in this build's list is still tried on the server
     once (news recorded by a newer release), then the device voice.
   - Clips heard once are kept on the phone (Cache 'lowi-app-voice-v1'), so it works offline after the first listen.
   - iPhone: sound may only start from a tap. The first tap anywhere plays a silent sound on the one audio element; after that it plays.
   - speak() returns a handle; opts.onstart / onend / onerror fire like an utterance's. cancel() stops everything (onerror, like
     speechSynthesis.cancel()). opts.queue: wait for what is playing instead of cutting it off. The world sound pauses (lowi:media).
   Pure part (voices, pieces, ids) is shared with the generator and the tests through module.exports. */
(function (root) {
    'use strict';
    const VOICES = { en: 'en-US-AvaNeural', de: 'de-DE-SeraphinaMultilingualNeural', es: 'es-ES-XimenaNeural' };
    const BCP = { en: 'en-US', de: 'de-DE', es: 'es-ES' };
    const L = l => { l = String(l || 'en').slice(0, 2).toLowerCase(); return VOICES[l] ? l : 'en'; };
    /* the words of one sentence, as recorded: typographic quotes and dashes made plain, spaces collapsed */
    const norm = s => String(s == null ? '' : s).replace(/[\u201c\u201d\u201e\u00ab\u00bb]/g, '"').replace(/[\u2018\u2019\u201a]/g, "'")
        .replace(/\u2026/g, '...').replace(/\s+/g, ' ').trim();
    /* a text cut into sentences: after . ! ? : and at line breaks. The generator cuts the same way, so pieces always line up. */
    function pieces(text) {
        const out = [];
        String(text == null ? '' : text).split(/\n+/).forEach(line => {
            norm(line).split(/(?<=[.!?:])\s+(?=\S)/).forEach(p => { p = norm(p); if (p && /[\p{L}\p{N}]/u.test(p)) out.push(p); });
        });
        return out;
    }
    /* cyrb53: a 53-bit hash, base36. id of a clip = voice + sentence */
    function hash(str) {
        let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
        for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
    }
    const idOf = (lang, piece) => hash(VOICES[L(lang)] + '\n' + norm(piece));
    const api = { VOICES, BCP, norm, pieces, hash, idOf, L, CACHE: 'lowi-app-voice-v1', DIR: 'app-voice/' };
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (!root || !root.document) return;

    const W = root, D = W.document;
    const SILENT = 'data:audio/mpeg;base64,SUQzBAAAAAAAIlRTU0UAAAAOAAADTGF2ZjYyLjMuMTAwAAAAAAAAAAAAAAD/83DAAAAAAAAAAAAASW5mbwAAAA8AAAAIAAAD+gBHR0dHR0dHR0dHR0diYmJiYmJiYmJiYmJ8fHx8fHx8fHx8fHx8lpaWlpaWlpaWlpaWsbGxsbGxsbGxsbGxscvLy8vLy8vLy8vLy+Xl5eXl5eXl5eXl5eX///////////////8AAAAATGF2YzYyLjExAAAAAAAAAAAAAAAAJALUAAAAAAAAA/qOiXBeAAAAAAAAAAAAAAAAAP/zQMQAAAADSAAAAABMQU1FMy4xMDEgKGJldGEgMylVTEFNRTMuMTAxIChiZXRhIDMpVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NCxFsAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAxIChiZXRhIDMpVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NAxKQAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDEgKGJldGEgMylVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80LEowAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDEgKGJldGEgMylVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80DEpAAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMSAoYmV0YSAzKVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsSjAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMSAoYmV0YSAzKVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NCxKMAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
    /* Where the clips live: next to this file. The Affiliates page (affiliates/) loads ../app-voice.js too (22 Oct 2026); in the
       app this is the page's own folder, so nothing changes there. */
    const BASE = (() => { try { const me = D.currentScript; return me && me.src ? new URL('./', me.src).href : ''; } catch (e) { return ''; } })();
    api.BASE = BASE;
    const build = () => { const m = D.querySelector('meta[name="lowi-build"]'); return (m && m.content) || '1'; };
    const appLang = () => { let l = 'en'; try { l = (W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || localStorage.getItem('lowispike.lang') || D.documentElement.lang || 'en'; } catch (e) { } return L(l); };

    let audio = null, unlocked = false, blobUrl = '';
    const A = () => { if (!audio) { audio = new Audio(); audio.preload = 'auto'; audio.setAttribute('playsinline', ''); } return audio; };
    function unlock() {
        if (unlocked) return;
        try { const a = A(); if (!a.src || a.src === SILENT || a.paused) { a.src = SILENT; const p = a.play(); if (p && p.catch) p.catch(() => { unlocked = false; }); } unlocked = true; } catch (e) { }
    }
    /* LOWI_VOICE_TAP_ONLY (Affiliates page, 22 Oct 2026): no silent unlock on every first touch, so a visitor's own music is not
       interrupted; speak() still unlocks from the tap that starts it. The app itself keeps the first-touch unlock. */
    if (!W.LOWI_VOICE_TAP_ONLY) { D.addEventListener('touchend', unlock, true); D.addEventListener('click', unlock, true); }

    /* the list of recorded clips loads once, the first time anything talks */
    let dataP = null;
    function data() {
        if (W.LowiAppVoiceData) return Promise.resolve(W.LowiAppVoiceData);
        if (!dataP) dataP = new Promise(res => {
            const sc = D.createElement('script'); sc.src = BASE + 'app-voice-data.js?v=' + encodeURIComponent(build()); sc.async = true;
            sc.onload = () => res(W.LowiAppVoiceData || null); sc.onerror = () => { dataP = null; res(null); };
            D.head.appendChild(sc);
        });
        return dataP;
    }
    const missed = {}; /* ids the server did not have, this session */
    async function fetchClip(url, known) {
        let cache = null;
        try { cache = W.caches && await caches.open(api.CACHE); } catch (e) { cache = null; }
        try { const hit = cache && await cache.match(url); if (hit) return await hit.blob(); } catch (e) { }
        if (!known && missed[url]) return null;
        try {
            const ctl = W.AbortController ? new AbortController() : null; const t = setTimeout(() => { try { ctl && ctl.abort(); } catch (e) { } }, known ? 8000 : 2500);
            const r = await fetch(url, ctl ? { cache: 'force-cache', signal: ctl.signal } : { cache: 'force-cache' }); clearTimeout(t);
            if (!r.ok || !/audio|mpeg|octet/i.test(r.headers.get('content-type') || 'audio/mpeg')) { missed[url] = 1; return null; }
            if (cache) { try { await cache.put(url, r.clone()); } catch (e) { } }
            return await r.blob();
        } catch (e) { missed[url] = 1; return null; }
    }
    /* one sentence's clip: a promise of a Blob, or null (then the device says it) */
    function clipFor(d, lang, p) {
        const id = idOf(lang, p), known = !!(d && d.clips && d.clips[lang] && d.clips[lang][id] != null);
        return fetchClip(BASE + api.DIR + lang + '/' + id + '.mp3', known);
    }
    function media(on) { try { W.dispatchEvent(new CustomEvent('lowi:media', { detail: { id: 'app-voice', on: !!on } })); } catch (e) { } }

    /* device voice, for a sentence with no clip */
    let devVoices = [];
    const loadDev = () => { try { devVoices = (W.speechSynthesis && speechSynthesis.getVoices()) || []; } catch (e) { devVoices = []; } };
    if (W.speechSynthesis) { loadDev(); try { speechSynthesis.addEventListener('voiceschanged', loadDev); } catch (e) { } }
    function bestVoice(lang) {
        if (!devVoices.length) loadDev();
        const want = BCP[lang].toLowerCase(), pre = lang, bad = /compact|eloquence|grandma|grandpa|bad news|bells|bubbles|cellos|jester|organ|trinoids|whisper|zarvox|superstar|wobble|boing|albert|fred|junior|ralph/i;
        let best = null, score = -99;
        for (const v of devVoices) {
            const vl = String(v.lang || '').replace('_', '-').toLowerCase(); if (vl.indexOf(pre) !== 0) continue;
            let s = 0; if (/natural|neural|premium|enhanced|siri/i.test(v.name)) s += 6; if (/google/i.test(v.name)) s += 3; if (vl === want) s += 2; if (bad.test(v.name)) s -= 20;
            if (s > score) { score = s; best = v; }
        }
        return best;
    }
    function sayDevice(text, lang, rate) {
        return new Promise(res => {
            if (!W.speechSynthesis || !W.SpeechSynthesisUtterance) { res(false); return; }
            try {
                const u = new SpeechSynthesisUtterance(text); u.lang = BCP[lang]; const v = bestVoice(lang); if (v) u.voice = v; u.rate = rate || 1; u.pitch = 1;
                let fin = false; const end = ok => { if (fin) return; fin = true; res(ok); };
                u.onend = () => end(true); u.onerror = () => end(false); cur && (cur.utt = u);
                speechSynthesis.speak(u); try { if (speechSynthesis.paused) speechSynthesis.resume(); } catch (e) { }
                setTimeout(() => end(true), 2000 + text.length * 120); /* some browsers never fire onend */
            } catch (e) { res(false); }
        });
    }
    function playBlob(blob) {
        return new Promise(res => {
            const a = A(); if (blobUrl) { try { URL.revokeObjectURL(blobUrl); } catch (e) { } }
            blobUrl = URL.createObjectURL(blob); a.src = blobUrl;
            let fin = false; const end = v => { if (fin) return; fin = true; a.onended = a.onerror = a.onpause = null; res(v); };
            a.onended = () => end('ok'); a.onerror = () => end('err');
            /* paused by the system, not by us (iPhone: the camera starting in Mirror mode): count it as failed instead of waiting forever */
            a.onpause = () => { if (!fin && !a.ended) setTimeout(() => { if (!fin && a.paused && !a.ended) end('err'); }, 300); };
            const p = a.play(); if (cur) cur.audio = end;
            if (p && p.catch) p.catch(e => end(e && e.name === 'NotAllowedError' ? 'blocked' : 'err'));
        });
    }

    /* ---- the queue: one utterance at a time ---- */
    let cur = null; const queue = [];
    function stopNow(c) {
        try { const a = audio; if (a) { a.pause(); if (c && c.audio) c.audio('stop'); } } catch (e) { }
        try { if (W.speechSynthesis && (speechSynthesis.speaking || speechSynthesis.pending)) speechSynthesis.cancel(); } catch (e) { }
    }
    function cancel() {
        const all = (cur ? [cur] : []).concat(queue.splice(0));
        const c = cur; cur = null; stopNow(c);
        all.forEach(h => { if (!h.ended) { h.ended = true; h.cancelled = true; const f = h.o.onerror || h.o.onend; try { f && f({ type: 'error', error: 'interrupted' }); } catch (e) { } } });
        if (c) media(false);
    }
    async function run(h) {
        cur = h; h.started = true;
        const d = await data(); if (cur !== h) return;
        const lang = h.lang, ps = pieces(h.text);
        const blobs = ps.map(p => clipFor(d, lang, p)); /* all fetched at once; played in order */
        let first = true, rate = h.o.rate;
        for (let i = 0; i < ps.length; i++) {
            const b = await blobs[i]; if (cur !== h) return;
            if (first) { first = false; media(true); try { h.o.onstart && h.o.onstart({ type: 'start' }); } catch (e) { } }
            let r = b ? await playBlob(b) : 'none'; if (cur !== h) return;
            /* opts.clipsOnly (Mirror mode, 22 Oct 2026, Emmanuel: "update the voice in the mirror workout to match the new one"): every
               line is recorded, so a clip that fails is fetched and played once more and is otherwise left out. The old device voice
               never cuts in halfway through a workout. */
            if (h.o.clipsOnly && r !== 'ok') {
                unlock(); const b2 = b || await clipFor(d, lang, ps[i]); if (cur !== h) return;
                r = b2 ? await playBlob(b2) : 'none'; if (cur !== h) return;
                if (r !== 'ok') { h.skipped = (h.skipped || 0) + 1; continue; }
            }
            if (r === 'blocked' || r === 'err' || r === 'none') { h.device = (h.device || 0) + 1; await sayDevice(ps[i], lang, rate); if (cur !== h) return; }
            else h.clips = (h.clips || 0) + 1;
        }
        finish(h);
    }
    function finish(h) {
        if (h.ended) return; h.ended = true; if (cur === h) cur = null;
        try { h.o.onend && h.o.onend({ type: 'end' }); } catch (e) { }
        const nx = queue.shift(); if (nx) run(nx); else media(false);
    }
    function speak(text, o) {
        o = o || {}; const h = { text: String(text == null ? '' : text), lang: L(o.lang || appLang()), o, ended: false };
        W.__lowiVoiceSaid = h.text;
        unlock();
        if (!pieces(h.text).length) { setTimeout(() => finish(h), 0); return h; }
        if (o.queue && (cur || queue.length)) { queue.push(h); return h; }
        cancel(); run(h); return h;
    }
    const speaking = () => !!(cur || queue.length);
    W.LowiVoice = Object.assign({}, api, { speak, cancel, speaking, unlock, supported: () => typeof Audio === 'function' || !!W.speechSynthesis, current: () => cur, prefetch: (text, lang) => { lang = L(lang || appLang()); data().then(d => pieces(text).forEach(p => clipFor(d, lang, p))); } });
    /* the tutorial's own voice starting stops this one (one voice at a time) */
    W.addEventListener('lowi:media', e => { const d = e.detail || {}; if (d.on && d.id && d.id !== 'app-voice' && /voice/.test(d.id) && speaking()) cancel(); });
    /* the app going to the background stops the voice, like the tutorial */
    D.addEventListener('visibilitychange', () => { if (D.hidden && speaking()) cancel(); });
})(typeof window !== 'undefined' ? window : null);
