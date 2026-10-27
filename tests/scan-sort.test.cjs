/* scan-sort (Oct 22, 2026): Cook → Shuffle → Products only uses caught products rated Low-spike or Now and then.
   Anything rated likely spike never reaches Shuffle, the Buy pool or shopping matches: it is listed under Throw out. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const S = require('../scan-sort-core.js');
const K = require('../swaflo-core.js');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const part = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert(i >= 0 && j > i, a); return html.slice(i, j); };

/* the scanner's rate(): label data decides; Cola's stored row says ok but the label says spike */
const rate = p => /cola|gummy/i.test(p.name) ? { verdict: 'spike' } : p.facts && p.facts.c != null ? { verdict: p.facts.c > 20 ? 'spike' : p.facts.c > 10 ? 'better' : 'ok' } : { verdict: 'unknown' };
const rateName = n => /chips|cola/i.test(n) ? { verdict: 'spike' } : /skyr/i.test(n) ? { verdict: 'ok' } : null;
const caught = [
    { name: 'Skyr', barcode: '1', verdict: 'ok', facts: { c: 4 }, cat: 'dairy', img: 'k.jpg' },
    { name: 'Cola', barcode: '2', verdict: 'ok', cat: 'drink', img: 'c.jpg' },
    { name: 'Chips', barcode: '3', verdict: 'unknown', cat: 'snack' },
    { name: 'Oat bar', barcode: '4', verdict: 'better', facts: { c: 15 }, cat: 'snack' },
    { name: 'Gummy bears', barcode: '5', verdict: 'spike', cat: 'sweets', brand: 'Haribo' },
    { name: 'Mystery jar', barcode: '6', cat: 'other' },
    { name: 'Skyr', barcode: '1', verdict: 'ok', facts: { c: 4 } }
];

test('core: likely spike wins over a stale stored verdict, unchecked stays unchecked, the name estimate only fills gaps', () => {
    assert.equal(S.verdictOf(caught[0], rate, rateName), 'ok');
    assert.equal(S.verdictOf(caught[1], rate, rateName), 'spike', 'stored ok, label says spike');
    assert.equal(S.verdictOf(caught[2], rate, rateName), 'spike', 'no label, name estimate says spike');
    assert.equal(S.verdictOf(caught[3], rate, rateName), 'better');
    assert.equal(S.verdictOf(caught[4], () => ({ verdict: 'ok' }), rateName), 'spike', 'stored spike stays spike');
    assert.equal(S.verdictOf(caught[5], rate, rateName), 'unknown');
    assert.equal(S.verdictOf({ name: 'Skyr', verdict: 'spike' }, null, rateName), 'spike');
    assert(S.fits('ok') && S.fits('better') && !S.fits('spike') && !S.fits('unknown'));
});

test('core: split keeps Low-spike and Now and then once each; Throw out holds only likely spikes, your scans first, hidden ones gone', () => {
    const r = S.split(caught, { rate, rateName, mine: ['5'] });
    assert.deepEqual(r.keep.map(x => x.product.name), ['Skyr', 'Oat bar']);
    assert.deepEqual(r.toss.map(x => x.product.name), ['Gummy bears', 'Cola', 'Chips']);
    assert.equal(r.toss[0].mine, true);
    assert.deepEqual(r.unsure.map(x => x.product.name), ['Mystery jar']);
    assert.deepEqual(S.split(caught, { rate, rateName, hidden: ['2'] }).toss.map(x => x.product.name), ['Chips', 'Gummy bears']);
});

test('core: Kept out of Shuffle copy exists in EN, DE and ES, in the scanner\'s words, with no insulin promise', () => {
    assert.equal(S.text('verdict', 'en'), 'Not insulin-friendly');
    assert.equal(S.text('verdict', 'de'), 'Nicht insulinfreundlich');
    assert.equal(S.text('verdict', 'es'), 'No apto para la insulina');
    assert.equal(S.text('row', 'en').replace('{n}', 3), '3 scans kept out of Shuffle');
    for (const k of Object.keys(S.TX)) { assert.equal(S.TX[k].length, 3, k); S.TX[k].forEach(v => assert(v && v.trim(), k)); }
    assert.doesNotMatch(JSON.stringify(S.TX), /bad|shame|guilt|schlecht|malo/i);
    assert.equal(S.TX.line, undefined);
});

function cook(store, list) {
    const ls = { getItem: k => k in store ? store[k] : null, setItem: (k, v) => { store[k] = String(v); } };
    const ctx = { localStorage: ls, JSON, String, Object, Set, Array, R5: { never: [], last: '' }, r5save() {}, R5IC: { shuffle: '', cards: '' }, esc: x => String(x), fPool: () => [], FOOD_IMG: {},
        LowiScanSort: S, LowiDex: { rate, rateName, vtext: v => [{ spike: 'Skip it', ok: 'Low-spike' }[v] || v, ''], state: () => ({ mine: { a: caught[4] } }) },
        LowiDiscovery: { all: () => list || caught, assess: () => ({ category: 'fits' }) }, LowiLang: { get: () => 'en' } };
    ctx.window = ctx;
    vm.runInNewContext(part('const CKK = {', 'function fPool(){') + ';this.api={fSrcPool,fProducts,fTossHTML,fTossListHTML,fProductsEmptyHTML,ckEmptyHTML,fLast};', ctx);
    return ctx.api;
}

