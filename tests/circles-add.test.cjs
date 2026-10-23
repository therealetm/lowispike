/* Circles (formerly Rooms, Emmanuel 23 Oct 2026): the creator adds people directly, normal members can't, 30 max, bots can't join.
   The add list shows real people only: no server-flagged bots (profiles.bot), no test accounts (profiles.test), no demo bots,
   nobody already in or asked, never you, one row per account. In the app every user-made room is called a Circle. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const K = require('../user-rooms-core.js');
const A = 'aaaaaaaa-0000-4000-8000-000000000001', B = 'bbbbbbbb-0000-4000-8000-000000000002', C = 'cccccccc-0000-4000-8000-000000000003',
  D = 'dddddddd-0000-4000-8000-000000000004', E = 'eeeeeeee-0000-4000-8000-000000000005', F = 'ffffffff-0000-4000-8000-000000000006';
const room = { id: A, owner_id: A, owner_name: 'Emmanuel', name: 'Type 2 together', created_at: '2026-10-23T10:00:00Z' };
const mem = (uid, status) => ({ room_id: A, user_id: uid, who: 'U', status, created_at: '2026-10-23T10:00:00Z' });

test('add list: real people only, not you, not already in or asked, one row each, A to Z', () => {
  const people = [
    { id: A, name: 'Emmanuel' },                 /* you */
    { id: B, name: 'Zoe' },
    { id: C, name: 'Lena', test: true },         /* test account from our check scripts */
    { id: D, name: 'Crowd 12', bot: true },      /* server-flagged bot */
    { id: E, name: 'Antje' },
    { id: E, name: 'Antje' },                    /* same account twice */
    { id: F, name: 'Jonas' },                    /* already asked */
    { uid: '99999999-0000-4000-8000-000000000009', n: 'Mara' }, /* LOWI_CLOUD.people() shape */
    { id: '', name: 'No id' }, { id: '12', name: '   ' }
  ];
  const L = K.addable(people, room, [mem(A, 'member'), mem(F, 'pending')], A);
  assert.deepStrictEqual(L.map(p => p.name), ['Antje', 'Mara', 'Zoe']);
  assert.ok(L.every(p => p.id && p.name));
});

test('add list: an extra bot check (demo bots, LowiBotAccounts, hidden accounts) leaves those out too', () => {
  const people = [{ id: B, name: 'Kiko' }, { id: E, name: 'Antje' }];
  const L = K.addable(people, room, [mem(A, 'member')], A, p => p.name === 'Kiko');
  assert.deepStrictEqual(L.map(p => p.name), ['Antje']);
  assert.deepStrictEqual(K.addable(people, null, [], A), []);
});

test('only the creator can add, and only while the circle has room (30)', () => {
  assert.ok(K.canAdd('owner', false));
  assert.ok(!K.canAdd('owner', true), 'full at 30');
  for (const st of ['member', 'pending', 'none']) assert.ok(!K.canAdd(st, false), st + ' cannot add');
  const ms = [mem(A, 'member')];
  for (let i = 0; i < 29; i++) ms.push(mem('12345678-0000-4000-8000-' + String(i).padStart(12, '0'), 'member'));
  assert.ok(K.inside(room, ms, A).full);
});

test('search the add list by any part of the name, case and spaces ignored', () => {
  const L = [{ id: B, name: 'Zoe Becker' }, { id: E, name: 'Antje' }];
  assert.deepStrictEqual(K.match(L, '  bECK ').map(p => p.id), [B]);
  assert.strictEqual(K.match(L, '').length, 2);
  assert.strictEqual(K.match(L, 'xyz').length, 0);
});

test('server answers for adding become short reasons', () => {
  assert.strictEqual(K.why({ message: 'bot accounts cannot join circles', code: '42501' }), 'bot');
  assert.strictEqual(K.why({ message: 'new row violates row-level security policy for table "user_room_members"', code: '42501' }), 'owner');
  assert.strictEqual(K.why({ message: 'only members can write in this room' }), 'members');
  assert.strictEqual(K.why({ message: 'room full: at most 30 members' }), 'full');
});

test('the server rule is saved: creator adds as member, everyone else only asks for themselves, 30 cap kept', () => {
  const s = R('supabase/proposals/user_rooms_add_20261023.sql');
  assert.match(s, /user_room_members_ask[\s\S]*user_id = \(select auth\.uid\(\)\)[\s\S]*r\.owner_id = \(select auth\.uid\(\)\)/);
  assert.match(s, /owner = auth\.uid\(\)/);
  assert.match(s, /n >= 30/);
  assert.match(s, /for update/);
  assert.doesNotMatch(s, /grant[^;]*to anon/);
});

test('the app calls them Circles in English, German and Spanish; the menu too', () => {
  const src = R('user-rooms.js');
  const T = src.slice(src.indexOf('const T={'), src.indexOf('};', src.indexOf('const T={')) + 2);
  const obj = vm.runInNewContext('(' + T.slice('const T='.length, -1) + ')');
  assert.deepStrictEqual(obj.rooms, ['Circles', 'Circles', 'C\u00edrculos']);
  assert.deepStrictEqual(obj.make, ['Create a circle', 'Circle erstellen', 'Crear c\u00edrculo']);
  for (const k of ['add', 'addOne', 'added', 'find', 'noPeople', 'e_owner', 'e_bot']) assert.ok(obj[k] && obj[k].length === 3, k);
  for (const k of Object.keys(obj)) for (const s of obj[k]) {
    assert.doesNotMatch(s, /\b(Rooms?|Räume|Raum|Salas?)\b/i, 'no old name left: ' + k + ' "' + s + '"');
  }
  assert.match(R('community-rooms-ui.js'), /mRooms:\['Circles','Circles','Círculos'\]/);
  const tut = R('tutorial-steps.js'), i = tut.indexOf("id: 'new-rooms'"), step = tut.slice(i, tut.indexOf('},\n        {', i));
  assert.match(step, /title: \{ en: 'Circles', de: 'Circles', es: 'Círculos' \}/);
  assert.doesNotMatch(step, /Räume|Raum|\broom|sala/i);
});

test('in the circle: the creator gets an Add people button, a member does not', () => {
  const src = R('user-rooms.js');
  assert.match(src, /K\.canAdd\(st,inn\.full\)/);
  assert.match(src, /data-ur="add"/);
  assert.match(src, /data-ur="addp"/);
  assert.match(src, /status:'member'/, 'the creator adds straight in as a member');
  assert.match(src, /select\('id,name,bot,test'\)/, 'the add list reads the server bot and test flags');
});
