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
    const r = fly(50, 20, 600);
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
    /* and the camera is carried round with her in the same frame */
    assert.match(src, /ctx\.r\.target\.add\(G\.tmp\)/);
});

test('looping pays nothing and builds nothing', () => {
    const src = read('misty-galaxy.js');
    const stepSrc = src.slice(src.indexOf('function step('), src.indexOf('function bump('));
    assert.ok(!/\bxp\b|award|reward|crumb|LowiMistyHunt|addXp/i.test(stepSrc.replace(/\/\*[\s\S]*?\*\//g, '')), 'no rewards in the galaxy flight');
    const gx = src.slice(src.indexOf('if (S.gx) {'), src.indexOf('/* pushing on the edge */')).replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(gx.length > 100 && !/\bnew\b|\.clone\(/.test(gx), 'no allocations per frame out there');
});
