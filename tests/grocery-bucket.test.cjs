'use strict';
/* grocery-1 (Oct 23 2026, Seven via the Maya 7 handover): after a product scan, "Add to bucket" or "Skip", saved per day.
   grocery-bucket-core.js (pure), grocery-bucket.js (card row), hook in index.html scActsHTML. No prices yet (grocery-2). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const C = require('../grocery-bucket-core.js');

const mem = () => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, m }; };
const T0 = new Date(2026, 9, 23, 10, 0).getTime();

test('add keeps a product in today\'s bucket once (same barcode = one line), remove takes it out', () => {
    let s = { days: {} };
    s = C.add(s, { barcode: '4001234567890', name: 'Oat drink', brand: 'X', verdict: 'better', img: 'https://img/x.jpg' }, T0);
    s = C.add(s, { barcode: '4001234567890', name: 'Oat drink', verdict: 'better' }, T0 + 1000);
    s = C.add(s, { name: 'Loose apples', verdict: 'ok' }, T0 + 2000);
    const t = C.today(s, T0);
    assert.equal(t.length, 2);
    assert.equal(t[0].k, 'bc:4001234567890');
    assert.equal(t[1].k, 'nm:loose apples|');
    assert.ok(C.has(s, { barcode: '4001234567890' }, T0));
    s = C.remove(s, 'bc:4001234567890', C.dayKey(T0));
    assert.equal(C.today(s, T0).length, 1);
    assert.ok(!C.has(s, { barcode: '4001234567890' }, T0));
});

test('saved per day: tomorrow starts empty, old days are pruned after two weeks', () => {
    let s = C.add({ days: {} }, { barcode: '123', name: 'A' }, T0);
    assert.equal(C.today(s, T0 + 864e5).length, 0, 'next day is a fresh bucket');
    assert.equal(C.today(s, T0).length, 1, 'the earlier day is kept');
    s = C.add(s, { barcode: '456', name: 'B' }, T0 + 20 * 864e5);
    assert.ok(!s.days[C.dayKey(T0)], 'a day older than 14 days is dropped');
});

test('no price is copied from the product object; only https images; unknown verdict stays unknown; nothing without a name or barcode', () => {
    const it = C.item({ barcode: '1', name: 'A', price: 2.99, img: 'http://x', verdict: 'weird' }, T0);
    assert.ok(!('price' in it));
    assert.equal(it.img, '');
    assert.equal(it.verdict, 'unknown');
    assert.equal(C.today(C.add({ days: {} }, {}, T0), T0).length, 0);
});

test('load/save round trip and broken storage never throws', () => {
    const st = mem();
    assert.deepEqual(C.load(st), { days: {}, shops: {} });
    C.save(C.add({ days: {} }, { barcode: '9', name: 'Z' }, Date.now()), st);
    assert.equal(C.today(C.load(st)).length, 1);
    st.setItem(C.KEY, '{broken');
    assert.deepEqual(C.load(st), { days: {}, shops: {} });
});

test('words in en/de/es', () => {
    for (const k of Object.keys(C.TX)) assert.equal(C.TX[k].length, 3, k);
    assert.equal(C.tx('add', 0), 'Add to bucket');
    assert.equal(C.tx('skip', 1), 'Überspringen');
    assert.equal(C.tx('countN', 2, 3), '3 productos hoy');
});

test('wired in: product check card asks LowiBucket (not the Log meal scan), files loaded and cached offline, brand colours only', () => {
    const html = read('index.html');
    assert.match(html, /const gb = !logging && window\.LowiBucket \? LowiBucket\.rowHTML\(p\) : "";/);
    assert.match(html, /<script src="grocery-bucket-core\.js\?v=[^"]+"><\/script>\s*<script src="grocery-bucket\.js\?v=/);
    assert.match(html, /<link rel="stylesheet" href="grocery-bucket\.css\?v=/);
    const sw = read('sw.js');
    for (const f of ['grocery-bucket-core.js', 'grocery-bucket.js', 'grocery-bucket.css']) assert.ok(sw.includes('"' + f + '"'), f + ' in sw.js');
    const css = read('grocery-bucket.css');
    assert.ok(!/#(4458d0|8b5cf6|7c3aed|a855f7|22c55e|10b981|34c759)/i.test(css), 'no violet or green');
});

/* grocery-2 (Oct 23 2026): "The bucket lists the items with price and points, and shows the total price for the shop Seven is in
   (let them pick the shop or enter a price if it isn't known) and the total points. Save it per day." */
