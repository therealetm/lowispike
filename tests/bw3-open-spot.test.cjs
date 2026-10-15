// Phones: the Home "3D" button must not sit under the avatar ring / theme switch (390x844, 375x667); iPad keeps its spot.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const BW = require('../body-world-3d.js');
const src = fs.readFileSync(path.join(root, 'body-world-3d.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'body-world-3d.css'), 'utf8');

const clear = (s, o, half, gap) => o.rad != null ? Math.hypot(s.x - o.cx, s.y - o.cy) >= o.rad + half + gap - 1e-9
    : (s.x + half + gap <= o.l || s.x - half - gap >= o.r || s.y + half + gap <= o.t || s.y - half - gap >= o.b);

// live geometry measured on build 051500 (avatar + theme padded by 5px for the ring outline and glow)
const PHONES = {
    '390x844': { area: { l: 8, t: 59, r: 382, b: 287 }, pref: { x: 344.5, y: 85 }, obstacles: [
        { cx: 354, cy: 90, rad: 27 }, { cx: 303, cy: 90, rad: 24 }, { l: 18, t: 63, r: 182, b: 107 }, { l: 192, t: 68, r: 274, b: 102 },
        { cx: 117, cy: 199, rad: 84 }, { cx: 288, cy: 199, rad: 69 }] },
    '375x667': { area: { l: 8, t: 59, r: 367, b: 237 }, pref: { x: 329.5, y: 85 }, obstacles: [
        { cx: 339, cy: 90, rad: 27 }, { cx: 288, cy: 90, rad: 24 }, { l: 18, t: 63, r: 167, b: 107 }, { l: 177, t: 68, r: 259, b: 102 },
        { cx: 129, cy: 174, rad: 59 }, { cx: 256, cy: 174, rad: 50 }] }
};

test('pickSpot finds a 44px spot clear of the avatar ring on 390x844 and 375x667', () => {
    for (const [k, g] of Object.entries(PHONES)) {
        const s = BW.pickSpot({ ...g, size: 44, gap: 4, step: 2 });
        assert.ok(s, k + ': no spot');
        for (const o of g.obstacles) assert.ok(clear(s, o, 22, 4), k + ': touches ' + JSON.stringify(o));
        assert.ok(s.x - 22 >= g.area.l && s.x + 22 <= g.area.r && s.y - 22 >= g.area.t && s.y + 22 <= g.area.b, k + ': outside the 3D window');
    }
});

test('pickSpot keeps the preferred spot when it is free and returns null when nothing fits', () => {
    assert.deepEqual(BW.pickSpot({ area: { l: 0, t: 0, r: 100, b: 100 }, pref: { x: 50, y: 50 }, size: 44, step: 2, obstacles: [] }), { x: 50, y: 50 });
    assert.equal(BW.pickSpot({ area: { l: 0, t: 0, r: 100, b: 100 }, pref: { x: 50, y: 50 }, size: 44, obstacles: [{ l: -10, t: -10, r: 110, b: 110 }] }), null);
    assert.equal(BW.pickSpot({}), null);
});

test('the button floats only on collision and keeps a 44px tap target everywhere', () => {
    assert.match(src, /function placeOpenBtn\(els\)/);
    assert.match(src, /placeOpenBtn\(els\);/);
    assert.match(src, /getElementById\('pfBtn'\)/);
    assert.match(src, /fixed\.every\(boxClear\)\) return;/, 'no collision -> default (iPad) spot untouched');
    assert.match(css, /\.bw3-open::after \{[^}]*top: -7px; bottom: -7px;/, '32px pill + 2x7px -> 44px tap');
    assert.match(css, /\.bw3-open\.bw3-float \{[^}]*width: 44px;[^}]*height: 44px;/);
    assert.doesNotMatch(css, /#tabbar/, 'tab bar untouched');
});
