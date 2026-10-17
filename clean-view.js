/* LOWiSPIKE clean flight view (see clean-view-core.js for the rules).
   - Follows Misty's existing flight modes: the controller's data-mode (misty-pad.js), 'lowi:pad', 'lowi:adventure' and
     'lowi:autopilot'. No new button, no frame loop, no timer while she flies.
   - Fades with html.lw-clean (opacity + visibility only, layout and every state stay as they are; the living bubbles
     follow the page's opacity on their own). html.lw-clean-auto also fades the controller.
   - The first tap that brings the UI back is swallowed: no water, no quest, no steering, no sheet, no recall, no world
     tap. While you steer, drags on the world still turn it (only a still tap or press counts as the reveal tap), and
     the controller keeps working.
   - Screen readers hear one polite line when the controls go; any key brings them back. Reduced motion: no fade. */
(function () {
    'use strict';
    const W = window, D = document, H = D.documentElement;
    const C = W.LowiCleanCore;
    if (!C || W.LowiClean) return;
    let st = C.init();
    const lang = () => { try { const l = (W.LowiI18n && W.LowiI18n.lang && W.LowiI18n.lang()) || H.lang || 'en'; return String(l).slice(0, 2); } catch (e) { return 'en'; } };

    /* ---------- styles, built from the core's list ---------- */
    function styles() {
        if (D.getElementById('lwCleanCss')) return;
        const hideSel = C.HIDE.map(s => 'html.lw-clean ' + s).concat(C.HIDE_AUTO.map(s => 'html.lw-clean.lw-clean-auto ' + s)).join(',\n');
        const outSel = C.HIDE.concat(C.HIDE_AUTO).map(s => 'html.lw-clean-out ' + s).join(',\n');
        const el = D.createElement('style'); el.id = 'lwCleanCss';
        el.textContent = hideSel + ' { opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; transition: opacity .45s ease, visibility 0s linear .45s !important; }\n' +
            outSel + ' { transition: opacity .3s ease, visibility 0s !important; }\n' +
            '@media (prefers-reduced-motion: reduce) {\n' + hideSel + ',\n' + outSel + ' { transition: none !important; }\n}\n' +
            /* inside a cell world Home's menus and panels are never shown (clean-view-core.js WORLD_HIDE), whatever the clean state */
            C.worldCss() + ' { opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; transition: opacity .3s ease, visibility 0s linear .3s !important; }\n' +
            '.lw-clean-sr { position: fixed; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; left: 0; top: 0; }\n';
        (D.head || H).appendChild(el);
    }
    let sr = null;
    function announce(on) {
        if (!D.body) return;
        if (!sr) { sr = D.createElement('div'); sr.className = 'lw-clean-sr'; sr.id = 'lwCleanSay'; sr.setAttribute('aria-live', 'polite'); D.body.appendChild(sr); }
        sr.textContent = on ? C.say(lang()) : '';
    }

    /* ---------- apply ---------- */
    let outT = 0;
    function paint(act) {
        if (!act) return;
        if (act === 'hide' || act === 'view') {
            clearTimeout(outT); H.classList.remove('lw-clean-out');
            H.classList.add('lw-clean');
            H.classList.toggle('lw-clean-auto', st.view === 'auto');
            const a = D.activeElement;           /* nothing hidden keeps the keyboard focus */
            if (a && a !== D.body && a.closest && !a.closest('#whPad') && a.blur) { try { a.blur(); } catch (e) { } }
            if (act === 'hide') announce(true);
        } else if (act === 'show') {
            H.classList.add('lw-clean-out');
            H.classList.remove('lw-clean', 'lw-clean-auto');
            clearTimeout(outT); outT = setTimeout(() => H.classList.remove('lw-clean-out'), 420);
            announce(false);
        }
        try { W.dispatchEvent(new CustomEvent('lowi:clean-view', { detail: { on: st.clean, view: st.view } })); } catch (e) { }
        poll();
    }
    function feed(ev) { const r = C.step(st, ev); st = r.st; paint(r.act); return r.act; }

    /* ---------- following Misty's flight ---------- */
    function padMode() {
        try { const P = W.LowiPad, s = P && P.state && P.state(); if (s) return (s.pad && s.pad.mode) || s.mode || ''; } catch (e) { }
        return null;
    }
    /* Home is the screen (its tab is active). Flying out of a world, into a place, into the spirit world (wh-cosmos) or a
       warp is still Home: only a real switch to another tab counts as leaving, so no world transition restores the menu. */
    function onHome() {
        if (!H.classList.contains('wh-home')) return false;
        const t = D.getElementById('tab-home');
        return !t || !t.classList || t.classList.contains('active');
    }
    function check() {
        if (!onHome()) { if (st.clean || st.mode) feed({ type: 'leave', mode: padMode() || '' }); return; }
        const m = padMode();
        if (m !== null && m !== st.mode) feed({ type: 'mode', mode: m });
    }
    function poll() { hookPad(); }
    /* the controller's own data-mode (misty-pad.js keeps it in step with the world) tells every mode change: no polling */
    let hooked = null, padObs = null, tabHooked = null;
    function hookTab() {                       /* leaving Home for another tab restores at once: nothing hidden leaks */
        const t = D.getElementById('tab-home');
        if (!t || t === tabHooked) return;
        tabHooked = t;
        try { new MutationObserver(() => { if (st.clean && !onHome()) feed({ type: 'leave', mode: padMode() || '' }); }).observe(t, { attributes: true, attributeFilter: ['class'] }); } catch (e) { }
    }
    function hookPad() {
        hookTab();
        const b = D.getElementById('whPad');
        if (!b || b === hooked) return !!b;
        hooked = b;
        try { if (padObs) padObs.disconnect(); padObs = new MutationObserver(() => { const m = b.dataset.mode === 'idle' ? '' : (b.dataset.mode || ''); if (!onHome()) { if (st.clean) feed({ type: 'leave', mode: m }); else st.mode = m; return; } if (m !== st.mode) feed({ type: 'mode', mode: m }); }); padObs.observe(b, { attributes: true, attributeFilter: ['data-mode'] }); } catch (e) { }
        return true;
    }
    { let n = 0; const t = setInterval(() => { if (hookPad() || ++n > 90) clearInterval(t); }, 1000); }
    const soon = () => { setTimeout(check, 30); setTimeout(check, 260); setTimeout(check, 700); };
    W.addEventListener('lowi:pad', e => { const m = e.detail && e.detail.mode; if (typeof m === 'string' && onHome()) feed({ type: 'mode', mode: m }); else soon(); poll(); });
    W.addEventListener('lowi:adventure', soon);
    W.addEventListener('lowi:autopilot', e => { const on = e.detail && e.detail.on; if (on && onHome()) feed({ type: 'mode', mode: 'auto' }); else soon(); });
    try { new MutationObserver(() => { hookPad(); if (st.clean && !onHome()) feed({ type: 'leave', mode: padMode() || '' }); }).observe(H, { attributes: true, attributeFilter: ['class'] }); } catch (e) { }
    D.addEventListener('visibilitychange', () => { if (!D.hidden) check(); });

    /* ---------- the controller: steering hides, every touch gets a look at the mode ---------- */
    const inPad = t => !!(t && t.closest && t.closest('#whPad'));
    let padP = null;
    function steer() { if (onHome()) feed({ type: 'steer' }); }

    /* ---------- the reveal tap ---------- */
    let swallowing = false, swallowIds = new Set(), swallowUntil = 0;
    let watch = null;                        /* steering view: a press on the world, not yet a drag or a tap */
    const now = () => (W.performance ? performance.now() : Date.now());
    function eat(e) { if (e.cancelable) e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation(); }
    function swallowStart(id) { swallowing = true; if (id != null) swallowIds.add(id); swallowUntil = Infinity; }
    function swallowEnd(id) { if (id != null) swallowIds.delete(id); if (!swallowIds.size) swallowUntil = now() + 450; }
    function swallowOn() { return swallowing && (swallowIds.size > 0 || now() < swallowUntil); }
    function cancelFor(w) {                  /* end the world's own gesture so its tap / long press never fires */
        try { const ev = new PointerEvent('pointercancel', { pointerId: w.id, pointerType: w.type, isPrimary: true, bubbles: true, cancelable: false, clientX: w.x, clientY: w.y }); ev.lwClean = true; (w.target.isConnected ? w.target : D).dispatchEvent(ev); } catch (e) { }
    }
    function reveal() { feed({ type: 'tap' }); }
    const padHeld = () => { try { return !!(W.LowiPad && W.LowiPad.held && W.LowiPad.held()); } catch (e) { return false; } };
    function worldTarget(t) {
        if (!t || !t.closest) return false;
        if (t.closest('#spBubble')) return false;     /* her empty cell recalls her on touch: the reveal tap eats it */
        return !!t.closest('.bw3-canvas, #bw3Stage, .sp-heroes');
    }

    W.addEventListener('pointerdown', e => {
        if (e.lwClean) return;
        if (swallowOn()) { eat(e); swallowStart(e.pointerId); return; }   /* a quick second tap right after the reveal tap is eaten too */
        if (inPad(e.target)) {
            soon();
            if (!st.clean || st.view === 'drive') { padP = { id: e.pointerId, x: e.clientX, y: e.clientY, t: now(), hold: 0 }; padP.hold = setTimeout(() => { if (padP && padMode() === 'drive') steer(); }, 450); }
            if (!st.clean || C.padLive(st)) return;
        }
        if (!st.clean) return;
        /* Oct 17 energy shot (misty-turn.js): with a finger on the controller, taps on the world are her energy shot, not the reveal tap */
        if (worldTarget(e.target) && padHeld()) return;
        if (st.view === 'drive' && !watch && worldTarget(e.target)) {
            /* steering: a drag still turns the world; only a still tap or press is the reveal tap */
            const w = watch = { id: e.pointerId, type: e.pointerType, x: e.clientX, y: e.clientY, t: now(), target: e.target, moved: 0 };
            w.timer = setTimeout(() => { if (watch === w && C.isTap(w.moved, 0)) { watch = null; cancelFor(w); swallowStart(w.id); reveal(); } }, 380);
            return;
        }
        if (watch) { clearTimeout(watch.timer); watch = null; return; }   /* a second finger: a pinch, leave it to the world */
        eat(e); swallowStart(e.pointerId); reveal();
    }, { capture: true, passive: false });

    W.addEventListener('pointermove', e => {
        if (e.lwClean) return;
        if (padP && e.pointerId === padP.id && Math.hypot(e.clientX - padP.x, e.clientY - padP.y) > 6) { clearTimeout(padP.hold); padP = null; steer(); return; }
        if (watch && e.pointerId === watch.id) { watch.moved = Math.max(watch.moved, Math.hypot(e.clientX - watch.x, e.clientY - watch.y)); if (watch.moved >= 10) { clearTimeout(watch.timer); watch = null; } return; }
        if (swallowOn() && swallowIds.has(e.pointerId)) eat(e);
    }, { capture: true, passive: false });

    function up(e) {
        if (e.lwClean) return;
        if (padP && e.pointerId === padP.id) { clearTimeout(padP.hold); padP = null; soon(); }
        if (watch && e.pointerId === watch.id) {
            const w = watch; watch = null; clearTimeout(w.timer);
            if (e.type === 'pointerup' && C.isTap(w.moved, 0)) {   /* any still press is the reveal tap, even on a busy, late frame */ eat(e); cancelFor(w); swallowStart(null); swallowEnd(null); reveal(); }
            return;
        }
        if (swallowIds.has(e.pointerId)) { eat(e); swallowEnd(e.pointerId); }
    }
    W.addEventListener('pointerup', up, { capture: true, passive: false });
    W.addEventListener('pointercancel', up, { capture: true, passive: false });
    /* the rest of a swallowed tap: touch, mouse and click events never reach anything */
    for (const t of ['touchstart', 'touchmove', 'touchend', 'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'gesturestart']) {
        W.addEventListener(t, e => { if (swallowOn()) eat(e); }, { capture: true, passive: false });
    }
    W.addEventListener('keydown', e => {
        if (inPad(e.target)) {
            if (/^Arrow/.test(e.key) && (!st.clean || C.padLive(st))) { setTimeout(() => { if (padMode() === 'drive') steer(); else check(); }, 30); return; }
            soon(); if (!st.clean || C.padLive(st)) return;
        }
        if (!st.clean) return;
        eat(e); reveal();
    }, { capture: true });

    styles();
    /* in step with where she already is when the page opens: nothing fades by itself on load */
    setTimeout(() => { if (!st.clean) { const m = padMode(); if (m !== null) st.mode = m; poll(); } }, 1500);
    W.LowiClean = {
        state: () => Object.assign({}, st),
        show: () => feed({ type: 'tap' }),
        check,
        _feed: feed
    };
})();
