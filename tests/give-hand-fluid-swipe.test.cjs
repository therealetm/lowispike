'use strict';
/* Oct 26, 2026 (Emmanuel's TikTok: "Apple Design + SwiftUI Expert" agent skills). The Apple Design skill has been in this repo
   since 11 Oct (.agents/skills/apple-design). The Give a hand swipe deck built today broke three of its rules:
   - "Decide reverse vs. commit: use velocity sign, not position" + momentum projection (section 6): the deck decided by the
     AVERAGE speed of the whole drag, so dragging past the line and flicking back still paid, and a slow start with a real
     flick at the end sprang back.
   - Interruptibility (section 3): grabbing the card while it springs back made it jump to the finger (it restarted at 0).
   - Velocity handoff (section 5): the skip fly-out always took 220 ms ease-in, whatever the finger's speed. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const C = require('../gift-basket-core.js');
const gb = fs.readFileSync(path.join(__dirname, '..', 'gift-basket.js'), 'utf8');

test('project(): Apple\'s momentum projection from Designing Fluid Interfaces', () => {
    assert.equal(typeof C.project, 'function');
    assert.ok(Math.abs(C.project(1000, 0.99) - 99) < 0.01);
    assert.ok(Math.abs(C.project(-500, 0.99) + 49.5) < 0.01);
    assert.equal(C.project(0), 0);
});

test('releaseVelocity(): the finger speed over the last ~100 ms, and 0 when the finger paused before letting go', () => {
    assert.equal(typeof C.releaseVelocity, 'function');
    const h = [{ x: 0, t: 0 }, { x: 10, t: 100 }, { x: 20, t: 200 }, { x: 60, t: 250 }, { x: 120, t: 300 }];
    const v = C.releaseVelocity(h, 300);
    assert.ok(v > 900 && v < 1100, 'last 100 ms: 100 px -> about 1000 px/s, got ' + v);
    assert.equal(C.releaseVelocity(h, 600), 0, 'held still for 300 ms before release');
    assert.equal(C.releaseVelocity([], 10), 0);
    assert.equal(C.releaseVelocity([{ x: 5, t: 1 }], 1), 0);
});

test('swipeDecision with the release velocity: a flick back is a change of mind, a late flick commits', () => {
    /* dragged 130 px right (past the line) in 600 ms, then flicked back left at 600 px/s: spring back, do not pay */
    assert.equal(C.swipeDecision(130, 5, 600, 390, -600), 'back');
    assert.equal(C.swipeDecision(-130, 5, 600, 390, 600), 'back');
    /* slow 50 px over 600 ms, but released with a 1200 px/s flick: it is thrown, so it commits */
    assert.equal(C.swipeDecision(50, 5, 600, 390, 1200), 'pay');
    assert.equal(C.swipeDecision(-50, 5, 600, 390, -1200), 'skip');
    /* past the line, finger resting at release: position decides */
    assert.equal(C.swipeDecision(130, 5, 900, 390, 0), 'pay');
    assert.equal(C.swipeDecision(60, 5, 900, 390, 0), 'back');
    /* still a scroll when mostly vertical */
    assert.equal(C.swipeDecision(90, 200, 300, 390, 1500), 'back');
});

test('txOf(): reads the live on-screen x of a CSS transform', () => {
    assert.equal(typeof C.txOf, 'function');
    assert.equal(C.txOf('none'), 0);
    assert.equal(C.txOf(''), 0);
    assert.equal(C.txOf('matrix(0.98, 0.17, -0.17, 0.98, 42.5, 0)'), 42.5);
    assert.equal(C.txOf('matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,-73,4,0,1)'), -73);
});

test('the deck uses them: velocity history on move, release velocity into swipeDecision, grab from the live position, fly-out at finger speed', () => {
    assert.match(gb, /C\.releaseVelocity\(/);
    assert.match(gb, /C\.swipeDecision\(d\.dx, d\.dy, [^)]*, w, vx\)/);
    assert.match(gb, /C\.txOf\(/, 'pointerdown reads the on-screen transform so a card grabbed mid spring-back does not jump');
    assert.match(gb, /drag\.bx/);
    assert.match(gb, /flyMs/);
});
