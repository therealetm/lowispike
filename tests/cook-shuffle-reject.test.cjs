/* cook-reject (Oct 25, 2026, Emmanuel on Cook > Products: "we have a throwout scanned, but keep out of shuffle. Why do I even see it?
   ... likely spike insulin. Why am I even seeing it?"). Cook is a recommendation page: rejected scans are neither listed there nor
   drawn by Shuffle. Their scan history, the hidden list and the Kitchen are left alone. Also: Shuffle avoids recent repeats when it
   can, a pick whose filled-in label spikes is replaced, Shop it puts a product pick on the list, and a Soon swipe on a product puts it
   in the Kitchen once (Emmanuel: "when they ... go on soon, that adds that to the kitchen"). */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const S = require('../scan-sort-core.js');
const KC = require('../kitchen-core.js');
const SPC = require('../store-picks-core.js');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const part = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert(i >= 0 && j > i, a); return html.slice(i, j); };

/* the screenshot: three photographed products in Throw out next to good ones (names only; the verdicts come from the stored rows) */
const rate = p => p.facts && p.facts.c != null ? { verdict: p.facts.c > 20 ? 'spike' : p.facts.c > 10 ? 'better' : 'ok' } : { verdict: 'unknown' };
const rateName = () => null;
const scans = [
    { name: 'S\u00fc\u00df & Salzig', barcode: '11', verdict: 'spike', img: 'a.jpg' },
    { name: 'Sushi Nori Roasted Seaweed', barcode: '12', verdict: 'spike', img: 'b.jpg' },
    { name: 'High Protein Quarkcreme', barcode: '13', verdict: 'spike', img: 'c.jpg' },
    { name: 'Legacy row', barcode: '14', verdict: 'ok', facts: { c: 40 } },          /* stored ok, label says spike */
    { name: 'Unchecked jar', barcode: '15' },                                          /* unknown: not a pick */
    { name: 'Skyr', barcode: '1', verdict: 'ok', facts: { c: 4 }, img: 'k.jpg' },
    { name: 'Eggs', barcode: '2', verdict: 'ok', facts: { c: 1 } },
    { name: 'Almonds', barcode: '3', verdict: 'better', facts: { c: 12 } },
    { name: 'Tuna', barcode: '4', verdict: 'ok', facts: { c: 0 } }
];
const BAD = /S\u00fc\u00df|Seaweed|Quarkcreme|Legacy|Unchecked/;

