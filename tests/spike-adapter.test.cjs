// scanfe-b2 (Oct 22, 2026): LowiSpikeCore.assess is a thin adapter onto LowiFoodEngine (food-engine-core.js).
// Shape stays {verdict, why, score, est}; the engine result rides along as a non-enumerable `engine`.
// Higher -> spike, Moderate -> better, Lower -> ok (estimate wording), Insufficient evidence -> unknown.
// LOWiSPIKE ingredient rules can only make it stricter, never milder. The cards never say "no blood sugar spike".
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const S = require(path.join(root, 'spike-core.js'));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

test('return shape is unchanged and the engine result rides along', () => {
  const r = S.assess({facts: {c: 36, s: 29, f: 5.5, p: 15, fat: 38}});
  assert.deepStrictEqual(Object.keys(r).sort(), ['est', 'score', 'verdict', 'why']);
  assert.strictEqual(r.est, true);
  assert.ok(r.engine && r.engine.glucose && r.engine.serving, 'engine result attached');
  assert.strictEqual(r.engine.serving.g, 50, 'no manufacturer serving and no group -> 50 g (other)');
  assert.strictEqual(JSON.stringify(r).includes('engine'), false, 'engine is not stored with the dex row');
});

test('engine category maps to the verdict', () => {
  assert.strictEqual(S.assess({cat: 'dairy', facts: {c: 4, s: 4, p: 11, fat: 0.2}}).verdict, 'ok');
  assert.strictEqual(S.assess({facts: {c: 36, s: 29}}).verdict, 'better');
  assert.strictEqual(S.assess({facts: {c: 77, s: 0.5}}).verdict, 'spike');
  assert.strictEqual(S.assess({facts: {c: 10, s: 20}}).verdict, 'unknown', 'sugar above carbs is an inconsistent label');
  assert.strictEqual(S.assess({facts: {p: 10, fat: 5}}).verdict, 'unknown', 'no carb numbers');
});

test('the manufacturer serving wins over the group portion', () => {
  const r = S.assess({cat: 'snack', facts: {c: 60, s: 2, sv: 10}});
  assert.strictEqual(r.engine.serving.g, 10);
  assert.strictEqual(r.engine.serving.source, 'manufacturer');
  assert.strictEqual(r.verdict, 'ok');
});

test('protein, fat and fibre never lower the category', () => {
  const lean = S.assess({facts: {c: 30, s: 1}}), rich = S.assess({facts: {c: 30, s: 1, f: 10, p: 20, fat: 30}});
  assert.strictEqual(lean.verdict, rich.verdict);
  assert.ok(rich.why.some(w => w[0] === 'e_slow'), 'modifier is explained, not used to downgrade');
});

test('LOWiSPIKE ingredient rules only make it stricter', () => {
  assert.strictEqual(S.assess({cat: 'drink', facts: {c: 0, s: 0, drink: 1}, ingredients: 'Wasser, Süßstoffe (Aspartam)'}).verdict, 'spike');
  assert.strictEqual(S.assess({facts: {c: 14, s: 13}, ingredients: 'Joghurt, Zucker, Erdbeeren'}).verdict, 'better', 'added sugar up front: Lower -> Moderate');
  assert.strictEqual(S.assess({cat: 'sweets', facts: {c: 19, s: 14, f: 12, p: 10, fat: 46}, ingredients: 'Kakaomasse, Kakaobutter, Zucker'}).verdict, 'ok', 'under 5 g sugar in the serving: no step up');
  assert.strictEqual(S.assess({facts: {c: 49, s: 4}, ingredients: 'Weizenmehl, Wasser, Hefe'}).verdict, 'spike', 'refined starch up front: Moderate -> Higher');
  assert.strictEqual(S.assess({cat: 'drink', facts: {c: 10, s: 10, drink: 1}}).verdict, 'spike', 'liquid sugar');
  assert.strictEqual(S.assess({facts: {c: 58.7, s: 0.7, f: 10}, ingredients: 'Vollkorn-Haferflocken'}).verdict, 'better', 'whole grain is not lowered to ok');
});

test('ingredients without numbers: refined or sugar up front -> spike, otherwise not enough data', () => {
  assert.strictEqual(S.assess({ingredients: 'Weizenmehl, Zucker, Palmfett'}).verdict, 'spike');
  const r = S.assess({ingredients: 'Erdnüsse, Salz'});
  assert.strictEqual(r.verdict, 'unknown');
  assert.deepStrictEqual(r.why, [['e_nodata']]);
});

test('why texts exist in EN/DE/ES and the first line names carbs per serving', () => {
  const r = S.assess({facts: {c: 36, s: 29}});
  assert.strictEqual(S.text(r.why[0], 0), '18 g carbs in a 50 g serving');
  assert.strictEqual(S.text(r.why[0], 1), '18 g Kohlenhydrate in einer Portion von 50 g');
  assert.strictEqual(S.text(r.why[0], 2), '18 g de carbohidratos en una ración de 50 g');
  for (const k of ['e_carbs', 'e_carbs_ml', 'e_sugar', 'e_slow', 'e_est', 'e_nodata', 'e_bad']) for (const l of [0, 1, 2]) assert.ok(S.text([k, 1, 2], l).length > 5, k + ' ' + l);
});

test('scanner, dex, shop scan and spike lists never say "no spike"', () => {
  const files = ['index.html', 'shop-scan-core.js', 'spike-catch.js'].map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
  for (const bad of ['no blood sugar spike', 'No spike', "Won't spike", 'Unlikely to spike', 'kein Blutzucker-Spike', 'Kein Spike', 'no te sube el azúcar', "'Sin pico'"]) assert.ok(!files.includes(bad), 'gone: ' + bad);
  for (const t of ['Insulin-friendly', 'Not insulin-friendly', 'Not enough data to estimate',
    'Insulinfreundlich', 'Nicht insulinfreundlich', 'Zu wenig Daten für eine Schätzung', 'Apto para la insulina', 'No hay datos suficientes para estimarlo']) assert.ok(html.includes(t), t);
  assert.match(html, /let v = \{spike:1, better:1, ok:1\}\[p\.verdict\] \? p\.verdict : "unknown"/, 'the simple card shows all four verdicts');
});

test('food-engine-core.js loads before spike-core.js and is cached by the service worker', () => {
  const a = html.indexOf('<script src="food-engine-core.js'), b = html.indexOf('<script src="spike-core.js');
  assert.ok(a > 0 && a < b, 'engine first');
  assert.ok(sw.includes('"food-engine-core.js", "spike-core.js"'));
});
