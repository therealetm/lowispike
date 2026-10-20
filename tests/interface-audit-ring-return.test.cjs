'use strict';
/* Interface audit 20 Oct 2026 (IA-05). Settings > Workouts, then the tab bar back to Home: Misty's bubble was still parked
   off the screen (left -292px, 194px wide) while the ring re-measured, fit() failed and the ring dropped, so the old Home with
   the tab bar and without Scan / Sleep / Settings showed for about 4 s in WebKit. The ring now keeps its last good layout while
   Misty is not fully on the screen, for at most 6 s, and a real short screen still drops it. */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const O = require('../home-orbit-v2.js');
const src = fs.readFileSync(path.join(__dirname, '../home-orbit-v2.js'), 'utf8');

test('a Misty bubble parked off the screen or cut by an edge counts as in transit', () => {
  assert.equal(O.offscreen({ left: -292, top: 182, width: 194, height: 194 }, 390, 664), true);
  assert.equal(O.offscreen({ left: 300, top: 200, width: 194, height: 194 }, 390, 664), true);
  assert.equal(O.offscreen({ left: 98, top: 600, width: 194, height: 194 }, 390, 664), true);
  assert.equal(O.offscreen(null, 390, 664), true);
});

test('a resting Misty fully on the screen is not in transit', () => {
  assert.equal(O.offscreen({ left: 98, top: 205, width: 194, height: 194 }, 390, 664), false);
  assert.equal(O.offscreen({ left: 60, top: 140, width: 200, height: 200 }, 320, 568), false);
});

test('layout keeps the last good ring while Misty flies back, gives up after 6 s, and still drops on a real short screen', () => {
  const lay = src.slice(src.indexOf('function layout(force)'), src.indexOf('function soon()'));
  assert.match(src, /if \(!L\.ok && offscreen\(r, vw, vh\)\) L\.transit = true;/);
  assert.match(lay, /else if \(wasOn && last && last\.ok\) \{ if \(!transitAt\) transitAt = Date\.now\(\); if \(Date\.now\(\) - transitAt < 6000\) \{ soon\(\); return last; \} \}/);
  assert.ok(lay.indexOf('transitAt') < lay.indexOf("H.classList.remove('o8', 'o8-wide')"), 'the transit hold runs before the drop');
  assert.match(lay, /if \(!L\.ok\) \{ if \(wasOn\) \{ H\.classList\.remove\('o8', 'o8-wide'\); soon\(\); \}/, 'a short screen still drops the ring');
  assert.ok(src.indexOf('let transitAt = 0') < src.indexOf('function layout(force)'), 'declared before layout can run');
});
