'use strict';
/* Oct 14: "New update -> Next -> the same text again". News is shown once per id (banner OR one bubble), never replayed after the
   update tap, never re-offered on relaunch or tab change; a later, different news id still shows. Plus the browser-only Add to Home note. */
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
    let TOUR = null, freeSince = 1, TAB = 'home';
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

test('the old embedded Swaflo note is gone, so an update tap cannot bring it back', () => {
  assert(!/const NEWS_RAW\s*=/.test(html));
  assert(!html.includes('"id": "swaflo-v1"'));
});

test('after tapping the update banner, nothing repeats the text the banner already showed', async () => {
  const w = world({ local: Object.assign({}, returning, { 'lowi.g1.bn': 'n2' }), session: { 'lowi.g1.go': '1' } });
  await w.api.loadNews();
  for (let i = 0; i < 4; i++) w.api.tick();
  assert.equal(w.shown.length, 0);
  assert(!w.session.has('lowi.g1.go'));
});

test('a new update that arrived without the banner is shown once, marked seen as it opens', async () => {
  const w = world({ local: returning });
  await w.api.loadNews();
  w.api.tick();
  assert.equal(JSON.stringify(w.shown), JSON.stringify([{ kind: 'offer', text: 'Zwei' }]));
  assert(w.api.newsSeen('n2'));
  assert(JSON.parse(w.local.get('lowi.news.seen')).includes('n2'));
});

test('Got it / Later / closing never brings the same text back: not on tick, relaunch or tab change', async () => {
  const w = world({ local: returning });
  await w.api.loadNews(); w.api.tick(); w.api.closeTour();
  for (let i = 0; i < 5; i++) w.api.tick();
  w.api.setTab('shelf'); w.api.tick(); w.api.setTab('home'); w.api.tick();
  const relaunch = world({ local: Object.fromEntries(w.local) });
  await relaunch.api.loadNews(); for (let i = 0; i < 3; i++) relaunch.api.tick();
  assert.equal(w.shown.length, 1);
  assert.equal(relaunch.shown.length, 0);
});

test('"Show me" goes to the place and never shows the same news text a second time', async () => {
  const w = world({ local: returning, version: { build: 'B2', news: { id: 'n2', text: { de: 'Zwei' }, go: { tab: 'shelf' } } } });
  await w.api.loadNews(); w.api.tick();
  assert.equal(w.shown.length, 1);
  w.api.closeTour(); w.api.startNews();
  assert.equal(w.shown.filter(s => s.text === 'Zwei').length, 1);
});

test('a later, different update still gets its one message', async () => {
  const w = world({ local: returning });
  await w.api.loadNews(); w.api.tick(); w.api.closeTour();
  const next = world({ local: Object.fromEntries(w.local), build: 'B3', version: { build: 'B3', news: { id: 'n3', text: { de: 'Drei' } } } });
  await next.api.loadNews(); next.api.tick();
  assert.equal(JSON.stringify(next.shown), JSON.stringify([{ kind: 'offer', text: 'Drei' }]));
});

test('news written for another build (stale HTML) is never shown as this build\'s news', async () => {
  const w = world({ local: returning, build: 'B1' });
  await w.api.loadNews(); w.api.tick();
  assert.equal(w.api.NEWS, null);
  assert.equal(w.shown.length, 0);
});

test('the banner marks its news as seen both when it opens and when the text arrives late', () => {
  const b = cut('function decorate(){', '/* b2-bn */');
  assert(b.includes('markSeen(upNews.id)'));
  const late = cut('if (pp && nn && pp.textContent !== nn) pp.textContent = nn;', '} });');
  assert(late.includes('markSeen(upNews.id)'));
});

test('a news bubble with nowhere to go has a single "Got it" and no Next-style button', () => {
  const b = cut('} else if (TOUR.kind === "offer") {', "head = '<div class=\"g1-tag\">' + esc(s.tag");
  assert(b.includes('newsGo()'));
  assert(b.includes('data-g1="done">\' + esc(T("Got it"))'));
});

/* Add to Home Screen note */
const hint = cut('const A2HS_X = "lowi.a2hs.x";', 'setInterval(() => { if ($("#lcA2hs")) a2Place(); }, 700);');
function hintWorld(o) {
  const nodes = new Map(), session = new Map(Object.entries(o.session || {}));
  const el = () => { const e = { id: '', className: '', style: {}, attrs: {}, classList: { toggle(){} }, setAttribute(k, v){ this.attrs[k] = v; }, remove(){ nodes.delete(this.id); }, offsetHeight: 60 }; return e; };
  const ctx = vm.createContext({ navigator: { userAgent: o.ua, maxTouchPoints: 5 }, location: { protocol: 'https:' }, innerHeight: 844,
    sessionStorage: { getItem: k => session.has(k) ? session.get(k) : null, setItem: (k, v) => session.set(k, v) },
    document: { createElement: el, body: { appendChild: n => nodes.set(n.id, n) }, documentElement: { classList: { contains: () => false } } },
    $: s => s === '#lcA2hs' ? nodes.get('lcA2hs') || null : null, standalone: () => !!o.standalone, a2Lang: () => 'de', getComputedStyle: () => ({}) });
  vm.runInContext(hint, ctx);
  return { run: () => ctx.a2hsHint(), nodes, session };
}
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';

test('in the phone browser (not from the Home Screen) the Add to Home note shows, in the app language', () => {
  const w = hintWorld({ ua: IPHONE }); w.run();
  const d = w.nodes.get('lcA2hs');
  assert(d, 'note missing');
  assert(d.innerHTML.includes('Home-Bildschirm'));
  assert(d.innerHTML.includes('data-cl="a2hs"'));
});

test('opened from the Home Screen there is no Add to Home note', () => {
  const w = hintWorld({ ua: IPHONE, standalone: true }); w.run();
  assert(!w.nodes.has('lcA2hs'));
});

test('closing it hides it for this visit only; the old forever flag no longer silences it', () => {
  const w = hintWorld({ ua: IPHONE, session: { 'lowi.a2hs.x': '1' } }); w.run();
  assert(!w.nodes.has('lcA2hs'));
  assert(!hint.includes('localStorage.getItem("lowi.a2hs")'));
  assert(html.includes('case "a2hs-x": try { sessionStorage.setItem("lowi.a2hs.x", "1"); }'));
  assert(!/a2hsHint[\s\S]{0,1600}d\.remove\(\); \}, 15000\)/.test(html));
});

test('the How sheet has steps in German for iPhone Safari', () => {
  const s = cut('const A2T = {', 'function installSheet(){');
  assert(s.includes('Zum Home-Bildschirm'));
  assert(s.includes('Im Browser öffnen'));
});
