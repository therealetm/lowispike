'use strict';
/* Oct 26 2026 (Emmanuel, MAYA-HANDOFF 0.19): the Kitchen is an animated pantry game in Cook, next to Shuffle and Swipe. A fridge and a
   cabinet, every door opens its shelf, things sort themselves by name (EN/DE/ES, German compounds too), the health bar uses the
   scanner's own words, points are capped per day, binning puts things on the shopping list. Shop has no Kitchen tab while the game is
   loaded. Browser check (WebKit iPhone 13, Reduce Motion, en/de/es): tools/kitchen-pantry/check.cjs. All of these fail on the old code
   (no kitchen-game files, Kitchen still a Shop tab, the tour still pointing at Shop). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const has = f => fs.existsSync(path.join(root, f));

test('shelves: one fridge and one cabinet, every shelf named in en/de/es, in screen order', () => {
  assert.ok(has('kitchen-game-core.js'), 'kitchen-game-core.js exists');
  const G = require('../kitchen-game-core.js');
  assert.deepEqual(G.SHELVES.filter(s => s.where === 'fridge').map(s => s.id), ['meat', 'dairy', 'eggs', 'veg']);
  assert.deepEqual(G.SHELVES.filter(s => s.where === 'cabinet').map(s => s.id), ['fruit', 'grains', 'snacks', 'drinks', 'other']);
  for (const s of G.SHELVES) { assert.equal(s.t.length, 3, s.id); s.t.forEach(x => assert.ok(x && x.length > 2, s.id)); }
});

test('sorting by name: English, German (compounds too) and Spanish land on the right shelf; a chosen shelf wins', () => {
  const G = require('../kitchen-game-core.js');
  const where = n => G.shelfOf({ n });
  const cases = {
    meat: ['Chicken breast', 'Hähnchenbrust', 'Lachs', 'pollo', 'Thunfisch'],
    dairy: ['Greek yogurt', 'Erdbeer-Fruchtjoghurt', 'Fruchtjoghurt', 'queso fresco', 'Skyr'],
    eggs: ['Eggs', 'Eier', 'huevos', 'Tofu natur'],
    veg: ['Sweet potato', 'Süßkartoffel', 'Brokkoli', 'espinacas'],
    fruit: ['Apples', 'Banane', 'fresas', 'Wassermelone'],
    grains: ['Vollkornbrot', 'Haferflocken', 'arroz integral', 'Spaghetti'],
    snacks: ['Dark chocolate', 'Zartbitterschokolade', 'galletas'],
    drinks: ['Orange juice', 'Mineralwasser', 'zumo de naranja'],
    other: ['Olive oil', 'Erdnussbutter', 'mermelada']
  };
  for (const [shelf, names] of Object.entries(cases)) for (const n of names) assert.equal(where(n), shelf, n + ' -> ' + shelf);
  assert.equal(G.shelfOf({ n: 'Eggs', c: 'veg' }), 'veg', 'the shelf the person chose wins');
  assert.equal(G.shelfOf({ n: 'Something odd' }), 'other', 'unknown words go to Jars & more');
  assert.equal(G.shelfOf({ n: 'Zzz' }, 'drink'), 'drinks', 'the product database category helps when the name does not');
});

test('health uses the scanner verdict words only, and the healthy bonus needs enough rated items', () => {
  const G = require('../kitchen-game-core.js');
  const it = v => ({ n: 'x', p: { v } });
  const h = G.health([it('ok'), it('ok'), it('spike'), { n: 'y' }]);
  assert.deepEqual(h.counts, { ok: 2, better: 0, spike: 1, unknown: 1 });
  assert.equal(h.rated, 3);
  assert.equal(G.healthy([it('ok'), it('ok'), it('ok'), it('ok')]), false, 'four rated items are not enough');
  assert.equal(G.healthy([it('ok'), it('ok'), it('ok'), it('better'), it('spike')]), true, '3 of 5 lower impact is a healthy kitchen');
  const ui = read('kitchen-game.js');
  assert.match(ui, /Insulin-friendly/); assert.match(ui, /Not enough data/);
  assert.match(ui, /Scanner estimates, not medical advice/);
  assert.doesNotMatch(ui, /blood sugar will|stays steady|guarantee/i, 'no medical promises');
});

test('points are capped per day: a daily look, binning (3 a day) and the healthy bonus', () => {
  const G = require('../kitchen-game-core.js');
  assert.deepEqual(G.POINTS, { look: { src: 'kitchen-look', amt: 5, perDay: 1 }, bin: { src: 'kitchen-bin', amt: 2, perDay: 3 }, healthy: { src: 'kitchen-healthy', amt: 10, perDay: 1 } });
  const a = G.award('look', new Date(2026, 9, 26, 9).getTime()), b = G.award('look', new Date(2026, 9, 26, 21).getTime()), c = G.award('look', new Date(2026, 9, 27, 9).getTime());
  assert.equal(a.eventId, b.eventId, 'same day, same event: paid once');
  assert.notEqual(a.eventId, c.eventId, 'next day pays again');
  assert.equal(a.perDay, 1);
  assert.equal(G.canLook([]), false, 'an empty kitchen earns nothing for a look');
  assert.match(read('kitchen-game.js'), /perDay: a\.perDay/, 'LowiHost.award gets perDay, otherwise it pays once ever');
});

test('kitchen-core keeps shelf and product data, and old entries without them still load', () => {
  const K = require('../kitchen-core.js');
  assert.equal(typeof K.addProduct, 'function'); assert.equal(typeof K.setShelf, 'function');
  const r = K.addProduct(null, { n: 'Skyr', bc: '4001234567890', img: 'https://images.openfoodfacts.org/x.jpg', br: 'Brand', v: 'ok', c: 'dairy' }, 1000);
  assert.equal(r.had, false);
  const st = K.parse(JSON.stringify(r.state));
  assert.deepEqual(st.items[0].p, { bc: '4001234567890', img: 'https://images.openfoodfacts.org/x.jpg', br: 'Brand', v: 'ok' });
  assert.equal(st.items[0].c, 'dairy');
  assert.equal(K.addProduct(st, { n: 'skyr' }, 2000).had, true, 'same name twice stays one');
  const bad = K.addProduct(null, { n: 'X', img: 'javascript:alert(1)', v: 'great' }, 1);
  assert.equal(bad.state.items[0].p, undefined, 'no unsafe picture, no made-up verdict');
  assert.equal(K.setShelf(st, st.items[0].id, 'fruit').items[0].c, 'fruit');
  assert.deepEqual(K.parse(JSON.stringify({ items: [{ id: 'a', n: 'Eggs', at: 1 }] })).items, [{ id: 'a', n: 'Eggs', at: 1, from: 'me' }]);
  assert.equal(K.add(null, 'Milk', 1, 'cart').items[0].from, 'cart', 'the old add() call (bot recipe) still works');
});

test('Cook: Kitchen is a game next to Shuffle and Swipe (first by default since 26 Oct, cook-tab-order.test.cjs), and the game files load and are cached offline', () => {
  const html = read('index.html');
  assert.match(html, /kitchen: \(\) => window\.LowiKitchenGame \? seg\("view", "kitchen", ckT\("Kitchen", "Küche", "Cocina"\)/);
  assert.match(html, /const fView = \(\) => ckGet\(CKK\.view, ckFirst\(\), \["shuffle", "swipe", "kitchen"\]\)/);
  assert.match(html, /<div id="kgRoot" class="kg-root">/);
  assert.match(html, /<script src="kitchen-game-core\.js\?v=/);
  assert.match(html, /<script src="kitchen-game\.js\?v=/);
  assert.match(html, /<link rel="stylesheet" id="kgCss" href="kitchen-game\.css\?v=/);
  assert.match(read('sw.js'), /STATIC\.push\("kitchen-game-core\.js", "kitchen-game\.js", "kitchen-game\.css"\);/);
});

test('Shop: no Kitchen tab while the game is loaded, and asking for it opens Cook > Kitchen; the scanner can put things in the kitchen', () => {
  const sp = read('store-picks.js');
  assert.match(sp, /const kitTab = \(\) => !!K && !KG\(\);/);
  assert.match(sp, /\(kitTab\(\) \? b\('kitchen'/);
  assert.match(sp, /if \(id === 'kitchen' && KG\(\)\) \{ if \(ov\) close\(\); KG\(\)\.open\(\); return; \}/);
  const ss = read('shop-scan.js');
  assert.match(ss, /data-ss="kit"/);
  assert.match(ss, /\['In my kitchen', 'In meine Küche', 'A mi cocina'\]/);
  assert.match(ss, /else if \(k === 'kit'\) addKit\(el\);/);
});

test('What\'s New: new-kitchen opens Cook > Kitchen, in en/de/es; the route opens the game (since 26 Oct Kitchen is first, so no "next to Swipe")', () => {
  const S = require('../tutorial-steps.js');
  const s = S.STEPS.find(x => x.id === 'new-kitchen');
  assert.ok(s && s.area === 'new');
  assert.equal(s.open, 'kitchen');
  assert.equal(s.target[0], '#ckBar [data-ck="view"][data-v="kitchen"]', 'points at the Kitchen button in Cook');
  assert.match(s.text.en, /Cook/); assert.doesNotMatch(s.text.en, /Swipe/); assert.doesNotMatch(s.text.en, /Shop/);
  assert.match(s.text.de, /Kochen/); assert.doesNotMatch(s.text.de, /Swipen/); assert.doesNotMatch(s.text.de, /Shop/);
  assert.match(s.text.es, /Cocinar/); assert.doesNotMatch(s.text.es, /Deslizar/); assert.doesNotMatch(s.text.es, /Shop/);
  for (const l of ['en', 'de', 'es']) assert.doesNotMatch(s.title[l] + s.text[l], /Misty/, 'never names the companion');
  assert.ok(S.VERSION >= 28);
  assert.match(read('tutorial.js'), /kitchen: \{ go\(\) \{ if \(W\.LowiKitchenGame && W\.LowiKitchenGame\.open\)/);
});

test('the future idea (decorate and upgrade the kitchen with points) is a ticket, not built', () => {
  assert.match(read('TICKETS.md'), /Kitchen: decorate and upgrade your kitchen with points/);
  assert.doesNotMatch(read('kitchen-game.js'), /decorat/i);
});
