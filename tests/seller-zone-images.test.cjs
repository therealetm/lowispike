'use strict';
/* Oct 23, 2026 (Eman: "Pls add images. Nobody likes just reading it."): every Seller Zone product shows its real photo.
   The photo comes from the product's own shop page, is stored in the repo (seller-zone-img/<id>.webp, small square webp, never
   hotlinked), loads lazily, and the emoji bubble underneath shows when a photo is missing or fails to load. Cards are image first:
   photo with verdict and price on it, name, portion and delivery; why and ingredients wait behind one tap.
   Runs seller-zone.js against a small stand-in window; the browser check is tools/check-seller-images.cjs. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

function load(lang, store) {
  const ls = Object.assign({}, store || {});
  const listeners = [];
  const ctx = {
    console, setTimeout, clearTimeout, requestAnimationFrame: f => f(),
    localStorage: { getItem: k => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); }, removeItem: k => { delete ls[k]; } },
    navigator: { language: lang, languages: [lang] }, Intl,
    document: { documentElement: { lang, classList: { add() { }, remove() { } } }, addEventListener(t, f, c) { listeners.push([t, f, c]); }, removeEventListener() { }, body: { appendChild() { } } },
    addEventListener() { }
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['seller-zone-data.js', 'seller-zone-core.js', 'seller-zone.js']) vm.runInContext(read(f), ctx, { filename: f });
  return { Z: ctx.LowiSellerZone, D: ctx.LowiSellerZoneData, listeners };
}
/* width and height of a lossy/lossless/extended webp */
function webpSize(buf) {
  assert.equal(buf.toString('ascii', 0, 4), 'RIFF'); assert.equal(buf.toString('ascii', 8, 12), 'WEBP');
  const kind = buf.toString('ascii', 12, 16);
  if (kind === 'VP8 ') return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
  if (kind === 'VP8L') { const b = buf.readUInt32LE(21); return [(b & 0x3fff) + 1, ((b >> 14) & 0x3fff) + 1]; }
  if (kind === 'VP8X') return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
  throw new Error('unknown webp ' + kind);
}

