// Oct 17 (E-man, iPhone screenshot): leaving a world, or leaving the main world into the spirit world, dropped to a flat blue
// screen (the plain Home page with its dot grid, no 3D at all) for a split second. These tests hold the fixes in place:
// the world picture is never left blank or invisible during a transition, behind it is never the plain navy page, the move
// carries colour at the rim only (the elastic bubble exit and the surroundings stay visible), and reduced motion gets a gentle fade.
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

test('behind the live world and during every move: a bright wash, never the navy page with its dot grid', () => {
  const rule = rcss.split('\n').find(l => l.startsWith('html.wh-home.wh-world-live body,'));
  assert.ok(rule, 'wash rule');
  ['html.wh-home.wh-world-live #tab-home', 'html.bwr-warping #tab-home', 'html.mf-transit #tab-home'].forEach(s => assert.ok(rule.includes(s), s));
  assert.match(rule, /background-image:radial-gradient\([^!]*#7a5cff[^!]*\)!important/);
  assert.doesNotMatch(rule, /background-size/);
  // the beta page dot grid is a plain declaration, so the !important wash replaces it
  assert.doesNotMatch(R('beta.css').match(/background-image: radial-gradient\(color-mix[^;]*;/)[0], /!important/);
});

test('the move keeps the middle clear: rim-only streaks, the bubble exit and surroundings stay visible', () => {
  // the streaks are masked out around Misty and only appear toward the rim
  assert.match(rcss, /\.bwr-wx i\{[^}]*mask-image:radial-gradient\(circle at var\(--wx-x\) var\(--wx-y\),transparent 0,transparent 34vmin,#000 60vmin\)/);
  assert.match(rcss, /\.bwr-wx i\{[^}]*-webkit-mask-image:/, 'iPhone needs the -webkit- mask');
  // the colour glow is clear in the middle too
  assert.match(rcss, /\.bwr-wx b\{[^}]*rgba\(0,0,0,0\) 0,rgba\(0,0,0,0\) 42%/);
  // compositor-only motion, and nothing animates when no move runs
  const kf = rcss.match(/@keyframes bwrStream\{[^\n]*\}/)[0];
  assert.doesNotMatch(kf, /width|height|left|top|background/);
  assert.match(rcss, /^html\.bwr-warping \.bwr-wx i\{animation:bwrStream/m);
  assert.match(rcss, /^\.bwr-wx\{[^}]*visibility:hidden/m);
  // the full glow is not forced through the flight view: it does not cover the bubble exit
  assert.doesNotMatch(regions, /veil\.setAttribute\('data-clean-keep'/);
});

test('the warp layer is part of the world: the menu fade never hides it', () => {
  assert.match(regions, /fx\.className = 'bwr-wx'; fx\.id = 'bwrWarp'; fx\.setAttribute\('aria-hidden', 'true'\); fx\.setAttribute\('data-clean-keep', ''\)/);
  // both of the clean view's hide rules spare data-clean-keep
  const hides = clean.match(/'#whHud > :not\(#whPad[^'"]*/g) || [];
  assert.ok(hides.length >= 1, 'the Home hide selector');
  hides.forEach(h => assert.ok(h.includes(':not([data-clean-keep])'), h));
  // the in-world hide rule is built from the same list, so it spares data-clean-keep too
  assert.match(clean, /const WORLD_HIDE = HIDE\.map\(s => s\.indexOf\('#whHud > '\) === 0 \? s\.replace\('#whHud > ', '#whHud > :not\(\.wh-zoom\)'\) : s\)/);
});

test('the warp runs exactly while a move runs, every path, and reduced motion gets a gentle fade', () => {
  assert.match(regions, /st\.warp = q; warpOn\(true, src\.css\);/, 'starts with every move (enter, leave, map, home)');
  const cl = fnSrc(regions, 'function clean(q)');
  assert.match(cl, /veil\(0\); warpOn\(false\);/, 'ends with every move, finished or cancelled');
  assert.match(fnSrc(regions, 'function reset()'), /warpOn\(false\)/);
  // per-frame strength never drops to nothing mid-move and eases out over the glide back home
  assert.match(regions, /wx\(Math\.max\(floor, q\.amt, veilO \* 0\.9\)\);/);
  assert.match(regions, /floor = q\.rev \? 0\.6 \* \(1 - g \* g\) : 0\.3 \+ 0\.3 \* g;/);
  // reduced motion: the instant swap gets a colour crossfade, no streaks
  assert.match(regions, /if \(reduced\(\)\) \{ fadeSwap\(id\); enter\(id\);/);
  assert.match(rcss, /@media \(prefers-reduced-motion: reduce\)\{html\.bwr-warping \.bwr-wx i\{animation:none;opacity:0\}\}/);
  assert.match(rcss, /html\.bwr-fade \.bwr-wx\{visibility:visible;animation:bwrFade \.85s ease both\}/);
  assert.match(rcss, /html\.bwr-fade \.bwr-wx i\{display:none\}/);
});

test('the warp does not slow anything: move timings unchanged', () => {
  assert.match(regions, /glide: 1450/);
});
