// Oct 25, 2026 (Emmanuel, German voice, urgent): "Wenn man auf Deep Analyze drückt, dann zeigt sich der kostenpflichtige Chat GPT an.
// Der neue ist direkt die App. Jeder hat Chat GPT auf seinem Handy, direkt Custom, der Custom GPT."
// His screenshot: chatgpt.com in the Home Screen app's in-app Safari sheet, "Content failed to load / Try again".
// The link was already the right Custom GPT (the only chatgpt.com/g/ URL in git history, Oct 10 / Oct 15 9d517f2), but a
// target=_blank link in an iOS Home Screen web app opens in that in-app sheet, where universal links never reach the app.
// gpt-open.js: in the iOS Home Screen app the tap goes to the ChatGPT app's own scheme with the same /g/ path; a second tap
// (no app) opens the Custom GPT itself, never bare chatgpt.com, never an iframe or an in-app frame.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const GPT = 'https://chatgpt.com/g/g-69481a874bf08191b8118f8d88c9c90e-lowispike';
const APP = 'com.openai.chat://chatgpt.com/g/g-69481a874bf08191b8118f8d88c9c90e-lowispike';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const file = path.join(root, 'gpt-open.js');

/* a tiny page: one window, one document, one link; records every navigation, window.open and created element */
function page({ ua = IPHONE, standalone = true, href = GPT, lang = 'de' } = {}) {
  const L = {}, log = { nav: [], opened: [], created: [], prevented: 0 };
  const on = (t, f) => { (L[t] = L[t] || []).push(f); };
  const small = { textContent: 'Opens the LOWiSPIKE GPT in ChatGPT' };
  const link = {
    tagName: 'A', target: '_blank', getAttribute: k => (k === 'href' ? href : k === 'target' ? '_blank' : null),
    querySelector: s => (s === 'small' ? small : null),
    closest(s) { return /a\[href/.test(s) || s === 'a' ? this : null; },
  };
  const loc = { href: 'https://therealetm.github.io/lowispike/', assign(u) { log.nav.push(String(u)); } };
  const document = {
    visibilityState: 'visible', documentElement: { lang },
    addEventListener: on, removeEventListener() {},
    createElement(tag) { log.created.push(tag); return { style: {}, setAttribute() {}, click() {}, remove() {} }; },
    body: { appendChild() {} },
  };
  const win = {
    document, location: loc, navigator: { userAgent: ua, standalone, platform: 'iPhone', maxTouchPoints: 5 },
    matchMedia: q => ({ matches: standalone && /standalone/.test(q) }),
    addEventListener: on, removeEventListener() {},
    open(u) { log.opened.push(String(u)); return {}; },
    setTimeout: () => 0, clearTimeout() {}, Date,
  };
  win.window = win;
  Object.defineProperty(loc, 'href', { get: () => 'https://therealetm.github.io/lowispike/', set: u => log.nav.push(String(u)) });
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), win);
  const tap = () => {
    const ev = { target: link, defaultPrevented: false, button: 0, preventDefault() { this.defaultPrevented = true; log.prevented++; }, stopPropagation() {} };
    for (const f of (L.click || [])) f(ev);
    return ev;
  };
  const fire = t => { for (const f of (L[t] || [])) f({}); };
  return { win, tap, fire, log, small };
}

test('gpt-open.js exists and is loaded by the app and kept offline by the service worker', () => {
  assert.ok(fs.existsSync(file), 'gpt-open.js');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(html, /<script src="gpt-open\.js\?v=[^"]+"><\/script>/);
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.ok(/const STATIC = \[[^\]]*"gpt-open\.js"/.test(sw), 'sw.js STATIC has gpt-open.js');
});

test('the app link is the Custom GPT itself in the ChatGPT app, never bare chatgpt.com', () => {
  const { win } = page();
  const G = win.LowiGptOpen;
  assert.ok(G && typeof G.appURL === 'function');
  assert.strictEqual(G.GPT, GPT, 'the one Custom GPT from git history');
  assert.strictEqual(G.appURL(GPT), APP);
  for (const bare of ['https://chatgpt.com', 'https://chatgpt.com/', 'https://chatgpt.com/?q=x', 'https://chat.openai.com/', 'https://evil.com/g/g-1']) {
    assert.strictEqual(G.appURL(bare), '', 'no app link for ' + bare);
  }
});

test('iPhone Home Screen app: tapping Deep analyze opens the Custom GPT in the ChatGPT app, not the in-app sheet', () => {
  const p = page();
  const ev = p.tap();
  assert.ok(ev.defaultPrevented, 'the target=_blank sheet is not opened');
  assert.deepStrictEqual(p.log.nav, [APP], 'one top-level hand-off to the ChatGPT app');
  assert.deepStrictEqual(p.log.opened, [], 'no window.open into the in-app sheet');
  assert.ok(!p.log.created.includes('iframe'), 'never an iframe');
  assert.ok(!p.log.nav.some(u => /^https:\/\/chatgpt\.com\/?(\?|$)/.test(u)), 'never bare chatgpt.com');
});

test('no ChatGPT app: the page stays, the link says so, and the next tap opens the Custom GPT itself (never bare chatgpt.com)', () => {
  const p = page();
  p.tap();
  p.win.LowiGptOpen._stayed();             // what the 2.5 s timer runs when the page was never hidden
  assert.match(p.small.textContent, /nochmal/i, 'German hint under the link');
  const ev2 = p.tap();
  assert.ok(!ev2.defaultPrevented, 'second tap = the plain link to ' + GPT);
  assert.deepStrictEqual(p.log.nav, [APP]);
});

test('the app opened (page hidden): no hint, and the next tap goes to the app again', () => {
  const p = page();
  p.tap();
  p.win.document.visibilityState = 'hidden'; p.fire('visibilitychange');
  p.win.LowiGptOpen._stayed();
  assert.doesNotMatch(p.small.textContent, /nochmal/i);
  p.win.document.visibilityState = 'visible';
  const ev2 = p.tap();
  assert.ok(ev2.defaultPrevented);
  assert.deepStrictEqual(p.log.nav, [APP, APP]);
});

test('Safari tab, Android and desktop keep the plain link (the system opens the app there)', () => {
  for (const o of [{ standalone: false }, { ua: 'Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile', standalone: true }, { ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Chrome/130', standalone: false }]) {
    const p = page(o);
    const ev = p.tap();
    assert.ok(!ev.defaultPrevented, JSON.stringify(o));
    assert.deepStrictEqual(p.log.nav, []);
  }
});

test('every GPT button in the app points at the Custom GPT URL with a real link, never an in-app frame', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(html.includes('const DEEP_GPT = "' + GPT + '";'), 'Deep analyze');
  assert.ok(html.includes('const URL = "' + GPT + '";'), 'Cook GPT card');
  assert.match(html, /href="' \+ esc\(deepURL\(\)\) \+ '" target="_blank" rel="noopener"/);
  assert.ok(!/<iframe[^>]*chatgpt/i.test(html) && !/iframe[^;\n]{0,200}chatgpt\.com/i.test(html), 'no ChatGPT iframe');
  assert.ok(!/["']https:\/\/chatgpt\.com\/?["']/.test(html), 'no bare chatgpt.com link anywhere');
});
