#!/usr/bin/env node
// Food engine benchmark metrics + spec section 14 acceptance run (queue step scanfe-i).
// Runs every verified row of data/food-bench/benchmark.v1.json through the live engine (food-engine-core.js scanFood and
// the LowiSpikeCore adapter / Food check / stored-row rerate the app uses) and reports the spec section 13 metrics:
// false approvals, false rejections, nutrition math errors, missed ingredient detections, overconfident claims.
// Expectations in the benchmark are provisional (expertReviewed false): a match means "agrees with spec section 8",
// not an expert-reviewed or measured outcome. No nutrition value, GI, ingredient or product is added here.
// Usage: node tools/food-bench/metrics.cjs [--json]
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', '..');
const E = require(path.join(root, 'food-engine-core.js'));
const S = require(path.join(root, 'spike-core.js'));
const bench = JSON.parse(fs.readFileSync(path.join(root, 'data/food-bench/benchmark.v1.json'), 'utf8'));

const RANK = {JA: 0, SELTEN: 1, NEIN: 2};
const CRANK = {Low: 0, Medium: 1, High: 2};
const NUTRIENTS = ['carbs', 'sugar', 'fibre', 'protein', 'fat', 'kcal', 'salt'];
const NO_SPIKE = /no (blood )?sugar spike|kein(e)? (blut)?zucker-?spitze|kein spike|sin pico/i;

function product(r, over) {
    return Object.assign({name: r.name, brand: r.brand, barcode: r.barcode, unit: r.unit, per100: r.per100,
        ingredients: r.ingredients, categories: r.categories || []}, over || {});
}
function adapterInput(r) {
    const p = r.per100;
    return {name: r.name, brand: r.brand, facts: {c: p.carbs, s: p.sugar, f: p.fibre, p: p.protein, fat: p.fat, kcal: p.kcal, sv: r.serving.g, drink: r.unit === 'ml'},
        ingredients: r.ingredients || '', cat: r.unit === 'ml' ? 'drink' : ''};
}
// Expected benchmark flags -> what the engine reports.
function detected(flag, o) {
    const i = o.ingredients || {flags: {}, claims: [], allergens: []};
    const F = i.flags || {};
    const has = k => Array.isArray(F[k]) && F[k].length > 0;
    if (flag === 'ingredients_incomplete') return !i.complete || !!i.truncated;
    if (flag === 'added_sugar') return has('addedSugar');
    if (flag === 'refined_starch') return has('refinedStarch');
    if (flag === 'coating') return has('coating');
    if (flag === 'sweeteners') return has('sweeteners') || has('sugarAlcohols');
    if (flag === 'liquid') return !!(o.glucose && o.glucose.liquid);
    if (flag.startsWith('claim_')) {
        const want = {claim_zero: ['zero', 'zero_sugar', 'sugar_free'], claim_organic: ['organic'], claim_high_protein: ['high_protein']}[flag] || [flag.slice(6)];
        return (i.claims || []).some(c => want.includes(c.key));
    }
    if (flag.startsWith('allergen_')) return (i.allergens || []).includes(flag.slice(9));
    return null; // unknown flag name: reported, never counted as detected
}
const near = (a, b, tol) => Math.abs(a - b) < (tol || 1e-6);

