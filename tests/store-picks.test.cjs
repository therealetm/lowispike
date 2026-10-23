'use strict';
/* Oct 17, 2026 (E-man, in the shop: "a little emergency button ... see all the snacks that I can buy in the shop, all the meat ...
   all the bread" and "even before entering the shop, be able to see every product that I can buy if I only eat insulin-friendly
   food, every product. In all categories"): store-picks-core.js / store-picks.js / store-picks.css / data/shop/*.json. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const C = require('../store-picks-core.js');
const J = f => JSON.parse(read('data/shop/' + f + '.json'));

test('formula: plain meat passes as Best, white bread and sweets do not', () => {
    const chicken = C.rate({ n: 'Kyllingebryst', k: 'Kød & fisk > Kylling & fjerkræ > Kyllingebryst', c: 0, s: 0, f: 0, p: 23, fat: 2 });
    assert.equal(chicken.group, 'meat');
    assert.equal(chicken.impact, 'lower');
    assert.ok(chicken.pass && chicken.best);
    const toast = C.rate({ n: 'Toastbrød', k: 'Brød & kager > Brød & boller > Lyst & groft brød', c: 48, s: 4, f: 3, p: 9, fat: 3 });
    assert.equal(toast.group, 'bread');
    assert.equal(toast.serve, 40);
    assert.ok(!toast.pass);
    assert.ok(toast.fail === 'impact' || toast.fail === 'policy', toast.fail);
    assert.notEqual(toast.impact, 'lower');
    const choc = C.rate({ n: 'Mælkechokolade', k: 'Slik & snacks > Chokolade > Chokoladeplader', c: 56, s: 54, f: 2, p: 7, fat: 31 });
    assert.equal(choc.group, 'sweets');
    assert.ok(!choc.pass);
});

test('formula (scanfe-h4): no estimated GI; the impact is the engine category for the carbs in the serving', () => {
    const r = C.rate({ n: 'Test', k: 'Kolonial > Pasta > Pasta', c: 10, s: 0, f: 0, p: 0, fat: 0 });
    assert.equal(r.serve, 50);
    assert.equal(r.carbs, 5);
    assert.equal(r.gi, undefined, 'no GI is guessed');
    assert.equal(r.gl, undefined, 'no glycemic load from a guessed GI');
    assert.equal(r.impact, 'lower');
    // fibre, protein and fat no longer lower anything: the same carbs give the same impact
    const fib = C.rate({ n: 'Test', k: 'Kolonial > Pasta > Pasta', c: 30, s: 0, f: 8, p: 20, fat: 20 });
    assert.equal(fib.carbs, 15);
    assert.equal(fib.impact, 'moderate');
    assert.equal(fib.pass, false);
    // sugar guard: low load but lots of sugar per serving still fails
    const sweetDrink = C.rate({ n: 'Saft', k: 'Drikkevarer > Juice > Juice', c: 3, s: 3, f: 0, p: 0, fat: 0, u: 'ml' });
    assert.equal(sweetDrink.serve, 250);
    assert.ok(!sweetDrink.pass);
    const water = C.rate({ n: 'Kildevand', k: 'Drikkevarer > Vand > Kildevand', c: 0, s: 0, u: 'ml' });
    assert.ok(water.pass && water.best);
    // milk is rated by the glass
    const milk = C.rate({ n: 'Letmælk', k: 'Mejeri & køl > Mejeri > Mælk', c: 4.7, s: 4.7, f: 0, p: 3.5, fat: 1.5, u: 'ml' });
    assert.equal(milk.group, 'dairy');
    assert.equal(milk.serve, 200);
});

test('no label: plain fresh meat and common vegetables use typical values, marinated or unknown items stay unrated', () => {
    const steak = C.rate({ n: 'Oksefilet', k: 'Kød & fisk > Oksekød > Bøf & steaks' });
    assert.ok(steak.rated && steak.typical && steak.pass);
    const marinated = C.rate({ n: 'Marinerede kyllingespyd', k: 'Kød & fisk > Kylling & fjerkræ > Spyd' });
    assert.equal(marinated.rated, false);
    const cucumber = C.rate({ n: 'Agurk', k: 'Frugt & grønt > Grøntsager > Agurk & squash' });
    assert.ok(cucumber.typical && cucumber.best);
    const banana = C.rate({ n: 'Bananer', k: 'Frugt & grønt > Frugt > Bananer' });
    assert.ok(banana.typical && !banana.pass);
    assert.equal(C.rate({ n: 'Ukendt ting', k: 'Frugt & grønt > Grøntsager > Andet' }).rated, false);
});

test('incomplete labels stay unrated; puddings and ice cream are rated by the bowl', () => {
    const bad = C.rate({ n: 'Chokoladekage mix', k: 'Kolonial > Bagning > Kageblandinger', c: 0, s: 0, p: 0, fat: 0, kcal: 420 });
    assert.equal(bad.rated, false);
    assert.equal(C.rate({ n: 'Chokoladekage mix m. glasur', k: 'Kolonial > Mel, sukker & bagning > Kageblandinger', c: 0, s: 0, p: 0, fat: 0, kcal: 0 }).rated, false);
    assert.ok(C.rate({ n: 'Kildevand', k: 'Drikkevarer > Vand > Kildevand', c: 0, s: 0, p: 0, fat: 0, kcal: 0, u: 'ml' }).pass, 'water stays fine');
    const pud = C.rate({ n: 'Protein budding m. chokoladesmag', k: 'Mejeri & køl > Mejeri > Dessert & snacks', c: 6.5, s: 4.5, f: 0, p: 10, fat: 1.5, kcal: 80 });
    assert.equal(pud.group, 'sweets');
    assert.equal(pud.serve, 125);
    const candy = C.rate({ n: 'Vingummi', k: 'Slik & snacks > Vingummi & lakrids > Vingummi', c: 77, s: 46, p: 6, fat: 0.5, kcal: 340 });
    assert.equal(candy.serve, 25);
});

test('groups: Danish shop aisles and Open Food Facts tags land in the right category; alcohol and gift boxes are dropped', () => {
    assert.equal(C.groupOf('Kød & fisk > Fisk & skaldyr > Laks'), 'fish');
    assert.equal(C.groupOf('Kød & fisk > Hakket kød > Hakket oksekød'), 'meat');
    assert.equal(C.groupOf('Mejeri & køl > Mejeri > Ost'), 'cheese');
    assert.equal(C.groupOf('Slik & snacks > Chips, nødder & snacks > Nødder'), 'snacks');
    assert.equal(C.groupOf('Slik & snacks > Vingummi & lakrids > Vingummi'), 'sweets');
    assert.equal(C.groupOf('Frost > Is > Isbokse'), 'sweets');
    assert.equal(C.groupOf('dairies|fermented-foods|cheeses|hard-cheeses'), 'cheese');
    assert.equal(C.groupOf('plant-based-foods|breads|crispbreads'), 'bread');
    assert.equal(C.groupOf('beverages|alcoholic-beverages|beers'), null);
    assert.equal(C.groupOf('snacks|sweet-snacks|confectioneries|chocolates'), 'sweets');
    assert.equal(C.groupOf('x', 'Salami Milano'), 'meat');
    assert.equal(C.rate({ n: 'Gavekurv deluxe', k: 'Slik & snacks > Gavekurve > Gavekurve', c: 0 }).skip, true);
});

test('build: only passing products by default, every category, best first, duplicates once, search filters', () => {
    const data = { cols: ['n', 'b', 'k', 'c', 's', 'f', 'p', 'fat', 'kcal', 'u', 'q', 'g'], rows: [
        ['Skyr naturel', 'Salling', 'Mejeri & køl > Mejeri > Yoghurt & skyr', 4, 4, 0, 11, 0.2, 63, 'g', '1 kg', '1'],
        ['Skyr naturel', 'Salling', 'Mejeri & køl > Mejeri > Yoghurt & skyr', 4, 4, 0, 11, 0.2, 63, 'g', '1 kg', '2'],
        ['Frugtyoghurt', 'X', 'Mejeri & køl > Mejeri > Yoghurt & skyr', 14, 13, 0, 3, 3, 100, 'g', '1 kg', '3'],
        ['Hakket oksekød 8-12%', 'Salling', 'Kød & fisk > Hakket kød > Hakket oksekød', 0, 0, 0, 19, 10, 170, 'g', '500 g', '4'],
        ['Vingummi', 'Haribo', 'Slik & snacks > Vingummi & lakrids > Vingummi', 77, 46, 0, 6, 0.5, 340, 'g', '100 g', '5'],
        ['Mandler', 'Salling', 'Slik & snacks > Chips, nødder & snacks > Nødder', 6, 4, 12, 21, 52, 600, 'g', '200 g', '6']
    ] };
    const b = C.build(data);
    assert.equal(b.counts.total, 5);
    assert.equal(b.counts.pass, 3);
    const g = id => b.groups.find(x => x.id === id);
    assert.deepEqual(b.groups.map(x => x.id), C.GROUPS.map(x => x.id));
    assert.equal(g('dairy').pass.length, 1);
    assert.equal(g('dairy').fail.length, 1);
    assert.equal(g('sweets').pass.length, 0);
    assert.equal(g('sweets').fail.length, 1);
    assert.equal(g('meat').pass[0].p.n, 'Hakket oksekød 8-12%');
    assert.equal(g('snacks').pass[0].p.n, 'Mandler');
    assert.equal(C.build(data, { q: 'mandler' }).counts.total, 1);
});

test('real data: the Salling range (Føtex, Bilka, Netto DK) and the German chains are bundled, with sources and labels', () => {
    const s = J('salling');
    assert.ok(s.count > 5000, 'salling range has thousands of products');
    assert.match(s.source, /Salling/);
    assert.match(s.note, /Føtex/);
    const b = C.build(s);
    assert.ok(b.counts.pass > 500);
    assert.ok(b.groups.find(g => g.id === 'meat').pass.length > 50);
    assert.ok(b.groups.find(g => g.id === 'snacks').pass.length > 10);
    assert.ok(b.groups.find(g => g.id === 'bread').pass.length < b.groups.find(g => g.id === 'bread').fail.length, 'most bread is left out');
    for (const f of ['edeka', 'rewe', 'lidl', 'aldi', 'kaufland', 'netto', 'penny']) {
        const d = J(f);
        assert.ok(d.count > 300, f + ' has products');
        assert.match(d.source, /Open Food Facts/);
        assert.deepEqual(d.cols, s.cols);
    }
    assert.ok(!fs.existsSync(path.join(root, 'data/shop/stores.json')), 'no bundled shop map for one region');
    // no keys ship to the phone
    for (const f of ['store-picks.js', 'store-picks-core.js']) assert.doesNotMatch(read(f), /algolia|api[-_]?key|bearer/i);
    assert.doesNotMatch(read('tools/shop-data/build.py'), /[0-9a-f]{32}/, 'no key committed in the builder');
});

test('stores: nearest sorts by distance, Føtex finds the Danish Føtex shops', () => {
    const st = [
        { id: 'a', brand: 'Føtex', name: 'Føtex', addr: 'Jernbanegade 1, 6400 Sønderborg', lat: 54.91, lon: 9.79 },
        { id: 'b', brand: 'REWE', name: 'REWE', addr: 'Leopoldstraße 82, 80802 München', lat: 48.16, lon: 11.586 },
        { id: 'c', brand: 'Lidl', name: 'Lidl', addr: 'Ungererstraße 40, 80805 München', lat: 48.1655, lon: 11.59 }
    ];
    const near = C.nearest(st, { lat: 48.1597, lon: 11.5848 }, 3);
    for (let i = 1; i < near.length; i++) assert.ok(near[i].km >= near[i - 1].km);
    assert.equal(near[0].id, 'b');
    assert.deepEqual(C.findStore(st, 'Foetex').map(x => x.id), ['a']);
    assert.equal(C.town(st[0]), 'Sønderborg');
});

test('wiring: the emergency button, Move-style panel, medical note, cache list and What’s New', () => {
    const html = read('index.html');
    assert.match(html, /store-picks\.css\?v=/);
    assert.match(html, /store-picks-core\.js\?v=[\s\S]*store-picks\.js\?v=/);
    const sw = read('sw.js');
    ['store-picks-core.js', 'store-picks.js', 'store-picks.css'].forEach(f => assert.ok(sw.includes('"' + f + '"'), f + ' cached'));
    const js = read('store-picks.js');
    assert.doesNotMatch(js, /#csHub|\.ss-entry|wme-log|stp-sos/, 'Oct 21: no card under Cook it / Shop it, shopping list or Meals; Home\'s Shop orb is the one entry');
    assert.doesNotMatch(js, /\.sp-quick-cap/, 'no "What can I buy here?" in Log meal: it has its own section');
    assert.match(js, /not medical advice/);
    assert.match(js, /keine medizinische Beratung/);
    assert.match(js, /no consejo médico/);
    assert.match(js, /Show left out/);
    assert.match(js, /None of the/);
    assert.match(js, /Share my location/);
    const css = read('store-picks.css');
    assert.match(css, /--mb-rim/);
    assert.match(css, /--mb-orb/);
    assert.match(css, /\.stp-foot[\s\S]*justify-content: space-between/);
    assert.doesNotMatch(css, /\.sp-/, 'own prefix, no clash with the spirit .sp- classes');
    // the emergency panel must not reuse the spirit world's .sp- class names
    assert.doesNotMatch(js, /class="sp-|'sp-/);
    // What's New in three languages
    const news = JSON.parse(read('version.json')).news.text;
    assert.match(news.en, /What can I buy here\?/);
    assert.match(news.de, /Was kann ich hier kaufen\?/);
    assert.match(news.es, /¿Qué puedo comprar aquí\?/);
});
