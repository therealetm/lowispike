/* Bug hunt 2026-10-24 03:02 (Fuel > Log a meal): typing "Oats with milk" (or "oats", "overnight oats", "rolled oats") was
   understood as "Oat milk", a drink of 110 kcal with 1.6 g protein, and the ingredients read "oats, oil, sugar, vitamin d as
   ingredient, calcium as ingredient". Oats are oatmeal; "oat milk" stays oat milk; added vitamins and minerals are not
   ingredients a person names. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const M = require('../meal-db-core.js');
M.load(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data/meals/fndds.json'), 'utf8')));

test('oats as typed are oatmeal, never the oat milk drink', () => {
  for (const t of ['Oats with milk', 'oats', 'Overnight oats', 'rolled oats', 'oats with banana', 'Oats, milk']) {
    const r = M.parse(t);
    assert.doesNotMatch(r.name, /oat milk/i, t + ' -> ' + r.name);
    assert.match(r.name, /oatmeal/i, t + ' -> ' + r.name);
  }
  assert.ok(M.parse('Oats with milk').kcal >= 200, 'a bowl of oats with milk is a meal, not a 110 kcal drink');
  assert.equal(M.parse('Oats with milk').name, M.parse('Haferflocken mit Milch').name, 'same meal in English and German');
});

test('oat milk is still oat milk', () => {
  assert.match(M.parse('oat milk').name, /oat milk/i);
  assert.match(M.parse('Oat milk latte').name, /oat milk/i);
});

test('ingredients never list added vitamins or minerals ("vitamin d as ingredient")', () => {
  for (const t of ['oat milk', 'cereal with milk', 'corn flakes', 'Oats with milk']) {
    const ing = M.parse(t).ingredients;
    assert.ok(ing.length, t + ' still has ingredients');
    for (const x of ing) assert.doesNotMatch(x, /as ingredient/i, t + ': ' + ing.join(', '));
  }
});
