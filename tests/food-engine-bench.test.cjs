// Food Intelligence Engine benchmark (queue step scanfe-a, spec queue/FOOD-ENGINE-SPEC.md sections 4, 5, 13, 14).
// data/food-bench/benchmark.v1.json holds verified label rows only (Open Food Facts, data/shop, Emmanuel's handoff).
// Real checks now: dataset integrity, cited data/shop rows match, serving math (spec section 4).
// Checks that need the engine (scanfe-b1/b2) are marked todo so the suite stays green; they run and report today.
const test = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const bench = JSON.parse(fs.readFileSync(path.join(root, 'data/food-bench/benchmark.v1.json'), 'utf8'));
const rows = bench.rows;
const byId = Object.fromEntries(rows.map(r => [r.id, r]));

const POLICY = ['JA', 'SELTEN', 'NEIN'];
const EXPOSURE = ['Lower', 'Moderate', 'Higher', 'Insufficient evidence'];
const CONFIDENCE = ['High', 'Medium', 'Low'];
const NUTRIENTS = ['carbs', 'sugar', 'fibre', 'protein', 'fat', 'kcal', 'salt'];
const RANK = {JA: 0, SELTEN: 1, NEIN: 2};

// Spec section 4: serving_amount = nutrient_per_100 x serving_g / 100. No fibre, protein or fat subtraction.
function serving(per100, g) {
  const out = {};
  for (const k of NUTRIENTS) out[k] = per100[k] == null ? null : per100[k] * g / 100;
  return out;
}
const r1 = v => Math.round(v * 10) / 10;

test('benchmark: every row is a verified, sourced label', () => {
  assert.ok(rows.length >= 15, 'benchmark has at least 15 rows');
  assert.strictEqual(new Set(rows.map(r => r.id)).size, rows.length, 'ids are unique');
  assert.strictEqual(bench.expertReviewed, false, 'expectations are flagged as not expert-reviewed');
  for (const r of rows) {
    const at = r.id + ': ';
    assert.ok(['off', 'shop', 'handoff'].includes(r.source.kind), at + 'source kind');
    assert.match(r.source.date, /^\d{4}-\d{2}-\d{2}$/, at + 'source date');
    assert.ok(r.source.ref && r.source.ref.length > 5, at + 'source ref');
    if (r.source.kind === 'off') assert.strictEqual(r.source.url, 'https://world.openfoodfacts.org/product/' + r.barcode, at + 'OFF url matches barcode');
    if (r.source.kind !== 'handoff') assert.match(String(r.barcode), /^\d{8,14}$/, at + 'barcode');
    assert.ok(['g', 'ml'].includes(r.unit), at + 'unit');
    for (const k of NUTRIENTS) {
      const v = r.per100[k];
      assert.ok(v === null || (typeof v === 'number' && v >= 0), at + k + ' is a number or null (never guessed)');
    }
    if (r.per100.sugar != null && r.per100.carbs != null) assert.ok(r.per100.sugar <= r.per100.carbs, at + 'sugar <= carbs');
    assert.ok(r.serving.g > 0 && ['manufacturer', 'handoff', 'assumed'].includes(r.serving.source), at + 'serving');
    assert.ok(['complete', 'missing', 'unusable'].includes(r.ingredientsStatus), at + 'ingredientsStatus');
    assert.strictEqual(r.ingredients == null, r.ingredientsStatus !== 'complete', at + 'ingredients null exactly when not complete');
    const e = r.expect;
    assert.ok(e.policy.length && e.policy.every(v => POLICY.includes(v)), at + 'policy vocabulary');
    assert.ok(e.carbExposure.length && e.carbExposure.every(v => EXPOSURE.includes(v)), at + 'carbExposure vocabulary');
    assert.ok(e.confidence.length && e.confidence.every(v => CONFIDENCE.includes(v)), at + 'confidence vocabulary');
    assert.ok(Array.isArray(e.reasons) && e.reasons.length >= 1, at + 'at least one expected reason');
    if (r.ingredientsStatus !== 'complete') {
      assert.ok(e.flags.includes('ingredients_incomplete') || r.categories, at + 'missing ingredients are flagged incomplete');
      assert.ok(!e.confidence.includes('High'), at + 'missing ingredients can never be High confidence');
    }
  }
});

