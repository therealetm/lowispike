// 4 Nov 2026: Rhön Sprudel Limette (Open Food Facts 4102560010942) was scanned as "Liquid sugar" (policy.sugar_drink)
// while its label shows 0 g sugar, 1 kcal, "Ohne Zucker, Ohne Kalorien, Ohne Süßstoff". Cause: the 1% lime juice concentrate
// for flavour counted as added sugar, and the word Limette made the drink "Non-starchy vegetables". Fix: a juice concentrate
// alone, in a drink with at most 0.5 g sugar per 100 ml on the label (EU sugars-free limit), is a flavour trace; a drink
// never earns the vegetable rule. Flavoured drinks in general stay strict: real sugar, label sugar or sweeteners still count.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const root = path.join(__dirname, '..');
const E = require(path.join(root, 'food-engine-core.js'));
const ING = require(path.join(root, 'ingredient-core.js'));
const S = require(path.join(root, 'spike-core.js'));
const FC = require(path.join(root, 'food-card-core.js'));

// Values copied from the Open Food Facts product page (fetched 4 Nov 2026).
const LIM = {
  name: 'Prickelndes Mineralwasser mit Limette', brand: 'Rhön Sprudel', barcode: '4102560010942', unit: 'ml',
  genericName: 'Erfrischungsgetränk Limette mit natürlichem Mineralwasser - Fruchtgehalt: 1%',
  per100: {kcal: 1, carbs: 0, sugar: 0, fat: 0, protein: 0, salt: 0.01},
  ingredients: 'Natürliches Mineralwasser, Kohlensäure, Limettensaftkonzentrat, natürliches Limettenaroma,',
  categories: ['en:beverages', 'en:waters', 'en:carbonated-drinks', 'en:spring-waters', 'en:mineral-waters', 'en:flavored-waters', 'en:flavored-spring-waters']
};
const variant = (over) => Object.assign({}, LIM, over, {per100: Object.assign({}, LIM.per100, over.per100 || {})});
const ids = (o) => (o.policy.rules || []).map(r => r.id);

test('Rhön Sprudel Limette: unsweetened drink, not liquid sugar, not a vegetable', () => {
  const o = E.scanFood(LIM, null, {});
  assert.strictEqual(o.verdict, 'JA');
  assert.strictEqual(o.policy.decidedBy, 'ja.unsweetened_drink');
  assert.ok(!ids(o).includes('policy.sugar_drink'), ids(o).join());
  assert.ok(!ids(o).includes('ja.nonstarchy_veg'), ids(o).join());
  assert.ok(!o.reasonKeys.includes('liquid_sugar'), o.reasonKeys.join());
  assert.strictEqual(o.sugarSource.added, 'no');
});

test('the food card (spike estimate + rules) agrees: JA, no Liquid sugar line', () => {
  const prod = {name: 'Rhön Sprudel ' + LIM.name, brand: LIM.brand, barcode: LIM.barcode, cat: 'drink', categories: LIM.categories,
    ingredients: LIM.ingredients, facts: {c: 0, s: 0, p: 0, fat: 0, kcal: 1, salt: 0.01, drink: true}};
  const a = S.assess(prod);
  assert.notStrictEqual(a.engine && a.engine.policy && a.engine.policy.decidedBy, 'policy.sugar_drink');
  const m = FC.model(prod);
  assert.strictEqual(m.verdict, 'JA');
  assert.ok(!m.reasons.some(r => r.key === 'liquid_sugar'), JSON.stringify(m.reasons.map(r => r.key)));
});

test('the same lime drink with real sugar on the label is still a sugary drink', () => {
  const o = E.scanFood(variant({per100: {sugar: 3.5, carbs: 3.5, kcal: 15}}), null, {});
  assert.strictEqual(o.verdict, 'NEIN');
  assert.ok(ids(o).includes('policy.sugar_drink'), ids(o).join());
});

test('sugar in the ingredients still counts even with 0.4 g on the label', () => {
  const o = E.scanFood(variant({ingredients: 'Mineralwasser, Zucker, Limettensaftkonzentrat, Aroma', per100: {sugar: 0.4}}), null, {});
  assert.strictEqual(o.verdict, 'NEIN');
  assert.ok(ids(o).includes('policy.sugar_drink'));
});

test('a sweetened flavoured water is not called an unsweetened drink', () => {
  const o = E.scanFood(variant({ingredients: 'Mineralwasser, Kohlensäure, Limettensaftkonzentrat, Süßungsmittel (Sucralose), Aroma'}), null, {});
  assert.notStrictEqual(o.verdict, 'JA');
  assert.ok(!ids(o).includes('ja.unsweetened_drink'), ids(o).join());
});

test('a juice spritzer stays NEIN', () => {
  const o = E.scanFood({name: 'Apfelschorle', unit: 'ml', per100: {kcal: 24, carbs: 5.5, sugar: 5.5}, ingredients: 'Mineralwasser, Apfelsaft aus Apfelsaftkonzentrat (55%)', categories: ['en:beverages', 'en:juice-spritzers']}, null, {});
  assert.strictEqual(o.verdict, 'NEIN');
});

test('ingredient-core: juice concentrate stays added sugar without label numbers or above 0.5 g per 100 ml', () => {
  assert.strictEqual(ING.analyzeIngredients(LIM.ingredients, {name: LIM.name}).summary.addedSugar, true);
  assert.strictEqual(ING.analyzeIngredients(LIM.ingredients, {name: LIM.name, unit: 'ml', sugar100: 0.6}).summary.addedSugar, true);
  assert.strictEqual(ING.analyzeIngredients(LIM.ingredients, {name: LIM.name, unit: 'g', sugar100: 0}).summary.addedSugar, true);
  const a = ING.analyzeIngredients(LIM.ingredients, {name: LIM.name, unit: 'ml', sugar100: 0});
  assert.strictEqual(a.summary.addedSugar, false);
  assert.strictEqual(a.summary.juiceTrace, true);
  // Dicksaft is a syrup, never a trace.
  assert.strictEqual(ING.analyzeIngredients('Wasser, Apfeldicksaft, Aroma', {unit: 'ml', sugar100: 0.3}).summary.addedSugar, true);
});
