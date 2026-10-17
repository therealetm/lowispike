/* LOWiSPIKE misty-turn (Oct 17, E-man): "Touching the screen anywhere else should move the world. That's fine. But if I touch
   Misty ... I should be able to turn Misty left, right ... instead of the world turning." And on the controller: "long press and
   hold in the middle, that's when it goes straight ... forward into the world", "double tap for backwards, triple tapping for auto".
   - Misty has a heading: where she faces, as an angle OFF the camera's own look direction (0 = into the screen, PI = facing you).
     Dragging the world turns the view and her heading with it (she keeps facing the same way on screen).
   - A drag that starts ON Misty (her sprite, a finger-sized circle round it) turns her left / right and never turns the world.
     A few glowing dots in front of her show where she faces, depth included. A quick tap on her = a little sparkle; holding
     still on her opens her card (same as holding her at home).
   - Holding the controller still in the middle flies her straight ahead along her heading (into the world); tap once, then
     press and hold = she backs up. While holding, sliding the controller left / right steers (turns her) and up / down climbs
     or dives, like a steering wheel. Going forward, the camera swings in behind her, so you see what she is heading for.
   - It all only counts as YOUR steering (misty-hunt eats crumbs only then); the autopilot never uses any of it.
   No new buttons: the controller and Misty herself are the controls. Nothing runs per frame unless Misty is out and drawn. */
