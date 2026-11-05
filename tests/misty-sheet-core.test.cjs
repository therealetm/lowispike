'use strict';
/* Misty sheet plan phase 2/3 (Nov 5 2026): Today and History numbers, honest labels (estimates, your own step range, empty = no entries) */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const C = require('../misty-sheet-core.js');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const recap = require('../day-recap-core.js');
const nutri = (() => { try { return require('../nutri-stats-core.js'); } catch (e) { return null; } })();

const NOW = new Date(2026, 10, 5, 18, 0, 0).getTime();
const at = (d, h) => new Date(2026, 10, d, h, 0, 0).getTime();
function ctx(extra) {
  const S = Object.assign({ logs: [], ledger: [], xp: 0, health: { body: { weights: [] } } }, extra || {});
  return { now: NOW, S, fast: null, move: null, deps: { recap, nutri, move: null, weight: null, levelOf: null } };
}

test('an empty day is "no entries", never zeros dressed up as a result', () => {
  const d = C.day(ctx());
  assert.strictEqual(d.today, true);
  assert.strictEqual(d.empty, true);
  assert.strictEqual(d.meals.length, 0);
  assert.strictEqual(d.weight, null);
  assert.strictEqual(d.steps, null);
});

test('meals of the day with their photo thumbnails; other days stay out', () => {
  const ph = 'data:image/jpeg;base64,AAAA';
  const d = C.day(ctx({ logs: [{ id: 1, ts: at(5, 8), t: 'Oats', spike: 'low', photo: ph }, { id: 2, ts: at(4, 12), t: 'Pasta' }, { id: 3, ts: at(5, 13), t: 'Salad', photo: 'javascript:x' }] }));
  assert.deepStrictEqual(d.meals.map(m => m.t), ['Oats', 'Salad']);
  assert.strictEqual(d.meals[0].photo, ph);
  assert.strictEqual(d.meals[1].photo, '', 'only real image thumbnails');
  assert.strictEqual(d.empty, false);
});

test('weight of a day and of a period come from the saved weigh-ins', () => {
  const S = { health: { body: { weights: [{ ts: at(1, 7), kg: 80.2 }, { ts: at(4, 7), kg: 79.64 }] } } };
  assert.strictEqual(C.day(ctx(S), '2026-11-04').weight, 79.6);
  const w = C.period(ctx(S), 'week', 0);
  assert.strictEqual(w.start, '2026-10-30'); assert.strictEqual(w.end, '2026-11-05');
  assert.strictEqual(w.weightFrom, 80.2); assert.strictEqual(w.weightTo, 79.64);
});

test('periods: yesterday, 7, 30 and 365 days; stepping back moves the whole window', () => {
  const y = C.period(ctx(), 'yesterday', 0);
  assert.strictEqual(y.n, 1); assert.strictEqual(y.end, '2026-11-04');
  assert.strictEqual(C.period(ctx(), 'yesterday', 1).end, '2026-11-03');
  assert.strictEqual(C.period(ctx(), 'week', 1).end, '2026-10-29');
  assert.strictEqual(C.period(ctx(), 'month', 0).n, 30);
  assert.strictEqual(C.period(ctx(), 'year', 0).days.length, 365);
  assert.strictEqual(C.period(ctx(), 'week', 0).empty, true);
});

test('averages count only days with an entry', () => {
  const logs = [{ id: 1, ts: at(5, 8), t: 'A' }, { id: 2, ts: at(3, 8), t: 'B' }, { id: 3, ts: at(3, 12), t: 'C' }];
  const w = C.period(ctx({ logs }), 'week', 0);
  assert.strictEqual(w.meals, 3); assert.strictEqual(w.mealDays, 2); assert.strictEqual(w.activeDays, 2);
});

test('Today tab: Settings row design, three groups, honest words', () => {
  const s = R('misty-sheet.js'), h = R('misty-hub.js');
  assert.match(s, /class="cme-row ms-row/);
  assert.match(s, /T\('No entries', 'Keine Eintr\\u00e4ge', 'Sin registros'\)/);
  assert.match(s, /T\('your estimate', 'deine Sch\\u00e4tzung', 'tu estimaci\\u00f3n'\)/);
  assert.match(s, /T\('Estimated', 'Gesch\\u00e4tzt', 'Estimado'\)/);
  assert.match(s, /'\\u2248 ' \+ fmt\(d\.kcal\)/);
  assert.match(h, /const TABS = \['today', 'history', 'misty'\];/);
  assert.match(h, /cls: 'wh-ms-ov mh-ov one-sheet'/);
  assert.match(h, /class="mh cme cme-in" id="mistyHub"/);
  assert.doesNotMatch(s + h.slice(h.indexOf('function tabsHtml'), h.indexOf("/* Oct 17: Misty's energy scale")), /\b[Ss]he\b/);
});