const REP = {
    'bc:111': [{ amount: 1.29, currency: 'EUR', store: 'REWE', date: '2026-10-20T10:00:00Z' }, { amount: 1.49, currency: 'EUR', store: 'REWE', date: '2026-10-22T10:00:00Z' }, { amount: 0.99, currency: 'EUR', store: 'Lidl', date: '2026-10-21T10:00:00Z' }],
    'bc:222': [{ amount: 2.5, currency: 'EUR', store: 'Lidl', date: '2026-10-22T10:00:00Z' }, { amount: 9, currency: 'USD', store: 'Aldi', date: '2026-10-22T10:00:00Z' }, { amount: 3, currency: 'EUR', store: 'Edeka', date: '2026-10-22T10:00:00Z', expires: 1 }]
};
test('grocery-2: points are the card\'s spike points, only with a real estimate', () => {
    assert.equal(C.item({ barcode: '1', name: 'A', verdict: 'better', score: 45.4 }, T0).pts, 45);
    assert.equal(C.item({ barcode: '1', name: 'A', verdict: 'ok', facts: { score: 12 } }, T0).pts, 12);
    assert.ok(!('pts' in C.item({ barcode: '1', name: 'A', verdict: 'unknown', score: 50 }, T0)), 'no estimate = no points');
    assert.ok(!('pts' in C.item({ barcode: '1', name: 'A', verdict: 'ok' }, T0)), 'no score = no points');
});
test('grocery-2: shops come only from real EUR reports that have not expired; price = newest report at the picked shop', () => {
    assert.deepEqual(C.shopsFrom(REP, T0), ['Lidl', 'REWE']);
    const it = { k: 'bc:111' };
    assert.deepEqual(C.priceFor(it, REP['bc:111'], 'rewe', T0), { amount: 1.49, src: 'report', store: 'REWE', date: '2026-10-22T10:00:00Z' });
    assert.equal(C.priceFor(it, REP['bc:111'], 'Lidl', T0).amount, 0.99);
    assert.equal(C.priceFor(it, REP['bc:111'], '', T0), null, 'no shop picked = no price');
    assert.equal(C.priceFor(it, REP['bc:111'], 'Netto', T0), null, 'unknown at that shop = no price (person types it)');
    assert.equal(C.priceFor({ k: 'bc:222' }, REP['bc:222'], 'Aldi', T0), null, 'non-EUR report ignored');
    assert.equal(C.priceFor({ k: 'bc:222' }, REP['bc:222'], 'Edeka', T0), null, 'expired report ignored');
    assert.deepEqual(C.priceFor({ k: 'bc:111', typed: 1.1 }, REP['bc:111'], 'REWE', T0), { amount: 1.1, src: 'typed' }, 'typed price wins');
});
test('grocery-2: typed prices parse strictly, are saved per day with the shop, and totals count only known prices', () => {
    for (const [i, o] of [['1,29', 1.29], ['€ 2.5', 2.5], ['3', 3], ['0', null], ['abc', null], ['1.299', null], ['1000', null], ['', null]]) assert.equal(C.parsePrice(i), o, i);
    let s = C.add({ days: {} }, { barcode: '111', name: 'Skyr', verdict: 'ok', score: 14 }, T0);
    s = C.add(s, { barcode: '222', name: 'Oats', verdict: 'better', score: 45 }, T0);
    s = C.add(s, { barcode: '333', name: 'Cola', verdict: 'unknown' }, T0);
    const d = C.dayKey(T0);
    s = C.setShop(s, 'REWE', d);
    s = C.setPrice(s, 'bc:333', '0,89', d);
    assert.equal(C.shopOf(s, d), 'REWE');
    assert.equal(C.shopOf(s, C.dayKey(T0 + 864e5)), '', 'shop is per day');
    let t = C.totals(C.today(s, T0), REP, C.shopOf(s, d), T0);
    assert.deepEqual(t, { price: 2.38, priced: 2, missing: 1, points: 59, scored: 2, n: 3 });
    s = C.add(s, { barcode: '333', name: 'Cola', verdict: 'unknown' }, T0 + 5);
    assert.equal(C.today(s, T0).find(x => x.k === 'bc:333').typed, 0.89, 'scanning again keeps the typed price');
    s = C.setPrice(s, 'bc:333', '', d);
    assert.ok(!('typed' in C.today(s, T0).find(x => x.k === 'bc:333')));
    const st = mem(); C.save(C.setShop(s, 'Lidl', d), st);
    assert.equal(C.shopOf(C.load(st), d), 'Lidl', 'shop survives a reload');
    assert.equal(C.fmtPrice(2.38, 0), '€2.38'); assert.equal(C.fmtPrice(2.38, 1), '2,38 €');
});
test('grocery-2: the card list reads prices only from real data (shelf reports, own price contributions) and shows totals', () => {
    const js = read('grocery-bucket.js');
    assert.match(js, /LOWI_SHELF\.priceReports\(it\.name, it\.code\)/);
    assert.match(js, /c\.kind === 'price'/);
    assert.match(js, /data-gb-shop/); assert.match(js, /data-gb-price/); assert.match(js, /gb-tot/);
    assert.match(read('grocery-bucket.css'), /\.gb-pin input\{[^}]*font-size:16px/);
});

