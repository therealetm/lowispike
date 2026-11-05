'use strict';
/* Oct 27, 2026 (Emmanuel, Shop > Supermarkt: "Supermarket looks crazy, like so overwhelming. I don't know what to do here. So many
   things. Too much. So viel auf einmal. Vielleicht möchte 'Von zu Hause einkaufen' seine eigene Sektion haben, neben Supermarkt,
   Seller Zone und Hilf mit... Remember our focus is minimalism, efficiency, convenience. And we care about people with mental
   health."). Supermarket: the question, the store and search, a small round Cart button in the title row, then categories and
   products; Scan in the shop is the one big button, at the bottom next to the X. Shop from home is its own tab (Zu Hause / From
   home / Desde casa) right next to Supermarket, drawn inside Shop. The snack list is one closed line. A swipe down on the From
   home title closes Shop like the tab bar and the Supermarket title.
   Browser check (simulated touch, iPhone and SE sizes, de/en/es): tools/shop-calm/flow.cjs. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const sp = read('store-picks.js');
const css = read('store-picks.css');
const wb = read('week-basket.js');

test('Supermarket: Cart is a round button in the title row, Scan in the shop is the one primary at the bottom, no Shop from home card', () => {
  assert.match(sp, /function titleRow\(text\) \{\s*return '<div class="stp-titlerow"><h3>'/);
  assert.match(sp, /class="stp-cartbtn" data-stp="cart"/);
  assert.match(sp, /class="stp-go stp-scanshop" data-stp="scanshop"/);
  assert.doesNotMatch(sp, /function wbDoor\(\)/, 'the big Shop from home card is gone from Supermarket');
  assert.doesNotMatch(sp, /class="stp-wb"/);
  /* Scan in the shop closes Shop and opens the scanner; it is a closing tap (BH-036) */
  assert.match(sp, /if \(a === 'scanshop'\) \{ close\(\); setTimeout\(\(\) => \{ try \{ W\.LowiShopScan\.open\(\); \} catch \(x\) \{\} \}, 200\); return; \}/);
});

test('the snack list (with Buy again) is folded into one closed line, My snack list / Meine Snackliste / Mi lista de snacks', () => {
  assert.match(sp, /<details class="stp-snackbox"/);
  assert.match(sp, /T\('My snack list', 'Meine Snackliste', 'Mi lista de snacks'\)/);
});

/* Nov 5 2026 (test changed, why): owner Phase B item 3, "Incorporate Zu Hause planning into Supermarkt as Plan my week". The planner
   is no own tab any more: a Plan my week row in Supermarkt opens it inside Supermarkt (Supermarkt stays lit, a back link returns). */
test('Plan my week (old Shop from home) lives inside Supermarkt, remembered, drawn inside Shop (no second sheet)', () => {
  const tabs = sp.slice(sp.indexOf('function tabsHTML()'), sp.indexOf('function szHTML()'));
  const iS = tabs.indexOf("b('shop'"), iZ = tabs.indexOf("b('sz'");
  assert.ok(iS > 0 && iZ > iS, 'Supermarket, then Seller Zone');
  assert.equal(tabs.indexOf("b('home'"), -1, 'no Zu Hause tab');
  assert.match(sp, /function planRowHTML\(\)[\s\S]{0,300}data-stp="weekshop"/);
  assert.match(sp, /T\('Plan my week', 'Meine Woche planen', 'Planear mi semana'\)/);
  assert.match(sp, /onBack: \(\) => setTab\('shop'\)/);
  assert.match(wb, /T\('Plan my week', 'Meine Woche planen', 'Planear mi semana'\)/);
  assert.match(wb, /if \(a === 'tosm'\) \{ if \(inl && inl\.onBack\) inl\.onBack\(\); return; \}/);
  assert.match(sp, /home: 'home' \}\)\[localStorage\.getItem\(TKEY\)\]/);
  assert.match(wb, /function mount\(el, opts\)/);
  assert.match(wb, /W\.LowiWeekBasket = \{ open, close, mount, unmount,/);
});

test('swipe down on the From home title closes Shop: the title is a drag zone and its words carry touch-action none', () => {
  assert.match(sp, /zone = t\.closest\('\.stp-tabs, \.stp-head, \.sz-head, \.wb-inline > \.wb-head'\)/);
  assert.match(css, /\.stp-card \.wb-inline > \.wb-head, \.stp-card \.wb-inline > \.wb-head \* \{ touch-action: none; \}/);
  /* spirit.js wraps words with an emoji in a display:contents span; that span has no box, the drag was cancelled */
  assert.match(css, /\.stp-card \.wb-inline > \.wb-head h3 > span, \.stp-titlerow h3 > span \{ display: inline; \}/);
});

test('the tour step for Plan my week points at its row in Supermarkt and says where it is', () => {
  const step = require('../tutorial-steps.js').STEPS.find(s => s.id === 'new-week-shop');
  assert.equal(step.target[0], '.stp-card .stp-plan');
  assert.match(step.text.en, /In Supermarket, tap Plan my week/);
  assert.match(step.text.de, /Im Supermarkt auf Meine Woche planen tippen/);
  assert.match(step.text.es, /En el súper, toca Planear mi semana/);
  for (const l of ['en', 'de', 'es']) assert.doesNotMatch(step.text[l], /insulin/i);
});
