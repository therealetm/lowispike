'use strict';
/* Oct 17, 2026 (E-man, on autopilot, dragging the world round): "she's facing the back, but as I move the world around, I still keep
   getting her back ... when I move the world around, I shouldn't also keep Misty at the same position, looking at the back or
   looking at the front" and "she shouldn't be showing us her back all the time. That becomes boring ... sometimes ... a little look".
   Her flight heading lives in the world: turning the world (the camera orbit) shows her from another side. Her roam spot inside a
   place is fixed in the world (it was re-aimed on screen every frame, so her path turned with the camera), her sway follows the
   world, and flying away from you for a while she looks back over her shoulder. misty-flight.js, misty-face.js. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const C = require('../misty-face.js');
const F = require('../misty-flight.js');

/* the camera orbiting round the world's up by yaw: its right, up and toward-you (three.js camera +Z) axes */
function orbitCam(yaw, pitch) {
    const p = pitch || 0, cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(p), sp = Math.sin(p);
    const cf = [sy * cp, sp, cy * cp], cr = [cy, 0, -sy];
    const cu = C.cross(cf, cr).map(v => -v);
    return { cr, cu, cf };
}
/* a world-space flight heading seen from a camera: how much she faces you (1 = at you, -1 = her back) and her screen side */
function seen(L, cam) { const f = C.faceFrame(L, cam.cr, cam.cu, cam.cf, 0); return { d: f.d, vis: f.vis, sx: f.sx }; }

test('the same heading in the world shows her back, side and front as you turn the world round her', () => {
    const L = [0, 0, -1]; /* she flies away from where the camera starts */
    const at = deg => seen(L, orbitCam(deg * Math.PI / 180));
    assert.ok(at(0).d < -0.99 && at(0).vis === 0, 'from the start you see her back');
    assert.ok(Math.abs(at(90).d) < 1e-9 && Math.abs(at(270).d) < 1e-9, 'a quarter turn: her side');
    assert.ok(at(180).d > 0.99 && at(180).vis > 0.99, 'half way round the world: her front, face fully shown');
    assert.ok(at(90).sx * at(270).sx < 0, 'the two quarter turns show opposite sides');
    const ds = [0, 30, 60, 90, 120, 150, 180].map(g => at(g).d);
    for (let i = 1; i < ds.length; i++) assert.ok(ds[i] > ds[i - 1], 'turning the world round from behind to the front shows more and more of her face');
    /* with the camera tilted too */
    assert.ok(seen(L, orbitCam(Math.PI, 0.4)).d > 0.9 && seen(L, orbitCam(0, 0.4)).d < -0.9);
});

test('turning the world does not turn her: one heading, many camera angles, many different looks', () => {
    const L = C.unit([0.4, 0.1, -0.9]);
    const ds = []; for (let g = 0; g < 360; g += 15) ds.push(seen(L, orbitCam(g * Math.PI / 180)).d);
    const lo = Math.min(...ds), hi = Math.max(...ds);
    assert.ok(lo < -0.8 && hi > 0.8, 'a full turn of the world passes her back and her front (was: the same side all the way round)');
});

test('a roam spot she picked stays hers while a turn of the world keeps it in view, and is given up once it is out', () => {
    const Z = F.K.SAFE;
    assert.equal(F.roamHold(0.5, 0.5, true), true, 'in the middle of the view');
    assert.equal(F.roamHold((Z.x0 + Z.x1) / 2, (Z.y0 + Z.y1) / 2, true), true);
    assert.equal(F.roamHold(Z.x0 - 0.05, Z.y1 + 0.05, true), true, 'just outside the safe zone: a small turn never makes her change her mind');
    assert.equal(F.roamHold(0.5, 0.5, false), false, 'behind you: she picks a new spot');
    assert.equal(F.roamHold(-0.1, 0.5, true), false, 'turned out of the view to the left');
    assert.equal(F.roamHold(1.1, 0.5, true), false, 'turned out to the right');
    assert.equal(F.roamHold(0.5, 0.02, true), false, 'up under the top bar');
    assert.equal(F.roamHold(0.5, 0.99, true), false, 'down under the tab bar');
    assert.equal(F.roamHold(NaN, 0.5, true), false);
});

