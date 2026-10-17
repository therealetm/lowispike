/* LOWiSPIKE - solid worlds (Oct 17, 2026).
   Eman: "That green stuff, I can just float through it like a ghost. Those things should actually be physical." and "the gray
   blood cells flying around should bounce off me - but only if they're really at the same depth as me, not just in front or
   behind." Root cause of the 'it disappears the closer I get': the fibres/walls are single-sided meshes, so as soon as the
   camera (or Misty) slipped inside one it was culled from view. Nothing had a collision volume.

   What this does (no loop of its own; called from frames that already run):
   - On entering a world it reads the world's real meshes ONCE and turns them into simple proxies (capsules / spheres /
     inverted walls) in each mesh's own space, with a small grid for lookup. Thin tubes (dendrites, capillaries) stay
     passable on purpose.
   - camera(): third-person spring arm. If the camera would sit inside something it is pulled in along its arm to just
     before the surface, then eases back out. It never enters a solid, so nothing vanishes. User zoom is untouched.
   - misty(): Misty is pushed out of solids with swept sub-steps (no tunnelling at full speed), slides along them and
     rebounds a little (firmer for fibres, springier for the translucent lung sacs). Moving cells (gray blood cells in the
     open world, red cells inside heart/liver, gut microbes) are real 3D spheres: they only touch her when they truly
     overlap in 3D, and both get nudged.
   - clearPoint(): hunt crumbs that would spawn inside a solid are moved to just outside it, so every crumb stays reachable.
   No health / energy penalty, no new buttons, nothing changes the way you fly or turn the world. */
