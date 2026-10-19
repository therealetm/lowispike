'use strict';
/* Oct 19 2026, Emmanuel: "We were both playing, shooting each other, and then it crashed ... in the community section."
   A long two-person shoot-out must not grow anything without limit or make each frame heavier than the last:
   the hit effects list has a ceiling, the map is not re-laid out on every single frame while balls fly, and slow frames get a
   lighter drawing. Fails on the old code (no capFx / placeDue, place() every frame, effects list without a ceiling). */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const E = require('../community-energy.js');
const js = fs.readFileSync(path.join(__dirname, '..', 'community-energy.js'), 'utf8');

test('the hit effects list has a ceiling, and sparks go before rings and flashes', () => {
  assert.strictEqual(typeof E.capFx, 'function', 'capFx is exported');
  assert.ok(E.MAX_FX >= 60 && E.MAX_FX <= 400, 'a sensible ceiling');
  let list = [];
  for (let h = 0; h < 60; h++) { list.push({ k: 'ring', life: .5 }, { k: 'flash', life: .3 }); for (let i = 0; i < 12; i++) list.push({ k: 'spark', life: .6 }); list = E.capFx(list); }
  assert.ok(list.length <= E.MAX_FX, 'stays under the ceiling: ' + list.length);
  assert.ok(list.filter(f => f.k !== 'spark').length >= Math.min(E.MAX_FX, 60), 'rings and flashes survive, sparks are dropped first');
  const small = [{ k: 'spark' }, { k: 'ring' }]; assert.strictEqual(E.capFx(small), small, 'under the ceiling nothing changes');
  const rings = Array.from({ length: 500 }, () => ({ k: 'ring' })); assert.strictEqual(E.capFx(rings).length, E.MAX_FX, 'even with no sparks it caps');
});

test('while balls fly the map is re-laid out at most every PLACE_MS, plus on the last frame', () => {
  assert.strictEqual(typeof E.placeDue, 'function');
  assert.ok(E.PLACE_MS >= 16 && E.PLACE_MS <= 100);
  assert.strictEqual(E.placeDue(0, 1000, false), true, 'first frame');
  assert.strictEqual(E.placeDue(1000, 1010, false), false, 'too soon');
  assert.strictEqual(E.placeDue(1000, 1010, true), true, 'forced on the last frame');
  assert.strictEqual(E.placeDue(1000, 1000 + E.PLACE_MS, false), true);
  assert.strictEqual(E.placeDue(5000, 1000, false), true, 'clock went backwards');
  /* a 60 fps shoot-out for 10 s: old code laid out the map 600 times */
  let last = 0, n = 0; for (let f = 0; f < 600; f++) { const now = 1 + f * 1000 / 60; if (E.placeDue(last, now, false)) { last = now; n++; } }
  assert.ok(n <= Math.ceil(10000 / E.PLACE_MS) + 1 && n < 400, 'place() calls in 10 s: ' + n);
});

test('the page frame uses the ceiling, the place() throttle and the slow-frame drawing', () => {
  assert.match(js, /fxList=capFx\(fxList\)/, 'effects capped every frame');
  assert.match(js, /placeDue\(lastPlace,now,/, 'place() goes through the throttle');
  assert.doesNotMatch(js, /if\(was\|\|t\.busy\(\)\)\{const m=map\(\);if\(m&&m\.place\)m\.place\(\);\}/, 'the every-frame place() is gone');
  assert.match(js, /slow=dt>SLOW_DT/, 'slow frames are noticed');
  assert.match(js, /cheap=flying\.length>6\|\|slow/, 'slow frames draw balls without blur');
  assert.match(js, /n=slow\?4:12/, 'slow frames make fewer sparks');
});

test('three minutes of two people shooting each other: nothing grows, nothing turns NaN, everyone settles', () => {
  const t = E.table({});
  const spots = [{ uid: 'me', x: 0, y: 0, r: 22, me: true }, { uid: 'friend', x: 160, y: 40, r: 22 }];
  for (let i = 0; i < 30; i++) spots.push({ uid: 'b' + i, x: Math.cos(i) * (90 + i * 9), y: Math.sin(i) * (90 + i * 9), r: 18 });
  t.sync(spots, 420);
  let events = 0, maxShots = 0, fx = [];
  for (let f = 0; f < 180 * 12; f++) { /* 12 fps, a slow phone */
    if (f % 2 === 0) { const me = t.pos('me') || { x: 0, y: 0 }, fr = t.pos('friend') || { x: 160, y: 40 };
      const p = t.predict({ uid: 'me', x: me.x, y: me.y }, Math.atan2(fr.y - me.y, fr.x - me.x), .9, 26); t.fire({ uid: 'me', x: me.x, y: me.y }, Math.atan2(fr.y - me.y, fr.x - me.x), .9, 26, { id: 'm' + f, to: p.to, ht: p.ht });
      t.fire({ uid: 'friend', x: fr.x, y: fr.y }, Math.atan2(me.y - fr.y, me.x - fr.x), .9, 26, { id: 'f' + f, to: 'me', ht: 300, remote: true, age: 120 }); }
    const ev = t.step(1 / 12); events += ev.length; for (const e of ev) if (e.type === 'hit') for (let i = 0; i < 14; i++) fx.push({ k: i < 2 ? 'ring' : 'spark' }); fx = E.capFx(fx);
    maxShots = Math.max(maxShots, t.shots().length);
    for (const s of spots) { const p = t.pos(s.uid); if (p) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), 'finite position for ' + s.uid); }
    assert.ok(fx.length <= E.MAX_FX);
  }
  assert.ok(maxShots <= 24, 'balls in flight capped: ' + maxShots);
  assert.ok(events > 100, 'the shoot-out really happened: ' + events);
  for (let f = 0; f < 60 * 30 && t.busy(); f++) t.step(1 / 60);
  assert.strictEqual(t.busy(), false, 'everything settles once the shooting stops');
});
