// Master Knowledge v3 (Oct 23): one verdict for one food on every surface, and the verdict block the app reads.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const P = require(path.join(root, 'food-policy-core.js'));
const K = require(path.join(root, 'food-knowledge-core.js'));
const E = require(path.join(root, 'food-engine-core.js'));
const MR = require(path.join(root, 'meal-result.js'));
const FOODS = JSON.parse(fs.readFileSync(path.join(root, 'data/food-policy/everyday-foods.v1.json'), 'utf8')).foods;
const MASTER = fs.readFileSync(path.join(root, 'data/food-policy/master-knowledge.v3.md'), 'utf8');

test('every everyday food gets its listed verdict by name, in English, German and Spanish', () => {
  assert.ok(FOODS.length >= 140);
  for (const f of FOODS) for (const l of ['en', 'de', 'es']) {
    assert.strictEqual(P.rateName(f[l]).verdict, f.verdict, l + ': ' + f[l]);
    assert.strictEqual(K.rateFood(f[l]).verdict, f.verdict, 'knowledge ' + l + ': ' + f[l]);
  }
});

test('the foods the owner asked about are filled in with the same logic', () => {
  const want = {Tomatoes: 'JA', Onions: 'JA', Carrots: 'JA', Blueberries: 'JA', Butter: 'JA', Lamb: 'JA', Walnuts: 'JA',
    Hazelnuts: 'JA', Cashews: 'JA', Shrimp: 'JA', Apple: 'SELTEN', Grapes: 'NEIN', Couscous: 'NEIN', Pizza: 'NEIN'};
  for (const [n, v] of Object.entries(want)) assert.strictEqual(P.rateName(n).verdict, v, n);
  assert.strictEqual(P.rateName('Blueberries', 200).verdict, 'SELTEN', 'a bowl of berries is more than a handful');
  assert.strictEqual(P.rateName('Walnuts', 80).verdict, 'SELTEN', 'a big portion of nuts');
  assert.strictEqual(P.rateName('Gouda', 100).verdict, 'SELTEN', 'a big portion of cheese');
  assert.strictEqual(P.rateName('Cottage cheese', 200).verdict, 'JA', 'fresh cheese is never the cheese limit');
});

test('the app food list in index.html and the engine agree on every food the engine knows', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const M = {ja: 'JA', selten: 'SELTEN', nein: 'NEIN'};
  const rx = /\{id:"([^"]+)", n:"([^"]+)", g:"[^"]+", r:"(ja|selten|nein)"/g;
  let m, n = 0;
  while ((m = rx.exec(html))) {
    const got = P.rateName(m[2]).verdict;
    if (got) { n++; assert.strictEqual(got, M[m[3]], m[1] + ' ' + m[2]); }
  }
  assert.ok(n >= 30, 'checked ' + n);
});

test('vegetable swaps, breaded food, turkey ham and fruit yoghurt are read the way the Master Knowledge says', () => {
  assert.strictEqual(P.rateName('Cauliflower rice').verdict, 'JA');
  assert.strictEqual(P.rateName('Konjac noodles with shrimp').verdict, 'JA');
  assert.strictEqual(P.rateName('Zucchini noodles').verdict, 'JA');
  assert.strictEqual(P.rateName('Chicken nuggets').verdict, 'NEIN');
  assert.strictEqual(P.rateName('Fried chicken').verdict, 'NEIN');
  assert.strictEqual(P.rateName('Putenschinken').verdict, 'SELTEN');
  assert.strictEqual(P.rateName('Schinken').verdict, 'NEIN');
  assert.strictEqual(P.rateName('Erdbeerjoghurt').verdict, 'NEIN');
  assert.strictEqual(P.rateName('Burger patty').verdict, 'JA');
  assert.strictEqual(P.rateName('Burger').verdict, 'NEIN');
  assert.strictEqual(P.rateName('Grüne Bohnen').verdict, 'JA');
  assert.strictEqual(P.rateName('Latte macchiato').verdict, 'JA');
  assert.strictEqual(P.rateName('Kokosmilch').rules[0], 'ja.whole_food_fat');
  assert.strictEqual(P.rateName('xyzzy').verdict, null);
});

