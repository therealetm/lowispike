'use strict';
/* Hidden test accounts (Oct 18, 2026). Emmanuel, Community galaxy screenshot at 01:16 showed Samir, Gatey, Jonas, Guesty, Q,
   Joseph Castellar, You, Manuuii, Emma, Emmy, Test, QA and Mateo: "the ones that look like test accounts ... They are not
   real." Hidden in the app by account id (hidden-accounts.js), nothing deleted. People below use the live ids. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
process.env.TZ = 'Europe/Berlin';
const HA = require('../hidden-accounts.js');
const C = require('../care-board-core.js');
const K = require('../community-chat-core.js');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const NOW = new Date('2026-10-18T01:30:00+02:00').getTime();
const care = (full, pts) => ({ wk: 'care1:2026-10-12:' + full, xpw: pts, mo: 'care1:2026-10:' + full, xpm: pts });
/* test accounts (hidden) */
const TEST = [
  Object.assign({ n: 'Emma', uid: '0653ab46-7894-4b07-8601-86db5d2d2cc6', lv: 1 }, care(0, 9)),
  Object.assign({ n: 'Emma', uid: 'f78c98d9-f19c-42fb-bcfd-276f9020bf74', lv: 1 }, care(0, 8)),
  Object.assign({ n: 'Gatey', uid: '0767e8ef-17e3-43d7-8c5d-9c9207822b48', lv: 1 }, care(0, 7)),
  Object.assign({ n: 'Guesty', uid: '0161e683-5580-4a2b-aac7-2d56662db48a', lv: 1 }, care(0, 6)),
  Object.assign({ n: 'Test', uid: 'e3cce12d-b025-4385-89f7-704595a8c06c', lv: 1 }, care(0, 5)),
  Object.assign({ n: 'QA', uid: 'bb1788fa-a11e-4ee9-ac28-4beef63248ae', lv: 1 }, care(0, 4)),
  Object.assign({ n: 'eman', uid: 'ca2b5daf-5d17-4866-b7ca-33bbad10d5b2', lv: 4 }, care(6, 72)),
  Object.assign({ n: 'eman', uid: '01aa50e7-9078-4fda-97db-0accac597947', lv: 4 }, care(6, 72))
];
/* real people (kept) */
const REAL = [
  Object.assign({ n: 'Joseph Castellar', uid: '06f0a8ee-1ed1-4778-a9d4-0852594bd6ad', lv: 3 }, care(2, 30)),
  Object.assign({ n: 'Q', uid: 'f4f8fbf8-3a18-4317-96d3-9dd778066136', lv: 1 }, care(0, 5)),
  Object.assign({ n: 'Manuuii', uid: '4add63ec-61d6-4187-9c62-bd78c427be24', lv: 1 }, care(0, 7)),
  Object.assign({ n: 'Emmy', uid: 'd813675e-16b6-40e3-bedb-d6fe8b01af91', lv: 1 }, care(0, 3)),
  Object.assign({ n: 'Emmanuel', uid: 'e81217a0-6658-4c00-bce2-bfe56de897a5', lv: 1 }, care(0, 2))
];
const REAL_EMAN = '83077af7-8475-4628-9328-25bd335db240';
const BOTS = [{ n: 'Mateo', lv: 1, shownLv: 1, bot: true }, { n: 'Jonas', lv: 18, shownLv: 4, bot: true }, { n: 'Samir', lv: 43, shownLv: 6, bot: true }];
const HIDDEN_NAMES = ['Emma', 'Gatey', 'Guesty', 'Test', 'QA'];
const KEPT_NAMES = ['Joseph Castellar', 'Q', 'Manuuii', 'Emmy', 'Emmanuel', 'Mateo', 'Jonas', 'Samir'];

