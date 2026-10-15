/* Whole body world: data, routes, tiers and that every region builds and disposes with the vendored three.js. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const R = require(path.join(root, 'body-world-regions.js'));

test('seven regions + hub, ids match the body journey places', () => {
    assert.deepStrictEqual(R.ROUTE, ['brain', 'lung', 'heart', 'liver', 'pancreas', 'gut', 'muscle']);
    for (const pid of ['blood', 'gut', 'liver', 'pancreas', 'muscle', 'heart', 'lung', 'brain']) assert.ok(R.regionForJourney(pid), pid);
    assert.strictEqual(R.regionForJourney('blood'), 'hub');
    assert.strictEqual(R.regionForJourney('nope'), null);
    for (const r of R.REGIONS) { assert.strictEqual(r.n.length, 3); assert.strictEqual(r.line.length, 3); assert.ok(r.map[0] > 0 && r.map[0] < 100 && r.map[1] > 0 && r.map[1] < 100); }
});

test('routes: hub links everywhere, regions link back to hub and their neighbours', () => {
    assert.deepStrictEqual(R.neighbours('hub'), R.ROUTE);
    assert.deepStrictEqual(R.neighbours('brain'), ['hub', 'lung']);
    assert.deepStrictEqual(R.neighbours('liver'), ['hub', 'heart', 'pancreas']);
    assert.deepStrictEqual(R.neighbours('muscle'), ['hub', 'gut']);
    /* every region is reachable from every other within two hops */
    for (const a of R.ROUTE) for (const b of R.ROUTE) { const one = R.neighbours(a); assert.ok(a === b || one.includes(b) || one.includes('hub')); }
    assert.strictEqual(R.chips, undefined, 'the bottom chip list is gone: World map + in-world taps only');
});

test('performance tiers and travel time', () => {
    assert.strictEqual(R.tier({ w: 375, h: 667, mem: 4 }), 'low');
    assert.strictEqual(R.tier({ w: 390, h: 844, mem: 4 }), 'mid');
    assert.strictEqual(R.tier({ w: 1180, h: 820, mem: 8 }), 'high');
    assert.strictEqual(R.tier({ w: 1180, h: 820, save: true }), 'low');
    for (const id of R.ROUTE) { const lo = R.counts(id, 'low'), hi = R.counts(id, 'high'); for (const k of Object.keys(lo)) assert.ok(lo[k] <= hi[k], id + k); }
    assert.strictEqual(R.travelMs(true), 250);
    assert.strictEqual(R.travelMs(false), R.WARP.glide + R.WARP.dive + R.WARP.settle);
    assert.ok(R.travelMs(false) >= 2000 && R.travelMs(false) <= 2800);
});

test('fly-to is one continuous forward move: dive pushes in, settle keeps moving forward to rest, no cut', () => {
    const P = R.warpPose;
    /* dive: starts at the glide pose with no jump, accelerates, ends fully forward with the glow covering the view */
    assert.deepStrictEqual([P('dive', 0).fwd, P('dive', 0).veil], [0, 0]);
    assert.strictEqual(P('dive', 1).fwd, 1); assert.strictEqual(P('dive', 1).veil, 1);
    let prev = -1; for (let k = 0; k <= 1.0001; k += 0.05) { const f = P('dive', k).fwd; assert.ok(f >= prev); prev = f; }
    assert.ok(P('dive', 0.9).speed > P('dive', 0.3).speed, 'pulled in like a magnet');
    /* the swap happens only under a full glow, and settle starts under that same full glow */
    assert.strictEqual(P('settle', 0).veil, 1);
    /* settle: forward motion continues (offset rises monotonically to the base pose), slows to zero, region grows to full size */
    prev = -9; for (let k = 0; k <= 1.0001; k += 0.05) { const f = P('settle', k).fwd; assert.ok(f >= prev - 1e-9); prev = f; }
    assert.ok(Math.abs(P('settle', 1).fwd) < 1e-9 && P('settle', 1).speed === 0 && P('settle', 1).scale === 1 && P('settle', 1).veil === 0);
    assert.ok(P('settle', 0.05).speed > 0 && P('settle', 0).scale < 1);
    /* leaving: the glow bursts away while the base camera pulls back through the hub */
    assert.strictEqual(P('out', 0).veil, 1); assert.strictEqual(P('out', 1).veil, 0);
});

