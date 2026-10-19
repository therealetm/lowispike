/* LOWiSPIKE misty-bump (Oct 17, 2026, E-man): "The blood cells, you know, that are floating around. Some of them might hit Misty.
   That makes it more entertaining to watch. You know, some of it might hit it, or sometimes like dodge it." And: "when she hits one,
   give her a brief, funny 'dizzy' animation where she misorientates and has to brace herself to steady back up."

   What it does, only while Misty flies free in the bloodstream at Home (misty-flight.js state 'free', not out in the galaxy, not
   inside a world, not while she is slipping out of her own cell or entering a place):
   - real contact: the cells are the scene's own instanced red cells (body-world-3d-scene.js names the mesh 'lowi-rbc' and hands
     over their flow data). A bump needs true 3D contact: her body sphere and the cell's sphere must overlap in world space, read
     from the cell's last drawn matrix, so a cell that only crosses her on screen (in front of her or behind her) never counts.
     No cell is ever spawned, moved into her path or aimed at her.
   - the bump: she is knocked gently away from the cell (a decaying nudge, about a fifth of a world unit when you steer, a little more
     on autopilot), the cell is knocked the other way into a new lane and tumbles, a small puff of light marks the spot. Then the
     dizzy turn: she tips over, sways woozily in a little circle, braces (squashes and tenses) and springs upright. 1.7 s, draw only.
   - no pinball: after a bump there is a 5 s calm in which any other contact is only a soft slide (no knock, no dizzy); a cell that
     just hit her cannot hit again; the nudge always points out of the cell, so nothing can trap her.
   - dodging: on autopilot she sees cells coming (1.2 s ahead, closest approach in 3D) and decides once per encounter whether to
     swerve: 60% of the time (38% when she is tired, 92% during the calm after a bump); the rest she does not see it and may get hit.
     When you steer she never swerves by herself (your control stays yours); a cell that whizzes past close makes her flinch.
   - curiosity: now and then (every 7-12 s) on autopilot she drifts toward a cell passing nearby for a closer look, so watching her
     you see encounters; whether it ends in a swerve or a bump is the same once-per-encounter roll.
   - no XP, no energy, no health, nothing stored: it is only motion. Bounded: one pass over the cells per frame with a cheap
     1-D reject first, a few matrix reads, no allocation, no extra loop or renderer (it runs inside misty-flight's frame).
   Reduced motion: nothing (and Home has no 3D world then anyway). Pure helpers at the top: tests/misty-bump.test.cjs. */
