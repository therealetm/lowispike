'use strict';
/* Oct 18 2026 (Emmanuel: "circles ... have them all at the same size ... circle math ... just implement it in our app"):
   the one-page Home puts eight controls on ONE true circle round Misty, all the same diameter, 45 degrees apart, Settings on top,
   Scan at the lower right (Emmanuel, Oct 18 2026 18:20: "Let's put scan where setting is") and the joystick at the bottom. These tests pin the geometry numerically and the wiring structurally (home-orbit-v2.js). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const O = require('../home-orbit-v2.js');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

const VIEWS = {
    iphone_390x844: { vw: 390, vh: 844, cx: 195, cy: 388, mistyR: 87, safe: { t: 47, r: 0, b: 34, l: 0 } },
    iphone13_webkit_390x664: { vw: 390, vh: 664, cx: 195, cy: 300, mistyR: 80, safe: { t: 0, r: 0, b: 0, l: 0 } },
    iphone_se_375x667: { vw: 375, vh: 667, cx: 187.5, cy: 300, mistyR: 80, safe: { t: 20, r: 0, b: 0, l: 0 } },
    ipad_1180x820: { vw: 1180, vh: 820, cx: 590, cy: 377, mistyR: 147, safe: { t: 24, r: 0, b: 20, l: 0 } },
    ipad_portrait_820x1180: { vw: 820, vh: 1180, cx: 410, cy: 560, mistyR: 140, safe: { t: 24, r: 0, b: 20, l: 0 } }
};
const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, msg + ': ' + a + ' vs ' + b);

test('order is clockwise from the top in 45 degree steps: Settings top, Scan lower right, joystick bottom', () => {
    assert.deepStrictEqual(O.ORDER, ['settings', 'water', 'move', 'scan', 'joy', 'sleep', 'gap', 'fuel']);
    assert.strictEqual(O.angleOf('settings'), -90, 'Settings straight up');
    assert.strictEqual(O.angleOf('scan'), 45, 'Scan at the lower right, where Settings was');
    O.ORDER.forEach((k, i) => assert.strictEqual(O.angleOf(k), -90 + 45 * i, k));
});

for (const [name, v] of Object.entries(VIEWS)) {
    test('true circle at ' + name + ': equal diameters, equal radial distance, equal 45 degree increments, no overlap, inside the safe area', () => {
        const L = O.fit(v);
        assert.ok(L.ok, 'fits');
        const keys = Object.keys(L.spots);
        assert.deepStrictEqual(keys, O.ORDER, 'all eight controls placed');
        /* one shared diameter for all eight */
        const ds = keys.map(k => L.spots[k].d);
        assert.ok(ds.every(d => d === L.d), 'same diameter ' + ds.join(','));
        assert.ok(L.d >= 56, 'diameter big enough to tap: ' + L.d);
        /* one shared radius from Misty's centre */
        keys.forEach(k => near(Math.hypot(L.spots[k].x - v.cx, L.spots[k].y - v.cy), L.R, 0.01, k + ' radial distance'));
        /* equal angular increments of exactly 45 degrees, measured from the placed points */
        const ang = keys.map(k => Math.atan2(L.spots[k].y - v.cy, L.spots[k].x - v.cx) * 180 / Math.PI);
        for (let i = 0; i < 8; i++) { let step = ang[(i + 1) % 8] - ang[i]; step = ((step % 360) + 360) % 360; near(step, 45, 0.01, 'step ' + keys[i]); }
        /* Settings straight above Misty, Scan at the lower right (45 degrees), joystick straight below */
        near(L.spots.settings.x, v.cx, 0.01, 'settings x'); assert.ok(L.spots.settings.y < v.cy, 'settings above');
        near(L.spots.scan.x - v.cx, L.spots.scan.y - v.cy, 0.01, 'scan on the 45 degree diagonal'); assert.ok(L.spots.scan.x > v.cx && L.spots.scan.y > v.cy, 'scan lower right');
        near(L.spots.joy.x, v.cx, 0.01, 'joy x'); assert.ok(L.spots.joy.y > v.cy, 'joy below');
        near(L.spots.gap.y, v.cy, 0.01, 'gap level with Misty'); near(L.spots.move.y, v.cy, 0.01, 'move level with Misty');
        /* neighbours never touch: chord between adjacent centres >= diameter */
        for (let i = 0; i < 8; i++) { const a = L.spots[keys[i]], b = L.spots[keys[(i + 1) % 8]]; assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= L.d + 4, 'gap between ' + keys[i] + ' and ' + keys[(i + 1) % 8]); }
        /* nothing overlaps Misty */
        assert.ok(L.R - L.d / 2 >= v.mistyR + 8, 'clear of Misty: ' + (L.R - L.d / 2 - v.mistyR));
        /* nothing is clipped: every control inside the viewport minus the safe areas */
        keys.forEach(k => {
            const s = L.spots[k], r = L.d / 2;
            assert.ok(s.x - r >= v.safe.l && s.x + r <= v.vw - v.safe.r && s.y - r >= v.safe.t && s.y + r <= v.vh - v.safe.b, k + ' inside safe area');
        });
        /* pulled close: the ring hugs Misty (no more than the minimum gap plus a little) unless spacing needs more */
        assert.ok(L.R - L.d / 2 - v.mistyR <= 40, 'ring hugs Misty: ' + (L.R - L.d / 2 - v.mistyR));
    });
}

