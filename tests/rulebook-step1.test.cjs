/* Rulebook step 1 (28 Oct 2026): sugar source + "a JA food stays JA at a Moderate portion" in the shared product core.
   Sources: Master Knowledge v3 section 25 (never judge from one nutrient number; plain yogurt's sugar is its own milk sugar)
   and section 39 (same food, same verdict; only the written portion rules change it). Owner decision 24 Oct kept: a Higher
   estimate is never shown as fine. See data/food-policy/RULEBOOK.md. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const S = require(path.join(__dirname, '..', 'spike-core.js'));
const C = require(path.join(__dirname, '..', 'shop-scan-core.js'));
const E = require(path.join(__dirname, '..', 'food-engine-core.js'));
const ING = require(path.join(__dirname, '..', 'ingredient-core.js'));
const FC = require(path.join(__dirname, '..', 'food-card-core.js'));

const F = {
    quark: {name: 'Speisequark Magerstufe', cat: 'dairy', facts: {c: 4.1, s: 4.1, p: 12, fat: 0.5, kcal: 68, q: '500g'}, ingredients: 'Quark.', categories: ['en:quarks', 'en:desserts']},
    quarkNoList: {name: 'Speisequark Magerstufe', cat: 'dairy', facts: {c: 4.1, s: 4.1, p: 12, fat: 0.5, kcal: 68, q: '500g'}, ingredients: '', categories: ['en:quarks']},
    yoghurt: {name: 'Naturjoghurt 3,5%', cat: 'dairy', facts: {c: 4.5, s: 4.5, p: 3.8, fat: 3.5, kcal: 65, q: '500g'}, ingredients: 'Joghurt mild, Milchsäurekulturen', categories: ['en:plain-yogurts']},
    fruitQuark: {name: 'Erdbeer Quark', cat: 'dairy', facts: {c: 14, s: 13, p: 7, fat: 3, kcal: 110, q: '500g'}, ingredients: 'Speisequark, Erdbeeren, Zucker', categories: []},
    sweetenerYog: {name: 'Joghurt Vanille zuckerfrei', cat: 'dairy', facts: {c: 4.5, s: 4.5, p: 4, fat: 1.5, kcal: 50}, ingredients: 'Joghurt, Aroma, Süßstoff (Sucralose)', categories: ['en:yogurts']},
    carrots: {name: 'Karotten', cat: 'veg', facts: {c: 7, s: 5, f: 3, p: 1, fat: 0.2, kcal: 40, q: '1kg'}, ingredients: 'Karotten', categories: ['en:vegetables']},
    juice: {name: 'Orangensaft 100%', cat: 'drink', facts: {c: 9, s: 9, p: 0.7, fat: 0, kcal: 43, q: '1l'}, ingredients: 'Orangensaft', categories: ['en:orange-juices']},
    bread: {name: 'Toastbrot', cat: 'bread', facts: {c: 48, s: 4, f: 3, p: 8, fat: 4, kcal: 260}, ingredients: 'Weizenmehl, Wasser, Hefe, Zucker', categories: ['en:breads']},
    cheese: {name: 'Gouda mittelalt', cat: 'dairy', facts: {c: 0, s: 0, p: 25, fat: 30, kcal: 360}, ingredients: 'Milch, Salz, Lab, Milchsäurekulturen', categories: ['en:cheeses']}
};
const opts = g => (g ? {servingG: g} : undefined);
const src = p => E.sugarSource({name: p.name, unit: p.cat === 'drink' ? 'ml' : 'g', per100: {carbs: p.facts.c, sugar: p.facts.s}, categories: p.categories}, p.ingredients ? ING.analyzeIngredients(p.ingredients, {name: p.name}) : undefined);

test('sugar source: added yes / no / unknown, never assumed', () => {
    assert.deepStrictEqual([src(F.quark).added, src(F.quark).intrinsic], ['no', true]);
    assert.deepStrictEqual([src(F.fruitQuark).added, src(F.fruitQuark).intrinsic], ['yes', false]);
    assert.deepStrictEqual([src(F.quarkNoList).added, src(F.quarkNoList).intrinsic], ['unknown', false]);
    assert.strictEqual(src(F.sweetenerYog).intrinsic, false, 'a sweetener rules out "own sugar"');
    assert.strictEqual(src(F.juice).intrinsic, false, 'no blanket natural-sugar pass: juice is never JA');
    assert.strictEqual(src(F.carrots).intrinsic, true);
});

test('plain quark is insulin-friendly at 150, 250 and 500 g on every product path; never "fast" sugar', () => {
    for (const g of [null, 150, 250, 500]) {
        const a = S.assess(F.quark, opts(g));
        assert.strictEqual(a.verdict, 'ok', 'assess at ' + g);
        assert.strictEqual(S.foodVerdict(F.quark, opts(g)), 'ok', 'foodVerdict at ' + g);
        const m = FC.model(F.quark, g || undefined);
        assert.strictEqual(m && m.verdict, 'JA', 'food card at ' + g);
        const ex = C.explain(F.quark, g, C.level('ok'), 'de');
        const all = ex.lines.join(' ') + ' ' + ex.often;
        assert.ok(!/schnell/.test(all), 'no "schnell" at ' + g + ': ' + all);
        assert.ok(!/Woche/.test(all), 'no weekly limit at ' + g);
        assert.ok(!/Ballaststoff/.test(all), 'quark has no fibre, so fibre is not named: ' + all);
    }
    const big = S.assess(F.quark, {servingG: 500});
    assert.strictEqual(big.engine.jaPortion, true);
    assert.ok(big.engine.glucose.reasons.includes('sugar_own') && !big.engine.glucose.reasons.includes('sugar_high'));
    const ex = C.explain(F.quark, 500, C.level('ok'), 'en');
    assert.ok(ex.lines.some(l => /milk sugar from the milk itself; no sugar was added/.test(l)), ex.lines.join(' | '));
    assert.ok(ex.lines.some(l => /everyday food by the LOWiSPIKE rules/.test(l)));
});

test('a very big quark portion (800 g, 33 g carbs) is still a Higher estimate, explained as amount, not as sugar', () => {
    const a = S.assess(F.quark, {servingG: 800});
    assert.strictEqual(a.verdict, 'spike');
    const ex = C.explain(F.quark, 800, C.level(S.foodVerdict(F.quark, {servingG: 800})), 'en');
    assert.ok(/about the amount/.test(ex.lines[0]), ex.lines[0]);
    assert.ok(!/fast/.test(ex.lines.join(' ')), ex.lines.join(' '));
});

test('added sugar, sweetener and missing lists keep the strict reading', () => {
    assert.strictEqual(S.assess(F.fruitQuark).verdict, 'spike');
    const ex = C.explain(F.fruitQuark, null, C.level('spike'), 'en');
    assert.ok(/Sugar gets into the blood quickly/.test(ex.lines.join(' ')));
    const nl = S.assess(F.quarkNoList, {servingG: 500});
    assert.notStrictEqual(nl.verdict, 'ok', 'no ingredient list: nothing proves the sugar is milk sugar');
    assert.ok(!(nl.engine.sugarSource && nl.engine.sugarSource.intrinsic));
});

test('vegetables: JA stays JA at a Moderate portion; Higher still counts', () => {
    assert.strictEqual(S.assess(F.carrots, {servingG: 150}).verdict, 'ok');
    assert.strictEqual(S.assess(F.carrots, {servingG: 250}).verdict, 'ok');
    assert.strictEqual(S.assess(F.carrots, {servingG: 500}).verdict, 'spike', '35 g carbs is Higher (owner rule 24 Oct)');
    const ex = C.explain(F.carrots, 250, C.level('ok'), 'en');
    assert.ok(!/milk/.test(ex.lines.join(' ')), 'carrot sugar is not called milk sugar');
});

test('starchy and sweet foods are unchanged: bread, juice', () => {
    assert.strictEqual(S.assess(F.bread).verdict, 'spike');
    assert.strictEqual(S.assess(F.bread, {servingG: 250}).verdict, 'spike');
    const ex = C.explain(F.bread, 250, C.level('spike'), 'en');
    assert.ok(!/Sugar gets into the blood/.test(ex.lines.join(' ')), 'bread is explained by its carbs, not its 4 % sugar: ' + ex.lines.join(' | '));
    assert.notStrictEqual(S.assess(F.juice, {servingG: 250}).verdict, 'ok');
});

test('written portion rules still win: cheese is not lifted by the JA rule', () => {
    const a = S.assess(F.cheese, {servingG: 60});
    assert.notStrictEqual(a.engine.jaPortion, true);
});

test('same inputs, same rating, twice', () => {
    for (const k of Object.keys(F)) for (const g of [null, 150, 500]) {
        const x = S.assess(F[k], opts(g)), y = S.assess(F[k], opts(g));
        assert.deepStrictEqual([x.verdict, x.score, x.why], [y.verdict, y.score, y.why], k + ' ' + g);
    }
});
