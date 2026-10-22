'use strict';
/* Regression (Oct 22, 2026, Seven: "I clicked ... and now this window, 'Your pick: No low-spike products to shuffle yet'"):
   Cook > Products > Shuffle drew only from the person's own and community catches, so it came out empty, and the empty card
   carried the "in" class that pops a result up as the "Your pick" sheet on phones. Now the built-in shop range feeds Products
   (low-spike only), the empty state never pops up as a pick, and it only shows once the range has loaded and is still empty. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const S = require('../scan-sort-core.js');
const C = require('../store-picks-core.js');
const K = require('../spike-core.js');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const part = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert(i >= 0 && j > i, a); return html.slice(i, j); };
const range = f => JSON.parse(fs.readFileSync(path.join(__dirname, '../data/shop/' + f + '.json'), 'utf8'));
const rate = p => K.assess(p);

test('core: every shop range gives plenty of low-spike products with a real label, no pork, no sweetened zero', () => {
    for (const f of ['rewe', 'edeka', 'lidl', 'aldi', 'kaufland', 'netto', 'penny', 'salling']) {
        const list = S.catalog(range(f), C, { range: f });
        assert(list.length >= 100, f + ' ' + list.length);
        const keep = S.split(list, { rate }).keep;
        assert(keep.length >= 100, f + ' keep ' + keep.length);
        assert(list.every(p => p.name && typeof p.facts.c === 'number' && p.catalog && p.verdict === 'ok'), f);
        assert(!list.some(p => /schwein|bacon|fl\u00e6sk|lonza|\bzero\b/i.test(p.name)), f);
    }
    assert.deepEqual(S.catalog(null, C), []);
    assert.deepEqual(S.catalog(range('famila'), null), []);
});

function cook(store, caught, cat) {
    const ls = { getItem: k => k in store ? store[k] : null, setItem: (k, v) => { store[k] = String(v); } };
    const ctx = { localStorage: ls, JSON, String, Object, Set, Array, Math, Promise, console, R5: { never: [], liked: [], skipped: [], last: '' }, r5save() {}, R5IC: { shuffle: '', cards: '' },
        esc: x => String(x), fPool: () => [], FOOD_IMG: {}, dkNorm() {}, r5$: () => null,
        LowiScanSort: S, LowiDex: { rate, rateName: () => null, vtext: v => [v, ''], state: () => ({ mine: {} }) },
        LowiDiscovery: { all: () => caught, assess: () => ({ category: 'fits' }) }, LowiLang: { get: () => 'en' } };
    ctx.window = ctx;
    vm.runInNewContext(part('const CKK = {', 'function fPool(){') + part('function fPick(){', 'function fHomeHTML(){') +
        ';this.api={fSrcPool,fProductsEmptyHTML,ckEmptyHTML,ckCatPending,fPick,setCat(l,r){CKCAT.list=l;CKCAT.range=r;},fail(){CKCAT.failed=true;}};', ctx);
    if (cat) ctx.api.setCat(cat, 'rewe');
    return ctx.api;
}

test('Cook > Products > Shuffle with no low-spike catches shuffles the shop range and lands on a real pick', () => {
    const cat = S.catalog(range('rewe'), C, { range: 'rewe' });
    const spiky = [{ name: 'Cola', barcode: '2', verdict: 'spike', cat: 'drink' }];
    const empty = cook({ 'lowi.cook.src': 'products' }, spiky);
    assert.equal(empty.fSrcPool().length, 0);
    assert.equal(empty.ckCatPending(), true, 'before the range loads the empty card is not shown');
    const api = cook({ 'lowi.cook.src': 'products' }, spiky, cat);
    assert.equal(api.ckCatPending(), false);
    const P = api.fSrcPool();
    assert(P.length >= 100, 'pool ' + P.length);
    assert(P.every(x => x.buy && x.catalog && (x.spikeVerdict === 'ok' || x.spikeVerdict === 'better')));
    assert(!P.some(x => /Cola/.test(x.n)));
    const f = api.fPick();
    assert(f && f.n && /^sf-buy:/.test(f.id));
});

test('your own and community low-spike catches stay in the pool next to the shop range and still come up', () => {
    const cat = S.catalog(range('rewe'), C, { range: 'rewe' });
    const caught = [{ name: 'My Skyr', barcode: '99887766', verdict: 'ok', facts: { c: 4, s: 4, f: 0, p: 11, fat: 0.2 }, ingredients: 'Magermilch' }];
    const api = cook({ 'lowi.cook.src': 'products' }, caught, cat);
    const P = api.fSrcPool();
    assert(P.some(x => x.n === 'My Skyr' && !x.catalog));
    let hit = 0; for (let i = 0; i < 400; i++) if (api.fPick().n === 'My Skyr') hit++;
    assert(hit > 100, 'own catch picked ' + hit + ' of 400');
});

test('the empty state is never a Your pick sheet, and only shows when the range failed or is truly empty', () => {
    const api = cook({ 'lowi.cook.src': 'products' }, []);
    assert.doesNotMatch(api.fProductsEmptyHTML(), /class="r5-card in/);
    assert.match(api.ckEmptyHTML(), /ck-pempty/);
    api.fail();
    assert.equal(api.ckCatPending(), false);
    assert.match(part('function fShuffle(instant){', 'const f = fPick();'), /ckCatPending\(\)[^]*ckCatLoad\(\)\.then/);
    assert.match(part('function fHomeHTML(){', 'const PV = {};'), /!ckCatPending\(\) \? fProductsEmptyHTML\(\)/);
    assert.match(html, /card\.classList\.contains\("in"\) && openKey !== "pick"/);
});
