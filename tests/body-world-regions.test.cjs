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
    const c = R.chips('gut', 'de'); assert.deepStrictEqual(c.map(x => x.label), ['Blutbahn', 'Bauchspeicheldrüse', 'Muskeln']);
    assert.strictEqual(R.chips('hub', 'es')[0].label, 'Cerebro');
});

test('performance tiers and travel time', () => {
    assert.strictEqual(R.tier({ w: 375, h: 667, mem: 4 }), 'low');
    assert.strictEqual(R.tier({ w: 390, h: 844, mem: 4 }), 'mid');
    assert.strictEqual(R.tier({ w: 1180, h: 820, mem: 8 }), 'high');
    assert.strictEqual(R.tier({ w: 1180, h: 820, save: true }), 'low');
    for (const id of R.ROUTE) { const lo = R.counts(id, 'low'), hi = R.counts(id, 'high'); for (const k of Object.keys(lo)) assert.ok(lo[k] <= hi[k], id + k); }
    assert.strictEqual(R.travelMs(true), 250);
    assert.ok(R.travelMs(false) >= 1500 && R.travelMs(false) <= 2200);
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
    const v = R.buildVessel(THREE, 0xffcc00); v.follow(new THREE.PerspectiveCamera()); v.tick(0.5); v.dispose();
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
