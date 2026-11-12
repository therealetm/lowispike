// 11 Nov 2026 (Emmanuel): "Throw the Seller Zone out ... People need insulin-friendly snacks. Either the ones from the seller zone
// ... or ones that people found in the store, and those then go in there ... a community cross-platform snack wardrobe."
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const C = require('../snack-shelf-core.js');
const P = (o) => Object.assign({ id: 'x', barcode: '', name: 'X', brand: '', cat: 'other', verdict: 'ok', img: '', by: 'u1', byName: 'Anna', catches: 1, ts: 1 }, o);

test('the tab has its own name in English, German and Spanish, and it is not Seller Zone', () => {
  assert.deepStrictEqual(C.NAME, { en: 'Snack shelf', de: 'Snack-Regal', es: 'Estante de snacks' });
  const all = [];
  for (const [k, v] of Object.entries(C.W)) { assert.ok(Array.isArray(v) && v.length === 3, k); v.forEach(x => { assert.ok(x, k); all.push(x); }); }
  assert.ok(!/Seller Zone|Misty|heilt|cures/i.test(all.join(' ')));
});

test('only finds that pass the Food check stand on the shelf', () => {
  const out = C.community([P({ name: 'Chips', verdict: 'ok' }), P({ name: 'Cola', verdict: 'spike' }), P({ name: 'Hm', verdict: 'unknown' }), P({ name: '  ', verdict: 'ok' }), null]);
  assert.deepStrictEqual(out.map(x => x.name), ['Chips']);
});

test('one pack per barcode or name; snack groups first, then the most found, then the newest', () => {
  const out = C.community([P({ name: 'Skyr', cat: 'dairy', catches: 9, barcode: '1' }), P({ name: 'Nori', cat: 'snack', catches: 2, barcode: '2' }), P({ name: 'Nori again', cat: 'snack', barcode: '2' }),
    P({ name: 'Kakao', cat: 'sweets', catches: 5, barcode: '3' }), P({ name: 'Käse Chips', cat: 'snack', catches: 4 }), P({ name: 'kase chips', cat: 'snack' })]);
  assert.deepStrictEqual(out.map(x => x.name), ['Käse Chips', 'Nori', 'Kakao', 'Skyr']);
});

test('the credit line: who found it and how often; your own finds say so; a test account\'s name never shows', () => {
  const out = C.community([P({ name: 'A', barcode: '11', catches: 3 }), P({ name: 'B', barcode: '22', byName: 'Testbot', by: 'bot1' }), P({ name: 'C', barcode: '33', byName: 'Mia' })], { mineKeys: ['33'], hidden: u => u === 'bot1' });
  const by = n => out.find(x => x.name === n);
  assert.strictEqual(C.credit(by('A'), 'de'), 'von Anna · 3× gefunden');
  assert.strictEqual(C.credit(by('B'), 'de'), '');
  assert.strictEqual(by('C').mine, true); assert.strictEqual(C.credit(by('C'), 'de'), 'von dir');
  assert.strictEqual(C.credit(by('A'), 'en'), 'by Anna · found 3×');
});

test('a picture is only taken from an https address; nine packs to a shelf', () => {
  const out = C.community([P({ name: 'A', img: 'https://images.example/a.jpg' }), P({ name: 'B', img: 'javascript:alert(1)' }), P({ name: 'C', img: 'http://x.example/c.jpg' })]);
  assert.deepStrictEqual(out.map(x => x.img), ['https://images.example/a.jpg', '', '']);
  const list = Array.from({ length: 20 }, (_, i) => ({ name: 'n' + i }));
  assert.strictEqual(C.page(list, 0).items.length, 9); assert.strictEqual(C.page(list, 0).left, 11); assert.strictEqual(C.page(list, 18).left, 2);
});

test('Einkaufen shows the snack shelf where the Seller Zone tab was', () => {
  const sp = read('store-picks.js'), sn = read('snack-shelf.js'), sz = read('seller-zone.js');
  assert.match(sp, /if \(N\) \{ N\.refresh\(.*N\.headHTML\(\) \+ '<div class="stp-scroll stp-sz">' \+ N\.html\(snackEnv\(\)\)/);
  assert.match(sp, /SN\(\) \? SN\(\)\.name\(\) : Z\.name\(\)/, 'the tab carries the shelf\'s name');
  assert.match(sp, /label: SN\(\)\.name\(\), n: 0, sub: T\('Found by the community', 'Von der Community gefunden', 'Encontrados por la comunidad'\)/, 'the Home door too');
  assert.match(sn, /W\.LowiDex\.items\(\)/, 'finds come from the shared product list');
  assert.match(sn, /z\.orderItems\(\)/, 'the checked snacks to order stay');
  assert.match(sz, /orderItems, regionsHTML, cardHTML/);
  assert.match(sn, /data-sn="scan"/); assert.match(sp, /scan: \(\) => \{ close\(\);/, 'a find gets on the shelf through the scanner');
  assert.ok(!/addXP|award\(|insert\(|upsert\(/.test(sn), 'the shelf itself writes nothing to the server and pays no XP');
});

test('loaded before store-picks.js and cached offline', () => {
  const html = read('index.html'), sw = read('sw.js');
  for (const f of ['snack-shelf-core.js', 'snack-shelf.js', 'snack-shelf.css']) { assert.ok(html.includes(f + '?v='), f); assert.ok(sw.includes('"' + f + '"'), f + ' in sw.js'); }
  assert.ok(html.indexOf('snack-shelf.js?v=') < html.indexOf('<script src="store-picks.js?v='));
  assert.ok(html.indexOf('market-game.css?v=') < html.indexOf('snack-shelf.css?v='), 'the shelf boards come from the market stylesheet');
});
