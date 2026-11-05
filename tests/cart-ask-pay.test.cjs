'use strict';
/* Oct 26 2026 (MAYA-HANDOFF 0.34, Emmanuel's two German voice messages + iPad screenshots):
   1. the Supermarket cart sheet looked weird: the Supermarket page showed through around it, the two action pills were huge
      circles spilling out (the scan pill's cart icon had no size: 212 px on iPad), one icon giant, one tiny;
   2. "Someone else pays": from the cart, one tap (plus Share) turns the WHOLE cart, with quantities, into a Give a hand basket,
      no typing or chip picking, then straight to the swipe feed. Same gift-basket flow; only low-spike foods; one short line
      says what was left out and why;
   3. the cart chips were English in the German app, and oregano / no-sugar salsa were called "kein Low-Spike" (the rating
      didn't know them: null, not spiky). */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const F = require('../food-names-core.js');
const P = require('../food-policy-core.js');
const C = require('../gift-basket-core.js');
const rate = n => { const r = P.rateName(n); if (r && r.verdict) return r; const en = F.english(n); return en && en !== n ? (P.rateName(en) || r) : r; };

test('food names: the cart chips show the app language, unknown names stay as typed', () => {
    assert.equal(F.name('Lettuce', 'de'), 'Kopfsalat');
    assert.equal(F.name('Lean beef mince', 'de'), 'Mageres Rinderhack');
    assert.equal(F.name('Smoked paprika', 'de'), 'Geräuchertes Paprikapulver');
    assert.equal(F.name('No-sugar salsa', 'de'), 'Salsa ohne Zucker');
    assert.equal(F.name('Lettuce', 'es'), 'Lechuga');
    assert.equal(F.name('Smoked paprika', 'es'), 'Pimentón ahumado');
    assert.equal(F.name('Kopfsalat', 'en'), 'Lettuce', 'works from any language');
    assert.equal(F.name('eggs', 'de'), 'Eier');
    assert.equal(F.name('Fresh basil', 'es'), 'Albahaca');
    assert.equal(F.name('Gummy bears', 'de'), 'Gummy bears', 'unknown stays as typed');
    assert.equal(F.name('Paprika', 'es'), 'Paprika', 'a word that means two foods is never guessed');
});

test('rating: herbs, spices and salsa are low-spike; sweet look-alikes are not', () => {
    for (const n of ['Oregano', 'No-sugar salsa', 'Smoked paprika', 'Cumin', 'Kreuzkümmel', 'Thymian', 'Orégano', 'Salsa', 'Chili powder', 'Black pepper', 'Salt', 'Minze'])
        assert.equal(P.rateName(n).verdict, 'JA', n);
    for (const n of ['After Eight mint thins', 'Pfeffernüsse', 'Salsa barbacoa', 'Salsa agridulce', 'Sweet chilli sauce', 'Salt and vinegar crisps', 'Salsa dulce'])
        assert.equal(P.rateName(n).verdict, 'NEIN', n);
    assert.notEqual(P.rateName('Tortilla wraps').verdict, 'JA');
    assert.equal(rate('Mageres Rinderhack').verdict, 'JA', 'a German name is rated by its English name when the rating does not know it');
});

test('fromCart: the whole cart with quantities; left-out foods say why; same food adds up; 12 max', () => {
    const lines = [{ n: 'Lettuce', q: 1 }, { n: 'Lean beef mince', q: 2 }, { n: 'Smoked paprika' }, { n: 'No-sugar salsa', q: 1 }, { n: 'Oregano', q: 1 },
        { n: 'Tortilla wraps', q: 1 }, { n: 'Blorptastic snack', q: 1 }, { n: 'Kopfsalat', q: 2 }];
    const de = n => F.name(n, 'de');
    const r = C.fromCart(lines, rate, de);
    const names = r.items.map(x => x.n);
    /* Nov 5 2026 (test changed, why): owner: "Everything in a freaking Warenkorb should go in there". The app no longer leaves
       foods out by its own rating; only what the live server still refuses (its spike word list) stays out, said by name. */
    assert.deepEqual(names, ['Kopfsalat', 'Mageres Rinderhack', 'Geräuchertes Paprikapulver', 'Salsa ohne Zucker', 'Oregano', 'Tortilla-Wraps', 'Blorptastic snack']);
    assert.equal(r.items[0].q, 3, 'Lettuce 1 + Kopfsalat 2');
    assert.equal(r.items[1].q, 2);
    assert.deepEqual(r.left, []);
    const srv = C.fromCart([{ n: 'Halloumi', q: 1 }, { n: 'Courgette', q: 3 }, { n: 'Mint' }, { n: 'Cola', q: 2 }, { n: 'Toastbrot' }], rate, n => n);
    assert.deepEqual(srv.items.map(x => x.n), ['Halloumi', 'Courgette', 'Mint'], 'Halloumi, Courgette and Mint (owner screenshots) go in');
    assert.deepEqual(srv.left.map(x => [x.n, x.why]), [['Cola', 'server'], ['Toastbrot', 'server']], 'only what the live server refuses stays out');
    const open = C.fromCart([{ n: 'Cola', q: 2 }, { n: 'Toastbrot' }], rate, n => n, C.limitsOf({ any_food: true, max_items: 60 }));
    assert.deepEqual(open.left, [], 'after the open-cart setup file: everything');
    const many = Array.from({ length: 15 }, (_, i) => ({ n: ['Lettuce', 'Eggs', 'Spinach', 'Broccoli', 'Cucumber', 'Tomatoes', 'Garlic', 'Onion', 'Salmon', 'Tofu', 'Feta', 'Almonds', 'Walnuts', 'Kale', 'Leek'][i], q: 1 }));
    const m = C.fromCart(many, rate, n => n);
    assert.equal(m.items.length, C.MAX_ITEMS);
    assert.deepEqual(m.left.map(x => x.why), ['full', 'full', 'full']);
});

