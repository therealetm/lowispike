'use strict';
/* Oct 15: daily ritual (daily-ritual.js / .css): Add to Home walkthrough, daily opening card, flexible rhythm goals */
const {test} = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const R = require('../daily-ritual.js');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'daily-ritual.js'), 'utf8'), css = fs.readFileSync(path.join(root, 'daily-ritual.css'), 'utf8');

test('weekday names are alliterative in de, en and es and match the real weekday', () => {
  for (const l of ['en', 'de', 'es']) {
    assert.equal(R.WEEKDAY[l].length, 7); assert.equal(R.LINES[l].length, 7);
    R.WEEKDAY[l].forEach((name, i) => {
      const plain = R.WEEKDAY_PLAIN[l][i];
      assert.ok(name.toLowerCase().includes(plain.toLowerCase()), name + ' names ' + plain);
      const words = name.split(/[\s-]+/);
      assert.ok(words.every(w => w[0].toLowerCase() === plain[0].toLowerCase()), name + ' alliterates');
    });
  }
  const wed = new Date('2026-10-14T09:00:00');
  assert.equal(R.weekdayName(wed, 'de'), 'Munterer Mittwoch');
  assert.equal(R.weekdayName(wed, 'en'), 'Wonder Wednesday');
  assert.equal(R.weekdayName(wed, 'xx'), 'Wonder Wednesday');
  assert.ok(R.weekdayLine(wed, 'es').length > 10);
});

test('lines make no health or efficacy promises', () => {
  const all = [].concat(...['en', 'de', 'es'].map(l => R.LINES[l])).join(' ').toLowerCase();
  for (const w of ['burn', 'fat', 'weight', 'insulin', 'heal', 'cure', 'detox', 'satt', 'abnehm', 'fett', 'grasa', 'peso']) assert.ok(!all.includes(w), 'no ' + w);
});

test('day count starts at 1 on the first day the app saw you', () => {
  assert.equal(R.firstDay(['2026-10-10', '2026-10-03', 'x'], '2026-10-15'), '2026-10-03');
  assert.equal(R.dayNumber('2026-10-03', '2026-10-15'), 13);
  assert.equal(R.dayNumber('2026-10-15', '2026-10-15'), 1);
  assert.equal(R.dayNumber('', '2026-10-15'), 1);
  assert.equal(R.dayNumber('2026-03-28', '2026-03-30'), 3, 'DST change does not skip a day');
});

test('daily card shows once per local day', () => {
  assert.equal(R.shouldShowDaily('', '2026-10-15'), true);
  assert.equal(R.shouldShowDaily('2026-10-14', '2026-10-15'), true);
  assert.equal(R.shouldShowDaily('2026-10-15', '2026-10-15'), false);
});

test('the one goal comes from the active fast, then water, then the next action', () => {
  assert.equal(R.pickGoal({fasting: true, fastEnd: '12:00', water: 0}, 'de').text, 'Halte dein Fastenfenster bis 12:00.');
  assert.equal(R.pickGoal({fasting: true}, 'en').kind, 'fast');
  const w = R.pickGoal({water: 2, waterGoal: 8, hour: 9, next: 'Log food'}, 'en');
  assert.equal(w.kind, 'water'); assert.match(w.text, /3 glasses/);
  assert.match(R.pickGoal({water: 7, waterGoal: 8, hour: 9}, 'de').text, /1 Glas/);
  assert.equal(R.pickGoal({water: 8, waterGoal: 8, hour: 9, next: 'Essen eintragen'}, 'de').text, 'Als N\u00e4chstes: Essen eintragen');
  assert.equal(R.pickGoal({water: 1, hour: 21, next: 'Scan'}, 'en').kind, 'next', 'no water nudge late at night');
  assert.equal(R.pickGoal({water: 8}, 'es').kind, 'log');
});

test('flexible goals next to the 2/5/7/14 streak choices, each with label, hint and herb reaction', () => {
  assert.deepEqual(R.GOALS.map(g => g.n + '/' + g.per), ['2/week', '3/week', '5/week', '14/month', '2/streak', '5/streak', '7/streak', '14/streak']);
  for (const g of R.GOALS) for (const l of ['en', 'de', 'es']) {
    const t = R.goalText(g.id, l);
    for (const k of ['label', 'what', 'hint', 'react']) assert.ok(t[k] && t[k].length > 2, g.id + ' ' + l + ' ' + k);
  }
  assert.equal(new Set(R.GOALS.map(g => R.goalText(g.id, 'de').react)).size, 8, 'each choice gets its own reaction');
  assert.equal(R.goalText('nope', 'en'), null);
});

