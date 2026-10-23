'use strict';
/* Oct 21 (Eman): hold a Community tab to move it; Cook and Move leave Community's bottom bar; hold Move on Home = the Move page. */
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const C = require('../community-tab-order.js');

test('order helpers: unknown, duplicate and missing tabs are fixed, moves land where dropped', () => {
  assert.deepStrictEqual(C.IDS, ['room', 'chat', 'create', 'aff', 'rank']);
  assert.deepStrictEqual(C.normalize(['chat', 'chat', 'cook', 'aff']), ['chat', 'aff', 'room', 'create', 'rank']);
  assert.deepStrictEqual(C.normalize(null), C.IDS);
  assert.deepStrictEqual(C.parse('not json'), C.IDS);
  assert.deepStrictEqual(C.parse('["aff","room"]'), ['aff', 'room', 'chat', 'create', 'rank']);
  /* 23 Oct: an order saved before Ranking existed keeps its order and gets Ranking at the end */
  assert.deepStrictEqual(C.parse('["chat","room","aff","create"]'), ['chat', 'room', 'aff', 'create', 'rank']);
  assert.deepStrictEqual(C.moveTo(C.IDS, 'chat', 0), ['chat', 'room', 'create', 'aff', 'rank']);
  assert.deepStrictEqual(C.moveTo(C.IDS, 'room', 9), ['chat', 'create', 'aff', 'rank', 'room']);
  assert.deepStrictEqual(C.moveTo(C.IDS, 'aff', -3), ['aff', 'room', 'chat', 'create', 'rank']);
  assert.deepStrictEqual(C.moveTo(C.IDS, 'move', 0), C.IDS, 'Cook/Move can never become Community tabs');
  /* drop slot = how many of the other tabs' centres are left of the finger */
  assert.strictEqual(C.slotAt([65, 151, 237], 30), 0);
  assert.strictEqual(C.slotAt([65, 151, 237], 160), 2);
  assert.strictEqual(C.slotAt([65, 151, 237], 300), 3);
  assert.ok(C.HOLD_MS >= 400 && C.HOLD_MS <= 600, 'a hold, not a tap');
  assert.ok(C.SLOP >= 8 && C.SLOP <= 14, 'a scroll cancels the hold');
});

function boot(store) {
  const ls = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  const doc = { readyState: 'complete', getElementById: () => null, querySelector: () => null, documentElement: { classList: { toggle() {} } }, addEventListener() {} };
  const win = { localStorage: ls, document: doc, navigator: {}, location: { hash: '' }, addEventListener() {}, setTimeout: () => 0, setInterval: () => 0, scrollY: 0 };
  win.window = win;
  vm.runInNewContext(R('community-tab-order.js'), { window: win, module: undefined, setTimeout: () => 0, setInterval: () => 0, clearTimeout() {}, MutationObserver: function () { this.observe = () => {}; } });
  return win.LowiCommunityTabs;
}

test('the order is saved per user and read back on the next open (lowispike.* keys go to the account backup)', () => {
  assert.match(C.KEY, /^lowispike\./, 'cloud backup copies every lowispike.* key');
  assert.ok(R('index.html').includes('Object.keys(localStorage).forEach(k => { if (!syncedKey(k)) return;'), 'the account backup still takes lowispike.* keys');
  const store = {};
  let T = boot(store);
  assert.deepStrictEqual(Array.from(T.order()), C.IDS, 'first visit: the default order');
  T.save(['chat', 'room', 'aff', 'create', 'rank']);
  assert.strictEqual(store[C.KEY], '["chat","room","aff","create","rank"]');
  T = boot(store);   /* a reload / another device after restore */
  assert.deepStrictEqual(Array.from(T.order()), ['chat', 'room', 'aff', 'create', 'rank']);
  assert.strictEqual(T.order()[0], 'chat', 'Community opens on this tab');
  store[C.KEY] = '{broken';
  assert.deepStrictEqual(Array.from(boot(store).order()), C.IDS, 'a broken value falls back instead of breaking Community');
});

