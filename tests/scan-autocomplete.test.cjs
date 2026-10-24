'use strict';
/* Kitchen autocomplete when fixing a food scan (meal-result.js, Oct 24 2026). Emmanuel: "the things I caught, that live in my
   Kitchen, should appear as I'm typing, so it's faster ... a shortcut to the right stuff already in their kitchen, or something
   they already bought". Kitchen ("At home" + shopping cart) first, then your scans; prefix, fuzzy, case and umlaut blind;
   a pick carries real nutrition so the stats recalculate; free typing still works. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const R = require('../meal-result.js');
const DB = require('../meal-db-core.js');
DB.load(require('../data/meals/fndds.json'));
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const MINE = [
    { barcode: '801', name: 'Pesto alla Genovese', brand: 'Barilla', facts: { kcal: 520, c: 6, s: 4, p: 5, fat: 51, q: '190 g', sv: 30 }, ts: 5 },
    { barcode: '802', name: 'Mini Babybel Original', brand: 'Babybel', facts: { kcal: 308, c: 0, s: 0, p: 22, fat: 24, q: '6 x 22 g' }, ts: 4 },
    { barcode: '803', name: 'Pesto Rosso', brand: 'Barilla', facts: { kcal: 330, c: 8, s: 6, p: 5, fat: 30, q: '200 g', sv: 30 }, ts: 1 }
];
const LOGS = [{ t: 'Milchreis', macros: { kcal: 300, carbs: 50 }, ts: 1 }];
const HOME = [{ id: 'a', n: 'Pesto', at: 30 }, { id: 'b', n: 'Babybel', at: 20 }, { id: 'c', n: 'Milch', at: 10 }, { id: 'd', n: 'Tomatensoße', at: 40 }, { id: 'e', n: 'Käse', at: 5 }];
const CART = [{ id: 'x', n: 'Sriracha Sauce · 1 Flasche', done: false }, { id: 'y', n: 'Skyr', done: true }];
const L = () => R.knownList({ mine: MINE, logs: LOGS, home: HOME, cart: CART });

test('Kitchen rows come first: At home newest first, then the shopping cart, then your scans', () => {
    const list = L();
    assert.deepEqual(list.slice(0, 7).map(p => p.src), ['home', 'home', 'home', 'home', 'home', 'cart', 'cart']);
    assert.equal(list[0].name, 'Tomatensoße', 'newest At home item first');
    assert.equal(list[5].name, 'Sriracha Sauce', 'cart recipe amount " · 1 Flasche" is not part of the name');
    assert.equal(R.suggest('pes', list)[0].src, 'home', 'your Kitchen pesto beats the other scanned pesto');
    assert.equal(R.suggest('pes', list)[1].name, 'Pesto Rosso', 'then the recent scan');
    assert.equal(R.suggest('sri', list)[0].src, 'cart', 'something in the cart is a shortcut too');
    assert.equal(R.suggest('skyr', list)[0].src, 'cart', 'bought (ticked) cart items count');
    assert.ok(R.suggest('x', list).length === 0, 'one letter suggests nothing');
    assert.ok(R.suggest('pes', list).length <= 5);
});

test('a Kitchen name takes the nutrition of the product you scanned, never a near miss', () => {
    const list = L();
    const pesto = list.find(p => p.key === 'kpesto');
    assert.equal(pesto.name, 'Pesto alla Genovese');
    assert.equal(pesto.via, 'scan');
    assert.equal(R.perText(pesto, 'en'), '156 kcal / 30 g');
    assert.equal(list.filter(p => /genovese/i.test(p.name)).length, 1, 'the scan is not listed twice');
    const bb = list.find(p => p.key === 'kbabybel');
    assert.equal(bb.name, 'Mini Babybel Original');
    const two = R.itemFrom(bb, 2, 'de');
    assert.equal(two.grams, 44);
    assert.equal(two.kcal, 136);
    const milk = list.find(p => p.key === 'kmilch');
    assert.equal(milk.name, 'Milch', '"Milch" never borrows "Milchreis"');
    assert.ok(milk.est);
    assert.ok(list.some(p => p.name === 'Milchreis' && p.src === 'log'), 'the logged Milchreis stays its own row');
    assert.equal(R.kitchenHit('Pesto', [R.fromProduct(MINE[2], 'dex')]), null, 'a shared-list product needs the exact name');
});

test('a Kitchen name nothing knows reads one typical portion from the meal database, once', () => {
    const list = L();
    const milk = list.find(p => p.key === 'kmilch');
    assert.equal(R.perText(milk, 'en'), '', 'no number before it is read');
    assert.equal(R.manyLabel(milk, 'en'), 'How many pieces?');
    R.estFor(milk, DB);
    assert.ok(milk.per && milk.per.kcal > 30 && milk.per.kcal < 90, 'milk is about 60 kcal / 100 g');
    assert.ok(milk.serve > 0);
    assert.match(R.perText(milk, 'de'), /kcal \/ \d+ g/);
    const one = R.itemFrom(milk, 1, 'de');
    assert.ok(one.kcal > 0 && one.grams === milk.serve, 'a pick recalculates real numbers');
    const again = R.knownList({ home: [{ n: 'Milch', at: 1 }] })[0];
    R.estFor(again, null, true);
    assert.ok(again.per, 'the second time it comes from the cache, without the database');
    const odd = R.knownList({ home: [{ n: 'Zqxw blorp', at: 1 }] })[0];
    R.estFor(odd, DB);
    assert.ok(!odd.per && !odd.each, 'unknown stays unknown, never a made-up number');
    assert.equal(R.perText(odd, 'en'), '');
});

test('prefix, typos, case and umlauts: Kaese, kase, KÄSE, tomatensose, Babybal', () => {
    const list = L();
    for (const q of ['Kaese', 'kase', 'KÄSE', 'käse']) assert.equal(R.suggest(q, list)[0].name, 'Käse', q);
    for (const q of ['tomatenso', 'Tomatensosse', 'tomatensose', 'TOMATENSOSSE']) assert.equal(R.suggest(q, list)[0].name, 'Tomatensoße', q);
    assert.equal(R.suggest('Babybal', list)[0].name, 'Mini Babybel Original');
    assert.equal(R.suggest('2 babyb', list)[0].name, 'Mini Babybel Original', 'an amount in front is fine');
    assert.equal(R.matchScore('muesli', 'Müsli'), 100);
    assert.deepEqual(R.suggest('zzzz', list), [], 'nothing matches: free typing as before');
});

test('no Kitchen: the list is exactly what it was (scans, logs, shared list, table)', () => {
    const a = R.knownList({ mine: MINE, logs: LOGS }), b = R.knownList({ mine: MINE, logs: LOGS, home: [], cart: [] });
    assert.deepEqual(a.map(p => p.key), b.map(p => p.key));
    assert.equal(a[0].src, 'scan');
});

test('typing stays fast: 300 Kitchen items + 400 logs, a suggestion per keystroke well under a frame', () => {
    const home = Array.from({ length: 300 }, (_, i) => ({ n: 'Kitchen item ' + i + ' Soße', at: i }));
    const logs = Array.from({ length: 400 }, (_, i) => ({ t: 'Food ' + i, macros: { kcal: 100 + i }, ts: i }));
    let t0 = Date.now();
    const list = R.knownList({ mine: MINE, logs, home, cart: CART });
    const build = Date.now() - t0;
    t0 = Date.now();
    for (const q of ['k', 'ki', 'kit', 'kitc', 'kitch', 'kitche', 'kitchen', 'kitchen i', 'tomat', 'sosse']) R.suggest(q, list, 5);
    const per = (Date.now() - t0) / 10;
    assert.ok(build < 200, 'list built in ' + build + ' ms');
    assert.ok(per < 40, 'one keystroke ' + per + ' ms');
});

test('three languages, the Kitchen read offline from the phone, and an Add food row', () => {
    for (const l of ['en', 'de', 'es']) for (const k of ['srcHome', 'srcCart', 'addFood', 'addWhat', 'addPh', 'new0']) assert.ok(R.STR[l][k], l + ' ' + k);
    assert.equal(R.STR.de.srcHome, 'In deiner Küche');
    assert.equal(R.STR.es.addFood, 'Añadir alimento');
    const src = read('meal-result.js');
    assert.match(src, /lowispike\.kitchen\.v1/);
    assert.match(src, /listOpen\(true\)/, 'the shopping cart, bought items included');
    assert.match(src, /data-mr-add-food/);
    assert.match(src, /sugFor\(box\.querySelector\(keepOf\(eid\)\), eid, true\)/, 'opening Fix offers your own matches at once');
    assert.match(read('scan-screens.css'), /\.mr-opt-kit \.mr-opt-n small/);
    assert.match(read('scan-screens.css'), /\.mr-add-food \{/);
});
