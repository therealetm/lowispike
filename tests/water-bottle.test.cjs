'use strict';
/* Oct 24, 2026 (HANDOFF-hydration.md on origin/hydration-handoff-20261024, item 3): the bottle size picker.
   Bottle logs one finished bottle of the size picked with Size (0.33 / 0.5 / 0.75 / 1 / 1.5 l, one per device, a lowispike.* key).
   The day stays counted in glasses (1 glass ~ 250 ml, quarters), so a bottle adds its own share; old entries keep their amounts.
   The Home Water bubble and every water word say glass (English used to say cup), Undo names the bottle with its size. */
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const K = require('../spirit-core.js');
const B = require('../home-blooms-v2.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const DAY = B.dayKey(new Date(2026, 9, 24, 15, 0).getTime());
const ts = (h, m) => new Date(2026, 9, 24, h, m || 0).getTime();

function fakeStorage() {
  const store = {};
  return { store, getItem: k => store[k] == null ? null : store[k], setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
}
function withStorage(ls, fn) {
  const had = Object.prototype.hasOwnProperty.call(global, 'localStorage'), old = global.localStorage;
  global.localStorage = ls;
  try { return fn(); } finally { if (had) global.localStorage = old; else delete global.localStorage; }
}

test('bottle sizes: 0.33 / 0.5 / 0.75 / 1 / 1.5 l, each adds its share in glasses (quarters)', () => {
  assert.deepStrictEqual(K.BOTTLE.sizes, [330, 500, 750, 1000, 1500]);
  assert.deepStrictEqual(K.BOTTLE.sizes.map(K.bottleGlasses), [1.25, 2, 3, 4, 6]);
  assert.strictEqual(K.waterAmount('bottle'), 3, 'no size picked = the old 0.75 l bottle, 3 glasses');
  assert.strictEqual(K.waterAmount('bottle', 500), 2);
  assert.strictEqual(K.waterAmount('bottle', 1500), 6);
  assert.strictEqual(K.waterAmount('bottle', 123), 3, 'an unknown size falls back to 0.75 l');
  assert.strictEqual(K.waterAmount('sips'), 0.5, 'ten sips unchanged');
  assert.strictEqual(K.waterAmount('cup'), 1, 'a glass unchanged');
});

test('Size steps round the sizes and wraps from 1.5 l back to 0.33 l', () => {
  assert.strictEqual(K.nextBottleMl(330), 500);
  assert.strictEqual(K.nextBottleMl(750), 1000);
  assert.strictEqual(K.nextBottleMl(1500), 330);
  assert.strictEqual(K.nextBottleMl(0), 1000, 'nothing picked yet = 0.75 l, so the next is 1 l');
});

test('the size reads as litres, with a comma in German and Spanish', () => {
  assert.strictEqual(K.bottleLitres(330, 'en'), '0.33\u00a0l');
  assert.strictEqual(K.bottleLitres(750, 'de'), '0,75\u00a0l');
  assert.strictEqual(K.bottleLitres(1000, 'es'), '1\u00a0l');
  assert.strictEqual(K.bottleLitres(1500, 'de'), '1,5\u00a0l');
});

test('the picked size is remembered in a lowispike.* key (account sync carries it, sign-out wipes it)', () => {
  assert.match(K.BOTTLE.key, /^lowispike\./);
  const ls = fakeStorage();
  withStorage(ls, () => {
    assert.strictEqual(K.bottleMl(), 750, 'default 0.75 l');
    assert.strictEqual(K.setBottleMl(500), 500);
    assert.strictEqual(ls.store[K.BOTTLE.key], '500');
    assert.strictEqual(K.bottleMl(), 500);
    assert.strictEqual(K.waterAmount('bottle'), 2, 'Bottle now logs the 0.5 l bottle');
    ls.store[K.BOTTLE.key] = '"rubbish"';
    assert.strictEqual(K.bottleMl(), 750, 'a broken value falls back to 0.75 l');
    assert.strictEqual(K.setBottleMl(999), 750, 'only the five sizes are kept');
  });
});

/* the real bridge function from index.html, run against a small fake app */
function bridge(ls) {
  const h = read('index.html');
  const a = h.indexOf('  water(id,kind){'), b = h.indexOf('return g;},', a);
  assert.ok(a > 0 && b > a, 'LowiVitalsBridge.water(id, kind) exists');
  const body = h.slice(a, b + 'return g;}'.length).trim();
  const S = { ledger: [] }, events = [];
  const window = { LowiSpiritCore: K, dispatchEvent: e => events.push(e) };
  function CustomEvent(type, o) { this.type = type; this.detail = o && o.detail; }
  const today = () => DAY;
  const obj = new Function('S', 'localStorage', 'window', 'CustomEvent', 'today', 'return {' + body + ', complete(kind,id,o){const eventId="herb-care:"+today()+":"+id;if(S.ledger.some(e=>e.eventId===eventId))return 0;if(S.ledger.filter(e=>e.day===today()&&e.src===o.src).length>=o.perDay)return 0;S.ledger.push({day:today(),src:o.src,eventId,ts:Date.now()+S.ledger.length,amt:o.amt});return o.amt;}};')(S, ls, window, CustomEvent, today);
  return { obj, S, fast: () => JSON.parse(ls.store.lowi_fast_v1 || '{}') };
}

test('a 0.5 l bottle adds 2 glasses, remembers its size; older entries keep their amounts', () => {
  const ls = fakeStorage();
  /* yesterday's style entries already in the store: a legacy cup, ten sips, an old 3-glass bottle */
  ls.store.lowi_fast_v1 = JSON.stringify({ water: { [DAY]: 4.5 }, waterEvents: { c1: ts(8), s1: ts(9), b0: ts(10) }, waterAmt: { s1: 0.5, b0: 3 } });
  withStorage(ls, () => {
    K.setBottleMl(500);
    const { obj, fast } = bridge(ls);
    obj.water('b1', 'bottle');
    const f = fast();
    assert.strictEqual(f.water[DAY], 6.5);
    assert.strictEqual(f.waterAmt.b1, 2);
    assert.strictEqual(f.waterBottle.b1, 500, 'the bottle remembers its size for Undo');
    assert.strictEqual(f.waterAmt.s1, 0.5, 'old sips untouched');
    assert.strictEqual(f.waterAmt.b0, 3, 'old bottle untouched');
    assert.strictEqual(f.waterBottle.b0, undefined, 'nothing invented for old bottles');
  });
});

test('undo takes the last bottle off by its own size and names it; an old bottle still comes off as 3', () => {
  const f = { water: { [DAY]: 6.5 }, waterEvents: { c1: ts(8), s1: ts(9), b0: ts(10), b1: ts(11) }, waterAmt: { s1: 0.5, b0: 3, b1: 2 }, waterBottle: { b1: 500 } };
  const p1 = B.waterUndo(f, [], DAY);
  assert.strictEqual(p1.amt, 2); assert.strictEqual(p1.bottle, 500); assert.strictEqual(p1.cups, 4.5);
  assert.strictEqual(p1.f.waterBottle.b1, undefined);
  const p2 = B.waterUndo(p1.f, [], DAY);
  assert.strictEqual(p2.amt, 3); assert.strictEqual(p2.bottle, 0, 'old bottles have no size: Undo names them by amount'); assert.strictEqual(p2.cups, 1.5);
  const src = read('world-home.js');
  assert.ok(src.includes("plan.bottle > 0 ? T('a bottle', 'eine Flasche', 'una botella')"), 'Undo says "a bottle (0,5 l)"');
  assert.ok(src.includes("T('a glass', 'ein Glas', 'un vaso')"));
});

test('the Water bloom: Sips, Glass, Bottle with its size, and Size; Hold Scan overview leaves Size out', () => {
  const src = read('home-blooms-v2.js');
  for (const w of ["T('Sips', 'Sips', 'Sorbos')", "T('Glass', 'Glas', 'Vaso')", "T('Bottle', 'Flasche', 'Botella')", "T('Size', 'Größe', 'Tamaño')"]) assert.ok(src.includes(w), w);
  assert.match(src, /id: 'bsize', extra: true/);
  assert.match(src, /K\.setBottleMl\(K\.nextBottleMl\(K\.bottleMl\(\)\)\)/);
  assert.match(src, /actionsFor\(k\)\.filter\(x => !x\.extra\)/, 'the all-bubbles ring keeps 3 + 3 + 3 + 3');
  assert.match(src, /bsize: '<path/);
  assert.doesNotMatch(src, /T\('Cup', 'Glas'/);
});

test('water words say glass everywhere (no cups), and the Home bubble says what tap and hold do', () => {
  assert.match(read('spirit.js'), /glasses: \['glasses', 'Gläser', 'vasos'\]/);
  assert.match(read('spirit.js'), /drink: \['Glass logged/);
  assert.match(read('sun-meter.js'), /glasses: \['glasses', 'Gläser', 'vasos'\]/);
  const lh = read('living-home.js');
  assert.match(lh, /cups: \['glasses', 'Gläser', 'vasos'\]/); assert.match(lh, /glassAdd: \['\+1 glass'/);
  const ts2 = read('tutorial-show.js');
  assert.doesNotMatch(ts2, /Becher|cup: 'Cup'/);
  const wh = read('world-home.js');
  assert.doesNotMatch(wh, /add a cup/);
  assert.ok(wh.includes("' glasses. Tap for 10 sips, a glass or a bottle, hold to take the last one off'"));
  const steps = read('tutorial-steps.js');
  assert.ok(steps.includes('Size sets how big your bottle is.') && steps.includes('Mit Größe stellst du ein') && steps.includes('Con Tamaño eliges'));
});
