// 11 Nov 2026 (Emmanuel): Supermarket as a game: shelves (only what passes) -> basket -> fridge -> table and plate; air fryer,
// oven or pan changes the plate; one button gives the plain list back for people who just want to type or scroll.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const C = require('../market-game-core.js');

test('four stations in order, three cookers, the game is the default and the list is remembered', () => {
  assert.deepStrictEqual(C.STATIONS, ['shelf', 'basket', 'fridge', 'table']);
  assert.deepStrictEqual(C.DEVICES, ['airfryer', 'oven', 'pan']);
  assert.strictEqual(C.mode(null), 'game'); assert.strictEqual(C.mode('list'), 'list'); assert.strictEqual(C.mode('x'), 'game');
  assert.strictEqual(C.station('nope'), 'shelf'); assert.strictEqual(C.station('table'), 'table');
});

test('every word exists in English, German and Spanish; no medical promise, never "Misty"', () => {
  const all = [];
  for (const [k, v] of Object.entries(C.W)) { assert.ok(Array.isArray(v) && v.length === 3, k); v.forEach(x => { assert.ok(x && typeof x === 'string', k); all.push(x); }); }
  for (const s of C.STATIONS.concat(C.DEVICES)) assert.ok(C.word(s, 'de') && C.word(s, 'es') && C.word(s, 'en'));
  for (const d of C.DEVICES) assert.ok(C.word('plate_' + d, 'de'));
  assert.ok(!/Misty|blutzucker|blood sugar|heilt|cures|diabet/i.test(all.join(' ')));
  assert.strictEqual(C.word('fridge', 'de'), 'Kühlschrank'); assert.strictEqual(C.word('list', 'de'), 'Einfache Liste');
});

test('aisles: only groups with something that passes, nine packs to a shelf, more on the next shelf', () => {
  const pass = n => Array.from({ length: n }, (_, i) => ({ p: { n: 'P' + i } }));
  const gs = [{ id: 'a', pass: pass(20), fail: pass(3) }, { id: 'b', pass: [], fail: pass(5) }, { id: 'c', pass: pass(2) }];
  assert.deepStrictEqual(C.aisles(gs), [{ id: 'a', n: 20, shelves: 3 }, { id: 'c', n: 2, shelves: 1 }]);
  const one = C.shelfItems(gs[0], 0); assert.strictEqual(one.items.length, 9); assert.strictEqual(one.left, 11); assert.strictEqual(one.next, 18);
  const all = C.shelfItems(gs[0], 27); assert.strictEqual(all.items.length, 20); assert.strictEqual(all.left, 0);
});

test('table: lay out and take back, at most eight, entries gone from the fridge leave the table', () => {
  let t = C.table(null); assert.deepStrictEqual(t, { ids: [], dev: '' });
  let r = C.toggle(t, 'k1'); assert.ok(r.on); t = r.table;
  r = C.toggle(t, 'k2'); t = r.table; assert.deepStrictEqual(t.ids, ['k1', 'k2']);
  r = C.toggle(t, 'k1'); assert.ok(!r.on); assert.deepStrictEqual(r.table.ids, ['k2']);
  let full = C.table({ ids: ['1', '2', '3', '4', '5', '6', '7', '8'] });
  r = C.toggle(full, '9'); assert.ok(r.full); assert.strictEqual(r.table.ids.length, 8);
  assert.deepStrictEqual(C.prune({ ids: ['a', 'b'], dev: 'pan' }, ['b']), { ids: ['b'], dev: 'pan' });
  assert.deepStrictEqual(C.prune({ ids: ['a'], dev: 'pan' }, []), { ids: [], dev: '' });
  assert.deepStrictEqual(C.table('{"ids":["a","a",5,""],"dev":"microwave"}'), { ids: ['a'], dev: '' });
  assert.deepStrictEqual(C.clear(), { ids: [], dev: '' });
});

test('the plate changes with the cooker; a second tap on the same cooker takes it off again', () => {
  let t = C.table({ ids: ['a'] });
  assert.strictEqual(C.plate(t, ['Eier'], 'de').title, 'Auf deinem Teller');
  t = C.setDevice(t, 'pan'); assert.strictEqual(C.plate(t, ['Eier'], 'de').title, 'Scharf angebraten aus der Pfanne');
  t = C.setDevice(t, 'oven'); assert.strictEqual(C.plate(t, ['Eier'], 'de').title, 'Goldbraun aus dem Ofen');
  t = C.setDevice(t, 'airfryer'); assert.strictEqual(C.plate(t, ['Eier'], 'en').title, 'Crispy from the air fryer');
  t = C.setDevice(t, 'airfryer'); assert.strictEqual(t.dev, '');
  assert.strictEqual(C.plate(t, [], 'de').on, false);
  assert.strictEqual(C.plate(t, ['a', 'b', 'c', 'd', 'e', 'f', 'g'], 'de').foods.length, C.PLATE_MAX);
});

