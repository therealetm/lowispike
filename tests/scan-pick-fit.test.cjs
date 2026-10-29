// Oct 29 2026 bug hunt (iPhone SE, German): the photo-first Scan card (.b3-pickbox inside .b3-cmsg) ran over the typing panel
// (.b3-cbot) on short screens and, sitting on top (z 4), took its taps: a tap on the barcode field, Check, the food-name field or
// Analyze by name hit From photos / Live barcode scan instead. The card's box now ends at the panel's measured top
// (--b3-cbot-top, set by scan-glass.js) and scrolls inside when it does not fit. Live check: tools/hunt-scan-geo2-1102.cjs.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const css = read('scan-glass.css'), js = read('scan-glass.js');

test('the photo card box ends above the typing panel and scrolls instead of covering it', () => {
  const m = [...css.matchAll(/\.b3-cam\.b3-pick \.b3-cmsg[^{]*\{([^}]*)\}/g)].find(r => /bottom:/.test(r[1]));
  assert.ok(m, 'a rule that sets the bottom of .b3-cam.b3-pick .b3-cmsg');
  assert.match(m[1], /bottom:\s*calc\(var\(--b3-cbot-top[^)]*\)\s*\+\s*\d+px\)\s*!important/);
  assert.match(m[1], /overflow-y:\s*auto/);
  assert.match(m[1], /align-items:\s*flex-start/, 'no plain centring: centred overflow would spill above and below the box');
  assert.match(css, /\.b3-cam\.b3-pick \.b3-cmsg > \.b3-pickbox \{[^}]*margin-top:\s*auto;[^}]*margin-bottom:\s*auto/);
  assert.match(css, /html\.lg \.b3-cam\.sg-docked\.b3-pick \.b3-cmsg/, 'also beats the docked scanner rule');
});

function el(rect, cls) {
  const props = {};
  return { rect, classList: { contains: c => (cls || []).includes(c), add() { }, remove() { } }, parentElement: null, children: [],
    getBoundingClientRect() { return this.rect; }, querySelector() { return null; }, closest() { return null; }, setAttribute() { }, getAttribute() { return null; },
    style: { setProperty(k, v) { props[k] = v; }, getPropertyValue(k) { return props[k] || ''; } }, props };
}

test('scan-glass.js sets --b3-cbot-top to the panel top measured from the scanner bottom, and follows its size', () => {
  const bot = el({ top: 295, bottom: 552, height: 257 });
  const cam = el({ top: 0, bottom: 568, height: 568 }, ['b3-cam', 'b3-pick']);
  cam.querySelector = s => (s === '.b3-cbot' ? bot : null);
  const body = el({ top: 0, bottom: 568, height: 568 }); body.lastElementChild = null; body.appendChild = () => { };
  cam.parentElement = {};
  const H = el({}, ['lg']);
  const observed = [];
  const doc = { documentElement: H, body, getElementById: id => (id === 'b3Cam' ? cam : null), querySelector: () => null, addEventListener() { }, createElement: () => el({}) };
  const ctx = { document: doc, window: { addEventListener() { } }, getComputedStyle: () => ({}), requestAnimationFrame: f => f(),
    MutationObserver: function () { this.observe = () => { }; },
    ResizeObserver: function (cb) { this.observe = n => observed.push([n, cb]); } };
  ctx.window.LowiScanGlass = null;
  vm.runInNewContext(js, ctx);
  assert.strictEqual(cam.props['--b3-cbot-top'], '273px', '568 - 295');
  assert.ok(observed.some(o => o[0] === bot), 'the panel is watched, so the box follows when the panel grows (bottom X lifted, keyboard)');
  bot.rect = { top: 250, bottom: 552, height: 302 };
  observed.find(o => o[0] === bot)[1]();
  assert.strictEqual(cam.props['--b3-cbot-top'], '318px');
  assert.strictEqual(typeof ctx.window.LowiScanGlass.fitPick, 'function');
});
