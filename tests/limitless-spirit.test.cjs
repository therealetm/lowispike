/* limitless spirit world (Oct 17, E-man, handoff item 11): no invisible walls out in the galaxy; the deep dark between galaxies
   carries Misty round to the far side (a loop, nothing new is built), the cosmos fades out there so nothing jumps, Home is always
   reachable and looping pays nothing. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const G = require(path.join(ROOT, 'misty-galaxy.js'));
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const GAL = G.GAL;

/* a straight flight along x, applying the loop the way step() does */
function fly(x0, v, secs, dt = 1 / 30) {
    let x = x0, loops = 0, maxAbs = 0, jumps = 0;
    for (let t = 0; t < secs; t += dt) {
        x += v * dt;
        const L = Math.abs(x), k = G.loopK(L);
        if (k !== 1) { x *= k; loops++; } else if (Math.abs(v * dt) > 50) jumps++;
        maxAbs = Math.max(maxAbs, Math.abs(x));
    }
    return { x, loops, maxAbs, jumps };
}

test('no outer wall: the old galaxy edge (R) no longer holds her', () => {
    const src = read('misty-galaxy.js');
    assert.ok(!/if \(L > GAL\.R\) \{ S\.p\.multiplyScalar/.test(src), 'the hard clamp at GAL.R is gone');
    assert.strictEqual(G.loopK(GAL.R + 1), 1, 'past the old edge she just keeps flying');
    assert.strictEqual(G.loopK(GAL.LOOP - 0.01), 1);
});

test('the loop: past LOOP she comes out the same distance away on the far side, still heading the same way', () => {
    const L = GAL.LOOP + 3, k = G.loopK(L);
    assert.ok(k < 0, 'opposite side');
    assert.ok(Math.abs(Math.abs(L * k) - (GAL.LOOP - 3)) < 1e-9, 'same distance from the loop point, mirrored');
    assert.strictEqual(G.loopK(Math.abs(L * k)), 1, 'never loops twice in a row (no flicker)');
});

test('flying straight on forever: comes round again and again, never farther than LOOP from home, unbounded flight stays bounded', () => {
    const r = fly(50, 20, 1200);
    assert.ok(r.loops >= 3, 'came round ' + r.loops + ' times');
    assert.ok(r.maxAbs <= GAL.LOOP + 1, 'max ' + r.maxAbs);
});

test('nothing in view at the loop: the cosmos is gone in the deep before the camera can get near the loop point', () => {
    assert.strictEqual(G.deepK(0), 1);
    assert.strictEqual(G.deepK(300), 1, 'Home and Community untouched');
    assert.strictEqual(G.deepK(GAL.DEEP0), 1);
    assert.strictEqual(G.deepK(GAL.DEEP1), 0);
    /* the camera trails her by at most D_MAX (plus its easing): at the loop it is still past DEEP1 on both sides */
    assert.ok(GAL.LOOP - GAL.D_MAX * 1.3 > GAL.DEEP1, 'camera at the loop is in the deep');
    /* the farthest worlds of the cosmos (body-world-3d-scene.js: up to 800 + r 56 out) stay fully drawn until the camera is past them */
    assert.ok(GAL.DEEP0 > 860);
    let prev = 1; for (let c = 900; c <= 1200; c += 5) { const d = G.deepK(c); assert.ok(d <= prev + 1e-9 && prev - d < 0.08, 'gentle fade at ' + c); prev = d; }
});

test('the scene and the flight agree on where the deep is', () => {
    const sc = read('body-world-3d-scene.js');
    const m = sc.match(/const COSMOS = \{[^}]*DEEP0: (\d+), DEEP1: (\d+)/);
    assert.ok(m, 'COSMOS.DEEP0 / DEEP1 in the scene');
    assert.strictEqual(+m[1], GAL.DEEP0); assert.strictEqual(+m[2], GAL.DEEP1);
    assert.match(sc, /deep = 1 - smoothC\(COSMOS\.DEEP0, COSMOS\.DEEP1, camL\)/);
    /* the sky rides with the camera out there, so it is the same on both sides of the loop */
    assert.match(sc, /C\.stars\.position\.copy\(skyTmp\); C\.farCells\.position\.copy\(skyTmp\)/);
    assert.match(sc, /skyW = smoothC\(COSMOS\.OUT \+ 20, COSMOS\.DEEP0 - 100, camL\)/);
    /* battery: out in the deep the worlds are not drawn at all */
    assert.match(sc, /C\.deepOn !== dv/);
});

test('Home always possible: the long way home is quicker the farther out she is, and the farthest point is about 20 s away', () => {
    assert.strictEqual(G.homeK(0), 1); assert.strictEqual(G.homeK(GAL.R), 1, 'near home nothing changes');
    assert.strictEqual(G.homeK(GAL.LOOP), GAL.HOME_MAX);
    /* weakest Misty (misty-flight speed out 1.5 u/s, home x1.25), camera all the way out */
    let L = GAL.LOOP, t = 0; const dt = 1 / 30;
    while (L > GAL.R && t < 120) { const v = 1.5 * 1.25 * G.speedK(G.camDist(L, 6.5 * 1.16, 11), 6.5) * G.homeK(L); L -= v * dt; t += dt; }
    assert.ok(t < 30, 'weak Misty gets back among the worlds in ' + t.toFixed(1) + ' s');
    const src = read('misty-galaxy.js');
    assert.match(src, /home \? homeK\(S\.p\.length\(\)\) : 1/);
    /* the flight ending far out never leaves the camera in the deep */
    assert.match(src, /r\.target\.length\(\) > 60\) \{ r\.fly = /);
    /* and the camera is carried round with her in the same frame, even mid-glide (Oct 17 far-out fix: r.fly is dropped first) */
    assert.match(src, /if \(r && r\.target\) \{ r\.fly = null; r\.target\.add\(G\.tmp\); \}/);
    /* getting home stays possible, but holding on never forces her home: the loop carries her round beside home (loopTo), not
       straight back through her own bubble */
    assert.match(src, /const q = loopTo\(\[S\.p\.x, S\.p\.y, S\.p\.z\], \[S\.v\.x, S\.v\.y, S\.v\.z\], G\.loops\)/);
    assert.ok(!/multiplyScalar\(loopK\(L\) - 1\)/.test(src), 'the old straight-through loop is gone');
});

test('looping pays nothing and builds nothing', () => {
    const src = read('misty-galaxy.js');
    const stepSrc = src.slice(src.indexOf('function step('), src.indexOf('function bump('));
    assert.ok(!/\bxp\b|award|reward|crumb|LowiMistyHunt|addXp/i.test(stepSrc.replace(/\/\*[\s\S]*?\*\//g, '')), 'no rewards in the galaxy flight');
    const gx = src.slice(src.indexOf('if (S.gx) {'), src.indexOf('/* pushing on the edge */')).replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(gx.length > 100 && !/\bnew\b|\.clone\(/.test(gx), 'no allocations per frame out there');
});

test('new space is made up as she flies: same place, same world; nothing stored; only a handful near the camera', () => {
    const GEN = G.GEN, a = {}, b = {};
    let found = 0;
    for (let i = -12; i <= 12; i++) for (let k = -12; k <= 12; k++) {
        const ha = G.deepWorld(i, 1, k, a), hb = G.deepWorld(i, 1, k, b);
        assert.strictEqual(ha, hb);
        if (!ha) continue;
        found++;
        assert.deepStrictEqual(a, b, 'deterministic');
        const L = Math.hypot(a.x, a.y, a.z);
        assert.ok(L >= GEN.MIN && L <= GEN.MAX, 'only out past the hand-made galaxy and away from the loop point: ' + L);
        assert.ok(a.r >= GEN.R0 && a.r <= GEN.R1);
        assert.ok(a.x >= i * GEN.CELL && a.x <= (i + 1) * GEN.CELL, 'inside its own cube');
    }
    assert.ok(found > 40, 'plenty of new worlds out there (' + found + ')');
    /* along a long flight the nearest few are always available and never more than the scene's glass worlds */
    let seen = new Set(), most = 0;
    for (let x = 1100; x < 2500; x += 20) {
        const near = G.deepNear(x, 30, -0.4 * x, 12);
        most = Math.max(most, near.length);
        near.forEach((w, i) => { seen.add(w.key); assert.ok(w.d <= GEN.SEE + 60); if (i) assert.ok(w.d >= near[i - 1].d, 'nearest first'); });
    }
    assert.ok(most <= 12 && most >= 3, 'a handful at a time: ' + most);
    assert.ok(seen.size > 25, 'new worlds keep coming as she flies on: ' + seen.size);
    assert.strictEqual(G.deepNear(0, 0, 0, 12).length, 0, 'none at home');
});

test('new space fades in and out with the camera: none at home, none at the loop point', () => {
    assert.strictEqual(G.genK(0), 0); assert.strictEqual(G.genK(300), 0);
    assert.strictEqual(G.genK(G.GEN.MIN), 1); assert.strictEqual(G.genK(2000), 1);
    assert.strictEqual(G.genK(G.GAL.LOOP - G.GAL.D_MAX * 1.3), 0, 'nothing new in view when she comes round');
    assert.ok(G.GEN.MAX + G.GEN.SEE < G.GAL.LOOP + 100 || G.genK(G.GEN.MAX) === 1);
    const sc = read('body-world-3d-scene.js');
    assert.match(sc, /function deepStep\(C, camL, dt, tt, calm\)/);
    assert.match(sc, /for \(let i = 0; i < \(small \? 8 : 12\); i\+\+\)/, 'a fixed handful of glass worlds, built once');
    assert.match(sc, /GC\.deepNear\(cp\.x, cp\.y, cp\.z, slots\.length\)/);
    assert.match(sc, /1 - smoothC\(SEE - 170, SEE, d\)/, 'each fades in from GEN.SEE');
    /* built once in buildCosmos, never inside deepStep */
    const ds = sc.slice(sc.indexOf('function deepStep('), sc.indexOf('function buildCosmos('));
    assert.ok(!/new THREE\./.test(ds), 'nothing is built while she flies');
    /* not solid: the galaxy's bump only knows the hand-made worlds */
    assert.ok(!/deepSlots|deepNear/.test(read('misty-galaxy.js').slice(read('misty-galaxy.js').indexOf('function bump('), read('misty-galaxy.js').indexOf('function bump(') + 1500)));
});
