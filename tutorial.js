/* tutorial.js: the replayable tutorial (Oct 19 2026, Emmanuel: "a tutorial button [in Settings] ... our companion takes you through
   everything from the beginning, as if you were new. Obviously, you can skip if you already know this.").
   Settings > Tutorial calls LowiTutorial.start(). The user's own companion (LowiBirthCompanion.svg/get, Misty until they have one)
   walks them through the steps in tutorial-steps.js: a spotlight on the real Home control plus one glass card.
   - Plays as if new, but reads and writes NO app data. Its only key is localStorage 'lowi.tutorial.v1' {v, at, done, skipped}.
   - Every step: Back, Skip (the rest of this part), Next; Skip all on every step; Esc = Skip all, arrow keys move.
   - First step for accounts with the standard Misty: opens the claim-your-own-companion step, which the own-companion task owns
     (only once LowiBirthCompanion.claim(opts) exists: a marked HOOK, off until then). See COORD-tutorial.md.
   - Never covers or blocks anything else (bug hunt round 8 lesson): while setup / the sign-in gate, any other dialog or sheet
     (any visible [aria-modal=true], the Day card's BUSY list) or Misty's flight is up, the tour hides itself completely and comes
     back where it was once things are quiet. It never opens panels itself, so it can't get stuck behind one.
   API: window.LowiTutorial = { start(opts), stop(reason), isOn(), step(), core } ; window event 'lowi:tutorial' {on, step, reason}. */
