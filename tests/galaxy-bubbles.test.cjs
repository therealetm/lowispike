/* galaxy bubbles + currents (Oct 17, E-man): every bubble out in the galaxy can be entered, and the strings between the bubbles
   carry Misty like ocean currents: with the flow she is fast, against it she needs a full push, sideways she gets out. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const B = require(path.join(ROOT, 'galaxy-bubbles.js'));
const G = require(path.join(ROOT, 'misty-galaxy.js'));
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

/* a straight thread along x from 0 to 100, 40 points like the real ones */
const line = (() => { const a = new Float32Array(40 * 3); for (let k = 0; k < 40; k++) a[k * 3] = 100 * k / 39; return a; })();
const at = (x, y, z, dir, top = 10, cap = 10) => { const h = B.nearestOnPath(line, x, y, z); return { h, c: B.currentAt(h, dir, cap, top, x, y, z) }; };

test('the closest point on a thread: distance, share along it and the tangent', () => {
    const h = B.nearestOnPath(line, 50, 3, 4);
    assert.ok(Math.abs(h.d - 5) < 1e-6); assert.ok(Math.abs(h.u - 0.5) < 1e-6);
    assert.ok(Math.abs(h.tx - 1) < 1e-6 && Math.abs(h.ty) < 1e-6);
    const e = B.nearestOnPath(line, -20, 0, 0); assert.ok(Math.abs(e.u) < 1e-9 && Math.abs(e.d - 20) < 1e-6, 'clamped at the end');
    assert.strictEqual(B.nearestOnPath(new Float32Array(3), 0, 0, 0), null);
});

test('the current carries her along the flow, strongest mid-thread, softer at the membranes', () => {
    const mid = at(50, 0, 0, 1).c, end = at(2, 0, 0, 1).c, back = at(50, 0, 0, -1).c;
    assert.ok(mid.x > 0 && Math.abs(mid.x - B.GB.FLOW * 10) < 1e-6, 'FLOW share of her top speed in the middle');
    assert.ok(end.x > 0 && end.x < mid.x * 0.5, 'softer where it meets a membrane');
    assert.ok(Math.abs(back.x + mid.x) < 1e-6, 'the other way on a thread flowing the other way');
    assert.ok(B.flowProfile(0) >= B.GB.END - 1e-9 && B.flowProfile(0.5) === 1);
});

test('with the flow she is faster, against it a full push still gets through slowly, a weak push is carried back', () => {
    const top = 10, c = at(50, 0, 0, 1, top).c.x;
    assert.ok(top + c > top * 1.5, 'with the flow');
    const against = top - c; assert.ok(against > 0 && against < top * 0.5, 'full push against: slow, but progress');
    assert.ok(top * 0.4 - c < 0, 'a weak push against is carried back');
});

test('she is drawn to the core but can always steer out sideways; far from a thread nothing pulls', () => {
    const top = 10, side = at(50, 4, 0, 1, top).c;
    assert.ok(side.y < 0, 'drawn towards the core');
    assert.ok(Math.abs(side.y) < top * 0.5, 'the draw is always weaker than her own speed');
    assert.ok(B.GB.PULL < 1 && B.GB.FLOW < 1, 'never stronger than she is');
    const far = at(50, 10.5, 0, 1, top).c; assert.strictEqual(far.k, 0); assert.strictEqual(far.x, 0);
    assert.ok(B.captureK(0, 10) === 1 && B.captureK(10, 10) === 0);
});

test('how close she is caught scales with her size, within bounds', () => {
    assert.strictEqual(B.capOf(0.1), B.GB.CAP_MIN); assert.strictEqual(B.capOf(100), B.GB.CAP_MAX);
    assert.ok(B.capOf(3) > B.capOf(2));
});

function hold(s, secs, inp, dt = 1 / 60) { let fires = 0, h = { s, p: 0 }; for (let t = 0; t < secs - 1e-9; t += dt) { h = B.pressHold(h.s, Object.assign({ dt }, inp)); if (h.fire) fires++; } return { s: h.s, p: h.p, fires }; }

