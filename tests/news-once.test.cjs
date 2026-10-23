'use strict';
/* Oct 23 hotfix (Eman: "New in this update. I click Show me. It tells me. And then it appears again. I click Got it. It appears again.
   It doesn't go away."): What's New is ONE announcement per build. Regression tests for the news gate in index.html (same sandbox as
   update-news.test.cjs). Live check: tools/check-news-once.cjs. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const cut = (a, b) => { const i = html.indexOf(a); assert(i >= 0, 'missing ' + a); const j = html.indexOf(b, i); assert(j > i, 'missing ' + b); return html.slice(i, j); };

const g1 = cut('let NEWS = null;', '\n') + '\n' + cut('const KEY = "lowi.g1", GO = "lowi.g1.go", SEEN = "lowi.news.seen";', '\nconst BUILD_NOW') + '\n' + cut('const BUILD_NOW', ';\n') + ';';
const helpers = cut('function mem(){ try { return JSON.parse(localStorage.getItem(KEY)', '/* ---------- the orb look');
const news = cut('function newsGo(){', 'function close(how, quick){');
const tick = cut('function tick(){ if (document.hidden) return; if (TOUR) { helpPlace(); return; }', '/* b2-offer: once per news id */');

function world(o = {}) {
  const local = new Map(Object.entries(o.local || {})), session = new Map(Object.entries(o.session || {}));
  const st = m => ({ getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) });
  const shown = [], tabs = [];
  let version = o.version || { build: 'B2', news: { id: 'n2', text: { en: 'Two', de: 'Zwei' }, go: { tab: 'home' } } };
  const ctx = vm.createContext({ localStorage: st(local), sessionStorage: st(session), Date, JSON, Promise, Array, String, setTimeout: f => f(), window: {},
    document: { hidden: false, querySelector: s => s.includes('lowi-build') ? { content: o.build || 'B2' } : null },
    fetch: async () => ({ ok: true, json: async () => version }) });
  vm.runInContext(g1 + '\n' + helpers + '\n' + `
    let TOUR = null, OB = null, freeSince = 1, TAB = 'home';
    const $ = () => null, vis = () => false, hush = () => {}, helpPlace = () => {}, AUTO = () => true, appFree = () => true, onHome = () => TAB === 'home';
    const tabNow = () => TAB, NT = t => (t && (t.de || t.en)) || t, T = x => x;
    function begin(t){ TOUR = t; shown.push({ kind: t.kind, text: t.steps[0].text }); }
    function start(i){ shown.push({ kind: 'tour' }); }
    function closeTour(){ TOUR = null; }
    ` + news + '\n' + tick + '/* b2-offer */\n' +
    'globalThis.api = { tick, loadNews, newsSeen, markSeen, startNews, offerNews, get NEWS(){ return NEWS; }, closeTour, setTab: t => { TAB = t; }, get loaded(){ return newsLoaded; } };', Object.assign(ctx, { shown, tabs }));
  ctx.Date = { now: () => 1e13 };
  return { api: ctx.api, shown, local, session, setVersion: v => { version = v; } };
}
const returning = { 'lowi.g1': JSON.stringify({ t: 'done', n: 'n1' }), 'lowi.g1.bn': 'n1' };

const steps1 = { build: 'B2', news: { id: 'n2', text: { de: 'Zwei lang' }, go: { tab: 'home' }, steps: [{ tab: 'home', text: { de: 'Zwei' } }] } };
const steps3 = { build: 'B2', news: { id: 'n2', text: { de: 'Zwei lang' }, go: { tab: 'home' }, steps: [{ tab: 'home', text: { de: 'A' } }, { tab: 'move', text: { de: 'B' } }, { tab: 'scan', text: { de: 'C' } }] } };
const ticks = (w, n) => { for (let i = 0; i < n; i++) w.api.tick(); };

test('after the update bubble (with steps), the refresh shows nothing: no second "New in this update"', async () => {
  const w = world({ local: Object.assign({}, returning, { 'lowi.g1.bn': 'n2' }), session: { 'lowi.g1.go': '1' }, version: steps1 });
  await w.api.loadNews(); ticks(w, 6);
  assert.equal(w.shown.length, 0);
  const late = world({ local: returning, session: { 'lowi.g1.go': '1' }, version: steps1 });
  await late.api.loadNews(); ticks(late, 6);
  assert.equal(late.shown.length, 0, 'also when the bubble text arrived late');
});

