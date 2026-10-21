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
    const clearT = id => { try { if (id) (W.clearTimeout || clearTimeout)(id); } catch (e) { } };
    const step = () => list[i] || null;
    function emit(extra) { try { W.dispatchEvent(new CustomEvent('lowi:tutorial', { detail: Object.assign({ on, step: step() && step().id }, extra || {}) })); } catch (e) { } }

    function target(s) {
        for (const sel of (s && s.target) || []) { let el = null; try { el = $(sel); } catch (e) { } if (el && vis(el)) { const r = el.getBoundingClientRect(); if (r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth) return el; } }
        return null;
    }
    function ensureRoot() {
        if (root && root.isConnected) return root;
        root = D.createElement('div'); root.id = 'ltTour'; root.className = 'lt-tour'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
        root.setAttribute('aria-labelledby', 'ltTitle'); root.setAttribute('aria-describedby', 'ltText'); root.setAttribute('data-noi18n', '');
        root.innerHTML = '<div class="lt-hole" aria-hidden="true"></div><div class="lt-card" tabindex="-1"></div>';
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
            '<p class="lt-text" id="ltText">' + esc(S.text(s, 'text', l, vars)) + '</p>' +
            '<div class="lt-btns">' +
            (i > 0 ? '<button type="button" class="lt-btn lt-ghost" data-lt="back">' + esc(U.back) + '</button>' : '<span></span>') +
            '<span class="lt-right">' + (last ? '' : '<button type="button" class="lt-btn lt-ghost" data-lt="skip">' + esc(U.skip) + '</button>') +
            '<button type="button" class="lt-btn lt-go" data-lt="' + (s.action === 'claim' ? 'claim' : 'next') + '">' + esc(cta) + '</button></span></div>';
        root.setAttribute('data-step', s.id);
        renderTry(s, U);
        place();
        /* tutorial-voice.js: the companion picture is the speaker; reads the card aloud when sound is on (Oct 21 2026) */
        try { if (W.LowiTutorialVoice) W.LowiTutorialVoice.render(card, s, { lang: l, name: vars.name, next: list.slice(i + 1, i + 3) }); } catch (e) { }
        try { (card.querySelector('[data-lt="claim"],[data-lt="next"]') || card).focus({ preventScroll: true }); } catch (e) { }
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
    function hold(why) { if (held || !root) return; try { if (W.LowiTutorialVoice) W.LowiTutorialVoice.stop(); } catch (e) { } held = true; root.classList.add('lt-held'); root.setAttribute('aria-hidden', 'true'); root.setAttribute('data-held', why || ''); }
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
    const TAB_OF = { home: 'home', community: 'foryou', scan: 'scan' };
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
        const can = !!(s && s.tryIt), done = can && tried === i;
        root.classList.toggle('lt-try', can && !done); root.classList.toggle('lt-tried', done);
        if (!can) return;
        const p = D.createElement('p'); p.className = 'lt-tryline'; p.setAttribute('role', 'status');
        p.textContent = done ? U.nice : U.tryIt;
        const txt = card.querySelector('.lt-text'); if (txt) txt.after(p);
    }
    function didGesture(kind) {
        const s = step();
        if (!on || held || !s || !s.tryIt || tried === i || !S.tryMatch(s.tryIt.how, kind)) return;
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
            if (home && !home.classList.contains('active')) { const t = $('#tabbar .tb[data-tab="home"]'); if (t) t.click(); }
        } catch (e) { }
    }
    function start(opts) {
        const o = opts || {};
        if (on) stop('restart');
        list = S.plan({ noOwnCompanion: !ownCompanion(), claimReady: !ownCompanion() && claimReady() });
        if (!list.length) return false;
        on = true; i = 0; held = false; afterClaim = false; startedAt = Date.now();
        lastFocus = D.activeElement;
        goHome();
        ensureRoot();
        H.classList.add('lt-on'); if (reduced()) root.classList.add('lt-rm');
        store.set(Object.assign(store.get(), { v: S.VERSION, at: new Date().toISOString(), done: false, from: o.from || '' }));
        clearInterval(timer); timer = setInterval(tick, 350);
        /* opts.at: begin at that step id (tutorial-auto.js: continue a tour that was left halfway) */
        let at = 0; if (o.at) { const k = list.findIndex(x => x.id === o.at); if (k > 0) at = k; }
        go(at, 'start');
        return true;
    }
    function stop(reason) {
        if (!on) return;
        on = false; clearInterval(timer); timer = 0; afterClaim = false;
        const st = store.get(); st.done = reason === 'finished'; st.skipped = reason === 'skipped' ? (step() && step().id) || '' : ''; st.v = S.VERSION; st.end = new Date().toISOString(); store.set(st);
        emit({ reason });
        const r = root; root = null; H.classList.remove('lt-on');
        if (r) { r.classList.add('lt-out'); setTimeout(() => r.remove(), reduced() ? 0 : 220); }
        try { if (lastFocus && lastFocus.isConnected && lastFocus.focus) lastFocus.focus({ preventScroll: true }); } catch (e) { }
    }
    W.addEventListener('resize', () => { if (on) place(); });
    W.addEventListener('lowi:lang', () => { if (on && !held) render(); });
    W.addEventListener('lowi:companion', () => { if (on && !held) render(); });
    if (!D.getElementById('ltCss') && !D.querySelector('link[href^="tutorial.css"]')) { const m = $('meta[name="lowi-build"]'), l = D.createElement('link'); l.id = 'ltCss'; l.rel = 'stylesheet'; l.href = 'tutorial.css?v=' + encodeURIComponent(m ? m.content : '1'); D.head.appendChild(l); }
    /* tutorial-auto.js (new accounts get the tour once) loads from here, so index.html's versioned script list stays untouched */
    if (!W.LowiTutorialAuto && !D.querySelector('script[src^="tutorial-auto.js"]')) { const m = $('meta[name="lowi-build"]'), sc = D.createElement('script'); sc.src = 'tutorial-auto.js?v=' + encodeURIComponent((m && m.content) || '1'); sc.defer = true; D.head.appendChild(sc); }
    /* tutorial-voice.js (the speaker on every card) loads the same way */
    if (!W.LowiTutorialVoice && !D.querySelector('script[src^="tutorial-voice.js"]')) { const m = $('meta[name="lowi-build"]'), sc = D.createElement('script'); sc.src = 'tutorial-voice.js?v=' + encodeURIComponent((m && m.content) || '1'); sc.defer = true; D.head.appendChild(sc); }
    W.LowiTutorial = { start, stop, isOn: () => on, step: () => (step() || {}).id || null, held: () => held, busyBy, core: S };
})();
