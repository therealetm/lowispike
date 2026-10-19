/* Nutrition stats (Oct 19 2026, Emmanuel): the portion line on the product card ("zuletzt 200 g" + protein, fiber, sugar,
   carbs, fat, kcal for that amount) and today's stats as game stats against targets, with an own sugar limit. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const C = require(path.join(ROOT, 'nutri-stats-core.js'));
const DAY = '2026-10-19';
const meal = (m, day) => ({ day: day || DAY, ts: 1, t: 'x', macros: m });

test('portion: the values follow the amount (per 100 g label -> 200 g)', () => {
    const f = { c: 60, s: 20, f: 5, p: 10, fat: 15, kcal: 420 };
    const v = C.forGrams(f, 200);
    assert.deepEqual([v.protein, v.fiber, v.sugar, v.carbs, v.fat, v.kcal], [20, 10, 40, 120, 30, 840]);
    assert.equal(v.estKcal, false);
    const h = C.forGrams(f, 50);
    assert.equal(h.sugar, 10); assert.equal(h.kcal, 210);
});

test('portion: missing kcal is estimated from the macros and marked; unknown values stay unknown, never 0', () => {
    const v = C.forGrams({ c: 10, p: 10, fat: 10 }, 100);
    assert.equal(v.kcal, 170); assert.equal(v.estKcal, true);
    assert.equal(v.sugar, null); assert.equal(v.fiber, null);
    const m = C.logMacros({ c: 10, p: 10, fat: 10 }, 100);
    assert.equal('sugar' in m, false, 'an unknown value is not logged as 0');
    assert.equal(m.grams, 100);
    assert.equal(C.logMacros({ q: '500 g' }, 100), null, 'no facts at all -> no macros');
});

test('portion: last time wins, else the whole small pack, else 100 g (drinks 250)', () => {
    const p = { barcode: '4001234567890', name: 'Choco', facts: { q: '45 g', c: 50 } };
    assert.deepEqual(C.portion(p, {}), { grams: 45, from: 'default', key: 'bc:4001234567890' });
    const mem = C.remember({}, C.productKey(p), 200);
    assert.deepEqual(C.portion(p, mem), { grams: 200, from: 'last', key: 'bc:4001234567890' });
    assert.equal(C.defaultPortion({ facts: { q: '1 kg' } }), 100);
    assert.equal(C.defaultPortion({ facts: { q: '4 x 125 g' } }), 125);
    assert.equal(C.defaultPortion({ facts: { q: '1,5 l', drink: 1 } }), 250);
    assert.equal(C.packGrams('0,33 l'), 330);
    assert.equal(C.productKey({ name: 'Bio Joghurt!' }), 'n:bio joghurt');
    assert.equal(C.clampGrams('abc'), null); assert.equal(C.clampGrams(99999), 2000);
});

test('today: sums only today\'s meals, counts meals without facts apart', () => {
    const logs = [meal({ protein: 30, sugar: 12, kcal: 500 }), meal({ protein: 12.5, fiber: 6 }), meal(null), meal({ protein: 99 }, '2026-10-18')];
    const t = C.totals(logs, DAY);
    assert.equal(t.sum.protein, 42.5); assert.equal(t.sum.sugar, 12); assert.equal(t.sum.fiber, 6); assert.equal(t.sum.kcal, 500);
    assert.equal(t.meals, 3); assert.equal(t.unknown, 1);
    /* old/foreign key names still count */
    assert.equal(C.totals([meal({ proteins: 5, sugars: 2, calories: 90 })], DAY).sum.kcal, 90);
});

test('stats: a doctor\'s sugar limit is a limit: left today, near, over', () => {
    assert.deepEqual([C.stat('sugar', 10, 25).state, C.stat('sugar', 10, 25).left], ['ok', 15]);
    assert.equal(C.stat('sugar', 22, 25).state, 'near');
    const o = C.stat('sugar', 31, 25); assert.equal(o.state, 'over'); assert.equal(o.over, 6); assert.equal(o.fill, 1);
    assert.equal(C.stat('protein', 60, 60).state, 'hit');
    assert.equal(C.stat('kcal', 1900, 2000).state, 'hit');
    assert.equal(C.stat('kcal', 2300, 2000).state, 'over');
    assert.equal(C.stat('kcal', 800, 2000).state, 'go');
});

test('targets: own values win, empty or silly values fall back to the defaults and are not saved', () => {
    const t = C.targets({ macroGoals: { sugar: 25, protein: '90', fat: -3, kcal: 99999 } });
    assert.equal(t.value.sugar, 25); assert.equal(t.own.sugar, true);
    assert.equal(t.value.protein, 90);
    assert.equal(t.value.fat, C.DEFAULTS.fat); assert.equal(t.own.fat, false);
    assert.equal(t.value.kcal, C.DEFAULTS.kcal);
    assert.deepEqual(C.cleanTargets({ sugar: '25', protein: '', fat: '0', kcal: '1800.4', fiber: '30,5' }), { sugar: 25, kcal: 1800, fiber: 30.5 });
});

test('stats: "go to bed with a clear conscience" only when every goal is reached and no limit is broken', () => {
    const user = { macroGoals: { protein: 50, fiber: 20, carbs: 200, fat: 60, sugar: 40, kcal: 1800 } };
    const good = C.rows({ user, logs: [meal({ protein: 55, fiber: 22, carbs: 190, fat: 58, sugar: 30, kcal: 1750 })] }, DAY);
    assert.equal(good.allGood, true); assert.equal(good.good, 6);
    const sweet = C.rows({ user, logs: [meal({ protein: 55, fiber: 22, carbs: 190, fat: 58, sugar: 45, kcal: 1750 })] }, DAY);
    assert.equal(sweet.allGood, false); assert.equal(sweet.good, 5);
    const none = C.rows({ user, logs: [] }, DAY);
    assert.equal(none.allGood, false, 'an empty day is not a win');
    assert.equal(none.good, 1, 'only the sugar limit is "on track" with nothing eaten');
});

