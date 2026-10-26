'use strict';
/* Oct 26, 2026 one ultimate scanner (Emmanuel: "the main page scanner gives me still this old overwhelming preview. Sync them ... So,
   it's one thing, one ultimate scanner."): every camera (Scan, Log meal's Scan, Shop, Kitchen) shows the same compact card
   (shop-scan.js) with ONE verdict, the buttons for where it was opened, a better pick only when the verdict needs one, the Bubble Dex
   catch for a Lower product, and portion / per 100 g / why folded in Details. Runs shop-scan.js against a tiny stub DOM. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const C = require('../shop-scan-core.js');

function stubEl(cls) {
    const kids = [], classes = new Set(cls || []);
    const el = {
        dataset: {}, children: kids, isConnected: true, innerHTML: '',
        classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c), toggle: (c, on) => (on === false || (on === undefined && classes.has(c)) ? classes.delete(c) : classes.add(c)) },
        setAttribute() { }, getAttribute() { return null; }, appendChild(k) { kids.push(k); return k; },
        querySelector(sel) { if (sel === '.ss-card') return kids.find(k => k.className === 'ss-card') || null; return null; },
        querySelectorAll() { return []; }, closest() { return null; }, remove() { }
    };
    return el;
}
function load(dex, extra) {
    const events = [];
    const W = Object.assign({
        LowiShopScanCore: C, LowiDex: dex, LowiLang: { get: () => 'en' }, events,
        addEventListener() { }, dispatchEvent(e) { events.push(e); return true; }, localStorage: { getItem: () => null, setItem() { } }, sessionStorage: { getItem: () => null, setItem() { } },
        setTimeout, clearTimeout, requestAnimationFrame: f => setTimeout(f, 0), performance: { now: () => Date.now() }
    }, extra || {});
    const D = { readyState: 'complete', documentElement: { lang: 'en' }, body: stubEl(), addEventListener() { }, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], createElement: () => stubEl() };
    const ctx = { window: W, document: D, CustomEvent: function (t, o) { this.type = t; this.detail = o && o.detail; }, console, setTimeout, clearTimeout };
    W.window = W; W.document = D; W.CustomEvent = ctx.CustomEvent;
    vm.createContext(ctx);
    vm.runInContext(read('shop-scan.js'), ctx);
    return W;
}
const dexBase = over => Object.assign({
    rate: p => ({ verdict: p.facts && p.facts.s > 20 ? 'spike' : p.facts && p.facts.c > 30 ? 'better' : 'ok', why: ['sugar'] }),
    prep: p => p, view: p => p, stop() { }, scan() { }, shopOn: () => false,
    swap: p => ({ n: 'Plain unsalted peanuts', e: '🥜', ok: false, prod: { name: 'Plain unsalted peanuts', facts: { c: 9, s: 4 }, verdict: 'ok' } }),
    bubbleInfo: p => ({ has: false, label: 'Catch it in a bubble', hasLabel: 'In your Bubble Dex' })
}, over || {});
const chips = { name: 'Erdnuss Flips', brand: 'Mogli', barcode: '4000000000001', verdict: 'spike', why: ['sugar', 'refined'], facts: { c: 55, s: 24, f: 20, p: 10, fib: 3 } };
const skyr = { name: 'Skyr Natur', brand: 'Arla', barcode: '5711953068881', verdict: 'ok', why: ['protein'], facts: { c: 4, s: 4, f: 0, p: 11 } };
const html = W => { const el = W.__el; const c = el.children.find(k => k.className === 'ss-card'); return c ? c.innerHTML : ''; };
function showIn(W, p, o, cls) { const el = stubEl(cls || ['b3-cam']); W.__el = el; W.LowiShopScan.show(el, p, o); return html(W); }
const count = (s, re) => (s.match(re) || []).length;

test('the main page Scan shows the compact card with ONE verdict (no old long sheet, no repeated verdict)', () => {
    const W = load(dexBase());
    assert.equal(typeof W.LowiShopScan.show, 'function', 'LowiShopScan.show exists for typed names and swaps');
    const h = showIn(W, chips, { ctx: 'scan' });
    assert.equal(count(h, /class="ss-verdict/g), 1, 'exactly one verdict');
    assert.equal(count(h, /class="ss-vw"/g), 1, 'the verdict word appears once');
    assert.match(h, /Higher/);
    assert.doesNotMatch(h, /sc-card|b3-card|Buy this instead|Seller Zone|Community deals|Post a deal/, 'none of the old long result');
    assert.match(h, /data-ss="add"/, 'Add to cart'); assert.match(h, /<details class="ss-more">/, 'Details folded');
    assert.doesNotMatch(h, /data-ss="ate"/, 'the Scan tab camera never logs a meal (Oct 21 rule)');
});

test('a Higher product gets ONE better pick, not linked to Seller Zone; tapping Show opens it in the same card', () => {
    const W = load(dexBase());
    let h = showIn(W, chips, { ctx: 'scan' });
    assert.equal(count(h, /class="ss-swap"/g), 1);
    assert.match(h, /Better pick/); assert.match(h, /Plain unsalted peanuts/); assert.match(h, /data-ss="swap"/);
    assert.doesNotMatch(h, /seller|Seller/);
    const h2 = showIn(W, skyr, { ctx: 'scan' });
    assert.doesNotMatch(h2, /ss-swap/, 'a Lower product needs no better pick');
});

test('a Lower product offers the Bubble Dex catch once; already caught says so', () => {
    let W = load(dexBase());
    let h = showIn(W, skyr, { ctx: 'scan' });
    assert.equal(count(h, /data-ss="bubble"/g), 1); assert.match(h, /Catch it in a bubble/);
    W = load(dexBase({ bubbleInfo: () => ({ has: true, label: 'x', hasLabel: 'In your Bubble Dex' }) }));
    h = showIn(W, skyr, { ctx: 'scan' });
    assert.doesNotMatch(h, /data-ss="bubble"/); assert.match(h, /In your Bubble Dex/);
    assert.doesNotMatch(showIn(W, chips, { ctx: 'scan' }), /ss-bub/, 'no bubble for a Higher product');
});

test('opened from Log meal: I ate this is the big first button; shopping keeps Add to cart first', () => {
    const W = load(dexBase());
    const m = showIn(W, skyr, { ctx: 'meal' });
    assert.match(m, /data-ss="ate"/); assert.match(m, /I ate this/);
    assert.ok(m.indexOf('data-ss="ate"') < m.indexOf('<details'), 'before Details');
    assert.doesNotMatch(m, /data-ss="add"/, 'logging a meal is not shopping');
    const s = showIn(W, skyr, { ctx: 'shop' }, ['b3-cam', 'b3-shop']);
    assert.match(s, /class="ss-add" data-ss="add"/); assert.doesNotMatch(s, /data-ss="ate"/);
});

test('the verdict is the one for your usual amount (LowiDex.view), the same the old result used', () => {
    const W = load(dexBase({ view: p => Object.assign({}, p, { verdict: 'better' }) }));
    const h = showIn(W, skyr, { ctx: 'scan' });
    assert.match(h, /ss-v-mild/); assert.match(h, /Moderate|Mild|Medium/i);
});

test('the companion reacts to a scan outside shopping; only the shopping camera counts grocery-hunt catches', () => {
    let W = load(dexBase());
    showIn(W, chips, { ctx: 'scan', code: chips.barcode });
    assert.ok(W.events.some(e => e.type === 'lowi:scan-verdict' && e.detail.verdict === 'spike'));
    assert.ok(!W.events.some(e => e.type === 'lowi:shop-scan'), 'Scan tab is not a shopping trip');
    W = load(dexBase());
    showIn(W, chips, { ctx: 'shop', code: chips.barcode }, ['b3-cam', 'b3-shop']);
    assert.ok(W.events.some(e => e.type === 'lowi:shop-scan'));
    assert.ok(!W.events.some(e => e.type === 'lowi:scan-verdict'), 'shopping stays quiet');
});

test('Details holds the old result\'s portion calculator, barcode and the honest estimate line, once', () => {
    const W = load(dexBase(), { LowiNutriStats: { portionHTML: p => '<section class="sc-sec ns-portion" data-ns-key="k">portion</section>' } });
    const h = showIn(W, chips, { ctx: 'scan' });
    const d = h.slice(h.indexOf('<details'));
    assert.equal(count(d, /ns-portion/g), 1); assert.match(d, />Portion</); // Oct 26 scan-why: "Your portion" was confusing; the header is Portion
    assert.match(d, /4000000000001/); assert.match(d, /not medical advice/);
    assert.equal(count(h, /ns-portion/g), 1, 'portion only inside Details');
});

test('wiring: every camera routes to the compact card; typed names too; new words in English, German and Spanish', () => {
    const ix = read('index.html');
    assert.match(ix, /if \(window\.LowiShopScan\) \{ const now = performance\.now\(\);[^\n]*\n[^\n]*LowiShopScan\.found\(code, CAM\.el, \{ctx:scanCtx\(\)\}\)/);
    assert.doesNotMatch(ix, /if \(CAM\.shop && window\.LowiShopScan\) \{ const now/, 'no longer shopping only');
    assert.match(ix, /function scanCtx\(\)\{ return typeof CAM !== "undefined" && CAM && CAM\.shop \? "shop" : scanForMeal\(\) \? "meal" : "scan"; \}/);
    assert.match(ix, /LowiShopScan\.show\(CAM\.el, p \|\| \{name:q/, 'a typed name in the camera gets the same card');
    assert.match(ix, /prep:scanPrep, view:p => scView\(p, scServing\(p\)\)/);
    assert.match(ix, /function reveal\(p, quiet\)\{\n[^\n]*\n  p = scanPrep\(p\);/, 'reveal and the card share one re-rating');
    assert.match(ix, /async function bubbleProduct\(p\)\{/);
    for (const k of ['ate', 'swapH', 'swapR', 'swapOpen', 'swapShow', 'portion', 'estG', 'packPhoto']) {
        assert.equal(C.TX[k].length, 3, k);
        assert.ok(C.TX[k].every(s => s && !/Misty/.test(s)), k);
    }
    assert.equal(C.tx('ate', 1), 'Hab ich gegessen'); assert.equal(C.tx('swapH', 2), 'Mejor opción');
});

test('the Shop finds note sits under the buttons, never between the verdict and Add to cart (the card is capped by its camera)', () => {
    const g = read('grocery-hunt.js');
    const at = g.indexOf("box.className = 'gh-chip'"); assert.ok(at > 0);
    const tail = g.slice(at, at + 1200);
    assert.match(tail, /querySelector\('\.ss-more'\)[^\n]*insertBefore\(box, more\)/, 'goes in above Details');
    assert.doesNotMatch(tail, /insertBefore\(box, add\)/, 'not above Add to cart');
});
