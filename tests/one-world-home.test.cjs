/* One world, one Misty (Oct 15, 2026): a warp from Home lands in Home itself, and VR / motion viewing is on Home. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('api.flyTo travels inside Home when Home is live (no second full-screen version)', () => {
    const js = read('body-world-3d.js');
    assert.match(js, /flyTo: id => \{ if \(flyHome\(id\)\) return; open\(\); setTimeout\(\(\) => go\(id\), 50\); \}/);
    assert.match(js, /function flyHome\(id\) \{/);
    assert.match(js, /R\.travel\(id \|\| 'hub'\)/);
    // Home's layout leaves the camera alone while travelling
    assert.match(js, /if \(homeAway\(\) \|\| api\.hold\) \{ const s0 = stage\.getBoundingClientRect\(\); world\.resize\(s0\.width, s0\.height\); return; \}/);
});

test('World map out of a place is the fly-to played backwards, ending on the whole world in one move (Oct 16)', () => {
    const rj = read('body-world-regions.js'), w3 = read('body-world-3d.js'), wh = read('world-home.js');
    // the camera leg the controller asks for during its own trip is flown, not refused as busy
    assert.match(w3, /if \(s && s\.ownFly\) \{ world\.flyTo\(id \|\| null\); return true; \}/);
    // reversed phases: settle backwards (place shrinks, glow rises), dive backwards (back out of the glow), then the glide home
    assert.match(rj, /q\.phase === 'unsettle'[\s\S]*warpPose\('settle', 1 - k\)/);
    assert.match(rj, /q\.phase === 'undive'[\s\S]*warpPose\('dive', 1 - k\)/);
    assert.match(rj, /const rev = id === 'hub' && st\.cur !== 'hub' && !fromBase && !reduced\(\)/);
    assert.match(rj, /if \(q\.wide && r\.maxD\) q\.fly\.to\.d = r\.maxD;/);
    // no instant flash + swap for this trip any more
    assert.match(rj, /else if \(st\.cur !== 'hub'\) \{ veil\(1, from\.css\); q\.outT = 0;/);
    // World map asks for the wide ending instead of a second zoom 1.9 s later
    assert.match(wh, /R\.travel\('hub', false, 0, \{ wide: true \}\)/);
    const R = require(path.join(root, 'body-world-regions.js')), P = R.warpPose;
    // the reversed settle starts with the place in full view and ends under the full glow, moving backwards all the way
    assert.strictEqual(P('settle', 1).veil, 0); assert.strictEqual(P('settle', 0).veil, 1);
    let prev = 1; for (let k = 0; k <= 1.0001; k += 0.05) { const f = P('settle', 1 - k).fwd; assert.ok(f <= prev + 1e-9); prev = f; }
    // the reversed dive starts inside the glow (veil 1) and ends with the camera back at the spot, veil 0
    assert.deepStrictEqual([P('dive', 1).fwd, P('dive', 1).veil], [1, 1]); assert.deepStrictEqual([P('dive', 0).fwd, P('dive', 0).veil], [0, 0]);
});

test('the regions warp accepts Home as its host', () => {
    const js = read('body-world-regions.js');
    assert.match(js, /if \(!a\.isOpen\(\)\) return homeHost\(a\);/);
    assert.match(js, /D\.getElementById\('whHud'\)/);
});

test('flying back on Home returns to Misty\'s own framing', () => {
    assert.match(read('body-world-3d-scene.js'), /d: rig\.mode === 'home' \? \(rig\.homeRest \|\| rig\.homeDist \|\| 3\.2\) : 6\.5/);
    assert.match(read('world-home.js'), /animateDist\(baseDist\(r\), 0\.12\)/);
});

test('Home has its own VR button: motion only, stacked above World map so the thumb row keeps its room', () => {
    const js = read('world-home.js'), css = read('world-home.css'), w3 = read('body-world-3d.js');
    assert.match(js, /btn\('wh-vr', 'VR'/);
    assert.match(js, /if \(k === 'vr'\) \{[^\n]*a\.gyro\.tap\(b\)/);
    assert.ok(!/k === 'vr'[^\n]*flyTo/.test(js), 'the VR button never warps');
    assert.match(w3, /gyro: \{ kind: \(\) => gyroKind\(gyroEnv\(\)\), on: \(\) => gyroOn, tap: b => gyroTap\(b\)/);
    assert.match(css, /\.wh-hud \.wh-vr \{ right: [^;]+; bottom: calc\(var\(--wh-tb\) \+ 12px \+ 58px \+ 10px\);/);
    assert.match(js, /#whHud \.wh-zoom, #whHud \.wh-vr, #whHud \.wa-btn/);
});

test('in a place on Home, Misty steps aside and the X flies back', () => {
    const js = read('world-home.js'), css = read('world-home.css');
    assert.match(js, /H\.classList\.contains\('wh-away'\)\) \{ try \{ W\.LowiWorldRegions\.travel\('hub'\); \}/);
    assert.match(css, /html\.wh-home\.wh-away #spHome #spBubble/);
});
