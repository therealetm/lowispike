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

test('the Shop panel shows Snacks to buy at the top, with its own storage, in three languages', () => {
    assert.match(sp, /const SKEY = 'lowi\.snackBuy\.v1';/);
    assert.strictEqual((sp.match(/'<div class="stp-scroll">' \+ snackHTML\(\) \+/g) || []).length, 2, 'store choice and product list');
    assert.match(sp, /T\('Snacks to buy', 'Snacks zum Einkaufen', 'Snacks para comprar'\)/);
    assert.match(sp, /l\.slot === 'snack'/, 'logged snacks from Log meal');
    assert.match(sp, /ov\.addEventListener\('submit', onSubmit\);/);
    assert.match(sp, /\/\^\(snacks\|sweets\|fruit\)\$\/\.test\(r\.group/, 'snack products can go straight on the list');
    assert.match(sp, /if \(qv && qv\.contains\(t\)\) \{ snackClick\(t\); return; \}/);
});
