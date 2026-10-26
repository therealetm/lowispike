'use strict';
/* 26 Oct 2026, Emmanuel (voice, 05:37): "Why am I seeing the food that I'm not supposed to be eating in my product shuffle?
   That shouldn't be looking like this. Fix the UI." His Shuffle had a big red "Throw out (11)" list running off both
   edges, and plain beef patties, nori and quark sat in it as "Higher impact / Will likely spike insulin". */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const S = require('../spike-core.js');
const SS = require('../scan-sort-core.js');
const P = require('../food-policy-core.js');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'beta.css'), 'utf8');
const part = (a, b) => { const i = html.indexOf(a); assert(i > 0, a); return html.slice(i, html.indexOf(b, i)); };
const rate = p => S.assess(p);
const v = p => SS.verdictOf(p, rate);

/* label data as on Open Food Facts (beef: a typical plain patty label) */
const BEEF = { name: 'Frische Hamburger vom Rind', brand: 'Bio', facts: { c: 0, s: 0, p: 19, fat: 15 }, ingredients: 'Rindfleisch, Speisesalz, Pfeffer' };
const BEEF_NOING = { name: 'Frische Hamburger vom Rind', brand: 'Bio', facts: { c: 0.5, s: 0.5, p: 18, fat: 17 } };
const NORI = { name: 'Sushi Nori Roasted Seaweed', brand: 'YUTAKA', facts: { c: 32, s: 0, f: 7.7, p: 41, fat: 3.3 }, ingredients: 'Seaweed (100%).' };
const NORI_NOING = { name: 'Sushi Nori Roasted Seaweed', brand: 'YUTAKA', facts: { c: 32, s: 0, f: 7.7, p: 41, fat: 3.3 } };
const QUARK = { name: 'Magerquark', brand: 'Milbona', facts: { c: 4, s: 4, p: 12, fat: 0.2 }, ingredients: 'Magermilch, Milchsäurebakterienkulturen, Lab' };
const HP_QUARK = { name: 'High Protein Quark', brand: 'Milbona', facts: { c: 3.5, s: 3.5, p: 13, fat: 0.3 }, ingredients: 'Magermilchquark, Milcheiweiß' };
const TUNA = { name: 'Thunfisch Filets in eigenem Saft', brand: 'Saupiquet', facts: { c: 0, s: 0, p: 26, fat: 1 }, ingredients: 'Thunfisch, Wasser, Salz' };

const ULTJE = { name: 'Süß & Salzig', brand: 'Ültje', facts: { c: 36, s: 29, f: 5.5, p: 15, fat: 38 }, ingredients: 'Erdnüsse, Zucker, Glukosesirup, Salz' };
const PORRIDGE = { name: 'High Protein Porridge Chocolicious', brand: 'SPORTYFEEL', facts: { c: 47, s: 4, f: 9, p: 30, fat: 7 }, ingredients: 'Haferflocken (55%), Milchprotein, Kakao, Süßungsmittel Sucralose' };
const QUARKCREME = { name: 'High Protein Quarkcreme', brand: 'Milprima', facts: { c: 3.5, s: 3, p: 12, fat: 0.5 }, ingredients: 'Speisequark 50%, Jogurterzeugnis 40%, Erdbeeren 7%, Stärke, Karottenkonzentrat, Süßungsmittel (Acesulfam K, Sucralose), Verdickungsmittel (Johannisbrotkernmehl), Aroma' };
const CHEESEBURGER = { name: 'Cheeseburger', brand: 'X', facts: { c: 28, s: 6, p: 13, fat: 12 }, ingredients: 'Brötchen (Weizenmehl, Wasser, Zucker), Rindfleisch, Käse, Ketchup' };
const BUNS = { name: 'Hamburger Brötchen', brand: 'X', facts: { c: 48, s: 5, p: 9, fat: 5 }, ingredients: 'Weizenmehl, Wasser, Zucker, Hefe' };
const BBQ = { name: 'BBQ Burger Sauce', brand: 'X', facts: { c: 30, s: 27, p: 1, fat: 10 }, ingredients: 'Zucker, Tomatenmark, Essig' };
const SUSHI_RICE = { name: 'Sushi Reis', brand: 'X', facts: { c: 78, s: 0, p: 7, fat: 0.6 }, ingredients: 'Reis' };
const OJ = { name: 'Orangensaft', brand: 'X', facts: { c: 9, s: 9, p: 0.7, fat: 0 }, unit: 'ml' };

test('plain beef patties, nori, plain and high-protein quark and tuna in its own juice are not Skip it', () => {
    for (const p of [BEEF, BEEF_NOING, NORI, NORI_NOING, QUARK, HP_QUARK, TUNA]) {
        assert.notEqual(S.foodVerdict(p), 'spike', p.name + ' (Food check)');
        assert.notEqual(v(p), 'spike', p.name + ' (Shuffle)');
    }
    assert.equal(v(BEEF), 'ok');
});

test('real Skip-its stay Skip it: sweet snacks, sweetened porridge and quark cream, burgers with buns, sugary sauces, buns, rice, juice', () => {
    for (const p of [ULTJE, PORRIDGE, QUARKCREME, CHEESEBURGER, BUNS, BBQ, SUSHI_RICE, OJ]) assert.equal(v(p), 'spike', p.name);
});