test('Cook → Shuffle → Products never draws a likely-spike product', () => {
    const api = cook({ 'lowi.cook.src': 'products' });
    const P = api.fSrcPool();
    assert.equal(JSON.stringify(P.map(x => x.n)), '["Skyr","Oat bar"]');
    assert(P.every(x => x.spikeVerdict === 'ok' || x.spikeVerdict === 'better'));
    assert(!P.some(x => /Cola|Chips|Gummy/.test(x.n)));
    /* a remembered pick that turned out to spike is not shown again */
    const store = { 'lowi.cook.src': 'products', 'lowi.cook.last.products': 'sf-buy:2' };
    assert.equal(cook(store).fLast(), null);
});

test('Shuffle shows one calm row; the likely spikes live in their own sheet with a reason each and one verdict', () => {
    const store = { 'lowi.cook.src': 'products' };
    const h = cook(store).fTossHTML();
    assert.match(h, /id="ckOut"/);
    assert.match(h, /data-cktoss="open"/);
    assert.match(h, />3 scans kept out of Shuffle</);
    assert.doesNotMatch(h, /Gummy bears|Cola|Chips|v-spike|insulin|Throw out/);
    const l = cook(store).fTossListHTML();
    for (const n of ['Gummy bears', 'Cola', 'Chips']) assert.match(l, new RegExp('<b>' + n + '</b>'));
    assert.doesNotMatch(l, /<b>Skyr<\/b>|<b>Oat bar<\/b>|Mystery jar/);
    assert.doesNotMatch(l, /insulin|v-spike/, 'the sheet names the verdict once, not on every row');
    assert.equal((l.match(/data-cktoss="hide"/g) || []).length, 3);
    assert.ok(l.indexOf('Gummy bears') < l.indexOf('Cola'), 'your own scans first');
    /* removed items stay out of the list (and out of Shuffle) */
    store['lowi.cook.tossHidden'] = JSON.stringify(['2']);
    assert.doesNotMatch(cook(store).fTossListHTML(), /<b>Cola<\/b>/);
    assert.match(cook(store).fTossHTML(), />2 scans kept out of Shuffle</);
    assert.equal(JSON.stringify(cook(store).fSrcPool().map(x => x.n)), '["Skyr","Oat bar"]');
    /* other sources have no row */
    assert.equal(cook({ 'lowi.cook.src': 'book' }).fTossHTML(), '');
});

test('all scanned products spike: friendly empty state, no fallback to spiking items', () => {
    const bad = caught.filter(p => /Cola|Chips|Gummy/.test(p.name));
    const api = cook({ 'lowi.cook.src': 'products' }, bad);
    assert.equal(api.fSrcPool().length, 0);
    const e = api.ckEmptyHTML();
    assert.match(e, /No low-spike products to shuffle yet/);
    assert.match(e, /data-cktoss="scan"/);
    assert.match(e, /data-cktoss="book"/);
    assert.doesNotMatch(e, /Cola|Chips|Gummy/);
    assert.match(api.fTossHTML(), />3 scans kept out of Shuffle</);
    assert.match(part('function fHomeHTML(){', 'const PV = {};'), /fProductsEmptyHTML\(\)[^]*fTossHTML\(\)/);
});

test('Buy picks, swap requests and shopping matches for generated recipes skip likely spikes too', () => {
    const ps = [
        { name: 'Plain skyr', brand: 'A', cat: 'dairy', assessmentCategory: 'fits', spikeVerdict: 'ok' },
        { name: 'Sweet skyr drink', brand: 'B', cat: 'dairy', assessmentCategory: 'fits', spikeVerdict: 'spike' },
        { name: 'Skyr mystery', brand: 'C', cat: 'dairy', assessmentCategory: 'fits', spikeVerdict: 'unknown' },
        { name: 'Konjac rice', brand: 'D', cat: 'other', assessmentCategory: 'fits', spikeVerdict: 'better' },
        { name: 'Konjac rice sweet', brand: 'E', cat: 'other', assessmentCategory: 'fits', verdict: 'spike' }
    ];
    assert.deepEqual(K.productPool(ps, { mode: 'buy' }).map(p => p.name), ['Plain skyr']);
    assert.deepEqual(K.resolve('skyr', [], ps, { mode: 'buy' }).products.map(p => p.name), ['Plain skyr']);
    assert.deepEqual(K.shopping({ ing: [{ n: 'Konjac rice' }] }, ps)[0].matches.map(p => p.name), ['Konjac rice']);
    const sw = fs.readFileSync(path.join(__dirname, '../swaflo.js'), 'utf8');
    assert.match(sw, /spikeVerdict:S\?S\.verdictOf\(p,X\.rate,X\.rateName\)/);
});

test('scan-sort-core.js ships: loaded before Swaflo and cached offline', () => {
    assert(html.indexOf('<script src="scan-sort-core.js') >= 0 && html.indexOf('<script src="scan-sort-core.js') < html.indexOf('<script src="swaflo-core.js'));
    const sw = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');
    assert.equal((sw.match(/"scan-sort-core\.js"/g) || []).length, 2);
});