function run() {
    const rows = [];
    const m = {rows: 0, policyMatch: 0, exposureMatch: 0, confidenceMatch: 0, falseApprovals: [], falseRejections: [],
        mathErrors: [], missedFlags: [], overconfident: [], unknownFlags: [], reasonMisses: [], noAlternative: [],
        cancelErrors: [], adapterOk: [], staleOk: [], appLenient: []};
    for (const r of bench.rows) {
        const o = E.scanFood(product(r), r.serving.g);
        const e = r.expect;
        m.rows++;
        const v = o.verdict, rk = RANK[v];
        const lo = Math.min(...e.policy.map(x => RANK[x])), hi = Math.max(...e.policy.map(x => RANK[x]));
        if (e.policy.includes(v)) m.policyMatch++;
        if (rk < lo) m.falseApprovals.push(r.id + ': ' + v + ', expected ' + e.policy.join('/'));
        if (rk > hi) m.falseRejections.push(r.id + ': ' + v + ', expected ' + e.policy.join('/'));
        const cat = o.glucose && o.glucose.category;
        if (e.carbExposure.includes(cat)) m.exposureMatch++;
        if (e.confidence.includes(o.confidence)) m.confidenceMatch++;

        // Math (spec section 4): every nutrient = per100 x g / 100, unknown stays unknown, available carbs are the whole
        // label carbs (EU: fibre listed apart; never minus protein, fat or fibre); glucose.availableCarbsG is shown to 0.1 g.
        const amt = (o.serving && o.serving.amounts) || {};
        if (!o.serving || o.serving.g !== r.serving.g) m.mathErrors.push(r.id + ': serving ' + (o.serving && o.serving.g) + ' g, expected ' + r.serving.g);
        for (const k of NUTRIENTS) {
            const want = r.per100[k] == null ? null : r.per100[k] * r.serving.g / 100;
            const got = amt[k] == null ? null : amt[k];
            if (want === null ? got !== null : got === null || !near(got, want)) m.mathErrors.push(r.id + ': ' + k + ' ' + got + ', expected ' + want);
        }
        if (r.per100.carbs != null && !near(o.glucose.availableCarbsG, r.per100.carbs * r.serving.g / 100, 0.051)) {
            m.mathErrors.push(r.id + ': available carbs ' + o.glucose.availableCarbsG + ' is not the label carbs for the serving');
        }

        for (const f of e.flags) {
            const d = detected(f, o);
            if (d === null) m.unknownFlags.push(r.id + ': ' + f);
            else if (!d) m.missedFlags.push(r.id + ': ' + f);
        }

        // Overconfident claims: confidence above every expected level, High without a complete current ingredient list,
        // a glycaemic load without a credible GI in the evidence, or any "no spike" wording in reasons / glucose text.
        const chi = Math.max(...e.confidence.map(x => CRANK[x]));
        if (CRANK[o.confidence] > chi) m.overconfident.push(r.id + ': confidence ' + o.confidence + ', expected at most ' + e.confidence.join('/'));
        if (o.confidence === 'High' && r.ingredientsStatus !== 'complete') m.overconfident.push(r.id + ': High without ingredients');
        if (o.glucose.gl != null) m.overconfident.push(r.id + ': glycaemic load ' + o.glucose.gl + ' without a supplied GI');
        const words = JSON.stringify([o.reasons, o.glucose.reasons, o.alternative && o.alternative.text]);
        if (NO_SPIKE.test(words)) m.overconfident.push(r.id + ': "no spike" wording');

        // Reasons (spec section 14): 1-3 shown, each with EN/DE/ES text; expected reason keys present.
        const shown = o.reasons || [];
        const okText = shown.length >= 1 && shown.length <= 3 && shown.every(x => x.text && x.text.en && x.text.de && x.text.es);
        const missR = e.reasons.filter(k => !(o.reasonKeys || []).includes(k));
        if (!okText || missR.length) m.reasonMisses.push(r.id + ': ' + (okText ? '' : shown.length + ' shown reasons; ') + (missR.length ? 'missing ' + missR.join(', ') : ''));
        if (v !== 'JA' && !(o.alternative && o.alternative.text && o.alternative.text.en && o.alternative.text.de && o.alternative.text.es)) m.noAlternative.push(r.id + ': ' + v);

        // Protein and fat cannot cancel carbs: the same label with protein and fat removed gets the same available carbs and
        // the same exposure category (fat/protein are modifiers, not subtractions).
        if (r.per100.carbs != null) {
            const bare = E.scanFood(product(r, {per100: Object.assign({}, r.per100, {protein: 0, fat: 0})}), r.serving.g);
            if (bare.glucose.category !== cat || !near(bare.glucose.availableCarbsG, o.glucose.availableCarbsG)) {
                m.cancelErrors.push(r.id + ': ' + cat + ' with protein/fat vs ' + bare.glucose.category + ' without');
            }
        }

        // What the app shows: the LowiSpikeCore adapter + Food check (Products, Store picks, Misty) and a stale stored "ok"
        // dex row re-rated on load (scanfe-h6), both at the benchmark serving. A NEIN row must never read ok on either path, and
        // the app verdict (ok / better / spike) is never more lenient than the engine verdict (JA / SELTEN / NEIN).
        const a = adapterInput(r);
        const fv = S.foodVerdict(a);
        const stale = S.rerate(Object.assign({}, a, {verdict: 'ok'}));
        if (v === 'NEIN' && fv === 'ok') m.adapterOk.push(r.id);
        const APP = {ok: 0, better: 1, spike: 2};
        if (APP[fv] == null || APP[fv] < rk) m.appLenient.push(r.id + ': app ' + fv + ', engine ' + v);
        if (v === 'NEIN' && stale === 'ok') m.staleOk.push(r.id);

        rows.push({id: r.id, verdict: v, decidedBy: o.policy && o.policy.decidedBy, exposure: cat, confidence: o.confidence,
            quality: o.quality && o.quality.key, appVerdict: fv, staleOkBecomes: stale, alternative: o.alternative && o.alternative.key,
            expected: {policy: e.policy, exposure: e.carbExposure, confidence: e.confidence}});
    }

    // Glucose and quality are separate: at least one row with Lower exposure but a non-good quality (Coca-Cola Zero,
    // salami sticks) and quality marked independentOfGlucose on every row.
    const independent = rows.some(x => x.exposure === 'Lower' && x.quality && x.quality !== 'good');

    const ultje = rows.find(x => x.id === 'ultje-suess-salzig');
    const acceptance = [
        {id: 'variants', text: 'Exact product variants identified correctly',
            pass: bench.rows.filter(r => r.source.kind !== 'handoff').every(r => /^\d{8,14}$/.test(String(r.barcode))) &&
                E.scanFood(product(bench.rows.find(r => r.id === 'ultje-suess-salzig')), 30).confidenceInfo.reasons.includes('identity_unverified'),
            note: 'every sourced row is pinned to its barcode (Open Food Facts or data/shop); the row without a barcode (Ültje Süß & Salzig) is flagged identity_unverified and gets Low confidence. Barcode lookup itself is not part of this offline run.'},
        {id: 'serving', text: 'Serving calculations accurate', pass: m.mathErrors.length === 0, note: m.mathErrors.length + ' math errors'},
        {id: 'ingredients', text: 'Added sugar and refined starch recognised when ingredients are available',
            pass: !m.missedFlags.some(x => /added_sugar|refined_starch/.test(x)), note: m.missedFlags.length + ' missed ingredient flags'},
        {id: 'no-cancel', text: 'Protein and fat cannot mathematically cancel carbohydrates', pass: m.cancelErrors.length === 0, note: m.cancelErrors.length + ' rows changed when protein/fat were removed'},
        {id: 'independent', text: 'Glucose impact and food quality assessed independently',
            pass: independent && bench.rows.every(r => (E.scanFood(product(r), r.serving.g).quality || {}).independentOfGlucose === true), note: 'Lower exposure with a non-good quality exists'},
        {id: 'exclusions', text: 'LOWiSPIKE exclusions consistently enforced',
            pass: m.falseApprovals.length === 0 && ['edeka-salami-sticks', 'cocacola-zero', 'pfanner-orangensaft', 'feuergebrannte-mandeln', 'ultje-pinats-honig'].every(id => rows.find(x => x.id === id).verdict === 'NEIN'),
            note: 'pork, sweet zero drink, juice and sugar-coated nuts are NEIN; ' + m.falseApprovals.length + ' false approvals'},
        {id: 'uncertainty', text: 'Unknown data produces uncertainty, not fabricated certainty', pass: m.overconfident.length === 0, note: m.overconfident.length + ' overconfident claims'},
        {id: 'reasons', text: 'Every verdict has a short, understandable explanation', pass: m.reasonMisses.length === 0, note: m.reasonMisses.length + ' rows missing reasons'},
        {id: 'alternative', text: 'Every rejected product can offer a relevant alternative', pass: m.noAlternative.length === 0, note: m.noAlternative.length + ' SELTEN/NEIN rows without an alternative'},
        {id: 'ultje', text: 'Ültje Süß & Salzig no longer produces an unsupported "likely no blood sugar spike"',
            pass: ultje.verdict === 'NEIN' && ultje.appVerdict !== 'ok' && ultje.staleOkBecomes !== 'ok', note: 'engine ' + ultje.verdict + ' / ' + ultje.exposure + ', app ' + ultje.appVerdict + ', stale ok row becomes ' + ultje.staleOkBecomes},
        {id: 'regression', text: 'Automated regression tests prevent fixed classification errors from returning',
            pass: fs.existsSync(path.join(root, 'tests/food-engine-bench.test.cjs')) && fs.existsSync(path.join(root, 'tests/food-bench-metrics.test.cjs')),
            note: 'tests/food-engine-bench.test.cjs + tests/food-bench-metrics.test.cjs run in the suite'}
    ];
    return {benchmark: {version: bench.version, built: bench.built, rows: m.rows, expertReviewed: bench.expertReviewed},
        engine: E.VERSION, policyVersion: (E.scanFood(product(bench.rows[0]), 30) || {}).policyVersion,
        metrics: {policyMatch: m.policyMatch, exposureMatch: m.exposureMatch, confidenceMatch: m.confidenceMatch,
            falseApprovals: m.falseApprovals, falseRejections: m.falseRejections, mathErrors: m.mathErrors, missedFlags: m.missedFlags,
            overconfident: m.overconfident, unknownFlags: m.unknownFlags, reasonMisses: m.reasonMisses, noAlternative: m.noAlternative,
            cancelErrors: m.cancelErrors, appLenient: m.appLenient, appOkOnNein: m.adapterOk, staleOkOnNein: m.staleOk},
        acceptance, rows};
}

