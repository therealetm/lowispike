/* Oct 24 2026 (hourly flight crash hunt 16:01): on iPad, zoomed all the way out to the World Map, turning to portrait and back left
   Home stuck in the far spirit view (wh-cosmos): the controller hidden, Misty's cell and the place names stepped aside, with nobody
   touching anything. Home's re-layout judged "past the World Map" against the NEW edge: portrait edge 22.96 -> landscape edge 15.95,
   so the camera at 22.96 read as out in the spirit world and kept its distance (22.96 > 15.95 x 1.06 = wh-cosmos).
   Numbers below are the live ones from tools/flight-idle-cosmos-probe.cjs (Chromium 1180x820 <-> 820x1180).
   Fails on the old code: homeRelayoutDist did not exist and setMode kept the distance. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const ROOT = path.join(__dirname, '..');
const load = () => import(pathToFileURL(path.join(ROOT, 'body-world-3d-scene.js')).href);
const LAND = { homeDist: 6.38, minD: 6.38 * 0.72, maxD: 15.95 }, PORT = { homeDist: 9.18, minD: 9.18 * 0.72, maxD: 22.96 };

test('turning on the World Map stays on the World Map, both ways', async () => {
    const { homeRelayoutDist: f } = await load();
    assert.strictEqual(typeof f, 'function');
    /* landscape World Map -> portrait: lands on portrait's World Map edge */
    const p = f({ home: true, dist: 15.95, homeDist: LAND.homeDist, maxD: LAND.maxD, outer: true }, PORT, 1.4, 300);
    assert.ok(Math.abs(p - PORT.maxD) < 0.05, 'portrait ' + p);
    /* ... and back: the bug kept 22.96 here, past landscape's 15.95 x 1.06 */
    const l = f({ home: true, dist: p, homeDist: PORT.homeDist, maxD: PORT.maxD, outer: true }, LAND, 1.4, 300);
    assert.ok(Math.abs(l - LAND.maxD) < 0.05, 'landscape ' + l);
    assert.ok(l <= LAND.maxD * 1.06, 'not in the spirit view after the turn back');
});

test('the resting view and a close-up keep their share of Misty\'s distance across a turn', async () => {
    const { homeRelayoutDist: f } = await load();
    const rest = f({ home: true, dist: 8.93, homeDist: LAND.homeDist, maxD: LAND.maxD, outer: true }, PORT, 1.4, 300);
    assert.ok(Math.abs(rest / PORT.homeDist - 8.93 / LAND.homeDist) < 1e-9);
    const close = f({ home: true, dist: LAND.minD, homeDist: LAND.homeDist, maxD: LAND.maxD, outer: true }, PORT, 1.4, 300);
    assert.ok(Math.abs(close - PORT.minD) < 1e-9);
});

test('a camera really out in the spirit world stays out there (Oct 16 rule kept)', async () => {
    const { homeRelayoutDist: f } = await load();
    assert.strictEqual(f({ home: true, dist: 120, homeDist: PORT.homeDist, maxD: PORT.maxD, outer: true }, LAND, 1.4, 300), 120);
    assert.strictEqual(f({ home: true, dist: 300, homeDist: LAND.homeDist, maxD: LAND.maxD, outer: true }, PORT, 1.4, 300), 300);
    /* with reduced motion there is no spirit world (outer false): clamp to the World Map */
    assert.strictEqual(f({ home: true, dist: 120, homeDist: LAND.homeDist, maxD: LAND.maxD, outer: false }, LAND, 1.4, 300), LAND.maxD);
});

test('coming back to Home from a world opens at the resting view, as before', async () => {
    const { homeRelayoutDist: f } = await load();
    const d = f({ home: false, dist: 6.5, homeDist: 0, maxD: 13, outer: true }, LAND, 1.4, 300);
    assert.ok(Math.abs(d - LAND.homeDist * 1.4) < 1e-9);
});

test('setMode(home) uses the rule and no longer keeps a distance judged against the new edge', () => {
    const src = fs.readFileSync(path.join(ROOT, 'body-world-3d-scene.js'), 'utf8');
    assert.match(src, /rig\.dist = homeRelayoutDist\(prev, rig, HOME_OUT, rig\.outerD\)/);
    assert.doesNotMatch(src, /const hiD = rig\.outer && rig\.dist > rig\.maxD/);
});
