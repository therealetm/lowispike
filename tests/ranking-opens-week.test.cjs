'use strict';
/* 28 Oct 2026 (Emmanuel: "When I open Rangliste, I would like it to open at week because it always opens at Gesamt. Barely anyone
   cares about Gesamt. They care about month, but they more care about this week ... that's just where it opens."): every visit to
   the Ranking starts on Woche. Woche / Monat / Gesamt still switch and stay while you are on the board; the old saved choice
   (localStorage lowispike.ranking.period) no longer decides where it opens. Misty's rank pill still opens the board it names. */
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const K = require('../ranking-core.js');
const CB = require('../care-board-core.js');

const NOW = new Date(2026, 9, 23, 10).getTime();   /* Fri 23 Oct 2026, week from Mon 19 */
const wk = CB.tag(CB.periodKey('w', NOW), 0), mo = CB.tag(CB.periodKey('m', NOW), 0);
const person = (n, w, m, xp, extra) => Object.assign({ n, uid: 'u-' + n, xpw: w, wk, xpm: m, mo, xp, lv: 0 }, extra || {});
const PEOPLE = [person('Ana', 40, 90, 500), person('Ben', 70, 120, 200), person('Cem', 10, 300, 9000), Object.assign(person('Me', 20, 50, 100), { me: true })];

function page(saved) {
  const store = {};
  if (saved) store['lowispike.ranking.period'] = saved;
  const clock = { t: NOW };
  const observers = [];
  const classes = new Set(['active']);
  const community = { classList: { contains: c => classes.has(c) } };
  const win = {
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    LowiRankingCore: K, LowiCareBoard: CB,
    LowiR3: { everyone: () => PEOPLE, me: () => null },
    LowiCompanionCore: { MAX_ST: 9, decode: () => null, miniSVG: () => '<svg></svg>', genome: (o, st) => ({ st, el: 'bot' }), formName: st => 'Form' + st },
    LowiCompanion: { friendLooks: () => ({}), genome: () => ({ st: 2, el: 'me' }), prefs: () => ({ share: true }) },
    goTab: t => { win.__tab = t; },
    MutationObserver: class { constructor(cb) { this.cb = cb; observers.push(this); } observe(el) { this.el = el; } }
  };
  win.window = win;
  const doc = { getElementById: id => (id === 'tab-foryou' ? community : null) };
  class FixedDate extends Date { constructor(...a) { super(...(a.length ? a : [clock.t])); } static now() { return clock.t; } }
  vm.runInNewContext(R('ranking.js'), { window: win, document: doc, localStorage: win.localStorage, setTimeout: () => 0, setInterval: () => 0, console, Date: FixedDate });
  /* the Ranking pane's box (community-rooms-ui.js paintRank): a click handler, drawn HTML, no layout (hidden in a test) */
  const handlers = {};
  const box = { isConnected: true, hidden: false, innerHTML: '', addEventListener: (n, f) => { handlers[n] = f; }, contains: () => true,
    querySelector: sel => (sel === '.rk' && box.innerHTML.includes('class="rk"') ? {} : null), getClientRects: () => [] };
  const shown = () => { const m = /data-k="(w|m|all)" aria-selected="true"/.exec(box.innerHTML); return m && m[1]; };
  const tap = k => handlers.click({ target: { closest: s => (s === '[data-rk]' ? { dataset: { rk: 'per', k } } : null) } });
  const leaveCommunity = () => { classes.delete('active'); observers.forEach(o => o.cb([])); };
  const enterCommunity = () => { classes.add('active'); observers.forEach(o => o.cb([])); };
  return { W: win, store, box, shown, tap, clock, leaveCommunity, enterCommunity, open: () => win.LowiRanking.render(box, true), repaint: () => win.LowiRanking.render(box) };
}

test('the first open after an update starts on Woche, even if an old build saved Gesamt, and the old saved choice is cleared', () => {
  const p = page('all');
  p.open();
  assert.strictEqual(p.shown(), 'w');
  assert.strictEqual(p.W.LowiRanking.period(), 'w');
  assert.ok(!('lowispike.ranking.period' in p.store), 'stale saved Gesamt removed');
});

test('Woche / Monat / Gesamt still switch, and the pick stays while you stay on the board', () => {
  const p = page();
  p.open(); assert.strictEqual(p.shown(), 'w');
  p.tap('m'); assert.strictEqual(p.shown(), 'm');
  p.tap('all'); assert.strictEqual(p.shown(), 'all');
  p.repaint(); assert.strictEqual(p.shown(), 'all', 'a repaint on the open board (bots, looks, language) keeps Gesamt');
  p.tap('w'); assert.strictEqual(p.shown(), 'w');
  assert.ok(!('lowispike.ranking.period' in p.store), 'the pick is not saved for later visits');
});

test('opening the Ranking tab again starts on Woche after you looked at Gesamt or Monat', () => {
  const p = page();
  p.open(); p.tap('all'); assert.strictEqual(p.shown(), 'all');
  p.open(); assert.strictEqual(p.shown(), 'w', 'reopened tab: week');
  p.tap('m'); p.open(); assert.strictEqual(p.shown(), 'w');
});

test('leaving Community resets the board to Woche, so coming back to a kept Ranking pane shows the week', () => {
  const p = page();
  p.open(); p.tap('all');
  p.leaveCommunity();
  assert.strictEqual(p.W.LowiRanking.period(), 'w');
  assert.strictEqual(p.shown(), 'w', 'drawn again while hidden');
  p.enterCommunity(); p.repaint();
  assert.strictEqual(p.shown(), 'w', 'back in Community without the tab counting as fresh: still the week');
});

test('a fresh page load (next app start) opens on Woche after Gesamt was picked', () => {
  const a = page(); a.open(); a.tap('all');
  const b = page(a.store['lowispike.ranking.period']); b.open();
  assert.strictEqual(b.shown(), 'w');
});

test("Misty's rank pill still opens the board it names, once; the next visit is the week again", () => {
  const p = page();
  p.W.LowiRanking.setPeriod('all'); p.open();
  assert.strictEqual(p.shown(), 'all', 'pill for Gesamt opens Gesamt');
  p.leaveCommunity(); p.enterCommunity(); p.open();
  assert.strictEqual(p.shown(), 'w');
  p.W.LowiRanking.setPeriod('m'); p.clock.t += 10000; p.open();
  assert.strictEqual(p.shown(), 'w', 'an old request does not decide a later visit');
});