test('benchmark: cited data/shop rows exist and carry the same barcode', () => {
  const cache = {};
  let checked = 0;
  for (const r of rows) {
    const m = /data\/shop\/(\w+)\.json row (\d+)/.exec(r.source.ref);
    if (!m) continue;
    const shop = cache[m[1]] || (cache[m[1]] = JSON.parse(fs.readFileSync(path.join(root, 'data/shop', m[1] + '.json'), 'utf8')));
    const g = shop.cols.indexOf('g');
    const row = shop.rows[Number(m[2])];
    assert.ok(row, r.id + ': data/shop/' + m[1] + ' row ' + m[2] + ' exists');
    assert.strictEqual(row[g], r.barcode, r.id + ': cited row has the same barcode');
    checked++;
  }
  assert.ok(checked >= 10, 'at least 10 rows cross-checked against data/shop (got ' + checked + ')');
});

test('benchmark: pairs from spec section 13 point at real rows, the worse side is never more lenient', () => {
  assert.ok(bench.pairs.length >= 4);
  for (const p of bench.pairs) {
    const b = byId[p.better], w = byId[p.worse];
    assert.ok(b && w, p.group + ': both rows exist');
    const bestOfWorse = Math.min(...w.expect.policy.map(v => RANK[v]));
    const bestOfBetter = Math.min(...b.expect.policy.map(v => RANK[v]));
    assert.ok(bestOfWorse >= bestOfBetter, p.group + ': ' + p.worse + ' is not expected greener than ' + p.better);
  }
  // Plain vs sugar-coated nuts: protein and fat never make the coated side green (spec section 9).
  for (const id of ['ultje-pinats-honig', 'feuergebrannte-mandeln', 'ultje-suess-salzig']) {
    assert.deepStrictEqual(byId[id].expect.policy, ['NEIN'], id + ' is NEIN');
  }
  // Claims never approve (spec section 3): high-protein and zero-sugar rows can't be JA.
  for (const id of ['ehrmann-high-protein-pudding', 'cocacola-zero', 'gutbio-fruchtjoghurt-erdbeere']) {
    assert.ok(!byId[id].expect.policy.includes('JA'), id + ' is never JA');
  }
});

test('serving math: Ultje Suess & Salzig at 30 g matches the handoff (spec section 4)', () => {
  const u = byId['ultje-suess-salzig'];
  const s = serving(u.per100, 30);
  assert.strictEqual(r1(s.sugar), 8.7);
  assert.strictEqual(r1(s.carbs), 10.8);
  assert.strictEqual(r1(s.protein), 4.5);
  assert.strictEqual(r1(s.fat), 11.4);
  assert.strictEqual(Math.round(s.kcal), 167);
  const h = serving(u.per100, 100);
  assert.deepStrictEqual([h.sugar, h.carbs, h.protein, h.fat, h.kcal], [29, 36, 15, 38, 555]);
});

test('serving math: every row scales linearly from per 100 and keeps carbs whole (no fibre/protein/fat subtraction)', () => {
  for (const r of rows) {
    const s = serving(r.per100, r.serving.g);
    if (r.per100.carbs != null) {
      assert.strictEqual(r1(s.carbs), r1(r.per100.carbs * r.serving.g / 100), r.id + ' carbs per serving');
      // EU labels: sugars sit inside carbs and fibre is listed apart, so available carbs = carbs.
      assert.ok(s.carbs >= (s.sugar || 0), r.id + ' sugar stays inside carbs per serving');
    }
    const nul = NUTRIENTS.filter(k => r.per100[k] == null);
    for (const k of nul) assert.strictEqual(s[k], null, r.id + ' unknown ' + k + ' stays unknown per serving');
  }
  // Portions, not 100 g: rice at 75 g dry and cola at 250 ml.
  assert.strictEqual(r1(serving(byId['gg-basmati-reis'].per100, 75).carbs), 58);
  assert.strictEqual(r1(serving(byId['cocacola-original'].per100, 250).sugar), 26.5);
});

// ---- Engine expectations: todo until scanfe-b1/b2 ship food-engine-core.js and the LowiSpikeCore adapter. ----

