// Oct 23, 2026 (E-man, 08:39, right after "Update loaded": "this looks like the old version"): the page builds the old Home
// (greeting, weather, Daily quest card, VR, Since last meal, Today pill) before home-orbit-v2.js turns it into the ring.
// On a slow update every file is fetched fresh and the old Home stayed on screen for minutes. Home is now hidden from the very
// first paint until the ring is on. Browser check of the update / slow-load path: tools/sim/home-update-path.cjs.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const orbit = fs.readFileSync(path.join(root, 'home-orbit-v2.js'), 'utf8');

const head = html.slice(0, html.indexOf('</head>'));
const bootCss = (head.match(/<style id="o8BootCss">([\s\S]*?)<\/style>/) || [])[1] || '';

test('the boot gate sits at the top of <head>, before any Home markup or script', () => {
  const gate = html.indexOf('<style id="o8BootCss">');
  assert.ok(gate > 0 && gate < html.indexOf('</head>'), 'o8BootCss is in <head>');
  assert.ok(gate < html.indexOf('<script src='), 'before the first external script');
  assert.ok(gate < html.indexOf('id="tab-home"'), 'before #tab-home');
  assert.ok(gate < html.indexOf('<script src="home-orbit-v2.js'), 'before the ring script');
  const tag = head.indexOf("H.classList.add('o8-boot')");
  assert.ok(tag > gate && tag < 5000, 'the inline script that sets o8-boot runs right after it');
});

test('while the ring is not on, nothing in #tab-home is visible (old Home can never paint)', () => {
  assert.match(bootCss, /html\.o8-boot:not\(\.o8\) #tab-home,/);
  assert.match(bootCss, /html\.o8-boot:not\(\.o8\) #tab-home \*\{visibility:hidden!important\}/);
  assert.doesNotMatch(bootCss, /display\s*:\s*none/, 'visibility only: the ring can still measure Misty while hidden');
});

test('the inline head script adds o8-boot and only drops it after load when the ring script never ran', () => {
  const src = (head.match(/<script>(\(function\(W,H\)\{H\.classList\.add\('o8-boot'\)[\s\S]*?)<\/script>/) || [])[1];
  assert.ok(src, 'inline boot script found');
  const cls = new Set(), timers = [], on = {};
  const H = { classList: { add: c => cls.add(c), remove: c => cls.delete(c), contains: c => cls.has(c) } };
  const W = { addEventListener: (n, f) => { on[n] = f; } };
  vm.runInNewContext(src, { window: W, document: { documentElement: H }, setTimeout: (f, ms) => timers.push([f, ms]) });
  assert.ok(cls.has('o8-boot'));
  on.load(); assert.equal(timers.length, 1); assert.ok(timers[0][1] >= 5000);
  W.LowiHomeOrbitV2 = {}; timers[0][0](); assert.ok(cls.has('o8-boot'), 'ring script present: it decides, the timer does not');
  delete W.LowiHomeOrbitV2; timers[0][0](); assert.ok(!cls.has('o8-boot'), 'ring script missing: Home shows after load as a last resort');
});

test('home-orbit-v2.js reveals Home only when the ring is on and the page has finished parsing', () => {
  const rv = orbit.slice(orbit.indexOf('function reveal()'), orbit.indexOf('function bootFallback()'));
  assert.match(rv, /H\.classList\.contains\('o8-boot'\) && H\.classList\.contains\('o8'\) && D\.readyState !== 'loading'/);
  assert.match(rv, /H\.classList\.remove\('o8-boot'\)/);
  const lay = orbit.slice(orbit.indexOf('function layout(force)'), orbit.indexOf('function mountSiblings()'));
  assert.ok(lay.indexOf("H.classList.add('o8')") > 0 && lay.indexOf('reveal();') > lay.indexOf("H.classList.add('o8')"), 'reveal runs after o8 is set and placed');
  assert.doesNotMatch(orbit.replace(/function reveal\(\)[\s\S]*?\n    \}/, '').replace(/function bootFallback\(\)[\s\S]*?\n    \}/, ''), /remove\('o8-boot'\)/, 'no other path drops the gate');
});

test('a failed look with the same screen size keeps the last ring instead of dropping to the old Home', () => {
  const lay = orbit.slice(orbit.indexOf('function layout(force)'), orbit.indexOf('function mountSiblings()'));
  const keep = lay.indexOf('last.vw === root.innerWidth && last.vh === root.innerHeight) { place(last); soon(); return last; }');
  const drop = lay.indexOf("H.classList.remove('o8', 'o8-wide')");
  assert.ok(keep > 0 && drop > keep, 'same size: keep the ring; only a real resize may fall back');
  assert.match(lay, /L\.vw = root\.innerWidth; L\.vh = root\.innerHeight;/);
});

test('the impossible-screen fallback waits for a fully loaded page and four failed looks', () => {
  const fb = orbit.slice(orbit.indexOf('function bootFallback()'));
  assert.match(fb, /D\.readyState !== 'complete'\) return;/);
  assert.match(fb, /\+\+failN >= 4/);
});
