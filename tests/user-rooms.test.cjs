/* Rooms people create (OWNER-REQUESTS 6, Emmanuel 23 Oct 2026): public, join by request, only the creator lets people in, max 30.
   Core rules, the server SQL that enforces them, the menu entry, the page wiring and the three languages. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const K = require('../user-rooms-core.js');
const A = 'aaaaaaaa-0000-4000-8000-000000000001', B = 'bbbbbbbb-0000-4000-8000-000000000002', C = 'cccccccc-0000-4000-8000-000000000003';
const room = (id, owner, extra) => Object.assign({ id, owner_id: owner, owner_name: 'Owner', name: 'Room ' + id.slice(0, 4), topic: '', icon: K.ICONS[1], created_at: '2026-10-23T10:00:00Z' }, extra || {});
const mem = (rid, uid, status) => ({ room_id: rid, user_id: uid, who: 'U' + uid.slice(0, 2), status, created_at: '2026-10-23T10:00:00Z' });

test('a room name needs 2 to 40 characters, spaces squashed', () => {
  assert.strictEqual(K.cleanName('  Type 2   together '), 'Type 2 together');
  assert.strictEqual(K.cleanName('a'), '');
  assert.strictEqual(K.cleanName('x'.repeat(41)), '');
  assert.strictEqual(K.cleanName('x'.repeat(40)).length, 40);
  assert.strictEqual(K.cleanTopic('y'.repeat(300)).length, 140);
  assert.strictEqual(K.cleanBody('   '), '');
  assert.strictEqual(K.icon('nope'), K.ICONS[0]);
});

test('room messages use their own channel, never a galaxy room', () => {
  const id = '12345678-1234-4123-8123-123456789abc';
  assert.strictEqual(K.chan(id), 'u:' + id);
  assert.ok(K.isChan(K.chan(id)));
  for (const g of ['all', 'r2', 'r17']) assert.ok(!K.isChan(g));
});

test('your place: owner, member, asked, none; only owner and members write', () => {
  const r = room(A, A);
  const ms = [mem(A, A, 'member'), mem(A, B, 'pending')];
  assert.strictEqual(K.status(r, ms, A), 'owner');
  assert.strictEqual(K.status(r, ms, B), 'pending');
  assert.strictEqual(K.status(r, ms, C), 'none');
  assert.strictEqual(K.status(r, [mem(A, C, 'member')], C), 'member');
  assert.ok(K.canWrite('owner') && K.canWrite('member') && !K.canWrite('pending') && !K.canWrite('none'));
  assert.strictEqual(K.action('none', false), 'ask');
  assert.strictEqual(K.action('none', true), 'full');
  assert.strictEqual(K.action('pending', false), 'asked');
  assert.strictEqual(K.action('member', true), 'write');
});

test('list: yours and joined first, then the fullest; asks never count as members', () => {
  const r1 = room(A, C), r2 = room(B, C), r3 = room(C, A);
  const ms = [mem(A, C, 'member'), mem(A, B, 'member'), mem(A, A, 'pending'), mem(B, C, 'member'), mem(C, A, 'member')];
  const L = K.list([r1, r2, r3], ms, A);
  assert.deepStrictEqual(L.map(x => x.status), ['owner', 'pending', 'none']);
  assert.strictEqual(L[1].count, 2);
  assert.strictEqual(L[1].pending, 1);
});

test('30 members is full; only the creator sees the asks', () => {
  const r = room(A, A);
  const ms = [mem(A, A, 'member')];
  for (let i = 0; i < 29; i++) ms.push(mem(A, 'dddddddd-0000-4000-8000-' + String(i).padStart(12, '0'), 'member'));
  ms.push(mem(A, B, 'pending'));
  const own = K.inside(r, ms, A), other = K.inside(r, ms, C);
  assert.strictEqual(own.count, 30);
  assert.ok(own.full);
  assert.strictEqual(own.asks.length, 1);
  assert.strictEqual(other.asks.length, 0);
  assert.strictEqual(own.people[0].user_id, A, 'creator first');
  assert.ok(K.list([r], ms, C)[0].full);
});

test('up to 5 own rooms; server answers become short reasons', () => {
  const rs = [1, 2, 3, 4, 5].map(i => room('eeeeeeee-0000-4000-8000-00000000000' + i, A));
  assert.ok(!K.canCreate(rs, A));
  assert.ok(K.canCreate(rs.slice(1), A));
  assert.ok(!K.canCreate([], ''));
  assert.strictEqual(K.why({ message: 'room full: at most 30 members' }), 'full');
  assert.strictEqual(K.why({ message: 'room limit: at most 5 rooms per person' }), 'limit');
  assert.strictEqual(K.why({ message: 'only members can write in this room' }), 'members');
  assert.strictEqual(K.why({ message: 'relation "public.user_rooms" does not exist' }), 'soon');
  assert.strictEqual(K.why(new Error('Failed to fetch')), 'offline');
});

test('the server enforces it: SQL has the 30 cap, creator-only approval, pending asks, members-only posting', () => {
  const s = R('supabase/proposals/user_rooms_20261023.sql');
  assert.match(s, /enable row level security/);
  assert.match(s, /n >= 30/);
  assert.match(s, /for update/, 'row lock so two approvals cannot pass 30');
  assert.match(s, /new\.status := case when new\.user_id = owner then 'member' else 'pending' end/);
  assert.match(s, /user_room_members_approve[\s\S]*r\.owner_id = \(select auth\.uid\(\)\)/);
  assert.match(s, /new\.room like 'u:%'[\s\S]*status = 'member'/);
  assert.match(s, /revoke all on public\.user_rooms from anon, authenticated/);
  assert.doesNotMatch(s, /grant[^;]*to anon/);
});

test('menu: Rooms comes first, then Chat rooms & people; the page loads core, UI and look', () => {
  const ui = R('community-rooms-ui.js');
  assert.match(ui, /if\(W\.LowiUserRooms\)it\.unshift\(\['urooms'/);
  assert.match(ui, /k==='urooms'\)\{try\{W\.LowiUserRooms\.open\(\)/);
  const html = R('index.html');
  const core = html.indexOf('user-rooms-core.js'), js = html.indexOf('user-rooms.js'), menu = html.indexOf('community-rooms-ui.js');
  assert.ok(core > 0 && js > core && menu > js);
  assert.match(html, /user-rooms\.css\?v=/);
});

test('every Rooms text has English, German and Spanish', () => {
  const src = R('user-rooms.js');
  const T = src.slice(src.indexOf('const T={'), src.indexOf('};', src.indexOf('const T={')) + 2);
  const obj = vm.runInNewContext('(' + T.slice('const T='.length, -1) + ')');
  for (const k of Object.keys(obj)) {
    assert.strictEqual(obj[k].length, 3, k);
    for (const s of obj[k]) assert.ok(s && s.trim(), k);
  }
  assert.match(obj.rooms[1], /Circles/); /* renamed from Räume, Emmanuel 23 Oct 2026 */
  assert.match(obj.ask[1], /anfragen/);
});

