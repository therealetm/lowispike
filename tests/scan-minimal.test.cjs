'use strict';
/* Oct 25 2026, Emmanuel: "keep the scanner minimal: a simple estimated spike verdict, and a directly relevant alternative
   only when it's needed." Live examples this pins down:
   - typed "honey almonds": the Best swap was a breakfast board with eggs, turkey, cucumber and tomato -> now plain almonds
     (a real product only when the app already holds one; nothing invented);
   - typed "nuts": Lower impact / Good pick, yet a Best swap box ("Good pick, no swap needed") and an empty
     "From the scan / no detailed data" box -> no swap section and no empty scan box for a typed name;
   - a photo bowl (chocolate quark mixture, cottage cheese, almonds, goji berries) read "No spike ... your blood sugar should
     stay steady" and, under it, "LOWiSPIKE: Skip it, sweets or dessert with sugar, no XP" -> one answer on top;
   - no "How sure" confidence row, no promise that it won't spike;
   - a smoothie has its own short reason instead of being called a sweet drink like soda (verdict unchanged). */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const SW = require('../scan-swap-core.js');
const P = require('../food-policy-core.js');
const K = require('../food-knowledge-core.js');
const A = require('../food-assess-core.js');
const R = require('../meal-result.js');
const DB = require('../meal-db-core.js');
DB.load(require('../data/meals/fndds.json'));

// the typed-meal engine as the page has it
const block = mark => { const a = html.lastIndexOf('<script>', html.indexOf(mark)) + 8; return html.slice(a, html.indexOf('</script>', a)); };
const eng = { module: { exports: {} }, console };
vm.createContext(eng);
vm.runInContext(block('/* LOWiSPIKE meal library v1.1') + '\n' + block('/* LOWiSPIKE v2 rules engine'), eng);
const { analyseMeal } = eng.module.exports;
const mealRead = q => { const m = analyseMeal(String(q), { trig: [] }); return m && m.ok ? m : null; };
// nameRate as the page builds it: the food rules, made stricter by the typed-meal engine
const NRK = { ok: 1, better: 2, spike: 3 };
const nameRate = q => {
    const r = P.rateName(q); let a = r && r.verdict ? { verdict: ({ JA: 'ok', SELTEN: 'better', NEIN: 'spike' })[r.verdict] } : null;
    const m = mealRead(q), v = m && ({ ja: 'ok', selten: 'better', nein: 'spike' })[m.r];
    if (v && (!a || NRK[v] > NRK[a.verdict])) a = { verdict: v };
    return a;
};
const fnSrc = name => { const a = html.indexOf('function ' + name + '('); const b = html.indexOf('\nfunction ', a + 10); return html.slice(a, b); };
const ctxFor = (comm, lang) => {
    const ctx = { window: { LowiScanSwap: SW }, RECIPE_BOOK: [], D: { comm: comm || {} }, CAT_E: {}, pkey: x => x.name, norm: s => String(s).toLowerCase().trim(),
        mealRead, nameRate, LI: () => ({ de: 1, es: 2 })[lang] || 0 };
    vm.createContext(ctx);
    vm.runInContext(fnSrc('nameSwap') + ';this.nameSwap=nameSwap;', ctx);
    return ctx;
};

test('honey almonds -> plain almonds, not an unrelated breakfast board (EN / DE / ES)', () => {
    assert.equal(nameRate('honey almonds').verdict, 'spike', 'honey-coated nuts stay a spike pick (owner rule)');
    const s = ctxFor({}, 'en').nameSwap({ name: 'honey almonds', verdict: 'spike' });
    assert.ok(s, 'a swap is needed here');
    assert.equal(s.n, 'Plain almonds');
    assert.doesNotMatch(JSON.stringify(s), /egg|turkey|cucumber|tomato|board/i);
    assert.equal(ctxFor({}, 'de').nameSwap({ name: 'Honig Mandeln', verdict: 'spike' }).n, 'Mandeln, natur');
    assert.equal(ctxFor({}, 'de').nameSwap({ name: 'gebrannte Mandeln', verdict: 'spike' }).n, 'Mandeln, natur');
    assert.equal(ctxFor({}, 'de').nameSwap({ name: 'Honigmandeln', verdict: 'spike' }).n, 'Mandeln, natur');
    assert.equal(ctxFor({}, 'es').nameSwap({ name: 'almendras con miel', verdict: 'spike' }).n, 'almendras al natural'.replace(/^a/, 'A'));
    assert.equal(ctxFor({}, 'en').nameSwap({ name: 'honey roasted cashews', verdict: 'spike' }).n, 'Plain cashews');
    assert.equal(ctxFor({}, 'en').nameSwap({ name: 'chocolate covered peanuts', verdict: 'spike' }).n, 'Plain peanuts');
});

