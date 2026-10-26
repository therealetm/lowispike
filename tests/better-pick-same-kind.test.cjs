'use strict';
/* Oct 26 2026, Emmanuel scanned K-Classic "Mandeln Stifte" (slivered almonds). The card's Better pick was Paliria
   "Eggplants in Onion & Tomato Sauce". His words: "Why is it recommending me eggplants and onion when I scanned almonds?
   Why didn't it just recommend me a better version, an alternative of what I'm trying to find here?"
   Root cause: nameSwap()'s last fallback took ANY community product rated Lower whose coarse category matched, and "other"
   matched "other". swapsHTML() (the swaps after a manual catch) did the same. Rule now (MAYA-HANDOFF 0.30): a Better pick
   is a better version of the SAME kind of food, from products the app really holds, or nothing at all. EN / DE / ES. */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const SW = require('../scan-swap-core.js');
const BP = require('../better-pick-core.js');
const P = require('../food-policy-core.js');

const block = mark => { const a = html.lastIndexOf('<script>', html.indexOf(mark)) + 8; return html.slice(a, html.indexOf('</script>', a)); };
const eng = { module: { exports: {} }, console };
vm.createContext(eng);
vm.runInContext(block('/* LOWiSPIKE meal library v1.1') + '\n' + block('/* LOWiSPIKE v2 rules engine'), eng);
const { analyseMeal } = eng.module.exports;
const realMealRead = q => { const m = analyseMeal(String(q), { trig: [] }); return m && m.ok ? m : null; };
const NRK = { ok: 1, better: 2, spike: 3 };
const nameRate = q => {
    const r = P.rateName(q); let a = r && r.verdict ? { verdict: ({ JA: 'ok', SELTEN: 'better', NEIN: 'spike' })[r.verdict] } : null;
    const m = realMealRead(q), v = m && ({ ja: 'ok', selten: 'better', nein: 'spike' })[m.r];
    if (v && (!a || NRK[v] > NRK[a.verdict])) a = { verdict: v };
    return a;
};
const fnSrc = name => { const a = html.indexOf('function ' + name + '('); assert.ok(a >= 0, name + ' is in index.html'); const b = html.indexOf('\nfunction ', a + 10); return html.slice(a, b); };
const picksSrc = (() => { const a = html.indexOf('const B3_PICKS = {'); return html.slice(a, html.indexOf('\n};', a) + 3); })();

// the page's nameSwap / swapsHTML with the real cores; mealRead can be swapped for one idea to test the engine-idea check
const ctxFor = (comm, opts) => {
    opts = opts || {};
    const store = { 'lowi.sellerZone.region': opts.region || '' };
    const ctx = { window: { LowiScanSwap: SW, LowiBetterPick: BP }, RECIPE_BOOK: [], D: { comm: comm || [] }, CAT_E: {}, pkey: x => (x.barcode || '') + '|' + x.name,
        norm: s => String(s).toLowerCase().trim(), mealRead: opts.mealRead || realMealRead, nameRate, LI: () => ({ de: 1, es: 2 })[opts.lang] || 0,
        localStorage: { getItem: k => store[k] || null }, esc: s => String(s), t: k => k, tr3: x => x[({ de: 1, es: 2 })[opts.lang] || 0],
        cardMini: x => '[' + x.name + ']' };
    vm.createContext(ctx);
    vm.runInContext(picksSrc + ';this.B3_PICKS=B3_PICKS;' + fnSrc('nameSwap') + fnSrc('bpRegion') + fnSrc('swapsHTML') +
        ';this.nameSwap=nameSwap;this.swapsHTML=swapsHTML;', ctx);
    return ctx;
};

