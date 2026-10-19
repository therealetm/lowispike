/* LOWiSPIKE · Ant-Man POV on the strings (Oct 19, 2026, Emmanuel, call)
   "She gets closer to these strings... zoom into the strings, so that now you can almost see from the string's perspective. Almost
   like Ant-Man, getting smaller to the cellular perspective, and all the world around it is bigger." "It's not just a zoom. It's a
   shift in POV."

   Out in the spirit world, on autopilot, Misty rides the strings (the threads between the bubble galaxies, galaxy-bubbles.js) like a
   fish carried by a current. While she rides one, the camera shrinks down with her: it comes in from the galaxy distance (~64+) to
   a small share of her home distance (SP.D x d0, about 1/20th), drops in behind her on the string and looks the way the current
   carries her. Her size on screen never changes (misty-flight.js keeps her a fixed number of pixels, so her world size shrinks with
   the camera: she is Ant-Man), so the world grows around her: the string she rides becomes a huge glass cable running away under
   her (the threads are 1 px lines, so a tube is drawn for the one she rides, only while the POV is on), and the bubble galaxies
   ahead and beside her loom. When she leaves the string (a gap with no string, a bubble she pushes into, steering, the way home),
   the camera grows back out to the normal galaxy view in one continuous move. No loading screen, no page switch: the same camera.

   How it moves: a critically damped spring (no overshoot, interruptible: a new string before it has grown back out simply turns it
   round), interpolated on a log scale so the shrinking reads as one even move. A short drop off the string (SP.GRACE) never flickers
   it. Her pace along the string stays her galaxy pace (misty-galaxy.js speed() uses the galaxy distance, G.nd, not this camera), so a
   trip takes as long as before. The camera lock on her (target) and the turn behind her blend in with the same spring; a drag on the
   screen while riding is a look around and the turn waits for it.

   Cheap: one TubeGeometry per string she rides (built once, the previous one fades and is disposed), one simple additive shader, no
   lights, no shadows; per frame a few vector ops and a walk over ~40 points. Reduce Motion: never (and the currents are off then too). */