(function () {
    'use strict';
    const W = typeof window !== 'undefined' ? window : null, D = W && W.document;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const K = {
        TURN: 0.0105,     /* radians per px of a drag on Misty: ~300 px = all the way round (half a phone width = facing you) */
        HIT_K: 0.5,       /* her touch circle: half her sprite height ... */
        HIT_MIN: 36,      /* ... never smaller than a fingertip ... */
        HIT_MAX: 120,     /* ... nor a huge slice of the screen when she is close */
        TAP_PX: 10,       /* moving less than this is a tap / hold, not a turn */
        TAP_MS: 450, LONG_MS: 520,
        STEER_YAW: 1.9,   /* rad/s of turning at full controller sideways while you hold forward / back */
        CHASE: 1.6,       /* how fast the camera swings in behind her while she flies forward */
        CUE: 1.4,         /* the facing dots stay this long after a turn */
        HOLD_MS: 280,     /* controller: held still this long = forward (or back, right after a tap) */
        TAP_GAP: 340,     /* controller: taps closer than this chain (2 = the back hold, 3 = autopilot) */
        DRAWN_MS: 1200   /* she was drawn this recently (frames can be slow on a busy phone) */
    };
    const TAU = Math.PI * 2;
    const wrap = a => { a = (+a || 0) % TAU; if (a > Math.PI) a -= TAU; else if (a < -Math.PI) a += TAU; return a; };
    /* a drag of dx px on Misty: right = she turns to her right (as you see it) */
    const turnBy = (off, dxPx) => wrap((+off || 0) - (+dxPx || 0) * K.TURN);
    /* where she faces in the world (unit vector, horizontal): same convention as the camera rig (yaw = rig.yaw + rig.gy) */
    const fwdOf = yaw => [-Math.sin(yaw), 0, -Math.cos(yaw)];
    /* her touch circle on screen, from her sprite height in px */
    const hitR = hPx => clamp((+hPx || 0) * K.HIT_K, K.HIT_MIN, K.HIT_MAX);
    const hits = (x, y, spot) => !!(spot && isFinite(spot.x) && isFinite(spot.y) && Math.hypot(x - spot.x, y - spot.y) <= hitR(spot.h));
    /* one frame of steering. s = { off } (heading off the camera), i = { dt, mode, vx, vy, th (-1 back, 0, 1 forward), camYaw,
       busy (a warp / camera flight / hero turn) }. Returns the stick to use (vx is spent on turning while you hold forward/back),
       the thrust, her heading in the world, and how much the camera turns this frame (forward only, never while busy). */
    function steer(s, i) {
        s = s || { off: 0 }; i = i || {};
        const dt = clamp(+i.dt || 0, 0, 0.1), drive = i.mode === 'drive';
        const th = drive ? clamp(Math.round(+i.th || 0), -1, 1) : 0;
        let vx = +i.vx || 0, vy = +i.vy || 0, cam = 0;
        if (th) { s.off = wrap(s.off - vx * K.STEER_YAW * dt); s.bank = clamp(-vx * 0.3, -0.35, 0.35); vx = 0; }
        if (th > 0 && !i.busy && Math.abs(s.off) > 1e-4) {
            cam = s.off * (1 - Math.exp(-dt * K.CHASE)); s.off = wrap(s.off - cam);
        }
        const yaw = wrap((+i.camYaw || 0) + cam + s.off);
        return { s, vx, vy, th, cam, yaw, f: fwdOf(yaw) };
    }
    /* controller taps: how many quick taps in a row (now = this tap's release, last = the previous one, n = its count) */
    const tapChain = (last, n, now) => (last && now - last < K.TAP_GAP ? (n || 0) + 1 : 1);
    /* a still hold on the controller: right after a tap = back, else forward */
    const holdDir = (lastUp, downAt) => (lastUp && downAt - lastUp < K.TAP_GAP ? -1 : 1);
    const core = { K, wrap, turnBy, fwdOf, hitR, hits, steer, tapChain, holdDir };
    if (typeof module === 'object' && module.exports) module.exports = core;
    if (!D || !D.addEventListener || W.LowiMistyTurn) return;

    const H = D.documentElement;
    const S = { off: 0, bank: 0, th: 0, own: null, cueT: 0, drawnT: 0, alpha: 0, sparkle: false, pts: null, turns: 0, worldOk: true };
    const MF = () => W.LowiMistyFlight || null;
    const now = () => (W.performance ? performance.now() : Date.now());
    function spot() {
        if (now() - S.drawnT > K.DRAWN_MS || S.alpha < 0.3) return null;
        const m = MF(); if (!m || !m.touchSpot) return null;
        try { return m.touchSpot(); } catch (e) { return null; }
    }
    function handsOn() {
        const P = W.LowiPad; let pm = '';
        try { pm = P && P.state ? (P.state().pad || '') : ''; } catch (e) { pm = ''; }
        if (pm !== 'drive') { try { if (P && P.mode) P.mode('drive'); } catch (e) { } }
        try { if (W.LowiAdventure && W.LowiAdventure.on) W.LowiAdventure.stop('steer'); } catch (e) { }
    }
    function release(e) {
        const o = S.own; if (!o) return;
        clearTimeout(o.lp);
        if (e && e.type === 'pointerup' && !o.turned && !o.long && now() - o.t0 < K.TAP_MS) S.sparkle = true;
        try { if (o.el && o.el.releasePointerCapture) o.el.releasePointerCapture(o.id); } catch (er) { }
        S.own = null; H.classList.remove('mt-turning');
    }
    /* capture phase on window: runs before the world's own gestures on the stage, so a touch on Misty never reaches them */
    W.addEventListener('pointerdown', e => {
        if (S.own || (e.button != null && e.button !== 0)) return;
        const t = e.target, st = t && t.closest ? t.closest('#bw3Stage') : null; if (!st) return;
        const sp = spot(); if (!sp || !hits(e.clientX, e.clientY, sp)) return;
        e.stopPropagation(); if (e.cancelable) e.preventDefault();
        const o = S.own = { id: e.pointerId, el: st, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: now(), turned: false, long: false, lp: 0 };
        try { st.setPointerCapture(e.pointerId); } catch (er) { }
        o.lp = setTimeout(() => { if (S.own !== o || o.turned) return; o.long = true; try { navigator.vibrate && navigator.vibrate(12); } catch (er) { } try { W.dispatchEvent(new CustomEvent('lowi:misty-open')); } catch (er) { } }, K.LONG_MS);
    }, true);
    W.addEventListener('pointermove', e => {
        const o = S.own; if (!o || e.pointerId !== o.id) return;
        e.stopPropagation(); if (e.cancelable) e.preventDefault();
        const dx = e.clientX - o.x; o.x = e.clientX; o.y = e.clientY;
        if (!o.turned) {
            if (o.long || Math.hypot(e.clientX - o.x0, e.clientY - o.y0) < K.TAP_PX) return;
            o.turned = true; clearTimeout(o.lp); handsOn(); H.classList.add('mt-turning'); S.turns++;
        }
        S.off = turnBy(S.off, dx); S.bank = clamp(S.bank - dx * 0.012, -0.35, 0.35); S.cueT = K.CUE;
    }, { capture: true, passive: false });
    ['pointerup', 'pointercancel'].forEach(n => W.addEventListener(n, e => { const o = S.own; if (!o || e.pointerId !== o.id) return; e.stopPropagation(); release(e); }, true));
    W.addEventListener('lostpointercapture', e => { const o = S.own; if (o && e.pointerId === o.id) release(null); }, true);
    /* the touch / mouse twins of a gesture on Misty: no page swipe, no scrolling, no world drag from them either */
    ['touchstart', 'mousedown'].forEach(n => W.addEventListener(n, e => { if (S.own) e.stopPropagation(); }, { capture: true, passive: true }));
    W.addEventListener('touchmove', e => { if (S.own) { e.stopPropagation(); if (e.cancelable) e.preventDefault(); } }, { capture: true, passive: false });
    D.addEventListener('visibilitychange', () => { if (D.hidden) { S.th = 0; release(null); } });

    /* the facing dots: a short line of soft lights in front of her, fading out, drawn in the 3D world (no DOM) */
    function cueBuild(a) {
        const THREE = a.THREE, N = 5, geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3).fill(-999), 3));
        const p = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.1, color: '#a8ffd8', transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: false, sizeAttenuation: true }));
        p.name = 'mt-facing'; p.userData.lwKeep = true; p.renderOrder = 60; p.frustumCulled = false; p.visible = false; a.scene.add(p);
        return p;
    }
    W.LowiMistyTurn = {
        core,
        thrust: v => { if (v === undefined) return S.th; S.th = clamp(Math.round(+v || 0), -1, 1); if (S.th) S.cueT = Math.max(S.cueT, 0.6); return S.th; },
        turning: () => !!(S.own && S.own.turned),
        /* misty-flight.js, once a frame while she is out: the stick, thrust and heading to use */
        steer: i => {
            i = i || {}; const r = i.rig || {};
            const o = steer(S, { dt: i.dt, mode: i.mode, vx: i.vx, vy: i.vy, th: S.th, camYaw: (+r.yaw || 0) + (+r.gy || 0), busy: i.busy });
            if (o.cam && r && typeof r.yaw === 'number') { r.yaw += o.cam; r.vy = 0; }
            if (o.th) S.cueT = Math.max(S.cueT, 0.6);
            return { vx: o.vx, vy: o.vy, th: o.th, f: o.f, hands: !!(S.own && S.own.turned) };
        },
        /* misty-flight.js, right after it drew her: lean into the turn, the facing dots, a sparkle for a tap */
        draw: i => {
            const a = i && i.a; if (!a || !a.THREE || !a.scene || !i.p) return null;
            const dt = clamp(+i.dt || 0, 0, 0.1);
            S.drawnT = now(); S.alpha = +i.alpha || 0;
            if (!S.own || !S.own.turned) S.bank *= Math.exp(-dt * 5);
            const out = { bank: S.bank, sparkle: S.sparkle }; S.sparkle = false;
            S.cueT = Math.max(0, S.cueT - dt);
            const show = (S.cueT > 0 || (S.own && S.own.turned)) && !i.reduced && S.alpha > 0.3;
            if (!show) { if (S.pts) S.pts.visible = false; return out; }
            if (!S.pts || !S.pts.parent) S.pts = cueBuild(a);
            const hs = Math.max(0.05, +i.hs || 0.5), r = i.rig || {}, yaw = wrap((+r.yaw || 0) + (+r.gy || 0) + S.off), f = fwdOf(yaw);
            const pos = S.pts.geometry.attributes.position, flow = (now() / 900) % 1;
            for (let j = 0; j < pos.count; j++) { const d = hs * (0.75 + (j + flow) * 0.42); pos.setXYZ(j, i.p.x + f[0] * d, i.p.y + f[1] * d, i.p.z + f[2] * d); }
            pos.needsUpdate = true;
            const m = S.pts.material; m.size = hs * 0.16; m.opacity = Math.min(1, (S.own && S.own.turned ? 1 : S.cueT / 0.6)) * 0.85;
            S.pts.visible = true;
            return out;
        },
        state: () => ({ off: +S.off.toFixed(3), th: S.th, turning: !!(S.own && S.own.turned), touching: !!S.own, turns: S.turns, cue: S.pts ? !!S.pts.visible : false })
    };
})();
