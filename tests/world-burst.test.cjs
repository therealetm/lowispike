// limbo fix (Oct 17): no empty frame between worlds, an impressive reusable break-out, the guide quiet during the move
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const B = require('../world-burst.js');

test('burst plan: deterministic sparks fanned around the push direction, capped', () => {
    const a = B.plan(12, 5, 1, 0), b = B.plan(12, 5, 1, 0);
    assert.deepStrictEqual(a, b);
    assert.strictEqual(a.length, 12);
    assert.strictEqual(B.plan(99, 1).length, 24);
    assert.strictEqual(B.plan(0, 1).length, 0);
    const sx = a.reduce((t, q) => t + q.dx, 0);
    assert.ok(sx > 0, 'on balance the sparks fly outward (to the right): ' + sx);
    a.forEach(q => { assert.ok(Math.hypot(q.dx, q.dy) <= 200); assert.ok(q.s > 0 && q.d >= 0 && q.d <= 90); });
});

test('burst is short and leaves nothing running', () => {
    assert.ok(B.DUR.pop <= 900 && B.DUR.flash <= 500);
    const s = read('world-burst.js');
    assert.ok(!/requestAnimationFrame|setInterval/.test(s), 'no per-frame loop');
    assert.ok(/setTimeout\(\(\) => el\.remove\(\)/.test(s), 'the tear removes itself');
    assert.ok(/prefers-reduced-motion/.test(s));
});

test('Home is drawn behind the place on the way out (peek), from the first frame of the reversed trip', () => {
    const s = read('body-world-regions.js');
    assert.ok(/function peek\(p\)/.test(s));
    assert.ok(/q\.phase = 'unsettle'; q\.tu = 0; veil\(0, src\.css\); peek\(1\);/.test(s));
    assert.ok(/blendLook\(0\.45 \+ 0\.55 \* smooth\(0, 1, k\)\)/.test(s), 'the colour crossfades to Home during the unsettle');
    assert.ok(/!st\.warp && !st\.busy && st\.cur !== 'hub' && !st\.region\) \{ try \{ enter\('hub'\)/.test(s), 'never stuck in a place with nothing mounted');
    assert.ok(/travel, openMap, peek,/.test(s));
});

test('world exit: membrane press while pushing, tear on the way out, released when you let go', () => {
    const s = read('misty-flight.js');
    assert.ok(/Rg\.peek\(h\.p\)/.test(s));
    assert.ok(/LowiWorldBurst\.press\(h\.p,/.test(s));
    assert.ok(/LowiWorldBurst\.pop\(m\.x, m\.y, placeCss\(\)/.test(s));
    assert.ok(/Rg\.peek\(0\)/.test(s) && /LowiWorldBurst\.release\(\)/.test(s));
});

test('the cell guide stays quiet while a trip between worlds runs', () => {
    const s = read('region-pals.js');
    assert.ok(/function moving\(\)/.test(s));
    assert.ok(/if \(!user && moving\(\)\) return false;/.test(s));
    assert.ok(/if \(moving\(\)\) \{ st\.nextT = setTimeout\(talk, 500\); return; \}/.test(s), 'no "Back in here!" before she has settled');
    assert.ok(/'lowi:world-warp', e => \{ const d = e && e\.detail; if \(d && d\.phase === 'start'\) quiet\(\); \}/.test(s));
});

test('world-burst.js is loaded before misty-flight.js and cached offline', () => {
    const h = read('index.html'), sw = read('sw.js');
    const i = h.indexOf('world-burst.js?v='), j = h.indexOf('misty-flight.js?v=');
    assert.ok(i > 0 && i < j);
    assert.strictEqual((sw.match(/"world-burst\.js"/g) || []).length, 2);
});