const spike = require(path.join(root, 'spike-core.js'));
function today(r) {
  const p = r.per100;
  return spike.assess({facts: {c: p.carbs, s: p.sugar, f: p.fibre, p: p.protein, fat: p.fat, drink: r.unit === 'ml'},
    ingredients: r.ingredients || '', cat: r.unit === 'ml' ? 'drink' : ''});
}

test('current estimator reproduces the shipped Ultje bug (documents what scanfe-b2 must fix)', () => {
  // By spike-core.js arithmetic: (36 - 5.5) x 0.8 = 24.4 load, damp min(9.8, 6 + 3.8) = 9.8, score 15 -> ok.
  const o = today(byId['ultje-suess-salzig']);
  assert.strictEqual(o.verdict, 'ok');
  assert.strictEqual(o.score, 15);
});

test('Ultje Suess & Salzig never gets an ok / "no blood sugar spike" verdict', {todo: 'scanfe-b2: LowiSpikeCore.assess -> engine adapter'}, () => {
  assert.notStrictEqual(today(byId['ultje-suess-salzig']).verdict, 'ok');
});

test('no row that expects NEIN for sugar or starch reads ok today', {todo: 'scanfe-b2 (sugar-coated nuts, honey-coated peanuts, regular pudding still read ok)'}, () => {
  const bad = rows.filter(r => r.expect.neverVerdictText && today(r).verdict === 'ok').map(r => r.id);
  assert.deepStrictEqual(bad, []);
});

test('sweeteners inside brackets are seen (Coca-Cola Zero, high-protein pudding)', {todo: 'scanfe-c: spike-core list() drops parenthesised text, so "Suessungsmittel (Aspartam ...)" is missed'}, () => {
  for (const id of ['cocacola-zero', 'ehrmann-high-protein-pudding']) {
    assert.ok(today(byId[id]).why.some(w => w[0] === 's_sweet'), id + ' flags its sweetener');
  }
});

let engine = null;
try { engine = require(path.join(root, 'food-engine-core.js')); } catch (e) { engine = null; }

test('engine (b1): every benchmark row gets an expected carbohydrate-exposure category at its serving', () => {
  assert.ok(engine && typeof engine.estimateGlucoseImpact === 'function', 'food-engine-core.js exists');
  const miss = [];
  for (const r of rows) {
    const v = engine.validateNutrition(r.per100, r.unit);
    const s = engine.calculateServing(v, {manufacturerG: r.serving.g});
    assert.strictEqual(s.g, r.serving.g, r.id + ' serving');
    const g = engine.estimateGlucoseImpact({serving: s});
    if (!r.expect.carbExposure.includes(g.category)) miss.push(r.id + ' ' + g.category);
  }
  assert.deepStrictEqual(miss, []);
  // The shipped estimator reads Ultje as ok; the engine puts it at Moderate or Higher (spec section 14).
  const u = byId['ultje-suess-salzig'];
  const g = engine.estimateGlucoseImpact({serving: engine.calculateServing(u.per100, 30)});
  assert.ok(['Moderate', 'Higher'].includes(g.category), 'Ultje at 30 g: ' + g.category);
});

test('engine verdicts match the benchmark policy, exposure and confidence', {todo: engine && typeof engine.scanFood === 'function' ? false : 'scanfe-d/f1: scanFood (policy + confidence) not built yet'}, () => {
  assert.ok(engine && typeof engine.scanFood === 'function', 'LowiFoodEngine.scanFood exists');
  const miss = [];
  for (const r of rows) {
    const out = engine.scanFood({name: r.name, barcode: r.barcode, unit: r.unit, per100: r.per100, ingredients: r.ingredients, categories: r.categories || []}, r.serving.g);
    if (!r.expect.policy.includes(out.verdict)) miss.push(r.id + ' policy ' + out.verdict);
    if (!r.expect.carbExposure.includes(out.glucose && out.glucose.category)) miss.push(r.id + ' exposure ' + (out.glucose && out.glucose.category));
    if (!r.expect.confidence.includes(out.confidence)) miss.push(r.id + ' confidence ' + out.confidence);
  }
  assert.deepStrictEqual(miss, []);
});