test('controller: no vessel clip, no chip bar, warp streaks live in the shared scene only', () => {
    const src = fs.readFileSync(path.join(root, 'body-world-regions.js'), 'utf8'), css = fs.readFileSync(path.join(root, 'body-world-regions.css'), 'utf8');
    assert.ok(!/buildVessel|bwrBar|bwr-chip|bwr-bar/.test(src), 'no vessel clip or region chip bar in the controller');
    assert.ok(!/\.bwr-bar|\.bwr-chip/.test(css));
    assert.ok(/\.bw3-full\.bwr-on \.bw3-chips\{display:none\}/.test(css), 'base chip row stays hidden as well');
    assert.ok(src.includes('bwrMapBtn') && src.includes('openMap'), 'World map stays');
    assert.ok(/a\.rig/.test(src) && fs.readFileSync(path.join(root, 'body-world-3d.js'), 'utf8').includes('rig: world.rig'), 'follows the base glide');
    assert.ok(/fov0/.test(src) && /cam\.fov = q\.fov0/.test(src), 'lens kick is always restored');
});

test('every region builds, animates and disposes within a phone budget (three.js r160)', async () => {
    const THREE = await import(path.join(root, 'vendor', fs.readdirSync(path.join(root, 'vendor')).find(f => /^three.*\.module\.min\.js$/.test(f))));
    for (const t of ['low', 'high']) for (const id of R.ROUTE) {
        const reg = R.buildRegion(THREE, id, t);
        assert.ok(reg && reg.group.children.length > 3, id);
        let draws = 0, geos = 0; reg.group.traverse(o => { if (o.isMesh || o.isPoints || o.isSprite) draws++; if (o.geometry) geos++; });
        assert.ok(draws <= 14, id + ' draws ' + draws);
        for (let i = 0; i < 4; i++) reg.tick(i * 0.2, 0.016, false);
        reg.dispose();
        assert.strictEqual(reg.group.parent, null);
    }
    const cam = new THREE.PerspectiveCamera(); cam.position.set(1, 2, 3);
    const v = R.buildWarp(THREE, 90, 0xffcc00); v.follow(cam); assert.ok(v.group.position.equals(cam.position));
    v.tick(0, 0.016, 0); assert.strictEqual(v.opacity, 0);
    v.tick(12, 0.016, 1); assert.ok(v.opacity > 0.8);
    for (let i = 0; i < 200; i++) v.tick(30, 0.05, 1); /* streaks wrap, never run away */
    const pa = v.group.children[0].geometry.attributes.position.array; for (let i = 2; i < pa.length; i += 3) assert.ok(pa[i] <= 0 && pa[i] > -40);
    v.tick(-10, 0.016, 0.5); v.dispose(); assert.strictEqual(v.group.parent, null);
});

test('no XP or reward calls from travelling; loader, sw and build strings wired', () => {
    const src = fs.readFileSync(path.join(root, 'body-world-regions.js'), 'utf8');
    assert.ok(!/award|addXp|grantXp|LowiXp/.test(src), 'travel must not award XP');
    assert.ok(!/getContext\(['"]webgl/.test(src), 'regions must not open their own WebGL context');
    const ui = fs.readFileSync(path.join(root, 'apple-ui.js'), 'utf8');
    assert.ok(ui.includes('body-world-regions.js') && src.includes('body-world-regions.css'));
    assert.ok(ui.indexOf('body-world-regions.js') > ui.indexOf('body-world-3d.js'), 'regions load after the base world');
    const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
    assert.ok(sw.includes('body-world-regions.js') && sw.includes('body-world-regions.css'));
    const b = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8')).build;
    assert.ok(sw.includes(b) && ui.includes(b) && fs.readFileSync(path.join(root, 'index.html'), 'utf8').includes(b));
});
