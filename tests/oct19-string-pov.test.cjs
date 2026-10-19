/* Oct 19 2026 (Emmanuel, call): on autopilot out in the spirit world Misty rides the strings from bubble to bubble. As she gets
   close to a string and rides it, the camera shifts into a tiny-scale POV beside her on the string: "Almost like Ant-Man, getting
   smaller to the cellular perspective, and all the world around it is bigger." "It's not just a zoom. It's a shift in POV."
   When she leaves the string (flies herself across a gap) the camera smoothly returns to the normal view. Reduce Motion: no POV. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const P = require(path.join(ROOT, 'string-pov.js'));

const riding = { gx: true, mode: 'auto', riding: 3, inside: -1, reduced: false };

test('the POV is wanted only on autopilot, out in the galaxy, while she rides a string and is not inside a bubble', () => {
    assert.strictEqual(P.wantOn(riding), true);
    for (const bad of [{ gx: false }, { mode: 'drive' }, { mode: 'home' }, { mode: '' }, { riding: -1 }, { inside: 2 }, { reduced: true }]) {
        assert.strictEqual(P.wantOn(Object.assign({}, riding, bad)), false, JSON.stringify(bad));
    }
});

test('a short drop off the string does not flicker the POV; a real gap lets it go after the grace time', () => {
    let g = P.gate(null, { on: true, dt: 0.1 });
    assert.strictEqual(g.want, 1);
    for (let t = 0; t < P.SP.GRACE - 0.15; t += 0.05) g = P.gate(g, { on: false, dt: 0.05 });
    assert.strictEqual(g.want, 1, 'still on inside the grace time');
    g = P.gate(g, { on: true, dt: 0.05 });
    for (let t = 0; t < P.SP.GRACE + 0.2; t += 0.05) g = P.gate(g, { on: false, dt: 0.05 });
    assert.strictEqual(g.want, 0, 'off after a real gap');
    assert.strictEqual(P.gate(g, { on: true, reduced: true, dt: 0.05 }).want, 0, 'Reduce Motion never wants it');
});

test('settling onto a string (the capture flickers on and off) never zooms the camera in and out: close to the string it holds', () => {
    const near = { gx: true, mode: 'auto', si: 2, inside: -1, reduced: false, near: P.SP.HOLD - 1 };
    assert.strictEqual(P.holdOn(near), true);
    for (const bad of [{ near: P.SP.HOLD + 1 }, { mode: 'drive' }, { inside: 0 }, { reduced: true }, { si: -1 }, { gx: false }]) assert.strictEqual(P.holdOn(Object.assign({}, near, bad)), false, JSON.stringify(bad));
    let g = P.gate(null, { on: true, dt: 0.05 });
    for (let t = 0; t < 10; t += 0.05) { g = P.gate(g, { on: Math.sin(t * 7) > 0.6, hold: true, dt: 0.05 }); assert.strictEqual(g.want, 1, 'held at ' + t.toFixed(2)); }
    assert.strictEqual(P.gate({ want: 0, off: 5 }, { on: false, hold: true, dt: 0.05 }).want, 0, 'holding alone never starts it: only riding does');
    /* close to the string but no longer carried (a stop at the bubble at its end): that is leaving the string, so it lets go */
    g = P.gate(null, { on: true, dt: 0.05 }); let t = 0;
    while (g.want && t < 20) { g = P.gate(g, { on: false, hold: true, dt: 0.05 }); t += 0.05; }
    assert.ok(t > P.SP.HOLD_T && t < P.SP.HOLD_T + P.SP.GRACE + 0.2, 'let go after ' + t.toFixed(2) + ' s');
});

test('the shift is a spring: smooth in and out, no overshoot, no jump, and it can turn round mid-way without a jolt', () => {
    const dt = 1 / 60; let s = { k: 0, v: 0 }, t = 0, maxStep = 0;
    while (s.k < 0.97 && t < 5) { const k0 = s.k; s = P.spring(s, 1, dt); maxStep = Math.max(maxStep, Math.abs(s.k - k0)); t += dt; }
    assert.ok(t > 0.6 && t < 2.6, 'in over about a second or two, took ' + t.toFixed(2));
    for (let i = 0; i < 300; i++) { s = P.spring(s, 1, dt); assert.ok(s.k <= 1.0001, 'no overshoot'); }
    assert.ok(maxStep < 0.05, 'no jump in one frame: ' + maxStep.toFixed(3));
    /* turn round half way: the velocity carries on smoothly instead of flipping */
    s = { k: 0, v: 0 }; for (let i = 0; i < 40; i++) s = P.spring(s, 1, dt);
    const v0 = s.v, s2 = P.spring(s, 0, dt);
    assert.ok(Math.abs(s2.v - v0) < Math.abs(v0) * 0.5 + 0.2, 'velocity continuous on reversal');
    assert.ok(Math.abs(s2.k - s.k) < 0.05);
    s = { k: 0.4, v: 0 }; assert.strictEqual(P.spring(s, 0, dt, true).k, 0, 'Reduce Motion: straight back, no animation');
});

