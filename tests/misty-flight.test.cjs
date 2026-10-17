'use strict';
/* Oct 16, 2026 (E-man, iPhone): steering Misty out of her bubble made her shrink and kept her stuck near it. Now she keeps her
   size, stretches her bubble on the way out (no pop), flies the whole world, shrinks only near a place, warps in like a tap,
   and stays steerable inside a place she flew into. misty-flight.js. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const F = require('../misty-flight.js');

test('ships: loaded after the controller, precached, and handed the sprite by Home', () => {
    const html = read('index.html'), sw = read('sw.js'), wh = read('world-home.js'), css = read('misty-pad.css');
    assert.match(html, /<script src="misty-pad\.js\?v=([\d-]+)"><\/script>\s*<script src="misty-flight\.js\?v=\1"><\/script>/);
    assert.match(sw, /"misty-flight\.js"/);
    assert.match(wh, /MF\.wants\(mfx\)/, 'Home asks the flight each frame whether it owns Misty');
    assert.match(wh, /if \(mf\) \{ try \{ MF\.frame\(mfx\); return; \}/, 'and lets it place her, falling back to the old path on an error');
    assert.match(css, /html\.mf-in\.wh-away:not\(\.lw-clean-auto\) \.wh-hud \.wh-pad/, 'the controller stays inside a place she flew into (not on autopilot with the clean view)');
});

test('her size stays the same until she nears a place, then shrinks smoothly to the door', () => {
    assert.equal(F.approach(20), 0); assert.equal(F.approach(F.K.NEAR), 0);
    assert.equal(F.sizeK(F.approach(8)), 1, 'out in the world: same size as in her bubble');
    assert.equal(F.approach(F.K.ENTRY), 1); assert.equal(F.approach(0.2), 1);
    let last = 1;
    for (let d = F.K.NEAR; d >= F.K.ENTRY; d -= 0.1) { const k = F.sizeK(F.approach(d)); assert.ok(k <= last + 1e-9); last = k; }
    assert.ok(Math.abs(F.sizeK(1) - F.K.MIN_K) < 1e-9 && F.K.MIN_K > 0.3, 'smaller, never a speck');
});

test('the sprite matches the DOM Misty exactly (both letterbox the same art)', () => {
    assert.equal(Math.round(F.spritePx(260, 310, 260, 310)), 310);
    assert.equal(Math.round(F.spritePx(208, 206, 260, 310)), 206);
    assert.equal(Math.round(F.spritePx(130, 155)), 155);
});

test('her bubble stretches as she pushes, holds her back, and settles without popping', () => {
    assert.equal(F.stretchOf(0.3, 0.5, 1), 0, 'inside: no stretch');
    assert.equal(F.stretchOf(0.9, 0.5, 1).toFixed(2), '0.40');
    assert.equal(F.stretchOf(9, 0.5, 1), 1, 'capped: then she slips through');
    assert.equal(F.resist(0, 1), 1); assert.ok(F.resist(1, 1) < 0.5 && F.resist(1, 1) > 0.2, 'slower, never stuck');
    assert.equal(F.wobble(0.8, 0, false), 0.8);
    assert.ok(Math.abs(F.wobble(0.8, 2, false)) < 0.01, 'rings out in about two seconds');
    assert.equal(F.wobble(0.8, 0, true), 0, 'reduced motion: no wobble');
});

test('tired Misty is slower but always moves', () => {
    for (const w of ['out', 'exit', 'in']) { assert.ok(F.speed(0, w) > 0.4); assert.ok(F.speed(0.1, w) < F.speed(1, w)); }
    assert.ok(F.speed(1, 'out') > 3 * F.speed(1, 'in') / 2);
});

test('pointing the stick at a place you can see picks it (and ignores places behind you)', () => {
    const c = [{ id: 'brain', sx: -200, sy: 40, front: true }, { id: 'gut', sx: 30, sy: -220, front: true }, { id: 'heart', sx: -10, sy: 300, front: false }];
    assert.equal(F.aimAt(-1, 0.1, c).id, 'brain');
    assert.equal(F.aimAt(0.1, -1, c).id, 'gut');
    assert.equal(F.aimAt(0, 1, c), null, 'heart is behind the camera');
    assert.equal(F.aimAt(0, 0, c), null, 'no stick, no pull');
    assert.equal(F.aimAt(1, 1, c), null, 'nothing within the cone');
});

test('flying into a place uses the tap\'s own warp; a tap on a place still warps you in first (she follows: misty-roam)', () => {
    const js = read('misty-flight.js');
    assert.match(js, /a\.flyTo\(nb\.id\)/, 'same call as a tap on the place (LowiWorld3D.flyTo)');
    assert.match(js, /mode === 'drive' && !regionsBusy\(\)\) \{[\s\S]{0,600}?startWarp\(ctx, nb\); return;/, 'steering her into a place still warps on contact (after the weak-day bounce check, misty-hunt)');
    assert.match(js, /end\(ctx, 'tapped-away'\)/, 'a tap on a place takes you in first; she comes in by herself after (tests/misty-roam)');
    assert.match(js, /she smiles only when full/, 'her face comes from the same art as the DOM Misty');
});
