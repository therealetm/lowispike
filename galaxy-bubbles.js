/* LOWiSPIKE galaxy-bubbles (Oct 17, E-man): "every bubble you see out there should be enterable" and "the strings between the
   bubbles should carry Misty like the ocean currents in Finding Nemo: they pull her along, and going against them takes effort."
   Out in the galaxy (misty-galaxy.js, after the breakout) this takes over from the old "other worlds are solid glass":
   - CURRENTS: every thread between two worlds (body-world-3d-scene.js, cosmos-threads) flows one way; its sparks show which way.
     Close to a thread she is caught: carried along it (strongest mid-thread, softer near the membranes) and drawn gently to its
     core. With the flow she flies fast; against it she still gets through at full push, but slowly, and a weak push is carried
     back. Steering sideways gets her out (the pull to the core is always weaker than her own speed). Only while YOU steer
     (drive), or on the tour when it means to ride one (autopilot, Level 6 adventure: S.exRide); the way home is never carried.
   - BUBBLES: every other world out there is a living bubble she can go into. Touch its membrane and keep pushing in for a moment
     (a little longer on a tired day): it gives, she slips through, and the camera comes in close so the bubble surrounds her (its
     inside walls glow). Inside she roams freely; pushing out against the membrane for a moment lets her out again; the way home
     lets her straight out. Not pushing, she slides round a membrane as before. Continuous: no teleport, no page switch.
   Honest: nothing here gives XP, crumbs or energy, so it cannot be farmed. Nothing runs unless she is out in the galaxy.
   Pure helpers are tested in tests/galaxy-bubbles.test.cjs. */
