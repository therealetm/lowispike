/* tutorial-voice.js: the tutorial reads itself aloud (Oct 21 2026, Emmanuel: "I just clicked on tutorial but I have to read through it,
   that's not what drunk grandma likes. Where is the speaker? So I can just listen to it.").
   - Every tutorial card has a small round speaker button in its top row on the right, under Skip all (Oct 22 2026, Emmanuel: "The
     microphone looks weird and to big fix it. Move the speaker to the right where it's empty."; it used to be a badge on the companion
     picture, and tutorial.css's 56 px .lt-guide svg rule blew its glyph up). One tap turns sound on and reads the card;
     from then on every card reads itself as the tour moves, until the same button turns it off. The choice is remembered
     (localStorage 'lowi.tutorial.voice.v1' = '1' on, '0' off; unset = never tried, the badge breathes so it gets noticed).
   - The voice: natural neural voices recorded ahead of time, one clip per card and language (tutorial-voice/<lang>/<key>.mp3, made by
     tools/tutorial-voice/build.py; English Ava, German Seraphina, Spanish Ximena), with each word's timing in tutorial-voice-data.js,
     so the word being said lights up on the card. A clip only plays when its words are exactly the card's words; a changed card, or
     no connection for a clip never heard before, falls back to the device's own best voice (Web Speech) with the same highlight.
     Clips heard once are kept on the phone (Cache 'lowi-voice-v1'), and the next two cards are fetched ahead, so it works offline.
   - Back, Skip, Skip all, Esc, closing the tour, the tour hiding behind a sheet and the app going to the background stop the voice at
     once. The world sound pauses while the voice talks (lowi:media).
   tutorial.js calls LowiTutorialVoice.render(card, step, ctx) after each render and .stop() when it stops or hides.
   Pure part (spoken text, voices, the plan of clips) is shared with the generator and the tests through module.exports. */