(function () {
    const W = typeof window !== 'undefined' ? window : null;
    const SP = {
        D: 0.25,       /* POV camera distance, x her galaxy home distance (gxD0 ~14 in the app -> ~3.5, vs ~64-100 out in the galaxy) */
        W: 2.5,        /* spring rate: about 2 s in, the same out (a 20x change of scale: slower would drag, faster rushes) */
        GRACE: 0.8,    /* seconds off the string before the camera grows back out */
        HOLD: 18,      /* while she stays this close to the string she rode (world units, ~ the current's capture reach) the POV holds:
                          as she settles onto a string the capture flickers on and off, and the camera must not zoom in and out with it */
        HOLD_T: 3,     /* ...but only for this long without the current holding her: a stop at a bubble at the string's end is leaving it */
        LIFT: 0.3,     /* camera a little above her on the string (radians) */
        R_K: 5,        /* the string's radius in her (POV) sizes: huge next to her */
        SEAT: 0.55,    /* she rides just above its ridge (in her sizes) */
        LEAD: 1.6,     /* the camera looks a little ahead of her, so the string runs on into the picture */
        TURN: 1.6,     /* how fast the camera swings in behind her (1/s, x the POV) */
        LOOK: 2.5      /* after a drag on the screen, the swing waits this long */
    };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    function wantOn(i) { return !!(i && i.gx && i.mode === 'auto' && i.riding >= 0 && !(i.inside >= 0) && !i.reduced); }
    /* holding: still on autopilot, still out in the galaxy, still close to the string she was riding */
    function holdOn(i) { return !!(i && i.gx && i.mode === 'auto' && i.si >= 0 && !(i.inside >= 0) && !i.reduced && i.near < SP.HOLD); }
    /* grace: a short drop off the string keeps it; Reduce Motion never wants it */
    function gate(g, i) {
        g = g || { want: 0, off: 0, free: 0 };
        if (i.reduced) return { want: 0, off: 0, free: 0 };
        if (i.on) return { want: 1, off: 0, free: 0 };
        const free = (g.free || 0) + (i.dt || 0);
        if (i.hold && g.want && free < SP.HOLD_T) return { want: 1, off: 0, free };
        const off = g.off + (i.dt || 0);
        return { want: g.want && off < SP.GRACE ? 1 : 0, off, free };
    }
    /* critically damped spring, solved exactly for the frame (no overshoot from rest, continuous velocity when it turns round) */
    function spring(s, to, dt, reduced) {
        if (reduced) return { k: 0, v: 0 };
        const w = SP.W, x0 = s.k - to, v0 = s.v, e = Math.exp(-w * dt), c = v0 + w * x0;
        let k = to + (x0 + c * dt) * e, v = (v0 - w * c * dt) * e;
        if (k < 0) { k = 0; v = 0; } else if (k > 1) { k = 1; v = 0; }
        if (Math.abs(k - to) < 1e-4 && Math.abs(v) < 1e-3) { k = to; v = 0; }
        return { k, v };
    }
    function povDist(nominal, d0, k) {
        if (k <= 0) return nominal;
        const tiny = Math.max(1, (d0 || 6.5) * SP.D);
        return Math.exp(Math.log(nominal) + (Math.log(tiny) - Math.log(nominal)) * clamp(k, 0, 1));
    }
    /* the ridge side of the string: world up made perpendicular to the string (fallback for a string that runs straight up) */
    function seatUp(f, up, alt) {
        const pick = u => { const d = u[0] * f[0] + u[1] * f[1] + u[2] * f[2]; return [u[0] - f[0] * d, u[1] - f[1] * d, u[2] - f[2] * d]; };
        let n = pick(up || [0, 1, 0]), l = Math.hypot(n[0], n[1], n[2]);
        if (l < 0.2) { n = pick(alt || [0, 0, 1]); l = Math.hypot(n[0], n[1], n[2]); }
        if (l < 1e-6) { n = pick([1, 0, 0]); l = Math.hypot(n[0], n[1], n[2]); }
        return [n[0] / l, n[1] / l, n[2] / l];
    }
    /* the rig's angles for a camera behind her (against the flow), lifted towards the ridge side */
    function camAngles(f, n, pMax) {
        const c = Math.cos(SP.LIFT), s = Math.sin(SP.LIFT);
        let o = [-f[0] * c + n[0] * s, -f[1] * c + n[1] * s, -f[2] * c + n[2] * s]; const l = Math.hypot(o[0], o[1], o[2]) || 1; o = o.map(v => v / l);
        return { yaw: Math.atan2(o[0], o[2]), pitch: clamp(Math.asin(clamp(o[1], -1, 1)), -(pMax || 1.35), pMax || 1.35) };
    }
    function nearAngle(from, to) { let d = (to - from) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return from + d; }
    function tubeR(hs) { return Math.max(0.05, hs * SP.R_K); }
    function seatOffset(R, hs) { return R + hs * SP.SEAT; }
    /* closest point on a flow-ordered polyline (flat xyz array), with the flow direction there and how far along (0..1) */
    function nearest(A, px, py, pz) {
        const n = A ? A.length / 3 : 0; if (n < 2) return null;
        let best = 1e18, out = null, total = 0; const lens = [];
        for (let k = 0; k < n - 1; k++) { const l = Math.hypot(A[k * 3 + 3] - A[k * 3], A[k * 3 + 4] - A[k * 3 + 1], A[k * 3 + 5] - A[k * 3 + 2]); lens.push(l); total += l; }
        let run = 0;
        for (let k = 0; k < n - 1; k++) {
            const ax = A[k * 3], ay = A[k * 3 + 1], az = A[k * 3 + 2], dx = A[k * 3 + 3] - ax, dy = A[k * 3 + 4] - ay, dz = A[k * 3 + 5] - az, l = lens[k];
            const t = l > 1e-9 ? clamp(((px - ax) * dx + (py - ay) * dy + (pz - az) * dz) / (l * l), 0, 1) : 0;
            const cx = ax + dx * t, cy = ay + dy * t, cz = az + dz * t, d = (px - cx) ** 2 + (py - cy) ** 2 + (pz - cz) ** 2;
            if (d < best) { best = d; const il = l > 1e-9 ? 1 / l : 0; out = { cx, cy, cz, tx: dx * il, ty: dy * il, tz: dz * il, d: Math.sqrt(d), u: total > 0 ? (run + l * t) / total : 0 }; }
            run += l;
        }
        out.len = total; return out;
    }
    const core = { SP, wantOn, holdOn, gate, spring, povDist, seatUp, camAngles, nearAngle, tubeR, seatOffset, nearest };
    if (typeof module !== 'undefined' && module.exports) { module.exports = core; if (!W) return; }
    if (!W) return;

    /* ---------------- browser: the camera and the string she rides ---------------- */
    const B = { near: 1e9, g: null, gate: null, s: { k: 0, v: 0 }, sgn: 0, si: -1, tube: null, old: [], off: null, hold: 0, spd: 0, t: 0, log: [], last: null };
    function note(s) { B.log.push(Math.round(performance.now()) + ' ' + s); if (B.log.length > 12) B.log.shift(); }
    function cosmos(a) {
        if (B.g && B.g.parent) return B.g;
        B.g = a && a.scene && a.scene.getObjectByName ? a.scene.getObjectByName('cosmos') || null : null; return B.g;
    }
    const TUBE_V = 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = mv.xyz; vN = normalMatrix * normal; gl_Position = projectionMatrix * mv; }';
    const TUBE_F = 'uniform vec3 uC; uniform float uO; uniform float uT; uniform float uLen; uniform float uPer; uniform float uFa; uniform float uFb; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float fr = 1.0 - abs(dot(normalize(vN), normalize(-vV))); fr = fr * fr; float s = vUv.x * uLen; float b = smoothstep(0.82, 1.0, 0.5 + 0.5 * sin((s - uT) * 6.2832 / uPer)); float st = pow(abs(sin(vUv.y * 6.2832 * 5.0)), 24.0); float ends = smoothstep(0.0, 0.015, vUv.x) * (1.0 - smoothstep(0.985, 1.0, vUv.x)); float far = 1.0 - smoothstep(uFa, uFb, -vV.z); float a = uO * ends * far * (0.16 + fr * 0.8 + b * 0.32 + st * 0.18); gl_FragColor = vec4(uC * (0.55 + fr * 0.6 + b * 0.5), a); }';
    /* the string she rides, as a huge glass cable: built once per string, in the galaxy's own (slowly turning) space */
    function tubeFor(a, g, si, hsPov) {
        if (B.tube && B.tube.si === si) return B.tube; /* cached per string */
        const T = a.THREE, th = g.getObjectByName('cosmos-threads'), pa = th && th.userData && th.userData.paths && th.userData.paths[si];
        if (!T || !pa || !pa.arr || pa.arr.length < 6) return null;
        if (B.tube) { B.old.push(B.tube); if (B.old.length > 2) drop(B.old.shift()); }
        const A = pa.arr, n = A.length / 3, flat = [], pts = [];
        for (let k = 0; k < n; k++) { const j = pa.dir < 0 ? n - 1 - k : k; flat.push(A[j * 3], A[j * 3 + 1], A[j * 3 + 2]); pts.push(new T.Vector3(A[j * 3], A[j * 3 + 1], A[j * 3 + 2])); }
        const R = tubeR(hsPov), curve = new T.CatmullRomCurve3(pts);
        const geo = new T.TubeGeometry(curve, Math.min(220, n * 5), R, 12, false);
        const col = pa.col ? pa.col.clone() : new T.Color(0.75, 0.9, 1);
        let len = 0; for (let k = 0; k < n - 1; k++) len += pts[k].distanceTo(pts[k + 1]);
        const mat = new T.ShaderMaterial({ vertexShader: TUBE_V, fragmentShader: TUBE_F, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
            uniforms: { uC: { value: col }, uO: { value: 0 }, uT: { value: 0 }, uLen: { value: len }, uPer: { value: R * 3.2 }, uFa: { value: R * 40 }, uFb: { value: R * 130 } } });
        const m = new T.Mesh(geo, mat); m.name = 'string-pov-tube'; m.renderOrder = 1; m.userData.lwKeep = true; g.add(m);
        note('tube ' + si + ' R ' + R.toFixed(2) + ' len ' + Math.round(len));
        return { si, m, R, hs: hsPov, flat, op: 0 };
    }
    function drop(t) { if (!t) return; try { if (t.m.parent) t.m.parent.remove(t.m); t.m.geometry.dispose(); t.m.material.dispose(); } catch (e) { } }
    function fadeOld(dt) {
        for (let i = B.old.length - 1; i >= 0; i--) { const t = B.old[i]; t.op = Math.max(0, t.op - dt * 1.8); t.m.material.uniforms.uO.value = t.op; if (t.op <= 0) { drop(t); B.old.splice(i, 1); } }
    }
    function toLocal(p, th) { const c = Math.cos(th), s = Math.sin(th); return [c * p.x - s * p.z, p.y, s * p.x + c * p.z]; }
    function toWorldV(v, th) { const c = Math.cos(th), s = Math.sin(th); return [c * v[0] + s * v[2], v[1], -s * v[0] + c * v[2]]; }

    /* called by misty-galaxy.js cam() every frame out in the galaxy with the galaxy's own camera distance; returns the distance to use */
    function cam(ctx, S, nominal) {
        const r = ctx.r, a = ctx.a, dt = Math.min(0.05, Math.max(0, ctx.dt || 0.016)), reduced = !!ctx.reduced;
        const GB = W.LowiGalaxyBubbles, st = GB && GB.state ? GB.state() : null;
        const mode = (ctx.PD && ctx.PD.mode) || ctx.mode || '';
        const on = wantOn({ gx: !!S.gx, mode, riding: st ? st.riding : -1, inside: st ? st.inside : -1, reduced });
        if (on) B.si = st.riding;
        const hold = holdOn({ gx: !!S.gx, mode, si: B.si, inside: st ? st.inside : -1, reduced, near: B.near });
        B.gate = gate(B.gate, { on, hold, reduced, dt });
        const k0 = B.s.k; B.s = spring(B.s, B.gate.want, dt, reduced);
        const k = B.s.k; B.t += dt;
        if ((k0 < 0.01) !== (k < 0.01)) note(k >= 0.01 ? 'in ' + B.si : 'out');
        fadeOld(dt);
        const g = a && cosmos(a);
        if (k < 0.002 || !g || B.si < 0) { if (B.tube) { B.old.push(B.tube); B.tube = null; } B.last = null; B.near = 1e9; return nominal; }
        const d = povDist(nominal, S.gxD0 || S.d0, k);
        /* her size scales with the camera distance (fixed on screen): her size once the camera is all the way in */
        const cd = a.camera && a.camera.position ? a.camera.position.distanceTo(S.p) : r.dist;
        const hsPov = Math.max(0.01, (S.hs || 0.1) * povDist(nominal, S.gxD0 || S.d0, 1) / Math.max(0.5, cd || r.dist || d));
        const tb = tubeFor(a, g, B.si, hsPov); if (tb && tb !== B.tube) B.sgn = 0; B.tube = tb || B.tube;
        const th = g.rotation.y, lp = toLocal(S.p, th), h = tb && nearest(tb.flat, lp[0], lp[1], lp[2]);
        if (tb && h) {
            /* the way she is going along it: with the flow, or up it against the flow (the Oct 19 string tour also rides strings
               upstream), read from her velocity with a little hysteresis so the camera never flips on a wobble */
            const fW0 = toWorldV([h.tx, h.ty, h.tz], g.rotation.y), va = S.v ? S.v.x * fW0[0] + S.v.y * fW0[1] + S.v.z * fW0[2] : 0;
            if (B.sgn === 0 || (B.sgn > 0 && va < -0.25) || (B.sgn < 0 && va > 0.25)) B.sgn = va < 0 ? -1 : 1;
            const fL = [h.tx * B.sgn, h.ty * B.sgn, h.tz * B.sgn], nL = seatUp(fL, [0, 1, 0]), so = seatOffset(tb.R, tb.hs);
            /* the cable sits just under her ridge: shifted down by its radius where she is (smoothed, so it never jumps sideways) */
            const want = [-nL[0] * so, -nL[1] * so, -nL[2] * so];
            if (!B.off) B.off = want.slice(); else for (let i = 0; i < 3; i++) B.off[i] += (want[i] - B.off[i]) * Math.min(1, dt * 3);
            tb.m.position.set(B.off[0], B.off[1], B.off[2]);
            tb.op = k; const u = tb.m.material.uniforms; u.uO.value = 0.85 * k * k;
            /* the glow bands drift with the current a little slower than her: the water carries her, the string slides by gently */
            const fW = toWorldV(fL, th), nW = toWorldV(nL, th);
            B.spd += (va * 0.65 - B.spd) * Math.min(1, dt * 2); u.uT.value += B.spd * dt; /* uv runs with the flow */
            /* lock on her, a little ahead along the string */
            const lead = tb.hs * SP.LEAD, tx = S.p.x + fW[0] * lead, ty = S.p.y + fW[1] * lead, tz = S.p.z + fW[2] * lead;
            r.target.set(r.target.x + (tx - r.target.x) * k, r.target.y + (ty - r.target.y) * k, r.target.z + (tz - r.target.z) * k);
            /* swing in behind her; a drag on the screen is a look around and the swing waits for it */
            if (Math.abs(r.vy || 0) + Math.abs(r.vp || 0) > 0.03) B.hold = SP.LOOK; else B.hold = Math.max(0, B.hold - dt);
            if (B.hold <= 0) {
                const an = camAngles(fW, nW, r.pMax || 1.35), rate = Math.min(1, dt * SP.TURN * k);
                r.yaw += (nearAngle(r.yaw, an.yaw) - r.yaw) * rate; r.pitch += (an.pitch - r.pitch) * rate;
            }
            B.near = h.d; B.last = { u: +h.u.toFixed(3), off: +h.d.toFixed(2) };
        }
        /* the spirit world keeps its galaxy look while the camera is in close (body-world-3d-scene.js cosmosStep reads cosmosMin) */
        r.cosmosMin = Math.max(r.cosmosMin || 0, nominal);
        return d;
    }
    /* the galaxy flight is over (home, a reset): straight back, nothing left in the scene */
    function reset(ctx) {
        const was = B.s.k > 0 || B.tube;
        B.s = { k: 0, v: 0 }; B.gate = null; B.si = -1; B.sgn = 0; B.near = 1e9; B.off = null; B.hold = 0; B.spd = 0; B.last = null;
        if (B.tube) { drop(B.tube); B.tube = null; } while (B.old.length) drop(B.old.pop());
        if (was) note('reset');
    }
    W.LowiStringPov = { core, cam, reset,
        state: () => ({ k: +B.s.k.toFixed(3), want: B.gate ? B.gate.want : 0, string: B.si, tube: B.tube ? { si: B.tube.si, R: +B.tube.R.toFixed(3), op: +B.tube.m.material.uniforms.uO.value.toFixed(3) } : null, old: B.old.length, at: B.last, log: B.log.slice(-8) }) };
})();
