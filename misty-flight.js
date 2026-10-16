/* LOWiSPIKE Misty's free flight (Oct 16, 2026, E-man, iPhone screenshots: "when I use the joystick to move Misty out, she suddenly
   shrinks and gets tiny inside her bubble ... once she's out she seems locked to the outer atmosphere").
   What he wants: "It should just move the companion out of the bubble ... and even kind of stretch out the bubble a little bit.
   Imagine an insect being stuck in a bubble, trying to move out, but the bubble doesn't pop." Then she explores, planet to planet;
   only as she gets close to a glowing place does she get smaller, and right at its atmosphere the same warp plays as a tap on it.
   Inside a world she flew into she is there with you and you keep steering her. A tap on a place still enters without her.

   How it works (all inside Home's one 3D world, window.LowiWorld3D; the controller is misty-pad.js, Home's pad state and the
   3D sprite "wand" live in world-home.js, which hands the sprite to this file through LowiMistyFlight.wants/frame each frame):
   - exit: the sprite starts exactly where the DOM Misty was and at her exact on-screen size (measured from #spBubble .tmg-plant).
     Pushing out tents the membrane toward her (a vertex deform patched into the membrane shader at runtime, uPushD/uPushA),
     she slows as it stretches, then slips through; the membrane springs back with a damped wobble. Let go early: it pulls her back.
   - free: the stick moves her in the screen plane at a constant on-screen size, anywhere in the world (no orbit, no shell).
     Pointing the stick at a glowing place you can see bends her path toward it in depth too. The camera follows her.
   - near a place she shrinks gradually and the camera eases in; at its atmosphere: LowiWorld3D.flyTo(id), the tap's own warp.
   - inside: once that warp lands she fades in, in front of you, and the stick steers her around the place (camera follows).
   - auto (double-tap): she leaves her bubble and tours the world by herself, stopping near each place (never entering).
   - home (tap her empty cell, or 20 s without steering): she flies back and slips into her cell.
   Tired Misty is slower (same energy as her face). Reduced motion: no bob, no wobble (and Home has no 3D world then anyway).
   Pure helpers at the top are tested in tests/misty-flight.test.cjs. */
