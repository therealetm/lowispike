'use strict';
/* Oct 25, 2026 (Emmanuel: "remove the bots from the galaxy; every real companion stays parked there, even offline; energy can hit
   offline companions; iPad and iPhone must show the same spots, no snap-back"). Pure roster + label logic, the real Community page
   in a small fake window, and the energy wiring (energy_gifts / companion_rest). */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const G = require('../community-galaxy.js'), E = require('../community-energy.js'), K = require('../community-chat-core.js');

const U = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const PEOPLE = [
  { uid: U(1), n: 'Antje', lv: 3, xp: 400 },
  { uid: U(2), n: 'Christa', lv: 2, xp: 90 },
  { uid: U(3), n: 'Joseph', lv: 1, xp: 5 },
  { uid: U(4), n: 'Server Bot', lv: 9, bot: true },
  { uid: U(5), n: 'Probe', lv: 1, test: true },
  { uid: U(6), n: 'Hidden One', lv: 1 },
  { uid: U(7), n: 'Emmanuel', lv: 5, xp: 2000 },
  { uid: U(8), n: 'Emmanuel', lv: 5, xp: 10 },
  { uid: 'bot:mateo', n: 'Mateo', lv: 1 },
  { uid: U(9), n: '   ', lv: 1 }
];
const opts = extra => Object.assign({ isBot: u => u === U(4), isHidden: u => u === U(6) }, extra || {});

test('roomMembers: no bots (flag, server list, bot: id), no test or hidden accounts, no blank names; offline people stay', () => {
  const r = G.roomMembers(PEOPLE, opts());
  const names = r.shown.map(p => p.n).sort();
  assert.deepEqual(names, ['Antje', 'Christa', 'Emmanuel', 'Joseph']);
  assert.ok(r.shown.every(p => p.on === false), 'nobody is online, everyone is still parked in the room');
});

test('roomMembers: one body per name; the online account wins, otherwise level, xp, id; the same pick in any order', () => {
  const a = G.roomMembers(PEOPLE, opts()), b = G.roomMembers(PEOPLE.slice().reverse(), opts());
  assert.equal(a.shown.find(p => p.n === 'Emmanuel').uid, U(7), 'more xp wins while nobody is online');
  assert.deepEqual(a.shown.map(p => p.uid), b.shown.map(p => p.uid), 'same seats on every phone whatever order the list came in');
  const on = G.roomMembers(PEOPLE, opts({ online: u => u === U(8) }));
  const em = on.shown.find(p => p.n === 'Emmanuel');
  assert.equal(em.uid, U(8), 'the account that is online right now is the one shown');
  assert.equal(em.on, true, 'and it glows');
});

test('roomMembers: blocked people and your own other accounts leave your screen but keep their seat in the layout', () => {
  const me = { uid: U(8), n: 'Emmanuel' };
  const r = G.roomMembers(PEOPLE, opts({ me, blocked: u => u === U(2) }));
  assert.ok(!r.shown.some(p => p.uid === U(2)), 'blocked Christa is not on my screen');
  assert.ok(r.layout.some(p => p.uid === U(2)), 'but her seat still counts for the layout');
  assert.ok(!r.shown.some(p => !p.me && p.n === 'Emmanuel'), 'my other Emmanuel account is not drawn twice');
  assert.ok(r.shown.some(p => p.me && p.uid === U(8)), 'I am in the room');
  const L1 = G.mapLayout(r.layout.filter(p => !p.me), U(8)), r2 = G.roomMembers(PEOPLE, opts({ me })), L2 = G.mapLayout(r2.layout.filter(p => !p.me), U(8));
  const seat = (L, u) => { const s = L.spots.find(x => x.uid === u); return s && [s.x, s.y].join(','); };
  assert.equal(seat(L1, U(1)), seat(L2, U(1)), 'blocking someone does not move anybody else');
});

