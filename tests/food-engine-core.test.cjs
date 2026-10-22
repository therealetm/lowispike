// Food Intelligence Engine core (queue step scanfe-b1): validation, serving math, glucose-impact categories.
// Spec: queue/FOOD-ENGINE-SPEC.md sections 4 and 5. Pure module, no browser needed.
const test = require('node:test');
const assert = require('assert');
const path = require('path');
const E = require(path.join(__dirname, '..', 'food-engine-core.js'));

const ULTJE = {carbs: 36, sugar: 29, fibre: 5.5, protein: 15, fat: 38, kcal: 555, salt: null};
const impact = (per100, unit, opts, extra) => E.estimateGlucoseImpact(Object.assign({serving: E.calculateServing(E.validateNutrition(per100, unit), opts)}, extra || {}));

test('module shape: UMD export with the b1 interfaces', () => {
  for (const fn of ['validateNutrition', 'calculateServing', 'estimateGlucoseImpact', 'normalize']) assert.strictEqual(typeof E[fn], 'function', fn);
  assert.strictEqual(E.BANDS.version, 'carb-bands-v1');
  assert.deepStrictEqual(Object.values(E.CATEGORY), ['Lower', 'Moderate', 'Higher', 'Insufficient evidence']);
});

test('serving math: Ultje Suess & Salzig at 30 g = 8.7 sugar / 10.8 carbs / 4.5 protein / 11.4 fat / ~167 kcal', () => {
  const s = E.calculateServing(E.validateNutrition(ULTJE, 'g'), 30);
  assert.strictEqual(s.g, 30);
  assert.strictEqual(s.source, 'user');
  assert.deepStrictEqual([s.shown.sugar, s.shown.carbs, s.shown.protein, s.shown.fat, s.shown.kcal], [8.7, 10.8, 4.5, 11.4, 167]);
  assert.strictEqual(s.shown.fibre, 1.7);
  assert.strictEqual(s.shown.salt, null, 'unknown salt stays unknown, never 0');
  const h = E.calculateServing(ULTJE, 100);
  assert.deepStrictEqual([h.amounts.sugar, h.amounts.carbs, h.amounts.protein, h.amounts.fat, h.amounts.kcal], [29, 36, 15, 38, 555]);
});

test('serving choice: user grams, then manufacturer, then food group portion, else 100', () => {
  const v = E.validateNutrition(ULTJE, 'g');
  assert.deepStrictEqual([E.calculateServing(v, {userG: 45, manufacturerG: 30, group: 'snacks'}).g, E.calculateServing(v, {userG: 45}).source], [45, 'user']);
  assert.deepStrictEqual([E.calculateServing(v, {manufacturerG: 30, group: 'meals'}).g, E.calculateServing(v, {manufacturerG: 30}).source], [30, 'manufacturer']);
  const grp = E.calculateServing(v, {group: 'snacks'});
  assert.deepStrictEqual([grp.g, grp.source, grp.group], [30, 'group', 'snacks']);
  assert.deepStrictEqual([E.calculateServing(v, {}).g, E.calculateServing(v, {}).source], [100, 'per100']);
  const drink = E.calculateServing(E.validateNutrition({carbs: 10.6, sugar: 10.6}, 'ml'), {});
  assert.deepStrictEqual([drink.g, drink.unit, drink.source], [250, 'ml', 'group']);
  assert.strictEqual(E.calculateServing(v, {userG: 0, manufacturerG: 30}).g, 30, 'a zero user portion is ignored');
});

test('no subtraction: carbs per serving stay the EU label carbs, whatever the fibre, protein or fat', () => {
  const s = E.calculateServing({carbs: 42, sugar: 3.5, fibre: 6.5, protein: 9.1, fat: 5.3, kcal: 265}, 25);
  assert.strictEqual(s.shown.carbs, 10.5, 'fibre is not subtracted from EU carbohydrate');
  const g = E.estimateGlucoseImpact({serving: s});
  assert.strictEqual(g.availableCarbsG, 10.5, 'available carbs = label carbs, never minus fibre/protein/fat');
});

test('protein, fat and fibre never lower the category (they are modifiers only)', () => {
  const plain = impact({carbs: 36, sugar: 29}, 'g', 30);
  const rich = impact(ULTJE, 'g', 30);
  assert.strictEqual(rich.key, plain.key);
  assert.strictEqual(rich.category, 'Moderate');
  assert.ok(rich.modifiers.includes('fat_may_slow'));
  const loaded = impact({carbs: 40, sugar: 35, fibre: 10, protein: 25, fat: 24}, 'g', 50);
  assert.strictEqual(loaded.category, 'Higher', 'no amount of protein, fat or fibre cancels 20 g carbs / 17.5 g sugar');
  assert.deepStrictEqual(loaded.modifiers.slice(0, 3), ['protein_may_slow', 'fat_may_slow', 'fibre_may_slow']);
});