(function (root) {
    'use strict';

    /* ---------- pure core (tested in tests/world-solids.test.cjs) ---------- */
    const STRIDE = 8; // ax ay az bx by bz r soft

    function segT(px, py, pz, c, o) {
        const ax = c[o], ay = c[o + 1], az = c[o + 2];
        const dx = c[o + 3] - ax, dy = c[o + 4] - ay, dz = c[o + 5] - az;
        const L = dx * dx + dy * dy + dz * dz;
        if (L < 1e-9) return 0;
        let t = ((px - ax) * dx + (py - ay) * dy + (pz - az) * dz) / L;
        return t < 0 ? 0 : (t > 1 ? 1 : t);
    }
    /* signed distance from a point to a capsule surface (negative = inside), plus the outward normal in out */
    function capDist(px, py, pz, c, o, out) {
        const t = segT(px, py, pz, c, o);
        const qx = c[o] + (c[o + 3] - c[o]) * t, qy = c[o + 1] + (c[o + 4] - c[o + 1]) * t, qz = c[o + 2] + (c[o + 5] - c[o + 2]) * t;
        let nx = px - qx, ny = py - qy, nz = pz - qz;
        const d = Math.sqrt(nx * nx + ny * ny + nz * nz);
        if (d > 1e-6) { nx /= d; ny /= d; nz /= d; }
        else { // dead on the axis: push sideways, perpendicular to the segment
            const ax = c[o + 3] - c[o], ay = c[o + 4] - c[o + 1], az = c[o + 5] - c[o + 2];
            if (Math.abs(ax) + Math.abs(az) > 1e-6) { nx = -az; ny = 0; nz = ax; } else { nx = 1; ny = 0; nz = 0; }
            const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        }
        if (out) { out[0] = nx; out[1] = ny; out[2] = nz; }
        return d - c[o + 6];
    }
    /* inverted wall (you live INSIDE it): distance into the wall, normal pointing back inward */
    function wallDist(px, py, pz, c, o, out) {
        const t = segT(px, py, pz, c, o);
        const qx = c[o] + (c[o + 3] - c[o]) * t, qy = c[o + 1] + (c[o + 4] - c[o + 1]) * t, qz = c[o + 2] + (c[o + 5] - c[o + 2]) * t;
        let nx = qx - px, ny = qy - py, nz = qz - pz;
        const d = Math.sqrt(nx * nx + ny * ny + nz * nz);
        if (d > 1e-6) { nx /= d; ny /= d; nz /= d; } else { nx = 0; ny = 1; nz = 0; }
        if (out) { out[0] = nx; out[1] = ny; out[2] = nz; }
        return c[o + 6] - d; // negative = past the wall
    }

    /* body = proxies in one local space. caps: [{a:[x,y,z], b:[x,y,z], r, soft}], walls: same shape (inverted). */
    function makeBody(caps, walls, cell) {
        const n = caps.length, C = new Float32Array(Math.max(1, n) * STRIDE);
        caps.forEach((s, i) => {
            const o = i * STRIDE;
            C[o] = s.a[0]; C[o + 1] = s.a[1]; C[o + 2] = s.a[2];
            C[o + 3] = s.b[0]; C[o + 4] = s.b[1]; C[o + 5] = s.b[2];
            C[o + 6] = s.r; C[o + 7] = s.soft ? 1 : 0;
        });
        const Wl = new Float32Array(Math.max(1, walls.length) * STRIDE);
        walls.forEach((s, i) => {
            const o = i * STRIDE;
            Wl[o] = s.a[0]; Wl[o + 1] = s.a[1]; Wl[o + 2] = s.a[2]; Wl[o + 3] = s.b[0]; Wl[o + 4] = s.b[1]; Wl[o + 5] = s.b[2];
            Wl[o + 6] = s.r; Wl[o + 7] = 0;
        });
        const body = { C, n, W: Wl, nw: walls.length, cell: cell || 2.5, grid: null, stamp: new Uint32Array(Math.max(1, n)), tick: 1, cand: [] };
        if (n > 24) { // uniform grid broadphase
            const g = new Map(), cs = body.cell;
            for (let i = 0; i < n; i++) {
                const o = i * STRIDE, r = C[o + 6];
                const x0 = Math.floor((Math.min(C[o], C[o + 3]) - r) / cs), x1 = Math.floor((Math.max(C[o], C[o + 3]) + r) / cs);
                const y0 = Math.floor((Math.min(C[o + 1], C[o + 4]) - r) / cs), y1 = Math.floor((Math.max(C[o + 1], C[o + 4]) + r) / cs);
                const z0 = Math.floor((Math.min(C[o + 2], C[o + 5]) - r) / cs), z1 = Math.floor((Math.max(C[o + 2], C[o + 5]) + r) / cs);
                for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
                    const k = x + ',' + y + ',' + z; let a = g.get(k); if (!a) g.set(k, a = []); a.push(i);
                }
            }
            body.grid = g;
        }
        return body;
    }
    function candidates(body, x, y, z, rad) {
        const out = body.cand; out.length = 0;
        if (!body.grid) { for (let i = 0; i < body.n; i++) out.push(i); return out; }
        const cs = body.cell, tk = ++body.tick;
        const x0 = Math.floor((x - rad) / cs), x1 = Math.floor((x + rad) / cs);
        const y0 = Math.floor((y - rad) / cs), y1 = Math.floor((y + rad) / cs);
        const z0 = Math.floor((z - rad) / cs), z1 = Math.floor((z + rad) / cs);
        for (let a = x0; a <= x1; a++) for (let b = y0; b <= y1; b++) for (let c = z0; c <= z1; c++) {
            const l = body.grid.get(a + ',' + b + ',' + c); if (!l) continue;
            for (let j = 0; j < l.length; j++) { const i = l[j]; if (body.stamp[i] !== tk) { body.stamp[i] = tk; out.push(i); } }
        }
        return out;
    }
    /* push P (array, local space) out of every solid by radius rad. Returns contact info (normal = average push dir). */
    const _n = [0, 0, 0];
    function push(body, P, rad, iters) {
        let hit = false, soft = 0, nx = 0, ny = 0, nz = 0, depth = 0;
        for (let it = 0; it < (iters || 3); it++) {
            let moved = false;
            const cand = candidates(body, P[0], P[1], P[2], rad + 0.01);
            for (let j = 0; j < cand.length; j++) {
                const o = cand[j] * STRIDE;
                const d = capDist(P[0], P[1], P[2], body.C, o, _n) - rad;
                if (d < 0) {
                    P[0] -= _n[0] * d; P[1] -= _n[1] * d; P[2] -= _n[2] * d;
                    nx += _n[0]; ny += _n[1]; nz += _n[2]; depth = Math.max(depth, -d); hit = moved = true;
                    if (body.C[o + 7]) soft = 1;
                }
            }
            for (let w = 0; w < body.nw; w++) {
                const d = wallDist(P[0], P[1], P[2], body.W, w * STRIDE, _n) - rad;
                if (d < 0) { P[0] -= _n[0] * d; P[1] -= _n[1] * d; P[2] -= _n[2] * d; nx += _n[0]; ny += _n[1]; nz += _n[2]; depth = Math.max(depth, -d); hit = moved = true; }
            }
            if (!moved) break;
        }
        const l = Math.hypot(nx, ny, nz);
        return { hit, soft, depth, stuck: hit && pen(body, P, rad) > 0.02, n: l > 1e-6 ? [nx / l, ny / l, nz / l] : [0, 0, 0] };
    }
    /* deepest remaining penetration at P (0 = free) */
    function pen(body, P, rad) {
        let worst = 0;
        const cand = candidates(body, P[0], P[1], P[2], rad + 0.01);
        for (let j = 0; j < cand.length; j++) { const d = capDist(P[0], P[1], P[2], body.C, cand[j] * STRIDE, null) - rad; if (d < -worst) worst = -d; }
        for (let w = 0; w < body.nw; w++) { const d = wallDist(P[0], P[1], P[2], body.W, w * STRIDE, null) - rad; if (d < -worst) worst = -d; }
        return worst;
    }
    /* swept move P0 -> P1 in sub-steps no longer than maxStep, so a fast flyer cannot skip through a thin solid */
    function sweep(body, P0, P1, rad, maxStep) {
        const dx = P1[0] - P0[0], dy = P1[1] - P0[1], dz = P1[2] - P0[2];
        const len = Math.hypot(dx, dy, dz), ms = Math.max(0.02, maxStep || rad * 0.7);
        const steps = Math.min(12, Math.max(1, Math.ceil(len / ms)));
        const P = [P0[0], P0[1], P0[2]];
        let res = { hit: false, soft: 0, depth: 0, n: [0, 0, 0] };
        for (let s = 1; s <= steps; s++) {
            const bx = P[0], by = P[1], bz = P[2];
            P[0] += dx / steps; P[1] += dy / steps; P[2] += dz / steps;
            const r = push(body, P, rad, 4);
            if (r.stuck && s > 1) { P[0] = bx; P[1] = by; P[2] = bz; res = r; break; } // a gap too narrow for her: stop at the last free spot, no jitter
            if (r.hit) {
                res = r;
                // the rest of the move only keeps its sliding part (no burrowing on the next sub-step)
                const rem = (steps - s) / steps;
                if (rem > 0) {
                    const vn = dx * r.n[0] + dy * r.n[1] + dz * r.n[2];
                    if (vn < 0) {
                        const tx = dx - vn * r.n[0], ty = dy - vn * r.n[1], tz = dz - vn * r.n[2];
                        for (let k = s + 1; k <= steps; k++) { const cx = P[0], cy = P[1], cz = P[2]; P[0] += tx / steps; P[1] += ty / steps; P[2] += tz / steps; const r2 = push(body, P, rad, 4); if (r2.stuck) { P[0] = cx; P[1] = cy; P[2] = cz; break; } if (r2.hit) res = r2; }
                        break;
                    }
                }
            }
        }
        P1[0] = P[0]; P1[1] = P[1]; P1[2] = P[2];
        return res;
    }
    /* index of the first solid that contains point (within margin m), or -1. Walls report as -2 - w. */
    function insideIdx(body, x, y, z, m, skipX, skipY, skipZ) {
        const cand = candidates(body, x, y, z, m + 0.01);
        for (let j = 0; j < cand.length; j++) {
            const o = cand[j] * STRIDE;
            if (capDist(x, y, z, body.C, o, null) < m) {
                if (skipX !== undefined && capDist(skipX, skipY, skipZ, body.C, o, null) < m) continue; // target itself inside: can't help
                return cand[j];
            }
        }
        for (let w = 0; w < body.nw; w++) {
            if (wallDist(x, y, z, body.W, w * STRIDE, null) < m) {
                if (skipX !== undefined && wallDist(skipX, skipY, skipZ, body.W, w * STRIDE, null) < m) continue;
                return -2 - w;
            }
        }
        return -1;
    }
    function distTo(body, idx, x, y, z) {
        return idx >= 0 ? capDist(x, y, z, body.C, idx * STRIDE, null) : wallDist(x, y, z, body.W, (-2 - idx) * STRIDE, null);
    }
    /* spring-arm: T target, D unit dir to camera, L length. Returns the largest L' <= L whose point is outside all solids
       (margin m) along the arm. Each solid is convex (or a convex hollow) so bisection finds its entry exactly. */
    function arm(body, T, D, L, m, maxK) {
        for (let k = 0; k < (maxK || 5); k++) {
            const x = T[0] + D[0] * L, y = T[1] + D[1] * L, z = T[2] + D[2] * L;
            const idx = insideIdx(body, x, y, z, m, T[0], T[1], T[2]);
            if (idx === -1) return L;
            let lo = 0, hi = L;
            for (let i = 0; i < 14; i++) {
                const mid = (lo + hi) / 2;
                if (distTo(body, idx, T[0] + D[0] * mid, T[1] + D[1] * mid, T[2] + D[2] * mid) < m) hi = mid; else lo = mid;
            }
            L = lo;
        }
        return L;
    }
    /* camera point: pull in along the arm to the first solid's surface, then slip sideways out of any touching neighbour
       (a gap-sized nudge instead of a long chained zoom-in through a packed bundle). Falls back to the full arm if boxed in.
       Returns the camera point (array) in local space. */
    function camPoint(body, T, D, L, m) {
        const L1 = arm(body, T, D, L, m, 1);
        const P = [T[0] + D[0] * L1, T[1] + D[1] * L1, T[2] + D[2] * L1];
        if (L1 >= L) return P;
        push(body, P, m * 1.02, 4);
        if (pen(body, P, m) > 0.02 || Math.hypot(P[0] - T[0], P[1] - T[1], P[2] - T[2]) < 0.3) {
            const L2 = arm(body, T, D, L1, m, 5);
            P[0] = T[0] + D[0] * L2; P[1] = T[1] + D[1] * L2; P[2] = T[2] + D[2] * L2;
        }
        return P;
    }
    /* bounce: remove the into-surface part of v, give back e of it, keep most of the slide */
    function bounce(v, n, e, slide) {
        const vn = v[0] * n[0] + v[1] * n[1] + v[2] * n[2];
        if (vn >= 0) return 0;
        v[0] -= (1 + e) * vn * n[0]; v[1] -= (1 + e) * vn * n[1]; v[2] -= (1 + e) * vn * n[2];
        const f = slide == null ? 1 : slide;
        if (f < 1) { // damp only the tangential part
            const wn = v[0] * n[0] + v[1] * n[1] + v[2] * n[2];
            for (let k = 0; k < 3; k++) v[k] = wn * n[k] + (v[k] - wn * n[k]) * f;
        }
        return -vn;
    }
    /* sphere vs sphere with mass share: moves P by its share, returns {n, overlap} or null */
    function sphereHit(P, rP, Q, rQ) {
        const dx = P[0] - Q[0], dy = P[1] - Q[1], dz = P[2] - Q[2];
        const d = Math.hypot(dx, dy, dz), ov = rP + rQ - d;
        if (ov <= 0) return null;
        const n = d > 1e-6 ? [dx / d, dy / d, dz / d] : [0, 1, 0];
        return { n, overlap: ov };
    }

    /* proxies from a three.js geometry + an instance matrix (column-major elements e), in the mesh's own space */
    function col(e, i) { return Math.hypot(e[i * 4], e[i * 4 + 1], e[i * 4 + 2]); }
    function xf(e, x, y, z) { return [e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]]; }
    function proxiesFor(geo, e, soft, out) {
        const p = (geo && geo.parameters) || {}, type = geo && geo.type;
        if (type === 'CylinderGeometry') {
            const sr = Math.max(col(e, 0), col(e, 2)), sy = col(e, 1);
            const r = ((p.radiusTop + p.radiusBottom) / 2 + Math.abs(p.radiusTop - p.radiusBottom) / 4) * sr;
            const hy = Math.max(0, p.height / 2 - (r / (sy || 1)) * 0.6); // short pegs: keep the capsule caps inside the length
            out.push({ a: xf(e, 0, -hy, 0), b: xf(e, 0, hy, 0), r, soft, open: !!p.openEnded, len: p.height * sy });
        } else if (type === 'CapsuleGeometry') {
            const sr = Math.max(col(e, 0), col(e, 2));
            out.push({ a: xf(e, 0, -p.length / 2, 0), b: xf(e, 0, p.length / 2, 0), r: p.radius * sr, soft });
        } else if (type === 'SphereGeometry' || type === 'IcosahedronGeometry' || type === 'DodecahedronGeometry' || type === 'OctahedronGeometry') {
            const s = (col(e, 0) + col(e, 1) + col(e, 2)) / 3;
            const c = xf(e, 0, 0, 0);
            out.push({ a: c, b: c.slice(), r: p.radius * s * 0.95, soft });
        } else if (type === 'TorusGeometry') {
            const N = 16;
            for (let i = 0; i < N; i++) {
                const a0 = i / N * Math.PI * 2, a1 = (i + 1) / N * Math.PI * 2;
                out.push({ a: xf(e, Math.cos(a0) * p.radius, Math.sin(a0) * p.radius, 0), b: xf(e, Math.cos(a1) * p.radius, Math.sin(a1) * p.radius, 0), r: p.tube * col(e, 0), soft });
            }
        }
        return out;
    }

    const core = { capDist, wallDist, makeBody, push, pen, camPoint, sweep, insideIdx, arm, bounce, sphereHit, proxiesFor };
    if (typeof module !== 'undefined' && module.exports) module.exports = core;
    if (typeof window === 'undefined') return;

    /* ---------- browser layer ---------- */
    const W = window;
    const reg = () => W.LowiWorldRegions;
    const w3 = () => W.LowiWorld3D;
    const ID = new Float32Array(16); ID[0] = ID[5] = ID[10] = ID[15] = 1;
    const S = { group: null, bodies: [], movers: [], camL: 0, camOn: false, lastP: null, lastT: 0, lastKey: '', touch: 0 };

    function current() {
        const R = reg(), st = R && R.state;
        if (!st || !st.region || st.busy || st.warp) return null;
        const g = st.region.group;
        if (!g || Math.abs(g.scale.x - 1) > 0.02) return null;
        return st.region;
    }
    function build(region) {
        const g = region.group;
        S.group = g; S.bodies = []; S.movers = [];
        g.updateMatrixWorld(true);
        g.traverse(o => {
            if (o === g) return;
            const ud = o.userData || {};
            if (ud.flow) { S.movers.push({ obj: o, kind: 'flow' }); return; }
            if (ud.bump) { S.movers.push({ obj: o, kind: 'sprite', r: ud.bump }); return; }
            if (!o.isMesh || ud.noSolid) return;
            const geo = o.geometry, mat = Array.isArray(o.material) ? o.material[0] : o.material;
            const soft = !!(mat && mat.transparent && mat.opacity < 0.6);
            const back = !!(mat && mat.side === 1 /* THREE.BackSide */);
            const caps = [], walls = [];
            if (o.isInstancedMesh) {
                const arr = o.instanceMatrix.array, e = new Float32Array(16);
                for (let i = 0; i < o.count; i++) { for (let k = 0; k < 16; k++) e[k] = arr[i * 16 + k]; proxiesFor(geo, e, soft, caps); }
            } else proxiesFor(geo, ID, soft, caps);
            if (!caps.length) return;
            if (back) { // a wall you live inside (gut tube, heart chamber)
                caps.forEach(c => { walls.push(c); });
                S.bodies.push({ mesh: o, body: makeBody([], walls), inv: null });
            } else S.bodies.push({ mesh: o, body: makeBody(caps, []), inv: null });
        });
        S.key = region.id;
    }
    function ensure() {
        const region = current();
        if (!region) { S.group = null; return null; }
        if (S.group !== region.group) build(region);
        return region;
    }
    /* per-frame mesh transforms (lung sacs breathe, islets drift, heart wall beats) */
    function frameXf(THREE) {
        S.bodies.forEach(b => {
            if (!b.inv) { b.inv = new THREE.Matrix4(); b.m = new THREE.Matrix4(); }
            b.m.copy(b.mesh.matrixWorld); b.inv.copy(b.m).invert();
            const e = b.m.elements; b.s = (col(e, 0) + col(e, 1) + col(e, 2)) / 3 || 1;
        });
    }
    function toLocal(b, x, y, z, out) { const e = b.inv.elements; out[0] = e[0] * x + e[4] * y + e[8] * z + e[12]; out[1] = e[1] * x + e[5] * y + e[9] * z + e[13]; out[2] = e[2] * x + e[6] * y + e[10] * z + e[14]; return out; }
    function toWorld(b, P, out) { const e = b.m.elements; out[0] = e[0] * P[0] + e[4] * P[1] + e[8] * P[2] + e[12]; out[1] = e[1] * P[0] + e[5] * P[1] + e[9] * P[2] + e[13]; out[2] = e[2] * P[0] + e[6] * P[1] + e[10] * P[2] + e[14]; return out; }
    function dirWorld(b, n) { const e = b.m.elements; const x = e[0] * n[0] + e[4] * n[1] + e[8] * n[2], y = e[1] * n[0] + e[5] * n[1] + e[9] * n[2], z = e[2] * n[0] + e[6] * n[1] + e[10] * n[2]; const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; }

    /* is world point (x,y,z) inside any solid (solids that also hold the target are ignored, as the arm does) */
    const _Q = [0, 0, 0], _R = [0, 0, 0];
    function pointInside(x, y, z, target) {
        for (let i = 0; i < S.bodies.length; i++) {
            const b = S.bodies[i]; if (!b.inv) continue;
            toLocal(b, x, y, z, _Q); toLocal(b, target.x, target.y, target.z, _R);
            if (insideIdx(b.body, _Q[0], _Q[1], _Q[2], 0.05 / b.s, _R[0], _R[1], _R[2]) !== -1) return true;
        }
        return false;
    }
    /* ---- camera: spring arm, called right after the scene places the camera (body-world-3d-scene.js step) ---- */
    const _T = [0, 0, 0], _D = [0, 0, 0], _P = [0, 0, 0];
    function camera(cam, target, dt) {
        const region = ensure();
        if (!region || !S.bodies.length) { S.camOn = false; return; }
        const THREE = w3() && w3().THREE; if (!THREE) return;
        frameXf(THREE);
        dt = Math.min(0.1, dt || 0.016);
        const dx = cam.position.x - target.x, dy = cam.position.y - target.y, dz = cam.position.z - target.z;
        const raw = Math.hypot(dx, dy, dz); if (raw < 1e-3) return;
        const ux = dx / raw, uy = dy / raw, uz = dz / raw;
        let L = raw;
        if (S.camOn && S.camL < raw) L = Math.min(raw, S.camL + (raw - S.camL) * (1 - Math.exp(-dt * 4))); // ease back out
        const Cw = [target.x + ux * L, target.y + uy * L, target.z + uz * L];
        for (let i = 0; i < S.bodies.length; i++) {
            const b = S.bodies[i];
            toLocal(b, target.x, target.y, target.z, _T);
            toLocal(b, Cw[0], Cw[1], Cw[2], _P);
            _D[0] = _P[0] - _T[0]; _D[1] = _P[1] - _T[1]; _D[2] = _P[2] - _T[2];
            const ll = Math.hypot(_D[0], _D[1], _D[2]); if (ll < 1e-4) continue;
            _D[0] /= ll; _D[1] /= ll; _D[2] /= ll;
            const P = camPoint(b.body, _T, _D, ll, 0.32 / b.s);
            toWorld(b, P, Cw);
        }
        let ox = Cw[0] - target.x, oy = Cw[1] - target.y, oz = Cw[2] - target.z, Lt = Math.hypot(ox, oy, oz);
        if (Lt < 1e-4) { ox = ux; oy = uy; oz = uz; Lt = 1; }
        /* a long pull-in (arm crossing a packed bundle) glides over ~0.15 s instead of popping; first contact stays exact */
        const prevL = S.camOn ? S.camL : raw;
        let Lf = Lt;
        if (prevL - Lt > 0.6) {
            Lf = Math.max(Lt, prevL - Math.max(0.6, (prevL - Lt) * (1 - Math.exp(-dt * 18))));
            /* never glide THROUGH a solid: if the in-between point sits inside one, take the safe spot now (slow frames on a busy phone) */
            if (Lf > Lt && pointInside(target.x + ox / Lt * Lf, target.y + oy / Lt * Lf, target.z + oz / Lt * Lf, target)) Lf = Lt;
        }
        Lf = Math.max(Math.min(raw, 0.6), Lf);
        const moved = Math.abs(Lf - raw) > 1e-3 || Math.abs(ox / Lt - ux) + Math.abs(oy / Lt - uy) + Math.abs(oz / Lt - uz) > 1e-4;
        if (moved) {
            cam.position.set(target.x + ox / Lt * Lf, target.y + oy / Lt * Lf, target.z + oz / Lt * Lf);
            cam.lookAt(target);
            S.camOn = true; S.camL = Lf;
        } else { S.camOn = false; S.camL = raw; }
    }

    /* ---- Misty: called from misty-flight.js after she moved this frame. P, V: THREE.Vector3 (world). ---- */
    const _A = [0, 0, 0], _B = [0, 0, 0], _V = [0, 0, 0], _O = [0, 0, 0];
    function misty(P, V, rad, o) {
        o = o || {};
        const now = (W.performance && performance.now()) || Date.now();
        const key = (o.hub ? 'hub' : (S.key || '')) ;
        let prev = S.lastP;
        if (!prev || key !== S.lastKey || now - S.lastT > 300 || Math.hypot(prev[0] - P.x, prev[1] - P.y, prev[2] - P.z) > 4) prev = [P.x, P.y, P.z];
        S.lastKey = key; S.lastT = now;
        let hit = null;
        _V[0] = V.x; _V[1] = V.y; _V[2] = V.z;
        if (!o.hub) {
            const region = ensure();
            if (region && S.bodies.length) {
                const THREE = w3() && w3().THREE;
                if (THREE) frameXf(THREE);
                for (let i = 0; i < S.bodies.length; i++) {
                    const b = S.bodies[i]; if (!b.inv) continue;
                    toLocal(b, prev[0], prev[1], prev[2], _A);
                    toLocal(b, P.x, P.y, P.z, _B);
                    const r = sweep(b.body, _A, _B, rad / b.s, Math.max(0.05, rad * 0.6) / b.s);
                    if (r.hit) {
                        toWorld(b, _B, _O); P.set(_O[0], _O[1], _O[2]);
                        const n = dirWorld(b, r.n);
                        const imp = bounce(_V, n, r.soft ? 0.5 : 0.22, 0.92);
                        if (!hit || imp > hit.impact) hit = { n, impact: imp, soft: r.soft, kind: 'wall' };
                    }
                }
                moversIn(P, rad, (h) => { if (!hit || h.impact > hit.impact) hit = h; });
            }
        } else hubCells(P, rad, (h) => { if (!hit || h.impact > hit.impact) hit = h; });
        if (hit) V.set(_V[0], _V[1], _V[2]);
        S.lastP = [P.x, P.y, P.z];
        return hit;
    }
    function shove(P, rad, Q, rQ, vq, share, onHit, kind) {
        const h = sphereHit([P.x, P.y, P.z], rad, Q, rQ);
        if (!h) return null;
        const mine = h.overlap * (1 - share);
        P.x += h.n[0] * mine; P.y += h.n[1] * mine; P.z += h.n[2] * mine;
        const rel = [_V[0] - vq[0], _V[1] - vq[1], _V[2] - vq[2]];
        const imp = bounce(rel, h.n, 0.35, 1);
        _V[0] = rel[0] + vq[0]; _V[1] = rel[1] + vq[1]; _V[2] = rel[2] + vq[2];
        onHit({ n: h.n, impact: imp, soft: 0, kind });
        return h.overlap * share;
    }
    function moversIn(P, rad, onHit) {
        const g = S.group; if (!g) return;
        S.movers.forEach(m => {
            const o = m.obj; if (!o.visible) return;
            if (m.kind === 'flow' && o.isInstancedMesh) {
                const list = o.userData.flow, arr = o.instanceMatrix.array, e = o.matrixWorld.elements, r = (o.userData.flowR || 0.42) * 0.85;
                for (let i = 0; i < Math.min(o.count, list.length); i++) {
                    const lx = arr[i * 16 + 12], ly = arr[i * 16 + 13], lz = arr[i * 16 + 14];
                    const Q = [e[0] * lx + e[4] * ly + e[8] * lz + e[12], e[1] * lx + e[5] * ly + e[9] * lz + e[13], e[2] * lx + e[6] * ly + e[10] * lz + e[14]];
                    if (Math.abs(Q[0] - P.x) > rad + r || Math.abs(Q[1] - P.y) > rad + r || Math.abs(Q[2] - P.z) > rad + r) continue;
                    const back = shove(P, rad, Q, r, [0, 0, 0], 0.4, onHit, 'cell');
                    if (back && list[i] && list[i].p) { // nudge the cell away (its mesh sits unrotated in the world group)
                        const sc = col(e, 0) || 1, dx = Q[0] - P.x, dy = Q[1] - P.y, dz = Q[2] - P.z, l = Math.hypot(dx, dy, dz) || 1;
                        list[i].p[0] += dx / l * back / sc; list[i].p[1] += dy / l * back / sc; list[i].p[2] += dz / l * back / sc;
                    }
                }
            } else if (m.kind === 'sprite') {
                const wp = o.getWorldPosition ? o.getWorldPosition(new (w3().THREE.Vector3)()) : null; if (!wp) return;
                const r = m.r * (o.scale.x || 1);
                const back = shove(P, rad, [wp.x, wp.y, wp.z], r, [0, 0, 0], 0.5, onHit, 'cell');
                if (back) {
                    const dx = wp.x - P.x, dy = wp.y - P.y, dz = wp.z - P.z, l = Math.hypot(dx, dy, dz) || 1;
                    o.position.x += dx / l * back; o.position.z += dz / l * back;
                    if (typeof o.userData.y === 'number') o.userData.y += dy / l * back;
                }
            }
        });
    }
    /* open world: the gray blood cells (and white cells) are 3D spheres; only a real 3D overlap counts */
    let hubFlow = null, hubBump = null, hubScene = null;
    function hubCells(P, rad, onHit) {
        const a = w3(); if (!a || !a.scene) return;
        if (hubScene !== a.scene) {
            hubScene = a.scene; hubFlow = null; hubBump = [];
            a.scene.traverse(o => { const ud = o.userData || {}; if (ud.hubFlow) hubFlow = o; if (ud.hubBump) hubBump.push(o); });
        }
        if (hubFlow && hubFlow.visible !== false) {
            const list = hubFlow.userData.hubFlow, arr = hubFlow.instanceMatrix.array, base = hubFlow.userData.hubFlowR || 0.42;
            for (let i = 0; i < Math.min(hubFlow.count, list.length); i++) {
                const c = list[i], r = base * (c.s || 1) * 0.8;
                const Q = [arr[i * 16 + 12], arr[i * 16 + 13], arr[i * 16 + 14]];
                if (Math.abs(Q[0] - P.x) > rad + r || Math.abs(Q[1] - P.y) > rad + r || Math.abs(Q[2] - P.z) > rad + r) continue;
                const back = shove(P, rad, Q, r, [c.v || 0, 0, 0], 0.4, onHit, 'cell');
                if (back) { // the cell is knocked aside too (its flow along the vessel continues)
                    const dy = Q[1] - P.y, dz = Q[2] - P.z, l = Math.hypot(dy, dz) || 1;
                    c.y += dy / l * back; c.z += dz / l * back;
                }
            }
        }
        if (hubBump) hubBump.forEach(o => {
            if (o.visible === false) return;
            const r = (o.userData.hubBump || 0.5) * (o.scale.x || 1);
            const Q = [o.position.x, o.position.y, o.position.z];
            const back = shove(P, rad, Q, r, [o.userData.v || 0, 0, 0], 0.3, onHit, 'cell');
            if (back) { const dy = Q[1] - P.y, dz = Q[2] - P.z, l = Math.hypot(dy, dz) || 1; o.position.y += dy / l * back; o.position.z += dz / l * back; }
        });
    }

    /* hunt crumbs: q is in the region group's space; moved just outside any solid (margin m) so it stays reachable */
    function clearPoint(region, q, m) {
        try {
            if (!region || !region.group) return q;
            const g = region.group;
            if (S.group !== g) build(region);
            const THREE = w3() && w3().THREE; if (!THREE || !S.bodies.length) return q;
            g.updateMatrixWorld(true);
            frameXf(THREE);
            const wp = g.localToWorld(q.clone());
            for (let k = 0; k < 2; k++) for (let i = 0; i < S.bodies.length; i++) {
                const b = S.bodies[i];
                toLocal(b, wp.x, wp.y, wp.z, _A);
                const r = push(b.body, _A, (m || 0.4) / b.s, 4);
                if (r.hit) { toWorld(b, _A, _O); wp.set(_O[0], _O[1], _O[2]); }
            }
            const lq = g.worldToLocal(wp);
            q.copy(lq);
        } catch (e) { /* never block a spawn */ }
        return q;
    }

    W.LowiWorldSolids = Object.assign({}, core, {
        camera, misty, clearPoint,
        _state: S,
        count: () => ({ region: S.key || null, bodies: S.bodies.length, solids: S.bodies.reduce((n, b) => n + b.body.n + b.body.nw, 0), movers: S.movers.length, camOn: S.camOn, camL: S.camL })
    });
})(typeof window !== 'undefined' ? window : globalThis);
