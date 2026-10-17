'use strict';
/* Oct 18, 2026 (E-man, iPhone, on her timed Explore trip): "the world looks normal, it's just Misty: so tiny I can't even see
   her ... she needs to be able to also come close to the camera, and only sometimes go to the distance."
   Measured (tools/explore-probe.cjs, 390x844): the trip flies the autopilot tour; inside a cell world she was pinned at
   K.MIN_K (0.42) of her size for the whole stay, 92 px sprite against 220 px outside, and never came closer.
   Now inside a world she lands small (the door size), comes up close, and only now and then drifts off into the distance
   on her own for a few seconds. Steered by you she stays close. The orbit-in shrink before a world stays as it was. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const F = require('../misty-flight.js');
const src = fs.readFileSync(path.join(__dirname, '..', 'misty-flight.js'), 'utf8');

test('inside a world she is close most of the time, not pinned at the door size', () => {
    assert.ok(F.IN_SIZE, 'IN_SIZE exported');
    assert.ok(F.IN_SIZE.NEAR >= 0.75 && F.IN_SIZE.NEAR <= 1, 'close: at least 3/4 of her normal size');
    assert.ok(Math.abs(F.IN_SIZE.FAR - F.K.MIN_K) < 1e-9, 'far: the door size, never smaller (never a speck)');
    let near = 0, n = 0, min = 9, max = 0;
    for (let t = 0; t < 180; t += 0.1) { const k = F.inSizeK(t, 0.5, false); n++; if (k >= F.IN_SIZE.NEAR - 1e-9) near++; min = Math.min(min, k); max = Math.max(max, k); }
    assert.ok(near / n >= 0.65, 'close at least two thirds of the time, got ' + (near / n).toFixed(2));
    assert.ok(min <= F.IN_SIZE.FAR + 0.02, 'but she does sometimes go off into the distance');
    assert.ok(max <= F.IN_SIZE.NEAR + 1e-9);
});

test('the first seconds after landing she is close, and a far spell is short and eased', () => {
    for (let t = 0; t < 10; t += 0.1) assert.equal(F.inSizeK(t, 0, false), F.IN_SIZE.NEAR, 'no far spell in the first 10 s');
    let run = 0, longest = 0;
    for (let t = 0; t < 120; t += 0.05) { if (F.inSizeK(t, 0.3, false) < F.IN_SIZE.NEAR - 1e-6) { run += 0.05; longest = Math.max(longest, run); } else run = 0; }
    assert.ok(longest > 2 && longest <= 6, 'a far spell lasts a few seconds, got ' + longest.toFixed(2));
    let jump = 0, prev = F.inSizeK(0, 0.7, false);
    for (let t = 0.05; t < 120; t += 0.05) { const k = F.inSizeK(t, 0.7, false); jump = Math.max(jump, Math.abs(k - prev)); prev = k; }
    assert.ok(jump < 0.05, 'smooth, never a pop: biggest step per 50 ms ' + jump.toFixed(3));
});

test('steered by you she stays close; every world has its own rhythm', () => {
    for (let t = 0; t < 120; t += 0.25) assert.equal(F.inSizeK(t, 0.4, true), F.IN_SIZE.NEAR);
    const a = [], b = [];
    for (let t = 0; t < 60; t += 0.5) { a.push(F.inSizeK(t, 0.1, false)); b.push(F.inSizeK(t, 0.9, false)); }
    assert.notDeepEqual(a, b);
});

test('the flight uses it: inside size follows inSizeK, eased from the door size; leaving starts from her size inside', () => {
    assert.doesNotMatch(src, /S\.hs = S\.base \* K\.MIN_K \/ pxPerUnit\(a, S\.p\); \/\* the size she had at the door/, 'no longer pinned at the door size');
    assert.match(src, /S\.inK \+= \(inSizeK\(/, 'eases toward the target');
    assert.match(src, /S\.hs = S\.base \* S\.inK \/ pxPerUnit\(a, S\.p\)/);
    assert.match(src, /S\.inK = K\.MIN_K/, 'lands at the door size, then comes close');
    assert.match(src, /S\.oKs = S\.ks = clamp\(S\.inK \|\| K\.MIN_K/, 'no pop when she leaves a world');
    assert.match(src, /ORBIT = \{ T: 7, R_END: 0\.16/, 'the orbit-in before a world is unchanged');
});
