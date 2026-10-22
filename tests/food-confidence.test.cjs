// Food Intelligence Engine confidence (queue step scanfe-f1, spec queue/FOOD-ENGINE-SPEC.md section 10).
// Confidence is evidence completeness only: identity, current ingredients, nutrition label, consistency, variant.
// It never says anything about the person's glucose response and never fills a gap.
const test = require('node:test');
const assert = require('assert');
const E = require('../food-engine-core.js');
const S = require('../spike-core.js');

const COLA = {name: 'Coca-Cola', barcode: '5449000267412', unit: 'ml', ingredients: 'Wasser, Zucker, Kohlensäure, Farbstoff E150d',
  per100: {carbs: 10.6, sugar: 10.6, fibre: 0, protein: 0, fat: 0, kcal: 42, salt: 0}};
const scan = (p, g, ctx) => E.scanFood(p, g == null ? 250 : g, ctx);
const withP = over => Object.assign({}, COLA, over);

test('assessConfidence is exported, versioned and uses the High / Medium / Low vocabulary', () => {
  assert.strictEqual(typeof E.assessConfidence, 'function');
  assert.strictEqual(E.CONFIDENCE.version, 'confidence-v1');
  const o = scan(COLA);
  assert.strictEqual(o.confidence, 'High');
  assert.strictEqual(o.confidenceInfo.basis, 'evidence-completeness');
  assert.deepStrictEqual(o.confidenceInfo.reasons, []);
  assert.deepStrictEqual(o.confidenceInfo.needs, []);
  for (const l of ['en', 'de', 'es']) assert.ok(o.confidenceInfo.text[l].length > 5, 'level text ' + l);
});

test('identity: no barcode, a misread barcode, no name or an uncertain match is Low', () => {
  for (const [over, why] of [[{barcode: null}, 'identity_unverified'], [{barcode: '12ab'}, 'identity_unverified'],
    [{barcode: '5449000267413'}, 'barcode_invalid'], [{name: ''}, 'name_missing'], [{identity: 'uncertain'}, 'identity_uncertain']]) {
    const o = scan(withP(over));
    assert.strictEqual(o.confidence, 'Low', JSON.stringify(over));
    assert.ok(o.confidenceInfo.reasons.includes(why), why);
  }
  assert.strictEqual(scan(withP({barcode: '5449 0002 6741 2'})).confidence, 'High', 'spaces in a barcode are fine');
  assert.strictEqual(scan(withP({barcode: '22161246'})).confidence, 'High', 'EAN-8 with a valid check digit');
});

test('variant or source conflicts and old data are at most Medium', () => {
  for (const [over, why] of [[{variantConfirmed: false}, 'variant_unconfirmed'], [{conflicts: ['kcal differs between sources']}, 'sources_conflict'],
    [{evidence: {updated: '2019-01-01'}}, 'data_old']]) {
    const o = scan(withP(over), 250, {now: Date.parse('2026-10-22')});
    assert.strictEqual(o.confidence, 'Medium', why);
    assert.ok(o.confidenceInfo.reasons.includes(why));
  }
  assert.strictEqual(scan(withP({evidence: {updated: '2025-06-01'}}), 250, {now: Date.parse('2026-10-22')}).confidence, 'High');
});

test('nutrition: inconsistent label or unknown carbs is Low, a missing nutrient or a kcal warning is Medium', () => {
  let o = scan(withP({per100: {carbs: 10, sugar: 20, protein: 0, fat: 0, kcal: 40}}));
  assert.strictEqual(o.confidence, 'Low');
  assert.ok(o.confidenceInfo.reasons.includes('label_inconsistent'));
  assert.ok(o.confidenceInfo.needs.includes('label_photo'));
  o = scan(withP({per100: {sugar: 10, protein: 0, fat: 0, kcal: 42}}));
  assert.strictEqual(o.confidence, 'Low');
  assert.ok(o.confidenceInfo.reasons.includes('carbs_missing'));
  o = scan(withP({per100: {carbs: 10.6, sugar: 10.6, protein: 0, fat: 0}}));
  assert.strictEqual(o.confidence, 'Medium');
  assert.ok(o.confidenceInfo.reasons.includes('nutrition_partial'));
  o = scan(withP({unit: 'g', per100: {carbs: 14.6, sugar: 10.8, protein: 2.7, fat: 8.8, kcal: 100}}), 125);
  assert.strictEqual(o.confidence, 'Medium');
  assert.ok(o.confidenceInfo.reasons.includes('label_warning'));
  assert.strictEqual(scan(withP({per100: Object.assign({}, COLA.per100, {fibre: null, salt: null})})).confidence, 'High', 'fibre and salt are optional');
});