test('pushing into a membrane for a moment lets her through exactly once; a tired day takes a little longer', () => {
    let r = hold(null, B.GB.PRESS - 0.1, { pushing: true, k: 1 }); assert.strictEqual(r.fires, 0);
    r = hold(r.s, 0.2, { pushing: true, k: 1 }); assert.strictEqual(r.fires, 1);
    r = hold(r.s, 2, { pushing: true, k: 1 }); assert.strictEqual(r.fires, 0, 'no second fire while still pushing');
    const weak = hold(null, B.GB.PRESS + 0.1, { pushing: true, k: 0 }); assert.strictEqual(weak.fires, 0, 'tired: not yet');
    assert.strictEqual(hold(null, B.GB.PRESS * (1 + B.GB.WEAK) + 0.05, { pushing: true, k: 0 }).fires, 1, 'but she gets in');
});

test('a short slip is forgiven, letting go resets', () => {
    let r = hold(null, 0.3, { pushing: true }); r = hold(r.s, 0.1, { pushing: false }); assert.ok(r.p > 0.5);
    r = hold(r.s, 0.4, { pushing: false }); assert.strictEqual(r.p, 0);
    assert.strictEqual(hold(null, 5, { pushing: false }).fires, 0, 'just touching never goes in');
});

test('inside, the camera comes in so the bubble surrounds her, and she can roam almost to its membrane', () => {
    assert.ok(B.camInside(6, 5) >= B.GB.CAM_MIN);
    assert.ok(B.camInside(20, 5) < B.camInside(50, 5));
    assert.ok(B.camInside(1000, 5) <= B.GB.CAM_MAX);
    assert.ok(B.camInside(30, 5) < G.GAL.D, 'closer than out in the galaxy');
    assert.ok(B.insideLimit(20, 1) > 19 && B.insideLimit(20, 1) < 20);
    assert.ok(B.insideLimit(6, 50) >= 6 * 0.4, 'never squeezed to nothing');
});

test('the galaxy reaches past its farthest world, so every bubble you see can be reached', () => {
    /* body-world-3d-scene.js buildCosmos: worlds out to 340 + 460 = 800 from home, radius up to 56 */
    assert.ok(G.GAL.LOOP > 800 + 56 && G.GEN.MIN > 800 + 56, 'no wall before the farthest hand-made world (limitless spirit world)');
    assert.strictEqual(B.GB.FLOOR, G.GAL.D);
    assert.ok(G.camDist(900, 6.5, 11) <= G.GAL.D_MAX + 1e-9);
});

test('wired in: galaxy step hands over to it, cam asks it, resets reach it, the threads carry their flow', () => {
    const mg = read('misty-galaxy.js'), sc = read('body-world-3d-scene.js');
    assert.match(mg, /GBB\.step\(ctx, S, V, mode, mag, K\)\)\) bump\(a, S\)/);
    assert.match(mg, /LowiGalaxyBubbles\.camDist\(ctx, S\)/);
    assert.ok((mg.match(/LowiGalaxyBubbles\.reset\(ctx, S\)/g) || []).length >= 2, 'on the way home and when the flight ends');
    assert.match(sc, /threads\.userData\.paths = paths/);
    assert.match(sc, /a: i, b: q\[0\], dir: 1/);
    assert.match(sc, /if \(k === 0\) pa\.dir = sg; sparks\.push\(\{ j, o, s: sp \* pa\.dir \}\)/, 'the sparks travel with the current');
    assert.match(sc, /Math\.max\(rig\.dist, rig\.cosmosMin \|\| 0\)/);
    assert.match(sc, /mf-galaxy/);
    const html = read('index.html'), i1 = html.indexOf('<script src="misty-galaxy.js?v='), i2 = html.indexOf('<script src="galaxy-bubbles.js?v=');
    assert.ok(i1 > 0 && i2 > i1, 'loaded right after misty-galaxy.js');
    assert.match(read('sw.js'), /"galaxy-bubbles\.js"/);
});

test('honest: it gives no XP, crumbs or energy; only YOUR steering or a planned ride on the tour is carried (the way home never)', () => {
    const src = read('galaxy-bubbles.js');
    assert.ok(!/LowiXP|addXP|award|LowiMistyHunt|crumb\(|energy\.add/i.test(src.replace(/\/\*[\s\S]*?\*\//g, '')));
    assert.match(src, /drive = mode === 'drive'/);
    /* adventure tiers (Oct 17): the tour (autopilot / Level 6 adventure) rides a current only while it means to (S.exRide) */
    assert.match(src, /ride = auto && !!S\.exRide/);
    assert.match(src, /if \(\(drive \|\| ride\) && !ctx\.reduced\)/);
    assert.match(src, /mode === 'home' \|\| \(auto && aimB !== B\.gb\)\) \{ leave\(/);
});