test('the policy only drops a name-made starch or juice when the label rules it out', () => {
    const cats = p => P.applyPolicy({ product: p, ingredients: { status: 'complete', complete: true, flags: {}, summary: {}, allergens: [], claims: [], items: String(p.ingredients || '').split(',').map(t => ({ text: t.trim() })) } }).categories;
    const prod = (name, carbs, sugar, ingredients, categories) => ({ name, per100: { carbs, sugar }, ingredients, categories: categories || [] });
    assert.ok(!cats(prod('Frische Hamburger vom Rind', 0, 0, 'Rindfleisch, Salz')).includes('starch_bread'));
    assert.ok(cats(prod('Cheeseburger', 28, 6, 'Brötchen (Weizenmehl), Rindfleisch')).includes('starch_bread'));
    assert.ok(!cats(prod('Sushi Nori', 32, 0, 'Seaweed (100%)')).includes('starch_rice'));
    assert.ok(cats(prod('Sushi Reis', 78, 0, 'Reis')).includes('starch_rice'));
    assert.ok(!cats(prod('Thunfisch in eigenem Saft', 0, 0, 'Thunfisch, Wasser, Salz')).includes('juice'));
    assert.ok(cats(prod('Orangensaft', 9, 9, 'Orangensaft')).includes('juice'));
});

test('a stored spike that an earlier rerate wrote follows the fixed Food check; catch-day verdicts stay never-milder', () => {
    const rerated = Object.assign({}, BEEF, { verdict: 'spike', why: [['c_no']], rerated: true });
    assert.equal(v(rerated), 'ok', 'Shuffle uses the live verdict for rerated rows');
    const rows = [rerated, Object.assign({}, NORI, { verdict: 'spike', why: [['c_no']], rerated: true })];
    assert.equal(S.rerateRows(rows), 2);
    assert.equal(rows[0].verdict, 'ok');
    assert.ok(!JSON.stringify(rows[0].why).includes('c_no'), 'the old Food check reason goes too');
    assert.notEqual(rows[1].verdict, 'spike');
    const catchDay = Object.assign({}, BEEF, { verdict: 'spike', why: [] });
    assert.equal(v(catchDay), 'spike', 'a verdict from the day of the catch is never relaxed');
    const keep = Object.assign({}, ULTJE, { verdict: 'spike', why: [['c_no']], rerated: true });
    assert.equal(v(keep), 'spike');
});

test('Shuffle and Swipe never get a Skip-it product, and each kept-out scan gets a short reason', () => {
    const rows = [BEEF, NORI, QUARK, TUNA, ULTJE, PORRIDGE, QUARKCREME, CHEESEBURGER].map((p, i) => Object.assign({ barcode: String(i + 1), ts: i }, p));
    const sp = SS.split(rows, { rate, mine: rows });
    assert.deepEqual(sp.keep.map(x => x.product.name).sort(), [BEEF, NORI, QUARK, TUNA].map(p => p.name).sort());
    assert.deepEqual(sp.toss.map(x => x.product.name).sort(), [ULTJE, PORRIDGE, QUARKCREME, CHEESEBURGER].map(p => p.name).sort());
    assert.equal(SS.reasonOf(ULTJE, rate), 'rSugar');
    assert.equal(SS.reasonOf(PORRIDGE, rate), 'rSweet');
    assert.equal(SS.reasonOf(QUARKCREME, rate), 'rSweet');
    assert.equal(SS.reasonOf(CHEESEBURGER, rate), 'rStarch');
    const sw = fs.readFileSync(path.join(ROOT, 'swaflo.js'), 'utf8');
    assert.match(sw, /spikeVerdict:S\?S\.verdictOf\(p,X\.rate,X\.rateName\)/, 'Swipe reads the same verdict');
});

test('no Throw-out list on the Shuffle screen: one row that opens a sheet', () => {
    const home = part('function fHomeHTML(){', 'const PV = {};');
    assert.ok(!/>Throw out|'Throw out'|class="ck-toss|id="ckToss/.test(html), 'the old list markup is gone');
    assert.match(home, /fTossHTML\(\)/);
    const row = part('function fTossRowHTML(){', 'const fTossHTML');
    assert.doesNotMatch(row, /<li|<ul|v-spike|\.map\(/, 'the row lists nothing');
    assert.match(row, /data-cktoss="open"/);
    assert.match(html, /k === "open"\) \{ fTossSheet\(\); \}/);
    assert.match(part('function fTossSheet(){', 'function fProductsEmptyHTML'), /sheet\(/);
    assert.doesNotMatch(fs.readFileSync(path.join(ROOT, 'scan-sort-core.js'), 'utf8'), /spike insulin|dispara tu insulina|Spikt wahrscheinlich dein Insulin/);
});

test('no clipping at 390 wide: the row and the sheet rows stay inside the column with ellipsis', () => {
    const rule = sel => { const i = css.indexOf(sel + ' {'); assert(i >= 0, sel); return css.slice(i, css.indexOf('}', i)); };
    const r = rule('#tab-shelf .ck-out-row');
    assert.match(r, /box-sizing: border-box/); assert.match(r, /width: 100%/); assert.match(r, /min-width: 0/); assert.match(r, /backdrop-filter/);
    assert.match(rule('#tab-shelf .ck-out-t'), /min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap/);
    assert.match(rule('.ck-out-sh .ck-out-it'), /min-width: 0/);
    assert.match(rule('.ck-out-sh .ck-out-it b'), /text-overflow: ellipsis/);
    assert.match(rule('.ck-out-sh .ck-out-l'), /width: 100%/);
    assert.match(rule('.ck-out-sh .ck-out-x'), /width: 44px; height: 44px/, '44 pt tap target');
});
