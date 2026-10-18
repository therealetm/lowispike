'use strict';
/* Oct 18, 2026 (E-man, relaying his custom lowiSPIKE GPT, which holds the ebook behind his 55 kg loss: avoid big blood-sugar
   spikes and high carb loads; favour minimally processed, protein-forward, LOW-STARCH food; look at food quality and the whole
   meal, not one nutrient; swap fries for crunchy veggie sticks, pasta for zucchini/konjac, buns for lettuce/bell pepper).
   He asked whether "What can I buy here?" matches that. Audit of the live Lidl list found:
   - potato salad, Bratkartoffeln, fries, crisps, microwave rice and muesli marked Good, because they were rated as
     low-GI vegetables or as 30 g snacks (the starchy staples the swaps replace);
   - churros, cake, pancakes and a Magnum bar marked Good because they were rated as a 25 g bite;
   - a Kinder Pingui pack marked Best because its online label lists one 30 g bar as if it were 100 g;
   - Coca-Cola Zero and energy drinks marked Best, the same as water.
   Products below are the real rows from data/shop/lidl.json. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const C = require('../store-picks-core.js');
const lidl = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data/shop/lidl.json'), 'utf8'));
const all = C.rows(lidl);
const row = (name, brand) => {
    const p = all.find(x => x.n === name && (!brand || x.b === brand));
    assert.ok(p, 'fixture row missing from lidl.json: ' + name);
    return p;
};

test('principles: starchy staples (potato, fries, crisps, rice, muesli, sweetcorn) are not Good', () => {
    for (const [n, b] of [['Klassischer Kartoffelsalat'], ['Bratkartoffeln', 'Chef Select'], ['Backofen Super Feine Pommes'],
        ['Chips Paprika', 'Snackday'], ['Bens Microwave Mexican Style Rice'], ['Traube-Nuss Müsli 68% Vollkorn'], ['Mais, Sweetcorn']]) {
        const r = C.rate(row(n, b));
        assert.ok(r.rated, n + ' is rated');
        assert.equal(r.pass, false, n + ' should be left out (GL ' + r.gl + ' in ' + r.serve + ' g)');
    }
    const fries = C.rate(row('Backofen Super Feine Pommes'));
    assert.ok(fries.serve >= 150, 'fries are rated by a plate, not a 30 g handful');
    const salad = C.rate(row('Klassischer Kartoffelsalat'));
    assert.ok(salad.gi >= 55, 'potato is not a low-GI vegetable');
});

test('principles: low-starch whole foods keep their rating (seeds, legumes, green beans, pickles, protein bread)', () => {
    for (const [n, b, best] of [['Bio Leinsamen', 'Crownfield', true], ['Sesam geröstet', 'Vitasia', true], ['Prinzessbohnen', 'Freshona', true],
        ['Cornichons  Gurken', 'Freshona', true], ['Linsen rot im glas extra', 'Campo Largo', true], ['Kichererbsen', 'Freshona', true],
        ['Eiweißreiches Weizenvollkornbrot', 'Grafschafter', true], ['Edelbitter Mild 90%', 'J.D. Gross', true]]) {
        const r = C.rate(row(n, b));
        assert.ok(r.pass, n + ' still passes');
        if (best) assert.ok(r.best, n + ' still Best');
    }
    const berries = C.rate(row('Beerenmix', 'Greenyard'));
    assert.ok(berries.pass, 'frozen berries (berry bark base) still pass');
});

test('principles: cakes, churros, pancakes and ice-cream bars are rated by a real portion', () => {
    for (const [n, b] of [['Zupfkuchen'], ['Churros', 'sol&mar'], ['Pancakes', 'McEnnedy'], ['Magnum Classic'], ['Kuchen Mini Windbeutel Sahne']]) {
        const r = C.rate(row(n, b));
        assert.ok(r.rated, n + ' rated');
        assert.ok(r.serve >= 75, n + ' portion ' + r.serve);
        assert.equal(r.pass, false, n + ' should be left out');
    }
});

test('principles: a chocolate bar label that lists one bar as 100 g is not trusted', () => {
    const r = C.rate(row('Kinder Pingui 4er-Pack'));
    assert.equal(r.rated, false);
    assert.equal(r.incomplete, true);
    assert.ok(C.rate(row('Edelbitter Mild 90%', 'J.D. Gross')).rated, 'real dark chocolate label stays rated');
});

test('principles: sweetened zero drinks and energy drinks pass but are never Best; water and tea stay Best', () => {
    for (const n of ['Coca Cola Zero', 'Pepsi Zero Zucker', 'Sugar free energy drink']) {
        const r = C.rate(row(n));
        assert.ok(r.pass, n + ' passes (no sugar load)');
        assert.equal(r.best, false, n + ' is not Best');
        assert.equal(r.sweetened, true);
        assert.equal(C.explain(r).verdict, 'good');
        assert.equal(C.explain(r).sweetened, true);
    }
    for (const n of ['Saskia Mineralwasser Medium', 'Pfefferminze Teebeutel']) assert.ok(C.rate(row(n)).best, n + ' Best');
});

test('principles: whole Lidl range no longer lists any crisps, fries, potato salad or cake as passing', () => {
    const out = C.build(lidl, {});
    const passing = [];
    Object.values(out.groups || out).forEach(g => (g && g.pass || []).forEach(it => passing.push(it.p.n)));
    assert.ok(passing.length > 500, 'list still has plenty of products: ' + passing.length);
    const bad = passing.filter(n => !/sauce|so\u00dfe/i.test(n) && /kartoffelsalat|bratkartoffel|pommes|frites|chips paprika|chipsfrisch|zupfkuchen|churros|magnum|pingui/i.test(n));
    assert.deepEqual(bad, []);
});

test('principles: the quick view says why a zero drink is Good and not Best', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'store-picks.js'), 'utf8');
    assert.match(src, /e\.sweetened/);
    assert.match(src, /Water and plain tea are Best/);
});
