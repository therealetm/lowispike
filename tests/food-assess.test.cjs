// scanfe-e: food quality, cravings + satiety, short reasons (EN/DE/ES) and the better alternative.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const A = require('../food-assess-core.js');
const E = require('../food-engine-core.js');
const bench = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/food-bench/benchmark.v1.json'), 'utf8'));
const rows = bench.rows;
const scanRow = (r, ctx) => E.scanFood({name: r.name, barcode: r.barcode, unit: r.unit, per100: r.per100, ingredients: r.ingredients, categories: r.categories || []}, r.serving.g, ctx);
const row = id => rows.find(r => r.id === id);
const LANGS = ['en', 'de', 'es'];

test('assess: every benchmark row produces its expected reason keys', () => {
  for (const r of rows) {
    const out = scanRow(r);
    for (const k of r.expect.reasons) assert.ok(out.reasonKeys.includes(k), r.id + ': reason ' + k + ' (got ' + out.reasonKeys.join(', ') + ')');
  }
});

test('assess: Ultje Suess & Salzig reads like the spec example, with a plain-almond alternative', () => {
  const out = scanRow(row('ultje-suess-salzig'));
  assert.strictEqual(out.verdict, 'NEIN');
  assert.deepStrictEqual(out.reasons.map(r => r.key), ['sugar_29_per_100', 'fat_protein_do_not_cancel_carbs', 'sweet_salty_repeat_snacking']);
  assert.strictEqual(out.reasons[0].text.en, '29 g sugar per 100 g');
  assert.strictEqual(out.reasons[0].text.de, '29 g Zucker pro 100 g');
  assert.strictEqual(out.alternative.key, 'sweet_nut_snack');
  assert.deepStrictEqual(out.alternative.portionG, [25, 30]);
  assert.match(out.alternative.text.en, /25\u201330 g plain roasted almonds/);
  assert.deepStrictEqual(out.alternative.products, [], 'no invented products');
  assert.strictEqual(out.quality.key, 'poor');
  assert.strictEqual(out.cravings.key, 'higher');
});

test('assess: shown reasons are 1-3, translated, and at least 2 whenever 2 apply', () => {
  for (const r of rows) {
    const out = scanRow(r);
    assert.ok(out.reasons.length >= 1 && out.reasons.length <= 3, r.id + ': 1-3 shown');
    if (out.reasonKeys.length >= 2) assert.ok(out.reasons.length >= 2, r.id + ': at least 2 shown');
    for (const s of out.reasons) for (const l of LANGS) {
      assert.ok(s.text && typeof s.text[l] === 'string' && s.text[l].length > 2, r.id + ': ' + s.key + ' has ' + l);
      assert.ok(!/\{\d\}/.test(s.text[l]), r.id + ': ' + s.key + ' placeholders filled');
    }
    assert.strictEqual(new Set(out.reasons.map(s => s.key)).size, out.reasons.length, r.id + ': no repeated reason');
  }
});

test('assess: every NEIN and SELTEN has a better alternative in three languages; JA has none', () => {
  for (const r of rows) {
    const out = scanRow(r);
    if (out.verdict === 'JA') { assert.strictEqual(out.alternative, null, r.id + ': JA needs no alternative'); continue; }
    assert.ok(out.alternative && A.ALT[out.alternative.key], r.id + ': alternative');
    for (const l of LANGS) assert.ok(out.alternative.text[l].length > 5, r.id + ': alternative ' + l);
  }
  assert.strictEqual(scanRow(row('cocacola-original')).alternative.key, 'sparkling_water');
  assert.strictEqual(scanRow(row('pfanner-orangensaft')).alternative.key, 'whole_fruit');
  assert.strictEqual(scanRow(row('gg-basmati-reis')).alternative.key, 'cauli_rice');
  assert.strictEqual(scanRow(row('edeka-salami-sticks')).alternative.key, 'fresh_meat');
  assert.strictEqual(scanRow(row('ehrmann-high-protein-pudding')).alternative.key, 'plain_protein');
});