test('progress counts active days in the week and never resets to zero after a missed day', () => {
  const days = ['2026-10-12', '2026-10-14'];
  const p = R.progress('w3', days, '2026-10-15');
  assert.equal(p.from, '2026-10-12'); assert.equal(p.to, '2026-10-18');
  assert.equal(p.done, 2); assert.equal(p.need, 1); assert.equal(p.reached, false); assert.equal(p.daysLeft, 4); assert.equal(p.stillPossible, true);
  const p2 = R.progress('w3', days.concat('2026-10-15'), '2026-10-15');
  assert.equal(p2.done, 3); assert.equal(p2.reached, true); assert.equal(p2.todayDone, true);
  assert.equal(R.progress('w2', ['2026-10-11', '2026-10-16'], '2026-10-15').done, 0);
  const prev = R.previous('w5', ['2026-10-06', '2026-10-07', '2026-10-09', '2026-10-10'], '2026-10-13');
  assert.equal(prev.done, 4); assert.equal(prev.n, 5);
  const m = R.progress('m14', ['2026-09-30', '2026-10-01', '2026-10-02'], '2026-10-15');
  assert.equal(m.done, 2); assert.equal(m.to, '2026-10-31'); assert.equal(m.daysLeft, 17);
  assert.equal(R.progress('zz', days, '2026-10-15'), null);
});

test('a streak pauses on a missed day instead of dropping to zero', () => {
  const since = '2026-10-10', days = ['2026-10-09', '2026-10-10', '2026-10-11', '2026-10-13', '2026-10-15'];
  const p = R.progress('s7', days, '2026-10-15', since);
  assert.equal(p.done, 4, 'the day before the commitment does not count, the missed 12th and 14th do not reset');
  assert.equal(p.need, 3); assert.equal(p.reached, false); assert.equal(p.stillPossible, true);
  assert.equal(R.progress('s2', days, '2026-10-15', since).reached, true);
  assert.equal(R.previous('s5', days, '2026-10-15'), null);
});

test('Add to Home walkthrough: three steps per platform, sign-in step for signed-in Safari', () => {
  for (const k of ['ios', 'android', 'inapp']) for (const l of ['en', 'de', 'es']) {
    const s = R.a2Steps(k, l, false); assert.equal(s.length, 3); s.forEach(x => assert.ok(x.length > 10));
  }
  assert.match(R.a2Steps('ios', 'de', true)[2], /Anmeldung einf\u00fcgen/);
  assert.match(R.a2Steps('ios', 'en', false)[0], /Share/);
  assert.match(R.a2Steps('android', 'en', false)[1], /Install app/);
  assert.ok(src.includes("'#lcA2hs [data-cl=\"a2hs\"], #lcA2hs [data-hof=\"go\"]'"), 'the hint button opens the walkthrough');
  assert.ok(src.includes('data-hof="go" data-dr="a2done"'), 'last step hands over to the existing sign-in copy');
  assert.ok(src.includes("sessionStorage.setItem(Core.A2HS_X, '1')"), 'Maybe later hides it for the visit');
  assert.equal(R.A2HS_X, 'lowi.a2hs.x');
  assert.match(src, /function a2Open\(\) \{\s*if \(standalone\(\)\) return false;/, 'never in the Home Screen app');
  for (const s of ['data-dr="a2next"', 'data-dr="a2back"', 'dr-note']) assert.ok(src.includes(s), s);
});

test('daily card waits for the orb update bubble and other overlays', () => {
  for (const sel of ['#g1Ob:not(.out)', '#lcUpd', '#hofSheet', '.r2-ov.on:not(.off)', '#drA2', '#drPick']) assert.ok(R.BUSY.includes(sel), sel);
  assert.ok(src.includes('gate-up'));
  assert.ok(src.includes('LowiG1.state()'));
  assert.ok(src.includes("if ($('#g1Ob:not(.out)') || $('#lcUpd')"), 'gives way if the bubble arrives while it is open');
});

test('reduced motion turns the animations off, hooks are wired', () => {
  assert.ok(css.includes('prefers-reduced-motion:reduce'));
  const rm = css.slice(css.indexOf('prefers-reduced-motion:reduce'));
  for (const s of ['.dr-ov.dr-in .dr-card', '.dr-day-herb', '.dr-note']) assert.ok(rm.includes(s), s);
  const apple = fs.readFileSync(path.join(root, 'apple-ui.js'), 'utf8'), sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.ok(/'daily-ritual\.js'[,\]]/.test(apple)); assert.ok(apple.includes('daily-ritual.css?v='));
  assert.equal((sw.match(/"daily-ritual\.js", "daily-ritual\.css"/g) || []).length, 2);
});
