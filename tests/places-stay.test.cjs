'use strict';
// Oct 24 2026 (Emmanuel: "the cells keep disappearing ... the brain and the heart and all of that stuff, they keep just disappearing").
// Cause: the Oct 23 veil faded a body place to nothing (and made it untappable) whenever it drifted behind a Home bubble, and the
// camera's idle drift keeps carrying places behind the eight ring bubbles. Fix: a place never fades or hides; it steps aside.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const sc = fs.readFileSync(path.join(__dirname, '..', 'body-world-3d-scene.js'), 'utf8');

function stepBody() {
    const i = sc.indexOf('Object.values(beacons).forEach((b, i) => {');
    assert.ok(i > 0, 'beacon loop in step');
    return sc.slice(i, i + 3000);
}

test('a body place is never hidden or faded by the Home bubbles', () => {
    const s = stepBody();
    assert.match(s, /b\.veil = 1; b\.core\.material\.opacity = 1; b\.g\.visible = true;/);
    assert.doesNotMatch(s, /b\.g\.visible = b\.veil/, 'no hide switch');
    assert.doesNotMatch(s, /glow\.material\.opacity \*= b\.veil/, 'no fade');
});

test('behind a bubble a place glides just outside its edge and home again, its real position untouched', () => {
    const s = stepBody();
    assert.match(s, /b\.off\.lerp\(aOff, Math\.min\(1, dt \* 6\)\)/, 'glides, no jump');
    assert.match(s, /b\.g\.position\.copy\(b\.pos\)\.add\(b\.off\)/, 'drawn = real + offset');
    const f = sc.slice(sc.indexOf('function beaconAside(b, out)'), sc.indexOf('function veilLook()'));
    assert.match(f, /if \(!beaconVeiled\(b\)\) return 0;/, 'clear places and flights (beaconVeiled is false while flying) stay home');
    assert.match(f, /need = c\.r \+ rad \+ 2/, 'pushed past the edge plus the glow');
    assert.match(f, /\.unproject\(camera\)/, 'same depth, back into the world');
    assert.doesNotMatch(f, /b\.pos\.(copy|set|add)\(/, 'regions, flights and trips keep the real position');
});

test('flights still ignore the bubbles (unchanged)', () => {
    assert.match(sc, /function beaconVeiled\(b\) \{\s*if \(!veilCircles\.length\) return false;[\s\S]{0,200}if \(rig\.fly \|\| document\.documentElement\.classList\.contains\('mf-on'\)\) return false;/);
});

test('the probe reports where a place is drawn and how far it stepped aside', () => {
    assert.match(sc, /vTmp\.copy\(b\.g\.position\)\.project\(camera\)/);
    assert.match(sc, /aside: \+b\.aside\.toFixed\(1\)/);
});
