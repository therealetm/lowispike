// Real 3D body world: pure helpers, fallback rules, public API shape for other builds, loader + cache hooks.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const BW = require('../body-world-3d.js');
const src = fs.readFileSync(path.join(root, 'body-world-3d.js'), 'utf8');
const scene = fs.readFileSync(path.join(root, 'body-world-3d-scene.js'), 'utf8');

test('falls back to 2D without WebGL, with reduced motion, save-data or ?no3d', () => {
    assert.deepEqual(BW.shouldUse3D({ webgl: true }), { ok: true, why: '' });
    assert.equal(BW.shouldUse3D({ webgl: false }).why, 'no-webgl');
    assert.equal(BW.shouldUse3D({ webgl: true, reduced: true }).why, 'reduced-motion');
    assert.equal(BW.shouldUse3D({ webgl: true, saveData: true }).why, 'save-data');
    assert.equal(BW.shouldUse3D({ webgl: true, disabled: true }).why, 'off');
    assert.equal(BW.shouldUse3D().ok, false);
});

test('gyro: iOS asks behind one tap, Android plain, desktop none', () => {
    assert.equal(BW.gyroKind({ touch: true, needsPermission: true, hasEvent: true }), 'ask');
    assert.equal(BW.gyroKind({ touch: true, needsPermission: false, hasEvent: true }), 'plain');
    assert.equal(BW.gyroKind({ touch: false, hasEvent: true }), 'none');
    assert.equal(BW.gyroAngles({}), null);
    const a = BW.gyroAngles({ alpha: 30, beta: 10, gamma: 0 }, { alpha: 0, beta: 0, gamma: 0 });
    assert.ok(Math.abs(a.yaw - 30 * Math.PI / 180) < 1e-9);
    assert.ok(a.pitch < 0);
    assert.equal(BW.wrapDeg(190), -170);
    assert.equal(BW.pinchFactor(100, 50), 2);
    assert.equal(BW.pinchFactor(0, 50), 1);
    assert.ok(/requestPermission\(\)/.test(src));
});

test('places carry id, hue and three languages', () => {
    assert.ok(BW.PLACES.length >= 6);
    BW.PLACES.forEach(p => { assert.ok(p.id); assert.match(p.hue, /^#[0-9a-f]{6}$/i); assert.equal(p.name.length, 3); });
});

test('window.LowiWorld3D exposes the shared API and one WebGL context', () => {
    ['ready', 'THREE', 'scene', 'camera', 'renderer', 'hub', 'regions', 'open', 'close', 'isOpen', 'onFrame', 'places', 'flyTo', 'setGlow'].forEach(k => assert.ok(new RegExp('\\b' + k + '\\s*[:(]').test(src) || src.includes(k + ':'), 'api ' + k));
    assert.ok(src.includes("'lowi:world3d-ready'"));
    assert.ok(src.includes('if (W.LowiWorld3D) return;'));
    assert.ok(/return \{ scene, camera, hub, regions, onFrame/.test(scene));
    assert.equal((scene.match(/new THREE\.WebGLRenderer/g) || []).length, 1);
    assert.ok(/onFrame\(fn\)[\s\S]*return \(\) => frameFns\.delete\(fn\)/.test(scene));
});

test('loader and service worker know the 3D files', () => {
    const ui = fs.readFileSync(path.join(root, 'apple-ui.js'), 'utf8'), sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
    assert.ok(ui.includes("'body-world-3d.js'"));
    ['body-world-3d.js', 'body-world-3d-scene.js', 'body-world-3d.css', 'vendor/three-0.160.1.module.min.js'].forEach(f => assert.ok(sw.includes('"' + f + '"'), f));
    assert.ok(fs.existsSync(path.join(root, 'vendor/three-0.160.1.module.min.js')));
});