test('a real matching product is named only when the app already holds one, rated ok and without a sweet word', () => {
    const comm = {
        a: { name: 'Honig Mandeln', verdict: 'spike' },
        b: { name: 'Schoko Mandeln', verdict: 'ok' },          // wrongly ok in someone's data: still has a sweet word
        c: { name: 'Mandeln ganz, naturbelassen', verdict: 'ok', brand: 'ja!' },
    };
    const s = ctxFor(comm, 'de').nameSwap({ name: 'Honig Mandeln', verdict: 'spike' });
    assert.equal(s.prod && s.prod.name, 'Mandeln ganz, naturbelassen');
    assert.equal(s.n, 'Mandeln ganz, naturbelassen');
    assert.ok(!('price' in s) && !('stock' in s), 'no invented price or stock');
    const none = ctxFor({ x: { name: 'Erdnüsse', verdict: 'ok' } }, 'de').nameSwap({ name: 'Honig Mandeln', verdict: 'spike' });
    assert.equal(none.prod, undefined, 'no matching product: just the plain food');
    assert.equal(none.n, 'Mandeln, natur');
});

test('a good pick has no swap at all: "nuts", "almonds" and anything rated ok or unknown', () => {
    assert.equal(nameRate('nuts').verdict, 'ok');
    for (const p of [{ name: 'nuts', verdict: 'ok' }, { name: 'almonds', verdict: 'ok' }, { name: 'honey almonds', verdict: 'ok' }, { name: 'xyz', verdict: 'unknown' }, { name: 'nuts' }])
        assert.equal(ctxFor({}, 'en').nameSwap(p), null, JSON.stringify(p));
    const h = vm.createContext({ esc: s => String(s), net: k => k, pkey: x => x.name, nameSwap: () => null });
    vm.runInContext(fnSrc('nameSwapHTML') + ';this.f=nameSwapHTML;', h);
    assert.equal(h.f({ name: 'nuts', verdict: 'ok' }), '', 'no Best swap box');
    assert.equal(SW.anchored('nuts', { rate: nameRate }), null, 'nothing to take off');
    assert.equal(SW.anchored('honey', { rate: nameRate }), null);
    assert.equal(SW.anchored('honey yoghurt raisins', { rate: nameRate }), null, 'raisins alone are not an everyday pick: no anchor');
    assert.equal(SW.anchored('honey almonds', {}), null, 'no rate, no guess');
});

test('a typed name gets no empty "From the scan / no detailed data" box; a scanned barcode without data still does', () => {
    const c = vm.createContext({ esc: s => String(s), net: k => k, lpAskHTML: () => '<ask>', scanHasData: p => !!(p && p.facts) });
    vm.runInContext(fnSrc('noDataHTML') + ';this.f=noDataHTML;', c);
    assert.equal(c.f({ name: 'nuts', verdict: 'ok', nameEst: { how: 'name' } }), '');
    assert.match(c.f({ name: 'Mystery bar', barcode: '4000000000000', verdict: 'unknown' }), /ne-nodata/);
    assert.equal(c.f({ name: 'Bar', barcode: '4000000000000', facts: { c: 3 } }), '');
});

test('no "How sure" confidence row; an empty estimate box is not drawn', () => {
    const c = vm.createContext({ esc: s => String(s), net: k => ({ read: 'Read as', how: 'How sure', low: 'Rough', medium: 'Fair', fallback: 'fb' })[k] || k, capw: s => s });
    vm.runInContext(fnSrc('nameEstHTML') + ';this.f=nameEstHTML;', c);
    assert.equal(c.f({ nameEst: { how: 'name', conf: 'low' } }), '');
    const r = c.f({ nameEst: { how: 'dict', hit: 'almonds', conf: 'medium' } });
    assert.match(r, /Read as/);
    assert.doesNotMatch(r, /How sure|Rough|Fair/);
});

const item = t => R.clean(R.estimateItem(t, '', { name: t }, DB, 'en'));
const bowl = () => [item('chocolate quark mixture'), item('cottage cheese'), item('almonds'), item('goji berries')];

