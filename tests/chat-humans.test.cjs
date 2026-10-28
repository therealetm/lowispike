'use strict';
/* 28 Oct 2026, Emmanuel: "die Bot Sachen, die im Chat kommen, nur auf der For You Page leben ... Chat einfach wirklich nur fuer
   Menschen ... nuken wir mal alle Nachrichten von Bot im Chat ... lassen aber alles auf der For You Page."
   Bots leave the Community chat (by Nibblo's id and the server's bot flag, never by name), people stay, For You keeps every bot post. */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const K = require('../community-chat-core.js');

const NIBBLO = '59bb3615-b344-4c45-ab0f-0a5de5cd8df3';
const CROWD = 'c0000001-0000-4000-8000-000000000001';      /* a crowd member: profiles.bot = true on the server */
const TESTER = 'bb1788fa-a11e-4ee9-ac28-4beef63248ae';     /* a test account (profiles.test): not a bot */
const EMAN = '06f0a8ee-1ed1-4778-a9d4-0852594bd6ad';
const FAKE_NIBBLO = 'aaaaaaaa-1111-4222-8333-444444444444';  /* a real person who calls themselves Nibblo */

/* the real chat-humans-core.js and bot-accounts.js in a fresh window */
function core(flagged) {
  const storage = {};
  const win = { localStorage: { getItem: k => storage[k] || null, setItem: (k, v) => storage[k] = String(v), removeItem: k => delete storage[k] }, dispatchEvent() {}, CustomEvent: function (n) { this.type = n; } };
  win.window = win; win.globalThis = win;
  const ctx = vm.createContext(win);
  vm.runInContext(R('bot-accounts.js'), ctx); vm.runInContext(R('chat-humans-core.js'), ctx);
  if (flagged) win.LowiBotAccounts.set(flagged, [TESTER]);
  return win;
}

test('core: Nibblo by its id and server-flagged bots leave; people, test accounts and a person named Nibblo stay', () => {
  const w = core([CROWD]), H = w.LowiChatHumans;
  const rows = [
    { id: 'a', user_id: NIBBLO, who: 'Nibblo', body: 'Fruehstueck' },
    { id: 'b', user_id: CROWD, who: 'Lena', body: 'hi' },
    { id: 'c', user_id: EMAN, who: 'Emmanuel', body: 'moin' },
    { id: 'd', user_id: FAKE_NIBBLO, who: 'Nibblo', body: 'ich bin ein Bot lol' },
    { id: 'e', user_id: TESTER, who: 'QA', body: 'probe' }
  ];
  assert.deepEqual(Array.from(H.keep(rows), r => r.id), ['c', 'd', 'e']);
  /* mapped chat messages use uid instead of user_id */
  assert.deepEqual(Array.from(H.keep([{ id: 1, uid: NIBBLO }, { id: 2, uid: EMAN }, { id: 3, uid: CROWD }]), m => m.id), [2]);
  assert.deepEqual(Array.from(H.keepRx([{ message_id: 'c', user_id: CROWD, emoji: 'x' }, { message_id: 'c', user_id: EMAN, emoji: 'y' }, { message_id: 'c', user_id: NIBBLO, emoji: 'z' }]), r => r.emoji), ['y']);
  assert.equal(H.isBotAuthor('me'), false); assert.equal(H.isBotAuthor(''), false); assert.equal(H.isBotAuthor(null), false);
  assert.equal(w.LowiBotAccounts.isFlagged(TESTER), false, 'a test account is not a flagged bot');
  assert.equal(w.LowiBotAccounts.isBot(TESTER), true, 'bot-accounts.js keeps its own wider meaning elsewhere; the chat asks only for the server flag');
});

test('core: Nibblo leaves even before the bot list arrived; learn() takes the bot flag from the chat\'s own profiles rows', () => {
  const w = core(null), H = w.LowiChatHumans;
  assert.equal(H.isBotAuthor(NIBBLO), true);
  assert.equal(H.isBotAuthor(CROWD), false);
  assert.equal(H.learn([{ id: CROWD, bot: true }, { id: EMAN, bot: false }, { id: TESTER, test: true }]), 1);
  assert.equal(H.isBotAuthor(CROWD), true); assert.equal(H.isBotAuthor(EMAN), false); assert.equal(H.isBotAuthor(TESTER), false);
});