(function () {
    'use strict';
    const W = window, D = document, H = D.documentElement, S = W.LowiTutorialSteps;
    if (!S || W.LowiTutorial) return;
    const KEY = 'lowi.tutorial.v1';
    const $ = s => D.querySelector(s);
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const lang = () => { let l = 'en'; try { l = (W.LowiLang && LowiLang.get && LowiLang.get()) || H.lang || 'en'; } catch (e) { } l = String(l).slice(0, 2); return l === 'de' || l === 'es' ? l : 'en'; };
    const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    const vis = el => { if (!el || !el.isConnected) return false; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05; };
    const BC = () => W.LowiBirthCompanion || null;
    const ownCompanion = () => { try { const B = BC(); return !!(B && B.has && B.has()); } catch (e) { return true; } };
    /* HOOK: the claim step is only offered once the own-companion task ships LowiBirthCompanion.claim(opts) */
    const claimReady = () => { try { const B = BC(); return !!(B && typeof B.claim === 'function'); } catch (e) { return false; } };
    const companionName = () => { try { const B = BC(), c = B && B.get && B.get(); return (c && c.name) || 'Misty'; } catch (e) { return 'Misty'; } };
    const companionArt = () => { try { const B = BC(); if (B && B.svg) return B.svg(null, { size: 64 }); } catch (e) { } return ''; };
    const store = { get() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; } }, set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { } } };

    /* what the tour gives way to: setup / sign-in, every other dialog, the Day card's list of sheets, Misty in flight */
    const OWN = '#ltTour';
    /* a sheet that is already on its way out (LowiR2 marks it .off at once; the Gap sheet drops .on) is not a panel to wait for: the
       You sheet's close animation took 4.6 s in the short tour, and the next card stayed hidden behind it (Oct 25 2026) */
    const closing = el => { try { return !!(el.closest('.r2-ov.off') || (el.closest('#gvSheet, .gv-ov') && !el.closest('#gvSheet, .gv-ov').classList.contains('on'))); } catch (e) { return false; } };
    function busyBy() {
        const stg = stage(), mine = el => !!(el.closest(OWN) || (stg && el.closest(stg)) || closing(el));
        if (H.classList.contains('gate-up') || H.classList.contains('gate-boot')) return 'setup';
        if (vis($('#r2ob')) || vis($('.hs-ivov.on'))) return 'setup';
        if (H.classList.contains('mf-on')) return 'flight';
        /* the scanner camera (opened by the user, never by the tour): wait behind it, come back once it is closed (Oct 22 2026) */
        if (H.classList.contains('b3-camon') || vis($('#b3Cam'))) return 'camera';
        const list = (W.LowiRitualCore && LowiRitualCore.BUSY) || [];
        /* the Day card's BUSY list names the tour itself ('#ltTour:not(.lt-held)', so the Day card waits for it): never count our own
           overlay, or the tour hides itself, finds nothing, shows again, and flickers every tick (Oct 19 2026, Emmanuel's iPhone) */
        for (const s of list) { let el = null; try { el = $(s); } catch (e) { } if (el && !mine(el) && vis(el)) return s; }
        for (const el of D.querySelectorAll('[aria-modal="true"], [role="dialog"].on, [role="dialog"].open')) { if (mine(el)) continue; if (vis(el)) return '#' + (el.id || el.className || 'dialog'); }
        if (H.classList.contains('ss2-open')) return 'settings';
        return '';
    }

    /* What's New as a mini tour (Oct 23 2026, Emmanuel: "take them to the place where you updated it and show them around ...
       They can skip it or go through that mini tour"). mode 'news' plays only the release's own steps from part 'new' with
       new-intro first, in this same card. It never touches the tour's saved place (store) and its events carry news: true, so
       tutorial-auto / tutorial-resume ignore it. A step's `open` names a route below: the tour opens that place once when the
       card comes up, the place's own sheet is its stage (busyBy does not wait behind it, the card sits above it), and the place
       is closed again when the next card does not need it or the tour ends; then the user is back on Home. */
    let mode = 'tour', opened = '';
    const OPEN = {
        move: { go() { if (typeof W.goTab === 'function') W.goTab('move'); }, stage: '', back() { goHome(); } },
        shop: { go() { const P = W.LowiStorePicks; if (!P) return; goHome(); if (!P.isOpen()) P.open('tour'); try { P.setTab('sz'); } catch (e) { } }, stage: '.stp-card', back() { try { if (W.LowiStorePicks && LowiStorePicks.isOpen()) LowiStorePicks.close(); } catch (e) { } } },
        /* Oct 24: the Kitchen tab in Shop (new-kitchen) */
        kitchen: { go() { const P = W.LowiStorePicks; if (!P) return; goHome(); if (!P.isOpen()) P.open('tour'); try { P.setTab('kitchen'); } catch (e) { } }, stage: '.stp-card', back() { try { if (W.LowiStorePicks && LowiStorePicks.isOpen()) LowiStorePicks.close(); } catch (e) { } } },
    };
    function stage() {
        const s = step(), r = s && (s.open || (s.demo && mode !== 'news' && s.demo.open));   /* a demo card's page is its stage too */
        return (on && r && opened === r && OPEN[r] && OPEN[r].stage) || '';
    }
    /* the short base tour's demo routes (Oct 25 2026): the finger taps or holds the real bubble, then the tour opens the real place
       read-only through the same API the bubble uses. Only open/close calls: never a log, a water, a sleep or a meal entry. */
    const bloom = k => ({ stage: '#hb2Bloom', go: () => { if (W.LowiHomeBloomsV2) W.LowiHomeBloomsV2.open(k); }, back: () => { if (W.LowiHomeBloomsV2) W.LowiHomeBloomsV2.close(); } });
    Object.assign(OPEN, {
        'misty-card': { stage: '.wh-ms-ov', go: () => { if (W.LowiWorldHome && W.LowiWorldHome.openMisty) W.LowiWorldHome.openMisty('aura'); }, back: () => { if (vis($('.wh-ms-ov')) && W.LowiWorldHome && W.LowiWorldHome.closeTop) W.LowiWorldHome.closeTop(); } },
        'gap-view': { stage: '#gvSheet', go: () => { if (W.LowiGapView) W.LowiGapView.open(); }, back: () => { if (W.LowiGapView) W.LowiGapView.close(); } },
        'fuel-bloom': bloom('fuel'), 'water-bloom': bloom('water'), 'move-bloom': bloom('move'), 'sleep-bloom': bloom('sleep'),
        'community-tab': { stage: '', go: () => { if (typeof W.goTab === 'function') W.goTab('foryou'); }, back: goHome },
        'settings-sheet': { stage: '.cme-ov', go: () => { if (W.LowiCommunityMe) W.LowiCommunityMe.open(); }, back: () => { if (W.LowiCommunityMe) W.LowiCommunityMe.close(); } },
        /* never the camera: the mocked Scan screen inside the tour's own layer (tutorial-demo.js) */
        'scan-demo': { stage: '.lt-scan', go: () => { if (W.LowiTutorialDemo && root) W.LowiTutorialDemo.scanOpen(root, lang()); }, back: () => { if (W.LowiTutorialDemo) W.LowiTutorialDemo.scanClose(); } }
    });
    function leave() { const o = opened; opened = ''; if (o && OPEN[o]) { try { OPEN[o].back(); } catch (e) { } } }
    function openFor(s) {
        if (opened && (!s || s.open !== opened)) leave();
        if (s && s.open && OPEN[s.open] && opened !== s.open) { opened = s.open; try { OPEN[s.open].go(); } catch (e) { } }
        if (root) root.classList.toggle('lt-staged', !!(s && (s.open || (s.demo && opened && opened === s.demo.open))));
        if (!(s && s.open) && !(s && s.demo && opened)) room('');
    }
    let on = false, list = [], i = 0, root = null, timer = 0, held = false, afterClaim = false, lastFocus = null, startedAt = 0;
    let secUntil = 0;
    /* hands-free (Oct 22 2026, Emmanuel: "would be nice if I don't have to press the next button every time. If I did turn on the
       mic, I should be able to just place my phone somewhere and just listen as it goes, by itself"): with the speaker on, each card
       moves on by itself a short pause after it was read to the end. Next / Back still work. Pause on the card stops the voice and
       the moving on until Play (or the speaker) is tapped. Narration still only ever starts from a tap (iOS); a card the browser
       would not play (no tap yet) never moves on by itself. The last card and the claim card wait for the user. */
    const AUTO = { GAP: 1200 };
    let paused = false, autoT = 0, wake = null;
    const voiceOn = () => { try { return !!(W.LowiTutorialVoice && W.LowiTutorialVoice.isOn()); } catch (e) { return false; } };
    const clearT = id => { try { if (id) (W.clearTimeout || clearTimeout)(id); } catch (e) { } };
    const step = () => list[i] || null;
    function emit(extra) { try { W.dispatchEvent(new CustomEvent('lowi:tutorial', { detail: Object.assign({ on, step: step() && step().id }, mode === 'news' ? { news: true } : {}, extra || {}) })); } catch (e) { } }

    function target(s) {
        for (const sel of (s && s.target) || []) { let el = null; try { el = $(sel); } catch (e) { } if (el && vis(el)) { const r = el.getBoundingClientRect(); if (r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth) return el; } }
        return null;
    }
    function ensureRoot() {
        if (root && root.isConnected) return root;
        root = D.createElement('div'); root.id = 'ltTour'; root.className = 'lt-tour'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
        root.setAttribute('aria-labelledby', 'ltTitle'); root.setAttribute('aria-describedby', 'ltText'); root.setAttribute('data-noi18n', '');
        root.innerHTML = '<div class="lt-hole" aria-hidden="true"></div><div class="lt-card" tabindex="-1"></div>';
        root.classList.toggle('lt-voice', voiceOn());
        D.body.appendChild(root);
        root.addEventListener('click', onClick);
        root.addEventListener('keydown', onKey);
        return root;
    }
    function render() {
        const s = step(); if (!s || !root) return;
        const l = lang(), U = S.UI[l] || S.UI.en, vars = { name: companionName() }, last = i === list.length - 1;
        const news = mode === 'news';
        const cta = s.cta ? S.text(s, 'cta', l, vars) : (last && news ? (U.newsDone || U.next) : U.next);
        const card = root.querySelector('.lt-card');
        card.innerHTML =
            '<div class="lt-top"><span class="lt-guide" aria-label="' + esc(U.guide) + ': ' + esc(vars.name) + '">' + companionArt() + '</span>' +
            '<span class="lt-meta"><small class="lt-count">' + esc((news ? (U.newsLabel || U.label) : U.label) + ' \u00b7 ' + S.fill(U.of, { i: i + 1, n: list.length })) + '</small>' +
            '<b class="lt-title" id="ltTitle">' + esc(S.text(s, 'title', l, vars)) + '</b></span>' +
            (last ? '' : '<button type="button" class="lt-skipall" data-lt="skipall">' + esc(news ? (U.newsSkip || U.skip) : U.skipAll) + '</button>') + '</div>' +
            '<p class="lt-text" id="ltText">' + esc(S.text(s, 'text', l, vars)) + '</p>' + peekHtml(s, U) + laterHtml(s, U) +
            '<div class="lt-btns"><span class="lt-left">' +
            (i > 0 ? '<button type="button" class="lt-btn lt-ghost" data-lt="back">' + esc(U.back) + '</button>' : '') +
            '<button type="button" class="lt-btn lt-ghost lt-pause" data-lt="pause" aria-pressed="' + paused + '" aria-label="' + esc(paused ? (U.play || 'Play') : (U.pause || 'Pause')) + '">' + (paused ? PLAY_SVG : PAUSE_SVG) + '</button></span>' +
            '<span class="lt-right">' + (last || news ? '' : '<button type="button" class="lt-btn lt-ghost" data-lt="skip">' + esc(U.skip) + '</button>') +
            '<button type="button" class="lt-btn lt-go" data-lt="' + (s.action === 'claim' ? 'claim' : 'next') + '">' + esc(cta) + '</button></span></div>';
        root.setAttribute('data-step', s.id); root.classList.toggle('lt-news', news);
        root.classList.toggle('lt-later-on', !!(s && s.later));
        if (!(s.demo && mode !== 'news')) { try { if (W.LowiTutorialShow) W.LowiTutorialShow.render(card, s, root); } catch (e) { } }   /* item 42: finger, lit spots, card picture */
        else { try { if (W.LowiTutorialShow && W.LowiTutorialShow.clear) W.LowiTutorialShow.clear(root); } catch (e) { } }
        demoStart(s);
        root.classList.toggle('lt-voice', voiceOn()); root.classList.toggle('lt-paused', paused);
        place();
        /* tutorial-voice.js: the companion picture is the speaker; reads the card aloud when sound is on (Oct 21 2026); onEnd = hands-free */
        try { if (W.LowiTutorialVoice) W.LowiTutorialVoice.render(card, s, { lang: l, name: vars.name, next: list.slice(i + 1, i + 3), onEnd: said, quiet: paused }); } catch (e) { }
        try { (card.querySelector(focusSel || '[data-lt="claim"],[data-lt="next"]') || card).focus({ preventScroll: true }); } catch (e) { }
        focusSel = '';
        keepAwake();
    }
    /* a picture of a screen the tour does not open (Scan: opening it starts the camera and iOS asks for permission) */
    function peekHtml(s, U) {
        const k = s && s.peek; if (!k || k.kind !== 'scan') return '';
        const P = U.peek || S.UI.en.peek, m = k.mark || '';
        return '<div class="lt-peek" data-peek="scan" data-mark="' + esc(m) + '" aria-hidden="true">' +
            '<div class="ltp-top"><span class="ltp-x"></span><b>' + esc(P.title) + '</b></div>' +
            '<div class="ltp-frame"><span class="ltp-c c1"></span><span class="ltp-c c2"></span><span class="ltp-c c3"></span><span class="ltp-c c4"></span><span class="ltp-bars"></span><span class="ltp-laser"></span></div>' +
            '<div class="ltp-hint">' + esc(P.aim) + '</div>' +
            '<div class="ltp-field"><span>' + esc(P.field) + '</span><span class="ltp-dot"></span></div>' +
            '<div class="ltp-acts"><span class="ltp-pill">' + esc(P.barcode) + '</span></div>' +
            '<div class="ltp-deep"><b>' + esc(P.deep) + '</b><small>' + esc(P.deepS) + '</small></div>' +
            '</div><p class="lt-peeknote">' + esc(P.note) + '</p>';
    }
    /* item 38 (Oct 22 2026, Emmanuel: "In tutorial it tells the person to do stuff but then you can't actually do the stuff so either make
       sure they understand they can play after tutorial or let them actually do the gesture"). later: a small looping hand showing the motion, tagged
       "After the tour", on cards whose text says it is done after the tour. */
    const HAND = '<span class="lt-hand" aria-hidden="true"><span class="lt-hand1"></span><span class="lt-hand2"></span></span>';
    function laterHtml(s, U) {
        const how = s && s.later; if (!how || s.peek) return '';
        return '<div class="lt-later" data-how="' + esc(how) + '" aria-hidden="true"><span class="lt-latertag">' + esc(U.laterTag || S.UI.en.laterTag) + '</span>' +
            '<span class="lt-laterbox"><span class="lt-obj"></span>' + HAND + '</span></div>';
    }
    const PAUSE_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor"/></svg>';
    const PLAY_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>';
    let focusSel = '';
    /* hands-free: the card was read to the end; move on after a short pause unless something changed meanwhile */
    /* ---------- the auto demo (Oct 25 2026, Emmanuel: "the tour auto-advances when the voice and demo finish. Pause, Back and Skip must
       stop cleanly"). Each base card: the finger (tutorial-demo.js) taps or holds the real bubble, the real place opens read-only, and
       the card moves on by itself once BOTH the demo has shown the page (demoDone) AND the card was read: the voice ended (voiceDone)
       or, with the speaker off, the reading time passed (readDone). A page the user closes is never opened again on the same card
       (demoAt), and the next card waits DEMO.CLOSE_PAUSE after a page closed, so the tour never jumps straight into the next demo. */
    const DEMO = { CLOSE_PAUSE: 650, READ_MIN: 2600, READ_PER_CHAR: 55, START: 450 };
    let demoAt = -1, demoDone = -1, voiceDone = -1, readDone = -1, readT = 0, demoT = 0, demoWait = 0, demoOpened = -1;
    const Demo = () => W.LowiTutorialDemo || null;
    function demoReset() {
        clearT(readT); clearT(demoT); readT = demoT = 0;
        demoAt = demoDone = voiceDone = readDone = demoOpened = -1;
        try { if (Demo()) Demo().stop(); } catch (e) { }
    }
    function readMs(s) { const t = S.text(s, 'text', lang(), { name: companionName() }) || ''; return Math.max(DEMO.READ_MIN, t.length * DEMO.READ_PER_CHAR); }
    function demoOpen(s) {
        const r = s && s.demo && s.demo.open; if (!r || !OPEN[r]) return;
        if (opened && opened !== r) leave();
        if (opened !== r) { opened = r; try { OPEN[r].go(); } catch (e) { } }
        demoOpened = i;
        if (root) root.classList.add('lt-staged');
        place(); for (const ms of [60, 160, 380, 800]) setTimeout(place, ms);   /* the page animates in: settle the card on its real pieces */
    }
    function demoStart(s) {
        if (!s || !s.demo || mode === 'news' || !on || held || paused) return;
        if (demoAt === i) return;   /* a re-render (language, speaker, coming back from hidden) never restarts the demo */
        demoAt = i; const at = i;
        readAfter(at, readMs(s) + (demoWait || 0) + (voiceOn() ? 1500 : 0));
        clearT(demoT);
        demoT = setTimeout(() => {
            demoT = 0; if (!on || held || paused || i !== at) return;
            const D2 = Demo(), el = target(s);
            if (!D2) { demoOpen(s); demoDone = at; demoGo(); return; }
            D2.run({
                root, el, g: s.demo.g,
                onGesture: () => { if (on && i === at && !paused) demoOpen(s); },
                then: s.demo.open === 'scan-demo' ? (done, m) => D2.scanThen(done, m) : null,
                onShown: () => { if (on && i === at) { demoDone = at; demoGo(); } }
            });
        }, DEMO.START + (demoWait || 0));
        demoWait = 0;
    }
    /* the reading time: with the speaker off it is what moves the card on; with the speaker on it is the safety net for a voice the
       browser blocked (no tap yet) and waits while a clip is still playing, so a card is never cut off mid-sentence */
    function readAfter(at, ms) {
        clearT(readT);
        readT = setTimeout(function chk() {
            readT = 0; if (!on || i !== at || paused) return;
            let talking = false; try { talking = voiceOn() && !!(W.LowiTutorialVoice && W.LowiTutorialVoice.playing()); } catch (e) { }
            if (talking) { readT = setTimeout(chk, 500); return; }
            readDone = at; demoGo();
        }, ms);
    }
    function demoGo() {
        const s = step(), at = i;
        if (!on || held || paused || !s || !s.demo || mode === 'news' || at >= list.length - 1) return;
        if (demoDone !== at || (voiceDone !== at && readDone !== at)) return;
        if (autoT) return;
        const wait = AUTO.GAP, card = root && root.querySelector('.lt-card');
        if (card && !reduced()) { card.style.setProperty('--lt-auto', wait + 'ms'); card.classList.remove('lt-autogo'); void card.offsetWidth; card.classList.add('lt-autogo'); }
        autoT = setTimeout(() => { autoT = 0; if (on && !held && !paused && i === at) go(at + 1, 'auto'); }, wait);
        emit({ auto: s.id, wait, demo: true });
    }
    function demoPause(p) {
        const s = step(); if (!s || !s.demo) return;
        clearT(readT); readT = 0; clearT(demoT); demoT = 0;
        if (p) {
            try { if (Demo()) Demo().stop(); } catch (e) { }
            /* the page stays as it is: already shown counts as shown; a demo cut off before the page opened plays again on Play */
            if (demoOpened === i) demoDone = i; else demoAt = -1;
            return;
        }
        if (demoAt === i && readDone !== i) readAfter(i, DEMO.READ_MIN);
        if (demoAt === i) demoGo();
    }
    /* where the card sits while a page is open: the free edge, and the page gives it room (tutorial-demo.css) */
    /* the sheet the tour opened gets its height capped inline (important), so it starts below the card: the stylesheet rule lost to
       the sheets' own max-height on the r2 sheets (Oct 25 2026, card covered 33% of Misty's card) */
    let sizedEl = null, sizedPx = 0;
    function sized(el, px) {
        if (sizedEl && sizedEl !== el) { try { sizedEl.style.removeProperty('max-height'); } catch (e) { } sizedEl = null; }
        if (el) { try { sizedPx = Math.max(160, Math.round(px)); el.style.setProperty('max-height', sizedPx + 'px', 'important'); sizedEl = el; } catch (e) { } }
    }
    /* the visible pieces of the page the tour opened, without full-screen backdrops (the bloom's tap-away layer is a button too) */
    function stageBoxes() {
        const r = opened && OPEN[opened]; if (!r || !r.stage) return [];
        let el = null; try { el = $(r.stage); } catch (e) { } if (!el || !vis(el)) return [];
        const vw = H.clientWidth || innerWidth, vh = innerHeight, out = [];
        for (const c of el.querySelectorAll('.r2-sh, .gv-card, button, .lts-frame, .lts-verdict, .lts-shutter')) {
            if (!vis(c) || closing(c)) continue; const q = c.getBoundingClientRect();
            if (q.width < 4 || q.height < 4 || q.width * q.height > 0.6 * vw * vh) continue;
            out.push(q);
        }
        return out;
    }
    function room(where) {
        try {
            H.classList.toggle('lt-room-top', where === 'top'); H.classList.toggle('lt-room-bottom', where === 'bottom');
            if (!where) { H.style.removeProperty('--lt-ch'); sized(null); }
        } catch (e) { }
    }
    function said() {
        clearT(autoT); autoT = 0;
        const s = step(), at = i;
        if (s && s.demo && mode !== 'news') { voiceDone = at; demoGo(); return; }
        if (!on || held || paused || !s || !voiceOn() || at >= list.length - 1 || s.action === 'claim') return;
        const wait = AUTO.GAP;
        const card = root && root.querySelector('.lt-card');
        if (card && !reduced()) { card.style.setProperty('--lt-auto', wait + 'ms'); card.classList.remove('lt-autogo'); void card.offsetWidth; card.classList.add('lt-autogo'); }
        autoT = setTimeout(() => { autoT = 0; if (on && !held && !paused && i === at && voiceOn()) go(at + 1, 'auto'); }, wait);
        emit({ auto: s.id, wait });
    }
    function cancelAuto() { clearT(autoT); autoT = 0; const c = root && root.querySelector('.lt-card'); if (c) c.classList.remove('lt-autogo'); }
    function setPaused(v) {
        paused = !!v; cancelAuto();
        if (paused) { try { if (W.LowiTutorialVoice) W.LowiTutorialVoice.stop(); } catch (e) { } }
        demoPause(paused);
        focusSel = '[data-lt="pause"]';
        if (on && !held) render();
        emit({ paused });
    }
    /* keep the screen on while it reads by itself (phone put down); best effort, Safari 16.4+ */
    function keepAwake() {
        const want = on && !held && !paused && voiceOn() && !D.hidden;
        try {
            if (want && !wake && navigator.wakeLock && navigator.wakeLock.request) {
                wake = 'asking';
                navigator.wakeLock.request('screen').then(w => { if (wake !== 'asking') { try { w.release(); } catch (e) { } return; } wake = w; w.addEventListener && w.addEventListener('release', () => { if (wake === w) wake = null; }); }, () => { wake = null; });
            } else if (!want && wake) { const w = wake; wake = null; if (w !== 'asking' && w.release) w.release().catch(() => { }); }
        } catch (e) { wake = null; }
    }
    /* spotlight on the target; the card below it, or above when there is no room, always fully on screen */
    function place() {
        if (!root || held) return;
        const s = step(), el = target(s), hole = root.querySelector('.lt-hole'), card = root.querySelector('.lt-card');
        const vw = H.clientWidth || innerWidth, vh = innerHeight, m = 12;
        const cw = Math.min(360, vw - 2 * m); card.style.width = cw + 'px';
        const ch = card.offsetHeight || 200;
        const sd = s && s.demo && mode !== 'news' && opened && opened === s.demo.open;
        if (sd) {
            /* a page is open: the card slides to the free edge (top unless the page's content sits in the upper half) */
            const sat = parseFloat(getComputedStyle(H).getPropertyValue('--sat')) || 0, sab = parseFloat(getComputedStyle(H).getPropertyValue('--sab')) || 0;
            const need = Math.round(ch + 2 * m + 8), boxes = stageBoxes();
            const sheet = (() => { const r = OPEN[opened]; let st = null; try { st = r && r.stage && $(r.stage); } catch (e) { } const sh = st && st.querySelector('.r2-sh, .gv-card'); return sh && vis(sh) && !closing(sh) ? sh : null; })();
            let where = 'top';
            if (opened === 'community-tab') where = 'bottom';
            else if (sheet) {
                /* the sheet shrinks until it starts below the card: measured, not guessed (the You sheet is centred, Misty's card sits
                   24 px above the bottom), so each placement takes off what still overlaps; a centred sheet loses it twice */
                where = 'top';
                const q = sheet.getBoundingClientRect(), cardBot = Math.max(m, m + sat) + ch + 10, over = cardBot - q.top;
                const centred = q.bottom < vh - sab - 30, cur = sizedEl === sheet ? sizedPx : Math.min(q.height, vh - need - sat);
                sized(sheet, over > 0 ? cur - over * (centred ? 2 : 1) : cur);
            }
            else if (boxes.length) {
                /* free bands above and below the page's pieces; the card takes the bigger one (bloom bubbles fan up or down) */
                const top = Math.min(...boxes.map(q => q.top)), bot = Math.max(...boxes.map(q => q.bottom));
                where = (vh - sab - bot) > (top - sat) ? 'bottom' : 'top';
            }
            if (!sheet) sized(null);
            H.style.setProperty('--lt-ch', need + 'px'); room(where);
            root.classList.remove('lt-center'); hole.style.cssText = '';
            card.style.left = Math.round((vw - cw) / 2) + 'px';
            card.style.top = Math.round(where === 'top' ? Math.max(m, m + sat) : vh - ch - m - sab) + 'px';
            card.setAttribute('data-room', where);
            return;
        }
        card.removeAttribute('data-room');
        if (!el) {
            root.classList.add('lt-center'); hole.style.cssText = '';
            card.style.left = Math.round((vw - cw) / 2) + 'px'; card.style.top = Math.round(Math.max(m, (vh - ch) / 2)) + 'px';
            show(null, s);
            return;
        }
        root.classList.remove('lt-center');
        const r = el.getBoundingClientRect(), pad = 8, d = Math.max(r.width, r.height) + pad * 2;
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        hole.style.cssText = 'left:' + Math.round(cx - d / 2) + 'px;top:' + Math.round(cy - d / 2) + 'px;width:' + Math.round(d) + 'px;height:' + Math.round(d) + 'px';
        const below = cy + d / 2 + 12, above = cy - d / 2 - 12 - ch;
        let top = below + ch <= vh - m ? below : above >= m ? above : Math.max(m, Math.min(vh - ch - m, below));
        /* a big target (Misty) with no room on either side: the card sits at the bottom edge, clear of the safe area */
        if (top < m) top = m;
        const left = Math.round(Math.max(m, Math.min(vw - cw - m, cx - cw / 2)));
        card.style.left = left + 'px'; card.style.top = Math.round(top) + 'px';
        show(el, s);
    }
    function show(el, s) { try { if (W.LowiTutorialShow) W.LowiTutorialShow.place(root, el, s); } catch (e) { } }
    function hold(why) { if (held || !root) return; cancelAuto(); try { if (W.LowiTutorialVoice) W.LowiTutorialVoice.stop(); } catch (e) { } held = true; root.classList.add('lt-held'); root.setAttribute('aria-hidden', 'true'); root.setAttribute('data-held', why || ''); }
    function unhold() {
        if (!held || !root) return; held = false; root.classList.remove('lt-held'); root.removeAttribute('aria-hidden'); root.removeAttribute('data-held');
        if (afterClaim) { afterClaim = false; go(i + 1, 'claim-closed'); return; }
        render();
    }

    /* ---------- sections (Oct 21 2026, Emmanuel: "taking us to honestly every section ... Pinch, click, long
       click, press, all this stuff, how are people supposed to know?") ----------
       A step's `where` / `rm` say which screen it belongs on; the tour takes the user there for a moment after each step change
       and then leaves them alone. (Try it now and the practice pads were retired with the long tour on Oct 25 2026: the demo finger
       shows each gesture instead, so the tour no longer listens to the user's touches at all.) */
    /* No 'scan' here on purpose: goTab('scan') opens the scanner camera at once, and the tour calls goSection on every tick for
       2.5 s, so it kept opening the camera and iOS kept asking for permission; a tour left on a Scan card reopened it on the next
       start (Emmanuel's iPhone, Oct 21 2026). The Scan cards show a picture of the inside instead (peek). */
    const TAB_OF = { home: 'home', community: 'foryou' };
    function goSection(s) {
        if (!s) return;
        try {
            const tab = TAB_OF[s.where || 'home'] || 'home', pane = D.getElementById('tab-' + tab);
            if (pane && !pane.classList.contains('active')) {
                if (tab === 'home') goHome();
                else if (typeof W.goTab === 'function') W.goTab(tab);
                else { const b = $('#tabbar .tb[data-tab="' + tab + '"]'); if (b) b.click(); }
                return;
            }
            if (s.rm) { const b = $('.rm-tab[data-rm="' + s.rm + '"]'); if (b && b.getAttribute('aria-selected') !== 'true' && !b.classList.contains('on')) b.click(); else if (!b && W.LowiRoomsUI && W.LowiRoomsUI.showView && W.LowiRoomsUI.view() !== s.rm) W.LowiRoomsUI.showView(s.rm); /* Creation / Affiliates: halves of the Studio tab since 24 Oct 2026 */ }
        } catch (e) { }
    }
    /* hide at once, but come back only after QUIET_TICKS quiet ticks in a row, so a sheet's closing animation can't blink it */
    const QUIET_TICKS = 2;
    let quiet = 0;
    function tick() {
        if (!on) return;
        const why = busyBy();
        if (why) { quiet = 0; hold(why); }
        else if (held) { if (++quiet >= QUIET_TICKS) { quiet = 0; unhold(); } }
        else { const s = step(); if (Date.now() < secUntil && !(s && s.open) && !(s && s.demo)) goSection(s); place(); }
    }
    function go(n, how) {
        if (n >= list.length) { stop('finished'); return; }
        cancelAuto();
        i = Math.max(0, n); held = false; if (root) { root.classList.remove('lt-held'); root.removeAttribute('aria-hidden'); }
        if (mode !== 'news') { const st = store.get(); st.last = step().id; store.set(st); }
        secUntil = Date.now() + 2500;
        const wasOpen = !!opened; demoReset(); demoWait = wasOpen ? DEMO.CLOSE_PAUSE : 0;
        openFor(step()); if (!step().open) goSection(step());
        emit({ how });
        if (busyBy()) { hold(busyBy()); return; }
        render();
    }
    function claim() {
        const B = BC(); afterClaim = true;
        try {
            if (B && typeof B.claim === 'function') B.claim({ from: 'tutorial' });
            else { afterClaim = false; go(i + 1, 'no-claim'); return; }
        } catch (e) { afterClaim = false; go(i + 1, 'claim-error'); return; }
        hold('claim');
        /* the claim step paints a moment later; if nothing opened at all, carry on instead of waiting forever */
        setTimeout(() => { if (on && afterClaim && !busyBy()) unhold(); }, 900);
    }
    function onClick(e) {
        const b = e.target.closest('[data-lt]');
        e.stopPropagation();
        if (!b) return;
        const a = b.getAttribute('data-lt');
        if (a === 'next') go(i + 1, 'next');
        else if (a === 'back') go(i - 1, 'back');
        else if (a === 'skip') go(S.skipIndex(list, i), 'skip');
        else if (a === 'skipall') stop('skipped');
        else if (a === 'claim') claim();
        else if (a === 'pause') setPaused(!paused);
    }
    function onKey(e) {
        if (held) return;
        /* Escape / back-swipe leaves the card, it does not end the tour: the "Continue tutorial" button (tutorial-resume.js) brings it back. Skip all ends it. */
        if (e.key === 'Escape') { e.preventDefault(); stop('left'); }
        else if (e.key === 'ArrowRight' && !/^(INPUT|TEXTAREA)$/.test((e.target || {}).tagName)) { e.preventDefault(); if (step() && step().action === 'claim') claim(); else go(i + 1, 'key'); }
        else if (e.key === 'ArrowLeft' && i > 0) { e.preventDefault(); go(i - 1, 'key'); }
        else if (e.key === 'Tab') {
            const f = Array.from(root.querySelectorAll('.lt-card button')); if (!f.length) return;
            const k = f.indexOf(D.activeElement);
            if (e.shiftKey && k <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && k === f.length - 1) { e.preventDefault(); f[0].focus(); }
        }
    }
    function goHome() {
        try {
            const home = D.getElementById('tab-home');
            if (home && !home.classList.contains('active') && typeof window.goTab === 'function') window.goTab('home');
        } catch (e) { }
    }
    function start(opts) {
        const o = opts || {};
        if (on) stop('restart');
        mode = 'tour'; opened = '';
        list = S.plan({ noOwnCompanion: !ownCompanion(), claimReady: !ownCompanion() && claimReady() });
        if (!list.length) return false;
        on = true; i = 0; held = false; afterClaim = false; startedAt = Date.now(); paused = false;
        lastFocus = D.activeElement;
        goHome();
        ensureRoot();
        H.classList.add('lt-on'); if (reduced()) root.classList.add('lt-rm');
        store.set(Object.assign(store.get(), { v: S.VERSION, at: new Date().toISOString(), done: false, from: o.from || '' }));
        clearInterval(timer); timer = setInterval(tick, 350);
        /* opts.at: begin at that step id (tutorial-auto.js: continue a tour that was left halfway) */
        let at = 0; const want = o.at; if (want) { const k = list.findIndex(x => x.id === want); if (k > 0) at = k; }
        { const st0 = store.get(); if (st0.resume && st0.resume.via === 'tryit') { delete st0.resume.via; store.set(st0); } }   /* picked up once */
        go(at, 'start');
        return true;
    }
    /* news: version.json's news entry. Plays new-intro + its tour steps, or one card with its own text (a fix). false when the
       full tour is running (it already ends with part 'new') or there is nothing to show. */
    function news(n) {
        if (on || !n) return false;
        const ids = S.tourOf ? S.tourOf(n) : [], byId = id => S.STEPS.find(x => x.id === id);
        let l = ids.map(byId).filter(Boolean);
        if (l.length) { const intro = byId('new-intro'); if (intro) l.unshift(intro); }
        else if (S.newsCard) { const c = S.newsCard(n); if (!c.text.en) return false; l = [c]; }
        if (!l.length) return false;
        mode = 'news'; opened = ''; list = l;
        on = true; i = 0; held = false; afterClaim = false; startedAt = Date.now(); paused = false;
        lastFocus = D.activeElement;
        goHome();
        ensureRoot();
        H.classList.add('lt-on'); if (reduced()) root.classList.add('lt-rm');
        clearInterval(timer); timer = setInterval(tick, 350);
        go(0, 'news');
        return true;
    }
    function stop(reason) {
        if (!on) return;
        on = false; clearInterval(timer); timer = 0; afterClaim = false; cancelAuto(); paused = false; keepAwake();
        demoReset(); room('');
        if (mode !== 'news') { const st = store.get(); st.done = reason === 'finished'; st.skipped = reason === 'skipped' ? (step() && step().id) || '' : ''; st.v = S.VERSION; st.end = new Date().toISOString(); store.set(st); }
        emit({ reason, news: mode === 'news' });
        if (opened) { leave(); goHome(); } else if (mode === 'news') goHome();
        mode = 'tour';
        const r = root; root = null; H.classList.remove('lt-on');
        if (r) { r.classList.add('lt-out'); setTimeout(() => r.remove(), reduced() ? 0 : 220); }
        try { if (lastFocus && lastFocus.isConnected && lastFocus.focus) lastFocus.focus({ preventScroll: true }); } catch (e) { }
    }
    W.addEventListener('resize', () => { if (on) place(); });
    W.addEventListener('lowi:lang', () => { if (on && !held) render(); });
    W.addEventListener('lowi:companion', () => { if (on && !held) render(); });
    /* the speaker turned on / off on the card: show or hide Pause; turning it on again also ends a pause */
    W.addEventListener('lowi:tutorial-voice', e => {
        const d = e.detail || {}; if (!on || !root) return;
        if (d.state === 'off') { cancelAuto(); if (paused) { paused = false; focusSel = '.lt-speak'; if (!held) render(); } }
        if (d.state === 'on' && paused) { paused = false; root.classList.remove('lt-paused'); const b = root.querySelector('[data-lt="pause"]'); if (b) { b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label', ((S.UI[lang()] || S.UI.en).pause) || 'Pause'); b.innerHTML = PAUSE_SVG; } }
        root.classList.toggle('lt-voice', voiceOn()); keepAwake();
    });
    try { D.addEventListener('visibilitychange', () => { if (D.hidden) cancelAuto(); keepAwake(); }); } catch (e) { }
    if (!D.getElementById('ltCss') && !D.querySelector('link[href^="tutorial.css"]')) { const m = $('meta[name="lowi-build"]'), l = D.createElement('link'); l.id = 'ltCss'; l.rel = 'stylesheet'; l.href = 'tutorial.css?v=' + encodeURIComponent(m ? m.content : '1'); D.head.appendChild(l); }
    /* tutorial-auto.js (new accounts get the tour once) loads from here, so index.html's versioned script list stays untouched */
    if (!W.LowiTutorialAuto && !D.querySelector('script[src^="tutorial-auto.js"]')) { const m = $('meta[name="lowi-build"]'), sc = D.createElement('script'); sc.src = 'tutorial-auto.js?v=' + encodeURIComponent((m && m.content) || '1'); sc.defer = true; D.head.appendChild(sc); }
    /* tutorial-voice.js (the speaker on every card) loads the same way */
    if (!W.LowiTutorialVoice && !D.querySelector('script[src^="tutorial-voice.js"]')) { const m = $('meta[name="lowi-build"]'), sc = D.createElement('script'); sc.src = 'tutorial-voice.js?v=' + encodeURIComponent((m && m.content) || '1'); sc.defer = true; D.head.appendChild(sc); }
    /* tutorial-show.js (item 42: the finger on the real control, lit spots, the picture of what opens) loads the same way */
    if (!W.LowiTutorialShow && !D.querySelector('script[src^="tutorial-show.js"]')) { const m = $('meta[name="lowi-build"]'), sc = D.createElement('script'); sc.src = 'tutorial-show.js?v=' + encodeURIComponent((m && m.content) || '1'); sc.defer = true; D.head.appendChild(sc); }
    /* tutorial-resume.js (the floating "Continue tutorial" button until the tour is finished or skipped) loads the same way */
    if (!W.LowiTutorialResume && !D.querySelector('script[src^="tutorial-resume.js"]')) { const m = $('meta[name="lowi-build"]'), sc = D.createElement('script'); sc.src = 'tutorial-resume.js?v=' + encodeURIComponent((m && m.content) || '1'); sc.defer = true; D.head.appendChild(sc); }
    /* tutorial-demo.js (the short tour's brown finger and the mocked Scan) and tutorial-flight.js (her first real autopilot flight after
       the first finished tour) load the same way */
    ['tutorial-demo.js', 'tutorial-flight.js'].forEach(f => { if (!D.querySelector('script[src^="' + f + '"]')) { const m = $('meta[name="lowi-build"]'), sc = D.createElement('script'); sc.src = f + '?v=' + encodeURIComponent((m && m.content) || '1'); sc.defer = true; D.head.appendChild(sc); } });
    W.LowiTutorial = { start, news, mode: () => (on ? mode : ''), opened: () => opened, stage: () => stage(), stop, isOn: () => on, step: () => (step() || {}).id || null, held: () => held, busyBy, core: S, ids: () => list.map(x => x.id),
        paused: () => paused, pause: v => setPaused(v == null ? true : v), auto: () => !!autoT,
        demo: () => ({ at: demoAt, shown: demoDone, voice: voiceDone, read: readDone, opened: demoOpened }) };
})();