test('photo bowl: one answer on top; the spike estimate and the LOWiSPIKE verdict never disagree', () => {
    for (const l of ['en', 'de', 'es']) {
        const v = R.verdict(bowl(), [], null, l);
        assert.equal(v.food.verdict, 'NEIN', 'the chocolate quark mix is not assumed sugar-free');
        const h = R.headline(v, l);
        assert.equal(h.cls, 'high', l);
        assert.equal(h.ans, { en: 'Skip it', de: 'Lieber nicht', es: 'Mejor no' }[l] || h.ans, l);
        assert.doesNotMatch(h.ans + ' ' + h.why, /no spike|kein spike|sin pico|steady|ruhig|estable|lower impact|niedrigere|impacto bajo/i, l);
        assert.match(h.why, /\d+ g/, l + ': the carb estimate stays, short');
        assert.equal(R.xpFor(v).xp, 0, l + ': not a LOWiSPIKE meal, so no XP, same as the headline');
        assert.equal(R.xpFor(v).why, 'nein');
    }
    const src = fs.readFileSync(path.join(root, 'meal-result.js'), 'utf8');
    assert.doesNotMatch(src, /mr-fk mr-fk-/, 'no second, contradicting verdict line under the headline');
    for (const l of ['en', 'de', 'es']) for (const k of ['low', 'whyLow', 'whyMid']) assert.doesNotMatch(R.STR[l][k], /no spike|kein spike|sin pico|steady|ruhig bleiben|estable|not a spike|kein Spike|no un pico/i, l + '.' + k);
});

test('photo: a plain everyday plate still reads low, a small-portion verdict reads yellow, a spike reads red', () => {
    const low = R.headline(R.verdict([item('chicken breast'), item('broccoli')], [], null, 'en'), 'en');
    assert.equal(low.cls, 'low'); assert.equal(low.ans, 'Lower impact');
    assert.match(low.why, /^About \d+ g net carbs\.$/);
    const fruit = R.headline(R.verdict([item('apple')], [], null, 'en'), 'en');
    assert.equal(fruit.cls, 'mid'); assert.equal(fruit.ans, 'Small portion');
    const pork = R.verdict([item('pork chop')], [], null, 'en');
    assert.equal(R.headline(pork, 'en').cls, 'high', 'owner rule kept: pork is a NEIN, and the headline says so');
    const rice = R.headline(R.verdict([item('3 cups white rice')], [], null, 'en'), 'en');
    assert.equal(rice.cls, 'high');
    assert.equal(R.headline({ empty: true }, 'en'), null);
});

test('smoothies: own rule and short reason, not "sweet drink" like soda; added sugar still makes it a sugary drink', () => {
    const r = P.rateName('smoothie');
    assert.equal(r.rules[0], 'policy.smoothie');
    assert.equal(r.verdict, 'NEIN', 'owner verdict for typical smoothies unchanged');
    assert.ok(!r.rules.includes('policy.sugar_drink'));
    assert.equal(P.rateName('cola').rules[0], 'policy.sugar_drink', 'soda unchanged');
    for (const l of ['en', 'de', 'es']) {
        const txt = K.reasonText('policy.smoothie', l);
        assert.ok(txt && txt !== K.reasonText('policy.sugar_drink', l), l);
        assert.ok(txt.length <= 70, l + ' short');
    }
    const plain = P.applyPolicy({ product: { name: 'Mango Smoothie', unit: 'ml', categories: ['en:smoothies'], per100: { sugar: 11, carbs: 13, fiber: 1.2 } },
        ingredients: { status: 'complete', complete: true, flags: {}, summary: { addedSugar: false }, allergens: [], claims: [] } });
    const ids = plain.rules.map(x => x.id);
    assert.ok(ids.includes('policy.smoothie'), JSON.stringify(ids));
    assert.ok(!ids.includes('policy.sugar_drink'), 'no added sugar: not called a sugary drink');
    assert.equal(plain.verdict, 'NEIN');
    assert.ok(A.TEXT.smoothie_blended && A.TEXT.smoothie_blended.de && A.TEXT.smoothie_blended.es);
    assert.ok(A.ORDER.includes('smoothie_blended'));
});

test('the app loads the swap module before the page script runs, and the offline cache has it', () => {
    assert.match(html, /<script src="scan-swap-core\.js\?v=/);
    assert.match(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), /"scan-swap-core\.js"/);
});

test('honey-coated nuts written as one German word are a Skip it too (live check: "Honigmandeln" came out Lower impact)', () => {
    for (const q of ['Honigmandeln', 'Honig-Mandeln', 'Honignüsse', 'Honigerdnüsse', 'Honig-Cashews', 'honey-roasted peanuts', 'almendras con miel'])
        assert.equal(nameRate(q).verdict, 'spike', q + ' is a coated / honey nut');
    for (const q of ['Mandeln', 'Nüsse', 'nuts', 'almendras', 'Erdnüsse']) assert.equal(nameRate(q).verdict, 'ok', q + ' stays a plain nut');
    assert.equal(ctxFor({}, 'de').nameSwap({ name: 'Honigmandeln', verdict: nameRate('Honigmandeln').verdict }).n, 'Mandeln, natur');
});
