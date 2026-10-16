'use strict';
/* Oct 16, 2026 (E-man, voice note: "When you open the community section, it takes about 4 seconds until the background starts
   playing, where we're seeing everything circle each other. That's a lag"). The slow orbit of the spirit world waited for 6 s of
   stillness (rig.idle > 6) and the pull-out kept resetting that clock, so Community sat frozen for ~7 s of world time
   (measured: first yaw change 7.25 s after LowiHost.go('foryou')). Now it runs from the first frames of the pull-out, and the
   spirit world is built and compiled ahead of time on Home so the first open does not stall. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '');
const sc = strip(fs.readFileSync(path.join(__dirname, '..', 'body-world-3d-scene.js'), 'utf8'));
const bw = strip(fs.readFileSync(path.join(__dirname, '..', 'body-world-3d.js'), 'utf8'));
const stepFn = sc.slice(sc.indexOf('function step(dt)'), sc.indexOf('function frame(now)'));

/* the drift lines of step(), run on a fake rig at 60 fps */
const a = stepFn.indexOf('rig.idle += dt;'), b = stepFn.indexOf('\n', stepFn.indexOf('rig.yaw += dt *', a));
const body = stepFn.slice(a, b);
const run = new Function('rig', 'dt', 'realmBack', body);
function secondsToMove(realm, frames) {
    const rig = { mode: 'home', idle: 0, drift: 0, yaw: 0.35 }, dt = 1 / 60;
    for (let i = 1; i <= frames; i++) { run(rig, dt, () => realm); if (Math.abs(rig.yaw - 0.35) > 1e-4) return i * dt; }
    return Infinity;
}

test('the spirit world behind Community starts circling within a few frames, not after a 6 s wait', () => {
    assert.ok(body.includes('rig.drift') && body.includes('realmBack()'), 'drift follows the realm, not only the idle clock');
    assert.ok(!/if \(rig\.idle > 6\) rig\.yaw/.test(stepFn), 'no orbit that only starts after 6 s of stillness');
    const t = secondsToMove(true, 600);
    assert.ok(t <= 0.1, 'moving within 0.1 s of the pull-out, got ' + t + ' s');
    /* eases in: the first frame is a fraction of full speed, full speed within ~1 s */
    const rig = { mode: 'home', idle: 0, drift: 0, yaw: 0 };
    run(rig, 1 / 60, () => true); const first = rig.yaw;
    for (let i = 0; i < 60; i++) run(rig, 1 / 60, () => true);
    const y0 = rig.yaw; run(rig, 1 / 60, () => true);
    assert.ok(first > 0 && first < (rig.yaw - y0) * 0.5, 'no jerk on the first frame');
    assert.ok(Math.abs((rig.yaw - y0) - 0.05 / 60) < 0.05 / 60 * 0.02, 'same orbit speed as before once running');
});

test('Home keeps its 6 s idle orbit exactly as before', () => {
    const t = secondsToMove(false, 600);
    assert.ok(t > 6 && t < 6.1, 'Home still waits 6 s, got ' + t);
    const rig = { mode: 'home', idle: 7, drift: 0, yaw: 0 }; run(rig, 1 / 60, () => false);
    assert.ok(Math.abs(rig.yaw - 0.05 / 60) < 1e-9, 'Home idle orbit at full speed, no easing');
});

test('realm drift only out past the World Map behind a page, and never with reduced motion', () => {
    const fn = sc.slice(sc.indexOf('function realmBack()'), sc.indexOf('let warmed = false'));
    assert.ok(fn.includes("rig.mode !== 'home'") && fn.includes('rig.dist > (rig.maxD || 13) * 1.06'), 'only when the camera is pulled out past the World Map');
    assert.ok(fn.includes('reduceMq && reduceMq.matches'), 'reduced motion keeps the old wait');
    assert.ok(fn.includes("classList.contains('wb-on')"), 'only while the world is the layer under a page (Community, Cook, Move, Scan)');
    assert.ok(sc.includes('idle: 0, drift: 0, fly: null'), 'rig starts with no drift');
});

test('the spirit world is built and compiled ahead of time on Home, after Home has started', () => {
    const w = sc.slice(sc.indexOf('function warm()'), sc.indexOf('function dispose()') > 0 ? sc.indexOf('function dispose()') : undefined);
    assert.ok(w.includes('if (!cosmos) cosmos = buildCosmos();') && w.includes('renderer.compile(scene, camera)'), 'builds the realm and compiles its programs');
    assert.ok(w.includes('renderer.initTexture'), 'uploads its textures');
    assert.ok(w.includes('C.g.visible = gv; C.near.visible = nv;'), 'hidden again: Home looks the same');
    assert.ok(/wallMat\.transparent = tr; wallMat\.depthWrite = dw;/.test(w), 'the tube material is put back as it was');
    assert.ok(/return \{[^}]*\bwarm\b/.test(sc), 'warm() is part of the world API');
    assert.ok(bw.includes('if (w) warmLater();'), 'scheduled once the world has loaded');
    const wl = bw.slice(bw.indexOf('function warmLater()'), bw.indexOf('function boot()'));
    assert.ok(/setTimeout\(\(\) => \{[^\n]*requestIdleCallback\(go/.test(wl) && wl.includes('2500'), 'waits until Home has settled, then an idle slot');
    assert.ok(wl.includes('world.warmed') && wl.includes('D.hidden'), 'once only, not while the app is hidden');
});
