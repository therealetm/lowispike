/* Nov 5 2026 (owner walkthrough): Plan my week -> shopping list -> Cart -> Give a hand keeps every food, its count and the total.
   Bugs seen on the owner's screenshots: 3 cucumbers / 4 yogurts became 1 in the Cart, Nori twice, the help request asked for €5
   while the same foods cost about €34.62, and Give a hand silently left foods out. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
global.window = global.window || {};
const CC = require('../cart-core.js');
const GB = require('../gift-basket-core.js');
const WB = require('../week-basket-core.js');

test('Cart: a Plan my week estimate (pe) counts toward the total, marked approx; a reported price always wins', () => {
    const list = [
        { id: 'a', n: 'Cucumber', q: 3, pe: 0.59 },
        { id: 'b', n: 'Greek yogurt', q: 4, pe: 1.19, p: 1.29 },
        { id: 'c', n: 'Mystery', q: 1 }
    ];
    const ls = CC.lines(list);
    assert.strictEqual(ls[0].q, 3); assert.strictEqual(ls[0].approx, true); assert.strictEqual(ls[0].line, 1.77);
    assert.strictEqual(ls[1].approx, false); assert.strictEqual(ls[1].unit, 1.29); assert.strictEqual(ls[1].line, 5.16);
    const t = CC.total(list);
    assert.strictEqual(t.sum, 6.93); assert.strictEqual(t.priced, 2); assert.strictEqual(t.all, 3); assert.strictEqual(t.complete, false); assert.strictEqual(t.approx, 1);
});

test('Plan my week hands each food over with its pack count and estimate; the list keeps the bigger count, never doubles a line', () => {
    const h = R('index.html');
    assert.match(R('week-basket.js'), /addIngredients\(need\.map\(i => \(\{ n: i\.n, g: i\.g, packs: i\.packs, pe: price\(i, S\.store\) \}\)\)/);
    const i = h.indexOf('    addIngredients:(items, title)'), body = h.slice(i, h.indexOf('return SH.list.length - before; },', i));
    assert.match(body, /Math\.round\(Number\(i\.packs\) \|\| 1\)/);
    assert.match(body, /if \(q > \(it\.q \|\| 1\)\) it\.q = q;/);
    assert.match(body, /if \(pe != null && it\.p == null\) it\.pe = pe;/);
    assert.match(body, /shSave\(\)/);
});

test('Week basket: two keys with the same shown name (Nori / nori sheets key) are one line', () => {
    const d = [
        { id: 'd1', items: [{ k: 'nori', n: 'Nori', g: 'other', p: 2.5 }] },
        { id: 'd2', items: [{ k: 'nori_sheet', n: 'Nori', g: 'other', p: 2.5 }] }
    ];
    const fn = WB.basket || WB.merge || WB.build;
    assert.ok(typeof fn === 'function', 'week-basket-core exposes its merge');
    const out = fn(d, {});
    const list = Array.isArray(out) ? out : (out.items || out.list || []);
    assert.strictEqual(list.filter(x => /nori/i.test(x.n)).length, 1);
});

test('Give a hand: with the open-cart server rules every food goes in, up to 60; with the old rules what is left out is named', () => {
    const lines = [{ n: 'Halloumi', q: 1 }, { n: 'Cola', q: 2 }, { n: 'Cucumber', q: 3 }];
    const open = GB.fromCart(lines, null, null, GB.limitsOf({ any_food: true, max_items: 60 }));
    assert.deepStrictEqual(open.items.map(x => x.n), ['Halloumi', 'Cola', 'Cucumber']);
    assert.strictEqual(open.items[2].q, 3); assert.strictEqual(open.left.length, 0);
    const old = GB.fromCart(lines, null, null, GB.limitsOf(null));
    assert.ok(old.items.length + old.left.length === 3, 'nothing vanishes: in the basket or on the left-out line');
    assert.ok(old.left.some(x => x.n === 'Cola'));
    assert.deepStrictEqual(GB.limitsOf({ any_food: true, max_items: 999 }), { anyFood: true, maxItems: 60 });
    const many = Array.from({ length: 30 }, (_, k) => ({ n: 'Food ' + (k + 10), q: 1 }));
    assert.strictEqual(GB.fromCart(many, null, null, GB.limitsOf({ any_food: true, max_items: 60 })).items.length, 30);
});

test('Give a hand total is the cart total to the cent: no €5 fallback, no hidden cap, honest words', () => {
    const g = R('gift-basket.js');
    const f = g.slice(g.indexOf('    function fromCart(from)'), g.indexOf('    function totalNote('));
    assert.doesNotMatch(f, /Math\.max\(5|Math\.min\(150/);
    /* Nov 5 2026 cart lane: the asked total is what actually goes in the basket (e2 = est when everything goes in) */
    assert.match(f, /draft\.total = e2 > 0 \? e2\.toFixed\(2\) : ''/);
    assert.match(g, /≈ store estimates, not live shop prices/);
    assert.match(g, /A basket can ask for up to €150/);
    assert.match(g, /No prices for these yet/);
    assert.match(g, /async limits\(\) \{[^\n]*rpc\('gift_limits'\)/);
});

test('Cart ends in two equal choices; Scan in the shop is not in the Cart any more but stays in Supermarkt', () => {
    const s = R('store-picks.js');
    const i = s.indexOf('    function cartHTML'), body = s.slice(i, s.indexOf('\n    }\n', i));
    assert.match(body, /I’ll buy it/); assert.match(body, /stp-cart-gift" data-stp="giftcart" data-spend="1"/);
    assert.doesNotMatch(body, /data-stp="scanshop"/);
    assert.match(s, /T\('Scan in the shop', 'Im Laden scannen'/);
    assert.match(R('store-picks.css'), /\.stp-cart-choice \{/);
});

test('Open-cart SQL keeps the €5 to €150 total and pay link rules, drops only the spike list, and tells the app', () => {
    const q = R('supabase/proposals/gift_baskets_open_cart_20261105.sql');
    assert.match(q, /between 1 and 60/);
    assert.match(q, /drop constraint if exists gift_items_low_spike/);
    assert.doesNotMatch(q, /drop constraint if exists gift_total|drop constraint if exists gift_pay_url|drop constraint if exists gift_kofi_page/);
    assert.match(q, /create or replace function public\.gift_limits\(\)/);
    assert.match(q, /grant  execute on function public\.gift_limits\(\) to authenticated/);
});
