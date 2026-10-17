/* LOWiSPIKE · the secret way out into the galaxy (Oct 17, 2026, E-man):
   "if you actually steer your companion into the edges for long enough, and press long enough, you then all of a sudden can move
   around out of the world too. Then the out-of-the-world becomes a bigger galaxy to be able to steer along with. To the point where,
   in the future, we can even make it so that you can enter someone else's ecosystem."

   A hidden easter egg: no button, no tutorial. Steer Misty against the edge of your home world (misty-flight.js clamps her free
   flight at K.ROAM) and keep pushing outward: the edge of the world shows itself as a thin glass skin that bulges out around her,
   more and more, with a heartbeat at each second. After GAL.HOLD seconds it gives way and she slips through, in one continuous
   flight: the camera backs out with her (the same 3D scene, the same camera, no page switch, no teleport), the bloodstream's walls
   and fog fall away and the spirit world (body-world-3d-scene.js "cosmos": our own bubble and the other glass worlds) opens up
   around her. Out there she steers with the same controller, a lot faster (her speed scales with how far out the camera is, so on
   screen she moves the same), the camera follows her, and the clean flight view stays on. The other worlds are bubbles she can push
   into, and the threads between them are currents that carry her (Oct 17, galaxy-bubbles.js). Steer back into your own world and the camera comes back in with her; past the old edge she is home again.
   Autopilot, a recall or 20 s without steering also bring her home the same way.

   LIMITLESS (Oct 17, E-man, handoff item 11: "a limitless spirit world, no invisible walls; getting Home always possible"): there is
   no outer edge any more. The galaxy is a loop: fly on in any direction and the hand-made worlds give way to new space, made up as she flies (GEN, below), and then to the deep starry dark between
   galaxies (body-world-3d-scene.js fades the whole cosmos out by the camera's distance, COSMOS.DEEP0..DEEP1, and the stars and
   the far cells ride along with the camera there, like the sky); out in that dark, at GAL.LOOP from home, she and the camera are
   carried over to the same distance on the far side, both by the same vector in one frame, with nothing in view on either side, so
   nothing jumps. Keep flying and your own galaxy rises ahead of you again: you came round. Nothing new is ever built while she flies
   (the same ~40 worlds, plus a fixed handful of glass worlds re-used for the new space, see GEN below), so memory and battery stay flat however long she roams, and looping
   pays nothing (the galaxy gives no XP, no crumbs, no rewards of any kind). Home is never more than GAL.LOOP away in a straight
   line, and on the way home (20 s without steering, a recall) she flies faster the farther out she is (homeK), so the longest
   way home is about half a minute.

   Cheap: one extra mesh (the edge skin), only drawn while you push or while it rings out; out in the galaxy the per-frame work is
   a few vector ops plus a loop over ~40 spheres. Reduced motion: no breakout (Home has no 3D world then anyway).

   FUTURE (not built): other people's ecosystems as places to fly to. PLACES below is the registry the galaxy is built around:
   today it only holds your own world ('home'). A visit would add entries of kind 'eco' ({ id, owner, pos, r, open }) and an
   enter(place) that flies Misty in like an orbit-in. It needs: a server that stores each ecosystem's public snapshot (world look,
   companion, level, no health data), accounts with stable ids, consent (an owner opts in, can choose friends-only / anyone, can
   revoke, can block visitors), privacy (no fasting, food, water or step data ever leaves the owner's device unless they share it;
   visitors see only the look), and moderation for anything visitors can leave behind.
   Pure helpers are tested in tests/misty-galaxy.test.cjs. */