(function () {
    'use strict';
    const W = typeof window !== 'undefined' ? window : globalThis, D = W.document;

    /* ---------- pure helpers ---------- */
    const K = { CR: 1.4, ENTRY: 1.35, NEAR: 4.4, MIN_K: 0.42, ROAM: 11, MAG_DEG: 42, IN_R: 3.0, IDLE_HOME: 20 };
    const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
    function smooth(e0, e1, x) { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
    /* 0 while far from a place, 1 at the edge of its atmosphere (the entry threshold) */
    const approach = d => smooth(K.NEAR, K.ENTRY, d);
    /* her on-screen size factor: 1 everywhere, shrinking only as she nears a place */
    const sizeK = ap => 1 - (1 - K.MIN_K) * clamp(ap, 0, 1);
    /* world units per second; tired is slower but never stuck. where: 'out' (the world), 'exit' (pushing her bubble), 'in' (a place) */
    function speed(k, where) {
        k = clamp(+k || 0, 0, 1);
        if (where === 'in') return 0.55 + 1.05 * k;
        if (where === 'exit') return 0.8 + 1.3 * k;
        return 1.5 + 2.7 * k;
    }
    /* how far the membrane is tented out by her, and how much it holds her back */
    const stretchOf = (off, rin, smax) => clamp(off - rin, 0, smax);
    const resist = (s, smax) => 1 - 0.6 * clamp(smax > 0 ? s / smax : 0, 0, 1);
    /* after she slips through, the membrane rings out and settles (no pop) */
    const wobble = (a0, t, still) => still ? 0 : a0 * Math.exp(-3.2 * t) * Math.cos(13 * t);
    /* which visible place the stick points at, as seen from Misty on screen. cands: [{id, sx, sy, front}] offsets in px, y up */
    function aimAt(vx, vy, cands, maxDeg) {
        const m = Math.hypot(vx, vy); if (m < 0.1 || !cands) return null;
        maxDeg = maxDeg || K.MAG_DEG; let best = null;
        for (const c of cands) {
            if (!c || !c.front) continue;
            const L = Math.hypot(c.sx, c.sy); if (L < 1) continue;
            const deg = Math.acos(clamp((vx * c.sx + vy * c.sy) / (m * L), -1, 1)) * 180 / Math.PI;
            if (deg > maxDeg) continue;
            const w = 1 - deg / maxDeg; if (!best || w > best.w) best = { id: c.id, w };
        }
        return best;
    }
    /* the screen height the whole 260x310 sprite texture needs so Misty's art matches the DOM Misty (both letterbox the viewBox) */
    function spritePx(rectW, rectH, vbW, vbH) {
        vbW = vbW || 260; vbH = vbH || 310;
        const sD = Math.min(rectW / vbW, rectH / vbH), sC = Math.min(260 / vbW, 310 / vbH);
        return sC > 0 ? sD * 310 / sC : 0;
    }
    const core = { K, smooth, approach, sizeK, speed, stretchOf, resist, wobble, aimAt, spritePx };
    if (typeof module === 'object' && module.exports) module.exports = core;
    if (!D || !D.addEventListener || W.LowiMistyFlight) return;

    /* ---------- browser ---------- */
    const H = D.documentElement;
    const S = { st: 'idle', p: null, v: null, base: 0, ks: 1, hs: 1, held: false, d0: 0, dHome: 0, dolly: 0, flew: null, idle: 0,
        wob: 0, wobT: 9, wobDir: null, push: 0, pushDir: null, mem: null, patched: false, domT: 0, dom: null, warpT: 0, warpFrom: null, warpTo: null,
        inC: null, inHs: 0, fade: 1, wp: -1, wpWait: 0, t: 0, trail: 0, cell0: null, near: null, ap: 0, entered: 0, log: [] };
    let V = null; /* temp vectors, made once THREE is known */
    const w3 = () => W.LowiWorld3D || null;
    const R = () => W.LowiWorldRegions || null;
    function curRegion() { try { const r = R(); return r && r.current ? r.current() : 'hub'; } catch (e) { return 'hub'; } }
    function regionsBusy() { const r = R(), s = r && r.state; return !!(s && (s.busy || s.warp)); }
    const norm = id => id === 'muscles' ? 'muscle' : id === 'blood' ? 'hub' : id;
    function vecs(THREE) {
        if (V) return V;
        V = { rt: new THREE.Vector3(), up: new THREE.Vector3(), fw: new THREE.Vector3(), c: new THREE.Vector3(), a: new THREE.Vector3(), b: new THREE.Vector3(),
            want: new THREE.Vector3(), m4: new THREE.Matrix4(), q: new THREE.Vector3() };
        S.p = new THREE.Vector3(); S.v = new THREE.Vector3(); S.wobDir = new THREE.Vector3(0, 1, 0); S.pushDir = new THREE.Vector3(0, 1, 0);
        S.warpFrom = new THREE.Vector3(); S.warpTo = new THREE.Vector3(); S.inC = new THREE.Vector3(); S.cell0 = { x: 0, y: 0 };
        return V;
    }
    function canvasRect(a) { const cv = a.renderer && a.renderer.domElement; const q = cv && cv.getBoundingClientRect ? cv.getBoundingClientRect() : null; return q && q.width ? q : { left: 0, top: 0, width: W.innerWidth, height: W.innerHeight }; }
    function toScreen(a, p, out) {
        const q = canvasRect(a); V.q.copy(p).project(a.camera);
        out = out || {}; out.x = q.left + (V.q.x + 1) / 2 * q.width; out.y = q.top + (1 - V.q.y) / 2 * q.height; out.z = V.q.z; return out;
    }
    function fromScreen(a, x, y, depthAt, out) {
        const q = canvasRect(a); V.q.copy(depthAt).project(a.camera);
        return out.set((x - q.left) / q.width * 2 - 1, -((y - q.top) / q.height * 2 - 1), V.q.z).unproject(a.camera);
    }
    /* on-screen pixels per world unit at p (from the live projection, view offset included) */
    function pxPerUnit(a, p) {
        const s0 = toScreen(a, p, {}); V.b.copy(p).addScaledVector(V.up, 1); const s1 = toScreen(a, V.b, {});
        return Math.max(1e-3, Math.hypot(s1.x - s0.x, s1.y - s0.y));
    }
    function basis(a) {
        const cam = a.camera; cam.updateMatrixWorld();
        V.rt.setFromMatrixColumn(cam.matrixWorld, 0).normalize(); V.up.setFromMatrixColumn(cam.matrixWorld, 1).normalize(); V.fw.setFromMatrixColumn(cam.matrixWorld, 2).normalize();
        if (a.hub) a.hub.getWorldPosition(V.c); else V.c.set(0, 0, 0);
    }
    /* the DOM Misty: where she is and how tall the sprite texture must be on screen to match her exactly */
    function domMisty() {
        const s = D.querySelector('#spBubble .tmg-plant'); if (!s || !s.getBoundingClientRect) return null;
        const q = s.getBoundingClientRect(); if (!q.width || !q.height) return null;
        const vb = s.viewBox && s.viewBox.baseVal;
        return { cx: q.left + q.width / 2, cy: q.top + q.height / 2, px: spritePx(q.width, q.height, vb && vb.width, vb && vb.height) };
    }
    /* the membrane mesh of her cell, with the stretch deform patched into its vertex shader (once) */
    function membrane(a) {
        if (S.mem && S.mem.parent) return S.mem;
        let m = null; if (!a.memU || !a.scene) return null;
        a.scene.traverse(o => { if (!m && o.isMesh && o.material && o.material.uniforms === a.memU) m = o; });
        S.mem = m; if (!m) return null;
        const u = a.memU;
        if (!u.uPushA) { u.uPushD = { value: new a.THREE.Vector3(0, 1, 0) }; u.uPushA = { value: 0 }; u.uPushK = { value: 2.4 }; }
        const vs = m.material.vertexShader || '', key = 'void main(){';
        if (!S.patched && vs.indexOf('uPushA') < 0 && vs.indexOf(key) >= 0) {
            const i = vs.indexOf(key) + key.length, j = vs.indexOf(';', i) + 1;
            /* tent the surface along uPushD around the spot she pushes, squeeze the rest a touch (volume), tilt normals with the stretch */
            const add = 'vec3 nP=normalize(position);float pw=pow(max(dot(nP,uPushD),0.0),uPushK);p+=uPushD*(uPushA*pw)-nP*(uPushA*0.1*(1.0-pw));' +
                'vec3 nW=normalize(normal-uPushD*dot(normal,uPushD)*clamp(abs(uPushA)*pw*1.4,0.0,0.85));';
            m.material.vertexShader = 'uniform vec3 uPushD;uniform float uPushA;uniform float uPushK;' + vs.slice(0, j) + add + vs.slice(j).replace('normalMatrix*normal', 'normalMatrix*nW');
            m.material.needsUpdate = true;
        }
        S.patched = true;
        return m;
    }
    function setPush(a, dirW, amt) {
        const m = membrane(a); if (!m || !a.memU.uPushA) return;
        if (Math.abs(amt) < 1e-4) { a.memU.uPushA.value = 0; return; }
        m.updateMatrixWorld(); V.m4.copy(m.matrixWorld).invert();
        a.memU.uPushD.value.copy(dirW).transformDirection(V.m4);
        const sc = m.getWorldScale ? m.getWorldScale(V.b).x || 1 : 1;
        a.memU.uPushA.value = amt / sc;
    }
    function hold(on) {
        const a = w3(); if (!a) return;
        if (on) { if (!a.hold) { a.hold = true; S.held = true; } }
        else if (S.held) { a.hold = false; S.held = false; }
    }
    function padMode(ctx, m) {
        ctx.PD.mode = m; ctx.PD.vx = ctx.PD.vy = 0; ctx.PD.idle = 0;
        try { W.dispatchEvent(new CustomEvent('lowi:pad', { detail: { mode: m } })); } catch (e) { }
    }
    function classes(on, roam, inside) {
        H.classList.toggle('mf-on', on); H.classList.toggle('mf-roam', !!roam); H.classList.toggle('mf-in', !!inside);
        if (!on) { const b = D.getElementById('spBubble'); if (b) { b.style.removeProperty('--mf-bx'); b.style.removeProperty('--mf-by'); } }
    }
    function note(s) { S.log.push(Math.round(performance.now()) + ' ' + s); if (S.log.length > 30) S.log.shift(); }

    function begin(ctx) {
        const a = ctx.a, r = ctx.r; basis(a);
        const dm = S.dom || domMisty();
        S.base = dm && dm.px > 8 ? dm.px : pxPerUnit(a, V.c) * 1.2;
        if (ctx.wand && ctx.wand.visible && ctx.wand.material.opacity > 0.2) S.p.copy(ctx.wand.position);
        else if (dm) fromScreen(a, dm.cx, dm.cy, V.c, S.p);
        else S.p.copy(V.c);
        S.v.set(0, 0, 0); S.d0 = r.dist; S.dHome = r.dist; S.dolly = 0; S.ks = 1; S.idle = 0; S.wp = -1; S.wpWait = 0; S.fade = 1; S.flew = null;
        const cs = toScreen(a, V.c, {}); S.cell0.x = cs.x; S.cell0.y = cs.y;
        S.hs = S.base / pxPerUnit(a, S.p);
        S.st = S.p.distanceTo(V.c) < K.CR * 0.95 ? 'exit' : 'free';
        hold(true); classes(true, false, false); note('begin ' + S.st + ' ' + ctx.PD.mode + ' px=' + Math.round(S.base));
    }
    function end(ctx, why) {
        const a = ctx && ctx.a, r = ctx && ctx.r;
        note('end ' + why);
        if (r && a && (why === 'abort' || why === 'home') && !regionsBusy() && curRegion() === 'hub') { r.target.set(0, 0, 0); if (why === 'abort' && S.dHome) r.dist = S.dHome; }
        S.st = 'idle'; S.flew = null; S.dolly = 0; hold(false); classes(false, false, false);
        if (ctx && ctx.PD && ctx.PD.mode) padMode(ctx, '');
        if (ctx && ctx.wand) { ctx.wand.material.opacity = 0; ctx.wand.visible = false; }
    }

    /* ---------- ownership: is the flight (exit, free, warp, inside, home) ours this frame? ---------- */
    function wants(ctx) {
        const a = ctx.a, r = ctx.r, PD = ctx.PD; if (!a || !a.THREE || !a.camera || !r) return false;
        vecs(a.THREE);
        const homeTab = H.classList.contains('wh-home') && H.classList.contains('wh-world-live');
        const ok = r.mode === 'home' && homeTab && !ctx.A.away && !D.hidden && !D.querySelector('.bw3-full');
        /* the membrane settles back on its own even when nobody flies */
        if (S.st === 'idle') {
            if (a.memU && a.memU.uPushA && a.memU.uPushA.value) { S.wobT += ctx.dt; const w = wobble(S.wob, S.wobT, ctx.reduced); setPush(a, S.wobDir, Math.abs(w) < 0.003 || S.wobT > 2.5 ? 0 : w); }
            if ((S.domT -= ctx.dt) <= 0 && ok && !PD.mode) { S.domT = 0.5; const dm = domMisty(); if (dm) S.dom = dm; }
        }
        if (!ok) { if (S.st !== 'idle') end(ctx, 'abort'); return false; }
        if (S.st === 'idle') {
            if ((PD.mode === 'drive' || PD.mode === 'auto') && !ctx.inRegion && !ctx.awayHome && !regionsBusy()) begin(ctx);
            else return false;
        }
        return true;
    }

    /* ---------- the flight, one frame ---------- */
    function frame(ctx) {
        const a = ctx.a, r = ctx.r, PD = ctx.PD, wand = ctx.wand, dt = ctx.dt, k = clamp(+ctx.k || 0, 0, 1), still = !!ctx.reduced;
        if (!wand) return;
        basis(a); S.t += dt;
        const cur = curRegion();
        /* someone else took us somewhere (a tap on a place, the World map): she was not flown there, so she is not shown there */
        if (S.st !== 'warp' && S.st !== 'inside' && (cur !== 'hub' || regionsBusy())) { end(ctx, 'tapped-away'); return; }
        if ((S.st === 'inside' || S.st === 'warp') && S.entered && (cur !== S.flew && !regionsBusy())) { end(ctx, 'left'); return; }
        if (S.st === 'inside' && cur === 'hub') { end(ctx, 'left'); return; }

        const mode = PD.mode || 'drive', vx = PD.vx || 0, vy = PD.vy || 0, mag = Math.min(1, Math.hypot(vx, vy)), steering = mode === 'drive' && mag > 0.05;
        if (mode === 'drive') S.idle = steering ? 0 : S.idle + dt; else S.idle = 0;
        if (mode === 'drive' && S.idle > K.IDLE_HOME && (S.st === 'free' || S.st === 'exit')) { padMode(ctx, 'home'); note('idle home'); }
        const camFree = !r.fly;

        if (S.st === 'warp') { warpFrame(ctx, k); return; }
        if (S.st === 'inside') { insideFrame(ctx, k, mode, vx, vy, mag, still); return; }

        /* where she wants to go, in world space (length 0..1) */
        const homeP = homePoint(a);
        V.want.set(0, 0, 0);
        if (mode === 'drive') V.want.addScaledVector(V.rt, vx).addScaledVector(V.up, vy);
        else if (mode === 'home') { V.a.subVectors(homeP, S.p); const d = V.a.length(); if (d > 1e-4) V.want.copy(V.a).multiplyScalar(Math.min(1, d / 0.9) / d); }
        else if (mode === 'auto') tourWant(ctx, k);

        const off = V.a.subVectors(S.p, V.c).length();
        if (S.st === 'exit') {
            /* inside her bubble: free to move a little, then the membrane tents out around her and slows her, then lets her through */
            const bodyR = S.hs * 0.34, rin = Math.max(0.05, K.CR - bodyR), smax = clamp(1.1 * bodyR, 0.45, 0.9 * K.CR);
            const dirO = off > 1e-4 ? V.b.copy(V.a).divideScalar(off) : V.b.copy(V.want).normalize();
            let s = stretchOf(off, rin, smax);
            const outward = V.want.dot(dirO) > 0.05;
            const sp = speed(k, 'exit') * (mode === 'home' ? 1.2 : 1) * (outward ? resist(s, smax) : 1);
            S.v.lerp(V.want.clone().multiplyScalar(sp), Math.min(1, dt * 6));
            S.p.addScaledVector(S.v, dt);
            /* let go mid-push: the stretched membrane pulls her back in */
            if (!outward && s > 0) S.p.addScaledVector(dirO, -Math.min(s, s * dt * 3.5));
            const off2 = V.a.subVectors(S.p, V.c).length(); s = stretchOf(off2, rin, smax);
            if (off2 > 1e-4) S.pushDir.copy(V.a).divideScalar(off2);
            if (s >= smax * 0.985 && outward && mode !== 'home') {
                S.st = 'free'; S.wob = s; S.wobT = 0; S.wobDir.copy(S.pushDir); S.v.addScaledVector(S.pushDir, 0.6);
                V.b.copy(V.c).addScaledVector(S.pushDir, K.CR + s * 0.9); ctx.burst(V.b, 6 + Math.round(10 * k), 0.3 + 0.3 * k); note('through');
                setPush(a, S.wobDir, s);
            } else setPush(a, S.pushDir, s);
            /* camera stays on her cell while she struggles out */
            if (camFree) r.target.lerp(V.c, 1 - Math.exp(-dt * 3));
            if (mode === 'home' && S.p.distanceTo(homeP) < 0.1 && r.target.distanceTo(V.c) < 0.08) { r.dist += (S.dHome - r.dist) * Math.min(1, dt * 4); end(ctx, 'home'); return; }
            if (mode === 'home') r.dist += (S.dHome - r.dist) * Math.min(1, dt * 2);
            S.ap = 0; S.near = null;
        } else {
            /* free in the world */
            S.wobT += dt; setPush(a, S.wobDir, wobble(S.wob, S.wobT, still));
            if (mode === 'drive' && mag > 0.1) magnet(a, vx, vy, mag);
            const nb = nearest(a); S.near = nb; S.ap = nb ? approach(nb.d) : 0;
            const sp = speed(k, 'out') * (1 - 0.55 * S.ap) * (mode === 'auto' && k < 0.4 ? 0.5 : 1) * (mode === 'home' ? 1.25 : 1);
            S.v.lerp(V.b.copy(V.want).multiplyScalar(sp), Math.min(1, dt * 3.2));
            S.p.addScaledVector(S.v, dt);
            const L = S.p.length(); if (L > K.ROAM) { S.p.multiplyScalar(K.ROAM / L); const out = S.v.dot(V.b.copy(S.p).normalize()); if (out > 0) S.v.addScaledVector(V.b, -out); }
            /* back into her own cell */
            const offN = V.a.subVectors(S.p, V.c).length();
            if (offN < K.CR * 0.92 && (mode === 'home' || V.want.dot(V.a) < 0)) { S.st = 'exit'; S.wob = -0.25; S.wobT = 0; S.wobDir.copy(V.a).normalize(); note('back in'); }
            /* at a place's atmosphere: the tap's own warp takes her in */
            if (nb && nb.d < K.ENTRY && mode === 'drive' && !regionsBusy()) { startWarp(ctx, nb); return; }
            /* the camera follows her, easing in as she nears a place (and giving back your zoom when she leaves it) */
            if (camFree) {
                if (mode === 'home') { r.target.lerp(V.c, 1 - Math.exp(-dt * 1.6)); r.dist += (S.dHome - r.dist) * Math.min(1, dt * 1.6); }
                else {
                    V.b.copy(S.p).addScaledVector(S.v, 0.3);
                    r.target.lerp(V.b, 1 - Math.exp(-dt * 2.4));
                    S.dolly += (S.ap - S.dolly) * Math.min(1, dt * 2.2);
                    if (S.dolly < 0.004 && Math.abs(r.dist - S.d0) > 0.001 && !S.dollyOut) S.d0 = r.dist; /* a pinch while flying is yours */
                    S.dollyOut = S.dolly > 0.004;
                    if (S.dollyOut) r.dist = S.d0 + (Math.max(3.4, S.d0 * 0.42) - S.d0) * S.dolly;
                }
                if (mag > 0.05 || mode !== 'drive') r.idle = 0;
            }
        }
        /* her size: constant on screen; smaller only near a place */
        S.ks += (sizeK(S.ap) - S.ks) * Math.min(1, dt * 5);
        S.hs = S.base * S.ks / pxPerUnit(a, S.p);
        place(ctx, k, still, 1);
        bubbleFollow(a);
        trail(ctx, k, mode === 'drive' ? mag : 0.6);
    }
    /* where her cell has her when she is home: the DOM Misty's spot, at the cell's depth */
    function homePoint(a) {
        const dm = S.dom; if (!dm) return V.c;
        if (!S.hp) S.hp = new a.THREE.Vector3();
        const cs = toScreen(a, V.c, {}), dx = cs.x - S.cell0.x, dy = cs.y - S.cell0.y;
        return fromScreen(a, dm.cx + dx, dm.cy + dy, V.c, S.hp);
    }
    function nearest(a) {
        let best = null;
        (a.regions || []).forEach(g => { if (!g || !g.pos) return; const d = S.p.distanceTo(g.pos); if (!best || d < best.d) best = { id: g.id, d, pos: g.pos }; });
        return best;
    }
    /* the stick points at a place you can see: bend her path toward it (depth included) */
    function magnet(a, vx, vy, mag) {
        const me = toScreen(a, S.p, {}), cands = [];
        (a.regions || []).forEach(g => {
            const s = toScreen(a, g.pos, {}); V.b.copy(g.pos).applyMatrix4(a.camera.matrixWorldInverse);
            cands.push({ id: g.id, sx: s.x - me.x, sy: me.y - s.y, front: V.b.z < 0 && s.z < 1, pos: g.pos });
        });
        const hit = aimAt(vx, vy, cands, K.MAG_DEG); if (!hit) return;
        const g = cands.find(c => c.id === hit.id); V.b.subVectors(g.pos, S.p); const d = V.b.length(); if (d < 1e-3) return;
        V.b.divideScalar(d); const w = 0.85 * hit.w;
        V.want.multiplyScalar(1 / mag).multiplyScalar(1 - w).addScaledVector(V.b, w).normalize().multiplyScalar(mag);
    }
    /* autopilot: a slow tour from place to place, stopping in front of each one (never going in) */
    function tourWant(ctx, k) {
        const a = ctx.a, regs = a.regions || []; if (!regs.length) return;
        if (S.wp < 0) { let bi = 0, bd = 1e9; regs.forEach((g, i) => { const d = S.p.distanceTo(g.pos); if (d < bd) { bd = d; bi = i; } }); S.wp = bi; }
        const g = regs[S.wp % regs.length]; V.b.subVectors(V.c, g.pos).normalize();
        V.a.copy(g.pos).addScaledVector(V.b, 2.9).addScaledVector(V.up, 0.4);
        V.a.sub(S.p); const d = V.a.length();
        if (d < 0.5) {
            if (S.wpWait <= 0) { S.wpWait = 2.2 + 1.5 * (1 - k); V.b.copy(S.p).addScaledVector(V.up, -0.2 * S.hs); ctx.burst(V.b, Math.round(5 + 15 * k), 0.3 + 0.4 * k); ring(ctx, k); }
            S.wpWait -= ctx.dt; if (S.wpWait <= 0.01) { S.wp = (S.wp + 1) % regs.length; S.wpWait = 0; }
            return;
        }
        V.want.copy(V.a).multiplyScalar(Math.min(1, d / 1.5) * (k < 0.4 ? 0.6 : 0.85) / d);
        if (!ctx.reduced) V.want.addScaledVector(V.up, Math.sin(S.t * 1.3) * 0.15);
    }
    function ring(ctx, k) {
        const A = ctx.A; if (!A || !A.ring || ctx.reduced) return;
        A.ring.position.copy(S.p); A.ring.material.color.set(A.tier === 'weak' ? '#c98a92' : '#a8ffd8'); A.ringT = 0; A.ring.visible = true;
    }
    function trail(ctx, k, m) {
        if (m < 0.08 || S.v.lengthSq() < 0.04) return;
        if ((S.trail -= ctx.dt) > 0) return;
        S.trail = 0.14 / (0.5 + k);
        const A = ctx.A, pm = A && A.pts && A.pts.material;
        if (pm) { pm.color.set(A.tier === 'weak' || A.tier === 'tired' ? '#9aa3b2' : '#9fe3ff'); pm.opacity = 0.45 + 0.4 * k; }
        V.b.copy(S.p).addScaledVector(V.up, -0.25 * S.hs); ctx.burst(V.b, 1 + Math.round(2 * k), 0.12 * Math.max(0.3, S.hs));
    }
    /* draw her: position, size, tilt, energy tint (the face comes from the DOM Misty's art: she smiles only when full) */
    function place(ctx, k, still, alpha) {
        const wand = ctx.wand; if (!wand.material.map) alpha = 0; /* never a blank square before her art is ready */
        const bob = still ? 0 : Math.sin(S.t * 1.6) * 0.04 * S.hs, droop = (1 - k) * 0.08 * S.hs;
        wand.position.copy(S.p).addScaledVector(V.up, bob - droop);
        const br = still ? 1 : 1 + Math.sin(S.t * 2.2) * 0.02;
        wand.scale.set(S.hs * 260 / 310 * br, S.hs * br, 1);
        const lean = still ? 0 : clamp(-S.v.dot(V.rt) * 0.06, -0.3, 0.3);
        wand.material.rotation = (still ? 0 : Math.sin(S.t * 0.9) * 0.08) - (1 - k) * 0.18 + lean;
        if (wand.material.color) wand.material.color.setRGB(1, 0.78 + 0.22 * k, 0.78 + 0.22 * k);
        wand.material.opacity = (0.55 + 0.43 * k) * clamp(alpha, 0, 1);
        wand.visible = wand.material.opacity > 0.01;
    }
    /* the DOM parts of her cell (wall lines, name) follow the 3D cell when the camera leaves it */
    function bubbleFollow(a) {
        const b = D.getElementById('spBubble'); if (!b) return;
        const cs = toScreen(a, V.c, {}), dx = Math.round(cs.x - S.cell0.x), dy = Math.round(cs.y - S.cell0.y);
        const roam = Math.abs(dx) + Math.abs(dy) > 2;
        b.style.setProperty('--mf-bx', dx + 'px'); b.style.setProperty('--mf-by', dy + 'px');
        if (H.classList.contains('mf-roam') !== roam) H.classList.toggle('mf-roam', roam);
    }

    /* ---------- into a place ---------- */
    function startWarp(ctx, nb) {
        const a = w3(); if (!a || !a.flyTo) return;
        S.st = 'warp'; S.flew = norm(nb.id); S.warpT = 0; S.entered = 0; S.warpFrom.copy(S.p); S.warpTo.copy(nb.pos); S.v.set(0, 0, 0);
        setPush(ctx.a, S.wobDir, 0); hold(false); note('warp ' + nb.id);
        try { a.flyTo(nb.id); } catch (e) { }
        H.classList.add('mf-in');
    }
    function warpFrame(ctx, k) {
        const a = ctx.a; S.warpT += ctx.dt;
        const cur = curRegion(), busy = regionsBusy();
        if (cur === S.flew) S.entered = 1;
        /* she dives in ahead of the camera, getting smaller, and fades */
        const q = Math.min(1, S.warpT / 0.55);
        S.p.lerpVectors(S.warpFrom, S.warpTo, q * 0.8);
        S.hs = Math.max(1e-3, S.base * S.ks * (1 - 0.7 * q) / pxPerUnit(a, S.p));
        place(ctx, k, ctx.reduced, 1 - q);
        if (S.entered && !busy) { enterInside(ctx); return; }
        if (S.warpT > 9) end(ctx, 'warp-timeout');
    }
    function enterInside(ctx) {
        const a = ctx.a, r = ctx.r; basis(a);
        const reg = (a.regions || []).find(g => norm(g.id) === S.flew);
        if (reg) S.inC.copy(reg.pos).multiplyScalar(0.92); else S.inC.copy(r.target);
        /* in front of you, a little below the middle, about as big as she was at the door */
        S.p.copy(r.target).addScaledVector(V.fw, Math.min(1.1, r.dist * 0.42)).addScaledVector(V.up, -0.15);
        S.inHs = S.base * K.MIN_K / pxPerUnit(a, S.p); S.hs = S.inHs; S.fade = 0; S.v.set(0, 0, 0); S.wp = -1;
        S.st = 'inside'; hold(false); classes(true, false, true); note('inside ' + S.flew);
    }
    function insideFrame(ctx, k, mode, vx, vy, mag, still) {
        const a = ctx.a, r = ctx.r, dt = ctx.dt, zs = clamp(r.dist / 2.6, 1, 8), inR = Math.max(K.IN_R, (r.maxD || 10) * 0.32);
        /* the place opens on its widest view (body-world-regions.js): her pace and reach scale with how far out you are */
        if (mode === 'home') { padMode(ctx, 'drive'); mode = 'drive'; } /* her cell is far away: no flying home from here (World map takes you both back) */
        V.want.set(0, 0, 0);
        if (mode === 'drive') V.want.addScaledVector(V.rt, vx).addScaledVector(V.up, vy);
        else { /* autopilot inside: a slow drift around the place */
            const t = S.t * (k < 0.4 ? 0.18 : 0.3);
            V.a.copy(S.inC).addScaledVector(V.rt, Math.sin(t) * 1.4 * zs).addScaledVector(V.up, Math.sin(t * 1.4 + 1) * 0.6 * zs).addScaledVector(V.fw, Math.cos(t) * 0.8 * zs).sub(S.p);
            const d = V.a.length(); if (d > 1e-3) V.want.copy(V.a).multiplyScalar(Math.min(1, d / zs) * 0.6 / d);
        }
        S.v.lerp(V.b.copy(V.want).multiplyScalar(speed(k, 'in') * zs), Math.min(1, dt * 4));
        S.p.addScaledVector(S.v, dt);
        V.a.subVectors(S.p, S.inC); const L = V.a.length(); if (L > inR) S.p.copy(S.inC).addScaledVector(V.a, inR / L);
        /* the camera keeps her in view once the place has settled (its own hero turn first) */
        const WH = W.LowiWorldHome, heroBusy = !!(WH && WH.state && WH.state.heroAnim);
        if (!r.fly && !heroBusy && !regionsBusy()) {
            V.b.subVectors(S.p, r.target); const off = V.b.length(), dz = 0.14 * r.dist;
            if (off > dz) r.target.addScaledVector(V.b, (1 - dz / off) * (1 - Math.exp(-dt * 2)));
            if (mag > 0.05) r.idle = 0;
        }
        S.fade = Math.min(1, S.fade + dt * 2.5);
        S.hs = S.base * K.MIN_K / pxPerUnit(a, S.p); /* the size she had at the door, whatever the zoom */
        place(ctx, k, still, S.fade);
        trail(ctx, k, mode === 'drive' ? mag : 0.5);
    }

    W.addEventListener('lowi:world-warp', e => { const d = e && e.detail; if (d && d.phase === 'arrive' && S.st === 'warp' && norm(d.id) === S.flew) S.entered = 1; });
    W.LowiMistyFlight = {
        wants, frame, core,
        state: () => ({ st: S.st, flew: S.flew, ap: +S.ap.toFixed(3), near: S.near ? S.near.id : null, nearD: S.near ? +S.near.d.toFixed(2) : null, px: Math.round(S.base), ks: +S.ks.toFixed(3),
            hs: +S.hs.toFixed(3), push: S.mem && w3() && w3().memU && w3().memU.uPushA ? +w3().memU.uPushA.value.toFixed(3) : 0, p: S.p ? [+S.p.x.toFixed(2), +S.p.y.toFixed(2), +S.p.z.toFixed(2)] : null, log: S.log.slice(-12) })
    };
})();
