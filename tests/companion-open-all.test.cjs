/* Nov 5 2026: hold the Home joystick to open all bubbles; joystick stays in Calm; companion kept in Calm; no timed trips; Billiards aim stick. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
test('joystick long press: drift cancels, hold opens all, armed at home and in Calm', () => {
  const A = require('../misty-pad.js');
  assert.equal(A.press(A.LONG_MS + 10, A.DRIFT + 1), 'drag');
  assert.equal(A.press(A.LONG_MS, 2), 'long');
  assert.equal(A.press(100, 0), 'tap');
  assert.ok(A.longArmed('', false) && A.longArmed('auto', true) && !A.longArmed('auto', false));
  const js = read('misty-pad.js');
  assert.match(js, /LowiBloomRing[\s\S]{0,80}toggleAll\(\)/);
  /* a hidden page and a window blur clear the pending long press: run on the misty-pad.js fake page with real pointer events
     (was a source match; the full set of paths is in tests/ui-joystick-open-all.test.cjs) */
  const { fakePage } = require('./fixtures/misty-pad-page.cjs');
  for (const end of [p => { p.D.hidden = true; p.D.fire('visibilitychange'); }, p => p.W.fire('blur')]) {
    const p = fakePage(); let n = 0;
    p.W.LowiBloomRing = { toggleAll() { n++; return true; } };
    p.pad().getBoundingClientRect = () => ({ left: 165, top: 680, width: 60, height: 60, right: 225, bottom: 740 });
    p.down({ clientX: 195, clientY: 710 }); p.advance(200); end(p); p.advance(A.LONG_MS + 300);
    assert.equal(n, 0, 'the long press never fires after it was cleared');
    const q = fakePage(); let m = 0;
    q.W.LowiBloomRing = { toggleAll() { m++; return true; } };
    q.pad().getBoundingClientRect = () => ({ left: 165, top: 680, width: 60, height: 60, right: 225, bottom: 740 });
    q.down({ clientX: 195, clientY: 710 }); q.advance(A.LONG_MS + 10);
    assert.equal(m, 1, 'control: the same press, not cleared, opens them');
  }
});
test('Calm: joystick not hidden; keeps() honours calmKeep; companion group marked', () => {
  assert.doesNotMatch(read('galaxy-still.css').replace(/\/\*[\s\S]*?\*\//g, ''), /#whPad/);
  const G = require('../galaxy-still-core.js');
  assert.ok(G.keeps({ userData: { calmKeep: true } }) && !G.keeps({ userData: {} }));
  assert.match(read('living-bubbles.js'), /group\.userData\.calmKeep = true/);
  assert.match(read('fast-bubble.js'), /\(Date\.now\(\) - start\) \/ 36e5/, 'fasting elapsed is real time');
});
test('bloom ring: single group derives from the shared all-groups layout', () => {
  /* each overview group's single bloom is exactly its slice of the all-bubbles layout (same orbs, zoom, radius, size); the groups the
     overview leaves out go on the same circle (tests/bloom-zoom-reopen.test.cjs). Was a source match on placeShared(groups, key). */
  const BR = require('../bloom-ring.js'), c = { x: 195, y: 388 }, keys = ['settings', 'water', 'move', 'scan', 'joy', 'sleep', 'gap', 'fuel'];
  const ring = keys.map((k, i) => { const t = -Math.PI / 2 + i * Math.PI / 4; return { key: k, x: c.x + 130 * Math.cos(t), y: c.y + 130 * Math.sin(t), r: 32 }; });
  const L = BR.layoutAt({ c, mistyR: 75, ring, groups: [{ key: 'water', n: 3 }, { key: 'move', n: 3 }, { key: 'sleep', n: 3 }], d: 66, even: true }, 0.65);
  for (const k of ['water', 'move', 'sleep']) {
    const one = BR.only(L, k);
    assert.deepEqual(one.orbs, L.orbs.filter(o => o.key === k), k);
    assert.ok(one.s === L.s && one.rho === L.rho && one.d === L.d && one.step === L.step, k);
  }
  assert.match(read('bloom-ring.js'), /function placeShared\(groups, key, n\) \{\s*const L = place\(groups, \{ even: true \}\)/);
  assert.match(read('home-blooms-v2.js'), /R\.placeShared\(/);
});
test('no timed trips: departures off, outstanding trips end once', () => {
  const S = require('../sun-meter.js');
  const now = 1e12, g = { trips: { d1: { start: now - 1000, back: now + 9e6 }, d2: { start: now - 5, back: now - 1, got: true } } };
  assert.equal(S.endTimedTrips(g, now), 1);
  assert.equal(g.trips.d1.back, now);
  assert.equal(S.endTimedTrips(g, now + 5), 0, 'idempotent');
  const sm = read('sun-meter.js');
  assert.match(sm, /const TIMED_TRIPS = false;/);
  assert.match(sm, /function depart\(\) \{\s*if \(!TIMED_TRIPS\) return false;/);
});
test('Billiards: hint sentence gone, aim stick reuses aim + fire, never auto-fires', () => {
  const js = read('room-table.js');
  assert.doesNotMatch(js, /rt-hint/);
  assert.match(js, /class="rt-stick"/);
  assert.match(js, /function stickAim\([^)]*\)\{[^\n]*C\.aim\(/);
  assert.match(js, /if\(a&&!cancel&&a\.p>=\.08\)fire\(a\.dx,a\.dy,a\.p\)/);
  for (const ev of ['pointercancel', 'lostpointercapture', 'pagehide']) assert.match(js, new RegExp("'" + ev + "',[^\\n]{0,40}stickEnd\\([^)]*true\\)"));
  assert.match(read('room-table.css'), /\.rt-stick\{/);
});
