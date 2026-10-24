'use strict';
// Oct 24 2026, 10:45 (Emmanuel: "now they're just moving around really fast. It looks like they're trying to dodge things ...
// please make the cellular world as it was when it was working"). The glowing ringed body places on Home (brain, heart, gut ...)
// are back to how they were before Oct 23: each sits at its real spot in the world and moves on screen only as the world turns and
// the camera drifts. Two earlier changes broke that: the Oct 23 veil (fa6d5edc) faded a place to nothing and made it untappable
// behind a Home bubble ("they keep disappearing"), and the Oct 24 step-aside (2ed22fee) pushed it past the bubble's edge every
// frame ("they're dodging"). Both are gone. Live probe: tools/home-places-probe.cjs.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const sc = fs.readFileSync(path.join(__dirname, '..', 'body-world-3d-scene.js'), 'utf8');
const bw = fs.readFileSync(path.join(__dirname, '..', 'body-world-3d.js'), 'utf8');

function beaconLoop() {
    const i = sc.indexOf('Object.values(beacons).forEach((b, i) => {');
    assert.ok(i > 0, 'beacon loop in step');
    const j = sc.indexOf('});', i);
    return sc.slice(i, j);
}

test('each frame a place only pulses its glow and ring: it is never moved, faded or hidden', () => {
    const s = beaconLoop();
    assert.doesNotMatch(s, /b\.g\.position/, 'the place never moves by itself');
    assert.doesNotMatch(s, /b\.g\.visible/, 'never hidden');
    assert.doesNotMatch(s, /core\.material\.opacity/, 'never faded');
    assert.doesNotMatch(s, /\*= b\.veil|b\.veil|b\.off|b\.aside/, 'no veil, no offset, no step-aside');
    assert.match(s, /b\.ring\.rotation\.x = t \* 0\.6 \+ i;/, 'the ring still spins');
    assert.match(s, /b\.glow\.scale\.set\(s, s, 1\)/, 'the glow still breathes');
});

test('a place is placed once, at its real spot in the world, and its core is solid', () => {
    assert.match(sc, /beacons\[p\.id\] = \{ g, ring, glow, core, hue: col, pos: g\.position\.clone\(\) \};/);
    assert.match(sc, /new THREE\.MeshBasicMaterial\(\{ color: col, fog: true \}\)\);\s*const glow/, 'core is not a fading transparent material');
    assert.match(sc, /g\.add\(glow, core, ring, hit\); scene\.add\(g\); hitMeshes\.push\(hit\);/, 'in the world, with its tap target');
    const moves = sc.match(/\bb\.g\.position\.(copy|set|add|lerp)\(/g) || [];
    assert.strictEqual(moves.length, 0, 'nothing moves a place after it is built');
});

test('the Home bubbles never touch the places: no veil and no step-aside anywhere', () => {
    for (const re of [/beaconVeiled/, /beaconAside/, /function setVeil/, /veilCircles/, /veilLook/]) assert.doesNotMatch(sc, re);
    for (const re of [/VEIL_SEL/, /startVeil/, /setVeil/, /veilCircles/]) assert.doesNotMatch(bw, re);
});

test('every place stays tappable: pick casts against all tap targets', () => {
    assert.match(sc, /ray\.intersectObjects\(hitMeshes, false\)/);
});

test('a read-only probe reports where each place is drawn, whether it is visible and how far it sits from its real spot', () => {
    assert.match(sc, /function placesLook\(\)/);
    assert.match(sc, /off: \+b\.g\.position\.distanceTo\(b\.pos\)/);
    assert.match(sc, /resize, placesLook, setFocus/, 'exported');
    assert.match(bw, /api\.placesLook = \(\) =>/);
});
