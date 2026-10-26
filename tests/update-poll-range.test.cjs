'use strict';
// Oct 18 heat/data pass: the 60 s update poll reads only the first 64 bytes of version.json (185 KB of What's New history).
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const root = path.join(__dirname, '..'), html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const start = html.indexOf('const BUILD = (document.querySelector'), end = html.indexOf('function sw(){', start);
assert(start >= 0 && end > start);
const source = html.slice(start, end);
const old = '20261012-233911', latest = '20261013-203600';
const bigNews = 'x'.repeat(200000);

// respond(url, opts) -> fake Response
function fixture(build, respond) {
  const nodes = new Map(), calls = [], replaces = [];
  const element = () => { const cls = new Set(); return { dataset: {}, style: {}, classList: { add: c => cls.add(c), remove: c => cls.delete(c), contains: c => cls.has(c) }, setAttribute() {}, remove() { nodes.delete(this.id); } }; };
  const document = { body: {}, readyState: 'complete', visibilityState: 'visible', dispatchEvent: () => true, documentElement: { lang: 'en', appendChild: n => nodes.set(n.id, n) },
    createElement: () => element(), addEventListener() {}, querySelectorAll: () => [], querySelector: s => s.includes('build') ? { content: build } : null };
  const store = () => { const m = new Map(); return { getItem: k => m.get(k) || null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
  const ctx = vm.createContext({ document, location: { href: 'https://example.com/lowispike/', protocol: 'https:', pathname: '/lowispike/', search: '', hash: '', replace: u => replaces.push(u) },
    navigator: {}, CustomEvent: class { constructor(t, o) { this.type = t; this.detail = (o || {}).detail; } }, clearTimeout: () => {}, window: { addEventListener() {} },
    localStorage: store(), sessionStorage: store(), history: { state: null, replaceState() {} }, URL, Date, Promise, setInterval: () => 0,
    $: s => nodes.get(s.slice(1)) || null, getComputedStyle: () => ({ fontFamily: 'system-ui' }), setTimeout: () => 0,
    fetch: async (url, opts) => { calls.push({ url, opts: opts || {} }); return respond(url, opts || {}); } });
  vm.runInContext(source, ctx);
  vm.runInContext('updAway(11 * 60000)', ctx); /* Oct 26: no ask any more; a found build shows as the quiet load after a long time away */
  return { nodes, calls, run: e => vm.runInContext(e, ctx), found: () => (replaces.length ? new URL(replaces[0], 'https://example.com').searchParams.get('v') : null) };
}
const range = c => c.opts.headers && (c.opts.headers.Range || c.opts.headers.range);
const partial = text => ({ ok: true, status: 206, text: async () => text, json: async () => { throw Error('partial body is not JSON'); } });
const full = obj => ({ ok: true, status: 200, text: async () => JSON.stringify(obj), json: async () => obj });

test('poll asks for the first 64 bytes only and finds a new build from them', async () => {
  const f = fixture(old, (u, o) => range({ opts: o }) ? partial(('{"build": "' + latest + '", "news": {"id": "x-' + bigNews).slice(0, 64)) : full({ build: latest, news: { text: bigNews } }));
  await f.run('checkUpdate(true)');
  assert.equal(f.calls.length, 1, 'one small request, no full download');
  assert.equal(range(f.calls[0]), 'bytes=0-63');
  assert.equal(f.calls[0].opts.cache, 'no-store');
  assert.equal(f.found(), latest); assert(!f.nodes.has('lcUpd'), 'never an ask (Oct 26)');
});
test('same build from the 64 bytes: no prompt and no full download', async () => {
  const f = fixture(latest, () => partial(('{"build": "' + latest + '", "news": {' + bigNews).slice(0, 64)));
  await f.run('checkUpdate(true)');
  assert.equal(f.calls.length, 1); assert(!f.nodes.has('lcUpd')); assert.equal(f.found(), null);
});
test('server ignores Range (200, whole file): uses that one response, no second request', async () => {
  const f = fixture(old, () => full({ build: latest, news: { text: bigNews } }));
  await f.run('checkUpdate(true)');
  assert.equal(f.calls.length, 1); assert.equal(f.found(), latest); assert(!f.nodes.has('lcUpd'), 'never an ask (Oct 26)');
});
test('no build id in the first 64 bytes (key order changed): falls back to the whole file once', async () => {
  const f = fixture(old, (u, o) => range({ opts: o }) ? partial('{"news": {"id": "' + bigNews.slice(0, 50)) : full({ news: {}, build: latest }));
  await f.run('checkUpdate(true)');
  assert.equal(f.calls.length, 2); assert(!range(f.calls[1]), 'fallback is a plain request');
  assert.equal(f.found(), latest); assert(!f.nodes.has('lcUpd'), 'never an ask (Oct 26)');
});
test('the range request fails (network): one plain retry, and a failure stays silent', async () => {
  let n = 0; const f = fixture(old, () => { n++; throw Error('offline'); });
  await f.run('checkUpdate(true)');
  assert.equal(n, 2); assert(!f.nodes.has('lcUpd')); assert.equal(f.found(), null);
});
test('poll cadence is unchanged: every 60 s while visible', () => {
  assert.match(html, /setInterval\(\(\) => \{ if \(document\.visibilityState === "visible"\) checkUpdate\(true\); \}, 60000\);/);
});