test('inside a place her roam spot is fixed in the world, not re-aimed on screen every frame', () => {
    const src = read('misty-flight.js');
    const body = src.slice(src.indexOf('function roamFrame('), src.indexOf('function roamFrame(') + 4000);
    assert.ok(/function rwPick\(/.test(src), 'a spot picked on screen becomes a world point once');
    assert.ok(/const tgt = S\.rw\.p;/.test(body), 'her target each frame is that world point');
    assert.ok(!/fromScreen\(a, q\.left \+ S\.rw\.x/.test(body), 'no longer turned from screen fractions into the world every frame');
    assert.ok(/roamHold\(/.test(body), 'out of the view after your turn: a new spot in view');
});

test('her soft sway follows the world and her own path, not the camera\'s right and up', () => {
    const src = read('misty-flight.js');
    assert.ok(/function swayAxes\(dir\)/.test(src));
    assert.ok(!/V\.want\.addScaledVector\(V\.up, Math\.sin\(S\.t \* 0\.7\) \* 0\.3\)\.addScaledVector\(V\.rt/.test(src), 'tour meander');
    assert.ok(!/addScaledVector\(V\.rt, Math\.cos\(S\.t \* 0\.7\) \* 0\.1 \* v\)/.test(src), 'roam meander');
    assert.ok(!/addScaledVector\(V\.b, 2\.9\)\.addScaledVector\(V\.up, 0\.4\)/.test(src), 'the stop at a world\'s door');
});

test('flying away from you for a while, she looks back over her shoulder, then flies on', () => {
    const P = { away: 0, wait: 0, left: 0 }, rnd = () => 0; /* shortest waits */
    const dt = 1 / 30; let t = 0, first = null;
    while (t < 20 && first == null) { if (C.peekStep(P, true, dt, rnd)) first = t; t += dt; }
    assert.ok(first != null && first >= C.K.PEEK_AFTER[0] - 0.05 && first <= C.K.PEEK_AFTER[0] + 0.1, 'the first look comes after a few seconds of her back: ' + first);
    let hold = 0; while (C.peekStep(P, true, dt, rnd)) hold += dt;
    assert.ok(hold >= C.K.PEEK_HOLD[0] - 0.1 && hold <= C.K.PEEK_HOLD[1], 'a short look: ' + hold.toFixed(2));
    let gap = 0; while (!C.peekStep(P, true, dt, rnd) && gap < 30) gap += dt;
    assert.ok(gap >= C.K.PEEK_GAP[0] - 0.1 && gap <= C.K.PEEK_GAP[0] + 0.2, 'then a longer gap before the next: ' + gap.toFixed(2));
    const Q = { away: 0, wait: 0, left: 0 }; let any = false;
    for (let i = 0; i < 900; i++) any = C.peekStep(Q, false, dt, rnd) || any;
    assert.equal(any, false, 'flying across or toward you she needs no look back');
    assert.ok(C.K.PEEK_AFTER[0] >= 2 && C.K.PEEK_GAP[0] > C.K.PEEK_HOLD[1], 'now and then, not all the time');
});

test('the look back turns her toward you from whatever side the world is turned to', () => {
    for (const g of [0, 40, 130, 220, 300]) {
        const cam = orbitCam(g * Math.PI / 180);
        const v = cam.cf.map(x => -x); /* flying straight away from you */
        const look = C.peekDir(v, cam.cf);
        assert.ok(C.dot(look, cam.cf) > 0.3, 'her face turns to you at ' + g + ' deg');
        const side = C.unit([cam.cr[0] - cam.cf[0], cam.cr[1] - cam.cf[1], cam.cr[2] - cam.cf[2]]);
        const l2 = C.peekDir(side, cam.cf);
        assert.ok(C.dot(l2, cam.cf) > C.dot(side, cam.cf) && C.dot(l2, cam.cr) > 0, 'flying off to the right she looks back over that shoulder');
    }
});

test('the look back is only for her own flight: never while you steer, never with reduced motion', () => {
    const src = read('misty-face.js');
    assert.ok(/if \(pk\.why === 'move' && !drive && !i\.reduced && vdir\) \{ if \(peekStep\(S\.pk, dot\(vdir, cb\.cf\) < K\.PEEK_AWAY, dt\)\)/.test(src));
});