test('core: the server filter lists only uuids, Nibblo first, and stays short', () => {
  const many = Array.from({ length: 300 }, (_, i) => 'c0000001-0000-4000-8000-' + String(i).padStart(12, '0'));
  const w = core(many.concat(['not-a-uuid\'),or(1.eq.1']));
  const ids = w.LowiChatHumans.excludeIds(120);
  assert.equal(ids[0], NIBBLO); assert.equal(ids.length, 120);
  assert.ok(ids.every(s => /^[0-9a-f-]{36}$/.test(s)));
  assert.match(w.LowiChatHumans.notIn(3), /^\([0-9a-f-]{36}(,[0-9a-f-]{36}){2}\)$/);
  /* bots beyond the cap are still left out on the phone */
  assert.equal(w.LowiChatHumans.isBotAuthor(many[299]), true);
});

/* community-chat-cloud.js reload against a fake server that records the query and (worst case) ignores the filter */
function cloudWith(win, rows, rx) {
  const ctx = vm.createContext(Object.assign(win, { console, setTimeout, clearTimeout, AbortController }));
  vm.runInContext(R('community-chat-cloud.js').replace("if(typeof module==='object'&&module.exports)", 'if(false)'), ctx);
  const calls = [], out = {};
  const client = { from(t) { const q = { t, f: [] }; for (const m of ['select', 'eq', 'order', 'limit', 'in', 'like', 'abortSignal']) q[m] = (...a) => { q.f.push([m, ...a]); return q; }; q.not = (...a) => { q.f.push(['not', ...a]); return q; }; calls.push(q); q.then = (a, b) => Promise.resolve({ data: t === 'messages' ? (q.f.some(x => x[0] === 'like') ? [] : rows) : rx, error: null }).then(a, b); return q; } };
  const host = { state: () => ({ uid: EMAN }), messages: () => [], reactions: () => [], client: async () => client, replace(m, r) { out.messages = m; out.reactions = r; } };
  return { cloud: win.LowiCommunityCloud.create(host, () => {}), calls, out };
}

test('chat load: the server is asked for people only, and a bot row that still arrives never reaches the chat; replies and counts stay right', async () => {
  const w = core([CROWD]);
  const now = Date.now(), iso = s => new Date(now - s * 1000).toISOString();
  const rows = [
    { id: 'h2', user_id: EMAN, who: 'Emmanuel', body: 'sieht lecker aus', reply_to: 'n1', created_at: iso(10) },
    { id: 'c1', user_id: CROWD, who: 'Lena', body: 'yay', created_at: iso(20) },
    { id: 'n1', user_id: NIBBLO, who: 'Nibblo', body: 'Mittag: Bowl', created_at: iso(30) },
    { id: 'h1', user_id: FAKE_NIBBLO, who: 'Nibblo', body: 'hallo', created_at: iso(40) }
  ];
  const rx = [{ message_id: 'h2', user_id: CROWD, who: 'Lena', emoji: '\u2764\ufe0f' }, { message_id: 'h2', user_id: FAKE_NIBBLO, who: 'Nibblo', emoji: '\ud83d\udd25' }, { message_id: 'n1', user_id: EMAN, who: 'Emmanuel', emoji: '\ud83d\udc4d' }];
  const { cloud, calls, out } = cloudWith(w, rows, rx);
  assert.equal(await cloud.reload(), true);
  const main = calls.find(q => q.t === 'messages' && !q.f.some(x => x[0] === 'like'));
  const not = main.f.find(x => x[0] === 'not');
  assert.ok(not && not[1] === 'user_id' && not[2] === 'in', 'the 300-message window is asked without bot authors');
  assert.ok(not[3].includes(NIBBLO) && not[3].includes(CROWD) && !not[3].includes(EMAN) && !not[3].includes(FAKE_NIBBLO));
  assert.deepEqual(Array.from(out.messages, m => m.id), ['h1', 'h2'], 'only people, oldest first');
  assert.equal(out.messages.find(m => m.id === 'h2').re, 'n1', 'a person\'s reply to a bot message stays a reply');
  assert.deepEqual(Array.from(out.reactions, r => r.user_id).sort(), [EMAN, FAKE_NIBBLO].sort(), 'bot reactions are gone, people\'s stay');
  const h2 = out.messages.find(m => m.id === 'h2');
  assert.ok(!JSON.stringify(h2.rx || {}).includes('Lena'), 'the reaction count under a message counts people only');
});

