// 23 Nov 2026 (Emmanuel): Get on a phone plays the "Add to Home Screen" steps as a replay that looks like the phone's own screens
// ("so that they think, wait, is this happening by itself? ... oh, no, this is just a loop showing me how to do this").
// No page can open Safari's own share menu; the one navigator.share opens has no "Add to Home Screen" row (checked on his iPhone).
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const js = R('install-replay.js'), css = R('install-replay.css'), store = R('store-page.js');
function load() { const ctx = { navigator: { language: 'en-US', userAgent: '' }, matchMedia: () => ({ matches: false }) }; ctx.window = ctx; ctx.document = {}; vm.createContext(ctx); vm.runInContext(js, ctx); return ctx.LowiInstallReplay; }
const J = x => JSON.parse(JSON.stringify(x));   /* arrays made in the sandbox compare by value */
const getFn = /function get\(\) \{[\s\S]*?\n  \}/.exec(store)[0];   /* the Get button only; the page's own Share-the-app button may use navigator.share */
const UA = {
  ios26: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1',
  ios18: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  crios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/142.0.7444.77 Mobile/15E148 Safari/604.1',
  fxios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/145.0 Mobile/15E148 Safari/605.1.15',
  edgios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/142.0 Version/18.0 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36'
};
test('the replay picks the phone’s own way: Safari 26, older Safari, Chrome/Firefox/Edge on iPhone, Android', () => {
  const P = load();
  assert.strictEqual(P.variantFor(UA.ios26), 'ios26'); assert.strictEqual(P.variantFor(UA.ios18), 'classic');
  for (const k of ['crios', 'fxios', 'edgios']) assert.strictEqual(P.variantFor(UA[k]), 'chromeios', k);
  assert.strictEqual(P.variantFor(UA.android), 'android');
});
test('his iPhone (Safari 26, Compact bar): ≡ in the address bar -> Share -> View More -> Add to Home Screen -> Add -> open, 6 taps', () => {
  const v = load().VARIANTS.ios26;
  assert.deepStrictEqual(J(v.steps.map(s => s[0])), ['s_menu', 's_share', 's_more', 's_a2hs', 's_add', 's_open']);
  assert.strictEqual(v.anchor.edge, 'bottom'); assert.strictEqual(v.anchor.g, '≡'); assert.ok(v.anchor.x > 0.15 && v.anchor.x < 0.4, 'the ≡ sits at the left of the address field');
  assert.match(js, /webapp: \['Open as Web App'/, 'the Add sheet shows the "Open as Web App" switch, on, as on iOS 26');
});
test('every way: starts at the real button in the browser bar, every tap target is drawn, ends on the Home Screen icon', () => {
  const V = load().VARIANTS;
  assert.deepStrictEqual(J(Object.keys(V).sort()), ['android', 'chromeios', 'classic', 'ios26', 'ios26dots']);
  for (const [name, v] of Object.entries(V)) {
    assert.ok(v.steps.length >= 4, name); assert.strictEqual(v.steps[0][1], '@', name + ' starts at the bar');
    assert.deepStrictEqual(J(v.steps[v.steps.length - 1].slice(1)), ['[data-k=icon]', 'launch'], name + ' ends by opening the app');
    assert.ok(['top', 'bottom'].includes(v.anchor.edge) && v.anchor.x > 0 && v.anchor.x < 1, name);
    for (const [, t] of v.steps.slice(1)) { const k = /^\[data-k=(\w+)\]$/.exec(t); assert.ok(k, name + ' ' + t); assert.ok(js.includes("row('" + k[1] + "'") || js.includes('data-k="' + k[1] + '"'), name + ' draws ' + t); }
  }
});
test('the phone’s words follow the phone’s language; the captions follow the app’s; all in EN/DE/ES', () => {
  const P = load();
  for (const [k, a] of Object.entries(P._UI)) assert.ok(Array.isArray(a) && a.length === 3 && a.every(s => typeof s === 'string' && s.trim()), k);
  assert.match(js, /navigator\.language/); assert.match(js, /capL = CAP\[opts\.lang\] \? opts\.lang : 'en'/);
  const en = Object.keys(P._CAP.en);
  for (const l of ['de', 'es']) { assert.deepStrictEqual(J(Object.keys(P._CAP[l]).sort()), J(en.slice().sort()), l); for (const k of en) assert.ok(String(P._CAP[l][k]).trim(), l + ' ' + k); }
  for (const l of ['en', 'de', 'es']) { const C = P._CAP[l]; assert.match(C.of, /\{i\}[\s\S]*\{n\}/, l); assert.match(C.taps, /\{n\}[\s\S]*\{s\}/, l); }
  for (const v of Object.values(P.VARIANTS)) for (const [k] of v.steps) for (const l of ['en', 'de', 'es']) assert.ok(P._CAP[l][k], l + ' ' + k);
});
test('honest: tap count comes from the steps, it says it is a replay, nothing on the phone is touched', () => {
  assert.match(js, /const n = v\.steps\.length, secs = Math\.round\(v\.steps\.length \* 2\.6 \+ 1\);/);
  assert.match(load()._CAP.en.note, /This is a replay\. Your phone is not being changed\./);
  const code = js.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(code, /navigator\.share|location\.(href|assign|replace)|localStorage|sessionStorage/);
});
test('after each round: Your turn with an arrow at the real button, Watch again, My phone looks different, Continue in the browser', () => {
  for (const k of ['again', 'other', 'browser', 'skip']) assert.ok(js.includes('data-rp="' + k + '"'), k);
  assert.match(js, /\(ORDER\[group\(\)\]\.length > 1 \?/, '"looks different" only when there is another way to show');
  assert.match(css, /\.rp\.st-page \.rp-anchor,\.rp\.st-end \.rp-anchor\{display:flex\}/);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)\{\.rp \*\{transition-duration:\.01s!important;animation:none!important\}\}/);
});
/* the store page's Get: never the wrong share menu again */
test('Get on an iPhone plays the replay (no navigator.share); Android tries its own install window first; loaded and cached', () => {
  assert.doesNotMatch(getFn, /navigator\.share|shareSheet/);
  assert.match(getFn, /if \(ios\(\)\) \{ replay\(W\.LowiInstallReplay \? W\.LowiInstallReplay\.variantFor\(UA\) : ''\); return; \}/);
  assert.match(store, /e\.prompt\(\); Promise\.resolve\(e\.userChoice\)\.then\(c => \{ if \(c && c\.outcome === 'accepted'\) instOn\('done'\); else replay\('android'\); \}\)/);
  assert.match(store, /R\.open\(el, \{ variant, lang, onBrowser: goBrowser/);
  const html = R('index.html'); assert.ok(html.indexOf('install-replay.js?v=') > html.indexOf('store-page.js?v='));
  assert.match(R('sw.js'), /STATIC\.push\("install-replay\.js", "install-replay\.css"\)/);
});