(function () {
    'use strict';
    const W = typeof window !== 'undefined' ? window : globalThis, D = W.document;

    /* ---------- pure helpers ---------- */
    const B = { BODY: 0.3, CELL: 0.36, SENSE: 6, LOOK: 1.5, THREAT: 1.25, NEAR: 1.7, DODGE_P: 0.6, DODGE_P_TIRED: 0.38, DODGE_P_CALM: 0.92,
        TIRED: 0.4, COOL: 5, REHIT: 1.2, FLINCH_GAP: 2.2, FLINCH: 0.6, KICK_MIN: 0.45, KICK_MAX: 1.3, KICK_DRIVE: 0.65, DECAY: 3.2,
        DODGE_ACC: 6, DODGE_MAX: 1.3, DODGE_DECAY: 2.4, DIZZY: 1.7, CELL_KICK: 0.9, CUR_MIN: 7, CUR_MAX: 12, CUR_T: 4.5, CUR_PULL: 10,
        VR: 15, OWN: 1.4 * 1.35, AP_MAX: 0.35 };
    const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
    function smooth(e0, e1, x) { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const len = a => Math.sqrt(dot(a, a));
    /* her body sphere and a cell's sphere, in world units (her size hs is her drawn height at her true depth) */
    const bodyR = hs => B.BODY * Math.max(0, +hs || 0);
    const cellR = s => B.CELL * Math.max(0, +s || 0);
    /* true 3D contact: p = her centre, c = the cell's centre, both world space. n points from the cell to her. */
    function contact(p, c, rM, rC) {
        const d = [p[0] - c[0], p[1] - c[1], p[2] - c[2]], L = len(d), R = rM + rC;
        if (!(L < R)) return { hit: false, d: L, pen: 0, n: null };
        const n = L > 1e-6 ? [d[0] / L, d[1] / L, d[2] / L] : [0, 1, 0];
        return { hit: true, d: L, pen: R - L, n };
    }
    /* closest approach of a cell relative to her within `look` seconds. r = cell - her, w = cell velocity - her velocity */
    function closest(r, w, look) {
        const ww = dot(w, w);
        const t = ww > 1e-9 ? clamp(-dot(r, w) / ww, 0, look) : 0;
        const m = [r[0] + w[0] * t, r[1] + w[1] * t, r[2] + w[2] * t];
        return { t, miss: len(m), at: m };
    }
    /* is it a threat: it will come within reach of her body in the next LOOK seconds and is getting closer */
    function threat(r, w, rM, rC, look) {
        if (dot(r, w) >= 0) return null;
        const c = closest(r, w, look == null ? B.LOOK : look);
        return c.t > 0 && c.t < (look == null ? B.LOOK : look) && c.miss < (rM + rC) * B.THREAT ? c : null;
    }
    /* the once-per-encounter roll. Only autopilot ever swerves by itself; never perfect. u = a random 0..1 */
    function dodgeChance(mode, k, calm) {
        if (mode !== 'auto') return 0;
        if (calm) return B.DODGE_P_CALM;
        return (+k || 0) < B.TIRED ? B.DODGE_P_TIRED : B.DODGE_P;
    }
    const dodges = (u, mode, k, calm) => (+u || 0) < dodgeChance(mode, k, calm);
    /* which way to swerve: away from where the cell will be at closest approach, across its path (never back into it) */
    function swerveDir(c, w) {
        let s = [-c.at[0], -c.at[1], -c.at[2]];
        const ww = dot(w, w);
        if (ww > 1e-9) { const k = dot(s, w) / ww; s = [s[0] - w[0] * k, s[1] - w[1] * k, s[2] - w[2] * k]; }
        let L = len(s);
        if (L < 1e-4) { s = Math.abs(w[1]) < 0.9 * Math.sqrt(ww || 1) ? [0, 1, 0] : [0, 0, 1]; if (ww > 1e-9) { const k = dot(s, w) / ww; s = [s[0] - w[0] * k, s[1] - w[1] * k, s[2] - w[2] * k]; } L = len(s) || 1; }
        return [s[0] / L, s[1] / L, s[2] / L];
    }
    /* how hard the bump knocks her: gentle, scaled by how fast they closed; softer while you steer. vm, vc velocities, n cell->her */
    function knock(vm, vc, n, mode) {
        const closing = Math.max(0, -dot([vm[0] - vc[0], vm[1] - vc[1], vm[2] - vc[2]], n));
        const raw = clamp(B.KICK_MIN + 0.6 * closing, B.KICK_MIN, B.KICK_MAX);
        return { kick: raw * (mode === 'drive' ? B.KICK_DRIVE : 1), strength: clamp((raw - B.KICK_MIN) / (B.KICK_MAX - B.KICK_MIN), 0, 1) };
    }
    /* total drift a decaying nudge adds (integral of kick * e^(-DECAY t)) */
    const nudgeDist = kick => (+kick || 0) / B.DECAY;
    /* the dizzy turn, t seconds after the bump. amp 0.6..1, dir +-1 (which way she tips). rot = extra tilt (rad), dx/dy = woozy
       circle (share of her height), sx/sy = squash (bonk on impact, then the brace). Continuous, and exactly 0 / 1 when done. */
    function dizzyAt(t, amp, dir) {
        t = +t || 0; amp = clamp(+amp || 0, 0, 1); dir = dir < 0 ? -1 : 1;
        if (t >= B.DIZZY || t < 0) return { rot: 0, dx: 0, dy: 0, sx: 1, sy: 1, done: t >= B.DIZZY, phase: t >= B.DIZZY ? 'done' : 'none' };
        const lean = dir * amp * 0.6 * smooth(0, 0.22, t) * (1 - smooth(0.6, 1.3, t));
        const sway = amp * 0.28 * Math.sin(10 * (t - 0.22)) * smooth(0.22, 0.35, t) * (1 - smooth(0.7, 1.2, t));
        const over = -dir * amp * 0.07 * Math.sin(Math.PI * clamp((t - 1.2) / 0.5, 0, 1));
        const swirl = smooth(0.15, 0.3, t) * (1 - smooth(0.8, 1.2, t));
        const bonk = t < 0.12 ? Math.sin(Math.PI * t / 0.12) : 0;
        const brace = Math.sin(Math.PI * clamp((t - 1.1) / 0.4, 0, 1));
        const phase = t < 0.22 ? 'tip' : t < 1.1 ? 'woozy' : t < 1.5 ? 'brace' : 'steady';
        return { rot: lean + sway + over, dx: Math.cos(8 * t) * 0.05 * amp * swirl, dy: Math.sin(8 * t) * 0.035 * amp * swirl,
            sx: 1 + 0.06 * amp * bonk + 0.1 * amp * brace, sy: 1 - 0.08 * amp * bonk - 0.14 * amp * brace, done: false, phase };
    }
    /* a near miss: she leans away for a moment. side +-1 */
    function flinchAt(t, side) {
        t = +t || 0; if (t < 0 || t >= B.FLINCH) return { rot: 0, sx: 1, sy: 1, done: t >= B.FLINCH };
        const e = Math.sin(Math.PI * t / B.FLINCH);
        return { rot: (side < 0 ? -1 : 1) * 0.22 * e, sx: 1 - 0.04 * e, sy: 1 + 0.04 * e, done: false };
    }
    /* where bumps may happen at all: free at Home, inside the vessel, clear of her own cell and of a place's atmosphere */
    function active(o) {
        o = o || {};
        if (o.st !== 'free' || o.galaxy || o.reduced || !o.visible) return false;
        const p = o.p || [0, 0, 0];
        if (Math.hypot(p[1], p[2]) > B.VR - 1 || Math.abs(p[0]) > 38) return false;
        if (len(p) < B.OWN) return false;
        return (+o.ap || 0) <= B.AP_MAX;
    }
    const core = { B, bodyR, cellR, contact, closest, threat, dodgeChance, dodges, swerveDir, knock, nudgeDist, dizzyAt, flinchAt, active, smooth };
    if (typeof module === 'object' && module.exports) module.exports = core;
    if (!D || !D.addEventListener || W.LowiMistyBump) return;

    /* ---------- browser ---------- */
    const M = { mesh: null, scene: null, cells: null, m4: null, tp: null, kv: null, dv: null, rt: null, up: null, tmp: null, hit: null,
        cool: 0, dz: null, fl: null, flGap: 0, enc: new Map(), knocked: [], cur: null, curT: B.CUR_MIN, last: 0, now: 0, bumps: 0, dodged: 0, missed: 0, soft: 0, log: [] };
    const P = [0, 0, 0], C = [0, 0, 0], R = [0, 0, 0], Wv = [0, 0, 0], VM = [0, 0, 0], VC = [0, 0, 0];
    function note(s) { M.log.push(Math.round(M.now * 10) / 10 + ' ' + s); if (M.log.length > 20) M.log.shift(); }
    /* Oct 19: the world moves at the user's speed x her energy pace (window.LowiVigorFeel, same clamp as body-world-3d-scene.js) */
    const energyPace = () => { const f = W.LowiVigorFeel, p = f ? +f.pace : 0; return p > 0 ? Math.min(1.8, Math.max(0.6, p)) : 1; };
    const worldSpeed = () => { const v = +W.LowiWorldSpeed; return (v > 0 ? Math.min(3, Math.max(0.1, v)) : 1) * energyPace(); };
    function find(a) {
        if (M.scene !== a.scene || !M.mesh) {
            M.scene = a.scene; M.mesh = a.scene && a.scene.getObjectByName ? a.scene.getObjectByName('lowi-rbc') : null;
            M.cells = M.mesh && M.mesh.userData ? M.mesh.userData.cells || null : null;
        }
        if (!M.m4 && a.THREE) { const T = a.THREE; M.m4 = new T.Matrix4(); M.tp = new T.Vector3(); M.kv = new T.Vector3(); M.dv = new T.Vector3(); M.rt = new T.Vector3(); M.up = new T.Vector3(); M.tmp = new T.Vector3(); M.hit = new T.Vector3(); }
        return !!(M.mesh && M.cells && M.m4);
    }
    function reset() { if (M.kv) { M.kv.set(0, 0, 0); M.dv.set(0, 0, 0); } M.dz = null; M.fl = null; M.cur = null; M.enc.clear(); }
    /* the cell's centre as last drawn (flow + its bob), world space: the mesh sits at the scene origin */
    function cellPos(i) { M.mesh.getMatrixAt(i, M.m4); M.tp.setFromMatrixPosition(M.m4); C[0] = M.tp.x; C[1] = M.tp.y; C[2] = M.tp.z; return C; }
    function decide(i, mode, k) {
        const e = M.enc.get(i);
        if (e && e.until > M.now) return e;
        const d = { until: M.now + 2.5, dodge: dodges(Math.random(), mode, k, M.cool > 0), counted: false };
        M.enc.set(i, d); return d;
    }
    /* one frame of her free flight, after misty-flight moved her. Moves only S.p (a decaying nudge / swerve) and S.v (curiosity) */
    function step(ctx, S, mode, K) {
        const a = ctx && ctx.a; if (!a || !S || !S.p || !find(a)) return;
        const dt = clamp(+ctx.dt || 0, 0, 0.05); M.now += dt; M.last = M.now;
        P[0] = S.p.x; P[1] = S.p.y; P[2] = S.p.z;
        if (!active({ st: S.st, galaxy: !!(S.gx || S.gxBack), reduced: !!ctx.reduced, visible: M.mesh.visible !== false, p: P, ap: S.ap })) { M.kv.multiplyScalar(Math.exp(-B.DECAY * dt)); M.dv.multiplyScalar(Math.exp(-B.DODGE_DECAY * dt)); M.cur = null; return; }
        const k = clamp(+ctx.k || 0, 0, 1), ws = worldSpeed(), cells = M.cells, n = Math.min(cells.length, M.mesh.count || cells.length);
        if (M.cool > 0) M.cool -= dt; if (M.flGap > 0) M.flGap -= dt; if (M.curT > 0) M.curT -= dt;
        /* the nudge from a bump and the swerve from a dodge: both fade by themselves */
        S.p.addScaledVector(M.kv, dt); M.kv.multiplyScalar(Math.exp(-B.DECAY * dt));
        S.p.addScaledVector(M.dv, dt); M.dv.multiplyScalar(Math.exp(-B.DODGE_DECAY * dt));
        if (K && K.ROAM) { const L = S.p.length(); if (L > K.ROAM) S.p.multiplyScalar(K.ROAM / L); }
        P[0] = S.p.x; P[1] = S.p.y; P[2] = S.p.z;
        VM[0] = S.v.x + M.kv.x + M.dv.x; VM[1] = S.v.y + M.kv.y + M.dv.y; VM[2] = S.v.z + M.kv.z + M.dv.z;
        const rM = bodyR(S.hs);
        basisOf(a);
        let curD = Infinity;
        for (let i = 0; i < n; i++) {
            const c = cells[i];
            /* cheap 1-D rejects on the flow data before reading any matrix */
            if (Math.abs(c.x - P[0]) > B.SENSE || Math.abs(c.y - P[1]) > B.SENSE || Math.abs(c.z - P[2]) > B.SENSE) continue;
            cellPos(i);
            const rC = cellR(c.s);
            VC[0] = c.v * ws; VC[1] = c.ky || 0; VC[2] = c.kz || 0;
            const hit = contact(P, C, rM, rC);
            if (hit.hit) { touch(ctx, S, c, i, hit, rM, rC, mode, dt); continue; }
            R[0] = C[0] - P[0]; R[1] = C[1] - P[1]; R[2] = C[2] - P[2];
            Wv[0] = VC[0] - VM[0]; Wv[1] = VC[1] - VM[1]; Wv[2] = VC[2] - VM[2];
            if (M.cur && M.cur.i === i) curD = hit.d;
            const th = threat(R, Wv, rM, rC), e = th ? decide(i, mode, k) : null;
            if (th && e.dodge) {
                const s = swerveDir(th, Wv), urg = 1 - th.t / B.LOOK;
                M.dv.x += s[0] * B.DODGE_ACC * urg * dt; M.dv.y += s[1] * B.DODGE_ACC * urg * dt; M.dv.z += s[2] * B.DODGE_ACC * urg * dt;
                if (M.dv.length() > B.DODGE_MAX) M.dv.setLength(B.DODGE_MAX);
                if (!e.counted) { e.counted = true; M.dodged++; note('dodge ' + i); if (M.cur && M.cur.i === i) M.cur = null; }
                if (!M.dz && !M.fl) startFlinch(-Math.sign(s[0] * M.rt.x + s[1] * M.rt.y + s[2] * M.rt.z) || 1, a);
            } else if (!M.dz && !M.fl && M.flGap <= 0 && hit.d < (rM + rC) * B.NEAR && dot(R, Wv) < 0) {
                /* a cell whizzing past close: a little startle, in either mode */
                startFlinch((R[0] * M.rt.x + R[1] * M.rt.y + R[2] * M.rt.z) > 0 ? 1 : -1, a);
            }
        }
        knockedStep(dt * ws);
        curious(ctx, S, mode, cells, n, curD, rM, dt);
        if (M.enc.size > 24) M.enc.forEach((e, i) => { if (e.until <= M.now) M.enc.delete(i); });
    }
    function touch(ctx, S, c, i, hit, rM, rC, mode, dt) {
        const a = ctx.a, n = hit.n, recent = c.bumpT != null && M.now - c.bumpT < B.REHIT;
        if (recent || M.cool > 0 || M.dz) {
            /* the calm after a bump: just slide apart, softly; the cell gets out of the way too */
            const sep = hit.pen * Math.min(1, dt * 6);
            S.p.x += n[0] * sep; S.p.y += n[1] * sep; S.p.z += n[2] * sep;
            if (!recent) { const lat = parting(n); c.ky = (c.ky || 0) - lat[0] * 0.6; c.kz = (c.kz || 0) - lat[1] * 0.6; track(c); c.bumpT = M.now; M.soft++; }
            return;
        }
        const kn = knock(VM, VC, n, mode), lat = parting(n);
        /* they part sideways (across the flow), so the cell glances off and flows on instead of shoving her downstream */
        let kx = n[0], ky = n[1] + lat[0] * 0.8, kz = n[2] + lat[1] * 0.8; const kl = Math.hypot(kx, ky, kz) || 1;
        M.kv.x += kx / kl * kn.kick; M.kv.y += ky / kl * kn.kick; M.kv.z += kz / kl * kn.kick;
        /* the cell goes the other way, into a new lane, tumbling */
        c.ky = (c.ky || 0) - lat[0] * B.CELL_KICK; c.kz = (c.kz || 0) - lat[1] * B.CELL_KICK; c.spin = (Math.random() < 0.5 ? -1 : 1) * (2 + 2 * kn.strength); track(c);
        c.bumpT = M.now; M.cool = B.COOL; M.bumps++; M.cur = null;
        const e = M.enc.get(i); if (e && !e.dodge && !e.counted) { e.counted = true; M.missed++; }
        basisOf(a);
        const side = n[0] * M.rt.x + n[1] * M.rt.y + n[2] * M.rt.z;
        M.dz = { t: 0, amp: 0.75 + 0.25 * kn.strength, dir: side > 0 ? -1 : 1, star: 0.2 }; M.fl = null;
        if (ctx.burst) { M.hit.set(S.p.x - n[0] * rM, S.p.y - n[1] * rM, S.p.z - n[2] * rM); ctx.burst(M.hit, 5 + Math.round(4 * kn.strength), 0.18 * Math.max(0.4, S.hs || 1)); }
        note('bump ' + i + ' ' + mode + ' k' + kn.kick.toFixed(2));
    }
    /* the across-the-flow direction from the cell to her (y,z); straight on, pick one */
    function parting(n) { const L = Math.hypot(n[1], n[2]); if (L > 0.15) return [n[1] / L, n[2] / L]; const a = Math.random() * 6.283; return [Math.cos(a), Math.sin(a)]; }
    function track(c) { if (M.knocked.indexOf(c) < 0) { if (M.knocked.length >= 6) { const o = M.knocked.shift(); o.ky = 0; o.kz = 0; o.spin = 0; } M.knocked.push(c); } }
    /* knocked cells drift into their new lane and stop tumbling; they never leave the vessel */
    function knockedStep(wdt) {
        for (let j = M.knocked.length - 1; j >= 0; j--) {
            const c = M.knocked[j], f = Math.exp(-1.5 * wdt);
            const ny = c.y + (c.ky || 0) * wdt, nz = c.z + (c.kz || 0) * wdt;
            if (Math.hypot(ny, nz) < B.VR - 1.2) { c.y = ny; c.z = nz; } else { c.ky = 0; c.kz = 0; }
            if (c.spin) { c.ay += c.spin * wdt; c.spin *= f; }
            c.ky = (c.ky || 0) * f; c.kz = (c.kz || 0) * f;
            if (Math.abs(c.ky) + Math.abs(c.kz) < 0.01 && Math.abs(c.spin || 0) < 0.05) { c.ky = 0; c.kz = 0; c.spin = 0; M.knocked.splice(j, 1); }
        }
    }
    /* autopilot now and then drifts toward a cell passing nearby for a closer look */
    function curious(ctx, S, mode, cells, n, curD, rM, dt) {
        if (mode !== 'auto' || M.dz || M.cool > 1) { M.cur = null; return; }
        if (M.cur) {
            M.cur.t -= dt;
            const c = cells[M.cur.i];
            if (M.cur.t <= 0 || !c || !(curD < B.SENSE)) { M.cur = null; return; }
            cellPos(M.cur.i);
            /* head for where it will be (lead by the time to get there); most of her heading, the tour keeps the rest */
            const sp = Math.max(1.3, S.v.length()), lead = Math.min(1.5, curD / (sp + 0.5));
            M.tmp.set(C[0] + c.v * worldSpeed() * lead - S.p.x, C[1] + (c.ky || 0) * lead - S.p.y, C[2] + (c.kz || 0) * lead - S.p.z);
            const L = M.tmp.length(); if (L < 1e-3) return;
            S.v.lerp(M.tmp.multiplyScalar(sp / L), Math.min(1, B.CUR_PULL * dt));
            return;
        }
        if (M.curT > 0) return;
        let best = -1, bd = Infinity;
        for (let i = 0; i < n; i++) {
            const c = cells[i];
            if (Math.abs(c.x - S.p.x) > 6 || Math.abs(c.y - S.p.y) > 6 || Math.abs(c.z - S.p.z) > 6) continue;
            const d = Math.hypot(c.x - S.p.x, c.y - S.p.y, c.z - S.p.z);
            const sc = d + (c.x > S.p.x + 0.5 ? 2.5 : 0); /* rather one flowing toward her: they meet; one flowing away is hard to catch */
            if (d > 1.8 && d < 5.5 && sc < bd) { bd = sc; best = i; }
        }
        if (best >= 0) { M.cur = { i: best, t: B.CUR_T }; note('curious ' + best); M.curT = B.CUR_MIN + Math.random() * (B.CUR_MAX - B.CUR_MIN); } else M.curT = 1.5; /* none close by: look again soon */
    }
    function basisOf(a) {
        const cam = a.camera; if (!cam) return;
        cam.updateMatrixWorld(); M.rt.setFromMatrixColumn(cam.matrixWorld, 0).normalize(); M.up.setFromMatrixColumn(cam.matrixWorld, 1).normalize();
    }
    function startFlinch(side, a) { M.fl = { t: 0, side: side < 0 ? -1 : 1 }; M.flGap = B.FLINCH_GAP; }
    /* draw on top of misty-flight's own pose: the dizzy turn or a flinch. Only tilt, a small offset and squash; never her path */
    function draw(ctx, S, still) {
        const wand = ctx && ctx.wand, a = ctx && ctx.a; if (!wand || !a || !M.rt) return;
        if (M.now - M.last > 0.3 || ctx.reduced || still) { if (M.dz || M.fl) reset(); return; } /* flight ended or paused */
        const dt = clamp(+ctx.dt || 0, 0, 0.05), hs = S.hs || 1;
        if (M.dz) {
            M.dz.t += dt; const o = dizzyAt(M.dz.t, M.dz.amp, M.dz.dir);
            if (o.done) { M.dz = null; return; }
            basisOf(a);
            if (wand.material) wand.material.rotation += o.rot;
            wand.position.addScaledVector(M.rt, o.dx * hs).addScaledVector(M.up, o.dy * hs);
            wand.scale.x *= o.sx; wand.scale.y *= o.sy;
            /* a few little stars round her head while she is woozy */
            if (ctx.burst && o.phase === 'woozy' && (M.dz.star -= dt) <= 0) {
                M.dz.star = 0.22; const th = M.dz.t * 8;
                M.hit.copy(wand.position).addScaledVector(M.up, 0.42 * hs).addScaledVector(M.rt, Math.cos(th) * 0.22 * hs);
                ctx.burst(M.hit, 1, 0.06 * Math.max(0.4, hs));
            }
            return;
        }
        if (M.fl) {
            M.fl.t += dt; const o = flinchAt(M.fl.t, M.fl.side);
            if (o.done) { M.fl = null; return; }
            if (wand.material) wand.material.rotation += o.rot;
            wand.scale.x *= o.sx; wand.scale.y *= o.sy;
        }
    }
    W.LowiMistyBump = { core, step, draw, reset,
        state: () => ({ bumps: M.bumps, dodged: M.dodged, missed: M.missed, soft: M.soft, cool: +Math.max(0, M.cool).toFixed(2), dizzy: M.dz ? +M.dz.t.toFixed(2) : null, flinch: !!M.fl, curious: M.cur ? M.cur.i : null, knocked: M.knocked.length, found: !!M.mesh, log: M.log.slice(-10) }) };
})();