test('ingredients: missing, unreadable, cut off or garbled lists are never High and ask for a photo', () => {
  for (const [ing, why] of [[null, 'ingredients_missing'], ['', 'ingredients_missing'], ['Wasser, Zucker (Rohr', 'ingredients_cut_off'],
    ['Zucker, Konservierungsstoff 5Schwefel-Dioxid), Honig', 'ingredients_garbled'], ['Wasser, Zucker, Aroma...', 'ingredients_cut_off']]) {
    const o = scan(withP({ingredients: ing}));
    assert.strictEqual(o.confidence, 'Medium', String(ing));
    assert.ok(o.confidenceInfo.reasons.includes(why), why + ' for ' + ing);
    assert.ok(o.confidenceInfo.needs.includes('ingredients_photo'));
  }
});

test('the strictest problem wins, and every reason has EN / DE / ES text', () => {
  const o = scan(withP({barcode: null, ingredients: null, per100: {carbs: 10.6, sugar: 10.6}}));
  assert.strictEqual(o.confidence, 'Low');
  assert.deepStrictEqual(o.confidenceInfo.reasons, ['identity_unverified', 'nutrition_partial', 'ingredients_missing']);
  for (const r of o.confidenceInfo.reasonText) for (const l of ['en', 'de', 'es']) assert.ok(r[l] && r[l].length > 5, r.key + ' ' + l);
});

test('confidence never depends on the person or changes the verdict', () => {
  const a = scan(COLA), b = scan(COLA, 250, {profile: {triggers: ['sugar_drink'], allergies: ['milk']}});
  assert.strictEqual(a.confidence, b.confidence);
  const noBarcode = scan(withP({barcode: null}));
  assert.strictEqual(noBarcode.verdict, a.verdict, 'low confidence does not move JA / SELTEN / NEIN');
  assert.strictEqual(noBarcode.glucose.category, a.glucose.category);
});

test('Ultje Suess & Salzig from the handoff (no barcode, no ingredients) is Low, never High', () => {
  const o = scan({name: 'Ültje Süß & Salzig', unit: 'g', per100: {carbs: 36, sugar: 29, fibre: 5.5, protein: 15, fat: 38, kcal: 555}}, 30);
  assert.strictEqual(o.confidence, 'Low');
  assert.ok(o.confidenceInfo.needs.includes('ingredients_photo'));
});

test('the scanner adapter (LowiSpikeCore) carries confidence without changing the card verdict', () => {
  const cola = S.assess({barcode: '5449000267412', name: 'Cola', cat: 'drink', facts: {c: 10.6, s: 10.6, p: 0, fat: 0, kcal: 42, drink: 1}, ingredients: 'Wasser, Zucker, Kohlensäure'});
  assert.strictEqual(cola.verdict, 'spike');
  assert.strictEqual(cola.engine.confidence, 'High');
  const ultje = S.assess({name: 'Ultje', cat: 'snack', facts: {c: 36, s: 29, f: 5.5, p: 15, fat: 38}, ingredients: ''});
  assert.strictEqual(ultje.verdict, 'better');
  assert.strictEqual(ultje.engine.confidence, 'Low');
  assert.ok(!Object.keys(cola).includes('engine'), 'engine stays non-enumerable');
});
