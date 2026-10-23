'use strict';
/* Oct 23, 2026 (Eman: "based on how many sips, an estimate of sips you took from your bottle or from your cup ... x amount of sip,
   or one cup, or one whole bottle"). Water is logged by estimate: Sips (1/4 cup, ~60 ml), Cup (~250 ml), Bottle (3 cups, ~750 ml).
   The store stays in cups (quarters allowed), XP stays 2 per whole cup up to 6 a day, long press on Water = undo the last one. */
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const K = require('../spirit-core.js');
const B = require('../home-blooms-v2.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const DAY = B.dayKey(new Date(2026, 9, 23, 15, 0).getTime());
const ts = (h, m) => new Date(2026, 9, 23, h, m || 0).getTime();

test('amounts: a few sips = 1/4 cup, a cup = 1, a whole bottle = 3 cups; 1 cup is about 250 ml; goal stays 6', () => {
  assert.strictEqual(K.waterAmount('sips'), 0.25);
  assert.strictEqual(K.waterAmount('cup'), 1);
  assert.strictEqual(K.waterAmount('bottle'), 3);
  assert.strictEqual(K.waterAmount(), 1, 'no kind = one cup, as before');
  assert.strictEqual(K.waterAmount('nonsense'), 1);
  assert.strictEqual(K.WATER.ml, 250);
  assert.strictEqual(K.WATER.goal, 6);
});

test('sums stay on quarter cups (no float drift after many sips)', () => {
  let n = 0; for (let i = 0; i < 40; i++) n = K.waterSum(n, 0.25);
  assert.strictEqual(n, 10);
  assert.strictEqual(K.waterSum(0.75, 0.25), 1);
  assert.strictEqual(K.waterSum(undefined, 3), 3);
});

test('the value reads short, no unit word: 0, \u00bc, \u00be, 1\u00bd, 2', () => {
  assert.deepStrictEqual([0, 0.25, 0.75, 1.5, 2, 6.25].map(K.waterFmt), ['0', '\u00bc', '\u00be', '1\u00bd', '2', '6\u00bc']);
});

test('XP due = whole cups reached minus XP already given, capped at 6 a day', () => {
  assert.strictEqual(K.waterXpDue(0.75, 0), 0, 'three sips: no XP yet');
  assert.strictEqual(K.waterXpDue(1, 0), 1, 'the fourth sip completes a cup');
  assert.strictEqual(K.waterXpDue(3, 0), 3, 'a bottle from zero = 3 cups');
  assert.strictEqual(K.waterXpDue(9, 5), 1, 'only up to the daily cap');
  assert.strictEqual(K.waterXpDue(20, 6), 0, 'spamming past the cap earns nothing');
  assert.strictEqual(K.waterXpDue(2, 4), 0, 'never negative');
});

/* the real bridge function from index.html, run against a small fake app */
function bridge() {
  const h = read('index.html');
  const a = h.indexOf('  water(id,kind){'), b = h.indexOf('return g;},', a);
  assert.ok(a > 0 && b > a, 'LowiVitalsBridge.water(id, kind) exists');
  const body = h.slice(a, b + 'return g;}'.length).trim();
  const store = {}, S = { ledger: [] }, events = [];
  const localStorage = { getItem: k => store[k] == null ? null : store[k], setItem: (k, v) => { store[k] = String(v); } };
  const window = { LowiSpiritCore: K, dispatchEvent: e => events.push(e) };
  function CustomEvent(type, o) { this.type = type; this.detail = o && o.detail; }
  const today = () => DAY;
  const obj = new Function('S', 'localStorage', 'window', 'CustomEvent', 'today', 'return {' + body + ', complete(kind,id,o){const eventId="herb-care:"+today()+":"+id;if(S.ledger.some(e=>e.eventId===eventId))return 0;if(S.ledger.filter(e=>e.day===today()&&e.src===o.src).length>=o.perDay)return 0;S.ledger.push({day:today(),src:o.src,eventId,ts:Date.now()+S.ledger.length,amt:o.amt});return o.amt;}};')(S, localStorage, window, CustomEvent, today);
  return { obj, S, events, fast: () => JSON.parse(store.lowi_fast_v1 || '{}') };
}

test('four sips fill one cup and earn the same 2 XP as one cup, not 8', () => {
  const { obj, S, fast } = bridge();
  const got = [1, 2, 3, 4].map(i => obj.water('s' + i, 'sips'));
  assert.deepStrictEqual(got, [0, 0, 0, 2]);
  assert.strictEqual(fast().water[DAY], 1);
  assert.strictEqual(S.ledger.length, 1);
});

test('sips that earn no XP still make Misty react (lowi:care)', () => {
  const { obj, events } = bridge();
  obj.water('s1', 'sips');
  assert.ok(events.some(e => e.type === 'lowi:care' && e.detail.kind === 'water'));
});

test('a whole bottle fills 3 cups and earns 3 x 2 XP at once', () => {
  const { obj, S, fast } = bridge();
  assert.strictEqual(obj.water('b1', 'bottle'), 6);
  assert.strictEqual(fast().water[DAY], 3);
  assert.strictEqual(fast().waterAmt.b1, 3, 'the amount is remembered for undo');
  assert.strictEqual(S.ledger.length, 3);
});

test('spamming bottles never earns more than the daily water cap (6 cups = 12 XP)', () => {
  const { obj, S, fast } = bridge();
  let xp = 0; for (let i = 0; i < 10; i++) xp += obj.water('b' + i, 'bottle');
  assert.strictEqual(xp, 12);
  assert.strictEqual(S.ledger.length, 6);
  assert.strictEqual(fast().water[DAY], 30, 'the water itself is still logged honestly');
});

test('the same tap id never counts twice', () => {
  const { obj, fast } = bridge();
  obj.water('x', 'cup'); obj.water('x', 'cup');
  assert.strictEqual(fast().water[DAY], 1);
});

test('undo takes off the last entry\'s own amount: a bottle, then sips, then a legacy cup', () => {
  const f = { water: { [DAY]: 4.25 }, waterEvents: { old: ts(9), s: ts(10), bot: ts(11) }, waterAmt: { s: 0.25, bot: 3 } };
  const L = [1, 2, 3, 4].map(i => ({ day: DAY, src: 'water', eventId: 'herb-care:' + DAY + ':water:e' + i, ts: ts(8 + i), amt: 2 }));
  const r1 = B.waterUndo(f, L, DAY);
  assert.strictEqual(r1.cups, 1.25); assert.strictEqual(r1.amt, 3);
  assert.deepStrictEqual(r1.unaward, ['herb-care:' + DAY + ':water:e4', 'herb-care:' + DAY + ':water:e3', 'herb-care:' + DAY + ':water:e2'], 'XP above the cups goes back');
  assert.ok(!('bot' in r1.f.waterAmt));
  const r2 = B.waterUndo(r1.f, L.slice(0, 1), DAY);
  assert.strictEqual(r2.cups, 1); assert.strictEqual(r2.amt, 0.25); assert.deepStrictEqual(r2.unaward, []);
  const r3 = B.waterUndo(r2.f, L.slice(0, 1), DAY);
  assert.strictEqual(r3.cups, 0); assert.strictEqual(r3.amt, 1, 'an entry from before today\'s change is one cup');
  assert.deepStrictEqual(r3.unaward, ['herb-care:' + DAY + ':water:e1']);
  assert.strictEqual(B.waterUndo(r3.f, [], DAY), null);
});

test('undo never goes below 0 (bottle logged on top of a hand-reset day)', () => {
  const r = B.waterUndo({ water: { [DAY]: 1 }, waterEvents: { b: ts(9) }, waterAmt: { b: 3 } }, [], DAY);
  assert.strictEqual(r.cups, 0); assert.strictEqual(r.amt, 1);
});

test('the Water bloom offers Sips, Cup and Bottle in EN/DE/ES, each with its ml estimate; no Undo orb', () => {
  const src = read('home-blooms-v2.js');
  for (const w of ["T('Sips', 'Schlucke', 'Sorbos')", "T('Cup', 'Glas', 'Vaso')", "T('Bottle', 'Flasche', 'Botella')"]) assert.ok(src.includes(w), w);
  assert.match(src, /W\.LowiSpirit\.water\(k\)/);
  assert.doesNotMatch(src, /take 1 cup off/);
  assert.match(src, /sips: '<path/); assert.match(src, /bottle: '<path/);
});

test('long press on Water undoes the last entry (not a reset to 0) and says what went', () => {
  const src = read('world-home.js');
  assert.match(src, /waterUndoLast\(\); \}, 600\)/);
  assert.match(src, /B\.undoWater\(\)/);
  assert.ok(src.includes("T('a few sips', 'ein paar Schlucke', 'unos sorbos')"));
  assert.ok(src.includes("T('Taken off: ', 'Zurückgenommen: ', 'Quitado: ')"));
});

test('the Home bubble shows one short value and no unit word', () => {
  const src = read('world-home.js');
  assert.match(src, /uv = '';/);
  assert.ok(src.includes('lab.match(/([\\d\\u00bc\\u00bd\\u00be]+)'), 'reads quarter cups (1\u00bd) from the tile');
  const lh = read('living-home.js');
  assert.ok((lh.match(/LowiSpiritCore\.waterFmt\(v\.water\)/g) || []).length >= 2, 'the tile value and its aria-label both say 1\u00bd');
});

test('Misty says a line per amount in EN/DE/ES', () => {
  const src = read('spirit.js');
  assert.match(src, /drinkSips: \['A few sips/);
  assert.match(src, /drinkBottle: \['A whole bottle/);
  assert.match(src, /V\.water\(uid\(\), kind\)/);
});
