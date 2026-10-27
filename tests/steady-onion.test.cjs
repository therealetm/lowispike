// Oct 25 2026 (Emmanuel, task "remove last steady-blood-sugar line + onion fix"; tickets left by the scanner one-verdict release
// 20261025-235722): (1) a friend's shared meal details still promised "Blood sugar should stay steady" (EN/DE/ES) right under
// the poster's "Lower impact" result, and a few other lines promised steady blood sugar or energy; the honesty rule is no medical
// promises. (2) "caramelized onions" / "karamellisierte Zwiebeln" / "cebolla caramelizada" were classed as coated nuts and got a
// Skip it, because bare coating words (caramel, glazed, candied ...) counted as coated nuts with no nut in sight.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const R = f => fs.readFileSync(path.join(root, f), 'utf8');
const P = require(path.join(root, 'food-policy-core.js'));
global.LowiFoodPolicy = P;
const K = require(path.join(root, 'food-knowledge-core.js'));
const MR = require(path.join(root, 'meal-result.js'));
const M = require(path.join(root, 'meal-detail-core.js'));

const PROMISE = /steady|stabil|estable|ruhig bleib|should stay|sollte|deber[ií]a|not a spike|kein spike|no un pico/i;

test('shared meal details make no blood sugar promise in EN/DE/ES', () => {
    for (const l of ['en', 'de', 'es']) for (const k of ['whyLow', 'whyMid', 'whyHigh', 'whyDrink']) {
        const s = M.STR[l][k];
        assert.ok(s, l + ' ' + k);
        assert.doesNotMatch(s, PROMISE, l + ' ' + k + ': ' + s);
    }
    const h = M.sheetHTML({ name: 'Salmon bowl', lvl: 'low', bs: 'low', net: 6, total: { carbs: 9, fiber: 3 } }, { by: 'Antje', l: 'en' });
    assert.ok(!/stay steady/i.test(h), 'the low sheet has no steady promise');
    assert.ok(h.includes('Estimate from the photo, not a measurement.'), 'still labelled as an estimate');
});

test('shared meal details use the scanner\'s own words: Lower impact / Small rise / Spike likely, and the same why lines', () => {
    for (const l of ['en', 'de', 'es']) {
        for (const k of ['low', 'mid', 'high', 'whyLow', 'whyMid', 'whyHigh', 'whyDrink']) assert.equal(M.STR[l][k], MR.STR[l][k], l + ' ' + k + ' matches the scan result');
    }
    assert.equal(M.t('low', 'en'), 'Insulin-friendly');
    assert.equal(M.t('low', 'de'), 'Insulinfreundlich');
    assert.equal(M.t('low', 'es'), 'Apto para la insulina');
    assert.equal(M.whyText({ lvl: 'low', net: 6 }, 'en'), 'About 6 g net carbs.');
});

