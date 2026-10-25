/* LOWiSPIKE power saver (Oct 25 2026). Emmanuel: "my phone or everyone's phone gets really, really hot when they open our app ... it's
   killing the battery ... I didn't think it should be hot at all."

   Measured (tools/heat/heat-probe.cjs, live build 20261025-132728): with nobody touching Home, the full-screen 3D world was drawn about
   30 times a second forever, also behind Community and the other pages, plus never-ending CSS loops (some inside sheets nobody can see)
   kept the screen redrawing, and the sound kit's AudioContext stayed running (audio hardware awake) after the first tap.

   This file is the one place that knows how calm the app is, so every heavy loop can slow down the same way:
     active  - a touch in the last 3 s (or something is flying / warping): everything at full speed, exactly as before
     calm    - 3 s to 30 s without a touch: the world draws ~30 a second on Home (as before), ~20 behind a page
     rest    - 30 s without a touch: the world draws ~15 a second on Home, ~10 behind a page; decorative breathing loops pause
     deep    - 90 s without a touch: ~8 a second on Home, ~5 behind a page
   Any touch, key or scroll brings back full speed in the same frame. Time keeps running at real speed, so slow drift looks the same.

   Battery saver turns itself on (nothing to set) when the phone is in Low Power Mode or running hot: the world's own full-speed frames
   arrive at 30 a second or slower for several seconds (iOS caps Low Power Mode at 30 Hz, and a hot phone slows down the same way), or
   the browser reports a battery under 20% that isn't charging, or Data Saver is on. It turns itself off after ~10 smooth seconds.
   In saver mode the world is drawn a bit less sharp (at most 1.5x) and reaches rest after 10 s and deep after 45 s.
   localStorage 'lowi.power' = 'saver' | 'normal' forces a mode (testing).

   Also here: never-ending CSS animations whose element can't be seen (visibility:hidden, display:none, a parent faded to 0, no size)
   are paused until they can be seen again. Nothing here changes how anything looks while someone is using the app. */