test('the ring and diameter scale together with the space: iPad ring and controls are bigger than the phone ones', () => {
    const p = O.fit(VIEWS.iphone_390x844), t = O.fit(VIEWS.ipad_1180x820);
    assert.ok(t.R > p.R && t.d > p.d, JSON.stringify({ phone: [p.R, p.d], ipad: [t.R, t.d] }));
});

test('a screen that cannot hold the circle says so instead of overlapping', () => {
    const L = O.fit({ vw: 360, vh: 300, cx: 180, cy: 150, mistyR: 110, safe: { t: 0, r: 0, b: 0, l: 0 } });
    assert.strictEqual(L.ok, false);
});

test('moved(): a few px of drift never relayouts, a real change does', () => {
    const a = O.fit(VIEWS.iphone_390x844);
    const b = O.fit(Object.assign({}, VIEWS.iphone_390x844, { cy: 389.5 }));
    const c = O.fit(Object.assign({}, VIEWS.iphone_390x844, { cy: 420 }));
    assert.strictEqual(O.moved(a, b), false);
    assert.strictEqual(O.moved(a, c), true);
    assert.strictEqual(O.moved(null, a), true);
});

test('index.html loads the shell after living-bubbles.js, with the build id, and the service worker caches it', () => {
    const h = read('index.html');
    const css = h.indexOf('home-orbit-v2.css?v='), js = h.indexOf('home-orbit-v2.js?v='), lb = h.indexOf('living-bubbles.js?v=');
    assert.ok(css > 0 && js > 0 && lb > 0 && js > lb && css > lb, 'tags present after living-bubbles');
    const sw = read('sw.js');
    assert.ok(sw.includes('"home-orbit-v2.js"') && sw.includes('"home-orbit-v2.css"'), 'sw.js STATIC');
});

test('sym-home.js turning ring steps aside while the eight-control Home is on', () => {
    const s = read('sym-home.js');
    assert.match(s, /classList\.contains\('o8'\)/);
});

test('shell: tags every ring control for the sibling adapters, real Scan and the existing joystick, no emoji', () => {
    const s = read('home-orbit-v2.js'), c = read('home-orbit-v2.css');
    for (const k of O.ORDER) assert.ok(s.includes("'" + k + "'"), k);
    assert.match(s, /data-home-bubble|homeBubble/);
    assert.match(s, /#tabbar \[data-tab="scan"\]/, 'Scan opens the real scanner tab');
    assert.match(s, /whPad/, 'joystick is the existing controller');
    assert.match(s, /LowiHomeBloomsV2/); assert.match(s, /LowiHomeSettingsSleepV2/);
    assert.match(s, /lowi:home-orbit/);
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F000}-\u{1F2FF}]/u;
    assert.ok(!emoji.test(s) && !emoji.test(c), 'no emoji');
    /* every ring control gets the one shared diameter */
    assert.match(c, /width:\s*var\(--o8-d\)\s*!important/);
    assert.match(c, /height:\s*var\(--o8-d\)\s*!important/);
});

test('shell: the old Home clutter is hidden on the ring Home but stays reachable from Settings', () => {
    const s = read('home-orbit-v2.js'), c = read('home-orbit-v2.css');
    for (const sel of ['#f3Board', '.sp-top', '.wh-todaybtn', '.wh-vr', '.wh-zoom', '.wa-btn', '#tbTheme', '.hs-gift', '#pfBtn', '#tabbar']) {
        assert.ok(c.includes(sel), 'hidden in css: ' + sel);
    }
    for (const sel of ['#pfBtn', '.wh-todaybtn', '.wh-zoom', '.wh-vr', '.wa-btn', '#tbTheme', '.hs-gift', 'community', 'cook', 'move']) assert.ok(s.includes(sel), 'reachable: ' + sel);
    assert.match(s, /lowi\.home\.menubar/, 'optional bottom menu bar switch');
});

test('shell writes to the page only when a value changes (no per-frame DOM writes)', () => {
    const s = read('home-orbit-v2.js');
    assert.ok(!/requestAnimationFrame\(\s*function\s+loop|[^A-Za-z]onFrame\(/.test(s), 'no frame loop');
    assert.match(s, /getPropertyValue\('--o8-x'\) !== /);
});
