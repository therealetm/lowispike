'use strict';
/* Bug hunt BH-005 (Oct 19, 2026): the Move bloom's note ("Estimate, not steps · 0/4 today") sat on the Move bubble itself.
   Live 20261019-121209, Chromium 390x844: the note covered 67% of the Move bubble and clipped the Medium and Long orbs, because
   on a phone Move is at the right edge, the spot "beyond the orbs, away from Misty" is off screen and was clamped back onto it.
   It was also squeezed to a 110 px column (absolute box shrink-to-fit near the right edge).
   Rule now: the note keeps its spot when that is clear; otherwise it goes just above or below the orbs, else docks at the top or
   bottom of the screen, never on a ring bubble, an orb, Misty or the joystick. Browser check: BUGHUNT playtest probe-movenote.cjs. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const core = require('../home-blooms-v2.js');
const src = fs.readFileSync(path.join(__dirname, '..', 'home-blooms-v2.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'home-blooms-v2.css'), 'utf8');

const R = (l, t, w, h) => ({ left: l, top: t, right: l + w, bottom: t + h });
const rectOf = (p, s) => ({ left: p.x - s.w / 2, top: p.y - s.h / 2, right: p.x + s.w / 2, bottom: p.y + s.h / 2 });
const ov = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

/* measured on live 20261019-121209, Chromium 390x844, Move bloom open */
const PHONE = {
  view: { w: 390, h: 844, top: 8 },
  obs: [R(22, 344, 88, 88), R(242, 253, 88, 88), R(280, 344, 88, 88), R(60, 253, 88, 88), R(151, 473, 88, 88), R(242, 436, 88, 88),
    R(60, 436, 88, 88), R(151, 215, 88, 88), R(120, 313, 150, 150),
    R(310, 234, 74, 74), R(310, 312, 74, 74), R(310, 390, 74, 74), R(310, 468, 74, 74)],
  first: { x: 280, y: 388 },
  orbs: R(310, 234, 74, 308)
};

test('noteSpot is part of the pure core', () => {
  assert.strictEqual(typeof core.noteSpot, 'function');
});

test('a clear spot is kept exactly (iPad, room beyond the orbs)', () => {
  const s = { w: 200, h: 32 };
  const p = core.noteSpot(s, { x: 600, y: 300 }, [R(100, 100, 80, 80)], { w: 1180, h: 820, top: 8 }, null);
  assert.deepStrictEqual([p.x, p.y, !!p.dock], [600, 300, false]);
});

test('phone: the Move note never covers the Move bubble, any ring bubble, an orb, Misty or the joystick', () => {
  for (const s of [{ w: 200, h: 32 }, { w: 220, h: 48 }, { w: 120, h: 64 }]) {
    const p = core.noteSpot(s, PHONE.first, PHONE.obs, PHONE.view, PHONE.orbs);
    const r = rectOf(p, s);
    PHONE.obs.forEach((o, i) => assert.strictEqual(ov(r, o), 0, 'note ' + JSON.stringify(r) + ' overlaps obstacle ' + i));
    assert.ok(r.left >= 0 && r.right <= 390 && r.top >= 8 && r.bottom <= 844, 'on screen: ' + JSON.stringify(r));
  }
});

test('the old spot on the phone really was on the Move bubble (guards the test data)', () => {
  const s = { w: 110, h: 63 };
  assert.ok(ov(rectOf(PHONE.first, s), PHONE.obs[2]) > 2000);
});

test('with no clear spot anywhere it still lands on screen at the least-covered dock', () => {
  const s = { w: 200, h: 32 };
  const p = core.noteSpot(s, { x: 195, y: 422 }, [R(0, 0, 390, 844)], { w: 390, h: 844, top: 8 }, null);
  const r = rectOf(p, s);
  assert.ok(r.left >= 0 && r.right <= 390 && r.top >= 8 && r.bottom <= 844);
  assert.strictEqual(p.dock, true);
});

test('the page places the note after it is in the DOM, against the ring, the joystick and the orbs, on open and refresh', () => {
  assert.match(src, /function placeNote\(/);
  const body = src.slice(src.indexOf('function placeNote('), src.indexOf('function open(kind, src)'));
  assert.match(body, /\[data-orbit\]/);
  assert.match(body, /whPad/);
  assert.match(body, /noteSpot\(/);
  const openFn = src.slice(src.indexOf('function open(kind, src)'), src.indexOf('function refreshOpen('));
  assert.ok(openFn.indexOf('placeNote(ov)') > openFn.indexOf('D.body.appendChild(ov)'), 'open(): placeNote after the bloom is attached');
  const refresh = src.slice(src.indexOf('function refreshOpen('), src.indexOf('function close('));
  assert.match(refresh, /placeNote\(st\.ov\)/);
});

test('the note is not squeezed into a thin column at the screen edge', () => {
  const rule = css.slice(css.indexOf('.hb2-note {'), css.indexOf('}', css.indexOf('.hb2-note {')));
  assert.match(rule, /width:\s*max-content/);
  assert.match(rule, /max-width:\s*220px/);
});