// community products as the app stores them (slim(): coarse cat, verdict, optional country)
const eggplant = { barcode: '5201', name: 'Eggplants in Onion & Tomato Sauce', brand: 'Paliria', cat: 'other', verdict: 'ok', country: 'Greece' };
const berenjenas = { barcode: '8401', name: 'Berenjenas en salsa de tomate', brand: 'Hacendado', cat: 'other', verdict: 'ok' };
const skyr = { barcode: '4001', name: 'Skyr natur', brand: 'Milbona', cat: 'dairy', verdict: 'ok' };
const walnuts = { barcode: '4002', name: 'Walnusskerne', brand: 'K-Classic', cat: 'other', verdict: 'ok', country: 'Germany' };
const pumpkin = { barcode: '4003', name: 'Kürbiskerne', brand: 'Alesto', cat: 'other', verdict: 'ok', country: 'United States' };
const vkBrot = { barcode: '4004', name: 'Vollkornbrot', brand: 'Harry', cat: 'bread', verdict: 'ok' };
const brokkoli = { barcode: '4005', name: 'Brokkoli', brand: '', cat: 'bread', verdict: 'ok' };
const almondsScan = { barcode: '4337185', name: 'Mandeln Stifte', brand: 'K-Classic', cat: 'other', verdict: 'better' };

test('his scan: Mandeln Stifte never gets eggplant sauce; with no better nuts or seeds there is no Better pick', () => {
    const s = ctxFor([eggplant, berenjenas, skyr]).nameSwap(almondsScan);
    assert.equal(s, null, 'no nuts or seeds rated better in the app: no Better pick at all');
    const html2 = ctxFor([eggplant, berenjenas, skyr], { lang: 'de' }).swapsHTML(almondsScan);
    assert.doesNotMatch(html2, /Eggplant|Berenjenas|Skyr|Eier/, 'the swaps after a catch hold no unrelated food either');
    assert.match(html2, /Ungesalzene Nüsse/, 'the one idea chip that fits nuts stays');
});

test('almonds -> a real nut or seed product rated better, the one sold where the user shops first', () => {
    const s = ctxFor([eggplant, pumpkin, walnuts], { region: 'eu' }).nameSwap(almondsScan);
    assert.ok(s && s.prod, 'a real product, not an invented one');
    assert.equal(s.n, 'Walnusskerne', 'nuts, and the one sold in Germany before the US one');
    assert.equal(ctxFor([eggplant, pumpkin], { region: 'eu' }).nameSwap(almondsScan).n, 'Kürbiskerne', 'seeds count for almonds');
    const strip = ctxFor([eggplant, walnuts, pumpkin], { region: 'eu' }).swapsHTML(almondsScan);
    assert.match(strip, /\[Walnusskerne\]\[Kürbiskerne\]/);
    assert.doesNotMatch(strip, /Eggplant/);
    for (const lang of ['en', 'de', 'es']) {
        const c = ctxFor([eggplant, berenjenas, walnuts], { lang });
        for (const name of ['Slivered almonds', 'Mandeln Stifte', 'Almendra laminada', 'Haselnusskerne', 'Erdnüsse geröstet']) {
            const r = c.nameSwap({ barcode: '1', name, cat: 'other', verdict: 'better' });
            assert.ok(r, name + ' (' + lang + ') gets a Better pick');
            assert.equal(BP.kindOf(r.n), 'nuts', name + ' (' + lang + ') -> ' + r.n);
            assert.doesNotMatch(r.n, /eggplant|berenjena/i);
        }
    }
});

test('already Lower: no Better pick, even with better-looking products of the same kind', () => {
    const c = ctxFor([walnuts, pumpkin, eggplant]);
    assert.equal(c.nameSwap(Object.assign({}, almondsScan, { verdict: 'ok' })), null);
    assert.equal(c.swapsHTML(Object.assign({}, almondsScan, { verdict: 'ok' })), '');
    assert.deepEqual(BP.candidates(Object.assign({}, almondsScan, { verdict: 'ok' }), [walnuts, pumpkin]), []);
});