test('it is a shift to tiny scale, not a slight zoom: the camera goes in to a small share of the galaxy distance', () => {
    const nominal = 64, d0 = 6.5;
    assert.strictEqual(P.povDist(nominal, d0, 0), nominal, 'k 0 = the normal view exactly');
    const tiny = P.povDist(nominal, d0, 1);
    assert.ok(tiny <= nominal / 12, 'POV distance ' + tiny + ' vs ' + nominal);
    assert.ok(tiny >= 1, 'never inside her');
    let prev = nominal;
    for (let k = 0.05; k <= 1.0001; k += 0.05) { const d = P.povDist(nominal, d0, k); assert.ok(d < prev + 1e-9, 'shrinks steadily'); prev = d; }
    /* even on a log scale, so the shrinking feels like one continuous move (no slow start then a rush) */
    const mid = P.povDist(nominal, d0, 0.5);
    assert.ok(Math.abs(mid - Math.sqrt(nominal * tiny)) < 0.01, 'half way = geometric middle');
});

test('the camera sits behind her on the string, a little above, looking the way the current carries her', () => {
    const f = [1, 0, 0], up = [0, 1, 0];
    const a = P.camAngles(f, up, 1.2);
    const o = [Math.cos(a.pitch) * Math.sin(a.yaw), Math.sin(a.pitch), Math.cos(a.pitch) * Math.cos(a.yaw)];
    assert.ok(o[0] < -0.85, 'behind her: ' + o.map(v => v.toFixed(2)));
    assert.ok(o[1] > 0.1 && o[1] < 0.5, 'a little above');
    assert.ok(Math.abs(a.pitch) <= 1.2);
    const b = P.camAngles([0, 0, -1], up, 1.2), ob = [Math.cos(b.pitch) * Math.sin(b.yaw), Math.sin(b.pitch), Math.cos(b.pitch) * Math.cos(b.yaw)];
    assert.ok(ob[2] > 0.85, 'works for any heading');
    assert.ok(Math.abs(P.nearAngle(0.1, 0.1 + Math.PI * 2) - 0.1) < 1e-9, 'never turns the long way round');
});

test('the string under her: "up" is perpendicular to the string and the huge string sits just under her', () => {
    const f = [0.6, 0.8, 0], n = P.seatUp(f, [0, 1, 0]);
    assert.ok(Math.abs(n[0] * f[0] + n[1] * f[1] + n[2] * f[2]) < 1e-9, 'perpendicular');
    assert.ok(Math.abs(Math.hypot(n[0], n[1], n[2]) - 1) < 1e-9 && n[1] > 0, 'unit, pointing up');
    const v = P.seatUp([0, 1, 0], [0, 1, 0], [0, 0, 1]);
    assert.ok(Math.abs(Math.hypot(v[0], v[1], v[2]) - 1) < 1e-9, 'a vertical string still gets an up (the fallback)');
    const hs = 0.12, R = P.tubeR(hs);
    assert.ok(R >= hs * 4, 'the string is huge next to her: radius ' + R.toFixed(2) + ' vs her ' + hs);
    assert.ok(Math.abs(P.seatOffset(R, hs) - (R + hs * P.SP.SEAT)) < 1e-9);
});

test('the closest point on a string gives the flow direction (the points are in flow order)', () => {
    const arr = [0, 0, 0, 10, 0, 0, 20, 5, 0];
    const h = P.nearest(arr, 4, 2, 0);
    assert.ok(Math.abs(h.cx - 4) < 1e-9 && Math.abs(h.cy) < 1e-9 && Math.abs(h.tx - 1) < 1e-9);
    assert.ok(Math.abs(h.u - 4 / (10 + Math.hypot(10, 5))) < 1e-9, "how far along");
    assert.strictEqual(P.nearest([], 0, 0, 0), null);
});