test('labels: a name with no room below goes above its orb, then to its first letter, so no companion is left nameless', () => {
  const it = (id, x, y, pr) => ({ id, x, y, s: 40, nw: 70, bw: 120, bh: 30, pr: pr || 0 });
  /* B sits right under A: A\'s name below would cover B, so it moves above A */
  const a = it('A', 200, 200, 2), b = it('B', 200, 262, 1);
  const L = G.mapLabels([a, b], { w: 400, h: 600 });
  const ra = L.get('A'), rb = L.get('B');
  assert.ok(ra && rb);
  assert.ok(ra.at === 'b' || ra.at === 't' || ra.at === 'i', 'A keeps a name: ' + ra.at);
  assert.ok(rb.at === 'b' || rb.at === 't' || rb.at === 'i', 'B keeps a name: ' + rb.at);
  const lone = G.mapLabels([it('C', 200, 200)], { w: 400, h: 600 }).get('C');
  assert.equal(lone.at, 'b'); assert.equal(lone.name, true);
  const css = R('community-galaxy.css'), chat = R('community-chat.js');
  assert.match(css, /\.cg-body\.cg-nt \.cg-name\.cg-name\{position:absolute;left:50%;bottom:calc\(100% \+ 3px\)/);
  assert.match(css, /\.cg-body\.cg-ni \.cg-ini\{display:block/);
  assert.match(chat, /el\.classList\.toggle\('cg-nt',r\.at==='t'\);el\.classList\.toggle\('cg-ni',r\.at==='i'\);/);
});

/* the real community-chat.js in a small fake page (same harness as hidden-accounts.test.cjs) */
function page(people, messages, me) {
  const nodes = {}, rafs = [], attrs = new Set(), classes = new Set(), storage = {}; let actor = '';
  function node(id) { return nodes[id] || (nodes[id] = { id, dataset: {}, style: { setProperty(k, v) { this[k] = v; } }, value: '', innerHTML: '', textContent: '', scrollTop: 0, scrollHeight: 500, clientHeight: 300, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, hasAttribute: k => attrs.has(k), addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getBoundingClientRect: () => ({ top: 180, height: 300 }), focus() {} }); }
  const el = node('cmPaneChat'); el.setAttribute = k => attrs.add(k); el.querySelector = s => node(s.startsWith('#') ? s.slice(1) : s); node('cmInput').closest = () => null;
  const doc = { hidden: false, activeElement: null, documentElement: { classList: { toggle(k, v) { if (v) classes.add(k); else classes.delete(k); }, contains: k => classes.has(k) } }, getElementById: id => id === 'cmPaneChat' ? el : id === 'tabbar' ? null : node(id), querySelector: () => null, createElement: () => node('new'), addEventListener() {} };
  const host = { state: () => ({ uid: actor, chatRealtime: 'SUBSCRIBED' }), messages: () => messages, reactions: () => [], client: async () => ({ from() { const q = {}; for (const m of ['select', 'eq', 'order', 'limit', 'in', 'abortSignal']) q[m] = () => q; q.then = (a, b) => Promise.resolve({ data: [], error: null }).then(a, b); return q; } }), replace() {}, upsert() {}, remove() {}, setReactions() {}, people: () => people, identity: () => ({ n: me.n }), bubble: () => '', sheet() {}, active: () => true, install() {}, typeLabel: () => '', color: () => '#9fd8ff' };
  const win = { document: doc, LowiChatCore: K, LowiCommunityHost: host, innerWidth: 390, innerHeight: 844, visualViewport: { height: 844, offsetTop: 0, addEventListener() {} }, addEventListener() {} };
  const ctx = { ...win, window: win, document: doc, globalThis: win, localStorage: { getItem: k => storage[k] || null, setItem: (k, v) => storage[k] = String(v) }, navigator: { onLine: true }, crypto: require('node:crypto').webcrypto, AbortController, setTimeout, clearTimeout, setInterval() {}, requestAnimationFrame: f => { rafs.push(f); return rafs.length; }, console };
  vm.createContext(ctx);
  for (const f of ['hidden-accounts.js', 'community-galaxy.js', 'community-chat-cloud.js', 'community-chat.js']) vm.runInContext(R(f), ctx);
  const flush = () => { for (let n = 0; n < 8 && rafs.length; n++) rafs.splice(0).forEach(f => f()); };
  flush(); actor = me.uid; win.LowiCommunity.refresh(); flush();
  return nodes.cgField.innerHTML;
}
const body = (html, uid) => { const m = html.match(new RegExp('<button[^>]*class="(cg-body[^"]*)"[^>]*data-uid="' + uid + '"')) || html.match(new RegExp('class="(cg-body[^"]*)"[^>]*data-uid="' + uid + '"')); return m ? m[1] : null; };

test('Room galaxy: every real person is a body, offline ones dim (cg-away), someone who just wrote glows (cg-live), no bots at all', () => {
  const now = Date.now();
  const people = [{ uid: U(1), n: 'Antje', lv: 3 }, { uid: U(2), n: 'Christa', lv: 2 }, { uid: U(3), n: 'Joseph', lv: 1 }, { uid: U(4), n: 'Server Bot', lv: 9, bot: true }, { uid: U(5), n: 'Probe', lv: 1, test: true }, { uid: 'b0f67f50-1fac-4bf0-b874-f19d3856ea72', n: 'One Chat Test', lv: 1 }, { uid: U(7), n: 'eman', lv: 5 }];
  const html = page(people, [{ id: 'm1', uid: U(1), by: 'Antje', t: 'hallo', ts: now - 60e3 }], { uid: U(7), n: 'eman' });
  assert.match(body(html, U(1)) || '', /cg-live/, 'Antje wrote a minute ago: she glows');
  assert.match(body(html, U(2)) || '', /cg-away/, 'Christa is offline but parked in the room');
  assert.match(body(html, U(3)) || '', /cg-away/, 'Joseph is offline but parked in the room');
  assert.equal(body(html, U(4)), null, 'a server-flagged bot has no body');
  assert.equal(body(html, U(5)), null, 'a test account has no body');
  assert.equal(body(html, 'b0f67f50-1fac-4bf0-b874-f19d3856ea72'), null, 'One Chat Test is hidden');
  assert.doesNotMatch(html, /data-uid="bot:/, 'no made-up bot');
  assert.doesNotMatch(html, / - bot</, 'no "- bot" label');
  assert.match(html, /cg-body me/);
});

test('energy: a landed hit on a real person writes one energy_gifts row (to_online too) and calls LisPush.energySent when it exists', () => {
  const js = R('community-energy.js');
  assert.match(js, /if\(r==='sent'\)\{store\(notePing\(st,uid,Date\.now\(\)\)\);if\(live\)live\.textContent=tr\('sent',n\);gift\(uid\);\}/);
  assert.match(js, /sb\.from\('energy_gifts'\)\.insert\(\{to_id:uid,to_online:on\}\)/);
  assert.match(js, /function gift\(uid\)\{if\(!realUid\(uid\)\)return;/, 'never for a made-up bot id');
  assert.match(js, /P\.energySent\(uid,/);
  assert.doesNotMatch(js, /isOnline\(uid\)\)return|if\(!on\)return/, 'offline companions are not skipped');
});

test('energy: the shooter writes where every moved companion stopped to companion_rest; every phone reads it on open, wake and reconnect', () => {
  const js = R('community-energy.js');
  assert.match(js, /function fireAt\(ang,power\)\{[^\n]*sendSt=b\.st;if\(!b\.ok\)return;restMark\(\);/, 'a snapshot before my own shot only');
  assert.match(js, /if\(was&&!nowBusy\)restFlush\(\);/, 'written once when the play settles');
  assert.match(js, /from\('companion_rest'\)\.upsert\(rows\.slice\(0,40\),\{onConflict:'user_id'\}\)/);
  assert.match(js, /from\('companion_rest'\)\.select\('user_id,rx,ry,updated_at'\)/);
  assert.match(js, /visibilitychange',\(\)=>\{if\(D\.visibilityState==='visible'\)restLoad\(\);\}\)/);
  assert.match(js, /W\.addEventListener\('online',\(\)=>restLoad\(true\)\)/);
  assert.match(js, /d\.type==='ready'\|\|d\.type==='reconnect'/);
  assert.match(js, /function mount\(g\)\{[^\n]*gal=g;restLoad\(\);/);
  assert.doesNotMatch(js.slice(js.indexOf('function remote('), js.indexOf('function remote(') + 1500), /restMark|restFlush/, 'a shot from someone else writes nothing');
});

test('companion_rest is device independent: a spot knocked on the iPhone, written in room coordinates, lands at the same map spot on the iPad', () => {
  /* iPhone (A at the centre) and iPad (B at the centre) see different screen layouts of the same room */
  const viewA = () => [{ uid: 'A', me: true, x: 0, y: 0, r: 27 }, { uid: 'B', x: -240, y: 120, r: 23 }, { uid: 'C', x: 300, y: 0, r: 23 }];
  const viewB = () => [{ uid: 'B', me: true, x: 0, y: 0, r: 27 }, { uid: 'A', x: 240, y: -120, r: 23 }, { uid: 'C', x: 540, y: -120, r: 23 }];
  const a = E.table(); a.sync(viewA(), 900, { x: 0, y: 0 });
  a.fire({ x: 0, y: 0, uid: 'A' }, 0, 1, 24); for (let i = 0; i < 1200; i++) a.step(1 / 60);
  assert.equal(a.busy(), false); const rest = a.room('C'); assert.ok(rest && (rest.x !== 300 || rest.y !== 0), 'C was knocked on the iPhone');
  const b = E.table(); b.sync(viewB(), 900, { x: 240, y: -120 });
  b.restore({ C: [rest.x, rest.y] });
  assert.deepEqual(b.room('C'), rest, 'same room spot on the iPad');
  const pa = a.pos('C'), pb = b.pos('C');
  assert.ok(Math.abs((pa.x - 0) - (pb.x - 240)) < 2 && Math.abs((pa.y - 0) - (pb.y + 120)) < 2, 'same place relative to the room on both screens: no snap-back');
});

test('wiring: profiles come with the bot and test flags, so a bot never flashes into the galaxy before the server list loads', () => {
  const h = R('index.html');
  assert.match(h, /select\("id,name,sign,mbti,lv,streak,bio,avatar,bday,xp,xp_week,wk,xp_month,mo,weight,bot,test,joined_at"\)/); /* Oct 25: + joined_at for the rows */
  assert.match(h, /bot:!!r\.bot, test:!!r\.test, j: Date\.parse\(r\.joined_at\) \|\| 0\}; \}/); /* Oct 25: + the join time */
});

test('SQL proposal for energy_gifts and companion_rest is kept with its spam limits', () => {
  const sql = R('supabase/proposals/energy_offline_20261025.sql');
  assert.match(sql, /create table if not exists public\.energy_gifts/i);
  assert.match(sql, /create table if not exists public\.companion_rest/i);
  assert.match(sql, /5 minutes|interval '5 min/i);
});