test('a labelled product gets the same verdict as its name', () => {
  const quinoa = {name: 'Bio Quinoa', ingredients: 'Quinoa', per100: {carbs: 57, sugar: 3, fat: 6, protein: 14, fiber: 7}};
  assert.strictEqual(E.scanFood(quinoa, 60).verdict, 'NEIN');
  const oats = {name: 'Haferflocken zart', ingredients: 'Haferflocken', per100: {carbs: 59, sugar: 1, fat: 7, protein: 13, fiber: 10}};
  assert.strictEqual(E.scanFood(oats, 50).verdict, 'NEIN');
  const cottage = {name: 'Körniger Frischkäse', ingredients: 'Milch, Speisesalz, Säuerungskultur', per100: {carbs: 3, sugar: 3, fat: 4, protein: 12}};
  assert.strictEqual(E.scanFood(cottage, 200).verdict, 'JA');
  const banana = {name: 'Bananen', ingredients: 'Bananen', per100: {carbs: 20, sugar: 17, fat: 0.2, protein: 1.2, fiber: 2}};
  assert.strictEqual(E.scanFood(banana, 120).verdict, 'NEIN');
  const nuggets = {name: 'Chicken Nuggets', ingredients: 'Hähnchenfleisch, Weizenmehl, Wasser, Rapsöl, Salz', per100: {carbs: 16, sugar: 1, fat: 12, protein: 15}};
  assert.strictEqual(E.scanFood(nuggets, 100).verdict, 'NEIN');
});

test('a photo meal: strictest part wins, blood sugar can only tighten, unknown carbs stay provisional', () => {
  const m1 = K.rateMeal([{name: 'Grilled chicken breast', carbs: 0}, {name: 'Broccoli', carbs: 6}], {level: 'low', score: 10});
  assert.strictEqual(m1.verdict, 'JA'); assert.strictEqual(m1.light, 'green');
  const m2 = K.rateMeal([{name: 'Salmon', carbs: 0}, {name: 'Rice', carbs: 45}], {level: 'high'});
  assert.strictEqual(m2.verdict, 'NEIN'); assert.strictEqual(m2.rule, 'policy.starch_staple');
  const m3 = K.rateMeal([{name: 'Lentil soup', carbs: 25}], {level: 'mid'});
  assert.strictEqual(m3.verdict, 'SELTEN');
  const m4 = K.rateMeal([{name: 'Mystery stew', carbs: 30}], {level: 'mid'});
  assert.strictEqual(m4.verdict, 'SELTEN');
  const m5 = K.rateMeal([{name: 'Grilled chicken', carbs: 0}, {name: 'Mystery side', carbs: 20}], {level: 'low'});
  assert.strictEqual(m5.verdict, 'SELTEN'); assert.ok(m5.provisional);
  const m6 = K.rateMeal([{name: 'Eggs', count: 3, carbs: 1}, {name: 'Avocado', carbs: 2}], {level: 'low'});
  assert.strictEqual(m6.verdict, 'JA'); assert.deepStrictEqual(m6.dishes.map(d => d.count), [3, 1]);
  assert.strictEqual(K.rateMeal([{name: 'Walnuts', portion: 'about 100 g'}], {level: 'low'}).verdict, 'SELTEN');
});

test('the verdict block: written, read back, and rejected when malformed or contradictory', () => {
  const meal = K.rateMeal([{name: 'Eggs', count: 2}, {name: 'Spinach'}], {level: 'low', score: 8});
  const text = 'Two eggs with spinach. ' + K.format(K.block(meal, 'high'));
  const b = K.parse(text);
  assert.deepStrictEqual(b, {v: 1, verdict: 'JA', light: 'green', score: 8, spike: 'low', counted: [{item: 'Eggs', count: 2}, {item: 'Spinach', count: 1}], confidence: 'high'});
  assert.strictEqual(K.parse('```lowispike\n{"light":"red","verdict":"NEIN","score":80}\n```').verdict, 'NEIN');
  assert.strictEqual(K.parse({light: 'yellow'}).verdict, 'SELTEN');
  assert.strictEqual(K.parse('<lowispike>{"light":"green","verdict":"NEIN"}</lowispike>'), null, 'light and verdict disagree');
  assert.strictEqual(K.parse('<lowispike>{bad json}</lowispike>'), null);
  assert.strictEqual(K.parse('<lowispike>{"verdict":"JA","score":150}</lowispike>'), null);
  assert.strictEqual(K.parse('<lowispike>{"verdict":"JA","counted":[{"item":"egg","count":0}]}</lowispike>'), null);
  assert.strictEqual(K.parse('<lowispike>{"verdict":"MAYBE"}</lowispike>'), null);
  assert.strictEqual(K.parse('no block here'), null);
  assert.strictEqual(K.parse({verdict: 'JA'}).confidence, 'low', 'missing confidence is never upgraded');
});

