/* Oct 16 spike estimator, simple card, catch XP and community deals */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const S = require('../spike-core.js');
const C = require('../spike-catch.js').core;
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const spirit = fs.readFileSync(path.join(root, 'spirit.js'), 'utf8');
const v = p => S.assess(p).verdict;

test('Freshona Bio Gemüse Pfanne (5.4 g carbs, 4.6 g sugar) is not a spike and not a drink', () => {
    const p = {name: 'Bio Gemüse Pfanne Mediterrane Art', barcode: '4056489289241', cat: 'drink', facts: {c: 5.4, s: 4.6, f: 2.1, p: 1.6, fat: 3.1, drink: 1}, ingredients: 'Gemüse 88% (Zucchini, Paprika rot, Aubergine, Zwiebeln, Tomaten), Sonnenblumenöl, Salz, Knoblauch'};
    const r = S.assess(p);
    assert.equal(r.verdict, 'ok');
    assert.ok(!r.why.some(w => w[0] === 's_liquid'), 'no drink reason');
    assert.equal(v({facts: {c: 5.4, s: 4.6}}), 'ok', 'same with nutrition only');
});
test('OFF "plant-based-foods-and-beverages" tag no longer makes food a drink', () => {
    assert.match(html, /filter\(x => !\/foods-and-beverages\/\.test/);
});
test('wholegrain oats are not a spike, with or without ingredients', () => {
    assert.equal(v({facts: {c: 58.7, s: 0.7, f: 10, p: 13.5, fat: 7}, ingredients: 'Vollkorn-Haferflocken'}), 'ok');
    assert.equal(v({facts: {c: 58.7, s: 0.7, f: 10, p: 13.5, fat: 7}}), 'ok');
});
test('clear spikes stay spikes', () => {
    assert.equal(v({cat: 'drink', facts: {c: 10.6, s: 10.6, drink: 1}, ingredients: 'Wasser, Zucker, Kohlensäure'}), 'spike', 'cola');
    assert.equal(v({cat: 'drink', facts: {c: 10, s: 10, drink: 1}, ingredients: 'Apfelsaft'}), 'spike', 'juice, liquid sugar');
    assert.equal(v({facts: {c: 49, s: 4, f: 2.5, p: 8, fat: 3}, ingredients: 'Weizenmehl, Wasser, Hefe, Salz, Zucker'}), 'spike', 'white bread');
    assert.equal(v({facts: {c: 80, s: 0.5, f: 3, p: 8, fat: 3}, ingredients: 'Puffreis 100%'}), 'spike', 'rice cakes look healthy but spike');
    assert.equal(v({facts: {c: 77, s: 46, p: 7}, ingredients: 'Glukosesirup, Zucker, Gelatine'}), 'spike', 'gummies');
    assert.equal(v({facts: {c: 14, s: 13, p: 3.5, fat: 3}, ingredients: 'Joghurt, Zucker, Erdbeeren 8%'}), 'spike', 'fruit yoghurt, sugar up front');
    assert.equal(v({facts: {c: 65, s: 22, f: 7, p: 9, fat: 8}, ingredients: 'Haferflocken, Zucker, Rosinen'}), 'spike', 'sugary muesli');
    assert.equal(v({facts: {c: 50, s: 0.5, f: 4, p: 6, fat: 33}, ingredients: 'Kartoffeln, Sonnenblumenöl, Salz'}), 'spike', 'crisps');
});
test('protein, fat, fibre and natural sugar keep low-carb foods calm', () => {
    assert.equal(v({cat: 'drink', facts: {c: 4.8, s: 4.8, p: 3.4, fat: 3.5, drink: 1}, ingredients: 'Vollmilch'}), 'ok', 'milk');
    assert.equal(v({facts: {c: 4, s: 4, p: 11, fat: 0.2}, ingredients: 'Magermilch, Milchsäurekulturen'}), 'ok', 'skyr');
    assert.equal(v({facts: {c: 19, s: 14, f: 12, p: 10, fat: 46}, ingredients: 'Kakaomasse, Kakaobutter, Zucker'}), 'ok', '85% dark chocolate');
    assert.equal(v({facts: {c: 40, s: 3, f: 7, p: 7, fat: 2}, ingredients: 'Roggenvollkornmehl, Wasser, Salz'}), 'ok', 'wholegrain rye bread');
});
test('sweeteners, ingredients-only and no data', () => {
    assert.equal(v({cat: 'drink', facts: {c: 0, s: 0, drink: 1}, ingredients: 'Wasser, Süßstoffe (Aspartam, Acesulfam K)'}), 'spike');
    assert.equal(v({ingredients: 'Weizenmehl, Zucker, Palmöl'}), 'spike');
    assert.equal(v({ingredients: 'Erdnüsse, Salz'}), 'ok');
    assert.equal(v({name: 'x'}), 'unknown');
    const r = S.assess({facts: {c: 5.4, s: 4.6}});
    assert.equal(r.est, true);
    assert.ok(S.text(r.why[0], 1).length > 5 && S.text(r.why[0], 2).length > 5, 'DE/ES reasons');
});
test('the app uses the estimator and re-rates saved verdicts', () => {
    assert.match(html, /if \(window\.LowiSpikeCore && p && !p\.manual\) return LowiSpikeCore\.assess\(p\)/);
    assert.match(html, /always re-rate with the current spike estimator/);
    assert.match(html, /<script src="spike-core\.js\?v=/);
    assert.match(html, /<script src="spike-catch\.js\?v=/);
});
test('simple card: photo, name, one verdict marked as an estimate, Catch it, prices, deals, details (open since Oct 19)', () => {
    const fn = html.slice(html.indexOf('function scActsHTML(p, mine, m)'), html.indexOf('function actsHTML(p)'));
    assert.ok(fn.length > 500);
    for (const bit of ['sc-verd', 'sct("est")', 'data-b3="catch"', 'scActsHTML(p, mine, m)', 'priceCompareHTML', 'LowiDeals.cardHTML', '<details class="sc-more"', 'data-sc="lists"']) assert.ok(fn.includes(bit), bit);
    for (const gone of ['herbHTML', 'eatHTML', 'meterHTML', 'data-b3="skip"', 'swapsHTML']) assert.ok(!fn.includes(gone), gone + ' removed from the card');
    assert.match(html, /const body = p\.notFound \|\| p\.verdict === "unknown" \? manualHTML\(p\) : '<div class="b3-stage sc-stage show">' \+ simpleCardHTML\(p\)/);
});
test('Oct 19: catching pays only the first verified finder (Pathfinder); scanning no longer auto-catches or stacks the GPT card', () => {
    assert.ok(!/LowiVitalsBridge\.complete\("vitamin", "catch:" \+ k, \{amt:10/.test(html), 'no +10 XP for saving a product the community already has');
    assert.match(html, /let cxp = 0; if \(first\) cxp = pfAward\(/);
    const cap = spirit.slice(spirit.indexOf('async function captureProduct'), spirit.indexOf('// one-tap meal logging'));
    assert.ok(!/LowiDex\.collect|gptHTML|insertAdjacentHTML/.test(cap), 'no auto collect, no dashed GPT card on the result');
});
test('deals: durations, expiry, matching, validation', () => {
    const now = new Date(2026, 9, 16, 15, 0).getTime();
    const today = C.until('today', now);
    assert.equal(new Date(today).getDate(), 16);
    assert.equal(C.until('3d', now) - now, 3 * 864e5);
    assert.equal(new Date(C.until('week', now)).getDay(), 0, 'this week ends Sunday');
    const p = {name: 'Bio Gemüse Pfanne', barcode: '4056489289241'};
    const L = [
        {key: C.pkey(p), name: p.name, store: 'Lidl', price: 1.79, until: now + 3600e3},
        {key: C.pkey(p), name: p.name, store: 'Aldi', price: 1.49, until: now + 7200e3},
        {key: C.pkey(p), name: p.name, store: 'Rewe', price: 0.99, until: now - 1},
        {key: 'nother', name: 'Other', store: 'Lidl', price: 1, until: now + 1e6}
    ];
    const f = C.forProduct(L, p, now);
    assert.deepEqual(f.map(d => d.store), ['Aldi', 'Lidl'], 'expired deal gone, cheapest first');
    assert.equal(C.parsePrice('1,99 €'), 1.99);
    assert.equal(C.parsePrice('abc'), null);
    assert.equal(C.valid({name: 'Milk', store: 'Lidl', price: 1.2, until: Date.now() + 1e5}), true);
    assert.equal(C.valid({name: 'Milk', store: '', price: 1.2, until: Date.now() + 1e5}), false);
});
test('spike lists split, search and "looks healthy" filter', () => {
    const items = [
        {name: 'Bio Reiswaffeln', facts: {c: 80, s: 0.5, f: 3, p: 8}, ingredients: 'Puffreis'},
        {name: 'Gummibärchen', facts: {c: 77, s: 46}, ingredients: 'Glukosesirup, Zucker'},
        {name: 'Haferflocken', facts: {c: 58.7, s: 0.7, f: 10, p: 13.5, fat: 7}, ingredients: 'Vollkorn-Haferflocken'}
    ];
    const all = C.split(items, S.assess, '', false, S.looksHealthy);
    assert.equal(all.spike.length, 2); assert.equal(all.ok.length, 1);
    const healthy = C.split(items, S.assess, '', true, S.looksHealthy);
    assert.deepEqual(healthy.spike.map(p => p.name), ['Bio Reiswaffeln']);
    assert.equal(C.split(items, S.assess, 'hafer', false).ok.length, 1);
});
test('Oct 22: the herb world "How do you feel?" card is gone (no leftover styles); files cached', () => {
    const css = fs.readFileSync(path.join(root, 'spike-catch.css'), 'utf8');
    assert.doesNotMatch(css, /cw-panel|cw-feel|cw-mood/);
    const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
    assert.ok(sw.includes('"spike-core.js", "spike-catch.js", "spike-catch.css"'));
});
