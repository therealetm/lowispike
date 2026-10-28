'use strict';
/* 28 Oct 2026 (Emmanuel, screenshots of Jeden Tag Speisequark Magerstufe 500 g): the scanner said "Nicht insulinfreundlich",
   "20 g Zucker in 500 g", "Höchstens einmal pro Woche", while the LOWiSPIKE chat (Master Knowledge v3) rates plain quark JA.
   Two causes, both general, not a quark override:
   1. Open Food Facts gives some packs serving_quantity = the whole pack (500), so the whole tub was rated as one serving.
      A manufacturer serving that is the whole pack and more than twice the group's usual portion now falls back to the
      usual portion (food-engine-core pickServing, spike-core packG). The user's own grams still win.
   2. Open Food Facts tags plain quark "en:desserts" / "en:dairy-desserts"; the tag alone made it a sweet/dessert Skip it.
      For plain yoghurt/quark with a complete ingredient list, no added sugar, no sweetener and milk-sugar-level sugar the
      tag no longer counts (food-policy-core applyPolicy). Sweetened ones keep their warning. */
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../spike-core.js');
const E = require('../food-engine-core.js');
const C = require('../shop-scan-core.js');

const DESSERT_TAGS = ['en:dairies', 'en:fermented-foods', 'en:fermented-milk-products', 'en:desserts', 'en:dairy-desserts', 'en:quarks', 'en:lean-quark'];
/* Open Food Facts 4306188367345 (Jeden Tag Speisequark, 500 g, serving_quantity 500) */
const tub = () => ({name: 'Speisequark', brand: 'Jeden Tag', barcode: '4306188367345', cat: 'dairy',
    facts: {c: 4, s: 4, p: 12, fat: 0.5, kcal: 68, q: '500g', sv: 500}, ingredients: 'Magermilch, Milchsäurekulturen, mikrobielles Lab', categories: DESSERT_TAGS});
/* Open Food Facts 4306188411413 (Jeden Tag Speisequark Magerstufe, 500 g, no serving) */
const mager = () => ({name: 'Speisequark Magerstufe', brand: 'Jeden Tag', barcode: '4306188411413', cat: 'dairy',
    facts: {c: 4.1, s: 4.1, p: 12, fat: 0.5, kcal: 68, q: '500g'}, ingredients: 'Quark.',
    categories: DESSERT_TAGS.concat(['en:cheeses', 'en:cream-cheeses'])});

test('plain quark whose label serving is the whole 500 g tub is rated per usual portion, insulin-friendly', () => {
    const a = S.assess(tub());
    assert.equal(a.engine.serving.g, 150);
    assert.equal(a.engine.serving.source, 'group');
    assert.equal(a.verdict, 'ok');
    assert.equal(S.foodVerdict(tub()), 'ok');
    assert.equal(C.level(S.foodVerdict(tub())), 'none');
});

test('the Why text no longer says 20 g sugar in 500 g or once a week for plain quark', () => {
    const ex = C.explain(tub(), null, C.level(S.foodVerdict(tub())), 'de');
    assert.ok(!/500 g/.test(ex.lines.join(' ')), ex.lines.join(' | '));
    assert.ok(!/Woche/.test(ex.often), ex.often);
    assert.equal(ex.g, 150);
});

test('Open Food Facts dessert tag alone does not make plain low-fat quark a dessert', () => {
    assert.equal(S.assess(mager()).verdict, 'ok');
    assert.equal(S.foodVerdict(mager()), 'ok');
    const ex = C.explain(mager(), null, 'none', 'de');
    assert.ok(!/Dessert/.test(ex.lines.join(' ')), ex.lines.join(' | '));
});

test('sweetened quark with the same tags keeps its warning (added sugar)', () => {
    const p = Object.assign(mager(), {name: 'Speisequark', facts: {c: 14, s: 13, p: 9, fat: 0.4, kcal: 100, q: '500g', sv: 500},
        ingredients: 'Magermilchquark, Zucker, Glukosesirup, Milchsäurekulturen'});
    assert.notEqual(S.foodVerdict(p), 'ok');
    assert.equal(C.level(S.foodVerdict(p)), 'spike');
});

test('a dessert word in the name still counts (vanilla quark dessert)', () => {
    const p = Object.assign(mager(), {name: 'Vanille Quark Dessert', facts: {c: 4.5, s: 4.5, p: 11, fat: 0.4, kcal: 68, q: '500g'}});
    assert.notEqual(S.foodVerdict(p), 'ok');
});

test('unknown ingredients: the dessert tag still counts (no guessing that nothing was added)', () => {
    const p = Object.assign(mager(), {ingredients: ''});
    assert.notEqual(S.foodVerdict(p), 'ok');
});

test('serving handling: whole-pack serving falls back, a real serving and the user grams stay', () => {
    const per100 = {carbs: 4, sugar: 4};
    assert.equal(E.calculateServing(per100, {manufacturerG: 500, packG: 500, group: 'dairy'}).g, 150);
    assert.equal(E.calculateServing(per100, {manufacturerG: 150, packG: 150, group: 'dairy'}).g, 150);
    assert.equal(E.calculateServing(per100, {manufacturerG: 250, packG: 500, group: 'dairy'}).g, 250);
    assert.equal(E.calculateServing(per100, {manufacturerG: 500, group: 'dairy'}).g, 500);
    assert.equal(E.calculateServing(per100, {userG: 500, manufacturerG: 500, packG: 500, group: 'dairy'}).g, 500);
    assert.equal(E.calculateServing(E.validateNutrition({carbs: 10, sugar: 10}, 'ml'), {manufacturerG: 500, packG: 500, group: 'drinks'}).g, 500);
    /* the user picking the whole tub on the card is rated as the whole tub */
    assert.equal(S.assess(tub(), {servingG: 500}).engine.serving.g, 500);
});

test('pack weight parsing reads g and kg, not pieces or multipacks', () => {
    const g = q => S.assess(Object.assign(tub(), {facts: Object.assign(tub().facts, {q})})).engine.serving.g;
    assert.equal(g('500 g'), 150);
    assert.equal(g('0,5 kg'), 150);
    assert.equal(g('4 x 125 g'), 500);
    assert.equal(g('1pieces'), 500);
});
