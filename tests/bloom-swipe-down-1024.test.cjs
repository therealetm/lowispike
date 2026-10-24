'use strict';
// Oct 24 2026 back and close sweep (17:40): the Move, Sleep, Water, Fuel and Hold Scan blooms (home-blooms-v2.js #hb2Bloom) closed
// with back, Escape or a tap on the empty space round the orbs, but a swipe down did nothing (on a phone a moved finger sends no
// click), unlike the app's sheets. A swipe down on that empty space (the scrim) now folds the bloom; a swipe on an orb, a sideways
// or upward swipe and a tiny wobble do not, and the scrim keeps the browser from taking the gesture (touch-action: none).
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '..', 'home-blooms-v2.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'home-blooms-v2.css'), 'utf8');

function rig() {
    const i = src.indexOf('function swipeShut('), j = src.indexOf('function onBloomClick(');
    assert.ok(i > 0 && j > i, 'swipeShut exists before onBloomClick');
    const h = {}, ov = { addEventListener: (t, f) => { (h[t] = h[t] || []).push(f); } };
    const fire = (t, e) => (h[t] || []).forEach(f => f(e));
    const box = { closed: 0 };
    const make = new Function('box', 'ov', 'const st = { ov }; function close(){ box.closed++; st.ov = null; }\n' + src.slice(i, j) + '\nswipeShut(ov);');
    make(box, ov);
    const scrim = { classList: { contains: c => c === 'hb2-scrim' } }, orb = { classList: { contains: c => c === 'hb2-orb' } };
    const swipe = (dx, dy, target, end) => {
        fire('pointerdown', { pointerId: 3, clientX: 200, clientY: 300, target: target || scrim });
        fire(end || 'pointerup', { pointerId: 3, clientX: 200 + dx, clientY: 300 + dy, target: target || scrim });
    };
    return { box, swipe, orb };
}

test('both ways a bloom opens (one bubble, Hold Scan = all) wire the swipe', () => {
    const one = src.slice(src.indexOf('function open('), src.indexOf('function refreshOpen('));
    const all = src.slice(src.indexOf('function openAll('), src.indexOf('function moveNote('));
    assert.match(one, /swipeShut\(ov\)/);
    assert.match(all, /swipeShut\(ov\)/);
});

test('a swipe down on the empty space closes the bloom', () => {
    const a = rig(); a.swipe(10, 160); assert.strictEqual(a.box.closed, 1);
    const b = rig(); b.swipe(0, 120, null, 'pointercancel'); assert.strictEqual(b.box.closed, 1, 'a cancelled pointer far down still counts');
});

test('a wobble, a sideways or upward swipe, or a swipe that starts on an orb leaves it open', () => {
    const a = rig(); a.swipe(0, 20); assert.strictEqual(a.box.closed, 0, 'small move');
    const b = rig(); b.swipe(160, 90); assert.strictEqual(b.box.closed, 0, 'mostly sideways');
    const c = rig(); c.swipe(0, -200); assert.strictEqual(c.box.closed, 0, 'upward');
    const d = rig(); d.swipe(0, 200, d.orb); assert.strictEqual(d.box.closed, 0, 'started on an orb');
});

test('the scrim owns the gesture so the browser does not cancel it as a scroll', () => {
    assert.match(css, /\.hb2-bloom \.hb2-scrim \{[^}]*touch-action: none/);
});
