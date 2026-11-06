/* Oct 19, 2026 (E-man): in Einkaufen a Snacks spot for "Snacks, die ich einkaufen werde" — snacks to buy,
   "nicht die schon bereits drin waren" (never the ones already at home). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const C = require('../store-picks-core.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const sp = read('store-picks.js');

test('add: trims, ignores empty, never twice on the list', () => {
    let l = C.snackAdd([], '  Paprika  ', 1000);
    assert.strictEqual(l.length, 1);
    assert.strictEqual(l[0].n, 'Paprika');
    assert.strictEqual(l[0].got, 0);
    assert.strictEqual(C.snackAdd(l, 'paprika', 2000), l, 'already on the list');
    assert.strictEqual(C.snackAdd(l, '   ', 2000), l);
    l = C.snackAdd(l, 'Nuts', 3000);
    assert.deepStrictEqual(l.map(i => i.n), ['Paprika', 'Nuts']);
    assert.notStrictEqual(l[0].id, l[1].id);
    assert.ok(C.snackAdd([], 'x'.repeat(200), 1)[0].n.length <= 60);
});

test('tick = bought: it leaves the buy list and waits under Again for one tap', () => {
    let l = C.snackAdd(C.snackAdd([], 'Paprika', 1), 'Nuts', 2);
    l = C.snackGot(l, l[0].id, 50);
    let v = C.snackView(l, []);
    assert.deepStrictEqual(v.buy.map(i => i.n), ['Nuts'], 'only what you still need');
    assert.deepStrictEqual(v.again, ['Paprika']);
    l = C.snackAdd(l, 'Paprika', 60);
    v = C.snackView(l, []);
    assert.deepStrictEqual(v.buy.map(i => i.n), ['Nuts', 'Paprika'], 'added again, the bought copy is gone');
    assert.deepStrictEqual(v.again, []);
    assert.strictEqual(l.filter(i => i.n === 'Paprika').length, 1);
    const un = C.snackGot(l, l[0].id, 70);
    assert.ok(un[0].got > 0);
    assert.strictEqual(C.snackGot(un, un[0].id, 80)[0].got, 0, 'tap again = back on the list');
    assert.deepStrictEqual(C.snackDrop(l, l[0].id).map(i => i.n), ['Paprika']);
});

test('Again also offers the snacks you logged in Log meal, never one already on the list', () => {
    const l = C.snackAdd([], 'Nuts', 1);
    const v = C.snackView(l, ['Apple', 'nuts', 'Apple', 'Rice cakes']);
    assert.deepStrictEqual(v.again, ['Apple', 'Rice cakes']);
    assert.strictEqual(C.snackView([], Array.from({ length: 20 }, (_, i) => 'S' + i)).again.length, 6);
    assert.deepStrictEqual(C.snackView(null, null), { buy: [], again: [] });
});

/* Nov 6 2026 (test changed, why): Emmanuel asked why snacks have a place of their own next to the Snacks category ("so that I have the
   things in Warenkorb"). The list keeps its storage (it travels with the account); what is still to buy on it moves into the Cart
   once, logged snacks from Log meal still feed Buy again, and Buy again fills the Cart. Run for real in tests/supermarket-one-list.test.cjs. */
test('the snack list keeps its storage; its snacks, Buy again (with logged snacks) and adding by name are the Cart\'s now', () => {
    assert.match(sp, /const SKEY = 'lowi\.snackBuy\.v1';/);
    assert.match(sp, /l\.slot === 'snack'/, 'logged snacks from Log meal');
    assert.match(sp, /function snacksToCart\(\) \{[\s\S]{0,400}C\.snackGot\(next, i\.id\)/, 'moved once, counted as moved');
    assert.match(sp, /cartUndo = null;\n        snacksToCart\(\);\n        ov = D\.createElement\('div'\);/, 'when Shop opens');
    assert.match(sp, /function againNames\(\) \{ return C\.snackView\(snacks, loggedSnacks\(\)\)\.again\.filter\(n => !inCart\(n\)\); \}/);
    assert.match(sp, /ov\.addEventListener\('submit', onSubmit\);/);
    assert.match(sp, /getAttribute\('data-stp-cart-form'\)/, 'the Cart\'s own add field');
    assert.match(sp, /T\('Add something to the cart', 'Etwas in den Warenkorb legen', 'Añadir algo al carrito'\)/);
    assert.doesNotMatch(sp, /data-stp-snack-qv|stp-snack-qv/, 'a product card has one add button, + Cart');
    assert.match(sp, /if \(qv && qv\.contains\(t\)\) return;/, 'a tap inside an open product card never reaches the list under it');
});
