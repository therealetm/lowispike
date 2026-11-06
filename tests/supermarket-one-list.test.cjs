'use strict';
/* Nov 6 2026 Supermarket redesign (Emmanuel, voice + screenshot of Einkaufen > Supermarkt: "Why do we have a special place for snacks
   and then a snacks button? ... not giving iOS 17, minimalistic, convenient, organized ... I'm going grocery shopping and I'm sitting at
   home ... so that I have the things in Warenkorb ... the interface was so annoying and just so inconvenient").
   One list: the separate snack list ("Meine Snackliste" next to the Snacks chip and the Snacks & Nüsse section) is gone. What was
   still on it moves into the Cart (Warenkorb) once and counts as moved; Buy again (recent snacks, also the ones logged in Log meal)
   and adding something by name are in the Cart. The look: store and Cart in one row, each category one inset list, compact rows,
   the category bar stays on top while the list scrolls. The real functions run here against a fake shopping list.
   Browser walk-through (local site, network blocked): tools/check-supermarket-one-list.cjs. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const SP = read('store-picks.js'), CSS = read('store-picks.css');
const C = require('../store-picks-core.js');
const Q = require('../quick-add-core.js');
function fnSrc(s, sig) {
    const i = s.indexOf(sig); assert.ok(i >= 0, 'missing ' + sig);
    let d = 0; const j = s.indexOf('{', i);
    for (let k = j; k < s.length; k++) { if (s[k] === '{') d++; else if (s[k] === '}') { d--; if (!d) return s.slice(i, k + 1); } }
    throw new Error('unclosed ' + sig);
}
const FNS = ['function saveSnacks(next)', 'function loggedSnacks()', 'function cartAdd(name)', 'function qaLines()', 'function inCart(name)', 'function snacksToCart()',
    'function againNames()', 'function cartAgainHTML()', 'function cartAddForm()', 'function repaintCart(focusSel)', 'function cartAgain(t)', 'function onSubmit(e)', 'function numbers(it)'];
/* a shopping list like LOWI_SHELF: one line per name (a second add of the same name adds nothing), setQty 0 takes a line out */
function fakeShelf(start) {
    let n = 0; const lines = (start || []).map(x => Object.assign({ id: 'L' + (++n), q: 1 }, x));
    return {
        lines, listOpen: () => lines, dropList() { },
        addIngredients(items) { let added = 0; items.forEach(i => { if (!lines.some(l => Q.norm(l.n) === Q.norm(i.n))) { lines.push({ id: 'L' + (++n), n: i.n, q: 1 }); added++; } }); return added; },
        setQty(id, q) { const k = lines.findIndex(l => l.id === id); if (k < 0) return null; if (!(q >= 1)) { lines.splice(k, 1); return 'removed'; } lines[k].q = q; return 'set'; },
        cartLines: () => lines.map(l => Object.assign({}, l))
    };
}
function load(o) {
    o = o || {};
    const store = { 'lowi.snackBuy.v1': JSON.stringify(o.snacks || []) };
    const shelf = 'shelf' in o ? o.shelf : fakeShelf();
    const ctx = {
        C, Q, SKEY: 'lowi.snackBuy.v1', snacks: JSON.parse(store['lowi.snackBuy.v1']), cartUndo: null, qv: null, cartOpen: false, ov: null,
        localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = String(v); } },
        W: { LowiVitalsBridge: { state: () => ({ logs: o.logs || [] }) } },
        shelf: () => shelf, T: (en) => en, esc: s => String(s), dec: n => String(Math.round(n * 10) / 10),
        cartHTML: () => '<cart>' + ctx.cartAgainHTML() + ctx.cartAddForm() + '</cart>', cartBtnHTML: () => '', kitSubmit() { }, findPlace() { }
    };
    vm.createContext(ctx);
    /* the module's own let bindings, then the real functions */
    vm.runInContext('var snacks = this.snacks, cartUndo = null, qv = null, cartOpen = false, ov = null;\n' + FNS.map(f => fnSrc(SP, '    ' + f)).join('\n') +
        '\nthis.state = () => ({ snacks, cartUndo }); this.setQv = v => { qv = v; cartOpen = !!v; };', ctx);
    return { ctx, store, shelf };
}
const tap = attr => ({ closest: sel => sel.split(',').some(p => p.includes(attr)) ? { hasAttribute: a => a === attr } : null });

