// Oct 17 (E-man, iPhone screenshot): leaving a world, or leaving the main world into the spirit world, dropped to a flat blue
// screen (the plain Home page with its dot grid, no 3D at all) for a split second. These tests hold the fixes in place:
// the world picture is never left blank or invisible during a transition, behind it is never the plain navy page, the move
// (Later on Oct 17 the rim streaks and the wash were deleted again: see tests/oct17-no-inbetween.test.cjs.)
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const scene = R('body-world-3d-scene.js');
const w3d = R('body-world-3d.js');
const regions = R('body-world-regions.js');
const rcss = R('body-world-regions.css');
const clean = R('clean-view-core.js');

function fnSrc(src, sig) {
  const i = src.indexOf(sig); assert.ok(i >= 0, 'missing ' + sig);
  let d = 0, j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } }
  throw new Error('unclosed ' + sig);
}

test('a resized canvas is drawn again in the same refresh, never left wiped', () => {
  const rs = fnSrc(scene, 'function resize(w, h)');
  assert.match(rs, /renderer\.setSize\(W, H, false\); paintNow = true;/);
  assert.match(rs, /if \(paintNow && running\) \{ try \{ renderer\.render\(scene, camera\); \}/, 'resize must draw at once');
  // every sharpness change marks the picture for an immediate redraw
  const sets = scene.match(/renderer\.setPixelRatio\(dpr\); renderer\.setSize\(W, H, false\);[^}]*/g) || [];
  assert.ok(sets.length >= 2);
  sets.forEach(s => assert.match(s, /paintNow = true/));
  // the every-other-frame saving never skips the refresh right after a resize, nor any refresh during a transition
  assert.match(scene, /odd = calm\(now\) && !paintNow && !inTransit\(\) \? !odd : false;\s*paintNow = false;/);
  // paintNow is declared before anything can call resize
  assert.ok(scene.indexOf('let paintNow = false') < scene.indexOf('function resize(w, h)'));
});

test('no sharpness change (canvas resize) while a world transition runs', () => {
  assert.match(scene, /if \(inTransit\(\)\) \{ lowFor = 0; hiFor = 0; \}\s*else if \(avg > 1 \/ 38 && dpr > dprFloor\)/);
});

test('transition detection: world moves, Misty transit, and 2 s around crossing into the spirit world', () => {
  const src = scene.slice(scene.indexOf('let cosOn = null'), scene.indexOf('}', scene.indexOf('return /(^|\\s)(bwr-warping')) + 1);
  const doc = { documentElement: { className: 'wh-home' } };
  let t = 1000;
  const ctx = { document: doc, performance: { now: () => t } };
  vm.createContext(ctx);
  vm.runInContext(src + '\nthis.inTransit = inTransit;', ctx);
  const f = ctx.inTransit;
  assert.strictEqual(f(), false, 'plain Home is not a transition');
  doc.documentElement.className = 'wh-home bwr-warping'; assert.strictEqual(f(), true, 'fly-to / leaving a world');
  doc.documentElement.className = 'wh-home mf-transit'; assert.strictEqual(f(), true, 'Misty going out / through a wall');
  doc.documentElement.className = 'wh-home'; assert.strictEqual(f(), false);
  t = 5000; doc.documentElement.className = 'wh-home wh-cosmos'; assert.strictEqual(f(), true, 'just crossed into the spirit world');
  t = 6500; assert.strictEqual(f(), true);
  t = 7200; assert.strictEqual(f(), false, 'settled out there');
  t = 9000; doc.documentElement.className = 'wh-home'; assert.strictEqual(f(), true, 'just came back in');
  t = 11500; assert.strictEqual(f(), false);
});

test('a rebuilt Home stage shows the running world at once (never stuck at opacity 0)', () => {
  const mh = fnSrc(w3d, 'function mountHome()');
  assert.match(mh, /if \(mode === 'home' && canvas\) stage\.insertBefore\(canvas, stage\.firstChild\);\s*\/\*[\s\S]*?\*\/\s*if \(canvas && world && api\.state === 'ready'\) stage\.classList\.add\('bw3-live'\);/);
});

// The rim streaks, the colour wash and the reduced-motion colour fade that used to follow here were removed on Oct 17 at
// E-man's request ("delete the in-between world"); tests/oct17-no-inbetween.test.cjs holds that they stay gone.
test('move timings unchanged', () => {
  assert.match(regions, /glide: 1450/);
});
