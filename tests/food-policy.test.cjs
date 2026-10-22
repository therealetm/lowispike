// scanfe-d (Oct 22, 2026): JA / SELTEN / NEIN policy (food-policy-core.js + data/food-policy/lowispike-policy.v1.json).
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const root = path.join(__dirname, '..');
const P = require(path.join(root, 'food-policy-core.js'));
const E = require(path.join(root, 'food-engine-core.js'));
const JSON_POLICY = JSON.parse(fs.readFileSync(path.join(root, 'data/food-policy/lowispike-policy.v1.json'), 'utf8'));
const scan = (p, g, ctx) => E.scanFood(p, g, ctx);

test('the policy in food-policy-core.js is the versioned JSON file (run scripts/sync-policy.cjs after edits)', () => {
  assert.deepStrictEqual(P.POLICY, JSON_POLICY);
  assert.strictEqual(P.VERSION, 'lowispike-policy.v1');
  assert.deepStrictEqual(JSON_POLICY.priority.slice(0, 5), ['safety', 'medical', 'policy', 'quality', 'glucose']);
  for (const r of JSON_POLICY.rules) {
    assert.ok(r.id && r.stage && JSON_POLICY.priority.includes(r.stage), r.id + ' stage');
    assert.ok(r.verdict === null || ['JA', 'SELTEN', 'NEIN'].includes(r.verdict), r.id + ' verdict');
    assert.ok(r.when && r.why, r.id + ' documented');
  }
  for (const k of Object.keys(JSON_POLICY.categories)) assert.doesNotThrow(() => new RegExp(JSON_POLICY.categories[k].name, 'i'), k);
});

test('section 8 JA list', () => {
  const yes = [
    [{name: 'Bio Eier Freiland', per100: {carbs: 0.7, sugar: 0.7, protein: 13, fat: 10}}, 60],
    [{name: 'Putenbrustfilet', per100: {carbs: 0, sugar: 0, protein: 24, fat: 1}}, 150],
    [{name: 'Lachsfilet', per100: {carbs: 0, sugar: 0, protein: 20, fat: 13}}, 125],
    [{name: 'Brokkoli', per100: {carbs: 2.7, sugar: 1.7, fibre: 3, protein: 3, fat: 0.4}}, 200],
    [{name: 'Magerquark', ingredients: 'Magermilch, Milchsäurebakterien', per100: {carbs: 4, sugar: 4, protein: 12, fat: 0.3}}, 150],
    [{name: 'Mineralwasser still', unit: 'ml', ingredients: 'Natürliches Mineralwasser', per100: {carbs: 0, sugar: 0}}, 500],
    [{name: 'Natives Olivenöl extra', per100: {carbs: 0, sugar: 0, fat: 100}}, 10]
  ];
  for (const [p, g] of yes) assert.strictEqual(scan(p, g).verdict, 'JA', p.name + ' ' + scan(p, g).policy.decidedBy);
});

test('section 8 NEIN list: sugar drinks, juice, zero drinks, sweets, staples, chips, sweet sauces, coated nuts, pork, alcohol', () => {
  const no = [
    [{name: 'Eistee Pfirsich', unit: 'ml', ingredients: 'Wasser, Zucker, Pfirsichsaft, Teeextrakt', per100: {carbs: 7, sugar: 7}}, 330],
    [{name: 'Apfelsaft naturtrüb', unit: 'ml', ingredients: 'Apfelsaft', per100: {carbs: 10, sugar: 10}}, 200],
    [{name: 'Pepsi Max', unit: 'ml', ingredients: 'Wasser, Kohlensäure, Süßungsmittel (Aspartam, Acesulfam K)', per100: {carbs: 0, sugar: 0}}, 330],
    [{name: 'Gummibären', ingredients: 'Glukosesirup, Zucker, Gelatine', per100: {carbs: 77, sugar: 46}}, 25],
    [{name: 'Weizenbrötchen', ingredients: 'Weizenmehl, Wasser, Hefe, Salz', per100: {carbs: 50, sugar: 2}}, 60],
    [{name: 'Speisekartoffeln', per100: {carbs: 15, sugar: 0.8}}, 200],
    [{name: 'Paprika Chips', ingredients: 'Kartoffeln, Sonnenblumenöl, Paprikapulver, Salz', per100: {carbs: 50, sugar: 2}}, 30],
    [{name: 'Tomaten Ketchup', ingredients: 'Tomatenmark, Zucker, Branntweinessig, Salz', per100: {carbs: 24, sugar: 22}}, 15],
    [{name: 'Schoko Mandeln', ingredients: 'Mandeln, Zartbitterschokolade (Zucker, Kakaomasse)', per100: {carbs: 25, sugar: 20}}, 30],
    [{name: 'Schweinenacken', per100: {carbs: 0, sugar: 0}}, 150],
    [{name: 'Pils Bier', unit: 'ml', per100: {carbs: 3, sugar: 0}}, 500],
    [{name: 'Protein Pudding Schoko', ingredients: 'Milch, Milcheiweiß, Kakao, Süßungsmittel (Sucralose)', per100: {carbs: 4, sugar: 3, protein: 10}}, 200]
  ];
  for (const [p, g] of no) { const o = scan(p, g); assert.strictEqual(o.verdict, 'NEIN', p.name + ' -> ' + o.verdict + ' ' + o.policy.decidedBy); }
});

