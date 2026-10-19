'use strict';
/* Oct 19, 2026, worlds playtest W-005 (iPhone 13 WebKit and Chromium, live 20261019-140135): opened from the World map, the lung
   world never got Misty. Its guide talked to an empty world for minutes (st stayed 'idle', no 'join lung' in her log), while brain,
   liver and heart got her in about 20 s. Cause: misty-flight.js join() only let her into a place that has a 3D beacon on the hub
   (a.regions, built from body-world-3d.js places), and the lung world was added later without one. She now joins every world
   LowiWorldRegions knows, beacon or not (enterInside already falls back to the view's target when there is no beacon). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const F = require('../misty-flight.js');
const R = require('../body-world-regions.js');

const beacons = () => [...read('body-world-3d.js').matchAll(/\bid: *'([a-z]+)'/g)].map(m => m[1]);

test('placeOk: a world with or without a hub beacon lets her in, Home and unknown ids do not', () => {
    assert.equal(typeof F.placeOk, 'function', 'core exports placeOk');
    const known = id => !!R.byId(id) && R.norm(id) !== 'hub';
    const regs = [{ id: 'brain' }, { id: 'muscles' }];
    assert.equal(F.placeOk('brain', regs, known), true);
    assert.equal(F.placeOk('muscle', regs, known), true, 'muscles beacon still matches the muscle world');
    assert.equal(F.placeOk('lung', regs, known), true, 'the lung world has no beacon and must still let her in');
    assert.equal(F.placeOk('lung', regs, null), false, 'without the world list only beacons count');
    assert.equal(F.placeOk('hub', regs, known), false, 'Home is not a place to join');
    assert.equal(F.placeOk('nowhere', regs, known), false);
    assert.equal(F.placeOk(null, regs, known), false);
});

test('every world on the World map lets Misty join, including the beacon-less lung', () => {
    const b = beacons();
    assert.ok(!b.includes('lung'), 'precondition: lung has no hub beacon (if it gets one, this test still holds)');
    const known = id => !!R.byId(id) && R.norm(id) !== 'hub';
    const regs = b.map(id => ({ id }));
    for (const w of R.REGIONS) assert.equal(F.placeOk(w.id, regs, known), true, w.id + ' must let Misty join');
});

test('wired: the misty-roam join gate asks placeOk with the world list, not the beacons alone', () => {
    const js = read('misty-flight.js');
    const block = js.slice(js.indexOf("if (S.st === 'idle' && ctx.inRegion)"), js.indexOf("if (S.st === 'idle' && ctx.inRegion)") + 700);
    assert.match(block, /placeOk\(curRegion\(\), a\.regions/, 'join gate uses placeOk');
    assert.doesNotMatch(block, /\(a\.regions \|\| \[\]\)\.some\(g => norm\(g\.id\) === curRegion\(\)\)/, 'the beacon-only check is gone');
});
