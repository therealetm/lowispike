'use strict';
/* Chat redesign + room switcher (24 Oct 2026, handoff: "Make Circle chats use the same clean chat presentation as the main
   chat, with a convenient room switcher"; WhatsApp-style reactions, one ··· menu, no confusing flower icon). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const S = require('../chat-switcher.js');
const C = require('../community-chat-core.js');
const ME = 'me-1', A = 'a-2';

test('reactions are the standard row; the old sprout and sparkle still count and can be taken back', () => {
  assert.deepStrictEqual(C.EMOJI, ['\u{1F44D}', '\u2764\uFE0F', '\u{1F602}', '\u{1F62E}', '\u{1F622}', '\u{1F64F}']);
  assert.ok(!C.EMOJI.includes('\u{1F331}'), 'no flower-looking sprout in the picker');
  assert.deepStrictEqual(C.ALL_EMOJI.slice(0, 6), C.EMOJI);
  for (const e of ['\u{1F44F}', '\u{1F331}', '\u2728']) assert.ok(C.ALL_EMOJI.includes(e), 'old reaction still shows ' + e);
  assert.match(R('community-chat-cloud.js'), /ALL_EMOJI\|\|root\.LowiChatCore\.EMOJI\)\.includes\(emoji\)/);
  assert.match(R('community-chat.js'), /const reacts=\(K\.ALL_EMOJI\|\|K\.EMOJI\)\.map/);
});

test('my circles: owner or member only, never a pending ask, newest activity first', () => {
  const rooms = [{ id: 'r1', owner_id: ME, name: 'Mine', created_at: '2026-10-20T10:00:00Z' }, { id: 'r2', owner_id: A, name: 'In', created_at: '2026-10-21T10:00:00Z' },
    { id: 'r3', owner_id: A, name: 'Asked', created_at: '2026-10-22T10:00:00Z' }, { id: 'r4', owner_id: A, name: 'Not mine', created_at: '2026-10-23T10:00:00Z' }];
  const members = [{ room_id: 'r2', user_id: ME, status: 'member' }, { room_id: 'r3', user_id: ME, status: 'pending' }, { room_id: 'r4', user_id: A, status: 'member' }];
  const L = S.mine(rooms, members, { r1: { ts: '2026-10-24T09:00:00Z', user_id: A } }, ME);
  assert.deepStrictEqual(L.map(c => c.name), ['Mine', 'In']);
  assert.deepStrictEqual(S.mine(rooms, members, {}, ME).map(c => c.name), ['In', 'Mine']);
  assert.deepStrictEqual(S.mine(rooms, members, {}, ''), []);
});

test('unread: only a message from someone else newer than what I saw', () => {
  const c = { id: 'r1', last: { ts: '2026-10-24T09:00:00Z', user_id: A } };
  assert.strictEqual(S.unread(c, {}, ME), true);
  assert.strictEqual(S.unread(c, { r1: Date.parse('2026-10-24T09:00:00Z') }, ME), false);
  assert.strictEqual(S.unread({ id: 'r1', last: { ts: '2026-10-24T09:00:00Z', user_id: ME } }, {}, ME), false, 'my own message is never new');
  assert.strictEqual(S.unread({ id: 'r1', last: null }, {}, ME), false);
});

test('the strip: Community first, my circles, then Circles; the open chat is marked, a dot for new messages', () => {
  const list = [{ id: 'r1', name: 'Typ 2 <b>', icon: '\u{1F319}', last: { ts: '2026-10-24T09:00:00Z', user_id: A } }, { id: 'r2', name: 'Run club', icon: '', last: null }];
  const h = S.strip(list, 'community', { me: ME, seen: {} });
  const keys = [...h.matchAll(/data-cs="([^"]+)"/g)].map(m => m[1]);
  assert.deepStrictEqual(keys, ['community', 'r1', 'r2', 'all']);
  assert.match(h, /data-cs="community" aria-current="page"/);
  assert.match(h, /Typ 2 &lt;b&gt;/, 'names are escaped');
  assert.strictEqual((h.match(/cs-dot/g) || []).length, 1);
  const inR1 = S.strip(list, 'r1', { me: ME, seen: {} });
  assert.match(inR1, /data-cs="r1" aria-current="page"/);
  assert.strictEqual((inR1.match(/cs-dot/g) || []).length, 0, 'the open circle never shows a dot');
  const reading = S.strip(list, 'r9', { me: ME, extra: { id: 'r9', name: 'Reading along', icon: '' } });
  assert.deepStrictEqual([...reading.matchAll(/data-cs="([^"]+)"/g)].map(m => m[1]), ['community', 'r9', 'r1', 'r2', 'all']);
  assert.match(h, /aria-label="Switch chat"/);
});

test('the strip texts exist in English, German and Spanish and never say room', () => {
  for (const k of Object.keys(S.T)) { assert.strictEqual(S.T[k].length, 3, k); for (const s of S.T[k]) { assert.ok(s.trim(), k); assert.doesNotMatch(s, /\b(Rooms?|Räume|Raum|Salas?)\b/i); } }
});

test('the community chat only gets the strip once I am in a circle; the page loads the files', () => {
  const src = R('chat-switcher.js');
  assert.match(src, /if\(!list\.length\)\{if\(s\)s\.remove\(\);th\.removeAttribute\('data-cs'\);return;\}/);
  assert.match(src, /\.eq\('owner_id',id\)/);
  assert.match(src, /\.eq\('user_id',id\)/);
  assert.doesNotMatch(src, /\.(insert|update|delete|upsert)\(/, 'the switcher only reads');
  const idx = R('index.html');
  assert.ok(idx.indexOf('src="chat-switcher.js?v=') > idx.indexOf('src="user-rooms.js?v='));
  assert.match(idx, /href="chat-switcher\.css\?v=/);
  assert.match(R('chat-switcher.css'), /#cgThread\[data-cs\]\{--cr-top:58px\}/);
});

function circleUI(rooms, members, msgs, reactions, uid) {
  const els = [];
  const mk = tag => { const e = { tagName: tag, children: [], style: { setProperty() {} }, classList: { add() {}, remove() {}, contains() { return false; } }, dataset: {}, attrs: {}, isConnected: false,
    setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(t, f) { (this.h || (this.h = {}))[t] = f; }, querySelector(sel) { return sel === '.ur-card' ? (this._card || (this._card = mk('div'))) : null; }, querySelectorAll() { return []; }, contains() { return false; },
    get innerHTML() { return this._h || ''; }, set innerHTML(v) { this._h = v; }, getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }, focus() {}, get offsetWidth() { return 1; } }; els.push(e); return e; };
  const D = { createElement: mk, body: { appendChild(e) { e.isConnected = true; } }, documentElement: { classList: { add() {}, remove() {} } }, addEventListener() {}, activeElement: null, hidden: false };
  const data = { user_rooms: rooms, user_room_members: members, messages: msgs, reactions, profiles: [] };
  const writes = [];
  const qb = (t) => { const b = { _t: t, _w: null, select() { return b; }, order() { return b; }, limit() { return b; }, eq() { return b; }, in() { return b; }, neq() { return b; }, match() { return b; }, single() { return b; },
    insert(r) { writes.push(['insert', t, r]); b._w = 1; return b; }, delete() { writes.push(['delete', t]); b._w = 1; return b; }, update(r) { writes.push(['update', t, r]); b._w = 1; return b; },
    then(ok) { ok({ data: b._w ? null : (t === 'messages' ? data.messages.slice().reverse() : data[t]), error: null }); } }; return b; };
  const client = { from: qb };
  const W = { LowiUserRoomsCore: require('../user-rooms-core.js'), LowiChatCore: C, localStorage: { getItem: () => null, setItem() {} }, setTimeout: () => 0, setInterval: () => 1, clearInterval() {}, confirm: () => false,
    LOWI_CLOUD_X: { state: () => ({ uid }), client: async () => client }, LowiCommunity: { face: () => '', colorOf: () => '#8fd0ff', blocked: id => id === 'blocked-9', openProfile() {} } };
  const ctx = vm.createContext({ window: W, document: D, localStorage: W.localStorage, setTimeout: W.setTimeout, setInterval: W.setInterval, clearInterval() {}, Promise, Date, Math, JSON, String });
  vm.runInContext(R('user-rooms.js'), ctx);
  return { W, els, writes, card: () => els[0]._card, el: () => els[0] };
}
const tick = () => new Promise(r => setTimeout(r, 20));

test('a circle reads like the community chat: bubbles, names, faces, time in the bubble, one ··· menu, reactions with counts', async () => {
  const rooms = [{ id: 'c1', owner_id: A, owner_name: 'Ana', name: 'Typ 2 gemeinsam', topic: 'Daily walks', icon: '\u{1F319}', created_at: '2026-10-20T10:00:00Z' }];
  const members = [{ room_id: 'c1', user_id: A, who: 'Ana', status: 'member' }, { room_id: 'c1', user_id: ME, who: 'Me', status: 'member' }, { room_id: 'c1', user_id: 'blocked-9', who: 'Spam', status: 'member' }];
  const t0 = Date.now() - 3600e3;
  const msgs = [{ id: 'm1', user_id: A, who: 'Ana', body: 'Hi all', created_at: new Date(t0).toISOString() }, { id: 'm2', user_id: A, who: 'Ana', body: 'Walk at 6?', created_at: new Date(t0 + 60e3).toISOString() },
    { id: 'm3', user_id: 'blocked-9', who: 'Spam', body: 'BUY NOW', created_at: new Date(t0 + 90e3).toISOString() }, { id: 'm4', user_id: ME, who: 'Me', body: 'Yes!', created_at: new Date(t0 + 120e3).toISOString() }];
  const reactions = [{ message_id: 'm2', user_id: ME, emoji: '\u{1F44D}' }, { message_id: 'm2', user_id: 'x', emoji: '\u{1F44D}' }, { message_id: 'm2', user_id: 'y', emoji: '\u{1F331}' }];
  const U = circleUI(rooms, members, msgs, reactions, ME);
  U.W.LowiUserRooms.open('c1');
  await tick(); await tick();
  const h = U.card().innerHTML;
  assert.match(h, /class="ur-msgs ur-thread"/);
  assert.match(h, /ur-day/, 'a day divider');
  assert.strictEqual((h.match(/class="ur-who"/g) || []).length, 1, 'Ana\'s name once for her run of two messages');
  assert.strictEqual((h.match(/class="ur-av" data-ur="who"/g) || []).length, 1, 'her face once, at the end of the run');
  assert.doesNotMatch(h, /BUY NOW/, 'blocked people stay hidden');
  assert.match(h, /class="ur-m ur-me ur-first ur-last" data-mid="m4"/);
  assert.match(h, /<time datetime=/);
  assert.match(h, /data-ur="rx" data-mid="m2" data-em="\u{1F44D}" aria-pressed="true">\u{1F44D}<b>2<\/b>/u);
  assert.match(h, /data-em="\u{1F331}" aria-pressed="false">\u{1F331}<b>1<\/b>/u, 'an old reaction still shows its count');
  assert.strictEqual((h.match(/data-ur="more"/g) || []).length, 3, 'one ··· per visible message');
  assert.doesNotMatch(h, /class="ur-menu"/, 'the menu stays closed until asked');
  assert.match(h, /class="cs-strip"|ur-chead/);
  assert.match(h, /data-ur="info" aria-expanded="false"/, 'a member does not get the info panel pushed open');
  assert.match(h, /class="ur-go ur-send" aria-label="Send"/);
  /* open the menu on Ana's message: the standard reactions, Copy, no Delete for someone else's message */
  const clickOn = async (attrs) => { const ds = Object.assign({}, attrs); const b = { dataset: ds, disabled: false }; await U.el().h.click({ target: { closest: () => b } }); };
  await clickOn({ ur: 'more', mid: 'm2' });
  const m = U.card().innerHTML;
  assert.match(m, /class="ur-menu" role="menu"/);
  assert.strictEqual((m.match(/class="ur-rxe/g) || []).length, 6);
  assert.match(m, /data-ur="copy"/);
  assert.doesNotMatch(m, /data-ur="delm"/);
  await clickOn({ ur: 'rx', mid: 'm2', em: '\u{1F602}' });
  assert.deepStrictEqual(U.writes.slice(-1)[0].slice(0, 2), ['insert', 'reactions']);
  assert.strictEqual(U.writes.slice(-1)[0][2].emoji, '\u{1F602}');
  assert.doesNotMatch(U.card().innerHTML, /class="ur-menu"/, 'picking a reaction closes the menu');
  await clickOn({ ur: 'rx', mid: 'm2', em: '\u{1F331}' });
  assert.notStrictEqual(U.writes.slice(-1)[0][2] && U.writes.slice(-1)[0][2].emoji, '\u{1F331}', 'nobody can add a new old-style reaction');
  await clickOn({ ur: 'more', mid: 'm4' });
  assert.match(U.card().innerHTML, /data-ur="delm" data-mid="m4"/, 'Delete for my own message');
  U.W.LowiUserRooms.close();
});

test('reading along: no composer, no reacting, Ask to join; the creator of a fresh circle sees its info open', async () => {
  const rooms = [{ id: 'c1', owner_id: A, owner_name: 'Ana', name: 'Run', topic: '', icon: '', created_at: '2026-10-20T10:00:00Z' }];
  const msgs = [{ id: 'm1', user_id: A, who: 'Ana', body: 'Hi', created_at: new Date().toISOString() }];
  const U = circleUI(rooms, [{ room_id: 'c1', user_id: A, who: 'Ana', status: 'member' }], msgs, [{ message_id: 'm1', user_id: A, emoji: '\u2764\uFE0F' }], ME);
  U.W.LowiUserRooms.open('c1'); await tick(); await tick();
  const h = U.card().innerHTML;
  assert.doesNotMatch(h, /data-ur-form="say"/);
  assert.match(h, /data-ur="ask"/);
  assert.match(h, /data-ur="rx"[^>]* disabled/, 'reaction chips are read-only for people reading along');
  U.W.LowiUserRooms.close();
  const V = circleUI([{ id: 'c2', owner_id: ME, owner_name: 'Me', name: 'New', topic: '', icon: '', created_at: '2026-10-24T10:00:00Z' }], [], [], [], ME);
  V.W.LowiUserRooms.open('c2'); await tick(); await tick();
  assert.match(V.card().innerHTML, /data-ur="info" aria-expanded="true"/);
  assert.match(V.card().innerHTML, /data-ur="add"/);
  V.W.LowiUserRooms.close();
});

test('light anti-spam on top of the server rule: 5 messages in 10 seconds, no same text twice within a minute', () => {
  const src = R('user-rooms.js');
  assert.match(src, /if\(tooFast\(body\)\)\{err='slow';paint\(\);return;\}/);
  assert.match(src, /sent\.filter\(x=>now-x\.t<10e3\)\.length>=5/);
  assert.match(src, /e_slow:\[/);
});
