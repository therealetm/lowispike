// 11 Nov 2026 (Emmanuel): "the giver hand should be looking more like Tinder, because that was the whole point. Also posting on
// giver hand should be simpler: you pick your groceries, you click one button, it goes to the ... swipe thingy."
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const C = require('../gift-basket-core.js');

test('the card photo: up to six food tiles, a "+ N" tile when there is more, amounts kept', () => {
  const m = C.mosaic(['Eier', 'Brokkoli', 'Naturjoghurt', 'Lachs', 'Gurke', 'Feta', 'Tofu'], [2, 1, 1, 1, 3, 1, 1]);
  assert.strictEqual(m.tiles.length, 5); assert.strictEqual(m.more, 2);
  assert.deepStrictEqual(m.tiles.map(t => t.q), [2, 1, 1, 1, 3]);
  const six = C.mosaic(['a', 'b', 'c', 'd', 'e', 'f']); assert.strictEqual(six.tiles.length, 6); assert.strictEqual(six.more, 0);
  assert.deepStrictEqual(C.mosaic([], null), { tiles: [], more: 0 });
});

test('a food symbol from the name in English, German or Spanish; an unknown food gets the basket', () => {
  const same = (...ns) => { const e = C.foodEmoji(ns[0]); ns.forEach(n => assert.strictEqual(C.foodEmoji(n), e, n)); return e; };
  assert.strictEqual(same('Eier', 'eggs', 'Huevos'), '\u{1F95A}');
  assert.strictEqual(same('Lachs', 'Salmon', 'Salmón'), '\u{1F41F}');
  assert.strictEqual(same('Hähnchenbrust', 'chicken breast', 'Pollo'), '\u{1F357}');
  assert.strictEqual(same('Käse', 'cheese', 'Queso', 'Feta'), '\u{1F9C0}');
  assert.strictEqual(same('Olivenöl', 'olive oil'), '\u{1FAD2}');
  assert.strictEqual(C.foodEmoji('Xyzzy'), '\u{1F9FA}');
  assert.notStrictEqual(C.foodEmoji('Steak'), C.foodEmoji('Tee'), 'whole words: "tea" is not in "steak"');
});

test('one tap shares only a complete basket where nothing had to stay out', () => {
  const ok = { ok: true, row: {} }, items = [{ n: 'Eier' }];
  assert.strictEqual(C.oneTap(ok, { items, left: [] }), true);
  assert.strictEqual(C.oneTap({ ok: false, errors: ['link'] }, { items, left: [] }), false, 'no saved pay link: the form asks for it');
  assert.strictEqual(C.oneTap({ ok: false, errors: ['total'] }, { items, left: [] }), false, 'no prices: the form asks for the total');
  assert.strictEqual(C.oneTap(ok, { items, left: [{ n: 'Cola' }] }), false, 'something stays out: the person sees that first');
  assert.strictEqual(C.oneTap(ok, { items: [], left: [] }), false); assert.strictEqual(C.oneTap(ok, null), false);
});

test('the swipe card is a profile card: food as the photo, name and city on it, total as a chip, never a person\'s picture', () => {
  const js = read('gift-basket.js'), css = read('gift-basket.css');
  assert.match(js, /class="gb-basket gb-swipe gb-tinder'/);
  assert.match(js, /function photoHTML\(b\) \{\s+const m = C\.mosaic\(b\.items, b\.qtys\);/);
  assert.match(js, /<header class="gb-id"><b>' \+ esc\(who\(b\)\)/);
  assert.match(js, /<span class="gb-price">/);
  const photo = js.slice(js.indexOf('function photoHTML'), js.indexOf('function actHTML'));
  assert.ok(!/<img|avatar|photo_url/.test(photo), 'no picture of a person');
  assert.match(css, /\.gb-swipe\.gb-tinder \{/); assert.match(css, /\.gb-photo \{[^}]*min-height: min\(41vh, 350px\)/);
});

test('the deck comes first; the explanation and the money note stay, under the buttons', () => {
  const js = read('gift-basket.js'), give = js.slice(js.indexOf('function giveHTML'), js.indexOf('function deckHTML'));
  assert.match(give, /deckHTML\(list\) \+ '<div class="gb-after">'/);
  assert.match(give, /gb-money/); assert.match(give, /gb-hint-out/);
  assert.match(js, /class="gb-round gb-undo gb-undo-r" data-gb="undo"/, 'undo is a round button between skip and pay');
});

test('"Someone else pays" shares in one tap when it can, and says how to take it back', () => {
  const js = read('gift-basket.js'), mk = read('market-game.js');
  assert.match(js, /if \(!busy && C\.oneTap\(C\.build\(cartDraft\(\), rate, LIM\), fromCartPick\)\) shareCart\(\);/);
  assert.match(js, /Zurücknehmen kannst du ihn jederzeit unter Korb teilen\./);
  assert.match(mk, /if \(a === 'gift'\) \{ if \(env\.giftFromCart\) env\.giftFromCart\(\); return; \}/, 'the game basket has the same one button');
});
