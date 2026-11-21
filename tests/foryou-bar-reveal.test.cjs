/* 21 Nov 2026: the For You circle row comes back the moment you scroll up (foryou-bar.js, foryou-ig.css section 5). */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
test('foryou-bar.js is loaded by the app and cached by the service worker', () => {
  assert.match(R('index.html'), /<script src="foryou-bar\.js\?v=/);
  assert.match(R('sw.js'), /"foryou-bar\.js"/);
});
test('the circle row is sticky and has hide/pin states with reduced motion', () => {
  const c = R('foryou-ig.css');
  assert.match(c, /#cmPaneFeed \.fy-tools\{position:sticky!important;top:0/);
  assert.match(c, /\.fy-tools\.fyb-hide\{transform:translateY\(-105%\)/);
  assert.match(c, /prefers-reduced-motion:reduce\)\{#cmPaneFeed \.fy-tools\{transition:none/);
});
test('down past the row hides it, any scroll up shows it, the top resets it', () => {
  let h; const cls = new Set();
  const bar = {offsetHeight: 130, classList: {add: (...a) => a.forEach(x => cls.add(x)), remove: (...a) => a.forEach(x => cls.delete(x))}};
  const feed = {id: 'fyFeed', scrollTop: 0, querySelector: () => bar};
  const ctx = {window: {}, document: {addEventListener: (n, f) => { h = f; }}};
  vm.runInNewContext(R('foryou-bar.js'), ctx);
  const go = y => { feed.scrollTop = y; h({target: feed}); };
  go(0); for (let y = 100; y <= 1500; y += 100) go(y);
  assert.ok(cls.has('fyb-hide'), 'hidden after scrolling down');
  go(1490); assert.ok(!cls.has('fyb-hide') && cls.has('fyb-pin'), 'back on the first scroll up');
  go(1700); assert.ok(cls.has('fyb-hide'), 'away again on the way down');
  go(0); assert.ok(!cls.has('fyb-hide') && !cls.has('fyb-pin'), 'normal at the top');
  h({target: {id: 'other'}});
});
