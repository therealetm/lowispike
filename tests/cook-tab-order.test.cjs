/* Cook opens on Kitchen first + the Cook tabs can be held and moved like Community's (Emmanuel, 26 Oct 2026, MAYA-HANDOFF 0.29):
   "Can you move Kitchen to where Shuffle is, so that when they open Cook, it's the first thing that opens. And also give them
   the option to manually readjust it, just like they can manually readjust the Community chat and affiliate." */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const C = require('../cook-tab-order.js');

/* Oct 28 2026 (Emmanuel: "schmeiß die Küche raus"): the Kitchen game is gone; Cook is Shuffle | Swipe. */
test('Cook order: Shuffle | Swipe by default; an old saved "kitchen" is dropped; unknown, duplicate and missing tabs are fixed', () => {
  assert.deepStrictEqual(C.IDS, ['shuffle', 'swipe']);
  assert.strictEqual(C.KEY, 'lowispike.cook.tabs');
  assert.deepStrictEqual(C.parse(null), ['shuffle', 'swipe']);
  assert.deepStrictEqual(C.parse('not json'), ['shuffle', 'swipe']);
  assert.deepStrictEqual(C.parse('["kitchen","swipe","shuffle"]'), ['swipe', 'shuffle'], 'a saved order is kept, the removed Kitchen tab is dropped');
  assert.deepStrictEqual(C.parse('["swipe"]'), ['swipe', 'shuffle'], 'a missing tab goes to the end');
  assert.deepStrictEqual(C.normalize(['shuffle', 'fy', 'shuffle', 'kitchen']), ['shuffle', 'swipe']);
  assert.deepStrictEqual(C.moveTo(['shuffle', 'swipe'], 'swipe', 0), ['swipe', 'shuffle']);
});

test('Cook opens on the first tab of the order; a game asked for on purpose wins', () => {
  assert.strictEqual(C.first(['shuffle', 'swipe'], false), 'shuffle');
  assert.strictEqual(C.first(['swipe', 'shuffle'], false), 'swipe');
  assert.strictEqual(C.openView(['shuffle', 'swipe'], false, false), 'shuffle');
  assert.strictEqual(C.openView(['shuffle', 'swipe'], false, true), null, 'Help me pick, Swaflo: their game wins');
});

function boot(store) {
  const ls = { m: Object.assign({}, store), getItem(k) { return k in this.m ? this.m[k] : null; }, setItem(k, v) { this.m[k] = String(v); } };
  const log = [];
  const doc = { documentElement: { lang: 'en', getAttribute: () => 'en' }, addEventListener() {}, querySelector: () => null, getElementById: () => null, readyState: 'complete' };
  const win = { document: doc, localStorage: ls, addEventListener() {}, navigator: {},
    LowiFood: { setView(v) { log.push('setView ' + v); ls.m['lowi.cook.view'] = v; } }, LowiCommunityTabs: { row() {}, haptic() {} } };
  let now = 1000;
  vm.runInNewContext(R('cook-tab-order.js'), { window: win, module: undefined, setTimeout: () => 0, clearTimeout() {}, Date: { now: () => now } });
  return { win, ls, log, tick: ms => { now += ms; } };
}

test('opening Cook (goTab) puts it on the first tab, unless a game was just asked for', () => {
  let b = boot({ 'lowi.cook.view': 'shuffle' });
  b = boot({ 'lowi.cook.view': 'kitchen' });
  b.win.LowiCookTabs.opening();
  assert.strictEqual(b.ls.m['lowi.cook.view'], 'shuffle', 'an old remembered Kitchen lands on the first tab, Shuffle');

  b = boot({ 'lowispike.cook.tabs': '["swipe","kitchen","shuffle"]' });
  b.win.LowiCookTabs.opening();
  assert.strictEqual(b.ls.m['lowi.cook.view'], 'swipe', 'whatever tab is first is the one Cook opens on');

  b = boot({});
  b.tick(5000); b.win.LowiFood.setView('shuffle');      /* the wrapped setView marks it as asked for */
  b.win.LowiCookTabs.opening();
  assert.strictEqual(b.ls.m['lowi.cook.view'], 'shuffle', 'asked for right before the open');
  b.win.LowiFood.setView('swipe'); b.tick(10000); b.win.LowiCookTabs.opening();
  assert.strictEqual(b.ls.m['lowi.cook.view'], 'shuffle', 'the ask wears off');
});

test('the Cook row uses the SAME hold-and-drag engine as Community (one engine, a second row)', () => {
  const eng = R('community-tab-order.js'), cook = R('cook-tab-order.js');
  assert.match(eng, /row: \(t, r\) => wire\(t, Object\.assign\(\{\}, CM, r\)\)/);
  assert.match(eng, /function wire\(t, r\) \{/);
  assert.match(eng, /e\.target\.closest\(r\.tab\)/, 'the press finds the tab of its own row');
  assert.ok(!/querySelectorAll\('\.rm-tab/.test(eng.slice(eng.indexOf('---- the hold-and-drag'), eng.indexOf('---- opening Community'))), 'no Community-only selector left in the drag');
  assert.match(cook, /const E = W\.LowiCommunityTabs; if \(!E \|\| !E\.row\) return;\s+E\.row\(t, ROW\);/);
  assert.ok(!/setPointerCapture|pointermove/.test(cook), 'no second drag engine in cook-tab-order.js');
});

test('index.html: tabs drawn in the saved order, Cook opens on the first tab, Help me pick Shuffle still lands on Shuffle', () => {
  const html = R('index.html');
  assert.match(html, /const fView = \(\) => ckGet\(CKK\.view, ckFirst\(\), \["shuffle", "swipe"\]\)/);
  assert.match(html, /ckOrder\(\)\.map\(id => ckViewSeg\[id\] \? ckViewSeg\[id\]\(\) : ""\)\.join\(""\)/);
  assert.match(html, /if \(t === "shelf" && TAB !== "shelf"\) \{ try \{ if \(window\.LowiCookTabs\) window\.LowiCookTabs\.opening\(\); \} catch \(e\) \{ \} \}/);
  assert.ok(html.indexOf('LowiCookTabs.opening()') < html.indexOf('TAB = t;'), 'before the tab renders, so the first frame is already the first tab');
  assert.match(html, /<script src="cook-tab-order\.js\?v=/);
  assert.ok(html.indexOf('community-tab-order.js?v=') < html.indexOf('cook-tab-order.js?v='), 'the engine loads first');
  assert.match(html, /else if \(k === "shuffle"\) \{ sfx\("tap"\); cook\(\(\) => \{ try \{ LowiFood\.setView\("shuffle"\); \} catch\(x\)\{\}/);
  assert.match(R('swaflo.js'), /LowiFood\.setView\('shuffle'\)/, 'Swaflo opens the Shuffle form on Shuffle');
});

test('the order is kept on this device like Community\'s, the row is styled while arranging, Reduce Motion stops the wiggle', () => {
  assert.match(R('account-sync-core.js'), /'lowispike\.cook\.tabs'/);
  const css = R('community-tab-order.css');
  assert.match(css, /#ckBar \.ck-view\.rm-arranging/);
  assert.match(css, /#ckBar \.ck-view \.ck-b\.rm-lifted/);
  assert.match(css, /prefers-reduced-motion:reduce\)\{[^}]*#ckBar \.ck-view\.rm-arranging \.ck-b:not\(\.rm-lifted\)\{animation:none/);
  assert.match(css, /#tab-shelf #ckBar \.ck-view \.ck-b\{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none/);
});
