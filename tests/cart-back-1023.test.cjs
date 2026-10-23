'use strict';
/* Bug hunt 23 Oct 2026: swipe back (Safari) on Shop it left Shop it open, closed Cook for Home under it, and the next back
   left the app. Back sends Escape, and nothing closed the Shop it screen (#lsCart) or its in-store list (#lcShop) on Escape.
   Also: section-nav.js closed Cook when back-swipe.js's Escape had already closed the top layer on the same back, and the
   sheetwrap Escape counted the closed in-store list (aria-modal) as a layer above every sheet. Runs the real code. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function cartBlock() {
    const m = html.match(/\/\* cart-escape:[\s\S]*?\/\* \/cart-escape \*\//);
    assert.ok(m, 'index.html has the cart-escape block');
    return m[0];
}

/* hit: what the middle of the screen hits: 'cart', 'shop', 'sheet' (a #sheetwrap sheet, z 45), 'under' (Cook, z 0) */
function make({ cart = true, shop = false, hit = 'cart' } = {}) {
    const mk = (id, z, open) => { const cls = new Set(open ? ['open'] : []); return { id, z, classList: { contains: c => cls.has(c), remove: c => cls.delete(c), add: c => cls.add(c) }, contains: t => t === el[id] || (t && t.in === id), parentElement: null }; };
    const app = { id: 'app' };
    const el = {};
    el.lsCart = mk('lsCart', 40, cart); el.lcShop = mk('lcShop', 41, shop);
    const sheet = mk('sheetwrap', 45, true), under = mk('tab-shelf', 0, false);
    [el.lsCart, el.lcShop, sheet, under].forEach(e => { e.parentElement = app; });
    const node = { cart: { in: 'lsCart', parentElement: el.lsCart }, shop: { in: 'lcShop', parentElement: el.lcShop }, sheet: { parentElement: sheet }, under: { parentElement: under } };
    const L = { cap: [], bub: [] }, st = { cartCloses: 0, shopCloses: 0 };
    const document = { body: { id: 'body' }, getElementById: id => (id === 'app' ? app : el[id] || null), elementFromPoint: () => node[hit] };
    const ctx = {
        document, innerWidth: 390, innerHeight: 664,
        getComputedStyle: e => ({ zIndex: String(e.z != null ? e.z : 'auto') }),
        addEventListener: (t, f, cap) => { if (t === 'keydown') (cap ? L.cap : L.bub).push(f); },
        closeCart: () => { st.cartCloses++; el.lsCart.classList.remove('open'); el.lcShop.classList.remove('open'); },
        lcShopClose: () => { st.shopCloses++; el.lcShop.classList.remove('open'); },
    };
    vm.runInNewContext(cartBlock(), ctx);
    const esc = () => { const e = { key: 'Escape', defaultPrevented: false, stopped: false, preventDefault() { this.defaultPrevented = true; }, stopImmediatePropagation() { this.stopped = true; } }; for (const f of L.cap) { f(e); if (e.stopped) break; } return e; };
    return { st, el, esc };
}

test('back on Shop it closes Shop it and stops there (the Shuffle pick under it stays)', () => {
    const a = make();
    const e = a.esc();
    assert.strictEqual(a.st.cartCloses, 1);
    assert.ok(e.defaultPrevented && e.stopped, 'no other Escape handler closes a second layer');
    assert.strictEqual(a.el.lsCart.classList.contains('open'), false);
});

test('back in the in-store list closes only the list, the next back closes Shop it', () => {
    const a = make({ shop: true, hit: 'shop' });
    a.esc();
    assert.strictEqual(a.st.shopCloses, 1); assert.strictEqual(a.st.cartCloses, 0);
    assert.strictEqual(a.el.lsCart.classList.contains('open'), true);
});

test('a sheet over Shop it closes on its own: Shop it stays', () => {
    const a = make({ hit: 'sheet' });
    const e = a.esc();
    assert.strictEqual(a.st.cartCloses, 0); assert.strictEqual(e.defaultPrevented, false); assert.strictEqual(e.stopped, false);
});

test('Shop it still sliding in (the hit goes to Cook below it) still closes on back', () => {
    const a = make({ hit: 'under' });
    a.esc();
    assert.strictEqual(a.st.cartCloses, 1);
});

test('Escape with Shop it closed does nothing', () => {
    const a = make({ cart: false, hit: 'under' });
    const e = a.esc();
    assert.strictEqual(a.st.cartCloses + a.st.shopCloses, 0); assert.strictEqual(e.stopped, false);
});

/* back-swipe.js: closed(e) says whether this back's Escape closed a layer; a page class added by any key press does not count */
function bs({ closes = true } = {}) {
    const SRC = fs.readFileSync(path.join(ROOT, 'back-swipe.js'), 'utf8');
    const st = { open: 1, htmlCls: 'a' };
    const listeners = {};
    const history = { state: null, pushState(s) { this.state = s; }, back() { } };
    const D = {
        documentElement: { get className() { return st.htmlCls; } }, body: { className: '' }, activeElement: null,
        querySelector: q => (q === '.tab.active' ? { id: 'tab-shelf' } : null),
        querySelectorAll: q => ({ length: /\.on, \.open, \[open\]/.test(q) ? st.open : 0 }),
        addEventListener(t, f) { (listeners['d:' + t] = listeners['d:' + t] || []).push(f); },
        dispatchEvent(e) { if (e.key === 'Escape') { st.htmlCls = 'a nm-f'; if (closes) st.open = 0; } return true; },
    };
    const W = { history, document: D, LowiSections: { close() { } }, addEventListener(t, f) { (listeners['w:' + t] = listeners['w:' + t] || []).push(f); } };
    vm.runInNewContext(SRC, { window: W, document: D, history, KeyboardEvent: function (t, o) { return Object.assign({ type: t }, o); }, setTimeout: () => { } });
    const e = { state: null };
    (listeners['w:popstate'] || []).forEach(f => f(e));
    return { e, closed: W.LowiBackSwipe.closed };
}

test('back-swipe: a back whose Escape closed a layer is reported to section-nav', () => {
    const a = bs({ closes: true });
    assert.strictEqual(a.closed(a.e), true);
    assert.strictEqual(a.closed({}), false, 'only that back');
});

test('back-swipe: a key press class on the page alone is not a closed layer', () => {
    const a = bs({ closes: false });
    assert.strictEqual(a.closed(a.e), false);
});

test('section-nav keeps the section when back-swipe already closed the top layer, and counts Shop it as a sheet', () => {
    const src = fs.readFileSync(path.join(ROOT, 'section-nav.js'), 'utf8');
    const pop = src.slice(src.indexOf('function onPop('), src.indexOf('function openSheet('));
    const i = pop.indexOf('B0.closed(e)'), j = pop.indexOf('if (openSheet())');
    assert.ok(i > 0 && j > i, 'the closed check runs before the sheet check');
    assert.match(pop.slice(i, i + 160), /pushState\(\{ lowiSec: tabOf\(\) \}/);
    assert.match(src, /#lsCart\.open, #lcShop\.open/);
});

test('the sheetwrap Escape does not count the closed in-store list as a layer above the sheet', () => {
    const m = html.match(/\/\* sheetwrap-escape:[\s\S]*?\/\* \/sheetwrap-escape \*\//);
    assert.ok(m);
    assert.match(m[0], /:not\(#lcShop\)'/);
});