test('opening Shop moves what was still on the snack list into the Cart once; the list keeps every snack, marked as moved', () => {
    const { ctx, store, shelf } = load({ snacks: [{ id: 's1', n: 'Paprika', at: 1, got: 0 }, { id: 's2', n: 'Nuts', at: 2, got: 0 }, { id: 's3', n: 'Rice cakes', at: 3, got: 5 }], shelf: fakeShelf([{ n: 'nuts' }]) });
    assert.equal(ctx.snacksToCart(), 2, 'both to-buy snacks are in the Cart now (Nuts was already there)');
    assert.deepEqual(shelf.lines.map(l => l.n), ['nuts', 'Paprika'], 'never a second Nuts line');
    const saved = JSON.parse(store['lowi.snackBuy.v1']);
    assert.deepEqual(saved.map(i => i.n), ['Paprika', 'Nuts', 'Rice cakes'], 'nothing is deleted from the saved list');
    assert.ok(saved.every(i => i.got > 0), 'all counted as moved or bought');
    assert.equal(ctx.snacksToCart(), 0, 'a second open moves nothing');
    assert.equal(shelf.lines.length, 2);
    const none = load({ snacks: [{ id: 's1', n: 'Paprika', at: 1, got: 0 }], shelf: null });
    assert.equal(none.ctx.snacksToCart(), 0, 'no shopping list: nothing moves');
    assert.equal(JSON.parse(none.store['lowi.snackBuy.v1'])[0].got, 0, 'and nothing is marked');
});

test('Buy again offers recent snacks (bought or logged in Log meal) that are not in the Cart, as one row, and fills the Cart in one tap', () => {
    const { ctx, shelf } = load({ snacks: [{ id: 's3', n: 'Rice cakes', at: 3, got: 5 }, { id: 's4', n: 'Olives', at: 4, got: 9 }], logs: [{ slot: 'snack', t: 'Apple' }, { slot: 'lunch', t: 'Soup' }, { slot: 'snack', t: 'olives' }], shelf: fakeShelf([{ n: 'Olives' }]) });
    assert.deepEqual(ctx.againNames(), ['Rice cakes', 'Apple'], 'Olives is already in the Cart; lunch is not a snack');
    const h = ctx.cartAgainHTML();
    assert.match(h, /^<button type="button" class="stp-again" data-spend="1" data-stp-snack-refill="1" aria-label="Buy again: put your 2 recent snacks in the cart: Rice cakes, Apple">/);
    assert.match(h, /<small>Rice cakes · Apple<\/small>/); assert.match(h, /Add 2<\/span><\/button>$/);
    ctx.setQv({ innerHTML: '', querySelector: () => null });
    assert.equal(ctx.cartAgain(tap('data-stp-snack-refill')), true);
    assert.deepEqual(shelf.lines.map(l => l.n), ['Olives', 'Rice cakes', 'Apple']);
    const done = ctx.cartAgainHTML();
    assert.match(done, /<b>2 recent snacks are in your cart<\/b>/);
    assert.match(done, /<button type="button" class="stp-again-undo" data-spend="1" data-stp-snack-undo="1">Undo<\/button>/);
    ctx.cartAgain(tap('data-stp-snack-undo'));
    assert.deepEqual(shelf.lines.map(l => l.n), ['Olives'], 'Undo takes exactly those two back out; what was there stays');
    assert.equal(ctx.state().cartUndo, null);
    assert.match(ctx.cartAgainHTML(), /Add 2/, 'and offers them again');
    assert.equal(load({ shelf: fakeShelf() }).ctx.cartAgainHTML(), '', 'nothing recent: no row');
});