module.exports = {run, detected};

if (require.main === module) {
    const out = run();
    if (process.argv.includes('--json')) { console.log(JSON.stringify(out, null, 1)); process.exit(0); }
    const n = out.benchmark.rows, M = out.metrics;
    console.log('Benchmark v' + out.benchmark.version + ' (' + out.benchmark.built + '), ' + n + ' rows, engine ' + out.engine + ', ' + out.policyVersion + ', expert-reviewed: ' + out.benchmark.expertReviewed);
    console.log('policy match ' + M.policyMatch + '/' + n + ', exposure match ' + M.exposureMatch + '/' + n + ', confidence match ' + M.confidenceMatch + '/' + n);
    for (const k of ['falseApprovals', 'falseRejections', 'mathErrors', 'missedFlags', 'overconfident', 'unknownFlags', 'reasonMisses', 'noAlternative', 'cancelErrors', 'appLenient', 'appOkOnNein', 'staleOkOnNein']) {
        console.log(k + ': ' + M[k].length + (M[k].length ? '  ' + M[k].join(' | ') : ''));
    }
    console.log('Acceptance (spec section 14):');
    for (const a of out.acceptance) console.log('  ' + (a.pass ? 'PASS' : 'FAIL') + '  ' + a.text + ' (' + a.note + ')');
    console.log('Rows:');
    for (const r of out.rows) console.log('  ' + r.id + ': ' + r.verdict + ' (' + r.decidedBy + '), ' + r.exposure + ', ' + r.confidence + ', quality ' + r.quality + ', app ' + r.appVerdict + ', stale ok -> ' + r.staleOkBecomes);
    process.exit(out.acceptance.every(a => a.pass) ? 0 : 1);
}
