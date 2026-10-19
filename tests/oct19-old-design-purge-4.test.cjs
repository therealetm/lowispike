'use strict';
/* Oct 19 old-design purge, round 4: a phone on its side keeps the 8-bubble ring; Home never falls back to the old layout there.
   The first three checks fail on 20261019-141244; the fourth guards the old limits, the fifth the probe. */
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const O = require(path.join(root, 'home-orbit-v2.js'));
const css = fs.readFileSync(path.join(root, 'home-orbit-v2.css'), 'utf8');
const noSafe = { t: 0, r: 0, b: 0, l: 0 };
const fitsAround = (L, v) => {
  assert.equal(L.ok, true, JSON.stringify(L));
  assert.ok(L.d >= 44, 'every bubble is at least a 44px tap: ' + L.d);
  for (const k of O.ORDER) {
    const s = L.spots[k];
    assert.ok(s.x - L.d / 2 >= 0 && s.x + L.d / 2 <= v.vw && s.y - L.d / 2 >= 0 && s.y + L.d / 2 <= v.vh, k + ' on screen');
    assert.ok(Math.hypot(s.x - v.cx, s.y - v.cy) - L.d / 2 >= v.mistyR, k + ' never overlaps Misty');
  }
};

test('iPhone SE on its side (568x320) with Misty as big as the live build drew her: the ring tightens instead of turning off', () => {
  const v = { vw: 568, vh: 320, cx: 284, cy: 134.4, mistyR: 79.5, safe: noSafe };
  const L = O.fit(v);
  fitsAround(L, v); assert.equal(L.tight, true);
});

test('480x320 on its side: the ring still fits', () => {
  const v = { vw: 480, vh: 320, cx: 240, cy: 134.5, mistyR: 76.5, safe: noSafe };
  fitsAround(O.fit(v), v);
});

test('a short landscape screen shrinks Misty with the height and centres her, so the normal ring fits with room to spare', () => {
  const m = css.match(/@media \(max-height: 420px\) and \(orientation: landscape\) \{\s*:root \{ --wh-bs: clamp\((\d+)px, (\d+)vh, (\d+)px\); --wh-cy: 50%; \}/);
  assert.ok(m, 'home-orbit-v2.css has the short-landscape Misty size');
  for (const [vw, vh] of [[568, 320], [480, 320], [667, 375], [740, 360]]) {
    const bs = Math.max(+m[1], Math.min(vh * m[2] / 100, +m[3]));
    const v = { vw, vh, cx: vw / 2, cy: vh / 2, mistyR: bs / 2, safe: noSafe };
    const L = O.fit(v);
    fitsAround(L, v); assert.ok(!L.tight, vw + 'x' + vh + ' needs no tightening'); assert.ok(L.d >= 60, vw + 'x' + vh + ' d=' + L.d);
  }
});

test('the tight ring is only a last step: roomy screens are unchanged, and a screen that cannot hold even 44px bubbles still says so', () => {
  const p = O.fit({ vw: 390, vh: 844, cx: 195, cy: 390, mistyR: 110, safe: noSafe });
  assert.equal(p.ok, true); assert.ok(!p.tight); assert.ok(p.d >= 56);
  assert.equal(O.fit({ vw: 360, vh: 300, cx: 180, cy: 150, mistyR: 110, safe: noSafe }).ok, false);
  assert.equal(O.fit({ vw: 568, vh: 320, cx: 284, cy: 134.4, mistyR: 79.5, safe: noSafe, compact: false }).ok, false, 'the old rule alone could not fit it');
});

test('the short-screen ring probe stays in the repo', () => {
  const p = fs.readFileSync(path.join(root, 'playtest/probe-ring-short.cjs'), 'utf8');
  for (const s of ['568, 320', 'old Home visible', 'overlaps Misty', "'webkit'"]) assert.ok(p.includes(s), s);
});
