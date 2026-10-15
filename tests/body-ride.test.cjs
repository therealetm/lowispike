// Moving cell ride: the camera travels by itself along a vessel path; drag/gyro look eases back to the path; stops pop along the route.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const R = require('../body-ride-core.js');
const root = path.join(__dirname, '..');

test('every place has a winding route from the hub that ends at the place', () => {
    for (const id of Object.keys(R.PLACES)) {
        const r = R.route(id);
        assert.ok(r.points.length >= 6);
        assert.deepEqual(r.points[0], [0, 0, 0]);
        assert.deepEqual(r.points[r.points.length - 1], R.PLACES[id].pos);
        const end = r.curve.at(1); assert.ok(Math.hypot(end[0] - R.PLACES[id].pos[0], end[1] - R.PLACES[id].pos[1], end[2] - R.PLACES[id].pos[2]) < 1e-6);
        assert.ok(r.curve.length >= Math.hypot(...R.PLACES[id].pos) * 0.99);
    }
    assert.deepEqual(R.route('gut').points, R.route('gut').points, 'deterministic');
});
test('aliases from other builds map to ride places', () => {
    assert.equal(R.placeId('muscles'), 'muscle'); assert.equal(R.placeId('lung'), 'lungs'); assert.equal(R.placeId('nope'), 'gut');
});
test('uses the shared 3D world layout when it exposes regions or a vessel path', () => {
    const r = R.route('liver', { hub: { pos: [1, 2, 3] }, regions: [{ id: 'liver', pos: [50, 0, -50] }] });
    assert.deepEqual(r.points[0], [1, 2, 3]); assert.deepEqual(r.points[r.points.length - 1], [50, 0, -50]);
    const v = R.route('heart', { vesselPath: () => [[0, 0, 0], { x: 5, y: 5, z: -5 }, [9, 9, -20]] });
    assert.deepEqual(v.points, [[0, 0, 0], [5, 5, -5], [9, 9, -20]]);
});
test('arc-length sampling moves the camera at an even pace', () => {
    const c = R.route('brain').curve, step = [];
    for (let i = 0; i < 20; i++) { const a = c.at(i / 20), b = c.at((i + 1) / 20); step.push(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])); }
    const avg = step.reduce((s, x) => s + x, 0) / step.length;
    step.forEach(s => assert.ok(Math.abs(s - avg) / avg < 0.08, 'even step'));
    const t = c.tangent(0.5); assert.ok(Math.abs(Math.hypot(...t) - 1) < 1e-6);
});
test('the ride moves by itself, pauses, and ends at 1', () => {
    const dur = R.duration(1, 1);
    let u = 0; for (let i = 0; i < 60; i++) u = R.advance(u, 1 / 60, dur, false);
    assert.ok(u > 0 && u < 0.05);
    assert.equal(R.advance(u, 1, dur, true), u);
    assert.equal(R.advance(0.99, 5, dur, false), 1);
    assert.ok(R.duration(1, 2) < R.duration(1, 1), 'speed');
});
test('a healthier world flows a bit faster, a rough one never drags', () => {
    assert.ok(R.duration(1.25, 1) < R.duration(0.45, 1));
    assert.ok(R.duration(0.45, 1) / R.duration(1.25, 1) < 1.3);
});
test('stops: buddy, fact, buddy, arrival, each popping once in order', () => {
    const s = R.stops('gut');
    assert.deepEqual(s.map(x => x.kind), ['buddy', 'fact', 'buddy', 'arrive']);
    assert.notEqual(s[0].buddy.id, s[2].buddy.id);
    let u = 0, seen = []; const dur = R.duration(1, 1);
    while (u < 1) { const n = R.advance(u, 0.05, dur, false); seen = seen.concat(R.passed(s, u, n).map(x => x.kind)); u = n; }
    assert.deepEqual(seen, ['buddy', 'fact', 'buddy', 'arrive']);
});
test('look: free while dragging, eases back to the path after release', () => {
    let st = { yaw: 2, pitch: 0.8, idle: 0 };
    st = R.look(st, 0.1, true, false); assert.equal(st.yaw, 2);
    st = R.look(st, 0.3, false, false); assert.equal(st.yaw, 2, 'short hold before easing');
    for (let i = 0; i < 300; i++) st = R.look(st, 1 / 60, false, false);
    assert.equal(st.yaw, 0); assert.equal(st.pitch, 0);
    let f = R.look({ yaw: 1, pitch: 2, idle: 0 }, 5, false, true); assert.equal(f.yaw, 1, 'free look never eases'); assert.ok(f.pitch <= 1.35);
    assert.ok(Math.abs(R.wrap(7) - (7 - 2 * Math.PI)) < 1e-9);
    assert.equal(R.nextSpeed(1), 1.5); assert.equal(R.nextSpeed(0.6), 1);
});
test('wired: loaded by apple-ui, cached by sw, ride lives in the one shared 3D world and reads world health', () => {
    const ui = fs.readFileSync(path.join(root, 'apple-ui.js'), 'utf8'), sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), js = fs.readFileSync(path.join(root, 'body-ride.js'), 'utf8');
    const order = ['world-health-core.js', 'body-ride-core.js', 'body-ride.js'].map(f => ui.indexOf("'" + f + "'"));
    order.forEach(i => assert.ok(i > 0)); assert.ok(order[0] < order[1] && order[1] < order[2]);
    ['world-health-core.js', 'body-ride-core.js', 'body-ride.js', 'body-ride.css'].forEach(f => assert.ok(sw.includes('"' + f + '"'), f));
    assert.match(js, /LowiWorldHealth|WH\(\)\.forState/);
    assert.doesNotMatch(js, /new THREE\.WebGLRenderer|getContext\(['"]webgl/, 'never a second WebGL context');
    assert.doesNotMatch(js, /import\(/, 'no own three.js load');
    assert.match(js, /shared\.hub\.add\(root\)/); assert.match(js, /shared\.onFrame\(/); assert.match(js, /lowi:world3d-ready/);
    assert.match(js, /visibilitychange/); assert.match(js, /InstancedMesh/); assert.match(js, /prefers-reduced-motion/);
    assert.ok(!fs.existsSync(path.join(root, 'vendor', 'three.module.min.js')), 'no duplicate three.js');
});