test('SELTEN: large nut and cheese portions, legumes, sweet potato, processed protein, incomplete ingredients', () => {
  const nuts = {name: 'Mandeln naturbelassen', ingredients: 'Mandeln', per100: {carbs: 5.7, sugar: 4.4, fat: 52, protein: 24}};
  assert.strictEqual(scan(nuts, 30).verdict, 'JA');
  assert.strictEqual(scan(nuts, 80).verdict, 'SELTEN');
  assert.strictEqual(scan(nuts, 80).policy.decidedBy, 'policy.nuts_large');
  const gouda = {name: 'Gouda jung', ingredients: 'Milch, Salz, Lab, Milchsäurebakterien', per100: {carbs: 0, sugar: 0, fat: 29}};
  assert.strictEqual(scan(gouda, 25).verdict, 'JA');
  assert.strictEqual(scan(gouda, 100).verdict, 'SELTEN');
  assert.strictEqual(scan({name: 'Rote Linsen', ingredients: 'Rote Linsen', per100: {carbs: 9, sugar: 1}}, 80).verdict, 'SELTEN');
  assert.strictEqual(scan({name: 'Süßkartoffeln', per100: {carbs: 17, sugar: 4}}, 150).verdict, 'SELTEN');
  const bar = scan({name: 'Protein Crisp Bar', ingredients: 'Milchproteinisolat, Sojaprotein, Kakaobutter, Erythrit', per100: {carbs: 6, sugar: 2, protein: 35}}, 45);
  assert.strictEqual(bar.verdict, 'SELTEN', 'protein never makes a product green');
  const unknown = scan({name: 'Naturjoghurt', per100: {carbs: 4, sugar: 4}}, 150);
  assert.strictEqual(unknown.verdict, 'SELTEN', 'plain yoghurt without an ingredient list is provisional, never assumed clean');
  assert.strictEqual(unknown.policy.provisional, true);
});

test('priority: safety and policy NEIN cannot be lifted; claims and protein change nothing', () => {
  const yog = {name: 'Naturjoghurt', ingredients: 'Joghurt', per100: {carbs: 4, sugar: 4, protein: 4, fat: 3.5}};
  assert.strictEqual(scan(yog, 150).verdict, 'JA');
  const allergic = scan(yog, 150, {profile: {allergies: ['milk']}});
  assert.strictEqual(allergic.verdict, 'NEIN');
  assert.strictEqual(allergic.policy.decidedBy, 'safety.allergen');
  assert.strictEqual(allergic.policy.stage, 'safety');
  const unknownAllergens = scan({name: 'Bunter Snack', per100: {carbs: 10, sugar: 1}}, 30, {profile: {allergies: ['peanuts']}});
  assert.notStrictEqual(unknownAllergens.verdict, 'JA');
  assert.ok(unknownAllergens.policy.rules.some(r => r.id === 'safety.allergen_unknown'));
  const avoided = scan({name: 'Bio Eier', per100: {carbs: 1, sugar: 1}}, 60, {profile: {avoid: ['eggs']}});
  assert.strictEqual(avoided.verdict, 'NEIN');
  assert.strictEqual(avoided.policy.decidedBy, 'medical.avoid');
  const claimed = scan({name: 'Keto Low Carb High Protein Bio Brot', ingredients: 'Eiweiß, Leinsamen, Mandelmehl, Weizengluten', per100: {carbs: 4, sugar: 1, protein: 30}}, 50);
  assert.strictEqual(claimed.verdict, 'NEIN', 'bread stays a staple whatever the pack claims');
  assert.ok(claimed.policy.claimsIgnored.includes('keto') && claimed.policy.claimsIgnored.includes('low_carb'));
  assert.ok(claimed.claims.every(c => c.approves === false));
});

test('no JA rule means at best SELTEN; Higher impact or sweeteners never stay JA', () => {
  const plain = scan({name: 'Reiswaffeln', ingredients: 'Vollkornreis', per100: {carbs: 80, sugar: 0.5}}, 30);
  assert.strictEqual(plain.verdict, 'NEIN');
  const odd = scan({name: 'Kokosraspeln', ingredients: 'Kokosnuss', per100: {carbs: 7, sugar: 7, fat: 65}}, 20);
  assert.strictEqual(odd.verdict, 'SELTEN');
  assert.strictEqual(odd.policy.decidedBy, 'default.no_rule');
  const sweetQuark = scan({name: 'Magerquark Vanille', ingredients: 'Magerquark, Aroma, Süßungsmittel (Sucralose)', per100: {carbs: 4, sugar: 4, protein: 12}}, 150);
  assert.strictEqual(sweetQuark.verdict, 'SELTEN');
});

test('every result names the policy version and the rule that decided it', () => {
  const o = scan({name: 'Coca-Cola', unit: 'ml', ingredients: 'Wasser, Zucker, Kohlensäure', per100: {carbs: 10.6, sugar: 10.6}}, 330);
  assert.strictEqual(o.policyVersion, 'lowispike-policy.v1');
  assert.strictEqual(o.verdict, 'NEIN');
  assert.strictEqual(o.policy.decidedBy, 'policy.sugar_drink');
  assert.ok(o.policy.rules.length >= 2);
  assert.strictEqual(o.glucose.category, 'Higher');
  assert.strictEqual(o.confidence, null, 'confidence comes with scanfe-f1');
});
