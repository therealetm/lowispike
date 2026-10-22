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
    function busyBy() {
        if (H.classList.contains('gate-up') || H.classList.contains('gate-boot')) return 'setup';
        if (vis($('#r2ob')) || vis($('.hs-ivov.on'))) return 'setup';
        if (H.classList.contains('mf-on')) return 'flight';
        /* the scanner camera (opened by the user, never by the tour): wait behind it, come back once it is closed (Oct 22 2026) */
        if (H.classList.contains('b3-camon') || vis($('#b3Cam'))) return 'camera';
        const list = (W.LowiRitualCore && LowiRitualCore.BUSY) || [];
        /* the Day card's BUSY list names the tour itself ('#ltTour:not(.lt-held)', so the Day card waits for it): never count our own
           overlay, or the tour hides itself, finds nothing, shows again, and flickers every tick (Oct 19 2026, Emmanuel's iPhone) */
        for (const s of list) { let el = null; try { el = $(s); } catch (e) { } if (el && !el.closest(OWN) && vis(el)) return s; }
        for (const el of D.querySelectorAll('[aria-modal="true"], [role="dialog"].on, [role="dialog"].open')) { if (el.closest(OWN)) continue; if (vis(el)) return '#' + (el.id || el.className || 'dialog'); }
        if (H.classList.contains('ss2-open')) return 'settings';
        return '';
    }

    let on = false, list = [], i = 0, root = null, timer = 0, held = false, afterClaim = false, lastFocus = null, startedAt = 0;
    let tried = -1, secUntil = 0, tryNext = 0;
    /* hands-free (Oct 22 2026, Emmanuel: "would be nice if I don't have to press the next button every time. If I did turn on the
       mic, I should be able to just place my phone somewhere and just listen as it goes, by itself"): with the speaker on, each card
       moves on by itself a short pause after it was read to the end. Next / Back still work. Pause on the card stops the voice and
       the moving on until Play (or the speaker) is tapped. Narration still only ever starts from a tap (iOS); a card the browser
       would not play (no tap yet) never moves on by itself. The last card and the claim card wait for the user. */
    const AUTO = { GAP: 1200, TRY: 4500 };
    let paused = false, autoT = 0, wake = null;
    const voiceOn = () => { try { return !!(W.LowiTutorialVoice && W.LowiTutorialVoice.isOn()); } catch (e) { return false; } };
    const clearT = id => { try { if (id) (W.clearTimeout || clearTimeout)(id); } catch (e) { } };
    const step = () => list[i] || null;
    function emit(extra) { try { W.dispatchEvent(new CustomEvent('lowi:tutorial', { detail: Object.assign({ on, step: step() && step().id }, extra || {}) })); } catch (e) { } }

    /* item 38: a card the user can try on (the real control, or a practice pad on the card) */
    const canTry = s => !!(s && (s.tryIt || s.practice));
    const wants = s => (s && (s.tryIt || s.practice) || {}).how;
    function target(s) {
        if (s && s.practice) return null;   /* the practice pad is the thing to touch: no spotlight on a real control that ignores touches */
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
        const cta = s.cta ? S.text(s, 'cta', l, vars) : (last ? U.next : U.next);
        const card = root.querySelector('.lt-card');
        card.innerHTML =
            '<div class="lt-top"><span class="lt-guide" aria-label="' + esc(U.guide) + ': ' + esc(vars.name) + '">' + companionArt() + '</span>' +
            '<span class="lt-meta"><small class="lt-count">' + esc(U.label + ' \u00b7 ' + S.fill(U.of, { i: i + 1, n: list.length })) + '</small>' +
            '<b class="lt-title" id="ltTitle">' + esc(S.text(s, 'title', l, vars)) + '</b></span>' +
            (last ? '' : '<button type="button" class="lt-skipall" data-lt="skipall">' + esc(U.skipAll) + '</button>') + '</div>' +
            '<p class="lt-text" id="ltText">' + esc(S.text(s, 'text', l, vars)) + '</p>' + tryHtml(s, U) + peekHtml(s, U) + padHtml(s, U) + laterHtml(s, U) +
            '<div class="lt-btns"><span class="lt-left">' +
            (i > 0 ? '<button type="button" class="lt-btn lt-ghost" data-lt="back">' + esc(U.back) + '</button>' : '') +
            '<button type="button" class="lt-btn lt-ghost lt-pause" data-lt="pause" aria-pressed="' + paused + '" aria-label="' + esc(paused ? (U.play || 'Play') : (U.pause || 'Pause')) + '">' + (paused ? PLAY_SVG : PAUSE_SVG) + '</button></span>' +
            '<span class="lt-right">' + (last ? '' : '<button type="button" class="lt-btn lt-ghost" data-lt="skip">' + esc(U.skip) + '</button>') +
            '<button type="button" class="lt-btn lt-go" data-lt="' + (s.action === 'claim' ? 'claim' : 'next') + '">' + esc(cta) + '</button></span></div>';
        root.setAttribute('data-step', s.id);
        renderTry(s, U);
        root.classList.toggle('lt-voice', voiceOn()); root.classList.toggle('lt-paused', paused);
        /* Try it now: the voice tells us when it says the cue words, so the button wiggles right then */
        const cueing = !!(s.tryIt && tried !== i), cue = cueing ? (S.TRY_CUE && S.TRY_CUE[l]) || null : null, onCue = cueing ? () => wiggle('cue') : null;
        place();
        /* tutorial-voice.js: the companion picture is the speaker; reads the card aloud when sound is on (Oct 21 2026); onEnd = hands-free */
        try { if (W.LowiTutorialVoice) W.LowiTutorialVoice.render(card, s, { lang: l, name: vars.name, next: list.slice(i + 1, i + 3), cue, onCue, onEnd: said, quiet: paused }); } catch (e) { }
        /* no voice reading this card (speaker off or paused): the Try it now button wiggles once when the card appears */
        if (cueing && (!voiceOn() || paused) && !(wig.at === i && wig.appear)) {
            wig = wig.at === i ? Object.assign(wig, { appear: true }) : { at: i, n: 0, t: 0, appear: true };
            const at = i; setTimeout(() => { if (on && i === at) wiggle('appear'); }, reduced() ? 300 : 700);
        }
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
       sure they understand they can play after tutorial or let them actually do the gesture"). practice: a small look-alike on the card
       that takes the gesture (nothing in the app changes, no mic, no camera). later: a small looping hand showing the motion, tagged
       "After the tour", on cards whose text says it is done after the tour. */
    const HAND = '<span class="lt-hand" aria-hidden="true"><span class="lt-hand1"></span><span class="lt-hand2"></span></span>';
    function padHtml(s, U) {
        const k = s && s.practice; if (!k) return '';
        const E = S.UI.en, done = tried === i, how = k.how, look = k.look;
        const name = ((U.looks || E.looks)[look]) || look, after = ((U.done || E.done)[look]) || name;
        const verb = ((U.how || E.how)[how]) || how;
        return '<div class="lt-pad' + (done ? ' lt-done' : '') + '" data-how="' + esc(how) + '" data-look="' + esc(look) + '" role="button" tabindex="0" aria-label="' + esc(verb + ': ' + name) + '">' +
            '<span class="lt-obj"><b>' + esc(done ? after : name) + '</b></span>' + (done ? '' : HAND) +
            '<small class="lt-padhow">' + esc(done ? U.nice : verb) + '</small></div>' +
            '<p class="lt-padnote">' + esc(U.practice || E.practice) + '</p>';
    }
    function laterHtml(s, U) {
        const how = s && s.later; if (!how || s.peek) return '';
        return '<div class="lt-later" data-how="' + esc(how) + '" aria-hidden="true"><span class="lt-latertag">' + esc(U.laterTag || S.UI.en.laterTag) + '</span>' +
            '<span class="lt-laterbox"><span class="lt-obj"></span>' + HAND + '</span></div>';
    }
    /* the practice pad's own gesture detection (the window watchers ignore touches on the card) */
    let pad = null, padTaps = [], padT = 0;
    function padWire(card) {
        const el = card && card.querySelector('.lt-pad'); pad = null; if (!el || tried === i) return;
        const P = new Map(); let d = null, pinch0 = 0;
        const fire = k => { clearT(padT); d = null; didGesture(k); };
        el.addEventListener('pointerdown', e => {
            try { el.setPointerCapture(e.pointerId); } catch (x) { }
            P.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (P.size >= 2) { const a = [...P.values()]; pinch0 = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); d = null; clearT(padT); return; }
            d = { x: e.clientX, y: e.clientY, t: Date.now(), moved: false };
            el.classList.add('lt-press');
            didGesture('touch');
            clearT(padT); padT = setTimeout(() => { if (d && !d.moved) fire('hold'); }, TRY.HOLD);
        });
        el.addEventListener('pointermove', e => {
            if (!P.has(e.pointerId)) return;
            P.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (P.size >= 2) { const a = [...P.values()]; if (Math.abs(Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) - pinch0) > 18) fire('pinch'); return; }
            if (!d) return;
            const dx = e.clientX - d.x, dy = e.clientY - d.y, m = Math.hypot(dx, dy);
            if (m > TRY.MOVE) { d.moved = true; clearT(padT); }
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) fire('swipe');
            else if (m > TRY.DRAG) fire('drag');
        });
        const up = e => {
            P.delete(e.pointerId); el.classList.remove('lt-press'); clearT(padT);
            const x = d; d = null;
            if (!x || x.moved || Date.now() - x.t > TRY.TAP || e.type === 'pointercancel') return;
            const now = Date.now(); padTaps = padTaps.filter(t => now - t < TRY.MULTI * 2); padTaps.push(now);
            if (padTaps.length >= 2 && padTaps[padTaps.length - 1] - padTaps[padTaps.length - 2] < TRY.MULTI) { padTaps = []; didGesture('double'); }
            didGesture('tap');
        };
        el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
        el.addEventListener('gesturestart', e => { try { e.preventDefault(); } catch (x) { } fire('pinch'); });
        el.addEventListener('wheel', e => { if (e.ctrlKey) { try { e.preventDefault(); } catch (x) { } fire('pinch'); } }, { passive: false });
        el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); didGesture(wants(step())); } });
        pad = el;
    }
    const PAUSE_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor"/></svg>';
    const PLAY_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>';
    let focusSel = '';
    /* hands-free: the card was read to the end; move on after a short pause unless something changed meanwhile */
    function said() {
        clearT(autoT); autoT = 0;
        const s = step(), at = i;
        /* a Try it now card read to the end without its cue words (or long after them): the button wiggles now, at most twice per card */
        if (on && !held && s && s.tryIt && tried !== at && (wig.at !== at || wig.n === 0 || (wig.n === 1 && Date.now() - wig.t > 2500))) wiggle('end');
        if (!on || held || paused || !s || !voiceOn() || at >= list.length - 1 || s.action === 'claim') return;
        if (tried === at) return;   /* tried: didGesture already moves on (or waits behind the sheet it opened) */
        /* hands-free never moves past a Try it now card sooner than AUTO.TRY after its last wiggle; a practice card gets AUTO.TRY too */
        const wait = s.tryIt ? Math.max(AUTO.GAP, AUTO.TRY - (wig.at === at && wig.t ? Date.now() - wig.t : 0)) : canTry(s) ? AUTO.TRY : AUTO.GAP;
        const card = root && root.querySelector('.lt-card');
        if (card && !reduced()) { card.style.setProperty('--lt-auto', wait + 'ms'); card.classList.remove('lt-autogo'); void card.offsetWidth; card.classList.add('lt-autogo'); }
        autoT = setTimeout(() => { autoT = 0; if (on && !held && !paused && i === at && voiceOn()) go(at + 1, 'auto'); }, wait);
        emit({ auto: s.id, wait });
    }
    /* ---------- Try it now (Oct 22 2026, Emmanuel: "There is a try it now button that does nothing. Wiggle when try it now is said so
       they click on it which closes the tutorial for them to try it.") ----------
       The line under a try-it card's text is a real button. It wiggles (reduced motion: glows) when the voice says "Try it now"
       (S.TRY_CUE), when the card was read to the end without those words, or once on appearing when no voice reads it; never more
       than twice per card. Tapping it: voice off, card closed, the user stays on the screen the card is about, and the place is
       saved in lowi.tutorial.v1 .resume (tutorial-resume.js's shape: the "Continue tutorial" button brings them to the next card). */
    let wig = { at: -1, n: 0, t: 0, appear: false };
    function tryHtml(s, U) {
        if (!s || !s.tryIt) return '';
        if (tried === i) return '<p class="lt-tryline" role="status">' + esc(U.nice) + '</p>';
        return '<button type="button" class="lt-trybtn" data-lt="tryit"><span class="lt-tryhand" aria-hidden="true">\u{1F446}</span>' + esc(U.tryIt) + '</button>';
    }
    function wiggle(why) {
        const s = step(); if (!on || held || !s || !s.tryIt || tried === i) return false;
        if (wig.at !== i) wig = { at: i, n: 0, t: 0, appear: false };
        if (wig.n >= 2) return false;
        wig.n++; wig.t = Date.now();
        const b = root && root.querySelector('.lt-trybtn'), cls = reduced() ? 'lt-glow' : 'lt-wiggle';
        if (b) { b.classList.remove('lt-wiggle', 'lt-glow'); void b.offsetWidth; b.classList.add(cls); }
        emit({ wiggle: s.id, why, n: wig.n });
        return true;
    }
    function tryNow() {
        const s = step(); if (!on || !s || !s.tryIt) return;
        const at = i, ids = list.map(x => x.id);
        cancelAuto(); clearT(tryNext);
        try { if (W.LowiTutorialVoice) W.LowiTutorialVoice.stop(); } catch (e) { }
        emit({ tryNow: s.id });
        const st = store.get(); st.resume = S.tryResume(ids, at, Date.now()); store.set(st);
        stop('tryit');
        /* the screen the card is about (Home, or Community on its Room tab), visible and free to touch */
        goSection(s); setTimeout(() => goSection(s), 450);
    }
    /* the place saved by Try it now, when nothing else (tutorial-resume.js) has taken the user back yet: Settings > Tutorial picks it up */
    function savedTry() {
        const r = store.get().resume;
        if (!r || r.via !== 'tryit' || !r.at || Date.now() - (r.t || 0) > 6 * 3600e3) return '';
        return r.fin && r.next ? r.next : r.at;
    }
    function cancelAuto() { clearT(autoT); autoT = 0; const c = root && root.querySelector('.lt-card'); if (c) c.classList.remove('lt-autogo'); }
    function setPaused(v) {
        paused = !!v; cancelAuto();
        if (paused) { try { if (W.LowiTutorialVoice) W.LowiTutorialVoice.stop(); } catch (e) { } }
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
        if (!el) {
            root.classList.add('lt-center'); hole.style.cssText = '';
            card.style.left = Math.round((vw - cw) / 2) + 'px'; card.style.top = Math.round(Math.max(m, (vh - ch) / 2)) + 'px';
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
    }
    function hold(why) { if (held || !root) return; cancelAuto(); try { if (W.LowiTutorialVoice) W.LowiTutorialVoice.stop(); } catch (e) { } held = true; root.classList.add('lt-held'); root.setAttribute('aria-hidden', 'true'); root.setAttribute('data-held', why || ''); }
    function unhold() {
        if (!held || !root) return; held = false; root.classList.remove('lt-held'); root.removeAttribute('aria-hidden'); root.removeAttribute('data-held');
        if (afterClaim) { afterClaim = false; go(i + 1, 'claim-closed'); return; }
        if (tried === i && i < list.length - 1) { go(i + 1, 'tried'); return; }
        render();
    }

    /* ---------- sections and "try it" (Oct 21 2026, Emmanuel: "taking us to honestly every section ... Pinch, click, long
       click, press, all this stuff, how are people supposed to know?") ----------
       A step's `where` / `rm` say which screen it belongs on; the tour takes the user there for a moment after each step change
       and then leaves them alone. A step's `tryIt` lets touches through the dimmed screen and watches for that one gesture.
       When it happens the card says so; if the gesture opened a sheet, the tour waits behind it and moves on once it closes,
       otherwise it moves on by itself. Listening is passive: it never blocks or changes what the app does with the touch. */
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
            if (s.rm) { const b = $('.rm-tab[data-rm="' + s.rm + '"]'); if (b && b.getAttribute('aria-selected') !== 'true' && !b.classList.contains('on')) b.click(); }
        } catch (e) { }
    }
    function renderTry(s, U) {
        const card = root && root.querySelector('.lt-card'); if (!card) return;
        const real = !!(s && s.tryIt), can = canTry(s), done = can && tried === i;
        root.classList.toggle('lt-try', real && !done); root.classList.toggle('lt-tried', real && done);
        root.classList.toggle('lt-practice', !!(s && s.practice)); root.classList.toggle('lt-later-on', !!(s && s.later));
        if (s && s.practice) padWire(card);
        if (!can) return;
    }
    function didGesture(kind) {
        const s = step();
        if (!on || held || !canTry(s) || tried === i || !S.tryMatch(wants(s), kind)) return;
        cancelAuto();
        tried = i; render(); emit({ tried: s.id, gesture: kind });
        const at = i; clearT(tryNext);
        tryNext = setTimeout(() => { if (on && !held && tried === at && i === at && at < list.length - 1) go(at + 1, 'tried'); }, 1500);
    }
    const TRY = { HOLD: 480, TAP: 320, MULTI: 450, MOVE: 12, DRAG: 26, SWIPE: 60 };
    const pts = new Map(); let down = null, holdT = 0, taps = [];
    function onTarget(x, y) {
        const s = step(); if (!s || !s.tryIt) return false; if (s.tryIt.anywhere) return true;
        const el = target(s); if (!el) return true;
        const r = el.getBoundingClientRect(), p = 16;
        return x >= r.left - p && x <= r.right + p && y >= r.top - p && y <= r.bottom + p;
    }
    function watching() { const s = step(); return !!(on && !held && s && s.tryIt && tried !== i); }
    function tDown(e) {
        if (!watching() || (e.target && e.target.closest && e.target.closest('.lt-card'))) return;
        pts.set(e.pointerId, 1); if (pts.size >= 2) { down = null; clearT(holdT); didGesture('pinch'); return; }
        down = { x: e.clientX, y: e.clientY, t: Date.now(), on: onTarget(e.clientX, e.clientY), moved: false };
        clearT(holdT); holdT = setTimeout(() => { if (down && down.on && !down.moved) didGesture('hold'); }, TRY.HOLD);
    }
    function tMove(e) {
        if (!down || !watching()) return;
        const dx = e.clientX - down.x, dy = e.clientY - down.y, d = Math.hypot(dx, dy);
        if (d > TRY.MOVE) { down.moved = true; clearT(holdT); }
        if (Math.abs(dx) > TRY.SWIPE && Math.abs(dx) > Math.abs(dy) * 1.5) didGesture('swipe');
        if (d > TRY.DRAG && down && down.on) didGesture('drag');
    }
    function tUp(e) {
        pts.delete(e.pointerId); clearT(holdT);
        const d = down; down = null;
        if (!d || !watching() || d.moved || !d.on || Date.now() - d.t > TRY.TAP) return;
        const now = Date.now(); taps = taps.filter(t => now - t < TRY.MULTI * 2); taps.push(now);
        didGesture('tap');
        if (taps.length >= 3) { taps = []; didGesture('triple'); }
        else if (taps.length === 2 && taps[1] - taps[0] < TRY.MULTI) didGesture('double');
    }
    function tCancel(e) { pts.delete(e.pointerId); clearT(holdT); down = null; }
    try {
        W.addEventListener('pointerdown', tDown, { capture: true, passive: true });
        W.addEventListener('pointermove', tMove, { capture: true, passive: true });
        W.addEventListener('pointerup', tUp, { capture: true, passive: true });
        W.addEventListener('pointercancel', tCancel, { capture: true, passive: true });
        W.addEventListener('gesturestart', () => { if (watching()) didGesture('pinch'); }, { capture: true, passive: true });
        W.addEventListener('wheel', e => { if (e.ctrlKey && watching()) didGesture('pinch'); }, { capture: true, passive: true });
    } catch (e) { }
    /* hide at once, but come back only after QUIET_TICKS quiet ticks in a row, so a sheet's closing animation can't blink it */
    const QUIET_TICKS = 2;
    let quiet = 0;
    function tick() {
        if (!on) return;
        const why = busyBy();
        if (why) { quiet = 0; hold(why); }
        else if (held) { if (++quiet >= QUIET_TICKS) { quiet = 0; unhold(); } }
        else { if (Date.now() < secUntil && tried !== i) goSection(step()); place(); }
    }
    function go(n, how) {
        if (n >= list.length) { stop('finished'); return; }
        cancelAuto();
        i = Math.max(0, n); held = false; if (root) { root.classList.remove('lt-held'); root.removeAttribute('aria-hidden'); }
        const st = store.get(); st.last = step().id; store.set(st);
        tried = -1; clearT(tryNext); secUntil = Date.now() + 2500; goSection(step());
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
        else if (a === 'tryit') tryNow();
    }
    function onKey(e) {
        if (held) return;
        if (e.key === 'Escape') { e.preventDefault(); stop('skipped'); }
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
        let at = 0; const want = o.at || (o.fresh ? '' : savedTry()); if (want) { const k = list.findIndex(x => x.id === want); if (k > 0) at = k; }
        { const st0 = store.get(); if (st0.resume && st0.resume.via === 'tryit') { delete st0.resume.via; store.set(st0); } }   /* picked up once */
        go(at, 'start');
        return true;
    }
    function stop(reason) {
        if (!on) return;
        on = false; clearInterval(timer); timer = 0; afterClaim = false; cancelAuto(); paused = false; keepAwake();
        const st = store.get(); st.done = reason === 'finished'; st.skipped = reason === 'skipped' ? (step() && step().id) || '' : ''; st.v = S.VERSION; st.end = new Date().toISOString(); store.set(st);
        emit({ reason });
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
    W.LowiTutorial = { start, stop, isOn: () => on, step: () => (step() || {}).id || null, held: () => held, busyBy, core: S,
        paused: () => paused, pause: v => setPaused(v == null ? true : v), auto: () => !!autoT, tryNow, wiggles: () => (wig.at === i ? wig.n : 0) };
})();
