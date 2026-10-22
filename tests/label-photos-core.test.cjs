'use strict';
/* scanfe-f2: missing data -> label + ingredient photos. Text read from a photo only pre-fills; only confirmed values count;
   numbers are validated by the engine; gaps are never filled. */
const test = require('node:test'), assert = require('node:assert/strict');
const L = require('../label-photos-core.js');

test('gaps: no label and no ingredients asks for both photos', () => {
  const g = L.gaps({name: 'Snack', barcode: '4001234567895', facts: {}});
  assert.ok(g.needs.includes('label_photo'));
  assert.ok(g.needs.includes('ingredients_photo'));
  assert.deepEqual(g.missing, ['carbs', 'sugar', 'fibre', 'protein', 'fat', 'kcal']);
});

test('gaps: complete label but no ingredient list asks only for the ingredients photo', () => {
  const g = L.gaps({name: 'Nuts', barcode: '4001234567895', facts: {c: 36, s: 29, f: 5.5, p: 15, fat: 38, kcal: 555}});
  assert.deepEqual(g.needs, ['ingredients_photo']);
});

test('gaps: a product not in any database needs both photos', () => {
  const g = L.gaps({barcode: '4001234567895', notFound: true});
  assert.deepEqual(g.needs.slice().sort(), ['ingredients_photo', 'label_photo']);
});

test('readNumber: commas, < bounds, blanks and junk', () => {
  assert.equal(L.readNumber('12,5'), 12.5);
  assert.equal(L.readNumber('<0,5'), 0.5);
  assert.equal(L.readNumber('36 g'), 36);
  assert.equal(L.readNumber(''), null);
  assert.ok(Number.isNaN(L.readNumber('abc')));
});

test('parseLabel: German table (Ultje-style) reads per 100 g, not the serving column, and skips saturated fat', () => {
  const txt = 'Nährwerte pro 100 g pro Portion 30 g\nBrennwert 2301 kJ / 555 kcal 694 kJ / 167 kcal\nFett 38 g 11,4 g\ndavon gesättigte Fettsäuren 4,9 g 1,5 g\nKohlenhydrate 36 g 10,8 g\ndavon Zucker 29 g 8,7 g\nBallaststoffe 5,5 g 1,7 g\nEiweiß 15 g 4,5 g\nSalz 1,1 g 0,3 g';
  const r = L.parseLabel(txt);
  assert.deepEqual(r.per100, {carbs: 36, sugar: 29, fibre: 5.5, protein: 15, fat: 38, kcal: 555});
  assert.equal(r.unit, 'g');
});

test('parseLabel: English and Spanish drinks tables, per 100 ml', () => {
  const en = L.parseLabel('Typical values per 100ml\nEnergy 180kJ/42kcal\nFat 0g\nof which saturates 0g\nCarbohydrate 10.6g\nof which sugars 10.6g\nProtein 0g\nSalt 0g');
  assert.equal(en.unit, 'ml');
  assert.equal(en.per100.carbs, 10.6); assert.equal(en.per100.sugar, 10.6); assert.equal(en.per100.fat, 0); assert.equal(en.per100.kcal, 42);
  const es = L.parseLabel('Por 100 ml\nValor energético 192 kJ / 46 kcal\nGrasas 0,1 g\nde las cuales saturadas 0 g\nHidratos de carbono 10,4 g\nde los cuales azúcares 9,8 g\nProteínas 0,4 g');
  assert.equal(es.per100.carbs, 10.4); assert.equal(es.per100.sugar, 9.8); assert.equal(es.per100.fat, 0.1); assert.equal(es.per100.protein, 0.4);
});

test('parseLabel: nothing on the photo means nothing read (no gap filling)', () => {
  const r = L.parseLabel('blurry nothing here');
  assert.deepEqual(r.per100, {});
  assert.deepEqual(r.found, []);
});

test('parseIngredients: header and trace/storage lines are cut off', () => {
  const r = L.parseIngredients('Zutaten: ERDNÜSSE 60%, Zucker, Glukosesirup,\nSalz. Kann Spuren von Mandeln enthalten. Kühl und trocken lagern.');
  assert.equal(r.text, 'ERDNÜSSE 60%, Zucker, Glukosesirup, Salz.');
  assert.equal(r.header, true);
});

test('check: engine validation refuses sugar above carbs and needs carbs when the label was asked for', () => {
  const a = L.check({carbs: '10', sugar: '12'});
  assert.equal(a.ok, false); assert.ok(a.errors.includes('sugar_over_carbs'));
  const b = L.check({sugar: '5', protein: '3'}, {needLabel: true});
  assert.ok(b.errors.includes('carbs_needed'));
  const c = L.check({});
  assert.ok(c.errors.includes('nothing'));
  const d = L.check({carbs: 'x1'});
  assert.ok(d.errors.includes('not_a_number'));
  assert.match(d.text('sugar_over_carbs', 'de'), /Zucker/);
});

test('apply: only confirmed fields are merged, blanks never erase, verdict is re-rated', () => {
  const p = {name: 'Snack', barcode: '4001234567895', facts: {p: 15}, verdict: 'ok', why: [['x']], notFound: true};
  const res = L.check({carbs: '36', sugar: '29', protein: '', ingredients: 'Erdnüsse, Zucker'}, {needLabel: true});
  assert.equal(res.ok, true);
  const q = L.apply(p, res, {ocr: true, now: 1});
  assert.equal(q.facts.c, 36); assert.equal(q.facts.s, 29); assert.equal(q.facts.p, 15);
  assert.equal(q.facts.fat, undefined, 'unknown stays unknown');
  assert.equal(q.ingredients, 'Erdnüsse, Zucker');
  assert.equal(q.verdict, null); assert.equal(q.notFound, undefined);
  assert.deepEqual(q.labelCheck.fields, ['carbs', 'sugar', 'ingredients']);
  assert.equal(q.labelCheck.source, 'label-photo-confirmed');
  assert.equal(L.apply(p, L.check({carbs: '1', sugar: '9'})).facts.c, undefined, 'an invalid form changes nothing');
});

test('apply: a confirmed ml label marks the product as a drink', () => {
  const q = L.apply({name: 'Juice'}, L.check({carbs: '10', sugar: '9', unit: 'ml'}));
  assert.equal(q.facts.unit, 'ml'); assert.equal(q.facts.drink, true);
});
