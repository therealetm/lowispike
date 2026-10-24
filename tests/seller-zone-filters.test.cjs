'use strict';
/* 24 Oct 2026 (Emmanuel's screenshot: the Seller Zone strip mixed All, chips/crisps, chocolate, gummies with Germany & EU, UK, USA in one
   jumble above the products). Shelves and regions are now two rows, each with its own label (Category / Region), each with its own
   selected look; filtering stays the same: shelf AND region together. Runs seller-zone.js in a small stand-in window. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
function load(lang, store) {
  const ls = Object.assign({}, store || {});
  const ctx = {
    console, setTimeout, clearTimeout, requestAnimationFrame: f => f(),
    localStorage: { getItem: k => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); }, removeItem: k => { delete ls[k]; } },
    navigator: { language: lang, languages: [lang] }, Intl,
    document: { documentElement: { lang, classList: { add() { }, remove() { } } }, addEventListener() { }, removeEventListener() { }, body: { appendChild() { } } },
    addEventListener() { }
  };
  ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
  for (const f of ['seller-zone-data.js', 'seller-zone-core.js', 'seller-zone.js']) vm.runInContext(read(f), ctx, { filename: f });
  return { Z: ctx.LowiSellerZone, D: ctx.LowiSellerZoneData, C: ctx.LowiSellerZoneCore, ls };
}
const target = attrs => ({ closest: sel => { if (sel === '[data-sz-inline]') return {}; const m = /^\[(data-[\w-]+)\]$/.exec(sel); if (!m || !(m[1] in attrs)) return null; return { getAttribute: k => attrs[k] }; } });
const rows = h => [...h.matchAll(/<div class="sz-filter (sz-filter-cat|sz-filter-reg)"[^>]*>([\s\S]*?)<\/div><\/div>/g)].map(m => ({ kind: m[1], html: m[0], body: m[2] }));

for (const [lang, cat, reg] of [['en', 'Category', 'Region'], ['de', 'Kategorie', 'Region'], ['es', 'Categoría', 'Región']]) {
  test('two labelled rows in ' + lang + ': ' + cat + ' holds only shelves, ' + reg + ' only regions', () => {
    const { Z, D } = load(lang, { 'lowi.sellerZone.region': 'eu' });
    const r = rows(Z.inlineHTML());
    assert.equal(r.length, 2, 'exactly two filter rows');
    assert.deepEqual(r.map(x => x.kind), ['sz-filter-cat', 'sz-filter-reg']);
    assert.match(r[0].html, new RegExp('<span class="sz-flabel" id="sz-fl-cat">' + cat + '</span>'));
    assert.match(r[1].html, new RegExp('<span class="sz-flabel" id="sz-fl-reg">' + reg + '</span>'));
    assert.match(r[0].html, /role="group" aria-labelledby="sz-fl-cat"/);
    assert.match(r[1].html, /role="group" aria-labelledby="sz-fl-reg"/);
    assert.equal((r[0].body.match(/data-sz-cat="/g) || []).length, D.CATS.length + 1);
    assert.doesNotMatch(r[0].body, /data-sz-reg=/, 'no region in the category row');
    assert.equal((r[1].body.match(/data-sz-reg="/g) || []).length, 4);
    assert.doesNotMatch(r[1].body, /data-sz-cat=/, 'no shelf in the region row');
  });
}

test('the two rows have their own selected look and say which one is on', () => {
  const { Z } = load('en', { 'lowi.sellerZone.region': 'uk' });
  Z.setCat('choc');
  const r = rows(Z.inlineHTML());
  assert.match(r[0].body, /class="sz-chip on" data-sz-cat="choc" aria-pressed="true"/);
  assert.equal((r[0].body.match(/aria-pressed="true"/g) || []).length, 1);
  assert.match(r[1].body, /class="sz-chip sz-reg on" data-sz-reg="uk" aria-pressed="true"/);
  assert.equal((r[1].body.match(/aria-pressed="true"/g) || []).length, 1);
  const css = read('seller-zone.css');
  assert.match(css, /\.sz-reg\.on\s*\{[^}]*background:[^}]*#ffd877/i, 'region on: warm gold, not the shelf cyan');
  assert.match(css, /html\[data-theme="light"\] \.sz-chip\s*\{/, 'day mode chip contrast');
  assert.match(css, /html\[data-theme="light"\] \.sz-reg\.on\s*\{/);
  assert.match(css, /\.sz-flabel\s*\{/);
});

test('shelf and region filter together, exactly as before', () => {
  const { Z, D, C } = load('en', { 'lowi.sellerZone.region': 'eu' });
  for (const [cat, reg] of [['chips', 'eu'], ['chips', 'uk'], ['choc', 'us'], ['all', 'uk'], ['choc', 'all']]) {
    Z.inlineClick(target({ 'data-sz-cat': cat }));
    Z.inlineClick(target({ 'data-sz-reg': reg }));
    const h = Z.inlineHTML(), want = C.list(D, cat, reg).length;
    assert.equal((h.match(/class="sz-card/g) || []).length, want, cat + ' + ' + reg);
  }
});

/* 24 Oct 2026 (Emmanuel: minimal, consistent, one word per bubble). Every filter chip shows one word after its emoji, in en/de/es;
   the full name stays for screen readers. */
for (const lang of ['en', 'de', 'es']) {
  test('every filter chip shows one word in ' + lang + ', full name for screen readers', () => {
    const { Z, D } = load(lang, { 'lowi.sellerZone.region': 'eu' });
    const h = Z.inlineHTML();
    const chips = [...h.matchAll(/<button type="button" class="sz-chip[^"]*"([^>]*)>([^<]*)<\/button>/g)];
    assert.equal(chips.length, D.CATS.length + 1 + 4);
    for (const [, attrs, text] of chips) {
      const words = text.trim().split(/\s+/).slice(1).join(' ');
      assert.ok(words.length > 0, 'label after the emoji');
      assert.ok(!/\s/.test(words.replace('EE. UU.', 'EEUU')), lang + ': one word, got "' + words + '"');
      assert.ok(!/[&]| y /.test(words), lang + ': no joined pair, got "' + words + '"');
    }
    for (const c of D.CATS) assert.match(h, new RegExp('data-sz-cat="' + c.id + '"[^>]*aria-label="' + c.t[lang].replace(/&/g, '&amp;').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"'));
    assert.match(h, /data-sz-reg="eu"[^>]*aria-label="(Germany &amp; EU|Deutschland &amp; EU|Alemania y UE)"/);
  });
}