(function (root, factory) {
    'use strict';
    const api = factory(root);
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root && root.document) root.LowiPower = api.create(root);
})(typeof window !== 'undefined' ? window : globalThis, function () {
    'use strict';
    const T = { ACTIVE: 3000, REST: 30000, DEEP: 90000, SAVER_REST: 10000, SAVER_DEEP: 45000 };
    /* frames per second the world is drawn at, per state; 0 = every screen refresh */
    const FPS = {
        normal: { home: { active: 0, calm: 30, rest: 15, deep: 8 }, back: { active: 0, calm: 20, rest: 10, deep: 5 } },
        saver: { home: { active: 0, calm: 20, rest: 10, deep: 6 }, back: { active: 0, calm: 12, rest: 6, deep: 4 } }
    };
    const DPR_SAVER = 1.5;
    /* html classes that mean something is moving on purpose (a flight, a warp, a world transition): never rest while they are on */
    const BUSY = /(^|\s)(mf-transit|mf-roam|wh-padfly|bwr-warping|gx-in|gx-out|gx-hold|wh-cosmos|wh-leave|wh-away|lw-clean|lw-clean-out|mm-cam|mp-on|lc-burst|mt-turning|lt-on)(\s|$)/;
    function stateFor(idleMs, saver, busy) {
        if (busy || idleMs < T.ACTIVE) return 'active';
        if (idleMs >= (saver ? T.SAVER_DEEP : T.DEEP)) return 'deep';
        if (idleMs >= (saver ? T.SAVER_REST : T.REST)) return 'rest';
        return 'calm';
    }
    function fpsFor(state, saver, back) { return FPS[saver ? 'saver' : 'normal'][back ? 'back' : 'home'][state] || 0; }
    /* ms between world draws; 0 = every refresh */
    function intervalFor(state, saver, back) { const f = fpsFor(state, saver, back); return f ? 1000 / f : 0; }
    function dprCapFor(cap, saver) { return saver ? Math.min(cap, DPR_SAVER) : cap; }
    /* Low Power Mode / hot phone: median of the world's full-speed frame times. 30 Hz frames are ~33 ms. */
    function median(a) { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; }
    function slowVerdict(dts, wasSaver) {
        if (dts.length < 90) return wasSaver;
        const m = median(dts);
        if (!wasSaver && m >= 0.029) return true;
        if (wasSaver && m <= 0.021) return false;
        return wasSaver;
    }
    /* an element nobody can see: its own visibility/display, a parent at opacity 0, or no size. Its own opacity is not checked
       (a loop may fade it in from 0) and neither is being off-screen (a loop may move it on-screen). */
    function unseen(el, W) {
        if (!el || !el.isConnected) return true;
        const r = el.getBoundingClientRect && el.getBoundingClientRect();
        if (r && r.width === 0 && r.height === 0) return true;
        try { if (el.checkVisibility && !el.checkVisibility({ visibilityProperty: true, checkVisibilityCSS: true })) return true; } catch (e) { }
        for (let p = el.parentElement, i = 0; p && i < 40; p = p.parentElement, i++) {
            const s = W.getComputedStyle(p);
            if (s.display === 'none' || s.opacity === '0') return true;
        }
        return false;
    }
    function create(W) {
        const D = W.document, H = D.documentElement;
        const now = () => (W.performance && W.performance.now ? W.performance.now() : Date.now());
        let lastIn = now(), saverAuto = false, saverBattery = false, state = 'active', dts = [], fullFor = 0;
        const forced = () => { try { const v = W.localStorage.getItem('lowi.power'); return v === 'saver' || v === 'normal' ? v : ''; } catch (e) { return ''; } };
        const saveData = () => !!(W.navigator && W.navigator.connection && W.navigator.connection.saveData);
        const saver = () => { const f = forced(); if (f) return f === 'saver'; return saverAuto || saverBattery || saveData(); };
        const busy = () => BUSY.test(H.className || '');
        const subs = [];
        function current() { return stateFor(now() - lastIn, saver(), busy()); }
        function sync() {
            const s = current(), sv = saver();
            H.classList.toggle('lowi-rest', s === 'rest' || s === 'deep');
            H.classList.toggle('lowi-saver', sv);
            if (s !== state) { const was = state; state = s; subs.forEach(fn => { try { fn(s, was); } catch (e) { } }); if (s === 'active') scanSoon(); }
            return s;
        }
        function poke() { lastIn = now(); if (state !== 'active') sync(); }
        let moveAt = 0;
        ['pointerdown', 'touchstart', 'keydown', 'wheel'].forEach(t => W.addEventListener(t, poke, { capture: true, passive: true }));
        ['pointermove', 'scroll'].forEach(t => W.addEventListener(t, () => { const n = now(); if (n - moveAt > 250) { moveAt = n; poke(); } }, { capture: true, passive: true }));
        /* the state ladder is re-read once a second (one cheap timer, stopped while the app is hidden) */
        let tick = 0;
        function startTick() { if (!tick) tick = W.setInterval(sync, 1000); }
        function stopTick() { if (tick) { W.clearInterval(tick); tick = 0; } }
        D.addEventListener('visibilitychange', () => { if (D.hidden) { stopTick(); stopScan(); } else { poke(); startTick(); startScan(); } });
        W.addEventListener('pagehide', () => { stopTick(); stopScan(); });
        W.addEventListener('pageshow', () => { if (!D.hidden) { poke(); startTick(); startScan(); } });
        try { if (W.navigator.getBattery) W.navigator.getBattery().then(b => { const f = () => { saverBattery = !b.charging && b.level <= 0.2; sync(); }; f(); b.addEventListener('levelchange', f); b.addEventListener('chargingchange', f); }).catch(() => { }); } catch (e) { }
        /* the world reports each full-speed frame (rAF to rAF, nothing skipped) so a 30 Hz cap shows up here */
        function reportFrame(dt) {
            if (!(dt > 0) || dt > 0.25) return;
            dts.push(dt); if (dts.length > 120) dts.shift();
            fullFor += dt;
            if (fullFor >= 2 && dts.length >= 90) { fullFor = 0; const v = slowVerdict(dts, saverAuto); if (v !== saverAuto) { saverAuto = v; dts = []; sync(); } }
        }
        /* ---- never-ending CSS loops on elements nobody can see ---- */
        const paused = new Set(); let scanT = 0, scanSoonT = 0;
        function scan() {
            if (D.hidden || !D.getAnimations) return;
            let list = []; try { list = D.getAnimations(); } catch (e) { return; }
            list.forEach(a => {
                const t = a.effect && a.effect.target; if (!t || t.nodeType !== 1) return;
                const timing = a.effect.getTiming ? a.effect.getTiming() : {};
                if (timing.iterations !== Infinity) return;
                if (a.playState === 'running') { if (unseen(t, W)) { try { a.pause(); paused.add(a); } catch (e) { } } }
                else if (paused.has(a) && !unseen(t, W)) { try { a.play(); } catch (e) { } paused.delete(a); }
            });
            paused.forEach(a => { const t = a.effect && a.effect.target; if (!t || !t.isConnected) paused.delete(a); });
        }
        function scanSoon() { if (scanSoonT) return; scanSoonT = W.setTimeout(() => { scanSoonT = 0; scan(); }, 60); }
        function startScan() { if (!scanT) scanT = W.setInterval(scan, 2000); scanSoon(); }
        function stopScan() { if (scanT) { W.clearInterval(scanT); scanT = 0; } }
        /* a sheet opening or closing flips a class on <html> or the element itself: look again right away so nothing stays frozen */
        try { new MutationObserver(scanSoon).observe(H, { attributes: true, attributeFilter: ['class'] }); } catch (e) { }
        ['click', 'pointerup', 'transitionend'].forEach(t => W.addEventListener(t, scanSoon, { capture: true, passive: true }));
        /* rest: the companion's breathing / shimmer loops and the level badge glow pause (they are SVG or box-shadow loops that repaint
           every frame); the first touch starts them again where they were */
        try {
            const st = D.createElement('style'); st.id = 'lowi-power-css';
            st.textContent = 'html.lowi-rest .tmg-plant,html.lowi-rest .tmg-plant *,html.lowi-rest .mh-glow,html.lowi-rest .lb3,html.lowi-rest .lb3 *,html.lowi-rest #fxHint{animation-play-state:paused!important}';
            (D.head || H).appendChild(st);
        } catch (e) { }
        if (!D.hidden) { startTick(); startScan(); }
        return {
            T, FPS, state: () => sync(), saver, poke, reportFrame, busy,
            interval: back => intervalFor(sync(), saver(), !!back),
            dprCap: cap => dprCapFor(cap, saver()),
            idleMs: () => now() - lastIn,
            onChange: fn => { subs.push(fn); return () => { const i = subs.indexOf(fn); if (i >= 0) subs.splice(i, 1); }; },
            scan, pausedCount: () => paused.size,
            _test: { setIdle: ms => { lastIn = now() - ms; return sync(); }, setSaver: v => { saverAuto = !!v; return sync(); } }
        };
    }
    return { create, stateFor, fpsFor, intervalFor, dprCapFor, slowVerdict, unseen, T, FPS, BUSY, DPR_SAVER };
});
