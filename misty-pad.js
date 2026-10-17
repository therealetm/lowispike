/* LOWiSPIKE bubble controller (Oct 16, E-man: a little bubble controller to move Misty around the world; double-tap it
   and Misty flies through the world by herself, so you can watch her adventure while falling asleep, or steer her yourself).
   One small round liquid-glass thumbpad on Home, centred just above Today. Drag it: Misty leaves her cell and you steer her.
   Oct 17 (E-man, misty-turn.js): hold it still in the middle = Misty flies straight ahead into the world; double tap = she backs
   up for a moment; tap once, then hold = she keeps backing up; while holding, slide it to steer (left/right turns her, up/down climbs/dives). THREE quick taps = autopilot
   (was a double-tap; two taps now start the back hold). Triple-tap it: autopilot, she flies her own adventure (adventure.js: slow aquarium tour with finds; a slow, sleepy drift
   when her energy is low). Touch it again: you steer again. Let go and leave her: after 20 s she floats back into her cell. Tapping her empty cell calls her home too.
   On the controller: the ring around it is Misty's energy (same energy as her face and her trips), the centre shows the mode.
   The 3D flight itself lives in world-home.js (LowiWorldHome.pad). Loads misty-pad.css itself. */
(function () {
    'use strict';
    const W = window, D = document, H = D.documentElement;
    if (W.LowiPad) return;
    const lang = () => { try { return ((W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || H.lang || 'de').slice(0, 2); } catch (e) { return 'de'; } };
    const T = (en, de, es) => ({ de, es })[lang()] || en;
    const HINT_KEY = 'lowi.pad.hint';
    if (!D.getElementById('mpCss')) {
        const me = D.currentScript || D.querySelector('script[src*="misty-pad.js"]'), l = D.createElement('link'); l.id = 'mpCss'; l.rel = 'stylesheet';
        l.href = me && me.getAttribute('src') ? me.getAttribute('src').replace('misty-pad.js', 'misty-pad.css') : 'misty-pad.css';
        D.head.appendChild(l);
    }
    const ICON = {
        drive: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.4 2.6M12 3.5L9.6 6.1M12 20.5l2.4-2.6M12 20.5l-2.4-2.6M3.5 12l2.6-2.4M3.5 12l2.6 2.4M20.5 12l-2.6-2.4M20.5 12l-2.6 2.4"/><circle cx="12" cy="12" r="2.6"/></svg>',
        auto: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12c-2.2-3-6.6-3-6.6 0s4.4 3 6.6 0 6.6-3 6.6 0-4.4 3-6.6 0z"/><circle cx="18.6" cy="12" r="1.3" class="mp-dot"/></svg>',
        sleepy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9h5l-5 6h5M13 6h4l-4 4.5h4"/></svg>'
    };
    const st = { el: null, knob: null, chip: null, mode: '', id: null, x0: 0, y0: 0, moved: false, lastUp: 0, taps: 0, holdT: 0, backT: 0, thr: 0, downT: 0, ignoreDbl: 0, chipT: 0, enT: 0, tier: '', value: 0, R: 22, hinted: false };
    const wh = () => W.LowiWorldHome && W.LowiWorldHome.pad ? W.LowiWorldHome : null;
    function send(cmd) { const w = wh(); if (!w) return null; try { return w.pad(cmd); } catch (e) { return null; } }
    function low() { return st.tier === 'weak' || st.tier === 'tired'; }

    function build() {
        const hud = D.getElementById('whHud'); if (!hud) return null;
        let b = D.getElementById('whPad');
        if (!b) {
            b = D.createElement('button'); b.type = 'button'; b.id = 'whPad'; b.className = 'wh-pad no-page-swipe'; b.setAttribute('data-noi18n', '');
            b.innerHTML = '<i class="mp-ring" aria-hidden="true"></i><i class="mp-well" aria-hidden="true"></i><span class="mp-knob" aria-hidden="true"></span>';
            wire(b);
        }
        let c = D.getElementById('whPadChip');
        if (!c) { c = D.createElement('span'); c.id = 'whPadChip'; c.className = 'wh-pad-chip'; c.setAttribute('aria-live', 'polite'); c.setAttribute('data-noi18n', ''); }
        hud.appendChild(b); hud.appendChild(c);
        st.el = b; st.knob = b.querySelector('.mp-knob'); st.chip = c;
        delete b.dataset.icon; paint(); energy(true);
        return b;
    }
    function label() {
        if (st.mode === 'auto') return low() ? T('Autopilot, Misty is drifting sleepily. Tap to steer', 'Autopilot, Misty treibt m\u00fcde. Tippen zum Steuern', 'Piloto autom\u00e1tico, Misty flota con sue\u00f1o. Toca para dirigir') : T('Autopilot, Misty flies on its own. Tap to steer', 'Autopilot, Misty fliegt allein. Tippen zum Steuern', 'Piloto autom\u00e1tico, Misty vuela por su cuenta. Toca para dirigir');
        return T('Controller: drag to fly Misty, hold the middle to go forward, tap then hold to go back, three taps for autopilot', 'Steuerung: ziehen, um Misty zu fliegen, Mitte halten f\u00fcr vorw\u00e4rts, tippen und halten f\u00fcr r\u00fcckw\u00e4rts, dreimal tippen f\u00fcr Autopilot', 'Control: arrastra para volar con Misty, mant\u00e9n el centro para avanzar, toca y mant\u00e9n para retroceder, tres toques para piloto autom\u00e1tico');
    }
    function paint() {
        const b = st.el; if (!b) return;
        const icon = st.mode === 'auto' ? (low() ? 'sleepy' : 'auto') : 'drive';
        if (b.dataset.icon !== icon) { b.dataset.icon = icon; st.knob.innerHTML = ICON[icon]; }
        b.dataset.mode = st.mode || 'idle';
        b.setAttribute('aria-pressed', st.mode === 'auto' ? 'true' : 'false');
        b.setAttribute('aria-label', label());
    }
    function autoText() { return low() ? T('Autopilot \u00b7 sleepy', 'Autopilot \u00b7 m\u00fcde', 'Autom\u00e1tico \u00b7 con sue\u00f1o') : T('Autopilot', 'Autopilot', 'Autom\u00e1tico'); }
    function chip(text, ms) {
        const c = st.chip; if (!c) return;
        clearTimeout(st.chipT);
        if (!text) { c.classList.remove('on'); return; }
        c.textContent = text; c.classList.add('on');
        if (ms) st.chipT = setTimeout(() => { if (st.mode === 'auto') chip(autoText()); else c.classList.remove('on'); }, ms);
    }
    /* the energy ring: same energy as Misty's face, flight and trips (sun-meter.js) */
    function energy(force) {
        let en = null; try { en = W.LowiSun && W.LowiSun.energyNow && W.LowiSun.energyNow(); } catch (e) { }
        const v = en ? Math.max(0, Math.min(1, +en.value || 0)) : 0.6, tier = en ? en.tier : 'ok';
        if (!force && v === st.value && tier === st.tier) return;
        const was = st.tier; st.value = v; st.tier = tier;
        if (st.el) { st.el.style.setProperty('--mp-en', v.toFixed(3)); st.el.dataset.tier = tier; }
        if (was !== tier) { paint(); if (st.mode === 'auto') chip(autoText()); }
    }
    function setMode(m, quiet) {
        if (m === st.mode) return;
        st.mode = m;
        send({ mode: m, vx: 0, vy: 0 });
        paint();
        if (quiet) return;
        if (m === 'auto') chip(autoText());
        else if (m === 'drive') chip(T('You steer', 'Du steuerst', 'T\u00fa diriges'), 1400);
        else chip('');
    }
    /* the controller is the one place adventures start and stop (no extra button on Today): autopilot you chose = adventure */
    function userMode(m) {
        setMode(m);
        const A = W.LowiAdventure; if (!A) return;
        try { if (m === 'auto') A.start(); else if (A.on) A.stop('abort'); } catch (e) { }
    }
    function knob(dx, dy) { if (st.knob) st.knob.style.transform = dx || dy ? 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)' : ''; }
    function steer(dx, dy) {
        const R = st.R, d = Math.hypot(dx, dy), k = d > R ? R / d : 1, kx = dx * k, ky = dy * k;
        knob(kx, ky);
        let vx = kx / R, vy = -ky / R; const m = Math.hypot(vx, vy);
        if (m < 0.14) { vx = vy = 0; } else { const s = (m - 0.14) / 0.86 / m; vx *= s; vy *= s; }
        send({ vx, vy });
    }
    /* misty-turn: forward / back while the controller is held (misty-turn.js flies her along her heading) */
    const MT = () => W.LowiMistyTurn || null;
    function thrust(v) {
        st.thr = v; const t = MT(); try { if (t && t.thrust) t.thrust(v); } catch (e) { }
        if (st.el) { st.el.classList.toggle('mp-fwd', v > 0); st.el.classList.toggle('mp-back', v < 0); }
    }
    function startHold(v) {
        if (st.mode !== 'drive') setMode('drive', true);
        try { if (W.LowiAdventure && W.LowiAdventure.on) W.LowiAdventure.stop('steer'); } catch (e) { }
        thrust(v); hintDone();
        try { navigator.vibrate && navigator.vibrate(10); } catch (e) { }
        chip(v > 0 ? T('Forward', 'Vorw\u00e4rts', 'Adelante') : T('Backwards', 'R\u00fcckw\u00e4rts', 'Atr\u00e1s'), 1200);
    }
    /* misty-turn: double tap = a short reverse (BACK_MS); any new touch on the controller ends it */
    function backBurst() {
        const ms = (W.LowiMistyTurn && W.LowiMistyTurn.core ? W.LowiMistyTurn.core.K.BACK_MS : 1200);
        startHold(-1); clearTimeout(st.backT);
        st.backT = setTimeout(() => { if (st.id == null && st.thr < 0) thrust(0); }, ms);
    }
    function hintDone() { try { localStorage.setItem(HINT_KEY, '1'); } catch (e) { } }
    function wire(b) {
        /* the world (look-around drag, pinch, taps on places) and the tab pager never see a touch that starts here */
        ['touchstart', 'mousedown'].forEach(n => b.addEventListener(n, e => e.stopPropagation(), { passive: true }));
        b.addEventListener('pointerdown', e => {
            if (e.button != null && e.button !== 0) return;
            e.stopPropagation(); e.preventDefault();
            st.id = e.pointerId; st.x0 = e.clientX; st.y0 = e.clientY; st.moved = false;
            try { b.setPointerCapture(e.pointerId); } catch (er) { }
            b.classList.add('mp-down');
            /* autopilot: any touch hands control back to you (and that touch never counts towards the taps) */
            const t0 = performance.now(); st.downT = t0;
            if (st.mode === 'auto') { st.ignoreDbl = t0 + 450; userMode('drive'); }
            /* misty-turn: held still in the middle = straight ahead; right after a tap = back */
            clearTimeout(st.holdT); clearTimeout(st.backT); if (st.thr < 0 && st.id === e.pointerId) thrust(0);
            const dir = t0 < st.ignoreDbl ? 1 : (W.LowiMistyTurn && W.LowiMistyTurn.core ? W.LowiMistyTurn.core.holdDir(st.lastUp, t0) : 1), id = e.pointerId;
            st.holdT = setTimeout(() => { if (st.id === id && !st.moved && !st.thr) startHold(dir); }, (W.LowiMistyTurn && W.LowiMistyTurn.core ? W.LowiMistyTurn.core.K.HOLD_MS : 280));
        });
        b.addEventListener('pointermove', e => {
            if (e.pointerId !== st.id) return;
            e.stopPropagation(); if (e.cancelable) e.preventDefault();
            const dx = e.clientX - st.x0, dy = e.clientY - st.y0;
            if (!st.moved && Math.hypot(dx, dy) < 6) return;
            if (!st.moved) { st.moved = true; clearTimeout(st.holdT); if (st.mode !== 'drive') setMode('drive'); hintDone(); }
            steer(dx, dy);
        }, { passive: false });
        const up = e => {
            if (e.pointerId !== st.id) return;
            e.stopPropagation();
            st.id = null; b.classList.remove('mp-down'); knob(0, 0); send({ vx: 0, vy: 0 }); clearTimeout(st.holdT);
            const held = !!st.thr; if (held) thrust(0);
            if (held || st.moved || e.type === 'pointercancel') { st.lastUp = 0; st.taps = 0; return; }
            const now = performance.now();
            if (now < st.ignoreDbl) { st.lastUp = 0; st.taps = 0; return; }
            st.taps = now - st.lastUp < 340 ? st.taps + 1 : 1; st.lastUp = now;
            /* three quick taps: autopilot on / off (two taps are the start of the back hold) */
            if (st.taps >= 3) { st.lastUp = 0; st.taps = 0; userMode(st.mode === 'auto' ? 'drive' : 'auto'); hintDone(); return; }
            /* one tap on a resting controller, or two taps and no hold: a short how-to */
            const n = st.taps;
            setTimeout(() => {
                if (st.lastUp !== now || st.id != null) return;
                if (n === 1 && !st.mode) chip(T('Drag to fly \u00b7 hold: forward \u00b7 2 taps: back \u00b7 3 taps: autopilot', 'Ziehen zum Fliegen \u00b7 halten: vorw\u00e4rts \u00b7 2\u00d7: zur\u00fcck \u00b7 3\u00d7: Autopilot', 'Arrastra para volar \u00b7 mant\u00e9n: adelante \u00b7 2 toques: atr\u00e1s \u00b7 3: autom\u00e1tico'), 2600);
                /* misty-turn: a plain double tap = she backs up for a moment (tap, then hold = keep backing up) */
                else if (n === 2) backBurst();
            }, 360);
        };
        b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
        b.addEventListener('lostpointercapture', e => { if (e.pointerId === st.id) up({ pointerId: e.pointerId, type: 'pointercancel', stopPropagation() { } }); });
        D.addEventListener('visibilitychange', () => { if (D.hidden && st.thr) thrust(0); });
        b.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); });
        b.addEventListener('dblclick', e => { e.stopPropagation(); e.preventDefault(); });
        b.addEventListener('contextmenu', e => e.preventDefault());
        /* keyboard: Enter / Space toggles autopilot, arrow keys steer, W / S hold = forward / back */
        const keys = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
        b.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); userMode(st.mode === 'auto' ? 'drive' : 'auto'); return; }
            const fk = e.key === 'w' || e.key === 'W' ? 1 : e.key === 's' || e.key === 'S' ? -1 : 0;
            if (fk) { e.preventDefault(); if (st.thr !== fk) startHold(fk); return; }
            const k = keys[e.key]; if (!k) return; e.preventDefault();
            if (st.mode !== 'drive') setMode('drive', true);
            send({ vx: k[0], vy: k[1] });
        });
        b.addEventListener('keyup', e => { if (keys[e.key]) send({ vx: 0, vy: 0 }); if (/^[wWsS]$/.test(e.key) && st.thr) thrust(0); });
    }

    /* while Misty is out on the controller her cell is empty: tapping it calls her home (no petting an empty cell) */
    function callHome(e) {
        if (!st.mode || !H.classList.contains('wh-padfly')) return;
        const t = e.target; if (!t || !t.closest || !t.closest('#spBubble')) return;
        e.stopPropagation(); if (e.cancelable) e.preventDefault();
        if (e.type === 'pointerdown') { const A = W.LowiAdventure; let rec = false; if (A && A.on) { try { A.stop('recall'); rec = true; } catch (er) { } } if (!rec) setMode('home', true); chip(T('Misty is flying home', 'Misty fliegt nach Hause', 'Misty vuelve a casa'), 1600); }
    }
    ['pointerdown', 'click'].forEach(n => D.addEventListener(n, callHome, true));
    W.addEventListener('lowi:pad', e => { const m = e.detail ? e.detail.mode : null; if (m != null && m !== st.mode) { st.mode = m; paint(); if (!m) chip(''); } });

    /* placement: centred above Today, clear of Sound, VR, World map, Kometa's gift, fasting and water */
    function place() {
        const b = st.el, hud = D.getElementById('whHud'); if (!b || !hud) return;
        const today = hud.querySelector('.wh-todaybtn'); if (!today) return;
        const tr = today.getBoundingClientRect(), hr = hud.getBoundingClientRect(); if (!tr.width || !hr.height) return;
        const size = b.offsetWidth || 60, gap = innerHeight < 700 ? 10 : 14;
        const bottom = Math.round(hr.bottom - tr.top + gap), left = Math.round(tr.left + tr.width / 2 - hr.left);
        if (b.style.bottom !== bottom + 'px') b.style.bottom = bottom + 'px';
        if (b.style.left !== left + 'px') b.style.left = left + 'px';
        if (st.chip) { st.chip.style.bottom = (bottom + size + 8) + 'px'; st.chip.style.left = left + 'px'; }
    }
    function tick() {
        const hud = D.getElementById('whHud');
        if (hud && (!st.el || !st.el.isConnected || st.el.parentNode !== hud)) build();
        if (!st.el) return;
        place();
        const now = Date.now(); if (now - st.enT > 2000) { st.enT = now; energy(); }
        /* the world can end a flight itself (she floated home): keep the controller in step */
        const s = send(null); if (s && s.mode !== st.mode && st.id == null) { st.mode = s.mode; paint(); if (!s.mode) chip(''); }
        if (!st.hinted && H.classList.contains('wh-world-live') && H.classList.contains('wh-home')) {
            st.hinted = true; let seen = false; try { seen = !!localStorage.getItem(HINT_KEY); } catch (e) { }
            if (!seen) setTimeout(() => { if (!st.mode) chip(T('New: drag to fly Misty \u00b7 hold: forward \u00b7 3 taps: autopilot', 'Neu: ziehen, um Misty zu fliegen \u00b7 halten: vorw\u00e4rts \u00b7 3\u00d7 tippen: Autopilot', 'Nuevo: arrastra para volar con Misty \u00b7 mant\u00e9n: adelante \u00b7 3 toques: autom\u00e1tico'), 5200); hintDone(); }, 2500);
        }
    }
    setInterval(tick, 500);
    W.addEventListener('resize', () => setTimeout(place, 60));
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', tick); else tick();
    W.LowiPad = { state: () => Object.assign({ pad: st.mode, tier: st.tier, energy: +st.value.toFixed(2) }, send(null) || {}), mode: m => setMode(m), steer: (vx, vy) => send({ vx, vy }), thrust: v => (v ? startHold(v > 0 ? 1 : -1) : thrust(0)) };
})();
