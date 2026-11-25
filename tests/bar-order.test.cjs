// 25 Nov 2026 (Emmanuel: "that menu bar, that you can move it, that I can pick what comes first ... do that to every menu bar, or secondary
// menu bar. Long press and then swipe around"). bar-order.js: hold a tab, slide it, let go; saved per bar; Studio opens on your first tab.
// Checked in Chromium (Studio): hold Profile 650 ms -> the bar wiggles; drag to the front -> Profile, Swipe file, Agent file, and the drag
// did not switch tabs; reload -> same order, opens on Profile; a plain tap still switches.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const js = R('bar-order.js');
const ctx = { window: { localStorage: null }, document: null }; vm.createContext(ctx); vm.runInContext(js, ctx);
test('only checked bars take part: tabs found by name, no position-based highlight; Community and Cook keep their own', () => {
  for (const c of ['.wh-ms-tabs', '.mh-seg', '.wj-tabs', '.mb-tabs', '.wd-tabs', '.dr-seg', '.sc-tabs', '.stp-tabs', '.ap-seg']) assert.ok(js.includes("sel: '" + c + "'"), c);
  assert.doesNotMatch(js, /sel: '\.(rk-seg|rm-tabs|ck-view|a2-dots)/, 'ranking (thumb by position), Community, Cook and dots are not touched');
  assert.match(js, /function named\(bar\) \{[^\n]*if \(k == null \|\| seen\[k\]\) return null;/, 'a bar with an unnamed or repeated tab is left alone');
});
test('the order: saved tabs first in your order, new tabs after in their own place', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'bar-order.js'), 'utf8');
  const order = new Function(/function order\(own, saved\) \{([\s\S]*?)\n  \}/.exec(src)[0] + '; return order;')();
  assert.deepStrictEqual(order(['swipe', 'agent', 'profile'], ['profile', 'swipe', 'agent']), ['profile', 'swipe', 'agent']);
  assert.deepStrictEqual(order(['a', 'b', 'c', 'new'], ['c', 'a']), ['c', 'a', 'b', 'new']);
  assert.deepStrictEqual(order(['a', 'b'], []), ['a', 'b']);
});
test('hold to lift (450 ms, a move first cancels), the ending tap does not switch tabs, saved to lowispike.bar.<name>; loaded in the app and Studio', () => {
  assert.match(js, /var HOLD_MS = 450, SLOP = 10, PRE = 'lowispike\.bar\.';/);
  assert.match(js, /if \(Math\.abs\(e\.clientX - sx\) > SLOP \|\| Math\.abs\(e\.clientY - sy\) > SLOP\) clearTimeout\(hold\);/);
  assert.match(js, /bar\.addEventListener\('click', function \(e\) \{ if \(eat\) \{ e\.preventDefault\(\); e\.stopPropagation\(\);/);
  assert.match(R('index.html'), /<script src="bar-order\.js\?v=/); assert.match(R('studio/index.html'), /<script src="\.\.\/bar-order\.js\?v=1"><\/script>/);
  assert.match(R('studio/index.html'), /localStorage\.getItem\('lowispike\.bar\.studio'\)/, 'Studio opens on your first tab');
});
