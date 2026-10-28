/* Oct 28 2026 (Emmanuel, screenshots of Kochen and Home):
   1. "Schmeiß die Küche raus": Cook has no Kitchen game any more (no fridge, cabinet, bin, kitchen check), and nothing points into it.
   2. On Swipen "Alle" and a cut-off "He…" were squeezed beside the game switch: the switch, the source and the kind chips get a row each.
   3. The Home Einkaufen bubble showed a fork and knife, a "3" and an orange fill (read as meals eaten): a cart, no number, no fill.
   4. Einkaufen opened on Seller Zone / Hilf mit: it always opens on Supermarkt.
   5. Hilf mit felt like a new window: from Einkaufen it takes the same frame. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const has = f => fs.existsSync(path.join(__dirname, '..', f));

test('the Kitchen game is gone: files, page, service worker, Cook views', () => {
  for (const f of ['kitchen-game.js', 'kitchen-game-core.js', 'kitchen-game.css']) assert.ok(!has(f), f + ' removed');
  const html = R('index.html');
  assert.doesNotMatch(html, /kitchen-game/, 'the page loads nothing of the Kitchen game');
  assert.doesNotMatch(R('sw.js'), /kitchen-game/, 'the service worker does not cache it');
  assert.doesNotMatch(html, /kgRoot/, 'no Kitchen host in Cook');
  assert.doesNotMatch(html, /kitchen: \(\) => window\.LowiKitchenGame/, 'no Kitchen tab in the game switch');
  assert.match(html, /function ckView\(v\)\{ if \(v !== "shuffle" && v !== "swipe"\) return;/, 'only Shuffle and Swipe can be picked');
  assert.match(html, /function kitBtn\(r\)\{ return "";/, 'the recipe page has no In die Küche button');
  assert.deepStrictEqual(require('../cook-tab-order.js').IDS, ['shuffle', 'swipe']);
  assert.match(R('week-basket.js'), /function kitchenHas\(name\) \{\n        return false;/, 'old kitchen data no longer counts as at home');
  assert.ok(!require('../tutorial-steps.js').STEPS.some(s => /kitchen/.test(s.id) || s.open === 'kitchen'), 'no tour step opens the Kitchen');
});

test('Shop rows: no house button once there is no kitchen; the + still adds to the list', () => {
  const Q = require('../quick-add-core.js');
  const st = Q.state([], 'Skyr', null);
  assert.strictEqual(st.kit, null);
  const h = Q.html(st, 0, 'Skyr', 'de');
  assert.doesNotMatch(h, /stp-qa-kit/, 'no house');
  assert.match(h, /stp-qa-add/, 'the + is there');
  assert.match(Q.html(Q.state([], 'Skyr', false), 0, 'Skyr', 'de'), /stp-qa-kit/, 'a caller that still has a kitchen keeps its house');
  const sp = R('store-picks.js');
  assert.match(sp, /\n    const K = null;/, 'Shop has no Kitchen tab and no kitchen moves');
  assert.match(sp, /Q\.state\(qaLines\(\), s\.it\.p\.n, K \? !!qaKitItem\(s\.it\.p\) : null\)/);
});

test('Cook bar: game switch first, then the source row, then the kind chips on a row of their own (3 equal columns)', () => {
  const html = R('index.html');
  const a = html.indexOf("return '<div class=\"ck-bar\" id=\"ckBar\" data-noi18n>' +");
  const bar = html.slice(a, html.indexOf("'</div></div>';", a));
  const iv = bar.indexOf('class="ck-view'), is = bar.indexOf('class="ck-src"'), ir = bar.indexOf('class="ck-row"'), ic = bar.indexOf('class="ck-cats"');
  assert.ok(iv > 0 && iv < is && is < ir && ir < ic, 'switch, source, then the kind row');
  assert.ok(bar.indexOf('ckOrder()') > iv && bar.indexOf('ckOrder()') < is, 'the switch tabs live in the first row');
  const css = R('beta.css');
  assert.match(css, /#tab-shelf #ckBar \.ck-view \{ display: grid; grid-auto-flow: column; grid-auto-columns: minmax\(0, 1fr\); width: 100%;/);
  assert.match(css, /#tab-shelf #ckBar \.ck-cats:not\(\.ck-note\) \{ display: grid; grid-template-columns: repeat\(3, minmax\(0, 1fr\)\); overflow: visible; \}/);
});

test('Einkaufen always opens on Supermarkt', () => {
  const sp = R('store-picks.js');
  const o = sp.slice(sp.indexOf('function openPanel('), sp.indexOf('snackUndo = null;', sp.indexOf('function openPanel(')));
  /* Oct 28 2026, 23:00: Supermarkt unless the Einkaufen bloom's orb names another door (openAt); never the remembered tab */
  assert.match(o, /tab = start === 'sz' && SZ\(\) \? 'sz' : start === 'home' && homeTab\(\) \? 'home' : start === 'kitchen' && kitTab\(\) \? 'kitchen' : 'shop';/);
  assert.doesNotMatch(o, /tab = (load|get)\w*\(/, 'the remembered tab no longer decides the first view');
});

test('Hilf mit from Einkaufen takes the same frame: no fade, no zoom, no second backdrop, Einkaufen card hidden under it', () => {
  const g = R('gift-basket.js');
  assert.match(g, /const inframe = from === 'shop' && !!\(W\.LowiStorePicks && W\.LowiStorePicks\.isOpen && W\.LowiStorePicks\.isOpen\(\)\);/);
  assert.match(g, /if \(inframe\) \{ ov\.classList\.add\('in'\); D\.documentElement\.classList\.add\('gb-inframe-on'\); \}/, 'shown at once');
  assert.match(g, /if \(o\.classList\.contains\('gb-inframe'\)\) \{ D\.documentElement\.classList\.remove\('gb-inframe-on'\); try \{ o\.remove\(\); \} catch \(e\) \{\} return; \}/, 'a tab switch removes it at once');
  assert.match(g, /if \(a === 'close'\) \{ spend\(e\); closeUser\(e\.isTrusted\); return; \}/, 'X closes Einkaufen itself, as on its other tabs');
  assert.match(R('index.html'), /\{sel: "\.stp-ov\.gb-inframe", panel: "\[role=dialog\]", noBack: true\},\n  \{sel: "\.stp-ov", panel: "\[role=dialog\]"\},/, 'no Back row is put on top of the same-frame tab (it pushed the tab bar 40 px down for a moment)');
  const css = R('gift-basket.css');
  assert.match(css, /\.stp-ov\.gb-ov\.gb-inframe, \.stp-ov\.gb-ov\.gb-inframe \.stp-card \{ transition: none !important; animation: none !important; \}/);
  assert.match(css, /\.stp-ov\.gb-ov\.gb-inframe \{ background: transparent !important;/);
  assert.match(css, /html\.gb-inframe-on \.stp-ov:not\(\.gb-ov\) > \.stp-card \{ visibility: hidden; \}/);
});
