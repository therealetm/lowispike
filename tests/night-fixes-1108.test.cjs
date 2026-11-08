'use strict';
/* Nov 8 2026 night (Emmanuel: "dieses Teilen verdeckt irgendwie diese Punkte" and "wenn ich die App öffne, dann erscheint das erstmal blau
   und dann erst Dark Mode"). Browser check: with Dark saved, <html data-black="1"> is set while the page is still loading. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('Dark is on from the first paint when Dark is saved', () => {
  const tb = read('true-black.js');
  assert.match(tb, /if \(kind\(\) === 'black' && th !== 'light' && th !== 'sunrise'\) \{ H\.setAttribute\('data-black', '1'\); on = true; meta\(\); \}/);
  assert.ok(tb.indexOf("on = true; meta();") < tb.indexOf('function sync()'), 'before the boot code');
});

test('carousel dots sit on the picture edge, not under the share button', () => {
  assert.match(read('foryou-rail.css'), /\.fy-meta \.fy-car-dots\{position:absolute;top:-82px;left:50%;right:auto;transform:translateX\(-50%\);/);
});
