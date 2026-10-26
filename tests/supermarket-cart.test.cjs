'use strict';
/* Oct 26, 2026 (Emmanuel, MAYA-HANDOFF 0.22: "Remove Seller Zone in Supermarket. Seller Zone has its own section ... What we can
   add here is Einkaufswagen, basically Warenkorb"). The Seller Zone strip is gone from inside the Supermarket tab (Seller Zone keeps
   its own tab). The Supermarket gets a Cart (EN Cart, DE Warenkorb, ES Carrito): a button with the count, a sheet with photo,
   store, quantity - n +, an estimated total only from prices people reported, Go shopping / Scan in the shop / Ask for a hand.
   The Cart is the same list as the shopping list (cart-core.js over LOWI_SHELF), never a second list.
   Browser check (real taps, iPhone 13 WebKit, en/de/es): tools/supermarket-cart/check.cjs. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const sp = read('store-picks.js');
const fnBody = (src, name) => { const i = src.indexOf('function ' + name + '('); assert.ok(i >= 0, name + ' exists'); const j = src.indexOf('\n    }\n', i); return src.slice(i, j); };

test('cart-core: lines are the items still to buy, quantities default to 1, the total only counts reported prices', () => {
    const C = require('../cart-core.js');
    const list = [
        { id: 'a', n: 'Skyr', e: '\u{1F95B}', s: 'lidl', p: 1.29, q: 2, done: false },
        { id: 'b', n: 'Oats', e: '\u{1F33E}', s: 'any', p: null, done: false },
        { id: 'c', n: 'Apples', s: 'aldi', p: 2.5, done: true },
        { id: 'd', n: '  ', done: false }
    ];
    const ls = C.lines(list, id => ({ lidl: 'Lidl', aldi: 'Aldi' })[id]);
    assert.deepEqual(ls.map(l => [l.id, l.q, l.store, l.p]), [['a', 2, 'Lidl', 1.29], ['b', 1, '', null]]);
    assert.equal(C.count(list), 3);
    assert.deepEqual(C.total(list), { sum: 2.58, priced: 1, all: 2, complete: false });
    assert.deepEqual(C.total([]), { sum: 0, priced: 0, all: 0, complete: false });
    assert.equal(C.total([list[0]]).complete, true);
});

test('cart-core: setQty changes a line in place, 0 takes it out, bought items and unknown ids are left alone, max 99', () => {
    const C = require('../cart-core.js');
    const list = [{ id: 'a', n: 'Skyr', q: 1, done: false }, { id: 'c', n: 'Apples', done: true }];
    assert.equal(C.setQty(list, 'a', 3), 'set'); assert.equal(list[0].q, 3);
    assert.equal(C.setQty(list, 'a', 500), 'set'); assert.equal(list[0].q, 99);
    assert.equal(C.setQty(list, 'c', 2), null); assert.equal(list[1].q, undefined);
    assert.equal(C.setQty(list, 'zz', 2), null);
    assert.equal(C.setQty(list, 'a', 0), 'removed'); assert.deepEqual(list.map(i => i.id), ['c']);
    assert.match(C.money(2.58, 'de'), /2,58/); assert.match(C.money(2.58, 'en'), /2\.58/);
});

test('the app loads cart-core and LOWI_SHELF exposes cartLines / cartTotal / setQty over the same list (saved)', () => {
    const html = read('index.html');
    assert.match(html, /<script src="cart-core\.js\?v=[^"]+"><\/script>/);
    assert.match(read('sw.js'), /STATIC\.push\("cart-core\.js"\)/);
    assert.match(html, /cartLines:\(\) => window\.LowiCartCore \? LowiCartCore\.lines\(SH\.list/);
    assert.match(html, /setQty:\(id, q\) => \{[^}]*LowiCartCore\.setQty\(SH\.list, id, q\)[^}]*if \(r\) shSave\(\)/);
});

test('Supermarket tab: no Seller Zone strip inside it any more; the Cart button replaces the Shopping list pill', () => {
    const acts = fnBody(sp, 'shopActs');
    assert.doesNotMatch(acts, /LowiSellerZone|stripHTML|entryHTML/, 'Seller Zone lives in its own tab, not in the Supermarket');
    assert.match(acts, /cartBtnHTML\(\)/);
    assert.doesNotMatch(acts, /stp-mylist/);
    const btn = fnBody(sp, 'cartBtnHTML');
    assert.match(btn, /T\('Cart', 'Warenkorb', 'Carrito'\)/);
    assert.match(btn, /data-stp="cart"/);
    assert.match(btn, /stp-cart-n/);
    assert.match(sp, /if \(a === 'cart'\) \{ openCart\(\); return; \}/);
    assert.match(fnBody(sp, 'tabsHTML'), /b\('sz', /, 'Seller Zone keeps its own tab');
});

test('Cart sheet: quantities, honest estimate, empty state and the three ways on, all in en/de/es', () => {
    const h = fnBody(sp, 'cartHTML');
    assert.match(h, /data-stp-cq=/); assert.match(h, /data-stp-cd="-1"/); assert.match(h, /data-stp-cd="1"/);
    assert.match(h, /T\('Estimated total', 'Geschätzte Summe', 'Total estimado'\)/);
    assert.match(h, /From prices people reported on the shelf/);
    assert.match(h, /have no price yet/);
    assert.match(h, /no price reported yet', 'noch kein Preis gemeldet', 'aún sin precio'/);
    assert.match(h, /Your cart is empty/);
    assert.match(h, /same list as your shopping list/);
    assert.match(h, /data-stp="mylist"/); assert.match(h, /data-stp="scanshop"/); assert.match(h, /data-stp="gift"/);
    assert.match(h, /role="dialog" aria-modal="true"/);
    assert.doesNotMatch(h, /Math\.random|rating|\u2605/, 'no invented prices or ratings');
});

test('product sheet: "+ Cart" / "+ Warenkorb" / "+ Carrito" and the confirmation says cart, never bucket', () => {
    assert.match(sp, /T\('\+ Cart', '\+ Warenkorb', '\+ Carrito'\)/);
    assert.match(sp, /T\('✓ In your cart', '✓ Im Warenkorb', '✓ En tu carrito'\)/);
    assert.doesNotMatch(fnBody(sp, 'quickHTML') + fnBody(sp, 'qvCart') + fnBody(sp, 'cartHTML'), /bucket|Einkaufswagen/i);
    assert.match(read('gift-basket.js'), /T\('From your cart', 'Aus deinem Warenkorb', 'De tu carrito'\)/);
});

test('Cart sheet opens Give a hand on "I could use a hand" (openPanel takes a start tab)', () => {
    assert.match(sp, /W\.LowiGiftBasket\.open\('shop', 'mine'\)/);
    assert.match(read('gift-basket.js'), /function openPanel\(from, startTab\) \{[\s\S]{0,120}if \(startTab === 'mine' \|\| startTab === 'give'\) tab = startTab;/);
});