test('hidden list: every test account id is listed, no real person and not your own eman account', () => {
  for (const p of TEST) assert.ok(HA.isHidden(p), p.n + ' ' + p.uid + ' is hidden');
  for (const p of REAL) assert.ok(!HA.isHidden(p), p.n + ' stays');
  assert.ok(!HA.isHidden(REAL_EMAN), 'your real eman account stays');
  assert.ok(!HA.isHidden({ n: 'eman', uid: REAL_EMAN, me: true }));
  assert.equal(HA.IDS.length, 29 + 16 + 16 + 1 + 1 + 2);
  assert.equal(new Set(HA.IDS).size, HA.IDS.length, 'no id twice');
  for (const id of HA.IDS) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  assert.ok(Object.isFrozen(HA.IDS));
});

test('hidden list: matched by account id, never by name, so a real new "Emma" or "Test" still shows', () => {
  assert.ok(!HA.isHidden({ n: 'Emma', uid: '11111111-2222-4333-8444-555555555555' }));
  assert.ok(!HA.isHidden({ n: 'Test', uid: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' }));
  assert.ok(HA.isHidden({ n: 'Renamed', id: 'bb1788fa-a11e-4ee9-ac28-4beef63248ae' }), 'profiles row shape (id) works too');
  assert.ok(!HA.isHidden(null) && !HA.isHidden({}) && !HA.isHidden(''));
  assert.deepEqual(HA.visible([TEST[0], REAL[0]]), [REAL[0]]);
});

test('Care board roster leaves out the test accounts and keeps friends, bots and you', () => {
  const me = { n: 'eman', uid: REAL_EMAN, lv: 5, me: true };
  const r = C.roster(TEST.concat(REAL, BOTS, [me]));
  const names = r.map(p => p.n);
  for (const n of HIDDEN_NAMES) assert.ok(!names.includes(n), n + ' is off the board');
  for (const n of KEPT_NAMES) assert.equal(names.filter(x => x === n).length, 1, n + ' is on the board once');
  assert.ok(!r.some(p => HA.isHidden(p)), 'no hidden id left');
  const emans = r.filter(p => p.n.toLowerCase() === 'eman');
  assert.equal(emans.length, 1); assert.equal(emans[0].uid, REAL_EMAN);
  const ranked = C.rank(r, 'm', NOW, { w: { pts: 56, full: 4 }, m: { pts: 86, full: 6 } });
  assert.ok(!ranked.some(x => HIDDEN_NAMES.includes(x.p.n)), 'ranked month board has no test account');
  assert.ok(ranked.some(x => x.p.uid === REAL_EMAN), 'you are on the ranked month board');
  assert.ok(ranked.some(x => x.p.n === 'Joseph Castellar'), 'friends with sunbeams are on it');
});

test('Care board, seen by a friend: the two fake eman rows are gone and your real eman account is the one shown', () => {
  const friend = { n: 'Q', uid: 'f4f8fbf8-3a18-4317-96d3-9dd778066136', lv: 1, me: true };
  const realEman = Object.assign({ n: 'eman', uid: REAL_EMAN, lv: 5, xp: 2311 }, care(4, 56));
  const r = C.roster(TEST.concat([realEman, REAL[0]], BOTS, [friend]));
  const emans = r.filter(p => p.n.toLowerCase() === 'eman');
  assert.equal(emans.length, 1); assert.equal(emans[0].uid, REAL_EMAN);
});

/* Community galaxy: the real community-chat.js roster, run in a small fake page (same harness as community-chat-ui) */
function galaxy(people, messages) {
  const nodes = {}, events = {}, rafs = [], attrs = new Set(), classes = new Set(), storage = {}; let actor = '';
  function node(id) { return nodes[id] || (nodes[id] = { id, dataset: {}, style: { setProperty(k, v) { this[k] = v; } }, value: '', innerHTML: '', textContent: '', scrollTop: 0, scrollHeight: 500, clientHeight: 300, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, hasAttribute: k => attrs.has(k), addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getBoundingClientRect: () => ({ top: 180, height: 300 }), focus() {} }); }
  const el = node('cmPaneChat'); el.setAttribute = k => attrs.add(k); el.querySelector = s => node(s.startsWith('#') ? s.slice(1) : s); node('cmInput').closest = () => null;
  const doc = { hidden: false, activeElement: null, documentElement: { classList: { toggle(k, v) { if (v) classes.add(k); else classes.delete(k); }, contains: k => classes.has(k) } }, getElementById: id => id === 'cmPaneChat' ? el : id === 'tabbar' ? null : node(id), querySelector: () => null, createElement: () => node('new'), addEventListener: (e, f) => (events[e] = events[e] || []).push(f) };
  const host = { state: () => ({ uid: actor, chatRealtime: 'SUBSCRIBED' }), messages: () => messages, reactions: () => [], client: async () => ({ from() { const q = {}; for (const m of ['select', 'eq', 'order', 'limit', 'in', 'abortSignal']) q[m] = () => q; q.then = (a, b) => Promise.resolve({ data: [], error: null }).then(a, b); return q; } }), replace() {}, upsert() {}, remove() {}, setReactions() {}, people: () => people, identity: () => ({ n: 'eman' }), bubble: () => '', sheet() {}, active: () => true, install() {}, typeLabel: () => '', color: () => '#9fd8ff' };
  const win = { document: doc, LowiChatCore: K, LowiCommunityHost: host, innerWidth: 390, innerHeight: 844, visualViewport: { height: 844, offsetTop: 0, addEventListener() {} }, addEventListener() {} };
  const ctx = { ...win, window: win, document: doc, globalThis: win, localStorage: { getItem: k => storage[k] || null, setItem: (k, v) => storage[k] = String(v) }, navigator: { onLine: true }, crypto: require('node:crypto').webcrypto, AbortController, setTimeout, clearTimeout, setInterval() {}, requestAnimationFrame: f => { rafs.push(f); return rafs.length; }, console };
  vm.createContext(ctx);
  for (const f of ['hidden-accounts.js', 'community-galaxy.js', 'community-chat-cloud.js', 'community-chat.js']) vm.runInContext(R(f), ctx);
  const flush = () => { for (let n = 0; n < 8 && rafs.length; n++) rafs.splice(0).forEach(f => f()); };
  flush(); actor = REAL_EMAN; win.LowiCommunity.refresh(); flush();
  const html = nodes.cgField.innerHTML;
  return { html, names: [...html.matchAll(/<span class="cg-name">([^<]*)<\/span>/g)].map(m => m[1]) };
}

test('Community galaxy leaves out the test accounts, also when they posted in the chat, and keeps everyone else', () => {
  const now = Date.now();
  const msgs = [
    { id: 'm1', uid: 'bb1788fa-a11e-4ee9-ac28-4beef63248ae', by: 'QA', t: 'probe', ts: now - 5000 },
    { id: 'm2', uid: 'e3cce12d-b025-4385-89f7-704595a8c06c', by: 'Test', t: 'hi', ts: now - 4000 },
    { id: 'm3', uid: '06f0a8ee-1ed1-4778-a9d4-0852594bd6ad', by: 'Joseph Castellar', t: 'yo', ts: now - 3000 }
  ];
  const g = galaxy(TEST.concat(REAL), msgs);
  for (const n of HIDDEN_NAMES) assert.ok(!g.names.includes(n), n + ' has no bubble');
  for (const id of HA.IDS.slice(0, 3).concat(['bb1788fa-a11e-4ee9-ac28-4beef63248ae', 'e3cce12d-b025-4385-89f7-704595a8c06c'])) assert.ok(!g.html.includes('data-uid="' + id + '"'));
  for (const n of KEPT_NAMES) assert.equal(g.names.filter(x => x === n).length, 1, n + ' has one bubble');
  assert.ok(g.names.includes('You'));
});

test('wiring: hidden-accounts.js loads before Community and the Care board, and is cached for offline', () => {
  const h = R('index.html'), sw = R('sw.js');
  const tag = h.search(/<script src="hidden-accounts\.js\?v=[^"]+"><\/script>/);
  assert.ok(tag > 0, 'script tag present');
  assert.ok(tag < h.indexOf('<script src="community-chat.js'), 'before community-chat.js');
  assert.ok(tag < h.indexOf('<script src="care-board-core.js'), 'before care-board-core.js');
  assert.ok(sw.includes('"hidden-accounts.js"'));
});