test('anti-cheat: the model block can tighten the app verdict but never loosen it', () => {
  const local = K.rateMeal([{name: 'Rice', carbs: 50}], {level: 'high'});
  const loose = K.merge(K.parse({verdict: 'JA', light: 'green'}), local);
  assert.strictEqual(loose.verdict, 'NEIN'); assert.strictEqual(loose.overruled, true); assert.strictEqual(loose.source, 'app');
  const clean = K.rateMeal([{name: 'Chicken breast'}, {name: 'Salad'}], {level: 'low'});
  const tight = K.merge(K.parse({verdict: 'SELTEN'}), clean);
  assert.strictEqual(tight.verdict, 'SELTEN'); assert.strictEqual(tight.source, 'model');
  assert.strictEqual(K.merge(null, clean).verdict, 'JA');
});

test('labels in every app language: the three tiers Everyday / Small portion / Skip it, no frequency (24 Oct 2026)', () => {
  assert.deepStrictEqual(K.LABELS.de, {JA: 'ALLTAG', SELTEN: 'KLEINE PORTION', NEIN: 'LIEBER NICHT'});
  assert.strictEqual(K.label('JA', 'en'), 'EVERYDAY'); assert.strictEqual(K.label('SELTEN', 'es'), 'PORCIÓN PEQUEÑA'); assert.strictEqual(K.label('NEIN', 'es-ES'), 'MEJOR NO');
  assert.strictEqual(K.lightWord('red', 'de'), 'ROT');
  for (const id of Object.keys(P.POLICY.rules.reduce((o, r) => (o[r.id] = 1, o), {}))) {
    if (!/^(policy|ja)\./.test(id) || /incomplete|unclear|wholegrain_bread/.test(id)) continue;
    if (!K.reasonText(id, 'en')) continue;
    for (const l of ['en', 'de', 'es']) assert.ok(K.reasonText(id, l), id + ' ' + l);
  }
  for (const id of ['policy.starch_grain', 'policy.sweet_fruit', 'policy.breaded', 'policy.sugar', 'ja.berries_small', 'ja.milk', 'glucose.high', 'unknown'])
    for (const l of ['en', 'de', 'es']) assert.ok(K.reasonText(id, l), id + ' ' + l);
});

test('meal result: a NEIN meal earns no XP but keeps an honest spike line; the block reaches the verdict', () => {
  const pork = MR.verdict([{name: 'Pork chop', carbs: 0, protein: 30, fat: 15}, {name: 'Green salad', carbs: 4, fiber: 2}], []);
  assert.strictEqual(pork.level, 'low'); assert.strictEqual(pork.spike, false);
  assert.strictEqual(pork.nein, true); assert.strictEqual(pork.lvl, 'high'); assert.strictEqual(pork.food.rule, 'policy.pork');
  const fish = MR.verdict([{name: 'Salmon', carbs: 0}, {name: 'Asparagus', carbs: 4, fiber: 2}], [], {verdict: 'JA', light: 'green'});
  assert.strictEqual(fish.nein, false); assert.strictEqual(fish.food.verdict, 'JA'); assert.strictEqual(fish.lvl, 'low');
  const cheat = MR.verdict([{name: 'Rice', carbs: 20, fiber: 1}], [], {verdict: 'JA', light: 'green'});
  assert.strictEqual(cheat.food.verdict, 'NEIN'); assert.strictEqual(cheat.food.overruled, true); assert.strictEqual(cheat.lvl, 'high');
});

test('the Master Knowledge v3 file is written for the in-app scanner and keeps the owner logic', () => {
  assert.ok(!/Custom GPT|ChatGPT|GPT Builder|knowledge file upload/i.test(MASTER), 'no GPT platform wording');
  assert.ok(!/^\s*[-*]\s*\*{4}\s*$/m.test(MASTER), 'no empty **** bullets');
  for (const w of ['JA', 'SELTEN', 'NEIN', 'YES', 'RARELY', 'A VECES', 'GREEN', 'YELLOW', 'RED', '<lowispike>', 'Count first', 'Oma', 'health halo'])
    assert.ok(MASTER.toLowerCase().includes(w.toLowerCase()), w);
  const m = MASTER.match(/<lowispike>[\s\S]*?<\/lowispike>/);
  assert.ok(m && K.parse(m[0]), 'the example block in the prompt parses');
});

test('the photo function asks for counts, a verdict per part and the verdict block', () => {
  const src = fs.readFileSync(path.join(root, 'supabase/functions/food-photo/index.ts'), 'utf8');
  assert.ok(/COUNT FIRST/.test(src) && /lowispike: \{/.test(src) && /verdict: VERDICT/.test(src));
  assert.ok(/"count", "grams"/.test(src));
});
