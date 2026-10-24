'use strict';
/* Oct 24 sweep: a meal typed in Spanish gets the same verdict (and so the same XP) as in English or German.
   Bug: "Avena con leche" was read as milk alone (avena unknown), so it was not spiky and earned +15 XP,
   while "Oats with milk" and "Haferflocken mit Milch" are spiky and earn none. Runs the real meal library + rules engine. */
const {test} = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const block = mark => { const a = html.lastIndexOf('<script>', html.indexOf(mark)) + 8; return html.slice(a, html.indexOf('</script>', a)); };
const ctx = {module: {exports: {}}, console};
vm.createContext(ctx);
vm.runInContext(block('/* LOWiSPIKE meal library v1.1') + '\n' + block('/* LOWiSPIKE v2 rules engine'), ctx);
const {analyseMeal, parseMeal} = ctx.module.exports;
const verdict = t => { const a = analyseMeal(t, {trig: []}); return a.ok ? a.lvl + '/' + a.r : 'unknown'; };

test('oats with milk is the same verdict in English, German and Spanish', () => {
  const en = verdict('Oats with milk');
  assert.equal(en, 'high/nein');
  assert.equal(verdict('Haferflocken mit Milch'), en);
  assert.equal(verdict('Avena con leche'), en);
  assert.equal(verdict('Copos de avena con leche'), en);
});

test('common Spanish meals are read like their English words', () => {
  for (const [es, en] of [['Arroz con pollo', 'rice with chicken'], ['Pan con tomate', 'bread with tomato'], ['Huevos con espinacas', 'eggs with spinach'],
    ['Patatas fritas', 'fries'], ['Pollo con verduras', 'chicken with vegetables'], ['Yogur con fresas', 'yogurt with strawberries']])
    assert.equal(verdict(es), verdict(en), es);
  assert.deepEqual([...parseMeal('Avena con leche').unknown], []);
});

test('"sin" leaves a food out like "without"', () => {
  assert.equal(verdict('pollo con ensalada sin pan'), verdict('chicken with salad without bread'));
  assert.deepEqual([...parseMeal('pollo sin arroz').dropped], ['rice']);
});

test('Spanish keywords that already existed and English or German meals do not change', () => {
  assert.equal(parseMeal('chili con carne').dishes.length + parseMeal('chili con carne').foods.length > 0, true);
  assert.equal(parseMeal('cafe con leche').foods[0].food.id, 'milk', 'a splash of milk in coffee stays JA');
  assert.equal(parseMeal('chorrito de leche').foods[0].food.id, 'milk');
  assert.equal(parseMeal('pan fried chicken').foods.some(f => f.food.id === 'bread'), false, 'English pan fried is not bread');
  for (const t of ['Oats with milk', 'Haferflocken mit Milch', 'Schnitzel mit Pommes', 'salmon with broccoli', 'Brot mit Butter'])
    assert.notEqual(verdict(t), 'unknown', t);
});
