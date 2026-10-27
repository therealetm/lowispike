'use strict';
/* Oct 23, 2026 (Eman: "Wo ist der Seller Zone versteckt? Pack ihn mal auch in Shop. Mit dem selben Design damit man da durch
   scrollen kann."): the Seller Zone lives inside Fuel > Shop. Two tabs on top of the Shop panel (Supermarket | Seller Zone);
   the Seller Zone tab is the whole zone in the panel's own scroll, same cards, shelves and regions as the zone itself; the
   Supermarket tab starts with a swipe shelf of the zone's snacks, and a snack there opens its card on the zone tab.
   Runs seller-zone.js against a small stand-in window (no browser needed); the browser check is tools/check-shop-seller.cjs. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

function load(lang, store) {
  const ls = Object.assign({}, store || {});
  const docEl = { lang, classList: { add() { }, remove() { } } };
  const ctx = {
    console, setTimeout, clearTimeout, requestAnimationFrame: f => f(),
    localStorage: { getItem: k => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); }, removeItem: k => { delete ls[k]; } },
    navigator: { language: lang, languages: [lang] }, Intl,
    document: { documentElement: docEl, addEventListener() { }, removeEventListener() { }, body: { appendChild() { } } },
    addEventListener() { }
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  for (const f of ['seller-zone-data.js', 'seller-zone-core.js', 'seller-zone.js']) vm.runInContext(read(f), ctx, { filename: f });
  return { Z: ctx.LowiSellerZone, D: ctx.LowiSellerZoneData, ls, docEl };
}
/* a tap target: something inside the panel's zone with these data attributes */
const target = (attrs, inside) => ({ closest: sel => {
  if (sel === '[data-sz-inline]') return inside === false ? null : {};
  const m = /^\[(data-[\w-]+)\]$/.exec(sel); if (!m || !(m[1] in attrs)) return null;
  return { getAttribute: k => attrs[k] };
} });
const count = (s, re) => (s.match(re) || []).length;