(function () {
    'use strict';
    const W = typeof window !== 'undefined' ? window : globalThis, D = W.document;

    /* ---------- pure helpers ---------- */
    /* PRESS: seconds of pushing on a membrane to go in or out (WEAK: extra share on a tired day); GRACE: a short slip is forgiven;
       TOUCH: how far off the glass (her sizes) a push still counts; IN: how straight the stick must point through the membrane; MAG: how hard; CAP_*: how close to a thread she is caught (her
       size times CAP_K, clamped, world units); FLOW: the current's speed as a share of her own top speed mid-thread; END: its share
       at the membranes; PULL: the draw to the thread's core (share of her top speed, always < 1); EASE: how fast a current takes
       hold / lets go; CAM_K / CAM_MIN: camera distance inside a bubble (share of its radius / floor); FLOOR: the galaxy's own camera
       distance (misty-galaxy GAL.D), kept for the spirit world's look while the camera is inside */
    const GB = { TOUCH: 0.5, PRESS: 0.5, WEAK: 0.8, GRACE: 0.25, IN: 0.35, MAG: 0.3, CAP_K: 2.4, CAP_MIN: 4, CAP_MAX: 16, FLOW: 0.6, END: 0.25, PULL: 0.28, EASE: 2.5, CAM_K: 1.1, CAM_MIN: 9, CAM_MAX: 105, FLOOR: 64 };
    const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
    function smooth(e0, e1, x) { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
    /* the closest point of a polyline (flat xyz array) to p: distance, share along it (0..1), the point and the unit tangent */
    function nearestOnPath(arr, px, py, pz) {
        const n = Math.floor((arr && arr.length || 0) / 3); let best = null;
        for (let k = 0; k < n - 1; k++) {
            const ax = arr[k * 3], ay = arr[k * 3 + 1], az = arr[k * 3 + 2], bx = arr[k * 3 + 3] - ax, by = arr[k * 3 + 4] - ay, bz = arr[k * 3 + 5] - az;
            const ll = bx * bx + by * by + bz * bz; if (ll < 1e-12) continue;
            const t = clamp(((px - ax) * bx + (py - ay) * by + (pz - az) * bz) / ll, 0, 1);
            const cx = ax + bx * t, cy = ay + by * t, cz = az + bz * t, dd = (px - cx) * (px - cx) + (py - cy) * (py - cy) + (pz - cz) * (pz - cz);
            if (!best || dd < best.dd) { const l = Math.sqrt(ll); best = { dd, u: (k + t) / (n - 1), cx, cy, cz, tx: bx / l, ty: by / l, tz: bz / l }; }
        }
        if (!best) return null;
        best.d = Math.sqrt(best.dd); return best;
    }
    /* the current's strength along the thread: strongest in the middle, softer where it meets the membranes */
    const flowProfile = u => GB.END + (1 - GB.END) * Math.sin(Math.PI * clamp(+u || 0, 0, 1));
    /* how firmly she is caught at distance d from the thread's core: fully in the inner part, letting go towards cap */
    const captureK = (d, cap) => 1 - smooth(cap * 0.4, cap, +d || 0);
    const capOf = hs => clamp((+hs || 1) * GB.CAP_K, GB.CAP_MIN, GB.CAP_MAX);
    /* the current's velocity at her position p for a hit from nearestOnPath, a thread flowing dir (+1 / -1) and her own top speed:
       along the flow, plus a gentle draw to the core */
    function currentAt(hit, dir, cap, top, px, py, pz) {
        if (!hit) return { x: 0, y: 0, z: 0, k: 0 };
        const ck = captureK(hit.d, cap); if (ck <= 0) return { x: 0, y: 0, z: 0, k: 0 };
        const along = (dir < 0 ? -1 : 1) * GB.FLOW * top * flowProfile(hit.u) * ck;
        let x = hit.tx * along, y = hit.ty * along, z = hit.tz * along;
        if (hit.d > 1e-6) { const pull = GB.PULL * top * ck * smooth(0, cap * 0.5, hit.d) / hit.d; x += (hit.cx - px) * pull; y += (hit.cy - py) * pull; z += (hit.cz - pz) * pull; }
        return { x, y, z, k: ck };
    }
    /* how hard she pushes: the stick, or holding the controller still (misty-turn thrust, -1 back / 1 forward). Oct 17 fix (E-man:
       "I flew at the moon with the forward button, bounced off, and on the next try I was back in my bubble"): only the stick
       counted, so the forward hold never pressed into any bubble and she just slid round it; holding forward now counts, like
       misty-flight already does inside a world (magX) */
    const pushOf = (mag, th) => Math.max(+mag || 0, Math.abs(+th || 0));
    /* pushing on a membrane: s = { t, miss, fired }; i = { dt, pushing, k (her energy 0..1) }; fire once when it gives */
    function pressHold(s, i) {
        s = s || { t: 0, miss: 0, fired: false }; i = i || {};
        const dt = clamp(+i.dt || 0, 0, 0.1), need = GB.PRESS * (1 + GB.WEAK * (1 - clamp(i.k == null ? 1 : +i.k, 0, 1)));
        let fire = false;
        if (i.pushing) { s.miss = 0; if (!s.fired) { s.t += dt; if (s.t >= need - 1e-9) { s.t = need; s.fired = true; fire = true; } } }
        else { s.miss += dt; if (s.miss > GB.GRACE) { s.t = 0; s.miss = 0; s.fired = false; } }
        return { s, p: s.fired ? 1 : clamp(s.t / need, 0, 1), fire, need };
    }
    /* the camera distance inside a bubble of radius r: close enough that the bubble surrounds her, never closer than CAM_MIN / d0 */
    const camInside = (r, d0) => clamp((+r || 10) * GB.CAM_K, Math.max(GB.CAM_MIN, +d0 || 0), GB.CAM_MAX);
    /* how far from its middle she can roam inside a bubble of radius r, for her size hs */
    const insideLimit = (r, hs) => Math.max((+r || 10) * 0.4, (+r || 10) - (+hs || 1) * 0.6);
    const core = { GB, pushOf, nearestOnPath, flowProfile, captureK, capOf, currentAt, pressHold, camInside, insideLimit, smooth };
    if (typeof module === 'object' && module.exports) module.exports = core;
    if (!D || !D.addEventListener || W.LowiGalaxyBubbles) return;

    /* ---------- browser ---------- */
    const B = { exitI: -1, g: null, others: [], paths: [], scanT: 0, rot: null, gb: -1, press: null, pressI: -1, cur: null, curK: 0, riding: -1, floor: false, skin: null, skinOf: -1, puff: 0, glowI: -1, glow: 0, log: [], T: null, v: null, v2: null, w: null };
    function note(s) { B.log.push(Math.round(performance.now()) + ' ' + s); if (B.log.length > 16) B.log.shift(); }
    function emit(on, i) { try { W.dispatchEvent(new CustomEvent('lowi:galaxy-bubble', { detail: { in: on, i } })); } catch (e) { } }
    function buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { } }
    function scan(a) {
        if (B.g && B.g.parent && (B.scanT -= 1) > 0) return B.g;
        B.scanT = 240;
        const g = a.scene && a.scene.getObjectByName && a.scene.getObjectByName('cosmos');
        if (!g) { B.g = null; return null; }
        if (g !== B.g) {
            B.g = g; B.others = []; B.paths = []; B.rot = null;
            g.children.forEach(o => { if (o.isMesh && o.userData && o.userData.r && o.position.lengthSq() > 1) B.others.push(o); });
            const th = g.getObjectByName('cosmos-threads'), ps = th && th.userData && th.userData.paths || [];
            /* a bounding sphere per thread, so each frame only the threads near her are walked point by point */
            ps.forEach(pa => {
                const A = pa.arr, n = A.length / 3; let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
                for (let k = 0; k < n; k++) { const x = A[k * 3], y = A[k * 3 + 1], z = A[k * 3 + 2]; x0 = Math.min(x0, x); y0 = Math.min(y0, y); z0 = Math.min(z0, z); x1 = Math.max(x1, x); y1 = Math.max(y1, y); z1 = Math.max(z1, z); }
                B.paths.push({ arr: A, dir: pa.dir < 0 ? -1 : 1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, cz: (z0 + z1) / 2, rad: Math.hypot(x1 - x0, y1 - y0, z1 - z0) / 2 });
            });
            note('scan ' + B.others.length + ' worlds ' + B.paths.length + ' currents');
        }
        if (!B.T) { const T = a.THREE; B.T = T; B.v = new T.Vector3(); B.v2 = new T.Vector3(); B.w = new T.Vector3(); B.cur = new T.Vector3(); B.l = new T.Vector3(); }
        return g;
    }
    /* the galaxy turns very slowly (cosmosStep): world <-> group space is a turn about y; she turns with it so bubbles keep her */
    function toLocal(out, p, th) { const c = Math.cos(th), s = Math.sin(th); return out.set(c * p.x - s * p.z, p.y, s * p.x + c * p.z); }
    function toWorld(out, p, th) { const c = Math.cos(th), s = Math.sin(th); return out.set(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }
    /* the inside of the bubble she is in: its membrane seen from within (a back-face copy of its own glass) */
    function skin(o) {
        if (B.skin && B.skinOf === o.id) return B.skin;
        const T = B.T; if (!T) return null;
        if (B.skin) { if (B.skin.parent) B.skin.parent.remove(B.skin); B.skin.material.dispose(); B.skin = null; }
        const m = o.material.clone(); m.side = T.BackSide;
        B.skin = new T.Mesh(o.geometry, m); B.skin.name = 'galaxy-bubble-inside'; B.skin.renderOrder = 4; B.skinOf = o.id;
        o.parent.add(B.skin);
        return B.skin;
    }
    function paintSkin(o, op, t) {
        if (op <= 0.01) { if (B.skin) B.skin.visible = false; return; }
        const s = skin(o); if (!s) return;
        s.visible = true; s.position.copy(o.position); s.scale.copy(o.scale);
        s.material.uniforms.uO.value = op; if (o.material.uniforms.uT) s.material.uniforms.uT.value = o.material.uniforms.uT.value;
    }
    /* her own top speed out there right now (misty-flight speed(k, 'out') times the galaxy's pace) */
    function topSpeed(ctx, S) { const GX = W.LowiMistyGalaxy; return (GX ? GX.speed(ctx, S) : 1) * (1.5 + 2.7 * clamp(+ctx.k || 0, 0, 1)); }
    /* one frame out in the galaxy, after misty-galaxy's own edges. true = handled (in place of the old solid-glass bump) */
    function step(ctx, S, V, mode, mag, K) {
        const a = ctx.a, dt = ctx.dt, g = scan(a); if (!g || !B.T) return false;
        const th = g.rotation.y, hs = S.hs || 1, wl = V.want.length();
        /* turn with the galaxy */
        if (B.rot != null && th !== B.rot) { const dr = th - B.rot; toWorld(S.p, B.l.copy(S.p), dr); toWorld(S.v, B.l.copy(S.v), dr); }
        B.rot = th;
        /* adventure tiers (misty-explore.js): on autopilot or her timed adventure she may go into the one bubble she aims for (S.exB),
           stay in it until she is done (S.exLeave), and ride a current only while she means to (S.exRide). Otherwise unchanged. */
        const auto = mode === 'auto', aimB = auto && S.exB != null && S.exB >= 0 ? S.exB : -1, ride = auto && !!S.exRide;
        const pl = toLocal(B.l, S.p, th), drive = mode === 'drive', pushK = (drive && pushOf(mag, S.th) >= GB.MAG && wl > 1e-4) || (aimB >= 0 && wl > 0.2);
        let glowI = -1, glowP = 0;
        if (B.gb >= 0) {
            const o = B.others[B.gb]; if (!o) { B.gb = -1; return false; }
            const r = o.userData.r, lim = insideLimit(r, hs);
            B.v.subVectors(pl, o.position); const d = B.v.length() || 1e-4; B.v.divideScalar(d); /* outward, group space */
            toWorld(B.w, B.v, th); /* outward, world space */
            const out = pushK ? V.want.dot(B.w) / wl : 0;
            if (auto && aimB === B.gb && S.exLeave) { leave(ctx, S, o, r, hs, th, 'out'); return true; }
            if (mode === 'home' || (auto && aimB !== B.gb)) { leave(ctx, S, o, r, hs, th, 'way home'); return true; }
            if (d > lim - hs * 0.15) {
                const h = pressHold(B.pressI === -2 ? B.press : null, { dt, pushing: out >= GB.IN, k: ctx.k });
                B.press = h.s; B.pressI = -2; glowI = B.gb; glowP = h.p;
                if (h.fire) { leave(ctx, S, o, r, hs, th, 'out'); return true; }
                if (h.p > 0 && (B.puff -= dt) <= 0 && ctx.burst) { B.puff = 0.15; B.v2.copy(S.p).addScaledVector(B.w, hs * 0.5); ctx.burst(B.v2, 1 + Math.round(2 * h.p), 0.25 * hs); }
            } else if (B.pressI === -2) { const h = pressHold(B.press, { dt, pushing: false }); B.press = h.s; if (h.p <= 0) B.pressI = -1; }
            if (d > lim) { B.v2.copy(o.position).addScaledVector(B.v, lim); toWorld(S.p, B.v2, th); const v = S.v.dot(B.w); if (v > 0) S.v.addScaledVector(B.w, -v * 1.2); }
            B.cur.multiplyScalar(Math.max(0, 1 - dt * GB.EASE)); S.p.addScaledVector(B.cur, dt);
            paintSkin(o, 0.6 + 0.4 * glowP, 0);
            glow(o, glowP);
            floor(ctx);
            return true;
        }
        /* the currents */
        let want = null, best = null, bestK = 0;
        if ((drive || ride) && !ctx.reduced) {
            const cap = capOf(hs);
            for (let i = 0; i < B.paths.length; i++) {
                const pa = B.paths[i], dx = pl.x - pa.cx, dy = pl.y - pa.cy, dz = pl.z - pa.cz, rr = pa.rad + cap;
                if (dx * dx + dy * dy + dz * dz > rr * rr) continue;
                const hit = nearestOnPath(pa.arr, pl.x, pl.y, pl.z); if (!hit || hit.d >= cap) continue;
                const ck = captureK(hit.d, cap); if (ck > bestK) { bestK = ck; best = { hit, pa, i }; }
            }
            if (best) { const c = currentAt(best.hit, best.pa.dir, cap, topSpeed(ctx, S), pl.x, pl.y, pl.z); want = toWorld(B.v2, B.v.set(c.x, c.y, c.z), th); }
        }
        if (want) B.cur.lerp(want, Math.min(1, dt * GB.EASE)); else B.cur.multiplyScalar(Math.max(0, 1 - dt * GB.EASE));
        if (B.cur.lengthSq() < 1e-8) B.cur.set(0, 0, 0);
        S.p.addScaledVector(B.cur, dt);
        const riding = best && bestK > 0.3 ? best.i : -1;
        if (riding !== B.riding) { if (riding >= 0) note('current ' + riding + (best.pa.dir > 0 ? ' +' : ' -')); else if (B.riding >= 0) note('off current'); B.riding = riding; }
        /* a few bubbles stream past her while she rides */
        const cs = B.cur.length();
        if (cs > 0.5 && (B.puff -= dt) <= 0 && ctx.burst) { B.puff = 0.22; B.v2.copy(S.p).addScaledVector(B.cur, -0.35 / Math.max(0.5, cs) * hs * 2); ctx.burst(B.v2, 1, 0.3 * hs); }
        /* the bubbles: push in to go in, otherwise slide round */
        toLocal(pl, S.p, th);
        let touched = -1;
        for (let i = 0; i < B.others.length; i++) {
            const o = B.others[i], r = o.userData.r, rr = r * 1.04 + hs * 0.4;
            B.v.subVectors(pl, o.position); const d = B.v.length();
            if (i === B.exitI) { if (d >= rr) B.exitI = -1; else continue; } /* on the way home she just leaves the one she was in */
            /* touching counts a hair beyond the glass (TOUCH): each slide nudges her off it for a frame, and every lost frame used to
               stall the press, so a steady push (forward hold, a pull from a current) often never got through */
            if (d >= rr + hs * GB.TOUCH || d < 1e-4) continue;
            B.v.divideScalar(d); toWorld(B.w, B.v, th); /* outward */
            const inward = pushK ? -V.want.dot(B.w) / wl : 0;
            if ((drive || i === aimB) && !ctx.reduced) {
                touched = i;
                const h = pressHold(B.pressI === i ? B.press : null, { dt, pushing: inward >= GB.IN, k: ctx.k });
                B.press = h.s; B.pressI = i; glowI = i; glowP = h.p;
                if (h.fire) { enter(ctx, S, o, i, r, hs, th); return true; }
                if (h.p > 0 && (B.puff -= dt) <= 0 && ctx.burst) { B.puff = 0.15; B.v2.copy(o.position).addScaledVector(B.v, r); toWorld(B.w, B.v2, th); ctx.burst(B.w, 1 + Math.round(2 * h.p), 0.25 * hs); toWorld(B.w, B.v, th); }
            }
            if (d >= rr) continue;
            /* solid until it gives: slide round */
            B.v2.copy(o.position).addScaledVector(B.v, rr); toWorld(S.p, B.v2, th);
            const v = S.v.dot(B.w); if (v < 0) S.v.addScaledVector(B.w, -v * 1.3);
            const c = B.cur.dot(B.w); if (c < 0) B.cur.addScaledVector(B.w, -c);
            toLocal(pl, S.p, th);
        }
        if (touched < 0 && B.pressI >= 0) { const h = pressHold(B.press, { dt, pushing: false }); B.press = h.s; if (h.p <= 0) B.pressI = -1; else { glowI = B.pressI; glowP = h.p; } }
        glow(glowI >= 0 ? B.others[glowI] : null, glowP);
        paintSkin(null, 0);
        floor(ctx);
        return true;
    }
    /* the membrane she presses brightens as it gives */
    function glow(o, p) {
        if (o && o.material && o.material.uniforms && o.material.uniforms.uO) { const u = o.material.uniforms.uO; u.value = Math.max(u.value, 0.35 + 0.6 * p); }
    }
    function enter(ctx, S, o, i, r, hs, th) {
        const lim = insideLimit(r, hs);
        B.gb = i; B.press = null; B.pressI = -1; B.floor = true;
        B.v2.copy(o.position).addScaledVector(B.v, Math.min(lim, r - hs * 0.9)); toWorld(S.p, B.v2, th);
        const v = S.v.dot(B.w); if (v > 0) S.v.addScaledVector(B.w, -v); S.v.addScaledVector(B.w, -1.2 * hs); B.cur.set(0, 0, 0);
        if (ctx.burst) { B.v2.copy(o.position).addScaledVector(B.v, r); toWorld(B.w, B.v2, th); ctx.burst(B.w, 16, 0.6 * hs); }
        buzz([20, 30, 40]); emit(true, i); note('in ' + i + ' r' + Math.round(r));
        floor(ctx);
    }
    function leave(ctx, S, o, r, hs, th, why) {
        B.exitI = why === 'way home' ? B.others.indexOf(o) : -1; B.gb = -1; B.press = null; B.pressI = -1;
        B.v.subVectors(toLocal(B.l, S.p, th), o.position); const d = B.v.length(); if (d < 1e-4) B.v.set(0, 1, 0); else B.v.divideScalar(d);
        toWorld(B.w, B.v, th);
        if (why !== 'way home') { B.v2.copy(o.position).addScaledVector(B.v, r * 1.04 + hs * 0.45); toWorld(S.p, B.v2, th); S.v.addScaledVector(B.w, 1.2 * hs); }
        if (ctx.burst) { B.v2.copy(o.position).addScaledVector(B.v, r); toWorld(B.l, B.v2, th); ctx.burst(B.l, 14, 0.6 * hs); }
        if (why !== 'way home') buzz([20, 30, 40]);
        paintSkin(null, 0); emit(false, B.others.indexOf(o)); note('out (' + why + ')');
    }
    /* the spirit world keeps its look while the camera is in close; given back once the camera is out at the galaxy's distance */
    function floor(ctx) {
        const r = ctx.r; if (!r) return;
        if (B.floor && B.gb < 0 && r.dist >= GB.FLOOR - 0.5) B.floor = false;
        const want = B.floor ? GB.FLOOR : 0; if (r.cosmosMin !== want) r.cosmosMin = want;
    }
    /* misty-galaxy cam(): the camera distance while she is inside a bubble (null = the galaxy's own) */
    function camDist(ctx, S) {
        if (B.gb < 0) return null;
        const o = B.others[B.gb]; if (!o) return null;
        return camInside(o.userData.r, (S.gxD0 || S.d0 || 6.5) * 1.4);
    }
    /* the flight ended or she is home: out of any bubble, no current, the spirit world's look given back */
    function reset(ctx, S) {
        const was = B.gb >= 0 || B.floor || B.cur && B.cur.lengthSq() > 0;
        B.gb = -1; B.exitI = -1; B.press = null; B.pressI = -1; B.riding = -1; B.floor = false; B.rot = null; if (B.cur) B.cur.set(0, 0, 0);
        if (B.skin) B.skin.visible = false;
        const r = ctx && ctx.r; if (r && r.cosmosMin) r.cosmosMin = 0;
        if (was) note('reset');
    }
    /* misty-explore.js: the bubbles and currents out there in world space right now (currents from where they start flowing) */
    function targets(ctx) {
        const g = ctx && ctx.a && scan(ctx.a); if (!g || !B.T) return null;
        const th = g.rotation.y, T = B.T, w = p => toWorld(new T.Vector3(), p, th);
        const bubbles = B.others.map((o, i) => ({ i, p: w(o.position), r: o.userData.r }));
        const streams = B.paths.map((pa, i) => {
            const A = pa.arr, n = A.length / 3, f = pa.dir > 0, at = k => w(new T.Vector3(A[k * 3], A[k * 3 + 1], A[k * 3 + 2]));
            const k0 = f ? Math.min(n - 1, 1) : Math.max(0, n - 2), k1 = f ? n - 1 : 0, mid = at(Math.floor(n / 2));
            return { i, from: at(k0), to: at(k1), mid };
        });
        return { bubbles, streams, inside: B.gb, riding: B.riding };
    }
    /* one current, flow-ordered, in world space, with the first point where she can get onto it (outside every bubble) */
    function stream(ctx, i) {
        const g = ctx && ctx.a && scan(ctx.a), pa = g && B.paths[i]; if (!pa || !B.T) return null;
        const th = g.rotation.y, T = B.T, A = pa.arr, n = A.length / 3, pts = [];
        for (let k = 0; k < n; k++) { const j = pa.dir > 0 ? k : n - 1 - k; pts.push(new T.Vector3(A[j * 3], A[j * 3 + 1], A[j * 3 + 2])); }
        const clear = q => B.others.every(o => q.distanceTo(o.position) > o.userData.r + 1.5);
        let entry = pts.findIndex(clear); if (entry < 0) entry = Math.floor(n / 3);
        let end = n - 1; while (end > entry && !clear(pts[end])) end--;
        return { pts: pts.map(q => toWorld(new T.Vector3(), q, th)), entry, end };
    }
    W.LowiGalaxyBubbles = { core, step, camDist, reset, targets, stream,
        state: () => ({ inside: B.gb, riding: B.riding, current: B.cur ? +B.cur.length().toFixed(2) : 0, press: B.press ? +(B.press.t || 0).toFixed(2) : 0, worlds: B.others.length, currents: B.paths.length, floor: B.floor, log: B.log.slice(-8) }) };
})();