/* strip comments so a note about the old wording doesn't count, then look for the promises in what users can read */
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/^\s*\/\/.*$/gm, '');
const SHIPPED = () => fs.readdirSync(root).filter(f => /\.(js|html)$/.test(f) && !/^sw\.js$/.test(f));
const BANNED = [
    /blood sugar (should|will) stay/i, /Blutzucker sollte (ruhig|stabil)/i, /az[uú]car deber[ií]a mantenerse/i,
    /products that won(?:'|\u2019|\\u2019)t spike/i, /Produkte, die nicht spiken/i, /que no disparan tu insulina/i,
    /Steady energy ahead/i, /Ruhige Energie voraus/i, /Energ[ií]a estable por delante/i,
    /\bIt keeps blood sugar steadier/i, /Das h[aä]lt den Blutzucker ruhiger/i, /\bMantiene el az[uú]car m[aá]s estable/i,
    /These habits keep blood sugar steadier/i, /Diese Gewohnheiten halten den Blutzucker ruhiger/i, /Estos h[aá]bitos mantienen el az[uú]car/i
];

test('no steady blood sugar or steady energy promise is left anywhere in the app (EN/DE/ES)', () => {
    const hits = [];
    for (const f of SHIPPED()) {
        const s = strip(R(f));
        for (const rx of BANNED) { const m = s.match(rx); if (m) hits.push(f + ': ' + m[0]); }
    }
    assert.deepEqual(hits, []);
});

test('the meal-log done line for a low meal, the Find food hint and the protein / PCOS tips are honest in all three languages', () => {
    const idx = R('index.html');
    assert.match(idx, /lowL:"Clean refuel\. A gentler rise is likely\."/);
    assert.match(idx, /lowL:"Sauber getankt\. Wahrscheinlich ein sanfterer Anstieg\."/);
    assert.match(idx, /lowL:"Recarga limpia\. Probablemente una subida m[aá]s suave\."/);
    assert.match(idx, /caught products with a lower impact/);
    assert.match(R('scan-sort-core.js'), /Shuffle only uses products with a lower impact\./);
    assert.match(idx, /It can help keep blood sugar steadier\./);
    assert.match(idx, /These habits can help keep blood sugar steadier:/);
});

const coated = n => P.rateName(n).rules.includes('policy.coated_nuts');

test('caramelized onions are onions, not coated nuts, in EN/DE/ES', () => {
    for (const n of ['caramelized onions', 'caramelised onions', 'karamellisierte Zwiebeln', 'cebolla caramelizada', 'cebolla acaramelada', 'Caramelized Onion']) {
        const r = P.rateName(n);
        assert.ok(!coated(n), n + ' is not coated nuts: ' + r.rules.join(','));
        assert.equal(r.verdict, 'JA', n + ' is a vegetable pick');
    }
    const m = K.rateMeal([{ name: 'Steak', carbs: 0 }, { name: 'Caramelized onions', carbs: 8 }], { level: 'low' }, 'en');
    assert.notEqual(m.rule, 'policy.coated_nuts', 'a steak with caramelized onions is not a coated-nuts Skip it');
    assert.notEqual(m.verdict, 'NEIN');
});

test('glazed, glasiert, glaseado or confit on a savoury food is a cooking word, not a nut coating', () => {
    for (const n of ['glazed carrots', 'glasierte Möhren', 'zanahorias glaseadas', 'pato confitado', 'glazed salmon', 'Glasierte Karotten']) {
        assert.ok(!coated(n), n + ' is not coated nuts: ' + P.rateName(n).rules.join(','));
        assert.equal(P.rateName(n).verdict, 'JA', n);
    }
    // the honest Skip it stays, with its real reason
    assert.equal(P.rateName('honey glazed salmon').rules[0], 'policy.sweet_sauce');
    assert.equal(P.rateName('teriyaki glazed chicken').rules[0], 'policy.sweet_sauce');
    assert.equal(P.rateName('glazed ham').rules[0], 'policy.pork');
    assert.ok(!coated('honey glazed salmon') && !coated('glazed ham'));
});

test('candied or caramel sweets with no nut are sweets, not coated nuts (and stay a Skip it)', () => {
    for (const n of ['candied ginger', 'kandierter Ingwer', 'kandierte Früchte', 'caramel', 'Karamell', 'Schoko-Dragees', 'caramelized bananas', 'salted caramel latte']) {
        const r = P.rateName(n);
        assert.ok(!coated(n), n + ' is not coated nuts: ' + r.rules.join(','));
        assert.equal(r.verdict, 'NEIN', n + ' stays a Skip it');
        assert.ok(r.rules.includes('policy.candy_dessert'), n + ' reads as sweets: ' + r.rules.join(','));
    }
});

test('real coated nuts keep the coated-nuts Skip it in EN/DE/ES', () => {
    for (const n of ['candied pecans', 'glazed nuts', 'caramelized walnuts', 'gebrannte Mandeln', 'Erdnüsse im Honigmantel', 'Honigmandeln', 'honey almonds',
        'almendras con miel', 'nueces caramelizadas', 'maní con miel', 'maní garrapiñado', 'avellana confitada', 'frutos secos con miel']) {
        const r = P.rateName(n);
        assert.equal(r.verdict, 'NEIN', n);
        assert.ok(coated(n), n + ' keeps the coated-nuts reason: ' + r.rules.join(','));
    }
    // a pack tagged as coated nuts by Open Food Facts keeps it even when its name has no nut word
    assert.ok(P.classify({ name: 'Crunchy Caramel Snack', categories: ['en:coated-nuts'] }).coated_nuts);
});
