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
  assert.match(js, /visibilitychange[\s\S]{0,200}longCancel\(\)/);
  assert.match(js, /'blur'[\s\S]{0,80}longCancel/);
});
test('Calm: joystick not hidden; keeps() honours calmKeep; companion group marked', () => {
  assert.doesNotMatch(read('galaxy-still.css').replace(/\/\*[\s\S]*?\*\//g, ''), /#whPad/);
  const G = require('../galaxy-still-core.js');
  assert.ok(G.keeps({ userData: { calmKeep: true } }) && !G.keeps({ userData: {} }));
  assert.match(read('living-bubbles.js'), /group\.userData\.calmKeep = true/);
  assert.match(read('fast-bubble.js'), /\(Date\.now\(\) - start\) \/ 36e5/, 'fasting elapsed is real time');
});
test('bloom ring: single group derives from the shared all-groups layout', () => {
  const R = read('bloom-ring.js'), H = read('home-blooms-v2.js');
  assert.match(R, /function placeShared\(groups, key\) \{ const L = place\(groups, \{ even: true \}\)/);
  assert.match(H, /R\.placeShared\(/);
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
