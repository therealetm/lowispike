'use strict';
/* Nov 6 2026 design review point 6 (Emmanuel): billiard tables of 24.
   At most 24 active players per table; new people sit at the next table with a free seat, without asking; 14 days away frees the
   seat (a free seat again on return); an invite seats you at the inviter's table when it has room; each table has its own middle
   and its own XP; chat, ranking and everything else stay shared. The server part is a proposal Emmanuel runs once
   (supabase/proposals/room_tables_20261106.sql); until then the Room keeps one table for everyone, as before.
   Browser walk (scratch, Chromium, local site, network blocked, a stand-in for the database), recorded in DECISIONS.md. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const C = require('../room-table-core.js');
const sql = read('supabase/proposals/room_tables_20261106.sql'), js = read('room-table.js');
const code = s => s.replace(/--[^\n]*/g, '');

test('the server: one seat each, 24 a table, the inviter\'s table first, 14 days frees a seat', () => {
    const q = code(sql);
    assert.match(q, /create table if not exists public\.room_seats \(\n\s+user_id\s+uuid primary key references auth\.users \(id\) on delete cascade,\n\s+table_no\s+integer not null check \(table_no >= 1\),/);
    assert.match(q, /cap constant integer := 24;/);
    assert.equal(C.SEATS, 24, 'the app and the server agree on 24');
    assert.match(q, /perform pg_advisory_xact_lock\(hashtext\('lowispike\.room_seat'\)\);/, 'two people never take the last seat together');
    assert.match(q, /delete from public\.room_seats where last_seen < now\(\) - interval '14 days';/);
    assert.match(q, /select s\.table_no into t from public\.room_seats s where s\.user_id = me;\n\s+if t is not null then\n\s+update public\.room_seats set last_seen = now\(\) where user_id = me;\n\s+return t;/, 'you keep your seat');
    assert.match(q, /if p_inviter is not null and p_inviter <> me then\n\s+select s\.table_no into t from public\.room_seats s where s\.user_id = p_inviter;\n\s+if t is not null and \(select count\(\*\) from public\.room_seats s where s\.table_no = t\) >= cap then\n\s+t := null;/, 'the inviter\'s table only when it has room');
    assert.match(q, /from generate_series\(1, coalesce\(\(select max\(s\.table_no\) from public\.room_seats s\), 0\) \+ 1\) as g\(n\)\n\s+where \(select count\(\*\) from public\.room_seats s where s\.table_no = g\.n\) < cap\n\s+order by g\.n/, 'the first table with a free seat, else a new one');
    assert.match(q, /security definer\nset search_path = public/);
    assert.match(q, /alter table public\.room_seats enable row level security;/);
    assert.match(q, /revoke insert, update, delete on public\.room_seats from anon, authenticated;/, 'nobody writes seats directly');
    assert.match(q, /grant execute on function public\.room_seat\(uuid\) to authenticated;/);
    assert.match(sql, /-- Undo:  drop function if exists public\.room_seat\(uuid\); drop table if exists public\.room_seats;/);
    assert.doesNotMatch(q, /companion_rest|chat|ledger|rank/i, 'chat, ranking and the positions stay shared and untouched');
});

test('the app: only your table\'s balls and shots; everyone while there are no tables yet', () => {
    const list = [{ uid: 'a', me: true }, { uid: 'b' }, { uid: 'c' }];
    assert.deepEqual(C.atTable(list, null).map(p => p.uid), ['a', 'b', 'c'], 'no tables yet: everyone, as before');
    assert.deepEqual(C.atTable(list, new Set(['c'])).map(p => p.uid), ['a', 'c'], 'your table: you and its members');
    assert.match(js, /list=C\.atTable\(list,members\);/);
    assert.match(js, /if\(members&&!members\.has\(m\.by\)\)return false;   \/\* a shot at another table \*\//);
    assert.match(js, /sb\.rpc\('room_seat',\{p_inviter:inviter\(\)\}\)/);
    assert.match(js, /sb\.from\('room_seats'\)\.select\('user_id'\)\.eq\('table_no',t\)\.limit\(200\)/);
    assert.match(js, /if\(r&&r\.error&&\/PGRST202\|42883\|404\|not find\|does not exist\/i\.test\([\s\S]{0,120}?\)seatOff=true;return 0;/, 'the SQL not run yet: it stops asking and stays one table');
    assert.match(js, /sync\(\);seat\(\);if\(!loaded/, 'seated when the Room opens');
    assert.match(js, /tableNo\?tr\('sbTableV',people\.length,\{t:tableNo\}\):tr\('sbRoomV',people\.length\)/, 'the scoreboard names your table');
    for (const w of ["sbTableV:['{n} at table {t}','{n} an Tisch {t}','{n} en la mesa {t}']", "invite:['Invite to my table','An meinen Tisch einladen','Invitar a mi mesa']"]) assert.ok(js.includes(w), w);
});

test('the invite: a link with your member id, kept until the Room seats you', () => {
    const id = '0f8fad5b-d9cb-469f-a165-70867728950e';
    assert.equal(C.inviteFrom('?tisch=' + id), id);
    assert.equal(C.inviteFrom('?x=1&tisch=' + id.toUpperCase() + '#a'), id, 'case and other parameters do not matter');
    assert.equal(C.inviteFrom('?tisch=bob'), null, 'only a member id');
    assert.equal(C.inviteFrom(''), null);
    assert.match(js, /const u=C\.inviteFrom\(W\.location&&W\.location\.search\);if\(u\)\{localStorage\.setItem\(INV_KEY,JSON\.stringify\(\{u,at:Date\.now\(\)\}\)\);/);
    assert.match(js, /url\.searchParams\.delete\('tisch'\);W\.history\.replaceState/, 'the address bar is clean again');
    assert.match(js, /return o&&realUid\(o\.u\)&&o\.u!==me\?o\.u:null;/, 'never your own id');
    assert.match(js, /try\{localStorage\.removeItem\(INV_KEY\);\}catch\(e\)\{\}/, 'used once');
    assert.match(js, /const url=W\.location\.origin\+W\.location\.pathname\+'\?tisch='\+me/);
    assert.match(js, /inv\.hidden=!tableNo;/, 'the invite shows only once there are tables');
    assert.match(read('room-table.css'), /\.rt-inv\{position:absolute;right:12px;top:0;transform:translateY\(-60%\);pointer-events:auto;/);
    assert.match(read('room-table.css'), /\.rt-inv::after\{content:"";position:absolute;inset:-8px\}/, 'a 44 pt tap area');
});