test('wired in: tabs built in the saved order, labelled by id, hold-drag on window, opens on the first tab', () => {
  const html = R('index.html'), ui = R('community-rooms-ui.js'), js = R('community-tab-order.js'), css = R('community-tab-order.css');
  const iOrder = html.indexOf('community-tab-order.js?v='), iUi = html.indexOf('community-rooms-ui.js?v=');
  assert.ok(iOrder > 0 && iOrder < iUi, 'loaded before community-rooms-ui.js');
  assert.ok(html.includes('community-tab-order.css?v='));
  assert.match(ui, /tabOrder\(\)\.map\(k=>'<button type="button" role="tab" class="rm-tab" data-rm="'\+k\+'"><\/button>'\)/);
  assert.match(ui, /tabs\.forEach\(t=>\{t\.textContent=tr\(t\.dataset\.rm\);\}\)/, 'labels follow the tab, not its position');
  assert.doesNotMatch(ui, /tabs\[0\]\.textContent/);
  assert.match(js, /setTimeout\(lift, HOLD_MS\)/);
  assert.match(js, /W\[f\]\('pointermove', onMove, true\)/, 'drag followed on window capture');
  assert.match(js, /classList\.add\('no-page-swipe'\)/, 'the page slider leaves the tab row alone');
  assert.match(js, /addEventListener\('touchmove', onTouchMove|W\[f\]\('touchmove', onTouchMove/, 'the page does not scroll under a lifted tab');
  assert.match(js, /Date\.now\(\) < swallowUntil/, 'the drop does not also switch tabs');
  assert.match(js, /navigator\.vibrate/); assert.match(js, /setAttribute\('switch', ''\)/, 'iOS haptic tick');
  assert.match(js, /else if \(act\) R\.showView\(act\)/); /* item 33: the rule itself is tested in community-first-tab.test.cjs */ assert.match(js, /\^#community\\\//, 'a deep link wins over the first tab');
  assert.match(css, /@keyframes rm-wiggle/); assert.match(css, /prefers-reduced-motion/);
});

test('Cook and Move are gone from Community\'s bottom bar and were never added to its tabs', () => {
  const css = R('community-tab-order.css'), js = R('community-tab-order.js'), ui = R('community-rooms-ui.js');
  assert.match(css, /html\.cm-open body #tabbar#tabbar \.tb\[data-tab="shelf"\],\s*html\.cm-open body #tabbar#tabbar \.tb\[data-tab="move"\]\{display:none!important\}/);
  assert.match(js, /classList\.toggle\('cm-open', open\)/);
  assert.match(js, /getElementById\('tab-foryou'\)/, 'cm-open follows the Community page');
  assert.doesNotMatch(ui, /data-rm="(shelf|cook|move)"/);
  /* both still reachable from Home */
  assert.match(R('home-blooms-v2.js'), /LowiHost\.go\('shelf'\)/, 'Fuel bloom -> Cook');
  assert.match(R('nav-moves.js'), /For You/, 'For You lives in Cook');
});

test('hold Move on Home opens the Move page; a tap still blooms', () => {
  const mb = R('move-bubble.js'), hb = R('home-blooms-v2.js');
  assert.match(mb, /function openPage\(\) \{\s*closeBloom\(false\);\s*try \{ if \(W\.LowiHost && typeof W\.LowiHost\.go === 'function'\) W\.LowiHost\.go\('move'\)/);
  assert.match(mb, /page: openPage/);
  assert.match(mb, /onLong: \(\) => \{ longAt = performance\.now\(\); openPage\(\); return true; \}/);
  assert.match(mb, /buzz\(18\); openPage\(\); \}, 560\)/);
  assert.match(hb, /fn\(W\.LowiMoveBubble, 'page'\)\) W\.LowiMoveBubble\.page\(\)/);
  assert.match(mb, /onTap: \(\) => \{[^}]*openBloom|openBloom\(/, 'tap still opens the bloom');
  const tut = R('tutorial-steps.js');
  assert.match(tut, /id: 'move-hold'/); assert.match(tut, /id: 'community-order'/);
});