(function (root) {
    'use strict';
    const VOICES = { en: 'en-US-AvaNeural', de: 'de-DE-SeraphinaMultilingualNeural', es: 'es-ES-XimenaNeural' };
    const BCP = { en: 'en-US', de: 'de-DE', es: 'es-ES' };
    const NAME = 'Misty';   // clips are recorded with the standard name; a title that says another name is left out of the speech
    const L = l => (l === 'de' || l === 'es') ? l : 'en';
    const fill = (s, v) => String(s || '').replace(/\{(\w+)\}/g, (m, k) => (v && v[k] != null ? String(v[k]) : m));
    /* Is the title worth saying? Only when it adds something the text does not already say (Emmanuel, 22 Oct 2026: "it reads the
       title, so it sounds very repetitive ... if the title and the text aren't repetitive, then I guess it can"). Rule: the title is
       left out when any of its words (or a form of it: same first four letters, one the end of the other, simple endings off) is in the
       text. A step can also say sayTitle: false (or { de: false }) for a repeat in other words ("Hold me" / "keep your finger on me"). */
    const STOP = {
        en: 'a an the and or of to in on at for is it its im me my you your we our this that these those with by be are was what how one two up down out off all any here there now then once so just too also can will',
        de: 'der die das den dem des ein eine einen einem einer und oder zu im in an am auf fur ist es ich mich mir mein meine meinen meiner bin bist du dich dir dein deine deinen wir uns mit von bei sind war was wie hier da jetzt dann so auch kann wird',
        es: 'el la los las un una unos unas y o de del a al en con por para es son esta esto este mi mis me yo tu tus te nos su sus soy eres que como aqui ahi ya luego tambien puede'
    };
    const STOPS = {};
    const norm = w => String(w).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    const stem = w => { for (const e of ['ing', 'en', 'er', 'es', 'ed', 'e', 'n', 's']) if (w.endsWith(e) && w.length - e.length >= 4) return w.slice(0, -e.length); return w; };
    const wordsOf = (s, l) => {
        const st = STOPS[l] || (STOPS[l] = new Set(STOP[l].split(' ')));
        return String(s || '').replace(/\{\w+\}/g, ' ').split(/[\s\-\u2013\u2014/,.!?:;"\u201c\u201d\u201e\u00ab\u00bb()\u2026\u2019']+/)
            .map(norm).filter(w => w && (w.length >= 3 || /^\d+$/.test(w)) && !st.has(w)).map(stem);
    };
    const alike = (a, b) => { if (a === b) return true; if (Math.min(a.length, b.length) < 4) return false; return a.slice(0, 4) === b.slice(0, 4) || a.endsWith(b) || b.endsWith(a); };   /* Körperwelt ~ Welt */
    function titleAdds(step, l) {
        const o = step.sayTitle;
        if (o === false || (o && typeof o === 'object' && o[l] === false)) return false;
        const pick = f => (step[f] && (step[f][l] || step[f].en)) || '';
        const t = wordsOf(pick('title'), l), x = wordsOf(pick('text'), l);
        if (!t.length) return /\{name\}/.test(pick('title')) && !/\{name\}/.test(pick('text'));   /* "Hi, I'm {name}" */
        return !t.some(w => x.some(v => alike(w, v)));
    }
    /* what is said for a card: the text, with the title in front only when it adds something.
       key = clip name ('<id>' or '<id>~' = text only, for a renamed companion whose name is in a title that is said) */
    function spoken(step, lang, name) {
        const l = L(lang), n = name || NAME, pick = f => (step[f] && (step[f][l] || step[f].en)) || '';
        const rawT = pick('title'), rawX = pick('text'), body = fill(rawX, { name: n });
        if (!titleAdds(step, l)) return { key: step.id, s: body, t: -1, b: 0 };
        if (/\{name\}/.test(rawT) && n !== NAME) return { key: step.id + '~', s: body, t: -1, b: 0 };
        const title = fill(rawT, { name: n }).trim(), sep = /[.!?\u2026:]$/.test(title) ? ' ' : '. ';
        return { key: step.id, s: title + sep + body, t: title.length, b: title.length + sep.length };
    }
    /* every clip the generator records: each step in each language, plus the text-only clip where the title names the companion */
    function plan(steps) {
        const out = [];
        for (const l of ['en', 'de', 'es']) for (const st of steps) {
            out.push(Object.assign({ lang: l }, spoken(st, l, NAME)));
            const alt = spoken(st, l, 'Someone');
            if (alt.key !== st.id) out.push(Object.assign({ lang: l }, alt));
        }
        return out;
    }
    /* where in the spoken string one of the cue phrases starts (Try it now wiggle); -1 when none is said. ’ and ' count the same. */
    function cueIndex(s, phrases) {
        const n = x => String(x || '').toLowerCase().replace(/[\u2019`]/g, "'");
        const t = n(s); let at = -1;
        for (const p of phrases || []) { const k = t.lastIndexOf(n(p)); if (k >= 0 && (at < 0 || k < at)) at = k; }
        return at;
    }
    const api = { VOICES, BCP, NAME, spoken, plan, titleAdds, cueIndex, KEY: 'lowi.tutorial.voice.v1', CACHE: 'lowi-voice-v1', DIR: 'tutorial-voice/' };
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (!root || !root.document || root.LowiTutorialVoice) return;

    /* ---------------- browser player ---------------- */
    const W = root, D = W.document, H = D.documentElement;
    const UI = {
        en: { on: 'Read aloud', off: 'Stop reading aloud' },
        de: { on: 'Vorlesen', off: 'Vorlesen ausschalten' },
        es: { on: 'Leer en voz alta', off: 'Dejar de leer en voz alta' }
    };
    const SILENT = 'data:audio/mpeg;base64,SUQzBAAAAAAAIlRTU0UAAAAOAAADTGF2ZjYyLjMuMTAwAAAAAAAAAAAAAAD/83DAAAAAAAAAAAAASW5mbwAAAA8AAAAIAAAD+gBHR0dHR0dHR0dHR0diYmJiYmJiYmJiYmJ8fHx8fHx8fHx8fHx8lpaWlpaWlpaWlpaWsbGxsbGxsbGxsbGxscvLy8vLy8vLy8vLy+Xl5eXl5eXl5eXl5eX///////////////8AAAAATGF2YzYyLjExAAAAAAAAAAAAAAAAJALUAAAAAAAAA/qOiXBeAAAAAAAAAAAAAAAAAP/zQMQAAAADSAAAAABMQU1FMy4xMDEgKGJldGEgMylVTEFNRTMuMTAxIChiZXRhIDMpVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NCxFsAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAxIChiZXRhIDMpVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NAxKQAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDEgKGJldGEgMylVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80LEowAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDEgKGJldGEgMylVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/80DEpAAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMSAoYmV0YSAzKVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsSjAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMSAoYmV0YSAzKVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NCxKMAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
    const SPK = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z" fill="currentColor"/>' +
        '<path class="lt-wave1" d="M15.2 9.2a4 4 0 0 1 0 5.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<path class="lt-wave2" d="M17.8 6.6a7.6 7.6 0 0 1 0 10.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<path class="lt-slash" d="M15 9.5l5 5M20 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    const pref = { get() { try { return localStorage.getItem(api.KEY); } catch (e) { return null; } }, set(v) { try { localStorage.setItem(api.KEY, v ? '1' : '0'); } catch (e) { } } };
    const build = () => { const m = D.querySelector('meta[name="lowi-build"]'); return (m && m.content) || '1'; };
    let saidKey = '';   /* the card that was already read to the end: a repaint of it (try-it done, Pause) does not read it again */
    let on = pref.get() === '1', unlocked = false, seq = 0, cur = null, words = [], raf = 0, blobUrl = '', blocked = false, card = null, lastKey = '';
    let audio = null;
    const A = () => { if (!audio) { audio = new Audio(); audio.preload = 'auto'; audio.setAttribute('playsinline', ''); audio.addEventListener('ended', onEnded); } return audio; };
    /* only the card's own clip ending counts. Oct 22 2026: the silent unlock sound (same element) ended while the card's clip was
       still loading, the card counted as read, and hands-free cut the real clip off 1.2 s in to move on */
    function onEnded() { if (cur && cur.how === 'file' && cur.playing && blobUrl && audio && audio.src === blobUrl) finished(seq); }

    /* the clip data (word timings) loads once, the first time the tour opens */
    let dataP = null;
    function data() {
        if (W.LowiTutorialVoiceData) return Promise.resolve(W.LowiTutorialVoiceData);
        if (!dataP) dataP = new Promise(res => {
            const sc = D.createElement('script'); sc.src = 'tutorial-voice-data.js?v=' + encodeURIComponent(build()); sc.async = true;
            sc.onload = () => res(W.LowiTutorialVoiceData || null); sc.onerror = () => { dataP = null; res(null); };
            D.head.appendChild(sc);
        });
        return dataP;
    }
    const clipOf = (d, lang, key) => (d && d.clips && d.clips[lang] && d.clips[lang][key]) || null;
    const urlOf = (lang, c) => api.DIR + lang + '/' + c.f + '?h=' + c.h;
    /* a clip from the phone's cache, else the network (then kept); null when neither has it */
    async function fetchClip(url) {
        let cache = null;
        try { cache = W.caches && await caches.open(api.CACHE); } catch (e) { cache = null; }
        try { const hit = cache && await cache.match(url); if (hit) return await hit.blob(); } catch (e) { }
        try {
            const r = await fetch(url, { cache: 'force-cache' }); if (!r.ok) return null;
            if (cache) { try { await cache.put(url, r.clone()); } catch (e) { } }
            return await r.blob();
        } catch (e) { return null; }
    }
    function prefetch(lang, keys) {
        data().then(d => { for (const k of keys || []) { const c = clipOf(d, lang, k); if (c) fetchClip(urlOf(lang, c)); } });
    }
    function media(onNow) { try { W.dispatchEvent(new CustomEvent('lowi:media', { detail: { id: 'tutorial-voice', on: !!onNow } })); } catch (e) { } }

    /* iPhone: sound may only start from a tap. The first tap plays a silent sound on the one audio element; after that it can play. */
    function unlock() {
        if (unlocked) return;
        try { const a = A(); a.src = SILENT; const p = a.play(); unlocked = true; if (p && p.catch) p.catch(() => { }); } catch (e) { }
    }
    function onGesture() { if (on && H.classList.contains('lt-on')) unlock(); }
    D.addEventListener('touchend', onGesture, true); D.addEventListener('click', onGesture, true);

    /* ---- highlight: the word being said lights up ---- */
    function mark(ch) {
        let hit = null;
        for (const w of words) { if (ch >= w.a && ch < w.b) { hit = w; break; } if (w.a > ch) { hit = w; break; } }
        for (const w of words) w.el.classList.toggle('lt-say', w === hit);
    }
    function clearMark() { for (const w of words) w.el.classList.remove('lt-say'); }
    /* the voice reached the card's cue words ("Try it now"): tell the tour once, so its button wiggles */
    function cueCheck(ch) {
        const c = ctxNow;
        if (!c || !c.onCue || c.cued || c.cueAt < 0 || ch < c.cueAt || !cur || cur.key !== c.sp.key) return;
        c.cued = true;
        emit({ state: 'cue', key: c.sp.key });
        try { c.onCue(c.sp.key); } catch (e) { }
    }
    function loop() {
        cancelAnimationFrame(raf);
        if (!cur || cur.how !== 'file' || !audio) return;
        const t = audio.currentTime * 1000 + 60, w = cur.clip.w; let k = -1;
        for (let j = 0; j < w.length; j++) { if (w[j][0] <= t) k = j; else break; }
        if (k >= 0) { mark(w[k][1]); cueCheck(w[k][1]); }
        raf = requestAnimationFrame(loop);
    }
    /* wrap the words of the title and the text in spans, numbered by their place in the spoken string */
    function wrap(el, text, offset) {
        if (!el || offset < 0) return;
        if (el.textContent !== text) return;
        el.textContent = '';
        const re = /\S+/g; let m, last = 0;
        while ((m = re.exec(text))) {
            if (m.index > last) el.appendChild(D.createTextNode(text.slice(last, m.index)));
            const sp = D.createElement('span'); sp.className = 'lt-w'; sp.textContent = m[0]; el.appendChild(sp);
            words.push({ a: offset + m.index, b: offset + m.index + m[0].length, el: sp });
            last = m.index + m[0].length;
        }
        if (last < text.length) el.appendChild(D.createTextNode(text.slice(last)));
    }

    function paintBtn() {
        if (!card) return;
        const b = card.querySelector('.lt-speak'); if (!b) return;
        const l = L(cur ? cur.lang : 'en'), U = UI[l];
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.setAttribute('aria-label', on ? U.off : U.on); b.title = on ? U.off : U.on;
        b.classList.toggle('lt-spk-on', on);
        b.classList.toggle('lt-spk-new', !on && pref.get() == null);
        b.classList.toggle('lt-spk-tap', on && blocked);
        card.classList.toggle('lt-speaking', !!(on && cur && cur.playing));
    }
    function done() {
        if (cur) cur.playing = false;
        cancelAnimationFrame(raf); clearMark(); media(false); paintBtn();
    }
    /* the card was read to the end by itself (not stopped, not blocked): tell whoever rendered it (hands-free tour moves on) */
    function finished(my) {
        if (my !== seq) return;
        const k = cur && cur.key, l = cur && cur.lang, c = ctxNow;
        saidKey = lastKey;
        done();
        emit({ state: 'end', key: k, lang: l });
        if (c && c.onEnd && c.sp.key === k) { try { c.onEnd(k); } catch (e) { } }
    }
    const emit = d => { try { W.dispatchEvent(new CustomEvent('lowi:tutorial-voice', { detail: Object.assign({ on }, d) })); } catch (e) { } };
    function stop() {
        seq++; cancelAnimationFrame(raf);
        if (audio) { try { audio.pause(); } catch (e) { } }
        try { if (W.speechSynthesis && (speechSynthesis.speaking || speechSynthesis.pending)) speechSynthesis.cancel(); } catch (e) { }
        if (blobUrl) { try { URL.revokeObjectURL(blobUrl); } catch (e) { } blobUrl = ''; }
        if (cur) cur.playing = false;
        clearMark(); media(false); paintBtn();
    }

    /* the device's own voice when there is no clip: the most natural one it has for this language */
    function bestVoice(lang) {
        let vs = []; try { vs = speechSynthesis.getVoices() || []; } catch (e) { }
        const want = L(lang), bad = /compact|eloquence|espeak|novelty|zarvox|trinoids|albert|bahh|boing|bubbles|cellos|jester|organ|superstar|wobble|whisper|bells|grandma|grandpa|rocko|shelley|eddy|reed|sandy|flo\b|junior|ralph|fred|kathy/i;
        let best = null, score = -1e9;
        for (const v of vs) {
            const vl = String(v.lang || '').toLowerCase().replace('_', '-'); if (vl.slice(0, 2) !== want) continue;
            let s = 0;
            if (/natural|neural|premium|enhanced|siri/i.test(v.name)) s += 6;
            if (/google/i.test(v.name)) s += 3;
            if (vl === BCP[want].toLowerCase()) s += 2;
            if (/ava|samantha|allison|zoe|anna|petra|helena|marlene|monica|paulina|m[oó]nica|lucia|susan|karen|serena/i.test(v.name)) s += 1;
            if (bad.test(v.name)) s -= 20;
            if (s > score) { score = s; best = v; }
        }
        return best;
    }
    function sayDevice(my, sp) {
        if (!W.speechSynthesis || !W.SpeechSynthesisUtterance) { done(); return; }
        try {
            speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(sp.s); u.lang = BCP[L(sp.lang)]; const v = bestVoice(sp.lang); if (v) u.voice = v;
            u.rate = 1; u.pitch = 1.05;
            u.onboundary = e => { if (my === seq && typeof e.charIndex === 'number') { mark(e.charIndex); cueCheck(e.charIndex); } };
            u.onend = () => finished(my);
            u.onerror = () => { if (my === seq) done(); };
            cur.how = 'device'; cur.playing = true; media(true); paintBtn();
            speechSynthesis.speak(u);
        } catch (e) { done(); }
    }
    async function say(sp) {
        stop();
        const my = seq; cur = Object.assign({ playing: true, how: 'file' }, sp); paintBtn();
        unlock();
        const d = await data(); if (my !== seq) return;
        const c = clipOf(d, sp.lang, sp.key);
        if (!c || c.s !== sp.s) { sayDevice(my, sp); return; }
        const blob = await fetchClip(urlOf(sp.lang, c)); if (my !== seq) return;
        if (!blob) { sayDevice(my, sp); return; }
        cur.clip = c; blobUrl = URL.createObjectURL(blob);
        const a = A(); a.src = blobUrl;
        try {
            await a.play(); if (my !== seq) { a.pause(); return; }
            blocked = false; cur.playing = true; media(true); paintBtn(); loop();
        } catch (e) {
            if (my !== seq) return;
            /* the browser wants a tap first (tour opened by itself after a reload): the badge pulses, a tap on it plays */
            if (e && e.name === 'NotAllowedError') { blocked = true; unlocked = false; done(); }
            else sayDevice(my, sp);
        }
    }

    let ctxNow = null;
    function toggle(ev) {
        if (ev) { ev.preventDefault(); ev.stopPropagation(); }
        if (on && blocked) { blocked = false; unlocked = false; unlock(); if (ctxNow) say(ctxNow.sp); return; }
        on = !on; pref.set(on); blocked = false;
        if (on) { unlock(); if (ctxNow) { say(ctxNow.sp); prefetch(ctxNow.sp.lang, ctxNow.next); } }
        else stop();
        paintBtn(); emit({ state: on ? 'on' : 'off' });
    }
    /* the speaker: its own small glass button in the card's top row, right column under Skip all (.lt-side). The companion picture stays
       a picture. Returns the button (made once per card render). */
    function speaker(el) {
        const top = el.querySelector('.lt-top'); if (!top) return null;
        let b = top.querySelector('.lt-speak'); if (b) return b;
        const side = D.createElement('span'); side.className = 'lt-side';
        const sk = top.querySelector('.lt-skipall'); if (sk) side.appendChild(sk);
        b = D.createElement('button'); b.type = 'button'; b.className = 'lt-speak';
        b.innerHTML = '<span class="lt-spk" aria-hidden="true">' + SPK + '</span>';
        b.addEventListener('click', toggle);
        side.appendChild(b); top.appendChild(side);
        return b;
    }
    /* after every render of a tutorial card: add the speaker button, wrap the words, read the card when sound is on.
       ctx: { lang, name, next: [steps to prefetch], onEnd(key): called once the card was read to the end by itself,
              quiet: true = paint only, say nothing (the hands-free tour is paused) }. Also fires window 'lowi:tutorial-voice'
       { on, state: 'on' | 'off' | 'end' }. Public interface (used beyond the tour): render, stop, toggle, isOn, playing, how, paused,
       word, bestVoice, data, spoken, plan, titleAdds, VOICES, BCP, NAME, KEY, CACHE, DIR. Add to it; do not rename or remove. */
    function render(el, step, ctx) {
        if (!el || !step) return;
        const c = ctx || {}, lang = L(c.lang), sp = Object.assign({ lang }, spoken(step, lang, c.name));
        card = el; words = [];
        speaker(el);
        if (sp.t >= 0) wrap(el.querySelector('#ltTitle'), sp.s.slice(0, sp.t), 0);
        wrap(el.querySelector('#ltText'), sp.s.slice(sp.b), sp.b);
        const next = (c.next || []).map(s => spoken(s, lang, c.name).key);
        const key = lang + '|' + sp.key + '|' + sp.s;
        /* ctx.cue: phrases ("try it now"); ctx.onCue fires once when the voice reaches them. A repaint of the same card keeps it fired. */
        const was = ctxNow && ctxNow.key === key && key === lastKey ? ctxNow.cued : false;
        ctxNow = { sp, next, key, onEnd: typeof c.onEnd === 'function' ? c.onEnd : null,
            onCue: typeof c.onCue === 'function' ? c.onCue : null, cueAt: c.cue ? cueIndex(sp.s, c.cue) : -1, cued: !!was };
        if (!cur || cur.lang !== lang) cur = Object.assign({ playing: false, how: '' }, sp);
        paintBtn();
        if (c.quiet) { lastKey = ''; saidKey = ''; stop(); return; }   /* paused: paint the card, say nothing */
        if (key === lastKey && cur && (cur.playing || (on && saidKey === key))) { return; }
        saidKey = '';
        lastKey = key;
        if (on) { say(sp); prefetch(lang, next); } else stop();
    }
    /* the tour stopped or hid: silence now; the same card reads again when it comes back */
    function halt() { lastKey = ''; saidKey = ''; stop(); }
    if (!D.getElementById('ltvCss')) { const l = D.createElement('link'); l.id = 'ltvCss'; l.rel = 'stylesheet'; l.href = 'tutorial-voice.css?v=' + encodeURIComponent(build()); D.head.appendChild(l); }
    W.addEventListener('lowi:tutorial', e => { const d = e.detail || {}; if (!d.on) halt(); else if (!dataP) data(); });
    D.addEventListener('visibilitychange', () => { if (D.hidden) halt(); });
    W.addEventListener('pagehide', halt);
    W.LowiTutorialVoice = Object.assign({}, api, {
        render, stop: halt, toggle: () => toggle(), isOn: () => on, playing: () => !!(cur && cur.playing), how: () => (cur && cur.how) || '',
        paused: () => !audio || audio.paused, word: () => { const w = card && card.querySelector('.lt-say'); return w ? w.textContent : ''; }, bestVoice, data
    });
})(typeof window !== 'undefined' ? window : null);
