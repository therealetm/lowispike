'use strict';
/* Bug hunt BH-002 (Oct 19 2026): Misty's Home nudge ("My sun is full! Peek in Today.") sat right above her head, on top of the
   Settings, Water and Fuel bubbles of the ring. It took 9-10 of 25 tap points on each, so a tap on the upper half of Water opened
   Today instead of Water. Rule: the nudge never covers a ring bubble or the joystick; when the head spot would, it docks at the top
   (or bottom) of the screen with no tail. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const js = read('misty-hub.js'), css = read('misty-hub.css');

function load() {
    const noop = () => { };
    const cl = { contains: () => false, add: noop, remove: noop, toggle: noop };
    const D = { readyState: 'complete', documentElement: { classList: cl, lang: 'en' }, hidden: false, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener: noop, createElement: () => ({ classList: cl, style: {}, setAttribute: noop, addEventListener: noop }) };
    const W = { document: D, addEventListener: noop, setInterval: () => 0, clearInterval: noop, setTimeout: () => 0, clearTimeout: noop, localStorage: { getItem: () => null, setItem: noop }, innerWidth: 390, innerHeight: 844 };
    W.window = W;
    const ctx = vm.createContext(Object.assign(W, { requestAnimationFrame: noop, getComputedStyle: () => ({}), CustomEvent: function () { }, navigator: {} }));
    vm.runInContext(js, ctx, { filename: 'misty-hub.js' });
    return ctx.LowiMistyHub;
}
const sq = (l, t, s) => ({ l, t, r: l + s, b: t + s });
const ov = (q, b, o) => Math.max(0, Math.min(q.l + b.w, o.r) - Math.max(q.l, o.l)) * Math.max(0, Math.min(q.t + b.h, o.b) - Math.max(q.t, o.t));
/* the ring measured on the live build (Chromium 390x844): Misty 154 px at (118, 311), eight 88 px bubbles */
const PHONE = { misty: { l: 118, t: 311, w: 154 }, view: { w: 390, h: 844 },
    ring: { settings: sq(151, 212, 88), water: sq(247, 248, 88), fuel: sq(58, 251, 88), gap: sq(15, 344, 88), move: sq(283, 344, 88), scan: sq(244, 438, 88), sleep: sq(58, 438, 88), joy: sq(151, 476, 88) } };

test('the nudge spot never covers a ring bubble or the joystick on a phone (it docks instead)', () => {
    const H = load();
    assert.strictEqual(typeof H.nudgeSpot, 'function', 'LowiMistyHub.nudgeSpot exists');
    const b = { w: 200, h: 34 }, obs = Object.values(PHONE.ring);
    const s = H.nudgeSpot(PHONE.misty, b, obs, PHONE.view);
    const q = { l: s.x - b.w / 2, t: s.t };
    for (const [k, o] of Object.entries(PHONE.ring)) assert.strictEqual(ov(q, b, o), 0, 'covers ' + k + ' at ' + JSON.stringify(s));
    assert.strictEqual(s.dock, true, 'docked, no tail');
    assert.ok(q.l >= 10 && q.l + b.w <= PHONE.view.w - 10 && q.t >= 8 && q.t + b.h <= PHONE.view.h, 'on screen');
});

test('a long German nudge on a phone still stays off every control', () => {
    const H = load();
    const b = { w: 280, h: 52 }, s = H.nudgeSpot(PHONE.misty, b, Object.values(PHONE.ring), PHONE.view);
    const q = { l: s.x - b.w / 2, t: s.t };
    for (const [k, o] of Object.entries(PHONE.ring)) assert.strictEqual(ov(q, b, o), 0, 'covers ' + k);
});

test('with nothing in the way the nudge stays right above Misty\'s head, tail on her', () => {
    const H = load();
    const s = H.nudgeSpot(PHONE.misty, { w: 200, h: 34 }, [sq(10, 700, 60)], PHONE.view);
    assert.deepStrictEqual([s.x, s.t, s.dock], [195, 311 - 34 - 10, false]);
});

test('the live nudge uses the ring bubbles and the joystick as keep-clear rects, and a docked nudge has no tail', () => {
    assert.ok(/function nudgeObstacles\(\) \{[\s\S]{0,120}querySelectorAll\('\[data-orbit\], #whPad'\)/.test(js), 'ring bubbles and joystick');
    assert.ok(/function place\(\) \{[\s\S]{0,500}nudgeSpot\([\s\S]{0,200}nudgeObstacles\(\)/.test(js), 'place() uses them');
    assert.ok(/classList\.toggle\('mh-dock', s\.dock\)/.test(js));
    assert.ok(/\.wh-hint\.mh-nudge\.mh-dock::after \{ display: none; \}/.test(css));
});