test('every product has a photo stored in the repo: square webp, small, from the product\'s own shop', () => {
  const { D } = load('de');
  assert.equal(D.P.length, 17);
  let total = 0;
  for (const x of D.P) {
    assert.equal(x.pic, 'seller-zone-img/' + x.id + '.webp', x.id + ' has its photo');
    const buf = fs.readFileSync(path.join(root, x.pic));
    const [w, h] = webpSize(buf);
    assert.equal(w, h, x.id + ' is square');
    assert.ok(w >= 300 && w <= 600, x.id + ' is sharp but not huge: ' + w);
    assert.ok(buf.length < 40 * 1024, x.id + ' stays under 40 KB: ' + buf.length);
    total += buf.length;
    assert.match(D.PIC_FROM[x.id], /^https:\/\//, x.id + ' keeps where its photo came from');
  }
  assert.ok(total < 450 * 1024, 'all photos together stay small: ' + total);
  /* nothing in the folder that no product uses */
  const files = fs.readdirSync(path.join(root, 'seller-zone-img')).sort();
  assert.deepEqual(files, JSON.parse(JSON.stringify(D.P.map(x => x.id + ".webp").sort())));
});

test('photos are published and never hotlinked from the shops', () => {
  const sf = require(path.join(root, 'scripts/site-files.cjs'));
  const { D } = load('de');
  for (const x of D.P) assert.ok(sf.published(x.pic), x.pic + ' is on the live site');
  const js = read('seller-zone.js');
  assert.doesNotMatch(js, /PIC_FROM\[/, 'the app never loads the shop\'s own image address');
});

test('cards are image first: photo with verdict and price, then name, portion and delivery; details behind one tap', () => {
  const { Z, D } = load('de', { 'lowi.sellerZone.region': 'ww' });
  Z.setCat('all');
  const html = Z.inlineHTML();
  const cards = html.split('<article class="sz-card').slice(1);
  assert.equal(cards.length, D.P.length);
  for (const c of cards) {
    const id = /data-sz-id="([^"]+)"/.exec(c)[1];
    const x = D.P.find(p => p.id === id);
    const pic = c.indexOf('class="sz-pic"'), name = c.indexOf('class="sz-tt"'), more = c.indexOf('class="sz-more"');
    assert.ok(pic > 0 && pic < name && name < more, id + ': photo first, then name, then details');
    assert.ok(c.includes('<img class="sz-img" src="' + x.pic + '"'), id + ' shows its photo');
    assert.match(c, /loading="lazy" decoding="async"/, id + ' photo loads lazily');
    assert.match(c, /width="400" height="400"/, id + ' photo keeps its box while it loads');
    assert.ok(c.includes('<span class="sz-ph-e">' + x.e + '</span>'), id + ' has the emoji bubble as fallback');
    assert.match(c.slice(pic, name), /class="sz-v /, id + ' verdict sits on the photo');
    if (x.price) assert.ok(c.slice(pic, name).includes('<span class="sz-price">' + x.price + '</span>'), id + ' price sits on the photo');
    assert.ok(c.slice(pic, name).includes('href="' + x.url + '"'), id + ' photo opens the shop page');
    assert.ok(c.indexOf('class="sz-why"') > more && c.indexOf('class="sz-ing"') > more, id + ' why and ingredients behind one tap');
    assert.ok(c.includes('class="sz-buy"') && c.includes('class="sz-amz"'), id + ' still has both buttons');
  }
  assert.match(html, /Warum okay · Zutaten/);
});

test('the scanner swaps and the Shop shelf show photo bubbles instead of emoji', () => {
  const { Z, D } = load('de', { 'lowi.sellerZone.region': 'eu' });
  const swap = Z.swapHTML({ verdict: 'spike', name: 'Haribo Goldbären' });
  assert.ok(swap, 'Haribo gets swaps');
  const minis = swap.split('class="sz-mini"').slice(1);
  assert.ok(minis.length >= 2);
  for (const m of minis) assert.match(m, /^[^]*?<span class="sz-ph sz-ph-m" aria-hidden="true"><span class="sz-ph-e">[^<]+<\/span><img class="sz-img" src="seller-zone-img\/[a-z0-9-]+\.webp"/);
  const strip = Z.stripHTML();
  assert.equal((strip.match(/<img class="sz-img"/g) || []).length, (strip.match(/sz-strip-it/g) || []).length);
  assert.equal((strip.match(/loading="lazy"/g) || []).length, D.P.length);
});

test('a product without a photo, or a photo that fails, shows the emoji bubble, never an empty box', () => {
  const { Z, D, listeners } = load('de', { 'lowi.sellerZone.region': 'ww' });
  const keep = D.P[0].pic; delete D.P[0].pic;
  Z.setCat('all');
  const html = Z.inlineHTML();
  const c = html.split('<article class="sz-card').slice(1).find(s => s.includes('data-sz-id="' + D.P[0].id + '"'));
  assert.match(c, /class="sz-ph sz-ph-l sz-noimg"/);
  assert.doesNotMatch(c, /<img /);
  D.P[0].pic = keep;
  /* a failed load: the capturing error listener drops the image and marks the bubble */
  const err = listeners.find(([t, , cap]) => t === 'error' && cap === true);
  assert.ok(err, 'listens for image errors (capturing)');
  const cls = new Set(['sz-ph']); let removed = false;
  const img = { classList: { contains: k => k === 'sz-img' }, parentNode: { classList: { add: k => cls.add(k) } }, remove() { removed = true; } };
  err[1]({ target: img });
  assert.ok(cls.has('sz-noimg') && removed);
  err[1]({ target: { classList: { contains: () => false } } });
});

test('styles: a shop shelf grid, photo windows in bubble style, no pulsing photos', () => {
  const css = read('seller-zone.css');
  assert.match(css, /\.sz-grid \{ grid-template-columns: repeat\(auto-fill, minmax\(150px, 1fr\)\)/);
  assert.match(css, /\.sz-ph-l \{[^}]*aspect-ratio: 1 \/ 1/);
  assert.match(css, /\.sz-ph::after \{[^}]*inset/);
  assert.match(css, /\.sz-ph\.sz-noimg \{/);
  assert.doesNotMatch(css.slice(css.indexOf('.sz-ph {')), /\.sz-ph[^{]*\{[^}]*animation/);
  /* brand and shop wrap instead of being cut off in the narrow phone column */
  assert.match(css, /\.sz-card \.sz-tt small \{[^}]*white-space: normal/);
  /* buttons stay thumb-sized */
  assert.match(css, /\.sz-buy, \.sz-amz \{[^}]*min-height: 44px/);
});

test('the service worker keeps loaded photos on the phone across updates', () => {
  const sw = read('sw.js');
  assert.match(sw, /\/seller-zone-img\/[^]*caches\.open\("lowispike-steps-seller-img"\)/);
  assert.match(sw, /k\.indexOf\("lowispike-steps"\) !== 0/, 'activate keeps the photo cache');
});