test('yogurt -> a lower-sugar yogurt, bread -> a whole-grain bread, never a vegetable that shares the category', () => {
    const c = ctxFor([eggplant, brokkoli, vkBrot, skyr]);
    assert.equal(c.nameSwap({ barcode: '2', name: 'Fruchtjoghurt Erdbeere', cat: 'dairy', verdict: 'spike' }).n, 'Skyr natur');
    const es = c.nameSwap({ barcode: '3', name: 'Yogur de fresa', cat: 'other', verdict: 'better' });
    assert.equal(BP.kindOf(es.n), 'yogurt', 'Spanish fruit yogurt gets a yogurt, got ' + es.n);
    assert.equal(ctxFor([brokkoli, vkBrot]).nameSwap({ barcode: '4', name: 'Toastbrot', cat: 'bread', verdict: 'better' }).n, 'Vollkornbrot');
    assert.equal(ctxFor([brokkoli, eggplant]).nameSwap({ barcode: '5', name: 'Toastbrot', cat: 'bread', verdict: 'better' }), null,
        'broccoli wrongly filed under bread is still not a bread');
});

test('a meal-engine idea of another kind is dropped; a scanned product the app cannot place gets none', () => {
    const board = () => ({ ok: true, r: 'selten', swap: { n: 'Snack board: boiled eggs, cheese cubes, cucumber, walnuts', e: '🥚' } });
    assert.equal(ctxFor([eggplant], { mealRead: board }).nameSwap(almondsScan), null, 'eggs are not a better almond');
    const plain = () => ({ ok: true, r: 'selten', swap: { n: 'Unsalted mixed nuts', e: '🥜' } });
    assert.equal(ctxFor([eggplant], { mealRead: plain }).nameSwap(almondsScan).n, 'Unsalted mixed nuts', 'a nut idea for nuts stays');
    assert.equal(ctxFor([eggplant, walnuts], { mealRead: plain }).nameSwap({ barcode: '9', name: 'Mixed product XJ-5', cat: 'other', verdict: 'better' }), null,
        'a barcode product with no kind gets nothing, not the engine idea and not a random Lower product');
});

test('kind reading EN / DE / ES: nuts stay nuts, look-alikes do not', () => {
    const k = BP.kindOf;
    for (const n of ['Mandeln Stifte', 'Mandeln, natur', 'Gemahlene Mandeln', 'Haselnusskerne', 'Walnusskerne', 'Kürbiskerne', 'Sonnenblumenkerne',
        'Almendra laminada', 'Frutos secos sin sal', 'Studentenfutter', 'Slivered almonds', 'Unsalted mixed nuts']) assert.equal(k(n), 'nuts', n);
    assert.equal(k('Eggplants in Onion & Tomato Sauce'), 'dish');
    assert.equal(k('Mandelmilch'), 'plant_milk');
    assert.equal(k('Mandelmus'), 'nut_spread');
    assert.equal(k('Mandelmehl'), 'flour');
    assert.equal(k('Haselnuss Schokolade'), 'choc');
    assert.equal(k('Erdnussflips'), 'salty_snack');
    assert.equal(k('Schoko Müsli'), 'cereal');
    assert.equal(k('Vollmilch Schokolade'), 'choc');
    assert.equal(k('Pan de molde integral'), 'bread');
    assert.equal(k('Thunfisch in Öl'), 'fish');
    assert.equal(k({ name: 'K-Classic', tags: ['en:plant-based-foods-and-beverages', 'en:nuts', 'en:almonds'] }), 'nuts', 'specific category tags are read');
    assert.equal(k({ name: 'XJ-5', cat: 'other' }), null, '"other" says nothing');
    assert.equal(BP.canReplace('Mandeln Stifte', 'Eggplants in Onion & Tomato Sauce'), false);
    assert.equal(BP.canReplace('Kartoffelchips', 'Ungesalzene Nüsse'), true, 'crisps may become nuts (same salty crunchy use)');
    assert.equal(BP.canReplace('Ungesalzene Nüsse', 'Kartoffelchips'), false, 'but never the other way');
});

test('the page loads the core, offline too', () => {
    assert.match(html, /<script src="better-pick-core\.js\?v=/);
    assert.match(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), /"better-pick-core\.js"/);
    assert.doesNotMatch(fnSrc('nameSwap'), /x\.cat === p\.cat/, 'the old any-Lower-product-with-the-same-category fallback is gone');
});
