'use strict';
/* Oct 16 (E-man, photo of the Today sheet): Ride along is gone ("Your inside" stays as a slim row), the journey log names
   the place instead of a cut-off fact, the journey row says when the next journey starts and starts it on a tap,
   the sun resets at local midnight and says so, and the energy bar stays inside the sheet. */
const {test} = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');
const B = require('../body-trips.js'), C = require('../micro-book-core.js'), SUN = require('../sun-meter.js');

test('Ride along is gone: no files, no shell entries, no ride API; Your inside stays as a plain row', () => {
  for (const f of ['body-ride.js', 'body-ride-core.js', 'body-ride.css']) assert.ok(!fs.existsSync(path.join(root, f)), f + ' removed');
  const ui = read('apple-ui.js'), sw = read('sw.js'), inside = read('inside-row.js');
  assert.ok(!/body-ride/.test(ui) && !/body-ride/.test(sw) && !/body-ride/.test(read('index.html')));
  assert.ok(ui.includes("'inside-row.js'") && sw.includes('"inside-row.js"'));
  for (const f of ['season.js', 'atmosphere.js', 'world-audio.js', 'inside-row.js']) assert.ok(!/W(indow)?\.LowiRide\b|lowi:ride-start/.test(read(f).replace(/\/\*[\s\S]*?\*\//g, '')), f);
  const code = inside.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/Ride along|Mitfahren|Viajar dentro|br-go|data-br/.test(code), 'no ride button or copy');
  assert.match(code, /inside: \['Your inside', 'Dein Inneres', 'Tu interior'\]/);
  assert.match(code, /LowiWorldHealth/);
  assert.match(code, /w\.scene\.fog/, 'the world still follows your inside');
});

test('journey log: a cut-off fact never shows as what the cell discovered', () => {
  const fact = 'While you fast, the liver releases stored sugar to keep your blood sugar steady between me';
  const ts = new Date(2026, 9, 16, 10).getTime();
  const j = C.journeys([], [{id: 'body-trip:2026-10-16:3', place: 'Liver', saw: fact, ts}]);
  assert.equal(j.length, 1);
  assert.ok(!/While you fast/.test(JSON.stringify(j[0].place.saw)));
  assert.match(String(j[0].place.saw[0]), /liver/i);
  const ok = C.journeys([], [{id: 'x1', place: 'gut', saw: 'the villi of the small intestine', ts}]);
  assert.equal(ok[0].place.saw[0], 'the villi of the small intestine');
  assert.doesNotMatch(read('body-trips.js'), /saw: String\(f\[/, 'body-trips no longer sends the fact as saw');
});

test('next journey: ready with a place, away, back, tired, tomorrow with the time to midnight', () => {
  const T0 = new Date('2026-10-16T09:00:00').getTime();
  const st = B.fresh({});
  let n = B.next(st, T0, false);
  assert.equal(n.kind, 'ready'); assert.equal(n.left, 3); assert.ok(B.byId(n.place)); assert.notEqual(n.place, 'blood');
  assert.equal(B.next(st, T0, true).kind, 'tired');
  st.p.gut.x = 5; st.p.liver.x = 0;
  assert.notEqual(B.suggest(st), 'gut', 'least explored first');
  for (let i = 0; i < 3; i++) {
    const t = B.start(st, B.next(st, T0 + i * B.TRIP_MS * 2, false).place, T0 + i * B.TRIP_MS * 2);
    assert.ok(t, 'trip ' + (i + 1));
    assert.equal(B.next(st, T0 + i * B.TRIP_MS * 2 + 1000, false).kind, 'away');
    assert.equal(B.next(st, t.back, false).kind, 'back');
    assert.ok(B.claim(st, t.back));
  }
  const late = T0 + 7 * B.TRIP_MS;
  n = B.next(st, late, false);
  assert.equal(n.kind, 'tomorrow');
  const mid = new Date(2026, 9, 17, 0, 0, 0, 0).getTime();
  assert.equal(n.inMs, mid - late);
  assert.equal(B.next(st, mid + 60000, false).kind, 'ready', 'a new day brings new journeys');
  assert.equal(B.fmtHM(6 * 3600e3 + 5 * 60e3), '6:05');
  const src = read('body-trips.js');
  assert.match(src, /nextGo: \['Start next journey', 'Nächste Reise starten', 'Empezar el próximo viaje'\]/);
  assert.match(src, /nextTomorrow: \['Next journey tomorrow'/);
  assert.match(src, /function startNext\(id\)/);
  /* Oct 26 (bug hunt run 44, Emmanuel: no auto fly unless the user taps autopilot): a journey no longer switches the
     controller to autopilot (it hid every Home button for 30 min). Was: assert.match(src, /LowiPad\.mode\('auto'\)/). */
  assert.doesNotMatch(src, /LowiPad\.mode\('auto'\)/, 'a journey never puts the controller into autopilot');
  assert.match(src, /st0 === 'idle' && next\(body\(\), Date\.now\(\), tooTired\(\)\)\.kind === 'ready'\) startNext\(\)/, 'a tap on the row starts it');
});

test('sun resets at local midnight, even for entries stamped with the wrong day', () => {
  const now = new Date(2026, 9, 16, 9, 0).getTime(), day = SUN.dayKey(now), yTs = new Date(2026, 9, 15, 20, 0).getTime();
  const meals = n => Array.from({length: n}, (_, i) => ({src: 'meal:spirit', label: 'Meal logged', amt: 15, eventId: 'm' + i}));
  const yesterday = meals(3).map(e => Object.assign(e, {ts: yTs, day: SUN.dayKey(yTs)})).concat([{src: 'water', label: 'Water', amt: 2, ts: yTs, day: SUN.dayKey(yTs)}, {src: 'water', label: 'Water', amt: 2, ts: yTs, day: SUN.dayKey(yTs)}, {src: 'water', label: 'Water', amt: 2, ts: yTs, day: SUN.dayKey(yTs)}]);
  const y = SUN.model({now: yTs + 1000, ledger: yesterday});
  assert.equal(y.full, true, 'full yesterday');
  assert.equal(SUN.model({now, ledger: yesterday}).points, 0, 'empty this morning');
  const restamped = yesterday.map(e => Object.assign({}, e, {day}));
  assert.equal(SUN.model({now, ledger: restamped}).points, 0, 'a re-stamped day cannot keep it full');
  const noTs = [{src: 'meal:spirit', label: 'Meal logged', amt: 15, day}];
  assert.equal(SUN.model({now, ledger: noTs}).points, 3, 'an entry without a time still counts by its day');
  assert.equal(SUN.msToMidnight(new Date(2026, 9, 16, 23, 30).getTime()), 30 * 60e3);
  const js = read('sun-meter.js');
  assert.match(js, /newIn: \['new in', 'neu in', 'nuevo en'\]/);
  assert.match(js, /v\.full \? ' · ' \+ tr\('newIn'\)/, 'the full row says when the new sun starts');
  assert.match(js, /resetAt: \['At midnight your sun starts fresh/);
});

test('energy and sun bars in the sheet cannot inherit the 300% slider width from index.html', () => {
  assert.match(read('index.html'), /\.ls-track\{flex:1;display:flex;width:300%/, 'the clash this guards against');
  const css = read('sun-meter.css');
  assert.match(css, /\.ls-sun \.ls-track, \.ls-sheet \.ls-track \{ width: auto; max-width: 100%; transform: none;/);
  assert.match(css, /\.ls-sheet \.ls-track\.big \{ width: 100%; \}/);
});
