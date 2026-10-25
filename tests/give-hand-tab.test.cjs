'use strict';
/* Oct 25, 2026 (Emmanuel: Give a hand should have "its own place next to Supermarket, Seller Zone and Kitchen", not inside
   Kitchen). The Shop tab bar gets a fourth peer, Give a hand, behind the same server gate as the old row. Tapping it opens the
   Give a hand panel on top of Shop (Back returns to Shop). The old Give a hand row is gone from Kitchen and the Supermarket pane,
   so it lives in one place. It is a door, never the remembered Shop tab. The Room galaxy is not part of this.
   Browser check (real taps, 390x844 and small phones, en/de/es): tools/give-hand-tab/check.cjs. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const sp = read('store-picks.js');

test('Shop tab bar: Give a hand is the fourth peer after Supermarket, Seller Zone and Kitchen, in en/de/es, behind the server gate', () => {
  const tabs = sp.slice(sp.indexOf('function tabsHTML()'), sp.indexOf('function szHTML()'));
  const iK = tabs.indexOf("b('kitchen'"), iG = tabs.indexOf("b('gift'");
  assert.ok(iK > 0 && iG > iK, 'Give a hand comes after Kitchen');
  assert.match(tabs, /b\('gift', '\\u\{1F91D\}', T\('Give a hand', 'Hilf mit', 'Echa una mano'\)\)/, 'same name and icon as the old row');
  assert.match(tabs, /const G = giftDoor\(\);/);
  assert.match(tabs, /n > 3 \? ' stp-tabs4' : ''/);
  /* same gate as the old row: only once the server has the basket table; otherwise ask the server again */
  const door = sp.slice(sp.indexOf('function giftDoor()'), sp.indexOf('function giftDoor()') + 400);
  assert.match(door, /GB && GB\.serverReady && GB\.serverReady\(\)/);
  assert.match(door, /GB\.probe\(\)/);
  /* the bar appears without reopening Shop once the server answers */
  assert.match(sp, /W\.addEventListener\('lowi:gift-ready', \(\) => \{ if \(ov\) paint\(data \? 'keep' : undefined\); \}\);/);
  const css = read('store-picks.css');
  assert.match(css, /\.stp-tabs\.stp-tabs3\.stp-tabs4 \{ grid-template-columns: 1fr 1fr 1fr 1fr/);
  assert.match(css, /\.stp-tabs\.stp-tabs3 \{ grid-template-columns: 1fr 1fr 1fr/, 'three-tab rule kept');
});

test('tapping Give a hand opens its panel on top of Shop and is never saved as the Shop tab', () => {
  const click = sp.slice(sp.indexOf("const tb = t.closest('[data-stp-tab]')"), sp.indexOf('if (onSz() && SZ().inlineClick(t))'));
  assert.match(click, /if \(tb\.getAttribute\('data-stp-tab'\) === 'gift'\) \{ try \{ W\.LowiGiftBasket\.open\('shop'\); \} catch \(x\) \{\} return; \}/);
  assert.match(sp, /tab = \(\{ sz: 'sz', kitchen: 'kitchen' \}\)\[localStorage\.getItem\(TKEY\)\] \|\| 'shop'/);
  assert.match(sp, /const next = id === 'sz' && SZ\(\) \? 'sz' : id === 'kitchen' && K \? 'kitchen' : 'shop';/);
});

test('Give a hand is no longer a row inside Kitchen or the Supermarket pane: one place only', () => {
  assert.doesNotMatch(sp, /giftEntry\(\)/, 'no Give a hand row in kitHTML or shopActs');
  assert.doesNotMatch(sp, /entryHTML\(\) : ''; \} catch/, 'the row helper is gone');
  /* the panel still opens from a row anywhere else that uses data-stp="gift" */
  assert.match(sp, /t\.closest\('\[data-stp="gift"\]'\)\) \{ try \{ W\.LowiGiftBasket\.open\('shop'\); \} catch \(x\) \{\} return; \}/);
  assert.ok(fs.existsSync(path.join(root, 'tools/give-hand-tab/check.cjs')));
});