test('wiring: loaded after galaxy-bubbles.js, cached offline, and the galaxy camera hands its distance to the POV', () => {
    const html = read('index.html');
    const gb = html.indexOf('<script src="galaxy-bubbles.js'), sp = html.indexOf('<script src="string-pov.js'), mg = html.indexOf('<script src="misty-galaxy.js');
    assert.ok(sp > 0 && sp > gb && sp > mg, 'string-pov.js after the galaxy modules');
    assert.strictEqual((html.match(/<script src="string-pov\.js/g) || []).length, 1);
    const sw = read('sw.js');
    assert.ok(/STATIC = \[[^\]]*"string-pov\.js"/.test(sw), 'offline cache');
    const g = read('misty-galaxy.js');
    const cam = g.slice(g.indexOf('function cam(ctx, S)'), g.indexOf('function speed(ctx, S)'));
    assert.ok(/LowiStringPov/.test(cam), 'cam() asks the POV');
    const speed = g.slice(g.indexOf('function speed(ctx, S)'), g.indexOf('function reset(ctx, S)'));
    assert.ok(/G\.nd/.test(speed), 'her pace uses the galaxy distance, not the POV camera, so she does not slow to a crawl on the string');
    const step = g.slice(g.indexOf('function step('), g.indexOf('function cam(ctx, S)'));
    assert.ok(/G\.nd \/ ctx\.r\.dist/.test(step) && /S\.hs = hs/.test(step), 'the currents see her galaxy-scale size, so the camera coming in never weakens the grip (no hunting)');
    const reset = g.slice(g.indexOf('function reset(ctx, S)'), g.indexOf('W.LowiMistyGalaxy = {'));
    assert.ok(/LowiStringPov[^;]*reset/.test(reset), 'a reset never leaves the camera in close');
});

test('cheap: the big string is built once per string (not per frame), never casts shadows, and Reduce Motion skips it all', () => {
    const src = read('string-pov.js');
    assert.strictEqual((src.match(/new T\.TubeGeometry\(/g) || []).length, 1, 'one place builds the tube');
    const build = src.slice(src.indexOf('function tubeFor('), src.indexOf('function tubeFor(') + 900);
    assert.ok(/cache|\.si === si|B\.tube\.si/.test(build), 'cached per string');
    assert.ok(!/castShadow\s*=\s*true|receiveShadow\s*=\s*true|shadowMap/.test(src), 'no shadows');
    assert.ok(/dispose\(\)/.test(src), 'the old string is freed');
    assert.ok(/reduced/.test(src));
});

/* Release rebase (Oct 19, on top of build 20261019-091732, the string-freeze fix): the tour now cuts each string to the points she can
   reach for her size (galaxy-bubbles span/rest with S.hs). While the POV camera is in, S.hs shrinks about 20x with it (she stays the
   same size on screen), but the currents and the membranes keep her galaxy-scale size. A string cut for the tiny size ends inside the
   far bubble's push for her real size: she could not reach its last point and would hang there for the 3 s no-progress limit at the
   end of every ride. So the tour reads her galaxy-scale size too (S.hsG, kept by misty-galaxy.js), the same one the currents see. */
test('POV + string tour: the tour plans with her galaxy-scale size, so the end of every string stays reachable with the camera in close', () => {
    const B = require(path.join(ROOT, 'galaxy-bubbles.js'));
    const R = 23, HS = 15.2, k = 22; /* the POV camera is ~22x closer than the galaxy camera */
    const a = { x: 0, y: 120, z: 0, r: R }, b = { x: 2 * R + 80, y: 120, z: 0, r: R }, pts = [];
    for (let i = 0; i < 40; i++) pts.push({ x: R * 0.98 + (b.x - 2 * R * 0.98) * i / 39, y: 120, z: 0 });
    const reach = hs => { const sp = B.span(pts, [a, b], hs), q = pts[sp.end]; return Math.hypot(q.x - b.x, q.y - b.y, q.z - b.z) - B.slide(R, HS); };
    assert.ok(reach(HS / k) < 0, 'cut for the tiny POV size, the last point sits inside the membrane push she really has (the bug)');
    assert.ok(reach(HS) > 0, 'cut for her galaxy-scale size it is off the push');
    /* the size the tour uses: galaxy-scale out in the galaxy, her own anywhere else */
    const X = require(path.join(ROOT, 'misty-explore.js'));
    assert.strictEqual(typeof X.hsOf, 'function', 'misty-explore core.hsOf: the size the tour plans with');
    assert.strictEqual(X.hsOf({ gx: true, hs: HS / k, hsG: HS }), HS);
    assert.strictEqual(X.hsOf({ gx: false, hs: 0.4, hsG: HS }), 0.4, 'outside the galaxy a stale galaxy size is ignored');
    assert.strictEqual(X.hsOf({ gx: true, hs: 3 }), 3, 'without misty-galaxy.js her own size');
    /* wired: every strand / rest in the tour goes through it, and misty-galaxy keeps S.hsG every galaxy frame and clears it on reset */
    const e = read('misty-explore.js');
    assert.ok(!/G\.strand\([^)]*S\.hs\)|rest\([^)]*S\.hs\)/.test(e), 'no strand() or rest() call in the tour reads the camera-scaled S.hs');
    assert.strictEqual((e.match(/G\.strand\([^)]*hsOf\(S\)\)/g) || []).length, 2);
    assert.strictEqual((e.match(/rest\([^)]*hsOf\(S\)\)/g) || []).length, 3);
    const g = read('misty-galaxy.js');
    const step = g.slice(g.indexOf('function step('), g.indexOf('function cam(ctx, S)'));
    assert.match(step, /S\.hsG = \(hs \|\| 1\) \* sc;/);
    const reset = g.slice(g.indexOf('function reset(ctx, S)'), g.indexOf('W.LowiMistyGalaxy = {'));
    assert.match(reset, /S\.hsG = 0/);
});
