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
   No new buttons: the controller and Misty herself are the controls. Nothing runs per frame unless Misty is out and drawn.
   Energy shot (Oct 17, E-man, "Kamehameha"): while one finger holds the controller (dragging or held still in the middle), a
   double tap with another finger (on the world or on Misty) shoots her energy the way she is aiming: her heading, tilted up or
   down by the controller. It uses the Community energy rate limit (community-energy.js bucket) as its cooldown, and when it lands
   inside a world it heals that world a little: its murk and fog thin (body-world-regions applyLook reads heal()). Healing is capped
   per world per day and spaced out, it never gives XP, crumbs or energy, and the autopilot never shoots. Without the controller
   held, a double tap on the world does exactly what it did before (World map toggle / out of a world).
   Flight skin (Oct 17, E-man: "anstatt dieses konstanten Lichts vorne ... beim Vorwärtsfliegen gegen diese dehnbare Bubble Haut
   drücken ... wie beim Rauskommen aus ihrer ersten Bubble"): holding forward (or back) no longer lights the facing dots in front of
   her. Instead her own thin travelling bubble skin (the same glass look as Home's membrane / the cloud wall's skin) shows round her
   and tents out ahead where she presses, tilted with the controller's up / down like the shot. It springs out a little further as
   she gets going and wobbles back when you let go. Separate from Home: Home's own membrane and its breakout are untouched (she only
   gets the travelling skin once she is out or inside a world). The facing dots stay only for a drag on Misty without a hold.
   The energy shot is unchanged and still flies out through the skin. Reduced motion: the skin stretches and relaxes without any
   wobble or ripple. One mesh, built on first use, updated from draw() (no loop, no renderer of its own); hidden when she is not drawn. */
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
        HOLD_MS: 280,
        BACK_MS: 1200,    /* controller: a plain double tap backs her up this long */     /* controller: held still this long = forward (or back, right after a tap) */
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
    /* ---- energy shot (pure) ---- */
    const SHOT = {
        MAX: 3, WIN: 8000, GAP: 900,   /* cooldown: at most 3 shots in 8 s, never closer than 0.9 s (community-energy bucket) */
        RANGE: 9, DUR: 0.45, LIFE: 1.0, /* flies 9 of her sizes in 0.45 s, the burst is gone after 1 s */
        PITCH: 0.45,                    /* how much the controller's up / down tilts the shot */
        HEAL: 0.12, HEAL_MAX: 0.6, HEAL_GAP: 5000 /* one shot heals 12% of a world, at most 60% a day per world, 5 s apart */
    };
    let EC = null;
    try { EC = (W && W.LowiEnergyCore) || (typeof require === 'function' ? require('./community-energy.js') : null); } catch (e) { EC = null; }
    function ownBucket(st, now, max, win, gap) {
        const ts = ((st && st.ts) || []).filter(t => now - t < win), last = ts.length ? ts[ts.length - 1] : 0;
        if (ts.length >= max || (last && now - last < gap)) return { ok: false, st: { ts } };
        ts.push(now); return { ok: true, st: { ts } };
    }
    /* may she shoot now? st = the gate state ({ ts }), t = ms */
    const shotGate = (st, t) => ((EC && typeof EC.bucket === 'function') ? EC.bucket : ownBucket)(st, +t || Date.now(), SHOT.MAX, SHOT.WIN, SHOT.GAP);
    /* a double tap on the world: with the controller held it is a shot, without it everything stays as it was */
    const dblAction = held => (held ? 'shot' : 'zoom');
    /* where the shot points: her heading f, tilted by the controller's up / down (vy -1..1), unit length */
    function shotDir(f, vy) {
        const d = [+f[0] || 0, clamp(+vy || 0, -1, 1) * SHOT.PITCH, +f[2] || 0], L = Math.hypot(d[0], d[1], d[2]) || 1;
        return [d[0] / L, d[1] / L, d[2] / L];
    }
    /* the ball at k (0..1 of its flight): eases out, so it leaves her fast */
    function shotAt(from, d, range, k) { k = clamp(+k || 0, 0, 1); const e = 1 - (1 - k) * (1 - k), s = range * e; return [from[0] + d[0] * s, from[1] + d[1] * s, from[2] + d[2] * s]; }
    const pad2 = n => (n < 10 ? '0' : '') + n;
    const dayKey = t => { const d = new Date(+t || Date.now()); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); };
    const worldId = id => String(id || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 24);
    /* a shot landed in world id: how much it heals. h = { day, w: { id: healed 0..HEAL_MAX }, at: { id: ms } }; resets at midnight */
    function healAdd(h, id, t) {
        t = +t || Date.now(); const day = dayKey(t);
        if (!h || h.day !== day || typeof h.w !== 'object' || typeof h.at !== 'object') h = { day, w: {}, at: {} };
        id = worldId(id); if (!id || id === 'hub') return { h, add: 0 };
        const have = clamp(+h.w[id] || 0, 0, SHOT.HEAL_MAX), last = +h.at[id] || 0;
        if (last && t - last < SHOT.HEAL_GAP && t >= last) return { h, add: 0 };
        const add = Math.round(Math.min(SHOT.HEAL, SHOT.HEAL_MAX - have) * 1000) / 1000; if (add <= 0) return { h, add: 0 };
        h.w[id] = Math.round((have + add) * 1000) / 1000; h.at[id] = t;
        return { h, add };
    }
    const healOf = (h, id, t) => (h && h.w && h.day === dayKey(t) ? clamp(+h.w[worldId(id)] || 0, 0, SHOT.HEAL_MAX) : 0);
    /* ---- flight skin (pure) ---- */
    const SKIN = {
        K: 60, C: 6.5,       /* spring: a little overshoot as she gets going (~20 %), a damped wobble when you let go */
        UP: 5, DOWN: 1.3,    /* how fast it shows / fades (fading slower, so the wobble back is seen) */
        R: 0.6,              /* skin radius, in her sizes (her body is about 0.34), so it reads as a bubble round her */
        BULGE: 1.0,          /* how far the tip tents out at full push, in skin radii */
        BACK: 0.45,          /* the skin trails behind her as it stretches, so she sits up at the tip */
        MIN: -0.3, MAX: 1.4, /* a let-go may dent the tip in a little; a push never balloons it */
        TURN: 10,            /* how fast the bulge follows a change of direction (1/s) */
        KICK: 7              /* a shot punches the tip out (stretch speed added) */
    };
    /* one frame of the skin. s = { a: stretch, v: its speed, o: opacity }, i = { dt, th (-1, 0, 1), reduced } */
    function skinStep(s, i) {
        s = s || {}; i = i || {};
        let a = +s.a || 0, v = +s.v || 0, o = +s.o || 0, left = clamp(+i.dt || 0, 0, 0.1);
        const tgt = i.th ? 1 : 0;
        if (i.reduced) { a += (tgt - a) * (1 - Math.exp(-left * 6)); v = 0; }
        else while (left > 1e-6) { const h = Math.min(left, 1 / 60); v += (SKIN.K * (tgt - a) - SKIN.C * v) * h; a += v * h; left -= h; }
        a = clamp(a, SKIN.MIN, SKIN.MAX);
        o += (tgt - o) * (1 - Math.exp(-clamp(+i.dt || 0, 0, 0.1) * (tgt ? SKIN.UP : SKIN.DOWN)));
        if (!tgt && Math.abs(a) < 0.004 && Math.abs(v) < 0.02 && o < 0.01) { a = 0; v = 0; o = 0; }
        s.a = a; s.v = v; s.o = clamp(o, 0, 1); return s;
    }
    /* which way the skin tents: forward = where the shot would go (heading + controller tilt), back = behind her, none = keep */
    const skinDir = (f, vy, th) => (th > 0 ? shotDir(f, vy) : th < 0 ? [-(+f[0] || 0), 0, -(+f[2] || 0)] : null);
    /* where it sits: p = her, d = tent direction, hs = her size, a = stretch. Returns the skin's middle, radius and tip tent */
    function skinPlace(p, d, hs, a) {
        const r = Math.max(0.01, +hs || 0.5) * SKIN.R, back = r * SKIN.BACK * Math.max(0, +a || 0);
        return { c: [p[0] - d[0] * back, p[1] - d[1] * back, p[2] - d[2] * back], r, tent: r * SKIN.BULGE * (+a || 0) };
    }
    /* how far ahead of her the tip is (her sizes): the tip is always just in front of her nose */
    const skinTip = (hs, a) => { const q = skinPlace([0, 0, 0], [0, 0, 1], hs, a); return (q.c[2] + q.r + q.tent) / Math.max(0.01, +hs || 0.5); };
    const core = { K, wrap, turnBy, fwdOf, hitR, hits, steer, tapChain, holdDir, SHOT, shotGate, dblAction, shotDir, shotAt, healAdd, healOf, dayKey, SKIN, skinStep, skinDir, skinPlace, skinTip, usesEnergyCore: () => !!(EC && EC.bucket) };
    if (typeof module === 'object' && module.exports) module.exports = core;
    if (!D || !D.addEventListener || W.LowiMistyTurn) return;

    const H = D.documentElement;
    const S = { off: 0, bank: 0, th: 0, own: null, cueT: 0, drawnT: 0, alpha: 0, sparkle: false, pts: null, turns: 0, worldOk: true };
    const MF = () => W.LowiMistyFlight || null;
    const now = () => (W.performance ? performance.now() : Date.now());
    /* energy shot state: the cooldown gate, a shot asked for (spawned on her next drawn frame), shots in flight, today's healing */
    const SHOT_KEY = 'lowi.misty-shot.v1';
    const SH = { gate: {}, req: false, list: [], obj: null, vy: 0, mTap: 0, fired: 0, heal: null };
    /* the flight skin: its spring, the way it tents (smoothed), the mesh */
    const SK = { st: { a: 0, v: 0, o: 0 }, d: [0, 0, -1], m: null, u: null };
    try { SH.heal = JSON.parse(localStorage.getItem(SHOT_KEY) || 'null'); } catch (e) { SH.heal = null; }
    const padHeld = () => { try { return !!(W.LowiPad && W.LowiPad.held && W.LowiPad.held()); } catch (e) { return false; } };
    const emit = d => { try { W.dispatchEvent(new CustomEvent('lowi:misty-shot', { detail: d })); } catch (e) { } };
    function shoot(why) {
        if (now() - S.drawnT > K.DRAWN_MS || S.alpha < 0.3) return { ok: false, why: 'hidden' };
        const g = shotGate(SH.gate, Date.now()); SH.gate = g.st;
        if (!g.ok) { emit({ ok: false, why: 'cooldown' }); return { ok: false, why: 'cooldown' }; }
        SH.req = true; SH.fired++;
        try { navigator.vibrate && navigator.vibrate([8, 30, 14]); } catch (e) { }
        return { ok: true, why: why || '' };
    }
    function healNow() {
        const R = W.LowiWorldRegions; let id = null;
        try { id = R && R.current ? R.current() : (R && R.state ? R.state.cur : null); } catch (e) { id = null; }
        const o = healAdd(SH.heal, id, Date.now()); SH.heal = o.h;
        if (o.add) { try { localStorage.setItem(SHOT_KEY, JSON.stringify(o.h)); } catch (e) { } }
        emit({ ok: true, healed: o.add, world: worldId(id) || 'hub', heal: healOf(SH.heal, id, Date.now()) });
    }
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
        if (e && e.type === 'pointerup' && !o.turned && !o.long && now() - o.t0 < K.TAP_MS) {
            S.sparkle = true;
            /* energy shot: two quick taps on her with another finger while the controller is held */
            const t = now();
            if (padHeld()) { if (SH.mTap && t - SH.mTap < K.TAP_GAP) { SH.mTap = 0; shoot('misty'); } else SH.mTap = t; } else SH.mTap = 0;
        }
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

    /* Oct 22: every dot is a soft round texture (world-home-core.js softDot); a Points with no map draws solid squares, which
       turn into white boxes over a light sky. No texture = these stay hidden. */
    let DOT = null;
    function capped(m, a) { const C = W.LowiWorldHomeCore; if (C && C.capPoints) C.capPoints(m, C.SPARK.MAX_PX * 1.5 * (((a && a.renderer && a.renderer.getPixelRatio) && a.renderer.getPixelRatio()) || W.devicePixelRatio || 1)); return m; }
    function dotMap(THREE) { if (!DOT) { const C = W.LowiWorldHomeCore; DOT = (C && C.softDot && C.softDot(THREE, D)) || null; } return DOT; }
    /* the facing dots: a short line of soft lights in front of her, fading out, drawn in the 3D world (no DOM) */
    function cueBuild(a) {
        const THREE = a.THREE, N = 5, geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3).fill(-999), 3));
        const p = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.1, map: dotMap(THREE), alphaTest: 0.01, color: '#a8ffd8', transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: false, sizeAttenuation: true }));
        p.name = 'mt-facing'; capped(p.material, a); p.userData.lwKeep = true; p.renderOrder = 60; p.frustumCulled = false; p.visible = false; a.scene.add(p);
        return p;
    }
    /* the energy shot, drawn in the 3D world (one Points object for every ball, trail and burst; no DOM, nothing while none fly) */
    const TRAIL = 7, SPARKS = 12, PER = TRAIL + SPARKS, SLOTS = 3;
    function shotBuild(a) {
        const THREE = a.THREE, n = PER * SLOTS, geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3).fill(-999), 3));
        geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
        const p = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.12, map: dotMap(THREE), alphaTest: 0.01, vertexColors: true, transparent: true, opacity: 1, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: false, sizeAttenuation: true }));
        p.name = 'mt-shot'; capped(p.material, a); p.userData.lwKeep = true; p.renderOrder = 61; p.frustumCulled = false; p.visible = false; a.scene.add(p);
        return p;
    }
    function shotFrame(i, dt) {
        if (SH.req) {
            SH.req = false;
            const r = i.rig || {}, hs = Math.max(0.05, +i.hs || 0.5), f = fwdOf(wrap((+r.yaw || 0) + (+r.gy || 0) + S.off)), d = shotDir(f, SH.vy);
            SH.list.push({ from: [i.p.x + d[0] * hs * 0.6, i.p.y + d[1] * hs * 0.6, i.p.z + d[2] * hs * 0.6], d, range: hs * SHOT.RANGE, hs, t: 0, hit: false });
            if (SH.list.length > SLOTS) SH.list.shift();
            /* no aim light: the shot punches out through her flight skin, which pops ahead and wobbles back */
            if (!i.reduced && S.th >= 0) { SK.st.v += SKIN.KICK; SK.st.o = Math.max(SK.st.o, 0.6); SK.d = d.slice(); }
        }
        if (!SH.list.length) { if (SH.obj) SH.obj.visible = false; return; }
        if (!SH.obj || !SH.obj.parent) SH.obj = shotBuild(i.a);
        const pos = SH.obj.geometry.attributes.position, col = SH.obj.geometry.attributes.color, sparks = i.reduced ? 0 : SPARKS;
        let hsMax = 0.05;
        SH.list = SH.list.filter(s => { s.t += dt; if (s.t >= SHOT.DUR && !s.hit) { s.hit = true; healNow(); } return s.t < SHOT.LIFE; });
        for (let k = 0; k < SLOTS; k++) {
            const s = SH.list[k], b = k * PER;
            for (let j = 0; j < PER; j++) { pos.setXYZ(b + j, -999, -999, -999); col.setXYZ(b + j, 0, 0, 0); }
            if (!s) continue;
            hsMax = Math.max(hsMax, s.hs);
            if (s.t < SHOT.DUR) {
                /* the ball and its trail: white-hot head, blue tail (the Community energy colours) */
                const kk = s.t / SHOT.DUR;
                for (let j = 0; j < TRAIL; j++) {
                    const q = shotAt(s.from, s.d, s.range, kk - j * 0.05), g = j === 0 ? 1 : (1 - j / TRAIL) * 0.75;
                    pos.setXYZ(b + j, q[0], q[1], q[2]); col.setXYZ(b + j, (j ? 0.47 : 0.94) * g, (j ? 0.82 : 0.98) * g, g);
                }
            } else {
                /* the burst where it lands: sparks fly out and fade */
                const e = shotAt(s.from, s.d, s.range, 1), u = (s.t - SHOT.DUR) / (SHOT.LIFE - SHOT.DUR), fade = Math.max(0, 1 - u);
                pos.setXYZ(b, e[0], e[1], e[2]); col.setXYZ(b, 0.6 * fade, 0.88 * fade, fade);
                for (let j = 0; j < sparks; j++) {
                    const y = 1 - (j + 0.5) * 2 / SPARKS, rr = Math.sqrt(Math.max(0, 1 - y * y)), th = j * 2.39996, dist = s.hs * (0.4 + 1.6 * (1 - (1 - u) * (1 - u)));
                    pos.setXYZ(b + TRAIL + j, e[0] + Math.cos(th) * rr * dist, e[1] + y * dist, e[2] + Math.sin(th) * rr * dist);
                    col.setXYZ(b + TRAIL + j, 0.55 * fade, 0.85 * fade, fade);
                }
            }
        }
        pos.needsUpdate = true; col.needsUpdate = true;
        SH.obj.material.size = hsMax * 0.22; SH.obj.visible = !!SH.obj.material.map;
    }
    /* the flight skin, drawn in the 3D world: a thin glass sphere round her, its tip tented out ahead (misty-flight's wall-skin look) */
    function skinBuild(a) {
        if (SK.m && SK.m.parent) return SK.m;
        const T = a.THREE;
        SK.u = { uD: { value: new T.Vector3(0, 0, -1) }, uA: { value: 0 }, uO: { value: 0 }, uR: { value: 1 }, uT: { value: 0 }, uW: { value: 1 } };
        const m = new T.ShaderMaterial({
            uniforms: SK.u, transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, fog: false,
            vertexShader: 'uniform vec3 uD;uniform float uA;uniform float uR;uniform float uT;uniform float uW;varying float vF;varying float vT;' +
                'void main(){vec3 n=normalize(position);float c=dot(n,uD);float f=max(c,0.0);float tent=pow(f,5.0);' +
                'vec3 side=n-uD*c;float rip=uW*0.03*sin(c*9.0-uT*7.0)*f;' +
                'vec3 p=n*uR*(1.0+rip)+uD*(uA*tent)-side*uR*0.12*max(uA/uR,0.0);' +
                'vec4 mv=modelViewMatrix*vec4(p,1.0);vec3 nv=normalize(normalMatrix*n);vF=1.0-abs(dot(nv,normalize(-mv.xyz)));vT=pow(f,6.0);gl_Position=projectionMatrix*mv;}',
            fragmentShader: 'uniform float uO;varying float vF;varying float vT;' +
                'void main(){float a=uO*((0.05+0.55*pow(vF,3.0))*(0.35+0.65*vT)+vT*vT*0.3);vec3 c=mix(vec3(0.45,0.85,1.0),vec3(0.9,0.75,1.0),vT);gl_FragColor=vec4(c*a,a);}'
        });
        SK.m = new T.Mesh(new T.SphereGeometry(1, 40, 28), m); SK.m.name = 'mt-flight-skin'; SK.m.userData.lwKeep = true;
        SK.m.renderOrder = 59; SK.m.frustumCulled = false; SK.m.visible = false;
        /* not drawn this frame (she went home, a warp, the tab hid): never leave a stale skin hanging in the world */
        SK.m.onBeforeRender = () => { if (now() - S.drawnT > 250) { SK.u.uO.value = 0; SK.m.visible = false; } };
        a.scene.add(SK.m); return SK.m;
    }
    function skinFrame(i, dt) {
        const th = S.alpha > 0.3 ? S.th : 0, was = SK.st.o, st = skinStep(SK.st, { dt, th, reduced: !!i.reduced });
        const r = i.rig || {}, f = fwdOf(wrap((+r.yaw || 0) + (+r.gy || 0) + S.off)), want = skinDir(f, SH.vy, th);
        const rev = want && SK.d[0] * want[0] + SK.d[1] * want[1] + SK.d[2] * want[2] < 0;
        if (want && (was < 0.05 || rev)) {
            /* a fresh push tents straight the way she goes, no swing from an old one; forward to back (or back): the old tent lets go
               and the new one grows from a smooth skin (blending through the middle would never turn round) */
            SK.d = want.slice(); if (rev) { SK.st.a = 0; SK.st.v = 0; }
        } else if (want) {
            const q = 1 - Math.exp(-dt * SKIN.TURN), d = SK.d;
            for (let j = 0; j < 3; j++) d[j] += (want[j] - d[j]) * q;
            const L = Math.hypot(d[0], d[1], d[2]); if (L > 1e-4) { d[0] /= L; d[1] /= L; d[2] /= L; } else SK.d = want.slice();
        }
        const on = st.o > 0.01 && S.alpha > 0.05;
        if (!on) { if (SK.m) SK.m.visible = false; return; }
        if (!SK.m || !SK.m.parent) skinBuild(i.a);
        const hs = Math.max(0.05, +i.hs || 0.5), pl = skinPlace([i.p.x, i.p.y, i.p.z], SK.d, hs, st.a), u = SK.u;
        SK.m.position.set(pl.c[0], pl.c[1], pl.c[2]); u.uD.value.set(SK.d[0], SK.d[1], SK.d[2]);
        u.uR.value = pl.r; u.uA.value = pl.tent; u.uO.value = st.o * Math.min(1, S.alpha) * 0.9;
        u.uW.value = i.reduced ? 0 : 1; u.uT.value = i.reduced ? 0 : now() / 1000;
        SK.m.visible = true;
    }
    /* body-world-3d.js: a double tap on the world with a second finger while the controller is held */
    W.addEventListener('lowi:pad-double', () => { shoot('double'); });
    W.LowiMistyTurn = {
        core,
        thrust: v => { if (v === undefined) return S.th; S.th = clamp(Math.round(+v || 0), -1, 1); return S.th; },
        turning: () => !!(S.own && S.own.turned),
        /* misty-flight.js, once a frame while she is out: the stick, thrust and heading to use */
        steer: i => {
            i = i || {}; const r = i.rig || {};
            SH.vy = i.mode === 'drive' ? clamp(+i.vy || 0, -1, 1) : 0;
            const o = steer(S, { dt: i.dt, mode: i.mode, vx: i.vx, vy: i.vy, th: S.th, camYaw: (+r.yaw || 0) + (+r.gy || 0), busy: i.busy });
            if (o.cam && r && typeof r.yaw === 'number') { r.yaw += o.cam; r.vy = 0; }
            return { vx: o.vx, vy: o.vy, th: o.th, f: o.f, hands: !!(S.own && S.own.turned) };
        },
        /* misty-flight.js, right after it drew her: lean into the turn, the facing dots, a sparkle for a tap */
        draw: i => {
            const a = i && i.a; if (!a || !a.THREE || !a.scene || !i.p) return null;
            const dt = clamp(+i.dt || 0, 0, 0.1);
            S.drawnT = now(); S.alpha = +i.alpha || 0;
            if (!S.own || !S.own.turned) S.bank *= Math.exp(-dt * 5);
            const out = { bank: S.bank, sparkle: S.sparkle }; S.sparkle = false;
            try { shotFrame(i, dt); } catch (e) { SH.list = []; if (SH.obj) SH.obj.visible = false; }
            try { skinFrame(i, dt); } catch (e) { if (SK.m) SK.m.visible = false; }
            S.cueT = Math.max(0, S.cueT - dt);
            /* the facing dots: only for a drag on her with no hold; holding forward / back shows her flight skin instead */
            const show = !S.th && (S.cueT > 0 || (S.own && S.own.turned)) && !i.reduced && S.alpha > 0.3;
            if (!show) { if (S.pts) S.pts.visible = false; return out; }
            if (!S.pts || !S.pts.parent) S.pts = cueBuild(a);
            const hs = Math.max(0.05, +i.hs || 0.5), r = i.rig || {}, yaw = wrap((+r.yaw || 0) + (+r.gy || 0) + S.off), f = fwdOf(yaw);
            const pos = S.pts.geometry.attributes.position, flow = (now() / 900) % 1;
            for (let j = 0; j < pos.count; j++) { const d = hs * (0.75 + (j + flow) * 0.42); pos.setXYZ(j, i.p.x + f[0] * d, i.p.y + f[1] * d, i.p.z + f[2] * d); }
            pos.needsUpdate = true;
            const m = S.pts.material; m.size = hs * 0.16; m.opacity = Math.min(1, (S.own && S.own.turned ? 1 : S.cueT / 0.6)) * 0.85;
            S.pts.visible = !!m.map;
            return out;
        },
        /* energy shot: body-world-3d.js (a double tap on the world while the controller is held) and probes */
        shoot: why => shoot(why),
        /* how much today's shots healed world id (0..SHOT.HEAL_MAX): body-world-regions.js thins its fog by it */
        heal: id => healOf(SH.heal, id, Date.now()),
        state: () => ({ off: +S.off.toFixed(3), th: S.th, turning: !!(S.own && S.own.turned), touching: !!S.own, turns: S.turns, cue: S.pts ? !!S.pts.visible : false, skin: SK.m && SK.m.visible ? { a: +SK.st.a.toFixed(3), o: +SK.st.o.toFixed(3), d: SK.d.map(x => +x.toFixed(3)) } : null, shots: SH.list.length, fired: SH.fired })
    };
})();
