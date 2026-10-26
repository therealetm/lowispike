'use strict';
/* Oct 26, 2026 (Emmanuel: "redesign supermarket ... I'm at home and I want to go grocery shopping now ... virtual grocery shop,
   just like all those apps that are going viral"). Supermarket opens with Shop from home: household size, weekly budget, the
   nights you cook and the store -> a week of low-spike dinners, one basket priced with the app's own seven-store estimates,
   a running total against the budget, swap a dinner, Fit my budget, what you have at home stays off the bill, then the
   existing shopping list and delivery links. Browser check: tests/week-basket-live.cjs. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const C = require('../week-basket-core.js');

const R = (id, r, c, ing) => ({ id, n: id, r, c, ing: ing.map(([g, n]) => ({ g, n })) });
const RECIPES = [
  R('rb_a', 'ja', 'meal', [['hack', 'Lean beef mince'], ['gemuese', 'Zucchini'], ['wuerze', 'Oregano'], ['kaese', 'Parmesan']]),
  R('rb_b', 'ja', 'meal', [['huhn', 'Chicken'], ['gemuese', 'Zucchini'], ['wuerze', 'Oregano'], ['fett', 'Avocado']]),
  R('rb_c', 'ja', 'meal', [['huhn', 'Salmon'], ['salat', 'Lettuce'], ['fett', 'Sesame seeds']]),
  R('rb_snack', 'ja', 'snack', [['milch', 'Greek yogurt'], ['fett', 'Almonds'], ['snack', 'Berries']]),
  R('m_bolognese', 'ja', undefined, [['hack', 'Lean beef mince'], ['gemuese', 'Zucchini'], ['kaese', 'Parmesan']]),
  R('m_hotdog', 'selten', undefined, [['hack', 'Sausage'], ['salat', 'Lettuce'], ['wuerze', 'Mustard']]),
  R('m_granola', 'ja', undefined, [['milch', 'Greek yogurt'], ['fett', 'Nuts'], ['snack', 'Berries']]),
  R('rb_tiny', 'ja', 'meal', [['huhn', 'Chicken'], ['salat', 'Lettuce']]),
  R('rb_nein', 'nein', 'meal', [['brot', 'Bread'], ['wuerze', 'Jam'], ['milch', 'Butter']])
];
const items = r => r.ing.map(i => ({ k: i.n.toLowerCase(), n: i.n, g: i.g, e: '', p: 2 }));
const price = (i, sid) => i.p * (sid === 'rewe' ? 1.5 : 1);

test('the pool is low-spike dinners only: never selten or nein, never breakfasts or snacks, never a recipe without ingredients', () => {
  const ids = C.pool(RECIPES).map(r => r.id).sort();
  assert.deepEqual(ids, ['rb_a', 'rb_b', 'rb_c'], 'm_ rebuilds name aisles ("Other veg"), not things to buy');
});

test('a week is the number of nights you cook, stable for the week, different after New week, no dinner twice', () => {
  const ids = C.pool(RECIPES).map(r => r.id);
  const a = C.plan(ids, 3, '2026-W44#0'), b = C.plan(ids, 3, '2026-W44#0');
  assert.equal(a.length, 3); assert.deepEqual(a, b, 'same week, same plan');
  assert.equal(new Set(a).size, 3);
  assert.equal(C.plan(ids, 7, 's').length, ids.length, 'never more dinners than the pool has, never a repeat');
  assert.equal(C.plan(ids, 2, 's', ['rb_b', 'nope']).indexOf('nope'), -1);
  const seeds = new Set(); for (let n = 0; n < 12; n++) seeds.add(C.plan(ids, 2, '2026-W44#' + n).join());
  assert.ok(seeds.size > 1, 'New week reshuffles');
  assert.deepEqual(C.plan(ids, 3, 'x', ['rb_c']).slice(0, 1), ['rb_c'], 'kept dinners stay');
});

test('a week is varied: at most two dinners with the same main (mince, chicken, salmon, eggs, cheese) while others exist', () => {
  const mk = (id, g, n) => R(id, 'ja', 'meal', [[g, n], ['gemuese', 'Zucchini'], ['wuerze', 'Oregano']]);
  const P = [mk('m1', 'hack', 'Lean beef mince'), mk('m2', 'hack', 'Turkey mince'), mk('m3', 'hack', 'Lean beef mince'), mk('m4', 'hack', 'Beef'), mk('m5', 'hack', 'Mince'),
    mk('c1', 'huhn', 'Chicken'), mk('s1', 'huhn', 'Salmon'), mk('e1', 'eier', 'Eggs'), mk('k1', 'kaese', 'Halloumi')];
  const by = {}; P.forEach(r => { by[r.id] = r; }); const mo = id => C.main(by[id]), ids = P.map(r => r.id);
  assert.equal(C.main(by.c1), 'huhn:chicken'); assert.equal(C.main(by.s1), 'huhn:salmon'); assert.equal(C.main(by.m2), 'hack');
  for (let n = 0; n < 20; n++) {
    const p = C.plan(ids, 5, 'w#' + n, null, mo);
    assert.ok(p.filter(id => mo(id) === 'hack').length <= 2, 'no more than two mince nights: ' + p);
    const q = C.swap(p, p.findIndex(id => mo(id) !== 'hack'), ids, 'w#' + n, mo);
    assert.ok(q.filter(id => mo(id) === 'hack').length <= 2, 'swap keeps it varied: ' + q);
  }
  assert.equal(C.plan(ids, 7, 'x', null, mo).length, 7, 'fills up when variety runs out');
});

test('swap puts a dinner in that is not on the plan yet', () => {
  const ids = C.pool(RECIPES).map(r => r.id), p = C.plan(ids, 2, 's');
  const q = C.swap(p, 1, ids, 's');
  assert.notEqual(q[1], p[1]); assert.equal(new Set(q).size, 2); assert.equal(q[0], p[0]);
  assert.deepEqual(C.swap(C.plan(ids, 3, 's'), 0, ids, 's').slice().sort(), ids.slice().sort(), 'nothing left to swap in: the plan stays');
});

test('one basket: the same item for two dinners is one row; packs scale with the household; spices, sauces, oils and seeds once a week', () => {
  const pool = C.pool(RECIPES), d = ['rb_a', 'rb_b'].map(id => pool.find(r => r.id === id)).map(r => ({ id: r.id, items: items(r) }));
  const b2 = C.basket(d, 2), z = b2.find(i => i.k === 'zucchini'), o = b2.find(i => i.k === 'oregano'), av = b2.find(i => i.k === 'avocado');
  assert.equal(b2.filter(i => i.k === 'zucchini').length, 1);
  assert.equal(z.uses, 2); assert.equal(z.packs, 2); assert.equal(o.packs, 1, 'oregano: once for the week');
  assert.equal(av.packs, 1, 'avocado is fresh food, not an oil');
  const b4 = C.basket(d, 4); assert.equal(b4.find(i => i.k === 'zucchini').packs, 4); assert.equal(b4.find(i => i.k === 'oregano').packs, 1);
  assert.equal(C.basket(d, 1).find(i => i.k === 'zucchini').packs, 2, 'one person still needs one pack per dinner');
  const seeds = C.basket([{ id: 'c', items: items(pool.find(r => r.id === 'rb_c')) }], 6).find(i => i.k === 'sesame seeds');
  assert.equal(seeds.packs, 1);
});

test('the total uses the price it is given (the app\'s store estimate) and leaves what you have at home off the bill', () => {
  const pool = C.pool(RECIPES), d = ['rb_a', 'rb_b'].map(id => pool.find(r => r.id === id)).map(r => ({ id: r.id, items: items(r) }));
  const b = C.basket(d, 2);
  // zucchini 2 packs, mince 1, parmesan 1, chicken 1, avocado 1, oregano 1 = 7 packs x 2
  assert.equal(C.total(b, price, 'lidl'), 14);
  assert.equal(C.total(b, price, 'rewe'), 21);
  assert.equal(C.total(b, price, 'lidl', { oregano: 1, zucchini: 1 }), 8);
  assert.deepEqual(C.storeTotals(b, price, ['rewe', 'lidl']).map(x => x[0]), ['lidl', 'rewe'], 'cheapest first');
  assert.equal(C.dinnerCost('rb_a', b, price, 'lidl'), 2 + 2 + 1 + 2, 'mince + parmesan, half of the 2 zucchini packs, half of the one oregano');
});

test('budget: running total, money left or over, and Fit my budget swaps the priciest dinner for a cheaper one', () => {
  assert.deepEqual(C.budgetState(45, 60), { budget: 60, total: 45, left: 15, over: false, pct: 0.75 });
  const s = C.budgetState(72.4, 60); assert.equal(s.over, true); assert.equal(s.left, -12.4); assert.equal(s.pct, 1);
  const cost = { a: 30, b: 10, c: 25, d: 5, e: 8 };
  const build = p => ({ sum: p.reduce((x, id) => x + cost[id], 0), cost: id => cost[id] });
  const f = C.fitBudget(['a', 'b', 'c'], ['a', 'b', 'c', 'd', 'e'], 30, build);
  assert.equal(f.fits, true); assert.ok(f.sum <= 30); assert.equal(f.plan.length, 3); assert.equal(new Set(f.plan).size, 3);
  const g = C.fitBudget(['a', 'b', 'c'], ['a', 'b', 'c'], 5, build);
  assert.equal(g.fits, false, 'says so when nothing cheaper exists'); assert.deepEqual(g.plan, ['a', 'b', 'c']);
});

test('saved settings never throw, are clamped, and a new week starts a new plan but keeps household, budget and store', () => {
  for (const bad of [null, '', '{', '[]', '5', '{"people":"x","plan":7}']) { const s = C.load(bad, '2026-W44'); assert.equal(s.people, 2); assert.equal(s.nights, 5); assert.equal(s.budget, 60); assert.deepEqual(s.plan, []); }
  const raw = JSON.stringify({ people: 40, nights: 0, budget: 3, store: 'aldi', wk: '2026-W43', shuffle: 3, plan: ['rb_a'], have: { oregano: 1 } });
  const s = C.load(raw, '2026-W44');
  assert.equal(s.people, 6); assert.equal(s.nights, 1); assert.equal(s.budget, C.BUDGET_MIN); assert.equal(s.store, 'aldi');
  assert.deepEqual(s.plan, [], 'new week, new plan'); assert.equal(s.shuffle, 0);
  assert.equal(C.load(JSON.stringify({ wk: '2026-W44', plan: ['rb_a'] }), '2026-W44').plan[0], 'rb_a', 'same week keeps the plan');
  assert.equal(C.KEY.indexOf('lowispike.'), 0, 'lowispike.* travels with the account');
  assert.match(C.weekKey(new Date(2026, 9, 26)), /^2026-W44$/);
});

test('the list text says estimate (\u2248) and leaves out what you have', () => {
  const b = C.basket([{ id: 'a', items: items(RECIPES[0]) }], 2);
  const t = C.text(b, { oregano: 1 }, price, 'lidl', 'Lidl', n => '\u20ac' + n.toFixed(2), 'Week');
  assert.match(t, /Lidl/); assert.match(t, /\u2248 \u20ac6\.00/); assert.doesNotMatch(t, /Oregano/);
});

test('wired in: loaded, cached offline, opened from Supermarket, prices from the existing estimates, no second list or price table', () => {
  const html = read('index.html'), sw = read('sw.js'), ui = read('week-basket.js');
  for (const f of ['week-basket-core.js', 'week-basket.js', 'week-basket.css']) {
    assert.ok(html.includes(f), f + ' loaded by index.html'); assert.ok(sw.includes(f), f + ' cached by sw.js');
  }
  assert.match(read('store-picks.js'), /LowiWeekBasket/, 'Supermarket has the Shop from home door');
  assert.match(ui, /LowiStoreList\.price/, 'priced with the app\'s own store estimates');
  assert.match(ui, /addIngredients/, 'goes on the existing shopping list');
  assert.doesNotMatch(ui, /LC_PR\s*=|const\s+PRICES\s*=/, 'no second price table');
  assert.doesNotMatch(ui, /Misty/, 'say your companion, never Misty');
  assert.match(ui, /not live prices/i, 'estimates are labelled');
  assert.match(ui, /not medical advice/i);
});

test('MAYA-HANDOFF 0.22: the shopping cart is Cart / Warenkorb / Carrito, never a basket or bucket on screen, and the week fills that Cart', () => {
  const ui = read('week-basket.js');
  const shown = [...ui.matchAll(/T\('((?:[^'\\]|\\.)*)'/g)].map(m => m[1]).join(' | ');
  assert.doesNotMatch(shown, /basket|bucket/i, 'English strings never say basket or bucket');
  assert.match(ui, /Put it in my Cart/); assert.match(ui, /In meinen Warenkorb/); assert.match(ui, /carrito/);
  assert.match(ui, /\.stp-cartbtn/, 'Open my Cart presses the Supermarket Cart button (store-picks.js owns the pane)');
  const step = require('../tutorial-steps.js').STEPS.find(s => s.id === 'new-week-shop');
  assert.ok(step, 'What\'s New step for Shop from home');
  assert.match(step.text.en, /Cart/); assert.match(step.text.de, /Warenkorb/); assert.match(step.text.es, /carrito/);
  for (const l of ['en', 'de', 'es']) assert.doesNotMatch(step.text[l], /basket|bucket|\bKorb\b|cesta/i);
});