test('assess: quality is separate from glucose and never decided by carbohydrate alone', () => {
  for (const id of ['ultje-erdnuesse-ohne-salz', 'snackfun-mandeln-geroestet', 'milsani-naturjoghurt', 'meinemetzgerei-haehnchenbrust']) {
    assert.strictEqual(scanRow(row(id)).quality.key, 'good', id + ' is good quality');
  }
  const rice = scanRow(row('gg-basmati-reis'));
  assert.strictEqual(rice.glucose.key, 'higher');
  assert.notStrictEqual(rice.quality.key, 'poor', 'high carbs alone do not make plain rice poor quality');
  assert.strictEqual(scanRow(row('cocacola-zero')).quality.concerns.includes('liquid_sugar'), false, 'zero-sugar drink is not liquid sugar');
  const q = A.assessQuality({product: {name: 'x'}, per100: {}, ingredients: {status: 'missing'}, policy: {verdict: 'SELTEN', rules: [], categories: []}});
  assert.strictEqual(q.key, 'unknown', 'no ingredients and no evidence is unknown, not good');
});

test('assess: cravings and satiety are behavioural, separate from quality', () => {
  assert.strictEqual(scanRow(row('snackfun-mandeln-geroestet')).cravings.key, 'lower');
  assert.strictEqual(scanRow(row('feuergebrannte-mandeln')).cravings.key, 'higher');
  assert.strictEqual(scanRow(row('cocacola-original')).satiety, 'lower', 'liquid calories do not fill you up');
  assert.strictEqual(scanRow(row('meinemetzgerei-haehnchenbrust')).satiety, 'higher');
  const out = scanRow(row('ultje-suess-salzig'));
  assert.strictEqual(out.cravings.personal, false, 'nobody is assumed to have a trigger');
  assert.strictEqual(out.cravings.behavioural, true);
});

test('assess: a trigger the user reported makes the verdict one step stricter, never milder', () => {
  const yog = row('milsani-naturjoghurt');
  const plain = scanRow(yog);
  assert.strictEqual(plain.verdict, 'JA');
  const trig = scanRow(yog, {profile: {triggers: ['joghurt']}});
  assert.strictEqual(trig.verdict, 'SELTEN', 'JA -> SELTEN');
  assert.strictEqual(trig.policy.verdict, 'JA', 'policy keeps the rules-only verdict');
  assert.deepStrictEqual([trig.personal.from, trig.personal.verdict, trig.personal.rule], ['JA', 'SELTEN', 'cravings.trigger']);
  assert.strictEqual(trig.reasons[0].key, 'craving_trigger');
  assert.ok(trig.alternative, 'a personal SELTEN gets an alternative');
  const fy = row('gutbio-fruchtjoghurt-erdbeere');
  assert.strictEqual(scanRow(fy, {profile: {triggers: ['fruchtjoghurt']}}).verdict, 'NEIN', 'SELTEN -> NEIN');
  assert.strictEqual(scanRow(row('cocacola-original'), {profile: {triggers: ['coca']}}).verdict, 'NEIN', 'NEIN stays NEIN');
  assert.strictEqual(scanRow(yog, {profile: {triggers: ['chips']}}).verdict, 'JA', 'unrelated trigger changes nothing');
  assert.strictEqual(scanRow(yog, {profile: {triggers: ['a']}}).verdict, 'JA', 'one-letter triggers are ignored');
});

test('assess: text tables are complete and keep the card wording rules', () => {
  for (const [k, t] of Object.entries(A.TEXT)) {
    for (const l of LANGS) assert.ok(typeof t[l] === 'string' && t[l].length > 2, 'TEXT.' + k + '.' + l);
    assert.ok(A.ORDER.includes(k), k + ' has a place in ORDER');
    assert.ok(!/no (blood sugar )?spike|kein(en)? (blutzucker)?-?spike|sin pico/i.test(t.en + t.de + t.es), k + ' never promises no spike');
  }
  for (const [k, t] of Object.entries(A.ALT)) for (const l of LANGS) assert.ok(t[l] && t[l].length > 5, 'ALT.' + k + '.' + l);
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const at = f => html.search(new RegExp('<script src="' + f.replace('.', '\\.') + '\\?'));
  assert.ok(at('food-policy-core.js') > 0 && at('food-policy-core.js') < at('food-assess-core.js') && at('food-assess-core.js') < at('food-engine-core.js'), 'index.html loads food-assess-core.js between policy and engine');
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  assert.strictEqual((sw.match(/"food-policy-core\.js", "food-knowledge-core\.js", "food-assess-core\.js", "food-engine-core\.js"/g) || []).length, 2, 'both sw.js lists cache it');
});