/* grocery-3 (Seven): "Today's groceries: at the end of the day, show what was bought, with suggestions for what to cook from it." */
const RECS = [
    { id: 'b_burger', n: 'Nori Smash Burger Stack', e: '🍔', book: true, ing: [{ g: 'salat', n: 'Nori sheets' }, { g: 'hack', n: 'Lean beef mince' }, { g: 'kaese', n: 'Cheddar' }, { g: 'gemuese', n: 'Cucumber' }] },
    { id: 'b_omelette', n: 'Feta Omelette', e: '🍳', book: true, ing: [{ g: 'eier', n: 'Eggs' }, { g: 'kaese', n: 'Feta' }] },
    { id: 'b_salmon', n: 'Salmon Bowl', book: true, ing: ['huhn|Salmon fillet', 'salat|Spinach'] },
    { id: 'm_x', n: 'Rebuild', ing: [{ g: 'snack', n: 'Snacks' }] }
];
const GW = { hack: ['mince', 'hack', 'beef'], huhn: ['chicken', 'salmon', 'lachs', 'hähnchen'], kaese: ['cheese', 'feta', 'cheddar'], eier: ['egg', 'eggs'], salat: ['spinach', 'salat'], gemuese: ['cucumber', 'gurke'], snack: ['chocolate'] };

test('grocery-3 suggest: only recipes the app has, ranked by how much the groceries cover; nothing bought = nothing suggested', () => {
    const items = [{ name: 'Bio Eier 10 Stück' }, { name: 'Feta Classic', brand: 'Salakis' }, { name: 'Rinder Hackfleisch' }, { name: 'Lachsfilet' }];
    const s = C.suggest(items, RECS, GW, 3);
    assert.ok(s.length >= 2 && s.length <= 3);
    assert.equal(s[0].id, 'b_omelette');               /* eggs + feta: every ingredient covered */
    assert.deepEqual(s[0].have, ['Eggs', 'Feta']);
    assert.deepEqual(s[0].need, []);
    const ids = s.map(x => x.id); assert.ok(ids.includes('b_burger') && ids.includes('b_salmon'));
    s.forEach(x => assert.ok(RECS.some(r => r.id === x.id), 'never an invented recipe'));
    const burger = s.find(x => x.id === 'b_burger'); assert.ok(burger.have.includes('Lean beef mince') && burger.need.includes('Cucumber'));
    assert.ok(!ids.includes('m_x'), 'a recipe with nothing bought is not suggested');
    assert.deepEqual(C.suggest([], RECS, GW), []);
    assert.deepEqual(C.suggest(items, null, GW), []);
    assert.deepEqual(C.suggest([{ name: 'Toilet paper' }], RECS, GW), []);
});

test('grocery-3 suggest works without group words (ingredient-name words only) and caps at max', () => {
    const s = C.suggest([{ name: 'Cheddar slices' }, { name: 'Baby spinach' }], RECS, null, 1);
    assert.equal(s.length, 1);
    assert.ok(['b_burger', 'b_salmon'].includes(s[0].id));
});

test('grocery-3 view: Today\'s groceries sheet from the bucket list, recipes from Cook (LowiAllRecipes + GROUP_WORDS), no invented reminder hour', () => {
    const js = read('grocery-bucket.js'), html = read('index.html');
    assert.match(js, /data-gbt="open"/);
    assert.match(js, /openToday/);
    assert.match(js, /LowiAllRecipes/);
    assert.match(js, /data-sh="recipe" data-r=/);
    assert.match(html, /window\.LowiAllRecipes = allRecipes/);
    assert.match(html, /const GROUP_WORDS = \{/);
    assert.match(html, /window\.LOWI_GROUP_WORDS = GROUP_WORDS/);
    assert.match(js, /LOWI_GROUP_WORDS/);
    assert.doesNotMatch(js, /Notification|setHours|getHours/, 'no reminder hour invented');
    ['todayG', 'bought', 'cook', 'noCook', 'noneToday', 'uses', 'alsoNeed'].forEach(k => assert.equal(C.TX[k].length, 3, k));
});
