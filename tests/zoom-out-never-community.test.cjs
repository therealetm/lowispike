'use strict';
/* Oct 23, 2026, E-man: "Didn't I say we should deactivate the shortcut when it comes to zooming out of the world in the galaxy and
   getting into the community section? Remove it. Nuke that connection."
   Runs Home's real per-frame camera code (the r.mode === 'home' block of world-home.js) with the camera pulled all the way out to
   the universe's edge, frame after frame, and checks it never calls goTab('foryou'). The finger code in galaxy-zoom.js is checked too. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('zooming out to the far edge of the universe never opens Community', () => {
    const wh = read('world-home.js');
    const a = wh.indexOf("        if (r.mode === 'home') {\n            /* Oct 17 (handoff 6");
    assert.ok(a > 0, 'found the per-frame Home camera block');
    const b = wh.indexOf('        adventure(dt, r);', a);
    assert.ok(b > a);
    const block = wh.slice(a, b);
    const calls = [];
    const cls = new Set(['wh-world-live']);
    const H = { classList: { contains: c => cls.has(c), toggle: (c, on) => { if (on) cls.add(c); else cls.delete(c); } }, style: { getPropertyValue: () => '', setProperty() {} } };
    const W = { goTab: t => calls.push(t) };
    const D = { getElementById: () => null };
    const st = { restIntro: true, zoomAnim: null, pull: null, zf: 0, mz: '', today: false };
    const frame = new Function('r', 'st', 'H', 'W', 'D', 'reduced', 'inRegion', 'outerD', 'homeActive', 'awayHome', 'openToday', 'syncX', 'paintZoom', 'paintHint',
        block);
    const r = { mode: 'home', maxD: 13, outerD: 300, dist: 13, homeDist: 3.2, homeRest: true };
    for (let i = 0; i < 400; i++) {
        r.dist = Math.min(300, r.dist * 1.05); /* keep pinching out, then stay at the very edge */
        frame(r, st, H, W, D, () => false, () => false, x => (x && x.outerD) || 300, () => true, () => false, () => {}, () => {}, () => {}, () => {});
    }
    assert.equal(r.dist, 300, 'the camera reached the far edge');
    assert.ok(cls.has('wh-cosmos'), 'out there it is the universe view');
    assert.deepEqual(calls, [], 'Community was never opened by zooming out');
});

test('no pinch, spread or wheel in galaxy-zoom.js crosses between Home and Community', () => {
    const src = read('galaxy-zoom.js');
    assert.ok(!/addEventListener\(\s*['"](touchstart|touchmove|wheel|gesturestart)['"]/.test(src));
    assert.ok(!/goTab\)\('foryou'\)/.test(src) && !/cross\('foryou'\)/.test(src));
});

test('the tutorial no longer teaches the pinch into the Community galaxy, in any language', () => {
    const T = require('../tutorial-steps.js');
    assert.ok(!T.STEPS.some(s => s.id === 'pinch-galaxy'), 'the card is gone');
    assert.ok(!T.GESTURES.some(g => g.id === 'pinch-galaxy'), 'the gesture is gone');
    const all = JSON.stringify(T.STEPS);
    assert.ok(!/land in the Community galaxy|landest du in der Community-Galaxie|llegas a la galaxia de Comunidad/.test(all));
    const V = read('tutorial-voice-data.js');
    assert.ok(!V.includes('"pinch-galaxy"'), 'its voice clips are gone');
    for (const l of ['en', 'de', 'es']) assert.ok(!fs.existsSync(path.join(__dirname, '..', 'tutorial-voice', l, 'pinch-galaxy.mp3')));
});
