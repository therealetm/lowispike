/* Bug hunt 2026-10-24 03:02 (Fuel > Log a meal > photo): in German and Spanish the LOWiSPIKE line on the photo result read
   "LOWiSPIKE: NEIN Rice, bread, pasta or potato: a big starch load" in English. The verdict was rated without the language,
   so its reason was always English, and the result card showed that English reason first. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../meal-result.js');
const RICE = { name: 'White rice', portion: '1 cup', grams: 180, kcal: 230, protein: 4, carbs: 50, sugar: 0, fiber: 1, fat: 0.5 };
const CHICKEN = { name: 'Grilled chicken', portion: '~150 g', grams: 150, kcal: 250, protein: 38, carbs: 0, sugar: 0, fiber: 0, fat: 9 };

test('the LOWiSPIKE reason on the photo result is in the user\'s language', () => {
  const items = [CHICKEN, RICE].map(R.clean);
  const en = R.formValues(items, [], 'en').verdict.food, de = R.formValues(items, [], 'de').verdict.food, es = R.formValues(items, [], 'es').verdict.food;
  assert.equal(en.reason, 'Rice, bread, pasta or potato: a big starch load');
  assert.equal(de.reason, 'Reis, Brot, Nudeln oder Kartoffel: viel Stärke');
  assert.equal(es.reason, 'Arroz, pan, pasta o patata: mucho almidón');
  assert.equal(de.label, 'LIEBER NICHT');
});