(function () {
    'use strict';
    const W = typeof window !== 'undefined' ? window : globalThis, D = W.document;

    /* ---------- pure helpers ---------- */
    /* HOLD: seconds of pushing; EDGE: share of the world's reach she must be at; OUT: how straight outward the stick must point;
       TENT: how far the skin bulges at the end (share of the reach); R: the galaxy's soft outer edge; D / D_MAX: camera distance
       out there (kept well below the spirit world's hand-over to Community, world-home.js fk > 0.9 = about 220); OPEN: where the
       camera has fully backed out (our own bubble in the spirit world, COSMOS.R = 46); BACK: back home below this share of the reach */
    const GAL = { HOLD: 3.2, EDGE: 0.97, OUT: 0.5, AWAY: 0.15, MAG: 0.35, GRACE: 0.3, DT: 0.1, TENT: 0.16, R: 230, D: 64, D_MAX: 105, OPEN: 46, BACK: 0.985, SPEED_MAX: 18,
        /* LIMITLESS: R is no longer a wall, only where the camera has backed all the way out; LOOP: where the deep dark carries her
           round to the far side; DEEP0 / DEEP1: the camera distances over which the cosmos fades into the deep (kept in step with
           body-world-3d-scene.js COSMOS.DEEP0 / DEEP1, tested); HOME_MAX: how much faster the long way home is at the far end */
        LOOP: 3000, DEEP0: 1000, DEEP1: 1130, HOME_MAX: 10, HOME_RAMP: 900 };
    const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
    function smooth(e0, e1, x) { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
    /* pushing on the edge: s = { t, miss, fired }; i = { dt, mode, mag, out (cos stick vs outward), edge (L / reach), busy } */
    function breakHold(s, i) {
        s = s || { t: 0, miss: 0, fired: false }; i = i || {};
        const dt = clamp(+i.dt || 0, 0, GAL.DT), out = +i.out || 0;
        const pressing = i.mode === 'drive' && !i.busy && (+i.mag || 0) >= GAL.MAG && out >= GAL.AWAY;
        const atEdge = (+i.edge || 0) >= GAL.EDGE && out >= GAL.OUT;
        let fire = false;
        if (!pressing) { s.t = 0; s.miss = 0; s.fired = false; }
        else if (atEdge) { s.miss = 0; if (!s.fired) { s.t += dt; if (s.t >= GAL.HOLD - 1e-9) { s.t = GAL.HOLD; s.fired = true; fire = true; } } }
        else { s.miss += dt; if (s.miss > GAL.GRACE) { s.t = 0; s.miss = 0; } }
        return { s, p: s.fired ? 1 : clamp(s.t / GAL.HOLD, 0, 1), fire };
    }
    /* how far the skin bulges out around her (world units) for p = 0..1 of the hold; she rides its tip */
    const tentOf = (p, reach) => GAL.TENT * (+reach || 11) * Math.pow(clamp(+p || 0, 0, 1), 1.3);
    /* the camera distance for her distance L from home's middle: home's own distance at the edge, backing out continuously as she
       leaves, all the way out by OPEN, then a little more the farther she roams */
    function camDist(L, d0, reach) {
        d0 = +d0 || 6.5; reach = +reach || 11; L = +L || 0;
        return d0 + (GAL.D - d0) * smooth(reach, GAL.OPEN, L) + (GAL.D_MAX - GAL.D) * smooth(GAL.OPEN, GAL.R, L);
    }
    /* her speed out there: scaled by how far out the camera is, so on screen she flies at the same pace as at home */
    const speedK = (dist, d0) => clamp(Math.pow(Math.max(1, (+dist || 1) / Math.max(0.5, +d0 || 6.5)), 0.85), 1, GAL.SPEED_MAX);
    /* the edge skin rings out after she slips through (no pop) */
    const ringOut = (a0, t) => a0 * Math.exp(-3 * t) * Math.cos(11 * t);
    /* LIMITLESS: past LOOP she is carried round to the far side: the factor her offset from home is multiplied by (1 = stay). The new
       distance is 2 * LOOP - L on the opposite side, so a straight flight goes on straight and comes home from behind */
    const loopK = L => { L = +L || 0; return L > GAL.LOOP ? (L - 2 * GAL.LOOP) / L : 1; };
    /* how much of the cosmos shows for the camera's distance from home: 1 among the worlds, 0 in the deep dark where the loop is */
    const deepK = camL => 1 - smooth(GAL.DEEP0, GAL.DEEP1, +camL || 0);
    /* the long way home: faster the farther out she is (1 near home, HOME_MAX from HOME_RAMP past the galaxy's camera edge on) */
    const homeK = L => 1 + (GAL.HOME_MAX - 1) * smooth(GAL.R, GAL.R + GAL.HOME_RAMP, +L || 0);
    /* the galaxy's places: today only your own world; other ecosystems are FUTURE (see the header) */
    const PLACES = [{ id: 'home', kind: 'home', pos: [0, 0, 0], r: GAL.OPEN, open: true }];
    const places = () => PLACES.map(p => Object.assign({}, p, { pos: p.pos.slice() }));
    /* LIMITLESS, new space (Oct 17, E-man: "the game will generate a new space instead of having the whole world there, so the app
       isn't bloated and doesn't take more memory, and it stays in this illusion of expansion"): past the hand-made galaxy, space is
       split into invisible cubes of GEN.CELL; whether a cube holds a world, where in it, how big, is worked out from the cube's
       coordinates alone (hash3), so the same place always holds the same world when you come back, nothing is stored, and only the
       few worlds near the camera are drawn (body-world-3d-scene.js reuses a fixed handful of glass worlds for them). They are not solid:
       Misty can fly right into any of them. GEN.MIN: no new worlds inside the hand-made galaxy; GEN.MAX: none near the loop point, so
       nothing is in view when she comes round; GEN.SEE: how far away a new world starts to show (it fades in from there). */
    const GEN = { CELL: 260, P: 0.5, MIN: 1000, MAX: GAL.LOOP - 450, SEE: 430, R0: 10, R1: 42 };
    const hash3 = (i, j, k, s) => {
        let h = Math.imul(i | 0, 0x27d4eb2d) ^ Math.imul(j | 0, 0x165667b1) ^ Math.imul(k | 0, 0x1b873593) ^ Math.imul((s | 0) + 0x9e37, 0x2c1b3c6d);
        h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); h ^= h >>> 16;
        return (h >>> 0) / 4294967296;
    };
    /* the world in cube (i, j, k), written into out, or false when the cube is empty */
    function deepWorld(i, j, k, out) {
        if (hash3(i, j, k, 1) > GEN.P) return false;
        const c = GEN.CELL, x = (i + 0.2 + 0.6 * hash3(i, j, k, 2)) * c, y = (j + 0.2 + 0.6 * hash3(i, j, k, 3)) * c, z = (k + 0.2 + 0.6 * hash3(i, j, k, 4)) * c;
        const L = Math.hypot(x, y, z);
        if (L < GEN.MIN || L > GEN.MAX) return false;
        out.key = ((i + 512) * 1024 + (j + 512)) * 1024 + (k + 512); out.x = x; out.y = y; out.z = z;
        out.r = GEN.R0 + (GEN.R1 - GEN.R0) * Math.pow(hash3(i, j, k, 5), 1.6); out.p = hash3(i, j, k, 6) * 6.283;
        return true;
    }
    /* the worlds near a point, nearest first, at most n (no more than the scene has glass worlds for); reuses its own scratch */
    const genScratch = Array.from({ length: 125 }, () => ({ key: 0, x: 0, y: 0, z: 0, r: 0, p: 0, d: 0 }));
    const genOut = [];
    function deepNear(px, py, pz, n) {
        const c = GEN.CELL, ci = Math.floor(px / c), cj = Math.floor(py / c), ck = Math.floor(pz / c);
        let m = 0; genOut.length = 0;
        for (let i = ci - 2; i <= ci + 2; i++) for (let j = cj - 2; j <= cj + 2; j++) for (let k = ck - 2; k <= ck + 2; k++) {
            const w = genScratch[m];
            if (!deepWorld(i, j, k, w)) continue;
            w.d = Math.hypot(w.x - px, w.y - py, w.z - pz) - w.r;
            if (w.d > GEN.SEE + 60) continue;
            genOut.push(w); m++;
        }
        genOut.sort((a, b) => a.d - b.d);
        if (genOut.length > n) genOut.length = n;
        return genOut;
    }
    /* how much of the new space shows for the camera's distance from home: none near home, all of it out in the deep, none again
       near the loop point (so nothing is in view when she comes round) */
    const genK = camL => { camL = +camL || 0; return smooth(GEN.MIN - 300, GEN.MIN - 100, camL) * (1 - smooth(GAL.LOOP - 350, GAL.LOOP - 200, camL)); };
    const core = { GAL, GEN, breakHold, tentOf, camDist, speedK, ringOut, places, smooth, loopK, deepK, homeK, hash3, deepWorld, deepNear, genK };
    if (typeof module === 'object' && module.exports) module.exports = core;
    if (!D || !D.addEventListener || W.LowiMistyGalaxy) return;

    /* ---------- browser ---------- */
    const H = D.documentElement;
    const G = { h: null, p: 0, ring: 0, ringT: 9, beat: 0, skin: null, uni: null, dir: null, tmp: null, tmp2: null, spark: 0, loops: 0, log: [] };
    function note(s) { G.log.push(Math.round(performance.now()) + ' ' + s); if (G.log.length > 16) G.log.shift(); }
    function busy() { try { const s = W.LowiWorldRegions && W.LowiWorldRegions.state; return !!(s && (s.busy || s.warp)); } catch (e) { return false; } }
    function cls(on) { if (H.classList.contains('mf-galaxy') !== on) H.classList.toggle('mf-galaxy', on); }
    /* the edge of the home world, a thin glass skin at the reach, tented out along uD by uA; drawn only while it shows */
    function skin(a, reach) {
        if (G.skin && G.skin.parent) return G.skin;
        const T = a.THREE; if (!T || !a.scene) return null;
        G.dir = new T.Vector3(0, 1, 0); G.tmp = new T.Vector3(); G.tmp2 = new T.Vector3();
        G.uni = { uD: { value: G.dir }, uA: { value: 0 }, uO: { value: 0 }, uR: { value: reach } };
        const m = new T.ShaderMaterial({
            uniforms: G.uni, transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, fog: false,
            vertexShader: 'uniform vec3 uD;uniform float uA;uniform float uR;varying float vF;varying float vT;' +
                'void main(){vec3 n=normalize(position);float c=max(dot(n,uD),0.0);float pw=pow(c,90.0);vec3 p=n*uR+uD*(uA*pw);' +
                'vec4 mv=modelViewMatrix*vec4(p,1.0);vec3 nv=normalize(normalMatrix*n);vF=1.0-abs(dot(nv,normalize(-mv.xyz)));vT=pow(c,24.0);gl_Position=projectionMatrix*mv;}',
            fragmentShader: 'uniform float uO;uniform float uA;varying float vF;varying float vT;' +
                'void main(){float a=uO*(0.05+0.55*pow(vF,3.0))*vT+uO*vT*vT*0.35;vec3 c=mix(vec3(0.45,0.85,1.0),vec3(0.9,0.75,1.0),vT);gl_FragColor=vec4(c*a,a);}'
        });
        const g = new T.SphereGeometry(1, 72, 48);
        G.skin = new T.Mesh(g, m); G.skin.name = 'galaxy-edge'; G.skin.frustumCulled = false; G.skin.visible = false; G.skin.renderOrder = 5;
        a.scene.add(G.skin);
        return G.skin;
    }
    function paintSkin(a, reach, amt, op) {
        const s = skin(a, reach); if (!s) return;
        const on = op > 0.01; if (s.visible !== on) s.visible = on;
        if (!on) return;
        G.uni.uR.value = reach; G.uni.uA.value = amt; G.uni.uO.value = op;
    }
    /* her free flight at home, one frame, in place of misty-flight's hard clamp at the reach. true = handled (no clamp needed) */
    function step(ctx, S, V, mode, mag, K) {
        const a = ctx.a, dt = ctx.dt, reach = K.ROAM, L = S.p.length(); G.S = S;
        if (S.gx) {
            /* the edge rings out behind her */
            if (G.ring) { G.ringT += dt; const w = ringOut(G.ring, G.ringT); paintSkin(a, reach, Math.max(0, w), Math.max(0, 0.7 * Math.exp(-1.6 * G.ringT))); if (G.ringT > 2.4) { G.ring = 0; paintSkin(a, reach, 0, 0); } }
            /* back through your own edge: home again (the camera comes back in with her, misty-flight cam below) */
            if (L < reach * GAL.BACK) { if (W.LowiGalaxyBubbles) W.LowiGalaxyBubbles.reset(ctx, S); S.gx = false; S.gxBack = true; cls(false); G.ring = 0; paintSkin(a, reach, 0, 0); note('home again'); return false; }
            /* LIMITLESS: no outer edge. Out in the deep dark she and the camera are carried round to the far side together */
            if (L > GAL.LOOP) {
                G.tmp.copy(S.p).multiplyScalar(loopK(L) - 1); S.p.add(G.tmp);
                if (ctx.r && ctx.r.target && !ctx.r.fly) ctx.r.target.add(G.tmp);
                G.loops++; note('came round ' + G.loops);
            }
            /* Oct 17: every other world is a bubble she can go into, and the threads between them are currents (galaxy-bubbles.js);
               without that file they stay solid glass */
            const GBB = W.LowiGalaxyBubbles;
            if (!(GBB && GBB.step(ctx, S, V, mode, mag, K))) bump(a, S);
            return true;
        }
        /* pushing on the edge */
        const wl = V.want.length(), out = L > 1e-4 && wl > 1e-4 ? V.want.dot(S.p) / (L * wl) : 0;
        const h = breakHold(G.h, { dt, mode, mag, out, edge: L / reach, busy: busy() || !!ctx.r.fly || !!ctx.reduced || !!(W.LowiAdventure && W.LowiAdventure.on) });
        G.h = h.s; G.p = h.p;
        if (h.p <= 0) { if (G.shown) { G.shown = false; paintSkin(a, reach, 0, 0); } G.beat = 0; return false; }
        if (!G.tmp) skin(a, reach);
        if (!G.tmp) return false;
        G.shown = true;
        G.dir.copy(S.p).normalize();
        const tent = tentOf(h.p, reach);
        paintSkin(a, reach, tent, 0.25 + 0.75 * h.p);
        /* she rides the tip of the bulge, slowed as it stretches */
        const lim = reach + tent * 0.92;
        if (L > lim) { S.p.multiplyScalar(lim / L); const o = S.v.dot(G.dir); if (o > 0) S.v.addScaledVector(G.dir, -o * 0.85); }
        /* light gathers where she presses; a heartbeat each second */
        if ((G.spark -= dt) <= 0 && ctx.burst) { G.spark = 0.16 - 0.08 * h.p; G.tmp2.copy(G.dir).multiplyScalar(lim + 0.3 * (S.hs || 1)); ctx.burst(G.tmp2, 1 + Math.round(3 * h.p), (0.12 + 0.25 * h.p) * Math.max(0.4, S.hs || 1)); }
        const beat = Math.floor(h.p * GAL.HOLD + 1e-6);
        if (beat > G.beat && beat < GAL.HOLD) { G.beat = beat; try { if (navigator.vibrate) navigator.vibrate(10); } catch (e) { } }
        if (!h.fire) return true;
        /* it gives way: she slips through and keeps flying */
        S.gx = true; S.gxBack = false; S.gxD0 = G.shown0 ? S.gxD0 : S.d0; G.shown0 = false; G.h = null; G.p = 0; G.ring = tent; G.ringT = 0; G.beat = 0; cls(true);
        S.v.addScaledVector(G.dir, 2.2);
        if (ctx.burst) { G.tmp2.copy(G.dir).multiplyScalar(lim); ctx.burst(G.tmp2, 22, 0.7 * Math.max(0.5, S.hs || 1)); }
        try { if (navigator.vibrate) navigator.vibrate([30, 40, 60]); } catch (e) { }
        try { W.dispatchEvent(new CustomEvent('lowi:galaxy', { detail: { on: true } })); } catch (e) { }
        note('break out');
        return true;
    }
    /* fallback without galaxy-bubbles.js: the other worlds are solid glass, she slides round them */
    let others = null, othersT = 0;
    function bump(a, S) {
        if (!others || (othersT -= 1) <= 0) {
            othersT = 120; others = [];
            const c = a.scene && a.scene.getObjectByName && a.scene.getObjectByName('cosmos');
            if (c) c.children.forEach(o => { if (o.isMesh && o.userData && o.userData.r && o.position.lengthSq() > 1) others.push(o); });
        }
        for (let i = 0; i < others.length; i++) {
            const o = others[i], r = o.userData.r * 1.04 + (S.hs || 1) * 0.4;
            G.tmp.subVectors(S.p, o.position); const d = G.tmp.length();
            if (d < r && d > 1e-4) { G.tmp.divideScalar(d); S.p.copy(o.position).addScaledVector(G.tmp, r); const v = S.v.dot(G.tmp); if (v < 0) S.v.addScaledVector(G.tmp, -v * 1.3); }
        }
    }
    /* the camera distance while she is out (or coming back in). true = handled */
    function cam(ctx, S) {
        const r = ctx.r, dt = ctx.dt;
        if (S.gx) { const gb = W.LowiGalaxyBubbles && W.LowiGalaxyBubbles.camDist(ctx, S); /* inside a bubble: in close */
            r.dist += ((gb || camDist(S.p.length(), (S.gxD0 || S.d0) * 1.16, ctx.K.ROAM)) - r.dist) * Math.min(1, dt * 1.4); return true; }
        if (S.gxBack) {
            const d0 = S.gxD0 || S.d0; r.dist += (d0 - r.dist) * Math.min(1, dt * 1.4);
            if (Math.abs(r.dist - d0) < d0 * 0.02) { r.dist = d0; S.d0 = d0; S.gxBack = false; }
            return true;
        }
        /* while pushing, the camera eases back a touch: the way out is opening; let go and it comes back */
        if (G.p > 0) { if (!G.shown0) { S.gxD0 = S.d0; G.shown0 = true; } r.dist += (S.gxD0 * (1 + 0.16 * G.p * G.p) - r.dist) * Math.min(1, dt * 5); return true; }
        if (G.shown0) { r.dist += (S.gxD0 - r.dist) * Math.min(1, dt * 5); if (Math.abs(r.dist - S.gxD0) < 0.02) { r.dist = S.gxD0; G.shown0 = false; } return true; }
        return false;
    }
    function speed(ctx, S) { if (!(S.gx || S.gxBack)) return 1; const home = !!(ctx.PD && ctx.PD.mode === 'home'); return speedK(ctx.r.dist, S.gxD0 || S.d0) * (home ? homeK(S.p.length()) : 1); }
    /* the flight ended (home, tab switch, tap away): never leave the camera out in the galaxy */
    function reset(ctx, S) {
        const r = ctx && ctx.r, was = S.gx || S.gxBack || G.shown0;
        if (r && was && S.gxD0) r.dist = S.gxD0;
        /* LIMITLESS: the flight ended far out (a tab, a tap away): never leave the camera out in the deep, glide it home */
        if (r && r.target && was && !r.fly && r.target.length() > 60) { r.fly = { from: { t: r.target.clone(), d: r.dist }, to: { t: r.target.clone().set(0, 0, 0), d: S.gxD0 || r.dist }, t: 0, dur: 1.6 }; r.flyYaw = null; r.idle = 0; }
        if (W.LowiGalaxyBubbles) W.LowiGalaxyBubbles.reset(ctx, S);
        S.gx = false; S.gxBack = false; G.h = null; G.p = 0; G.ring = 0; G.shown = false; G.shown0 = false; cls(false);
        if (ctx && ctx.a && G.skin) paintSkin(ctx.a, 11, 0, 0);
        if (was) { note('reset'); try { W.dispatchEvent(new CustomEvent('lowi:galaxy', { detail: { on: false } })); } catch (e) { } }
    }
    W.LowiMistyGalaxy = { core, step, cam, speed, reset, places,
        /* test browsers are too slow to fly her all the way to the edge: put her at a share of the reach on her current heading */
        _probe: k => { const S = G.S; if (!S || S.st !== 'free') return false; const L = S.p.length() || 1; S.p.multiplyScalar(11 * k / L); return true; }, state: () => ({ p: +G.p.toFixed(3), on: H.classList.contains('mf-galaxy'), ring: +G.ring.toFixed(2), loops: G.loops, far: G.S && G.S.gx ? Math.round(G.S.p.length()) : 0, log: G.log.slice(-8) }) };
})();