/* the real community-chat.js room, in the same small fake page as community-chat-ui.test.cjs */
function room(messages, flagged) {
  const nodes = {}, events = {}, rafs = [], attrs = new Set(), classes = new Set(), storage = {}; let actor = '';
  function node(id) { return nodes[id] || (nodes[id] = { id, dataset: {}, style: { setProperty(k, v) { this[k] = v; } }, value: '', innerHTML: '', textContent: '', scrollTop: 0, scrollHeight: 500, clientHeight: 300, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, hasAttribute: k => attrs.has(k), addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getBoundingClientRect: () => ({ top: 180, height: 300 }), focus() {} }); }
  const el = node('cmPaneChat'); el.setAttribute = k => attrs.add(k); el.querySelector = s => node(s.startsWith('#') ? s.slice(1) : s); node('cmInput').closest = () => null;
  const doc = { hidden: false, activeElement: null, documentElement: { classList: { toggle(k, v) { if (v) classes.add(k); else classes.delete(k); }, contains: k => classes.has(k) } }, getElementById: id => id === 'cmPaneChat' ? el : id === 'tabbar' ? null : node(id), querySelector: () => null, createElement: () => node('new'), addEventListener: (e, f) => (events[e] = events[e] || []).push(f) };
  const host = { state: () => ({ uid: actor, chatRealtime: 'SUBSCRIBED' }), messages: () => messages, reactions: () => [], client: async () => ({ from() { const q = {}; for (const m of ['select', 'eq', 'order', 'limit', 'in', 'like', 'not', 'abortSignal']) q[m] = () => q; q.then = (a, b) => Promise.resolve({ data: [], error: null }).then(a, b); return q; } }), replace() {}, upsert() {}, remove() {}, setReactions() {}, people: () => [], identity: () => ({ n: 'Emmanuel' }), bubble: () => '', sheet() {}, active: () => true, install() {}, typeLabel: () => '', color: () => '#9fd8ff' };
  const win = { document: doc, LowiChatCore: K, LowiCommunityHost: host, innerWidth: 390, innerHeight: 844, visualViewport: { height: 844, offsetTop: 0, addEventListener() {} }, addEventListener() {}, dispatchEvent() {}, CustomEvent: function () {} };
  const ctx = { ...win, window: win, document: doc, globalThis: win, localStorage: { getItem: k => storage[k] || null, setItem: (k, v) => storage[k] = String(v), removeItem: k => delete storage[k] }, navigator: { onLine: true }, crypto: require('node:crypto').webcrypto, AbortController, setTimeout, clearTimeout, setInterval() {}, requestAnimationFrame: f => { rafs.push(f); return rafs.length; }, console };
  vm.createContext(ctx);
  for (const f of ['bot-accounts.js', 'chat-humans-core.js', 'community-galaxy.js', 'community-chat-cloud.js', 'community-chat.js']) vm.runInContext(R(f), ctx);
  if (flagged) win.LowiBotAccounts.set(flagged, []);
  /* an old chat with a made-up galaxy companion, still on this phone */
  storage['lowi.galaxy.botchat.v1'] = JSON.stringify({ 'bot:mateo': [{ id: 'g1', me: false, t: 'Mateo hier, alte Galaxie', ts: Date.now() - 2000 }] });
  const flush = () => { for (let n = 0; n < 8 && rafs.length; n++) rafs.splice(0).forEach(f => f()); };
  flush(); actor = EMAN; win.LowiCommunity.refresh(); flush();
  return Object.values(nodes).map(n => n.innerHTML).join('\n');
}

test('chat room: no bot line is drawn, even one already on the phone; the person who calls themselves Nibblo and a reply to a bot stay', () => {
  const now = Date.now();
  const html = room([
    { id: 'n1', uid: NIBBLO, by: 'Nibblo', t: 'Mittag: Brokkoli-Bowl', ts: now - 9000 },
    { id: 'c1', uid: CROWD, by: 'Lena', t: 'Crowd sagt hallo', ts: now - 8000 },
    { id: 'h1', uid: FAKE_NIBBLO, by: 'Nibblo', t: 'Ich bin ein Mensch', ts: now - 7000 },
    { id: 'h2', uid: EMAN, by: 'Emmanuel', t: 'Sieht lecker aus', ts: now - 6000 }
  ], [CROWD]);
  assert.doesNotMatch(html, /id="cm-n1"/, 'Nibblo\'s chat post is not shown');
  assert.doesNotMatch(html, /id="cm-c1"|Crowd sagt hallo/, 'a flagged bot\'s message is not shown');
  assert.doesNotMatch(html, /alte Galaxie/, 'an old galaxy companion line is not mixed into the room');
  assert.match(html, /id="cm-h1"[\s\S]*Ich bin ein Mensch/, 'a person named Nibblo stays');
  assert.match(html, /id="cm-h2"[\s\S]*Sieht lecker aus/);
});