test('unseen news with one step: exactly one card, and it already says what is new (Got it is never blind)', async () => {
  const w = world({ local: returning, version: steps1 });
  await w.api.loadNews(); ticks(w, 1);
  assert.equal(JSON.stringify(w.shown), JSON.stringify([{ kind: 'offer', text: 'Zwei' }]));
  w.api.closeTour(); ticks(w, 8);
  assert.equal(w.shown.length, 1, 'Got it: never again on tick');
  for (let r = 0; r < 3; r++) { const again = world({ local: Object.fromEntries(w.local), version: steps1 }); await again.api.loadNews(); ticks(again, 4); assert.equal(again.shown.length, 0, 'reload ' + r); }
});

test('Show me with one step goes there and does not show the same text again; nothing reopens afterwards', async () => {
  const w = world({ local: returning, version: steps1 });
  await w.api.loadNews(); ticks(w, 1); w.api.closeTour();
  w.api.startNews(); w.api.closeTour(); ticks(w, 8);
  assert.equal(w.shown.filter(s => s.text === 'Zwei').length, 1);
  assert.equal(w.shown.length, 1);
  const again = world({ local: Object.fromEntries(w.local), version: steps1 }); await again.api.loadNews(); ticks(again, 4);
  assert.equal(again.shown.length, 0);
});

test('several new things are ONE card and one walkthrough, never a chain of announcements', async () => {
  const w = world({ local: returning, version: steps3 });
  await w.api.loadNews(); ticks(w, 1);
  assert.equal(w.shown.length, 1); assert.equal(w.shown[0].kind, 'offer');
  w.api.closeTour(); w.api.startNews();
  assert.equal(w.shown.length, 2); assert.equal(w.shown[1].kind, 'news');
  w.api.closeTour(); ticks(w, 8);
  assert.equal(w.shown.length, 2, 'after the walkthrough nothing opens again');
});

test('the build counts as seen: a renamed news id of the same build, the other device of the account, a cleared id list', async () => {
  const w = world({ local: returning, version: steps1 });
  await w.api.loadNews(); ticks(w, 1); w.api.closeTour();
  assert.equal(w.local.get('lowi.news.build'), 'B2');
  assert.equal(w.local.get('lowispike.news.seenbuild'), 'B2', 'in the account backup');
  const renamed = Object.fromEntries(w.local); delete renamed['lowi.news.seen']; delete renamed['lowi.news.toured'];
  const r = world({ local: Object.assign(renamed, { 'lowi.g1': JSON.stringify({ t: 'done' }) }), version: { build: 'B2', news: { id: 'n2-b', text: { de: 'X' }, steps: [{ tab: 'home', text: { de: 'X' } }] } } });
  await r.api.loadNews(); ticks(r, 4);
  assert.equal(r.shown.length, 0);
  const ipad = world({ local: { 'lowi.g1': JSON.stringify({ t: 'done', n: 'n1' }), 'lowi.news.seen': '["n1"]', 'lowispike.news.seenbuild': 'B2' }, version: steps1 });
  await ipad.api.loadNews(); ticks(ipad, 4);
  assert.equal(ipad.shown.length, 0, 'same account on the iPad');
  const newer = world({ local: Object.fromEntries(w.local), build: 'B3', version: { build: 'B3', news: { id: 'n3', text: { de: 'Drei' }, steps: [{ tab: 'home', text: { de: 'Drei' } }] } } });
  await newer.api.loadNews(); ticks(newer, 4);
  assert.equal(JSON.stringify(newer.shown), JSON.stringify([{ kind: 'offer', text: 'Drei' }]), 'a newer build still gets its one card');
});

test('one gate in the code: no separate toured path that can open a second card, no repeated header in the walkthrough', () => {
  assert(html.includes('if (NEWS && NEWS.id && !newsSeen(NEWS.id) && !toured(NEWS.id)) { if (newsGo() === "steps") offerTour(); else offerNews(); return; }'));
  assert(!html.includes('newsGo() === "steps" && !toured(NEWS.id)) { offerTour(); return; }'));
  assert(!html.includes('(TOUR.kind === "news" ? \'<div class="g1-tag">\''));
  assert(html.includes('localStorage.setItem("lowi.upd.snooze"') && html.includes('3 * 3600 * 1000'), 'Later keeps every build quiet for 3 hours');
  assert(/k === "lowi\.news\.build"/.test(html) && /k === "lowi\.news\.toured"/.test(html), 'sign-out keeps the seen state');
});