test('recipes that fit: by shared food words, the picked cooker first', () => {
  const R = [{ id: 'a', name: 'A', words: ['Chicken breast', 'Hähnchenbrust', 'Zucchini'], make: 'Sear the chicken in a hot pan.' },
    { id: 'b', name: 'B', words: ['Zucchini', 'Feta'], make: 'Bake in the oven until golden.' }, { id: 'c', name: 'C', words: ['Salmon', 'Lachs'], make: 'Air fry.' }];
  assert.deepStrictEqual(C.fits(['Hähnchenbrust', 'Zucchini'], R, '').map(r => r.id), ['a', 'b']);
  assert.deepStrictEqual(C.fits(['Hähnchenbrust', 'Zucchini'], R, 'oven').map(r => r.id), ['b', 'a']);
  assert.deepStrictEqual(C.fits(['Lachsfilet'], R, 'airfryer').map(r => r.id), ['c']);
  assert.deepStrictEqual(C.fits(['Ei'], R, ''), []); assert.deepStrictEqual(C.fits([], R, ''), []);
  assert.strictEqual(C.recipeId('Nori Smash Burger Stack'), 'rb_nori_smash_burger_stack');
});

test('pictures are remembered by name, https only, and never grow without end', () => {
  let p = C.remember(null, 'Tofu Natur', 'https://images.example/tofu.jpg');
  assert.strictEqual(C.picOf(p, 'tofu  natur'), 'https://images.example/tofu.jpg');
  p = C.remember(p, 'Bad', 'javascript:alert(1)'); assert.strictEqual(C.picOf(p, 'Bad'), '');
  p = C.remember(p, 'Http', 'http://x.example/a.jpg'); assert.strictEqual(C.picOf(p, 'Http'), '');
  for (let i = 0; i < C.PICS_MAX + 20; i++) p = C.remember(p, 'item ' + i, 'https://x.example/' + i + '.jpg');
  assert.strictEqual(Object.keys(p).length, C.PICS_MAX);
  assert.deepStrictEqual(C.pics('{"a b":"https://x.example/1.jpg","Bad Key":"https://x.example/2.jpg","c":"data:x"}'), { 'a b': 'https://x.example/1.jpg' });
});

test('pack names lose weight and price that some range lists carry in the name', () => {
  assert.strictEqual(C.shortName('EDEKA Schapfen Mühle Leinsamen geschrotet 200g 0.99€ 1kg 4.9'), 'EDEKA Schapfen Mühle Leinsamen geschrotet');
  assert.strictEqual(C.shortName('Tofu Natur 2 x 200 g'), 'Tofu Natur');
  assert.strictEqual(C.shortName('Eier'), 'Eier'); assert.strictEqual(C.shortName('7 Up'), '7 Up');
});

test('Supermarket opens as the game market and keeps the plain list one tap away', () => {
  const sp = read('store-picks.js'), mk = read('market-game.js');
  assert.match(sp, /else if \(gameOn\(\) && data\) \{/);
  assert.match(sp, /<div id="mkRoot"><\/div>/);
  assert.match(sp, /function mountMarket\(\)/); assert.match(sp, /mountMarket\(\);\s+watchThumbs\(\);/);
  assert.match(sp, /class="stp-tomarket" data-stp="market"/, 'the list has a way back to the market');
  assert.match(sp, /if \(a === 'market'\) \{ try \{ W\.LowiMarket\.setMode\('game'\); \}/);
  assert.match(mk, /data-mk="list"/); assert.match(mk, /if \(a === 'list'\) \{ setMode\('list'\);/);
  assert.match(sp, /groups: \(\) => \(built \? built\.groups : \[\]\)/);
  assert.match(mk, /filter\(g => g && g\.pass && g\.pass\.length\)/, 'only passing products reach the shelves');
  assert.doesNotMatch(mk, /\.fail\b/, 'left-out products are never drawn in the game');
});

test('the game uses the existing basket and kitchen, invents no price, pays no XP and makes no sound', () => {
  const sp = read('store-picks.js'), mk = read('market-game.js');
  assert.match(sp, /cartLines: \(\) => sh\.cartLines\(\), cartTotal: \(\) => sh\.cartTotal\(\)/);
  assert.match(sp, /localStorage\.setItem\(KC\.KEY, JSON\.stringify\(next\)\)/);
  assert.match(mk, /l\.p != null \? env\.money\(l\.p \* \(l\.q \|\| 1\)\) : l\.pe != null \? '≈ '/);
  assert.match(mk, /w\('noPrice'\)/);
  assert.ok(!/addXP|award\(|LowiAudio|speak\(/.test(mk));
  assert.match(mk, /env\.K\.addProduct\(k, src \? \{ n, img: src \} : \{ n \}, now \+ i, 'cart'\)/, 'Bought moves the basket into the fridge');
  assert.match(mk, /env\.cartDrop\(l\.id\)/);
});

test('loaded before store-picks.js, cached offline, tap areas and reduced motion in the stylesheet', () => {
  const html = read('index.html'), sw = read('sw.js'), css = read('market-game.css');
  for (const f of ['market-game-core.js', 'market-game.js', 'market-game.css']) { assert.ok(html.includes(f + '?v='), f); assert.ok(sw.includes('"' + f + '"'), f + ' in sw.js'); }
  assert.ok(html.indexOf('market-game.js?v=') < html.indexOf('<script src="store-picks.js?v='));
  assert.ok(html.indexOf('kitchen-core.js?v=') < html.indexOf('market-game.js?v='));
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /\.mk-step \{ width: 44px; height: 44px;/);
  assert.match(css, /\.mk-i \{[^}]*width: 44px; height: 44px;/);
});
