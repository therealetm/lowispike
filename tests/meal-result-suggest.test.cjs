'use strict';
/* Fix field suggestions (meal-result.js, Oct 21 2026). Eman typed "Babybal" in "What is it really?": the app should offer the
   Babybel it already knows (his scan, a meal he logged, the shared list or the built-in table) and "How many pieces?" should
   multiply real nutrition per piece. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const R = require('../meal-result.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const MINE = [
    { barcode: '3073781055856', name: 'Mini Babybel Original', brand: 'Babybel', facts: { kcal: 308, c: 0, s: 0, p: 22, fat: 24, q: '6 x 22 g' }, ts: 5 },
    { barcode: '4002', name: 'Skyr Natur', brand: 'Arla', facts: { kcal: 63, c: 4, s: 4, p: 11, fat: 0.2, q: '450 g' }, ts: 4 },
    { barcode: '4003', name: 'Protein Riegel', brand: 'X', facts: { kcal: 380, c: 30, s: 3, p: 33, fat: 12, q: '45 g' }, ts: 3 }
];
const LOGS = [
    { t: 'Rice and chicken', macros: { kcal: 600 }, ts: 1 },
    { t: 'Banana', macros: { kcal: 105, carbs: 27, sugar: 14, fiber: 3, protein: 1.3, fat: 0.4 }, ts: 2 }
];

test('typos and partial words find the known product (Babybal, Babyb, baby bel)', () => {
    const L = R.knownList({ mine: MINE, logs: LOGS });
    for (const q of ['Babybal', 'Babyb', 'baby bel', '2 babybel', 'babybell']) assert.equal(R.suggest(q, L)[0].name, 'Mini Babybel Original', q);
    assert.equal(R.suggest('skir', L)[0].name, 'Skyr Natur');
    assert.equal(R.suggest('bana', L)[0].name, 'Banana');
    assert.deepEqual(R.suggest('xyz', L), []);
    assert.deepEqual(R.suggest('b', L), [], 'one letter suggests nothing');
    assert.equal(R.matchScore('cooked meat chunks', 'Mini Babybel', 'Babybel'), 0);
});

test('your own scan beats the built-in table; with no scan the built-in Babybel still shows', () => {
    const L = R.knownList({ mine: MINE, logs: LOGS });
    assert.equal(L.filter(p => /babybel/i.test(p.name)).length, 1, 'no duplicate Babybel');
    const top = R.suggest('Babyb', R.knownList({}))[0];
    assert.equal(top.name, 'Mini Babybel');
    assert.equal(top.src, 'table');
    assert.equal(R.perText(top, 'en'), '61 kcal / piece');
});

test('only single foods from the meal log become suggestions', () => {
    const L = R.knownList({ logs: LOGS });
    assert.ok(L.some(p => p.name === 'Banana'));
    assert.ok(!L.some(p => /rice/i.test(p.name)));
    assert.equal(R.fromLog({ t: '2 Eggs', macros: { kcal: 150 } }), null);
});

test('piece size comes from the pack: 6 x 20 g, 120 g 6 Stueck, 5 Stueck a 22 g, one 45 g bar', () => {
    assert.deepEqual(R.pieceOf('6 x 20 g'), { piece: 20, unit: 'g' });
    assert.deepEqual(R.pieceOf('200 g (10 x 20 g)'), { piece: 20, unit: 'g' });
    assert.deepEqual(R.pieceOf('120 g, 6 Stück'), { piece: 20, unit: 'g' });
    assert.deepEqual(R.pieceOf('5 Stück à 22 g'), { piece: 22, unit: 'g' });
    assert.equal(R.pieceOf('450 g'), null);
    assert.equal(R.fromProduct(MINE[2], 'scan').piece, 45);
    const skyr = R.fromProduct(MINE[1], 'scan');
    assert.equal(skyr.piece, 0);
    assert.equal(skyr.serve, 100);
    assert.equal(R.fromProduct({ name: 'Nuts', facts: { kcal: 600, q: '200 g', sv: 30 } }).serve, 30, 'OFF serving size is used');
});

test('How many pieces multiplies real nutrition per piece; servings when the pack has no piece size', () => {
    const L = R.knownList({ mine: MINE, logs: LOGS });
    const bb = R.suggest('Babybal', L)[0];
    const three = R.itemFrom(bb, 3, 'en');
    assert.equal(three.name, 'Mini Babybel Original');
    assert.equal(three.grams, 66);
    assert.equal(three.kcal, 203);
    assert.equal(three.protein, 14.5);
    assert.equal(three.portion, '3 pcs · ~66 g');
    assert.equal(R.itemFrom(bb, '', 'en').count, 1, 'empty count is one piece');
    assert.equal(R.manyLabel(bb, 'en'), 'How many pieces?');
    const skyr = R.suggest('skyr', L)[0];
    assert.equal(R.manyLabel(skyr, 'en'), 'How many servings? (1 = 100 g)');
    assert.equal(R.itemFrom(skyr, 2, 'en').kcal, 126);
    const ban = R.itemFrom(R.suggest('banana', L)[0], 2, 'de');
    assert.equal(ban.kcal, 210);
    assert.equal(ban.portion, '2 Portionen');
    assert.ok(R.verdict([R.clean(three)]), 'the known card feeds the same spike verdict');
});

test('the field says pieces in all three languages; the scanner keeps the OFF serving size', () => {
    assert.equal(R.STR.en.many, 'How many pieces?');
    assert.equal(R.STR.de.many, 'Wie viele Stück?');
    assert.equal(R.STR.es.many, '¿Cuántas piezas?');
    for (const l of ['en', 'de', 'es']) for (const k of ['manyD', 'manyServ', 'manyEach', 'sugL', 'srcScan', 'srcLog', 'srcDex', 'srcTable', 'perPc', 'perSrv', 'perEach', 'srvOne', 'srvMany']) assert.ok(R.STR[l][k], l + ' ' + k);
    assert.match(read('index.html'), /quantity,serving_quantity", \{signal/);
    assert.match(read('scan-screens.css'), /\.mr-sug \{/);
});
