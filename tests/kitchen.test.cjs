'use strict';
/* Oct 24, 2026 (Eman, via the Maya handoff: a personal Kitchen "like a wardrobe for food" plus a shopping cart for later, both
   inside Shop under Fuel). First simple version: add to the cart, Bought moves it into the Kitchen, remove, saved per account.
   The cart is the existing shopping list (LOWI_SHELF), never a second list. Browser check: tools/check-kitchen.cjs. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const K = require('../kitchen-core.js');

test('the key travels with the account (lowispike.* is what account sync carries)', () => {
  assert.equal(K.KEY, 'lowispike.kitchen.v1');
  assert.match(read('account-sync-core.js'), /lowispike\./);
});

test('parse never throws and drops broken entries', () => {
  for (const bad of [null, '', 'nope{', '[]', '{"items":5}', 42]) assert.deepEqual(K.parse(bad), { v: 1, items: [] });
  const st = K.parse(JSON.stringify({ items: [{ id: 'a', n: ' Eggs ', at: 5 }, { id: 'a', n: 'dupe id' }, { n: 'no id' }, { id: 'b', n: '   ' }, { id: 'c', n: 'Milk', from: 'cart' }, null] }));
  assert.deepEqual(st.items.map(i => [i.id, i.n, i.from]), [['a', 'Eggs', 'me'], ['c', 'Milk', 'cart']]);
});

test('add: trims, caps the name, one entry per name (case, umlauts and spacing ignored)', () => {
  let st = K.add(null, '  Eier  ', 1000);
  assert.equal(st.items.length, 1); assert.equal(st.items[0].n, 'Eier'); assert.equal(st.items[0].from, 'me');
  st = K.add(st, 'eier', 2000); assert.equal(st.items.length, 1, 'same thing twice stays one');
  st = K.add(st, 'Hafer­flocken', 3000);
  st = K.add(st, 'Kase', 4000); st = K.add(st, 'Käse', 5000);
  assert.equal(st.items.filter(i => K.norm(i.n) === 'kase').length, 1);
  assert.equal(K.add(st, '   ', 6000).items.length, st.items.length, 'empty is ignored');
  assert.ok(K.add(null, 'x'.repeat(300), 1).items[0].n.length <= 60);
  assert.equal(K.add(null, 'Milk', 1, 'cart').items[0].from, 'cart');
  const ids = st.items.map(i => i.id); assert.equal(new Set(ids).size, ids.length);
});

test('drop: takes one out and hands it back for an optional Buy again; unknown id changes nothing', () => {
  let st = K.add(K.add(null, 'Eggs', 1), 'Milk', 2);
  const id = st.items[0].id;
  const r = K.drop(st, id);
  assert.equal(r.gone.n, 'Eggs');
  assert.deepEqual(r.state.items.map(i => i.n), ['Milk']);
  const none = K.drop(r.state, 'zzz');
  assert.equal(none.gone, null); assert.equal(none.state.items.length, 1);
});

test('view is newest first; count; cart split into to-buy and ticked off in the shop', () => {
  const st = K.add(K.add(K.add(null, 'A', 10), 'B', 30), 'C', 20);
  assert.deepEqual(K.view(st).map(i => i.n), ['B', 'C', 'A']);
  assert.equal(K.count(st), 3);
  const cv = K.cartView([{ id: '1', n: 'Oats', done: false }, { id: '2', n: 'Yogurt', done: true }, { id: '', n: 'x' }, null]);
  assert.deepEqual(cv.buy.map(i => i.n), ['Oats']); assert.deepEqual(cv.got.map(i => i.n), ['Yogurt']);
  assert.equal(K.fromCartName('Lentils · 200 g'), 'Lentils', 'recipe amounts stay on the list, not in the kitchen');
});

test('wired: script loads before the Shop panel, cached offline, one cart (dropList on the existing list)', () => {
  const html = read('index.html'), sw = read('sw.js');
  const iK = html.indexOf('<script src="kitchen-core.js'), iS = html.indexOf('<script src="store-picks.js');
  assert.ok(iK > 0 && iK < iS, 'kitchen-core.js before store-picks.js (store-picks.js reads it when it loads)');
  assert.match(sw, /STATIC\.push\("kitchen-core\.js"\);[^\n]*\nconst OWN = STATIC\.filter/, 'cached for offline, before OWN/PLAIN are worked out');
  assert.match(html, /dropList:id => \{ const n = SH\.list\.length; SH\.list = SH\.list\.filter\(x => x\.id !== id\)/);
  assert.doesNotMatch(read('kitchen-core.js'), /localStorage|document\./, 'the core is pure');
});

test('Shop panel: third tab Kitchen, At home + Shopping cart, Bought moves, Buy again only offered, + Shopping cart on a product', () => {
  const sp = read('store-picks.js'), css = read('store-picks.css');
  assert.match(sp, /b\('kitchen', '\\u\{1F9FA\}', T\('Kitchen', 'Küche', 'Cocina'\)/);
  assert.match(sp, /ov\.innerHTML = onSz\(\) \? szHTML\(\) : onKit\(\) \? kitHTML\(\) :/);
  assert.match(sp, /T\('At home', 'Zu Hause', 'En casa'\)/);
  assert.match(sp, /T\('Shopping cart', 'Einkaufswagen', 'Carrito'\)/);
  assert.match(sp, /data-stp-kit-got=/); assert.match(sp, /data-stp-kit-drop=/); assert.match(sp, /data-stp-kit-cdrop=/);
  assert.match(sp, /data-stp-kit=\\?"again\\?"/);
  assert.match(sp, /function kitFromCart\(it\)[\s\S]{0,260}shelf\(\)\.dropList\(it\.id\)/, 'Bought: off the list, into the kitchen');
  assert.match(sp, /data-stp-kit-qv=/);
  /* nothing goes on the cart by itself when something leaves the kitchen */
  const dropBranch = sp.slice(sp.indexOf("b.hasAttribute('data-stp-kit-drop')"), sp.indexOf("b.getAttribute('data-stp-kit') === 'again'"));
  assert.doesNotMatch(dropBranch, /cartAdd/);
  assert.match(sp, /if \(ov && view === 'list' && onShop\(\)\) paint\(\)/, 'the list loading behind the Kitchen tab never repaints over it');
  assert.match(sp, /\(\{ sz: 'sz', kitchen: 'kitchen' \}\)\[localStorage\.getItem\(TKEY\)\]/, 'the tab is remembered');
  assert.match(css, /\.stp-tabs\.stp-tabs3 \{ grid-template-columns: 1fr 1fr 1fr/);
  assert.match(css, /\.stp-kit-msg\.none \{ display: none/);
  /* the companion has the person's own name: never "Misty" in what people read */
  assert.doesNotMatch(sp.slice(sp.indexOf('Kitchen (Oct 24'), sp.indexOf('function shell(')), /Misty/);
  assert.ok(fs.existsSync(path.join(root, 'tools/check-kitchen.cjs')));
});
