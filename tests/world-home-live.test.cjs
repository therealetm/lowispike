'use strict';
/* Oct 15: Home IS the live body world (drag, pinch, Weltkarte in place, tap a glow to warp), Misty in one bubble, hint in its own spot */
const {test} = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const scene = read('body-world-3d-scene.js'), bw = read('body-world-3d.js'), wh = read('world-home.js'), css = read('world-home.css'), audio = read('world-audio.js');

test('Home world: free orbit, two-finger zoom from Misty out to the whole world, zoom kept across re-layouts', () => {
  assert(scene.includes('rig.minD = rig.homeDist * 0.72; rig.maxD = Math.max(14, rig.homeDist * 2.5); rig.pMax = 1.1;'));
  assert(scene.includes('rig.homeDist * was'));
  assert(scene.includes('halo.visible = false'), 'no outer glow shell around Misty on Home');
  assert(!bw.includes("mode === 'home' ? dy * 0.4"), 'vertical drag is no longer damped on Home');
  assert(/bindGestures\(stage, \(x, y\) => \{ if \(!world\) return; const id = world\.pick\(x, y\);[^\n]*api\.flyTo\(id\); \}, true,/.test(bw), 'tap a glowing place warps, pinch allowed');
  assert(bw.includes("W.dispatchEvent(new CustomEvent('lowi:misty-pet'))"), 'a tap on Misty pets her');
  assert(bw.includes("onLong: (x, y) =>") && bw.includes("onDouble: (x, y) =>"), 'long press opens Misty, double tap zooms');
  assert(!bw.includes('bindGestures(stage, () => open(), false)'), 'no separate tap to enter the world');
  assert(css.includes('html.wh-home #spHome .sp-heroes > .bw3-stage { touch-action: none; }'));
});

test('Oct 22 2026: the old Weltkarte / World map button is gone; the camera zoom (pinch, double-tap) stays', () => {
  assert(!wh.includes("T('World map', 'Weltkarte', 'Mapa')"));
  assert(!wh.includes('function zoomTap('));
  assert(wh.includes("(r.mode !== 'full' && r.mode !== 'home')"));
});

test('hint has its own spot and three languages', () => {
  assert(wh.includes("T('Drag to look around · two fingers to zoom', 'Ziehen zum Umsehen · zwei Finger zum Zoomen', 'Arrastra para mirar · dos dedos para hacer zoom')"));
  assert(wh.includes("T('Tap a glowing place to travel there', 'Tippe auf ein Leuchten, um hinzureisen', 'Toca un brillo para viajar allí')"));
  assert(css.includes('.bw3-full .bw3-top small { display: none !important; }'), 'full window hint left the header (Weltkarte button sat on it)');
  assert(css.includes('.wh-fhint {'));
});

test('Misty: one bubble, no rings, no duplicate name pill', () => {
  assert(!wh.includes("btn('wh-name'"), 'no Misty · stage · XP pill');
  for (const sel of ['.cw-env', '.sp-bubble-water', '.cw-pill', '.cw-aura', '.cf-calm']) assert(css.includes('html.wh-home #spBubble ' + sel), sel);
  assert(css.includes('box-shadow: none !important;'));
  assert(css.includes('scale(var(--wh-mz, 1))'), 'Misty follows the zoom so she stays inside her cell');
});

test('Klang reachable from Home', () => {
  assert(audio.includes('const uiHost = () =>'));
  assert(audio.includes("btn.classList.add('wa-home')"));
  assert(css.includes('.wh-hud .wa-btn.wa-home {'));
});