function el(tag) {
    return { tag, innerHTML: '', outerHTML: '', dataset: {}, classList: { add() {}, remove() {} }, querySelector: () => null, querySelectorAll: () => [], remove() { this.removed = true; },
        insertAdjacentHTML(_, h) { this.inserted = (this.inserted || '') + h; } };
}
function cook(store, list, extra) {
    const ls = { getItem: k => k in store ? store[k] : null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
    const dom = { '#r5Shuf': el('div'), '#r5Pick': el('div'), '#ckToss': null, '#r5Strip': null, '#r5Stage': null };
    const ctx = Object.assign({ localStorage: ls, JSON, String, Object, Set, Array, Math, Number, Promise, setTimeout: () => 0, console, fetch: () => new Promise(() => {}),
        R5: { never: [], last: '', liked: [], skipped: [], today: [], tinder: [] }, r5save() {}, R5IC: { shuffle: '<svg></svg>', cards: '' }, esc: x => String(x), FOOD_IMG: {},
        RECIPE_BOOK: [], SW: {}, dkNorm() {}, dkSectionHTML: () => '<deck>', fYesHTML: () => '', fHintTxt: () => '', r5$: s => dom[s] || null, navigator: {},
        LowiScanSort: S, LowiDex: { rate, rateName, vtext: v => [{ spike: 'Skip it', ok: 'Low-spike' }[v] || v, ''], whyText: x => x, state: () => ({ mine: {} }) },
        LowiDiscovery: { all: () => list || scans, assess: () => ({ category: 'fits' }) }, LowiLang: { get: () => 'en', t: x => x },
        document: { documentElement: { setAttribute() {} }, querySelector: () => null, addEventListener() {} } }, extra || {});
    ctx.window = ctx; ctx.dom = dom;
    vm.runInNewContext(part('const CKK = {', 'function fPool(){') + part('function fPick(){', '/* ---------- food swipe deck ---------- */') +
        ';this.api={fSrcPool,fProducts,fTossHTML,fTossRepaint,fHomeHTML,fPick,fSaveLast,fLast,fRejected,fProdVerdict,PV};', ctx);
    ctx.api.ctx = ctx;
    return ctx.api;
}

test('Cook > Products renders no Throw out list, no rejected names, no spike line (the screenshot)', () => {
    const api = cook({ 'lowi.cook.src': 'products' });
    let h = '';
    try { h = api.fHomeHTML(); } catch (e) { h = 'THREW ' + e.message; }
    assert.doesNotMatch(h, /THREW/, h);
    assert.doesNotMatch(h, /ckToss|cktoss="hide"|Throw out|keep out of shuffle|likely spike|Aussortieren/i);
    assert.doesNotMatch(h, BAD);
    /* hiding / repainting never inserts the list back under Shuffle, and removes one left over from an older render */
    const old = el('section'); api.ctx.dom['#ckToss'] = old;
    api.fTossRepaint();
    assert.equal(old.removed, true);
    assert.equal(api.ctx.dom['#r5Shuf'].inserted, undefined);
    assert.doesNotMatch(part('function fHomeHTML(){', 'const PV = {};'), /fTossHTML\(\)/);
});

test('nothing is deleted: the scans and the hidden list stay in storage, Throw out data is still computable', () => {
    const store = { 'lowi.cook.src': 'products', 'lowi.cook.toss.hidden': '["x"]' };
    const api = cook(store);
    api.fHomeHTML(); api.fTossRepaint();
    assert.equal(store['lowi.cook.toss.hidden'], '["x"]');
    assert.match(api.fTossHTML(), /Sushi Nori/, 'the data behind Throw out is intact, only Cook stops showing it');
});

test('Shuffle pool and picks: rejected, legacy-ok-but-spiking and unchecked scans never come up', () => {
    const api = cook({ 'lowi.cook.src': 'products' });
    assert.equal(JSON.stringify(api.fSrcPool().map(f => f.n).sort()), '["Almonds","Eggs","Skyr","Tuna"]');
    for (let i = 0; i < 200; i++) { const f = api.fPick(); assert(f && !BAD.test(f.n), f && f.n); api.fSaveLast(f); }
});

test('Shuffle avoids the last picks while enough others exist, and still works with one or two', () => {
    const api = cook({ 'lowi.cook.src': 'products' });
    const seq = []; for (let i = 0; i < 120; i++) { const f = api.fPick(); seq.push(f.id); api.fSaveLast(f); }
    for (let i = 2; i < seq.length; i++) assert(seq[i] !== seq[i - 1] && seq[i] !== seq[i - 2], 'repeat within 2 at ' + i + ': ' + seq.slice(i - 2, i + 1));
    const two = cook({ 'lowi.cook.src': 'products' }, scans.filter(p => /Skyr|Eggs/.test(p.name)));
    const s2 = []; for (let i = 0; i < 10; i++) { const f = two.fPick(); s2.push(f.n); two.fSaveLast(f); }
    for (let i = 1; i < s2.length; i++) assert.notEqual(s2[i], s2[i - 1]);
    const one = cook({ 'lowi.cook.src': 'products' }, scans.filter(p => /Skyr/.test(p.name)));
    for (let i = 0; i < 3; i++) { const f = one.fPick(); assert.equal(f.n, 'Skyr'); one.fSaveLast(f); }
    const none = cook({ 'lowi.cook.src': 'products' }, scans.filter(p => BAD.test(p.name)));
    assert.equal(none.fPick(), null);
});

test('a pick whose filled-in label spikes leaves the pool and is not kept as the pick', async () => {
    const store = { 'lowi.cook.src': 'products' };
    const api = cook(store, null, {});
    const skyr = api.fSrcPool().find(f => f.n === 'Skyr');
    api.ctx.LowiDex.enrich = p => Promise.resolve(Object.assign({}, p, { verdict: 'spike', facts: { c: 30 } }));
    api.ctx.LowiDex.reveal = () => { throw new Error('a rejected product must not open as the pick'); };
    store['lowi.cook.src.last.products'] = skyr.id;
    await api.fProdVerdict(skyr, true);
    assert.equal(api.fRejected(skyr), true);
    assert(!api.fSrcPool().some(f => f.n === 'Skyr'));
    assert.notEqual(store['lowi.cook.src.last.products'], skyr.id);
    const eggs = api.fSrcPool().find(f => f.n === 'Eggs');
    assert.equal(api.fRejected(eggs), false);
});

test('Shop it on a product pick puts it on the shopping list once; Cook it / Shop it keep their recipe paths', () => {
    const hub = part('case "hubshop":', 'case "hubcook":');
    assert.match(hub, /sf-buy:/);
    assert.match(hub, /addIngredients\(\[\{n:p\.name/);
    assert.match(hub, /listOpen/);
    assert.match(hub, /openCart\(id && lcRec\(id\) \? \{recipe:id\} : \{\}\)/);
    assert.match(part('case "hubcook":', '/* cart-escape'), /LowiP2\.open\(id\)/);
});

/* swipe-kitchen */
function deck(store) {
    const ls = { getItem: k => k in store ? store[k] : null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
    const said = [], events = [];
    const ctx = { localStorage: ls, JSON, String, Object, Array, Number, Date, LowiKitchenCore: KC, r5toast: m => said.push(m), ckT: (en) => en,
        CustomEvent: function (n, o) { this.type = n; this.detail = o && o.detail; }, dispatchEvent: e => events.push(e) };
    ctx.window = ctx;
    vm.runInNewContext(part('function dkKitchenSave(', 'function dkDecide(') + ';this.api={dkKitchenAdd,dkKitchenUndo};', ctx);
    return Object.assign(ctx.api, { said, events, store });
}
const prod = n => ({ id: 'sf-buy:' + n, buy: true, n, product: { name: n } });

test('Soon on a product adds it to the Kitchen once with one short line; Undo takes out only what it added', () => {
    const d = deck({});
    const kid = d.dkKitchenAdd(prod('Skyr natur'));
    assert(kid);
    let st = KC.parse(d.store[KC.KEY]);
    assert.equal(JSON.stringify(st.items.map(i => i.n)), '["Skyr natur"]');
    assert.equal(d.said.length, 1); assert.match(d.said[0], /kitchen: Skyr natur/);
    assert.equal(d.events[0].type, 'lowi:kitchen');
    /* no duplicate */
    assert.equal(d.dkKitchenAdd(prod('skyr  NATUR')), '');
    assert.equal(KC.parse(d.store[KC.KEY]).items.length, 1);
    assert.match(d.said[1], /Already in your kitchen/);
    /* undo of the duplicate swipe (no kid) keeps it; undo of the adding swipe removes it */
    d.dkKitchenUndo('');
    assert.equal(KC.parse(d.store[KC.KEY]).items.length, 1);
    d.dkKitchenUndo(kid);
    assert.equal(KC.parse(d.store[KC.KEY]).items.length, 0);
    /* recipes are not stock */
    assert.equal(d.dkKitchenAdd({ id: 'b:1', book: true, n: 'Carbonara' }), '');
    assert.equal(KC.parse(d.store[KC.KEY]).items.length, 0);
    /* something already at home stays one entry */
    const d2 = deck({ [KC.KEY]: JSON.stringify(KC.add(null, 'Eggs', 1, 'me')) });
    assert.equal(d2.dkKitchenAdd(prod('Eggs')), '');
    assert.equal(KC.parse(d2.store[KC.KEY]).items.length, 1);
});

test('the deck wires Soon to the Kitchen for products only, Undo to the Kitchen undo, and keeps Undo history across re-renders', () => {
    const dec = part('function dkDecide(', 'function dkUndo(');
    assert.match(dec, /dir === "right" \? dkKitchenAdd\(fById\(id\)\)/);
    assert.match(dec, /DK\.hist\.push\(\{id, dir, kid\}\)/);
    assert.match(dec, /LowiAte\.offer\(id\)/, 'the ate-this offer stays');
    assert.match(part('function dkUndo(', '// four-way drag'), /dkKitchenUndo\(h\.kid\)/);
    const sync = part('function dkSync(', 'function dkDecide(');
    const m = sync.match(/DK\.hist = DK\.hist\.filter\(([^;]*)\);/); assert(m, 'hist filter');
    const keep = vm.runInNewContext('(have => [{id:"a",dir:"right"},{id:"b",dir:"left"}].filter(' + m[1] + '))(new Set(["a"]))');
    assert.equal(keep.length, 1, 'hist entries are {id, dir} objects and must survive a re-render');
});

test('shop-range lane: sweet drinks filed under sweets/snacks are not low-spike picks; sauces and plain drinks stay', () => {
    const real = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/shop/rewe.json'), 'utf8'));
    const names = S.catalog(real, SPC, { range: 'rewe', max: 5000 }).map(p => p.name);
    assert(!names.includes('Bubble Pop Sunny Peach'), 'Bubble Pop: 8.8 g sugar per 100 ml');
    assert(!names.includes('Nesquik Kakao'), 'ready-made cocoa: 7.3 g sugar per 100 ml');
    assert(names.some(n => /Remoulade/.test(n)), 'sauces are used by the spoon and keep their rating');
    assert(names.length > 100, 'the lane still fills up');
});
