/* Oct 17, 2026 - Eman: "That green stuff, I can just float through it like a ghost. Those things should actually be physical."
   and the gray blood cells "should bounce off me - only if they're really at the same depth as me". world-solids.js gives the
   world's real meshes simple collision proxies, keeps the camera out of them (that is what made them vanish up close) and
   pushes Misty out with swept sub-steps. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const C = require('../world-solids.js');

/* a muscle-like bundle: fibres along x, radius 1.2, centres on a ring in the y/z plane */
function bundle() {
    const caps = [];
    for (let ring = 1; ring <= 3; ring++) {
        const n = ring * 6, R = 2.2 + ring * 2.6;
        for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; const y = Math.cos(a) * R, z = Math.sin(a) * R; caps.push({ a: [-35, y, z], b: [35, y, z], r: 1.2 }); }
    }
    return C.makeBody(caps, []);
}
const R1 = 2.2 + 2.6; // first ring radius; a fibre sits at (x, R1, 0)

test('capsule distance: negative inside, positive outside, normal points out', () => {
    const c = new Float32Array([0, 0, 0, 10, 0, 0, 1, 0]), n = [0, 0, 0];
    assert.ok(Math.abs(C.capDist(5, 0.5, 0, c, 0, n) + 0.5) < 1e-6);
    assert.deepStrictEqual(n.map(v => Math.round(v)), [0, 1, 0]);
    assert.ok(Math.abs(C.capDist(5, 3, 0, c, 0, null) - 2) < 1e-6);
    assert.ok(Math.abs(C.capDist(-2, 0, 0, c, 0, null) - 1) < 1e-6, 'end caps are round');
    assert.ok(C.capDist(5, 0, 0, c, 0, n) < 0 && Math.hypot(...n) > 0.99, 'dead on the axis still gets a push direction');
});

test('a point inside a fibre is pushed exactly to its surface (+ its own radius) and the grid finds it', () => {
    const b = bundle();
    assert.ok(b.grid, 'many fibres use the grid broadphase');
    const P = [3, R1, 0.3];
    const r = C.push(b, P, 0.4);
    assert.ok(r.hit);
    const d = Math.hypot(P[1] - R1, P[2]);
    assert.ok(Math.abs(d - 1.6) < 1e-3, 'rests on the surface: ' + d);
    assert.ok(r.n[2] > 0.9, 'pushed outward');
    const free = [3, 0, 0];
    assert.strictEqual(C.push(b, free, 0.4).hit, false, 'the open core stays free');
});

test('no tunnelling: a fast move straight through a fibre stops on the near side', () => {
    const b = bundle();
    const P0 = [0, R1 - 3, 0], P1 = [0, R1 + 3, 0]; // 6 units in one frame, fibre 2.4 thick
    const r = C.sweep(b, P0, P1, 0.3, 0.2);
    assert.ok(r.hit);
    assert.ok(P1[1] < R1 - 1.2, 'stayed on the near side: ' + P1[1]);
    assert.ok(C.push(b, P1.slice(), 0.3).hit === false || C.push(b, P1.slice(), 0.29).hit === false, 'and is not inside');
});

test('a crevice too narrow for her: she stops at the last free spot instead of jittering between two fibres', () => {
    const b = C.makeBody([{ a: [-30, 0, 0], b: [30, 0, 0], r: 1 }, { a: [-30, 2.6, 0], b: [30, 2.6, 0], r: 1 }], []);
    const P0 = [0, 1.3, -3], P1 = [0, 1.3, 0]; // gap 0.6 wide, she is 0.8 wide
    C.sweep(b, P0, P1, 0.4, 0.1);
    assert.ok(C.pen(b, P1, 0.4) < 0.03, 'not left inside either fibre');
    assert.ok(P1[2] < -0.5, 'stopped outside the gap: ' + P1[2]);
});

test('slide: a glancing move keeps going along the surface instead of sticking', () => {
    const b = C.makeBody([{ a: [-30, 0, 0], b: [30, 0, 0], r: 1 }], []);
    const P0 = [0, 1.5, 0], P1 = [2, 1.0, 0];
    C.sweep(b, P0, P1, 0.5, 0.1);
    assert.ok(P1[0] > 1.8, 'slid along: ' + P1[0]);
    assert.ok(P1[1] >= 1.499, 'never inside: ' + P1[1]);
});

test('bounce: into-surface speed is removed and only partly given back (bounded rebound); moving away is untouched', () => {
    const v = [0, -4, 1];
    const imp = C.bounce(v, [0, 1, 0], 0.22, 0.92);
    assert.ok(Math.abs(imp - 4) < 1e-9);
    assert.ok(v[1] > 0 && v[1] <= 0.9, 'small rebound: ' + v[1]);
    assert.ok(Math.abs(v[2] - 0.92) < 1e-9, 'the slide keeps most of its speed');
    const w = [0, 2, 0]; assert.strictEqual(C.bounce(w, [0, 1, 0], 0.5, 1), 0); assert.deepStrictEqual(w, [0, 2, 0]);
});