test('adding something by name puts it in the Cart; an empty field does nothing; it ends a pending Undo', () => {
    const { ctx, shelf } = load({ snacks: [{ id: 's3', n: 'Rice cakes', at: 3, got: 5 }] });
    ctx.setQv({ innerHTML: '', querySelector: () => null });
    ctx.cartAgain(tap('data-stp-snack-refill'));
    assert.ok(ctx.state().cartUndo);
    let prevented = 0;
    const submit = v => ctx.onSubmit({ target: { getAttribute: a => (a === 'data-stp-cart-form' ? '1' : null), querySelector: () => ({ value: v }) }, preventDefault: () => prevented++ });
    submit('  Bell pepper  ');
    assert.deepEqual(shelf.lines.map(l => l.n), ['Rice cakes', 'Bell pepper']);
    assert.equal(ctx.state().cartUndo, null);
    submit('   ');
    assert.equal(shelf.lines.length, 2); assert.equal(prevented, 2, 'the page never reloads');
    assert.match(ctx.cartAddForm(), /^<form class="stp-snack-add stp-cart-add" data-stp-cart-form="1"><input type="text" name="item" maxlength="60"/);
    assert.match(SP, /const id = b\.getAttribute\('data-stp-cq'\), d = \+b\.getAttribute\('data-stp-cd'\) \|\| 0;\n        cartUndo = null;/, 'a quantity change ends a pending Undo');
});

test('a row in the list says only the portion and the numbers; a left-out row keeps its whole reason', () => {
    const { ctx } = load();
    assert.equal(ctx.numbers({ r: { carbs: 0.5, sugar: 0.4, protein: 7, fibre: 8.9, serve: 30, unit: 'g' } }), '30 g: 0.5 g carbs · 7 g protein · 8.9 g fibre');
    assert.equal(ctx.numbers({ r: { carbs: 4, sugar: 4, protein: 1, fibre: 0, serve: 150, unit: 'g' } }), '150 g: 4 g carbs · 4 g sugar');
    assert.match(SP, /<span class="stp-why">' \+ esc\(failed \? reason\(it\) : numbers\(it\)\) \+ '<\/span>/);
});

test('the look: store and Cart in one row (the question stays for VoiceOver), inset lists, sticky categories, 44 pt targets', () => {
    const list = SP.slice(SP.indexOf('    function listHTML(state, err) {'), SP.indexOf('    function paint(state) {'));
    assert.match(list, /<div class="stp-head stp-head-list"><h3 class="sr-only">' \+ esc\(T\('What can I buy here\?', 'Was kann ich hier kaufen\?', '¿Qué puedo comprar aquí\?'\)\) \+ '<\/h3><div class="stp-shoprow">'/);
    assert.match(list, /<i>' \+ esc\(T\('Change', 'Ändern', 'Cambiar'\)\) \+ '<\/i><\/button>' \+ \(hasCart\(\) \? cartBtnHTML\(\) : ''\) \+ '<\/div>'/);
    assert.match(CSS, /\.stp-card \.stp-scroll > \.stp-jumps \{ position: sticky; top: -4px;/);
    assert.match(CSS, /\.stp-card \.stp-items \{ gap: 0; border-radius: 20px; overflow: hidden;/);
    assert.match(CSS, /\.stp-card \.stp-items \.stp-li \+ \.stp-li::before \{ content: ""; position: absolute; left: 68px;/, 'hairlines start after the photo');
    assert.match(CSS, /\.stp-card \.stp-items \.stp-item \{ min-height: 64px;/);
    assert.match(CSS, /\.stp-card \.stp-items \.stp-li \.stp-why \{ display: block; font-size: 12\.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;/);
    assert.doesNotMatch(CSS, /\.stp-card \.stp-items \.stp-qa-b \{[^}]*height: 4[0-3]px/, 'the + keeps its 44 pt');
    assert.match(SP, /const bar = sc && sc\.querySelector\('\.stp-jumps'\);\n            if \(g && sc\) sc\.scrollTo\(\{ top: g\.offsetTop - sc\.offsetTop - \(bar \? bar\.offsetHeight : 0\) - 6, behavior: 'smooth' \}\);/, 'a jump lands under the bar');
});
