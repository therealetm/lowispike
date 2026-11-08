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

/* Emmanuel: "the galaxy ... rauszoomen, reinzoomen ... das stürzt ab". The 3D world no longer re-allocates its canvas during and right
   after a pinch, and stays at the floor sharpness out in the cosmos (less graphics memory on iPhone). */
test('no canvas re-allocation while zooming; floor sharpness in the cosmos', () => {
  const sc = read('body-world-3d-scene.js');
  assert.match(sc, /function zoom\(f, sx, sy\) \{\n\s+rig\.zoomAt = performance\.now\(\);[^\n]*\n\s+if \(!\(f > 0\) \|\| !isFinite\(f\)\) return;/);
  assert.match(sc, /const top = rig\.dist > rig\.maxD \* 1\.2 \? dprFloor : topNow\(\);/);
});

/* "füge mal so Vibrationen hinzu ... in the appropriate spot": a 10 ms tick (Android) or the iOS 18 switch tick on tabs, main actions,
   switches, Speichern / Teilen; lowi.haptics = '0' turns it off. */
test('haptics: where, how, and off', () => {
  const h = read('haptics.js');
  assert.match(h, /navigator\.vibrate\(10\)/);
  assert.match(h, /inp\.setAttribute\('switch', ''\)/);
  assert.match(h, /getItem\('lowi\.haptics'\) === '0'/);
  assert.match(h, /if \(!t \|\| !t\.closest \|\| !e\.isTrusted\) return;/, 'its own label click never loops');
  assert.ok(read('sw.js').includes('"share-sheet.js", "haptics.js"'));
});

/* Nibblo's swap cards in the same order as member posts: the picture whole on top, actions, then the card (nothing on the picture) */
test('Nibblo cards: picture whole, actions and card under it', () => {
  const css = read('foryou-rail.css');
  assert.match(css, /#fyFeed \.fy-slide\.fyb-slide>img\.fy-bg\{object-fit:contain!important\}/);
  assert.match(css, /#fyFeed \.fy-slide\.fyb-slide \.fy-meta\{top:calc\(100% - var\(--fyp\) \+ 58px\);/);
  assert.match(css, /#fyFeed \.fy-slide\.fyb-slide \.fy-shade\{display:none\}/);
});