test('build + view keep the quantity; a basket without quantities still works', () => {
    const draft = { items: [{ n: 'Eier', q: 2 }, { n: 'Kopfsalat', q: 1 }, 'Brokkoli'], total: '24', payUrl: 'https://ko-fi.com/test', firstName: 'Ana', anon: false, city: '' };
    const b = C.build(draft, rate);
    assert.ok(b.ok, JSON.stringify(b.missing || b));
    assert.deepEqual(b.row.items, [{ n: 'Eier', q: 2 }, { n: 'Kopfsalat' }, { n: 'Brokkoli' }]);
    const v = C.view(Object.assign({ id: 'x1', user_id: 'u', status: 'open', created_at: new Date().toISOString() }, b.row));
    assert.deepEqual(v.items, ['Eier', 'Kopfsalat', 'Brokkoli']);
    assert.deepEqual(v.qtys, [2, 1, 1]);
    assert.equal(C.qty('7.9'), 7); assert.equal(C.qty(500), 99); assert.equal(C.qty('x'), 1);
});

test('cart sheet: compact matching actions outside the scrolling list, Someone else pays guarded', () => {
    const S = read('store-picks.js');
    const i = S.indexOf('    function cartHTML'), body = S.slice(i, S.indexOf('\n    }\n', i));
    assert.match(body, /data-stp="giftcart" data-spend="1"/, 'the cart\'s Someone else pays carries data-spend (BH-043 rule)');
    assert.match(body, /Someone else pays', 'Jemand anderes zahlt', 'Que pague otra persona'/);
    /* Nov 5 2026 (test changed, why): owner said the Cart doesn't need Scan in the shop; scanning stays on Scan and in Supermarkt */
    assert.doesNotMatch(body, /data-stp="scanshop"/); assert.match(body, /ic\.gift/);
    assert.match(body, /stp-go stp-cart-go stp-cart-gift" data-stp="giftcart"/, 'Someone else pays is a full-size choice, not a small pill');
    assert.ok(body.indexOf("'</div>' + acts") > 0, 'the actions sit after the scroll area, not inside it');
    assert.match(body, /esc\(foodName\(l\.n\)\)/, 'cart rows show names in the app language');
    assert.match(S, /a2 === 'giftcart'[^\n]*spend\(e\)[^\n]*G\.fromCart\('shop'\)/);
    const css = read('store-picks.css');
    assert.match(css, /\.stp-cart-acts svg \{[^}]*width: 18px; height: 18px/, 'every action icon is 18 px');
    assert.match(css, /\.stp-qv-card\.stp-cart-card \{ width: min\(560px, 100%\)/, 'the sheet covers the whole Shop card');
    assert.match(css, /\.stp-qv\.stp-cartv \{[^}]*backdrop-filter: blur\(10px\)/, 'the page behind is blurred');
    assert.match(read('index.html'), /<script src="food-names-core\.js\?v=/);
    assert.match(read('sw.js'), /"food-names-core\.js"/);
});

test('Give a hand: the cart basket shares the whole cart and lands in the swipe feed; honest left-out line', () => {
    const G = read('gift-basket.js');
    assert.match(G, /open: openPanel, fromCart,/, 'LowiGiftBasket.fromCart is public');
    assert.match(G, /data-gb="cartshare" data-spend="1"/, 'Share carries data-spend');
    const sc = G.slice(G.indexOf('    function shareCart'), G.indexOf('    function missing('));
    /* Nov 5 2026 (test changed, why): the rules now come from the server (LIM): every food once the open-cart setup ran */
    assert.match(sc, /C\.build\(cartDraft\(\), rate, LIM\)/, 'same build rules (server limits, €5-150, real pay link)');
    assert.match(sc, /api\(\)\.share\(/, 'same server call as the normal basket');
    assert.match(sc, /tab = 'give'/, 'then straight to the swipe feed');
    assert.doesNotMatch(G, /Not for a basket \(not low-spike\): /, 'unknown foods are no longer called spiky');
    /* Nov 5 2026 (test changed, why): no more rating reasons; only the server's refusal or a full basket, said by name */
    assert.doesNotMatch(G, /kann die App noch nicht bewerten/);
    assert.match(G, /Give a hand can’t take these yet: /);
    assert.match(G, /C\.fromCart\(cart, rate, fname, LIM\)/, 'builder chips: names in the app language');
});

/* Nov 5 2026 (cart lane): the money path the owner's screenshots broke */
test('Nov 5: Fit my budget tries every dinner and says plainly when the budget is too small', () => {
    const W = require('../week-basket-core.js');
    const cost = { a: 20, b: 18, c: 15, d: 9, e: 8, f: 7, g: 6 };
    const build = ids => ({ sum: ids.reduce((s, id) => s + cost[id], 0) });
    /* the old search only swapped the priciest dinner; now any swap that lowers the week wins */
    const f = W.fitBudget(['a', 'b', 'c'], Object.keys(cost), 22, build);
    assert.deepEqual(f.plan.slice().sort(), ['e', 'f', 'g']);
    assert.equal(f.sum, 21); assert.equal(f.fits, true);
    const g = W.fitBudget(['a', 'b', 'c'], Object.keys(cost), 10, build);
    assert.equal(g.fits, false); assert.equal(g.sum, 21);
    const bp = W.budgetPlan(g.plan, 10, build);
    assert.equal(bp.fits, false); assert.equal(bp.needBudget, 21);
    assert.equal(bp.nights, 1); assert.ok(build(bp.nightsPlan).sum <= 10);
    assert.equal(W.budgetPlan(['g'], 10, build).fits, true);
});
test('Nov 5: Nori sheets, Greek yogurt to top, Bell pepper and Courgette merge with their plain names', () => {
    const W = require('../week-basket-core.js');
    const b = W.basket([{ id: 'a', items: [{ k: 'nori', n: 'Nori' }, { k: 'gy', n: 'Greek yogurt' }, { k: 'p', n: 'Peppers' }, { k: 'z', n: 'Zucchini' }] },
        { id: 'b', items: [{ k: 'nori2', n: 'Nori sheets' }, { k: 'gy2', n: 'Greek yogurt to top' }, { k: 'bp', n: 'Bell pepper' }, { k: 'c', n: 'Courgette' }, { k: 'bk', n: 'Black pepper', g: 'wuerze' }] }], 2);
    assert.deepEqual(b.map(i => [i.n, i.uses]), [['Nori', 2], ['Greek yogurt', 2], ['Peppers', 2], ['Zucchini', 2], ['Black pepper', 1]]);
});
test('Nov 5: Courgette and Zucchini are one English name; Give a hand mirrors the live server word list exactly', () => {
    global.window = global.window || global;
    const N = require('../food-names-core.js');
    assert.equal(N.name('Courgette', 'en'), 'Zucchini'); assert.equal(N.name('zucchini', 'en'), 'Zucchini');
    const C = require('../gift-basket-core.js'), D = require('../tools/gift-basket/deny.cjs');
    for (const n of ['Halloumi', 'Courgette', 'Mint', 'Cola', 'Zuckerschoten', 'Apfelsaft', 'Toastbrot', 'Fish & chips', 'Eier']) assert.equal(C.serverRefuses(n), D.refused(n), n);
    assert.equal(C.serverRefuses('Halloumi'), false); assert.equal(C.serverRefuses('Cola'), true);
    assert.equal(C.basketCheck('Cola', C.limitsOf({ any_food: true, max_items: 60 })).ok, true);
    assert.equal(C.basketCheck('Cola').why, 'server');
});
test('Nov 5: open-cart proposal exists, is not live, keeps money out and shape checks in', () => {
    const fs = require('fs'), path = require('path');
    const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'proposals', 'gift_baskets_open_cart_20261105.sql'), 'utf8');
    assert.match(sql, /PROPOSAL ONLY: nobody has run this/);
    assert.match(sql, /between 1 and 60/); assert.match(sql, /'any_food', true, 'max_items', 60/);
    assert.match(sql, /\[<>\[:cntrl:\]\]/);
    assert.doesNotMatch(sql, /stripe_|card_number|insert into/i);
});
test('Nov 5: Give a hand never prefills an old total, swipe right opens only a checked pay link, Cart has no Scan in the shop', () => {
    const fs = require('fs'), path = require('path');
    const G = fs.readFileSync(path.join(__dirname, '..', 'gift-basket.js'), 'utf8'), S = fs.readFileSync(path.join(__dirname, '..', 'store-picks.js'), 'utf8');
    assert.match(G, /draft\.total = e2 > 0 \? e2\.toFixed\(2\) : ''/);
    assert.match(G, /const L = b && C\.payLink\(b\.link\);\n\s+if \(!L \|\| !L\.ok\) return false;/);
    assert.match(G, /W\.open\(L\.url, '_blank', 'noopener,noreferrer'\)/);
    assert.match(G, /Nothing is paid until you pay there\./);
    const cart = S.slice(S.indexOf('function cartHTML'), S.indexOf('let cartOpen = false'));
    assert.doesNotMatch(cart, /data-stp="(?:scan|shopscan)|T\(.Scan in the shop/);
    assert.match(cart, /data-stp="mylist"/); assert.match(cart, /data-stp="giftcart"/);
});