test('camera spring arm: never ends inside a solid, and the arm length changes continuously as it sweeps across one', () => {
    const b = bundle();
    const T = [0, 0, 0];
    let prev = null, maxJump = 0;
    for (let i = 0; i <= 200; i++) {
        const a = -0.6 + i / 200 * 1.2; // sweep the arm across the first-ring fibre at angle 0
        const D = [0, Math.cos(a), Math.sin(a)];
        const L = C.arm(b, T, D, 14, 0.32);
        const P = [T[0] + D[0] * L, T[1] + D[1] * L, T[2] + D[2] * L];
        assert.strictEqual(C.insideIdx(b, P[0], P[1], P[2], 0.3), -1, 'camera outside every solid at a=' + a.toFixed(3));
        if (prev !== null && L < prev) maxJump = Math.max(maxJump, prev - L);
        prev = L;
    }
    assert.ok(maxJump < 3.5, 'pulls in without a huge pop: ' + maxJump);
    const open = C.arm(C.makeBody([], []), T, [0, 1, 0], 14, 0.3);
    assert.strictEqual(open, 14, 'nothing in the way: user zoom untouched');
});

test('inverted wall (gut tube / heart chamber): you stay inside it, and the camera arm stops at it', () => {
    const b = C.makeBody([], [{ a: [0, 0, -45], b: [0, 0, 45], r: 15.5 }]);
    const P = [16, 0, 0]; const r = C.push(b, P, 0.5);
    assert.ok(r.hit && Math.abs(Math.hypot(P[0], P[1]) - 15) < 1e-3);
    const L = C.arm(b, [0, 0, 0], [1, 0, 0], 30, 0.3);
    assert.ok(Math.abs(L - 15.2) < 0.01, 'arm stops before the wall: ' + L);
});

test('the gray blood cells only touch her when they really overlap in 3D, not when one passes in front or behind', () => {
    assert.ok(C.sphereHit([0, 0, 0], 0.3, [0.5, 0, 0], 0.35), 'same depth, overlapping: bump');
    assert.strictEqual(C.sphereHit([0, 0, 0], 0.3, [0, 0, 1.2], 0.35), null, 'flying behind her: no bump');
    assert.strictEqual(C.sphereHit([0, 0, 0], 0.3, [0, 0, -1.2], 0.35), null, 'flying in front: no bump');
});

test('proxies come from the real geometry: open fibre cylinder, capsule mito, sphere soma, short peg', () => {
    const I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    const rotZ = [0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 2, 3, 4, 1]; // rotation.z = PI/2 (y axis -> -x), at (2,3,4)
    const fib = C.proxiesFor({ type: 'CylinderGeometry', parameters: { radiusTop: 1.05, radiusBottom: 1.05, height: 70, openEnded: true } }, rotZ, false, []);
    assert.strictEqual(fib.length, 1);
    assert.ok(Math.abs(Math.abs(fib[0].a[0] - fib[0].b[0]) - (70 - 2 * 1.05 * 0.6)) < 1e-3, 'fibre runs along x');
    assert.ok(Math.abs(fib[0].r - 1.05) < 1e-6 && Math.abs(fib[0].a[1] - 3) < 1e-6);
    const cap = C.proxiesFor({ type: 'CapsuleGeometry', parameters: { radius: 0.28, length: 0.9 } }, I, false, []);
    assert.ok(Math.abs(cap[0].r - 0.28) < 1e-6 && Math.abs(cap[0].b[1] - 0.45) < 1e-6);
    const sph = C.proxiesFor({ type: 'SphereGeometry', parameters: { radius: 1 } }, I, true, []);
    assert.ok(sph[0].soft && Math.abs(sph[0].r - 0.95) < 1e-6);
    const peg = C.proxiesFor({ type: 'CylinderGeometry', parameters: { radiusTop: 0.85, radiusBottom: 0.85, height: 1.1 } }, I, false, []);
    assert.ok(Math.abs(peg[0].a[1] - peg[0].b[1]) < 0.2, 'a short peg is a ball, not a long capsule');
    assert.strictEqual(C.proxiesFor({ type: 'BufferGeometry', parameters: {} }, I, false, []).length, 0, 'thin merged tubes (dendrites) stay passable');
});

test('wired in: scene camera hook, Misty in and out of worlds, hunt crumbs, moving cells tagged, shipped offline', () => {
    const scene = read('body-world-3d-scene.js');
    assert.match(scene, /camera\.lookAt\(rig\.target\);\s*\n[\s\S]{0,200}LWS\.camera\(camera, rig\.target, dt\)/, 'camera spring arm right after the rig places it');
    assert.match(scene, /rbc\.userData\.hubFlow = rb/, 'gray blood cells are bumpable');
    assert.match(scene, /m\.userData\.hubBump = 0\.55/, 'white cells are bumpable');
    const fl = read('misty-flight.js');
    assert.match(fl, /solidHit\(ctx, k, still, true, mode === 'auto'\)/, 'open world');
    assert.match(fl, /solidHit\(ctx, k, still, false, free\);\s*\n\s*\/\* the camera keeps her in view/, 'inside a world, before the camera follows her');
    assert.match(fl, /LS\.misty\(S\.p, S\.v, rad, \{ hub \}\)/);
    assert.doesNotMatch(fl.slice(fl.indexOf('function solidHit'), fl.indexOf('function place(')), /energy|LowiMistyHunt|penal/i, 'no penalty of any kind for a knock');
    assert.match(read('misty-hunt.js'), /LowiWorldSolids\.clearPoint\(reg, q, 0\.5\)/, 'crumbs never spawn inside a solid');
    assert.match(read('body-world-regions.js'), /m\.userData\.flow = st/, 'red cells inside worlds bump too');
    const html = read('index.html');
    assert.ok(html.indexOf('world-solids.js?v=') > 0 && html.indexOf('world-solids.js?v=') < html.indexOf('misty-flight.js?v='));
    assert.ok(/"world-solids\.js"/.test(read('sw.js')));
    const src = read('world-solids.js');
    assert.doesNotMatch(src, /requestAnimationFrame|setInterval/, 'no loop of its own');
});