test('the UI opens without a server and says sign in instead of breaking', () => {
  const els = [];
  const mk = tag => { const e = { tagName: tag, children: [], style: { setProperty() {} }, classList: { add() {}, remove() {}, contains() { return false; } }, dataset: {}, attrs: {}, isConnected: false,
    setAttribute(k, v) { this.attrs[k] = v; }, addEventListener() {}, querySelector(sel) { return sel === '.ur-card' ? (this._card || (this._card = mk('div'))) : null; }, querySelectorAll() { return []; },
    get innerHTML() { return this._h || ''; }, set innerHTML(v) { this._h = v; }, getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }, focus() {}, get offsetWidth() { return 1; } }; els.push(e); return e; };
  const D = { createElement: mk, body: { appendChild(e) { e.isConnected = true; } }, documentElement: { classList: { add() {}, remove() {} } }, addEventListener() {}, activeElement: null, hidden: false };
  const W = { LowiUserRoomsCore: K, localStorage: { getItem: () => null }, setTimeout: () => 0, setInterval: () => 1, clearInterval() {}, confirm: () => false };
  const ctx = vm.createContext({ window: W, document: D, localStorage: W.localStorage, setTimeout: W.setTimeout, setInterval: W.setInterval, clearInterval() {}, Promise, Date, Math, JSON, String });
  vm.runInContext(R('user-rooms.js'), ctx);
  W.LowiUserRooms.open();
  const card = els[0]._card;
  assert.match(card.innerHTML, /Circles/); /* renamed from Rooms, Emmanuel 23 Oct 2026 */
  assert.ok(W.LowiUserRooms.isOpen());
  return new Promise(r => setImmediate(r)).then(() => { assert.strictEqual(W.LowiUserRooms._state().err, 'sign'); W.LowiUserRooms.close(); });
});