test('chat room: a person\'s reply to a bot message stays; the quote reads like any reply whose original is gone', () => {
  const now = Date.now();
  /* the store (index.html) never holds the bot message, so the room only sees the reply */
  const html = room([{ id: 'h2', uid: EMAN, by: 'Emmanuel', t: 'Sieht lecker aus', re: 'n1', ts: now - 6000 }], []);
  assert.match(html, /id="cm-h2"[\s\S]*Message unavailable[\s\S]*Sieht lecker aus/);
  assert.doesNotMatch(html, /Brokkoli/);
});

test('wiring: index.html keeps bots out at every door of the chat store (first load, realtime, reactions, cache, reload)', () => {
  const h = R('index.html');
  assert.match(h, /sb\.from\("messages"\)\.select\("id,user_id,who,body,reply_to,created_at,room,meal"\)\.eq\("room", ROOM\(\)\)\.not\("user_id", "in", chatHumansNot\(\)\)/);
  assert.match(h, /LowiChatHumans\.learn\(q\[4\]\.data/);
  assert.match(h, /q\[3\]\.data\.filter\(r => !chatBot\(r\)\)/);
  assert.match(h, /q\[2\]\.data\.filter\(r => !chatBot\(r\)\)/);
  assert.match(h, /function onMsg\(r\)\{ if \(!r \|\| !r\.id \|\| \(r\.room \|\| "all"\) !== ROOM\(\) \|\| chatBot\(r\)\) return;/);
  assert.match(h, /function onRx\(p\)\{[^\n]*chatBot\(r\)\) return;/);
  assert.match(h, /replace\(messages, reactions\)\{ MSGS\.splice\(0, MSGS\.length, \.\.\.messages\.filter\(m => !chatBot\(m\)\)\)/);
  assert.match(h, /upsert\(m\)\{ if \(chatBot\(m\)\) return;/);
  assert.match(h, /setReactions\(rows\)\{ RX = \{\}; rows\.filter\(r => !chatBot\(r\)\)/);
  assert.match(h, /CM\.msgs\.all = CM\.msgs\.all\.filter\([^\n]*window\.lowiChatBot\(m\)/);
  assert.match(h, /addEventListener\("lowi-bots", \(\) => \{ try \{ chatPurge\(\); \}/, 'when the bot list arrives later, bots already shown leave');
  const a = h.search(/<script src="bot-accounts\.js\?v=[^"]+"><\/script>/), b = h.search(/<script src="chat-humans-core\.js\?v=[^"]+"><\/script>/);
  assert.ok(a > 0 && b > a, 'chat-humans-core.js loads right after bot-accounts.js');
  assert.match(R('sw.js'), /"chat-humans-core\.js"/, 'cached for offline');
});

test('For You keeps the bot posts: Nibblo and the daily swap are not filtered there', () => {
  const fy = R('foryou-core.js') + R('foryou.js');
  assert.doesNotMatch(fy, /LowiChatHumans/);
  /* the For You load in index.html has no people-only filter */
  const h = R('index.html');
  const posts = h.match(/sb\.from\("posts"\)[^\n]{0,200}/g) || [];
  assert.ok(posts.length > 0);
  for (const p of posts) assert.doesNotMatch(p, /chatHumansNot|not\("user_id"/);
});

test('the crowd tool never writes into the chat again (no line, no photo, no reaction); its For You side stays', () => {
  const c = R('tools/community-crowd/crowd.cjs');
  assert.match(c, /const CHAT_HUMANS_ONLY = true;/);
  assert.match(c, /async function say\(st, p, body, reply\) \{\n  if \(CHAT_HUMANS_ONLY\) return null;/);
  assert.match(c, /async function chatPhoto\(st, p\) \{\n  if \(CHAT_HUMANS_ONLY\) return null;/);
  assert.match(c, /k < Math\.min\(n\.chat, 12\) && !CHAT_HUMANS_ONLY/);
  assert.match(c, /n\.react, 10\) && recent\.length && !CHAT_HUMANS_ONLY/);
  assert.match(c, /async function mealPost\(st, p\) \{\n  const tok/, 'meal posts for For You are untouched');
});
