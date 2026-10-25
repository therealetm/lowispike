/* BH-023 (bug hunt run 24, 25 Oct 2026): a two-finger pinch on Home fired a bubble's long press.
   Found by playing the live build 20261025-202023 (BUGHUNT/playtest/probe-pinch.cjs seed 24, then probe-pinch-hold.cjs, Chromium 390):
   a slow pinch with one finger resting on the Move bubble opened the Move page. living-bubbles.js followed only the finger that
   pressed the bubble, so a second finger never cancelled the 540 ms long press (and if the second finger landed on a bubble, that one's
   long press armed instead: meal details on the meals bubble, the start-time editor on a running fast).
   Rule: a long press is one finger. Once a second finger is down it is a pinch: no long press fires anywhere on Home, and a fresh
   single-finger press afterwards still works. The same guard sits in the other Home holds (water reset, Fuel/Move bloom hold,
   Settings/Sleep hold, the Move bubble's fallback hold). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

/* living-bubbles.js on a minimal page: listeners by type, a hand-cranked clock and timers */
function page() {
  let t = 1000; const timers = new Map(); let tid = 0; const L = { doc: {}, win: {} };
  const on = bag => (n, f) => { (bag[n] = bag[n] || []).push(f); };
  const el = (cls) => { const set = new Set(cls ? [cls] : []), attrs = {}; const e = { nodeType: 1, isConnected: true, dataset: {}, id: '',
    classList: { add: (...c) => c.forEach(x => set.add(x)), remove: (...c) => c.forEach(x => set.delete(x)), contains: c => set.has(c) },
    setAttribute: (k, v) => { attrs[k] = v; }, getAttribute: k => attrs[k] ?? null, removeAttribute: k => { delete attrs[k]; },
    contains: x => x === e, closest: () => null, getBoundingClientRect: () => ({ left: 0, top: 0, width: 88, height: 88 }) }; return e; };
  const D = { documentElement: el(), head: { appendChild() {} }, hidden: false, addEventListener: on(L.doc),
    querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => el() };
  const W = { document: D, console, performance: { now: () => t }, navigator: {}, addEventListener: on(L.win),
    matchMedia: () => ({ matches: false, addEventListener() {} }), getComputedStyle: () => ({ borderTopLeftRadius: '20px' }),
    setTimeout: (f, ms) => { timers.set(++tid, { f, at: t + (ms || 0) }); return tid; }, clearTimeout: i => timers.delete(i),
    setInterval: () => 0, requestAnimationFrame: () => 0, cancelAnimationFrame() {} };
  W.window = W; vm.createContext(W);
  vm.runInContext(read('living-bubbles.js'), W);
  W.advance = ms => { t += ms; for (const [i, x] of [...timers]) if (x.at <= t) { timers.delete(i); x.f(); } };
  W.fire = (n, e) => (L.doc[n] || []).forEach(f => f(Object.assign({ button: 0, pointerType: 'touch', preventDefault() {}, stopPropagation() {}, stopImmediatePropagation() {} }, e)));
  W.el = el;
  return W;
}

function withBubble() {
  const W = page(), b = W.el(), other = W.el(); let longs = 0;
  W.LowiLivingBubble.attach(b, { kind: 'move', onLong: () => { longs++; return true; } });
  return { W, b, other, longs: () => longs };
}

test('BH-023: one finger held still on a bubble still opens its long press', () => {
  const { W, b, longs } = withBubble();
  W.fire('pointerdown', { target: b, pointerId: 1, isPrimary: true, clientX: 100, clientY: 100 });
  W.advance(600);
  assert.strictEqual(longs(), 1);
});

test('BH-023: a second finger landing anywhere turns it into a pinch, so no long press fires', () => {
  const { W, b, other, longs } = withBubble();
  W.fire('pointerdown', { target: b, pointerId: 1, isPrimary: true, clientX: 100, clientY: 100 });
  W.advance(120);
  W.fire('pointerdown', { target: other, pointerId: 2, isPrimary: false, clientX: 260, clientY: 100 });
  W.advance(800);
  assert.strictEqual(longs(), 0, 'pinch with a finger resting on the bubble must not open its long press');
  assert.strictEqual(b.dataset.pressed, undefined, 'the press squish is let go');
});

test('BH-023: a pinch whose second finger lands on the bubble does not arm that bubble either', () => {
  const { W, b, other, longs } = withBubble();
  W.fire('pointerdown', { target: other, pointerId: 1, isPrimary: true, clientX: 40, clientY: 100 });
  W.fire('pointerdown', { target: b, pointerId: 2, isPrimary: false, clientX: 200, clientY: 100 });
  W.advance(800);
  assert.strictEqual(longs(), 0);
});

test('BH-023: after the pinch ends, a new single-finger long press works again, even if a lift was never reported', () => {
  const { W, b, other, longs } = withBubble();
  W.fire('pointerdown', { target: b, pointerId: 1, isPrimary: true, clientX: 100, clientY: 100 });
  W.fire('pointerdown', { target: other, pointerId: 2, isPrimary: false, clientX: 260, clientY: 100 });
  W.fire('pointerup', { target: b, pointerId: 1 });
  /* pointer 2's lift is lost (app sent to the background mid-pinch) */
  W.advance(1000);
  W.fire('pointerdown', { target: b, pointerId: 3, isPrimary: true, clientX: 100, clientY: 100 });
  W.advance(600);
  assert.strictEqual(longs(), 1);
});

test('BH-023: a mouse press is never counted as a finger', () => {
  const { W, b, longs } = withBubble();
  W.fire('pointerdown', { target: b, pointerId: 1, isPrimary: true, pointerType: 'mouse', clientX: 100, clientY: 100 });
  W.advance(600);
  assert.strictEqual(longs(), 1);
});

test('BH-023: the other Home holds drop their hold when a second finger lands', () => {
  const src = {
    'world-home.js': /pointerdown', e => \{\s*if \(e\.isPrimary === false\) \{ lpCancel\(\); return; \}/,
    'home-blooms-v2.js': /function onDown\(e\) \{[\s\S]{0,200}if \(e\.isPrimary === false\) \{ if \(st\.hold\) \{ clearTimeout\(st\.hold\.t\); st\.hold = null; \} return; \}/,
    'home-settings-sleep-v2.js': /function onHoldDown\(e\) \{[\s\S]{0,120}if \(e\.isPrimary === false\) \{ holdCancel\(\); return; \}/,
    'move-bubble.js': /D\.addEventListener\('pointerdown', e => \{ if \(down && e\.isPrimary === false\) \{ clear\(\);/,
  };
  for (const [f, re] of Object.entries(src)) assert.match(read(f), re, f + ' keeps the second-finger guard');
});