test('categories: Lower / Moderate / Higher from carbs and sugar per serving, liquids stricter', () => {
  assert.strictEqual(impact({carbs: 6, sugar: 4.6, protein: 24, fat: 56}, 'g', 30).category, 'Lower');
  assert.strictEqual(impact({carbs: 77.3, sugar: 0.3}, 'g', 75).category, 'Higher');
  assert.strictEqual(impact({carbs: 66, sugar: 66}, 'g', 30).category, 'Higher', '19.8 g sugar in one handful');
  assert.strictEqual(impact({carbs: 10.6, sugar: 10.6}, 'ml', 250).category, 'Higher', 'sugary drink');
  const juiceSmall = impact({carbs: 3, sugar: 3}, 'ml', 200);
  assert.strictEqual(juiceSmall.category, 'Moderate', '6 g liquid sugar is already Moderate');
  assert.ok(juiceSmall.reasons.includes('liquid_sugar') && juiceSmall.modifiers.includes('liquid_fast'));
  assert.strictEqual(impact({carbs: 3, sugar: 3}, 'g', 200).category, 'Lower', 'same grams as a solid are Lower');
  assert.strictEqual(impact({carbs: 0, sugar: 0, kcal: 0.2}, 'ml', 250).category, 'Lower');
  const portion = [impact(ULTJE, 'g', 20).category, impact(ULTJE, 'g', 30).category, impact(ULTJE, 'g', 100).category];
  assert.deepStrictEqual(portion, ['Lower', 'Moderate', 'Higher'], 'the selected portion decides, not an assumed 100 g');
});

test('unknown or inconsistent data gives Insufficient evidence, never a guess', () => {
  const none = impact({protein: 20, fat: 10}, 'g', 30);
  assert.deepStrictEqual([none.category, none.reasons], ['Insufficient evidence', ['no_carb_data']]);
  const sugarOnlyLow = impact({sugar: 2}, 'g', 30);
  assert.deepStrictEqual([sugarOnlyLow.category, sugarOnlyLow.reasons], ['Insufficient evidence', ['carbs_unknown']]);
  assert.strictEqual(impact({sugar: 60}, 'g', 30).category, 'Higher', 'enough sugar alone is a floor');
  const bad = E.validateNutrition({carbs: 10, sugar: 20}, 'g');
  assert.strictEqual(bad.valid, false);
  assert.strictEqual(bad.issues[0].code, 'sugar_over_carbs');
  const g = E.estimateGlucoseImpact({serving: E.calculateServing(bad, 30)});
  assert.deepStrictEqual([g.category, g.reasons], ['Insufficient evidence', ['label_inconsistent']]);
  assert.strictEqual(E.estimateGlucoseImpact({}).category, 'Insufficient evidence');
});

test('validation: negative values, macros over 100 g, unknown unit, kcal mismatch, short keys', () => {
  const neg = E.validateNutrition({carbs: -1, sugar: 0}, 'g');
  assert.ok(!neg.valid && neg.issues.some(i => i.code === 'negative') && neg.per100.carbs === null);
  assert.ok(E.validateNutrition({carbs: 80, protein: 30, fat: 10}, 'g').issues.some(i => i.code === 'macros_over_100'));
  assert.ok(!E.validateNutrition({carbs: 1}, 'oz').valid);
  const kcal = E.validateNutrition({carbs: 14.6, sugar: 10.8, protein: 2.7, fat: 8.8, kcal: 100}, 'g');
  assert.ok(kcal.valid, 'a kcal mismatch is a warning, the label stays usable');
  assert.deepStrictEqual(kcal.issues.map(i => [i.code, i.level]), [['kcal_mismatch', 'warn']]);
  assert.deepStrictEqual(E.validateNutrition(ULTJE, 'g').issues, [], 'Ultje label is consistent (557 vs 555 kcal)');
  const short = E.validateNutrition({c: '36', s: 29, f: 5.5, p: 15, fat: 38}, 'g');
  assert.deepStrictEqual([short.per100.carbs, short.per100.sugar, short.per100.fibre, short.per100.protein, short.per100.fat], [36, 29, 5.5, 15, 38]);
  assert.deepStrictEqual(short.missing, ['kcal', 'salt']);
  assert.strictEqual(E.validateNutrition({sugar: 1}, 'g').usable, true);
  assert.strictEqual(E.validateNutrition({protein: 1}, 'g').usable, false, 'no carbs or sugar: nothing to estimate from');
});

test('glycemic load only with a credible, sourced GI; it can raise, never lower', () => {
  const s = E.calculateServing({carbs: 28, sugar: 0.2}, 100);
  assert.strictEqual(E.estimateGlucoseImpact({serving: s, evidence: {gi: 50}}).gl, null, 'GI without a source is ignored');
  assert.strictEqual(E.estimateGlucoseImpact({serving: s, evidence: {gi: 70, source: 'x', mixed: true}}).gl, null);
  assert.strictEqual(E.estimateGlucoseImpact({serving: s, evidence: {gi: 70, source: 'International GI tables', mixed: true}}).gl, null, 'mixed foods never take one ingredient GI');
  const hi = E.estimateGlucoseImpact({serving: s, evidence: {gi: 80, source: 'International GI tables 2021'}});
  assert.deepStrictEqual([hi.gl.value, hi.gl.key, hi.category, hi.basis], [22.4, 'higher', 'Higher', 'carb-exposure+glycemic-load']);
  assert.ok(hi.reasons.includes('gl_higher'));
  const lo = E.estimateGlucoseImpact({serving: s, evidence: {gi: 20, source: 'International GI tables 2021'}});
  assert.deepStrictEqual([lo.gl.value, lo.gl.key, lo.category], [5.6, 'lower', 'Moderate'], 'a low GL never lowers the carb exposure');
});

test('the engine never says "no spike": every result is an estimate category', () => {
  const outs = [impact(ULTJE, 'g', 30), impact({carbs: 0}, 'g', 100), impact({}, 'g', 30)];
  for (const o of outs) {
    assert.strictEqual(o.estimate, true);
    assert.ok(Object.values(E.CATEGORY).includes(o.category));
    assert.doesNotMatch(JSON.stringify(o), /no (blood sugar )?spike|keine?n? .*spitze|sin pico/i);
  }
  assert.notStrictEqual(impact(ULTJE, 'g', 30).key, 'lower', 'Ultje at 30 g is never the lowest category');
});