test('the Seller Zone tab shows the whole zone, the same cards, shelves and regions as the zone itself', () => {
  const { Z, D } = load('de', { 'lowi.sellerZone.region': 'eu' });
  assert.equal(typeof Z.inlineHTML, 'function');
  const h = Z.inlineHTML();
  assert.match(h, /^<div class="sz-inline" data-sz-inline="1">/);
  assert.equal(count(h, /class="sz-card/g), D.P.length, 'every product, nothing hidden');
  assert.equal(count(h, /data-sz-cat="/g), D.CATS.length + 1, 'all shelves + Alle');
  assert.equal(count(h, /data-sz-reg="/g), 4, 'Deutschland & EU, UK, USA, Alle');
  assert.match(h, /sz-failed/, 'checked and failed list too');
  assert.match(h, /Geprüft am 23\.10\.2026/);
  assert.doesNotMatch(h, /role="dialog"/, 'inside the panel, not a second dialog');
  /* the overlay from the scanner card is the same body in a frame */
  assert.match(Z.inlineHeadHTML(), /<h3>Seller Zone<\/h3>/);
  assert.equal(Z.count(), D.P.length);
});

test('shelf and region chips inside the panel change the zone; taps elsewhere do nothing', () => {
  const { Z, ls } = load('de', { 'lowi.sellerZone.region': 'eu' });
  assert.equal(Z.inlineClick(target({ 'data-sz-cat': 'chips' })), true);
  let h = Z.inlineHTML();
  assert.match(h, /sz-chip on" data-sz-cat="chips"/);
  const chips = count(h, /class="sz-card/g);
  assert.ok(chips > 0 && chips < Z.count());
  assert.equal(Z.inlineClick(target({ 'data-sz-reg': 'us' })), true);
  assert.equal(ls['lowi.sellerZone.region'], 'us', 'the region is remembered');
  assert.match(Z.inlineHTML(), /sz-reg on" data-sz-reg="us"/);
  assert.equal(Z.inlineClick(target({ 'data-sz-cat': 'all' }, false)), false, 'outside the zone: not ours');
  assert.equal(Z.inlineClick(target({})), false);
  assert.equal(Z.inlineClick(null), false);
  Z.setCat('nonsense'); assert.match(Z.inlineHTML(), /sz-chip on" data-sz-cat="all"/);
});

test('the Supermarket tab shelf: every snack, in your region first, a tap opens its card on the zone tab', () => {
  const { Z, D } = load('de', { 'lowi.sellerZone.region': 'eu' });
  const s = Z.stripHTML();
  assert.match(s, /class="sz-strip"/);
  assert.ok(s.includes('data-stp-tab="sz">Alle ' + D.P.length + ' \u203a</button>'), 'Alle 17 goes to the zone tab');
  const ids = [...s.matchAll(/data-sz-focus="([^"]+)"/g)].map(m => m[1]);
  assert.equal(ids.length, D.P.length);
  const firstNonEu = ids.findIndex(id => !D.P.find(x => x.id === id).r.includes('eu'));
  assert.ok(firstNonEu > 0 && ids.slice(firstNonEu).every(id => !D.P.find(x => x.id === id).r.includes('eu')), 'Deutschland & EU first');
  assert.match(s, /Snacks online bestellen, alle geprüft/);
  const en = load('en', { 'lowi.sellerZone.region': 'us' }).Z.stripHTML(), es = load('es', { 'lowi.sellerZone.region': 'eu' }).Z.stripHTML();
  assert.match(en, /Snacks to order online, all checked/); assert.match(en, />All 17 /);
  assert.match(es, /Snacks para pedir online, todos revisados/); assert.match(es, />Todos 17 /);
});

test('wired into the Shop panel: tabs on top, zone tab, shelf, remembered tab, no repaint over the zone', () => {
  const sp = read('store-picks.js'), css = read('store-picks.css');
  assert.match(sp, /function tabsHTML\(\)/);
  assert.match(sp, /return '<div class="stp-card[^\n]*tabsHTML\(\) \+ inner/, 'every Shop view starts with the tabs');
  assert.match(sp, /role="tablist"/); assert.match(sp, /role="tab" aria-selected=/);
  /* Oct 27 2026 (test changed, why): with four tabs (From home joined) Spanish says Súper so it fits one line on an iPhone SE */
  assert.match(sp, /T\('Supermarket', 'Supermarkt', n > 3 \? 'Súper' : 'Supermercado'\)/);
  assert.match(sp, /ov\.innerHTML = onSz\(\) \? szHTML\(\) :/);
  /* Oct 26 (Emmanuel, MAYA-HANDOFF 0.22: "Remove Seller Zone in Supermarket. Seller Zone has its own section"): no strip inside the Supermarket tab */
  assert.doesNotMatch(sp, /Z\.stripHTML \? Z\.stripHTML\(\)/, 'the Seller Zone shelf left the Supermarket tab; Seller Zone has its own tab');
  assert.match(sp, /'lowi\.storePicks\.tab'/);
  assert.match(sp, /if \(ov && view === 'list' && (!onSz\(\)|onShop\(\))\) paint\(\)/, 'the list loading behind the zone tab never throws you back to the top');
  assert.match(sp, /if \(onSz\(\) && SZ\(\)\.inlineClick\(t\)\) \{ paint\('keep'\)/);
  assert.match(sp, /a === 'sellerzone'\) \{ setTab\('sz'\)/, 'the old entry button also goes to the tab');
  assert.match(sp, /function focusCard\(id\)/);
  assert.match(css, /\.stp-tab \{[^}]*min-height: 44px/, 'thumb-sized tabs');
  assert.match(css, /\.sz-strip-row \{[^}]*overflow-x: auto/, 'the shelf swipes sideways');
  assert.match(css, /prefers-reduced-motion: reduce\) \{ \.stp-sz \.sz-glow/);
  /* the zone files load after store-picks, so the panel looks the zone up when it paints, not at load */
  assert.match(sp, /const SZ = \(\) => W\.LowiSellerZone && W\.LowiSellerZone\.inlineHTML \? W\.LowiSellerZone : null/);
  assert.ok(fs.existsSync(path.join(root, 'tools/check-shop-seller.cjs')));
});
