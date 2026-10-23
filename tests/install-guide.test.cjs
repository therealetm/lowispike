'use strict';
// Oct 23 2026, Emmanuel: adding LOWiSPIKE to the home screen on iPhone is too complicated. He wants a small animated video window
// with the exact steps, a choice between iPhone and Android (preselected), and a shortcut where one exists.
// install-guide.js: the real iOS 26 Safari path (••• -> Share -> View More -> Add to Home Screen -> Open as Web App -> Add), the
// in-app browser step first, Chrome/Samsung/Edge/Firefox on Android, beforeinstallprompt one-tap install, coach arrow, Misty success.
// Live check in a real browser: tools/check-install-guide.cjs [--url https://therealetm.github.io/lowispike/].
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const ROOT = path.join(__dirname, '..');
const IG = require(path.join(ROOT, 'install-guide.js'));
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const dr = fs.readFileSync(path.join(ROOT, 'daily-ritual.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'install-guide.css'), 'utf8');
const UA = {
  safari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  insta: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 400.0.0.0 (iPhone15,2; iOS 18_6; de_DE)',
  crios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
  chrome: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0 Mobile Safari/537.36',
  edge: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36 EdgA/141.0',
  firefox: 'Mozilla/5.0 (Android 14; Mobile; rv:144.0) Gecko/144.0 Firefox/144.0',
  tiktokA: 'Mozilla/5.0 (Linux; Android 14; SM-A546B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0 Mobile Safari/537.36 trill_350001 BytedanceWebview/d8a21c6',
  desk: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36'
};
const fl = (k, dev) => { const e = IG.detect(UA[k], k === 'ipad' ? 5 : 0); const d = dev || (e.device === 'desktop' ? 'ios' : e.device); return IG.flow(d, e.browser, e.inapp, d === 'ios' && e.ipad); };
const path_ = f => f.map(s => s.f + (s.b ? ':' + s.b : '')).join(' > ');

test('detect: device, browser and in-app browsers', () => {
  const d = k => IG.detect(UA[k], k === 'ipad' ? 5 : 0);
  assert.deepStrictEqual([d('safari').device, d('safari').browser], ['ios', 'safari']);
  assert.deepStrictEqual([d('insta').device, d('insta').browser, d('insta').inapp], ['ios', 'inapp', true]);
  assert.strictEqual(d('crios').browser, 'crios');
  assert.deepStrictEqual([d('ipad').device, d('ipad').ipad], ['ios', true], 'iPadOS says Macintosh but has touch');
  assert.deepStrictEqual([d('chrome').device, d('chrome').browser], ['android', 'chrome']);
  assert.strictEqual(d('samsung').browser, 'samsung');
  assert.strictEqual(d('edge').browser, 'edge');
  assert.strictEqual(d('firefox').browser, 'firefox');
  assert.deepStrictEqual([d('tiktokA').device, d('tiktokA').inapp], ['android', true]);
  assert.strictEqual(d('desk').device, 'desktop');
});

test('iPhone Safari: exactly Emmanuel\'s real path, ••• > Share > View More > Add to Home Screen > Add > open', () => {
  const f = fl('safari');
  assert.strictEqual(path_(f), 'sbar > smenu > share > more > a2hs > home');
  assert.deepStrictEqual(f.map(s => s.cap), ['sf_dots', 'sf_share', 'share_more', 'more_a2hs', 'a2hs_add', 'home']);
  assert.match(IG.tx('a2hs_add', 'en'), /Open as Web App/);
  assert.match(IG.tx('sf_dots', 'de'), /unten rechts/);
});

test('in-app browser on iPhone: get into Safari first, then the same path', () => {
  const f = fl('insta');
  assert.strictEqual(path_(f), 'iab > iabmenu > sbar > smenu > share > more > a2hs > home');
  assert.strictEqual(f[2].cap, 'sf_dots_in');
});

test('iPad Safari: Share sits at the top right, then View More > Add to Home Screen > Add', () => {
  assert.strictEqual(path_(fl('ipad')), 'crbar > share > more > a2hs > home');
  assert.strictEqual(fl('ipad')[0].cap, 'pad_share');
});

test('Chrome on iPhone: Share at the top right, then Add to Home Screen', () => {
  assert.strictEqual(path_(fl('crios')), 'crbar > share > a2hs > home');
});

test('Android: Chrome, Samsung Internet, Edge, Firefox and in-app browsers each get their own menu path', () => {
  assert.strictEqual(path_(fl('chrome')), 'abar:chrome > amenu:chrome > adlg:chrome > ahome');
  assert.strictEqual(path_(fl('samsung')), 'abar:samsung > amenu:samsung > asub:samsung > adlg:samsung > ahome');
  assert.strictEqual(path_(fl('edge')), 'abar:edge > amenu:edge > adlg:edge > ahome');
  assert.strictEqual(path_(fl('firefox')), 'abar:firefox > amenu:firefox > adlg:firefox > ahome');
  assert.strictEqual(path_(fl('tiktokA')), 'iab > iabmenu > abar:chrome > amenu:chrome > adlg:chrome > ahome');
  assert.strictEqual(fl('tiktokA')[0].cap, 'iab_kebab', 'Android menus are ⋮, not •••');
  assert.strictEqual(fl('chrome')[2].btn, 'install');
  assert.strictEqual(fl('samsung')[3].btn, 'add');
});

test('switching device: an iPhone visitor can look at the Android path and back', () => {
  assert.strictEqual(path_(fl('safari', 'android')), 'abar:chrome > amenu:chrome > adlg:chrome > ahome');
  assert.strictEqual(path_(IG.flow('ios', 'chrome', false)), 'sbar > smenu > share > more > a2hs > home');
});

test('every caption and label exists in EN, DE and ES', () => {
  const keys = new Set();
  for (const k of Object.keys(UA)) for (const dev of ['ios', 'android']) fl(k, dev).forEach(s => keys.add(s.cap));
  for (const k of keys) assert.ok(IG.TX[k], 'missing ' + k);
  for (const [k, v] of Object.entries(IG.TX)) { assert.strictEqual(v.length, 3, k); v.forEach(x => assert.ok(x && x.length > 0, k)); }
  assert.strictEqual(IG.tx('l_more', 'es'), 'Ver más');
  assert.strictEqual(IG.tx('l_a2hs', 'de'), 'Zum Home-Bildschirm');
  assert.strictEqual(IG.tx('l_a2hs', 'fr'), 'Add to Home Screen', 'unknown language falls back to English');
});

test('wired in: A1 screen, Today hint, Profile, service worker cache', () => {
  assert.match(html, /<script src="install-guide\.js\?v=[0-9-]+"><\/script>\s*<script id="a1js">/, 'loaded before A1 renders');
  assert.match(html, /<link rel="stylesheet" href="install-guide\.css\?v=/);
  assert.match(html, /window\.LowiIG \? LowiIG\.player\(\) : '<div class="a1-stage">'/, 'A1 shows the animated walkthrough');
  assert.match(html, /function installSheet\(\)\{ if \(window\.LowiIG && LowiIG\.open && LowiIG\.open\(\)\) return;/, 'Profile opens it');
  assert.match(dr, /LowiIG\.open\(\{ signed: signedHandoff\(\) \}\)/, 'the Today hint opens it, sign-in handoff kept');
  assert.ok(dr.includes("'#igOv'"), 'the daily card waits while the guide is open');
  assert.match(sw, /"install-guide\.css", "install-guide\.js"/);
});

test('battery and motion: one timer, stops when nothing is on screen, honours reduced motion', () => {
  const js = fs.readFileSync(path.join(ROOT, 'install-guide.js'), 'utf8');
  assert.match(js, /if \(D\.hidden\) return;/);
  assert.match(js, /if \(!live\.size\) \{ clearInterval\(timer\); timer = 0; \}/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.ok(!/<video|\.mp4|\.webm|\.gif/.test(js), 'no video files');
  assert.match(js, /beforeinstallprompt/);
  assert.match(js, /x-safari-/);
  assert.match(js, /package=com\.android\.chrome/);
});

test('the mock text scales with the phone, not with the viewport (the cut-off OWiSPIK bug)', () => {
  // cqw on the container element itself resolves against the viewport: 25 px text in a 130 px phone
  assert.match(css, /\.ig-phone\{[^}]*container-type:inline-size/, 'the phone is the size container');
  assert.doesNotMatch(css, /\.ig-scr\{[^}]*container-type/, '.ig-scr must not be its own container');
  assert.match(css, /\.ig-scr\{[^}]*font-size:[0-9.]+cqw/);
  assert.match(css, /\.ig-u\{[^}]*text-overflow:ellipsis/, 'the address is ellipsized, not cut on both sides');
});

test('the chooser says which device and browser it shows; iPad gets a tablet and View More', () => {
  for (const k of ['s_safari', 's_ipad', 's_crios', 's_iab_ios', 's_chrome', 's_samsung', 's_edge', 's_firefox', 's_iab_and']) {
    assert.ok(IG.TX[k] && IG.TX[k].length === 3 && IG.TX[k].every(Boolean), k + ' in EN/DE/ES');
  }
  assert.equal(IG.tx('s_ipad', 'de'), 'Gezeigt: Safari auf dem iPad');
  assert.match(IG.tx('c_pathpad', 'en'), /View More/);
  assert.match(css, /\.ig-phone\.ig-tab\{[^}]*aspect-ratio:3\/4/);
});
