'use strict';
// Oct 21 2026, Emmanuel: "I hope when someone new opens the link to our app they clearly get the instructions to add this to
// their home screen right? And how. That's very important."
// Found: since the companion onboarding (Oct 17) saves the visitor's first name before "Create account", the guide counted that
// name as a returning guest and was skipped, so no new visitor ever saw it. Now:
// 1. a brand-new visitor in a phone browser gets the guide as the FIRST screen (before the companion onboarding)
// 2. the onboarding's own name no longer hides it at "Create account"; real returning guests (meals, setup done) still skip it
// 3. never inside the Home Screen app, never on a computer; iPhone Chrome is told its Share button is at the top right
// Live check in real browsers: tools/a2hs/guide-check.cjs [--url https://therealetm.github.io/lowispike/].
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const a = html.indexOf('/* ===== LOWiSPIKE A1 (Oct 11, 2026): Add to Home Screen before sign-up');
const b = html.indexOf('})();', html.indexOf('window.LowiA1 =', a)) + 5;
const SRC = html.slice(a, b);

const SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const CHROME_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.69 Mobile/15E148 Safari/604.1';
const TIKTOK = SAFARI + ' musical_ly_36.5.0 BytedanceWebview/d8a21c6';
const DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
function store(init) { const m = new Map(Object.entries(init || {})); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; }
function load(o) {
  o = o || {};
  const win = { addEventListener() { }, matchMedia: q => ({ matches: !!o.standalone && /standalone/.test(q) }), LowiR2: { S: () => o.state || {} } };
  const ctx = { window: win, navigator: { userAgent: o.ua || SAFARI, standalone: !!o.standalone, maxTouchPoints: o.touch == null ? 5 : o.touch }, localStorage: store(o.local), sessionStorage: store(o.session),
    document: { addEventListener() { }, querySelector: () => null, getElementById: () => null }, location: { origin: 'https://therealetm.github.io', pathname: '/lowispike/' },
    setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, clearInterval() { }, console };
  ctx.matchMedia = win.matchMedia; ctx.LowiR2 = win.LowiR2; win.window = win;
  vm.createContext(ctx); vm.runInContext(SRC.replace(/window\.LowiA1 =/, 'window.LowiA1 = globalThis.__A1 ='), ctx);
  return ctx.__A1 || win.LowiA1;
}
const hs = (step, user) => ({ 'lowi.hs.v1': JSON.stringify({ v: 2, step, user: user || '' }) });

test('a brand-new visitor in iPhone Safari gets the guide as the first screen', () => {
  const A1 = load();
  assert.strictEqual(A1.kind(), 'ios'); assert.ok(A1.want()); assert.ok(A1.wantStart());
  const h = A1.html('start');
  assert.match(h, /Put LOWiSPIKE on your Home Screen/); assert.match(h, /Tap Share/); assert.match(h, /Tap Add to Home Screen/); assert.match(h, /Open LOWiSPIKE/);
  assert.match(h, /data-a1="continue"/); assert.doesNotMatch(h, /data-a1="back"/, 'nothing behind the first screen');
  assert.strictEqual(A1.mode(), 'start');
});
test('in TikTok / Instagram it says to open the page in Safari first; Android gets the install steps', () => {
  assert.strictEqual(load({ ua: TIKTOK }).kind(), 'inapp');
  assert.match(load({ ua: TIKTOK }).html('start'), /Open LOWiSPIKE in your browser/);
  assert.strictEqual(load({ ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36' }).kind(), 'android');
});
test('iPhone Chrome is told where its Share button is (top right), not Safari\'s bottom bar', () => {
  const h = load({ ua: CHROME_IOS }).html('start');
  assert.match(h, /top right, next to the address bar/); assert.doesNotMatch(h, /bottom of Safari/); assert.doesNotMatch(h, /In Safari you'd have to/);
  assert.match(load().html('start'), /bottom of Safari, or behind/);
  assert.match(load({ ua: SAFARI.replace('iPhone; CPU iPhone OS', 'iPad; CPU OS') }).html('start'), /top right, next to the address bar/, 'iPad Safari: Share is at the top right');
});
test('the name the companion onboarding asked for does not hide the guide at Create account', () => {
  const A1 = load({ local: hs(4, 'Lena'), state: { user: { name: 'Lena' } } });
  assert.ok(A1.want(), 'onboarding name alone is not a returning guest');
  assert.ok(!A1.wantStart(), 'onboarding under way: the guide waits for Create account');
  assert.match(A1.html('signup'), /data-a1="back"/);
});
test('returning guests, "Continue in the browser", the Home Screen app and computers skip it', () => {
  assert.ok(!load({ state: { user: { name: 'Sam' }, setupDone: true } }).want());
  assert.ok(!load({ state: { logs: [{}] } }).want());
  assert.ok(!load({ state: { user: { name: 'Sam' } } }).want(), 'a name that did not come from the onboarding is a returning guest');
  assert.ok(!load({ session: { 'lowi.a1.skip': '1' } }).want());
  assert.ok(!load({ standalone: true }).want()); assert.strictEqual(load({ standalone: true }).kind(), '');
  assert.ok(!load({ ua: DESKTOP, touch: 0 }).want());
  assert.strictEqual(load({ ua: DESKTOP, touch: 5 }).kind(), 'ios', 'iPadOS Safari reports a Mac user agent with touch');
});
test('the gate shows the guide first for new visitors and goes on to the companion start after "Continue in the browser"', () => {
  assert.match(html, /const a1s = view !== "signup" && view !== "signin" && !!window\.LowiA1 && !!LowiA1\.wantStart && LowiA1\.wantStart\(\);/);
  assert.match(html, /LowiA1\.html\(a1s \? "start" : "signup"\)/);
  assert.match(SRC, /v === "continue"\) \{[^\n]*gate\(mode === "start" \? "home" : "signup"\)/);
  for (const s of ['top right, next to the address bar', "in this browser's menu, or open the page in Safari", "Sign up in the app and you stay signed in. In the browser you'd have to sign in again later."])
    assert.ok(SRC.includes('["' + s.replace(/"/g, '\\"') + '", "'), 'German/Spanish for: ' + s);
});