function loadUI(lang, st) {
    const store = {}, listeners = {};
    const D = { documentElement: { lang }, body: {}, addEventListener: (t, f) => { listeners[t] = f; }, querySelector: () => null, createElement: () => ({}) };
    const W = { document: D, LowiNutriStatsCore: C, LowiVitalsBridge: { state: () => st, save() { } }, addEventListener() { }, requestAnimationFrame: f => 0,
        localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = String(v); } } };
    const ctx = vm.createContext({ window: W, localStorage: W.localStorage, MutationObserver: function () { this.observe = () => { }; }, requestAnimationFrame: () => 0, setTimeout, CustomEvent: function () { }, console });
    vm.runInContext(read('nutri-stats.js'), ctx);
    return { UI: W.LowiNutriStats, store };
}

test('card: the portion block shows "Last time" with all six values, in German too, and logging remembers the amount', () => {
    const { UI, store } = loadUI('en', { user: {}, logs: [] });
    const p = { barcode: '4000000000001', name: 'Oats', facts: { c: 60, s: 1, f: 10, p: 13, fat: 7, q: '500 g' } };
    let h = UI.portionHTML(p);
    assert.match(h, /Usual portion/); assert.match(h, /value="100"/);
    for (const w of ['Protein', 'Fiber', 'Sugar', 'Carbs', 'Fat', 'kcal']) assert.ok(h.includes(w), w);
    assert.match(h, /≈ kcal/, 'kcal from the macros is marked as estimated');
    assert.match(h, /data-ns="minus"/); assert.match(h, /data-ns="plus"/); assert.match(h, /data-ns="open"/);
    const m = UI.logMacros(p);
    assert.equal(m.protein, 13); assert.equal(m.grams, 100);
    assert.equal(JSON.parse(store['lowi.portion.v1'])['bc:4000000000001'], 100);
    store['lowi.portion.v1'] = JSON.stringify({ 'bc:4000000000001': 200 });
    h = UI.portionHTML(p);
    assert.match(h, /Last time/); assert.match(h, /value="200"/); assert.match(h, /<b>26<small>g<\/small><\/b><small>Protein/);
    const de = loadUI('de', { user: {}, logs: [] }).UI.portionHTML(p);
    assert.match(de, /Übliche Portion/); assert.match(de, /Ballastst\./); assert.match(de, /Heutige Stats/);
    const es = loadUI('es', { user: {}, logs: [] }).UI.portionHTML({ name: 'x', facts: {} });
    assert.match(es, /Aún no hay valores nutricionales/, 'no facts: says so, never shows zeros');
});

test('stats sheet pieces: game names, limit text, plug-in rows', () => {
    const { UI } = loadUI('de', { user: { macroGoals: { sugar: 25 } }, logs: [meal({ sugar: 30, protein: 20 })] });
    const row = UI.statRowHTML(C.stat('sugar', 30, 25));
    assert.match(row, /Spike-Schutz/); assert.match(row, /5 g über deinem Limit/); assert.match(row, /s-over/);
    assert.match(UI.statRowHTML(C.stat('protein', 20, 60)), /Stärke[\s\S]*noch 40 g/);
    const plug = UI.statRowHTML({ name: 'BMI', sub: 'Körper', value: 22, target: 25, unit: '', kind: 'limit' });
    assert.match(plug, /BMI/); assert.match(plug, /role="progressbar"/);
    assert.match(UI.stripHTML(), /Heutige Stats/);
});

test('wiring: card, logging, includes, offline cache, Fuel sheet, kcal from Open Food Facts', () => {
    const idx = read('index.html');
    const card = idx.slice(idx.indexOf('function simpleCardHTML'), idx.indexOf('function actsHTML'));
    assert.ok(card.indexOf('LowiNutriStats.portionHTML(p)') > card.indexOf('sc-verd'), 'portion block sits right under the verdict');
    assert.ok(card.indexOf('LowiNutriStats.portionHTML(p)') < card.indexOf('sc-prices'), 'and above the cheaper stores (product-card-order kept)');
    assert.ok(card.includes('<details class="sc-more" open>'), 'Details stays open by default');
    assert.equal((idx.match(/macros:\(window\.LowiNutriStats \? LowiNutriStats\.logMacros\(p\) : null\)/g) || []).length, 2, 'both "Ate it" paths log the portion');
    assert.doesNotMatch(idx, /via:"barcode"[^\n]*macros:null|macros:null[^\n]*via:"barcode"/);
    assert.match(idx, /kcal:num\(n\['energy-kcal_100g'\]\)/);
    for (const f of ['nutri-stats.css', 'nutri-stats-core.js', 'nutri-stats.js']) { assert.ok(idx.includes(f + '?v='), f); assert.ok(read('sw.js').includes('"' + f + '"'), 'sw ' + f); }
    assert.ok(idx.indexOf('nutri-stats-core.js') < idx.indexOf('nutri-stats.js?'), 'core loads first');
    assert.match(read('sym-home.js'), /LowiNutriStats\.stripHTML\(\)/);
    assert.match(read('nutri-stats.js'), /LowiStatsPlugins/, 'other features plug their sections in');
});
