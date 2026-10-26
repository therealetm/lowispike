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
    assert.deepEqual(names, ['Kopfsalat', 'Mageres Rinderhack', 'Geräuchertes Paprikapulver', 'Salsa ohne Zucker', 'Oregano']);
    assert.equal(r.items[0].q, 3, 'Lettuce 1 + Kopfsalat 2');
    assert.equal(r.items[1].q, 2);
    assert.deepEqual(r.left.map(x => [x.n, x.why]), [['Tortilla-Wraps', 'spike'], ['Blorptastic snack', 'unknown']]);
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
    assert.match(body, /ic\.scan/); assert.match(body, /ic\.gift/);
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
    assert.match(sc, /C\.build\(cartDraft\(\), rate\)/, 'same build rules (low-spike only, €5-150, real pay link)');
    assert.match(sc, /api\(\)\.share\(/, 'same server call as the normal basket');
    assert.match(sc, /tab = 'give'/, 'then straight to the swipe feed');
    assert.doesNotMatch(G, /Not for a basket \(not low-spike\): /, 'unknown foods are no longer called spiky');
    assert.match(G, /\(kann die App noch nicht bewerten\)/);
    assert.match(G, /C\.fromCart\(cart, rate, fname\)/, 'builder chips: names in the app language');
});
