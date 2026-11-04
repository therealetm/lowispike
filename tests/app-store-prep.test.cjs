'use strict';
// Nov 3, 2026 (branch app-store-prep): the App Store pieces stay wired.
// - meal photos / typed food names reach Google Gemini only after "Allow" (LowiConsent), never on "Not now"
// - the iPhone app flag hides Ko-fi + Premium and answers the standalone checks
// - privacy.html exists with a support contact, and is served with the site
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

function loadAI(consent) {
  const calls = [];
  const store = {};
  const win = {
    LowiConsent: { get: () => consent.v, ask: async () => { consent.asked++; consent.v = consent.answer; return consent.answer === 'yes'; } },
    LowiAuth: { client: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) } }) },
    LOWI_CFG: { url: 'https://x.supabase.co', key: 'sb_publishable_test' }
  };
  const ctx = {
    window: win, self: win, globalThis: win, console, setTimeout, clearTimeout, AbortController, Promise, JSON, Date, Math, Map, Set,
    document: { createElement: () => ({}), addEventListener() {}, querySelector: () => null, documentElement: { lang: 'en' } },
    localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    navigator: { onLine: true, language: 'en' },
    fetch: async (url, opts) => {
      if (!opts || !opts.method || opts.method === 'GET') return { ok: true, status: 200, json: async () => ({ ok: true, configured: true }), text: async () => '' };
      calls.push(String(url)); return { ok: true, status: 200, json: async () => ({ ok: true, items: [{ name: 'apple', grams: 100 }] }), text: async () => '' };
    }
  };
  Object.assign(win, ctx);
  vm.createContext(ctx);
  vm.runInContext(R('food-photo-ai.js'), ctx);
  return { AI: win.LowiFoodAI || ctx.LowiFoodAI, calls };
}

test('photo check: "Not now" sends nothing to Gemini and says why', async () => {
  const c = { v: '', answer: 'no', asked: 0 };
  const { AI, calls } = loadAI(c);
  assert.ok(AI && AI.analyse, 'LowiFoodAI.analyse exists');
  await assert.rejects(AI.analyse('data:image/jpeg;base64,AAAA', {}), e => e.code === 'consent');
  assert.strictEqual(c.asked, 1, 'asked once');
  assert.strictEqual(calls.filter(u => /food-photo/.test(u)).length, 0, 'no request to the food-photo function');
  await assert.rejects(AI.analyse('data:image/jpeg;base64,BBBB', {}), e => e.code === 'consent');
  assert.strictEqual(c.asked, 1, 'a "no" is not asked again on every photo');
});

test('photo check: after "Allow" the photo goes out', async () => {
  const c = { v: '', answer: 'yes', asked: 0 };
  const { AI, calls } = loadAI(c);
  try { await AI.analyse('data:image/jpeg;base64,AAAA', {}); } catch (e) { /* the fake reply may not parse; only the request matters */ }
  assert.strictEqual(c.asked, 1);
  assert.ok(calls.some(u => /food-photo/.test(u)), 'request sent after consent');
});

test('the consent sheet, privacy page and support contact are in the build', () => {
  const idx = R('index.html');
  assert.match(idx, /<script src="store-ready\.js\?v=[^"]+"><\/script>\s*\n<script src="meal-photo\.js/, 'store-ready.js loads before meal-photo.js / food-photo-ai.js');
  const sr = R('store-ready.js');
  assert.match(sr, /Google Gemini/);
  assert.match(sr, /W\.LowiConsent = \{/);
  const pp = R('privacy.html');
  for (const id of ['id="en"', 'id="de"', 'id="es"', 'mailto:therealetm@gmail.com', 'Google Gemini', 'Supabase']) assert.ok(pp.includes(id), 'privacy.html has ' + id);
  assert.match(R('sw.js'), /STATIC\.push\("store-ready\.js", "privacy\.html"\)/);
  const { list } = require('../scripts/site-files.cjs');
  if (typeof list === 'function') {
    const files = list(path.join(__dirname, '..'));
    assert.ok(!files.some(f => f.startsWith('ios/')), 'ios/ is never published');
    assert.ok(!files.includes('capacitor.config.json'), 'capacitor.config.json is never published');
  }
});

test('iPhone app flag: hides Ko-fi + Premium, standalone checks pass', () => {
  const idx = R('index.html');
  const m = idx.match(/<script id="lisNative">([\s\S]*?)<\/script>/);
  assert.ok(m, 'lisNative script present');
  const cls = new Set();
  const win = { Capacitor: { isNativePlatform: () => true }, matchMedia: q => ({ matches: false, media: q }) };
  const nav = {};
  const ctx = { window: win, navigator: nav, location: { protocol: 'capacitor:' }, document: { documentElement: { classList: { add: c => cls.add(c) } } }, Object, String };
  vm.createContext(ctx);
  vm.runInContext(m[1], ctx);
  assert.strictEqual(win.LIS_NATIVE, true);
  assert.ok(cls.has('lis-native'));
  assert.strictEqual(nav.standalone, true);
  assert.strictEqual(win.matchMedia('(display-mode: standalone)').matches, true);
  assert.strictEqual(win.matchMedia('(min-width: 600px)').matches, false, 'other media queries untouched');
  // on the website nothing changes
  const win2 = { matchMedia: q => ({ matches: false }) }, nav2 = {};
  const ctx2 = { window: win2, navigator: nav2, location: { protocol: 'https:' }, document: { documentElement: { classList: { add() { throw new Error('no class on web'); } } } }, Object, String };
  vm.createContext(ctx2); vm.runInContext(m[1], ctx2);
  assert.strictEqual(win2.LIS_NATIVE, false);
  assert.strictEqual(nav2.standalone, undefined);
  assert.match(R('herb-shop.js'), /function open\(view\)\{if\(V\.ov\|\|root\.LIS_NATIVE\)return;/);
  assert.match(R('spirit.js'), /window\.LIS_NATIVE && \(c\.premium \|\| c\.status === 'premium'\)/);
  assert.match(R('home-settings-sleep-v2.js'), /id === 'support' && root\.LIS_NATIVE/);
});
