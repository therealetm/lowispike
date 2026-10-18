#!/usr/bin/env node
'use strict';
// Runs supabase/proposals/owner_admin_20261018.sql in an in-memory Postgres (PGlite, WASM) with a stand-in
// auth schema and the anon / authenticated roles, then checks: owner allowed, non-owner refused, anon refused,
// kick hides the profile + blocks posting, undo restores, owner can't kick himself, script refuses a wrong owner.
// Never touches the live database. Needs @electric-sql/pglite (NODE_PATH=/tmp/pgl/node_modules).
const fs = require('fs');
const path = require('path');
const { PGlite } = require('@electric-sql/pglite');
const SQL = fs.readFileSync(path.join(__dirname, '..', 'supabase/proposals/owner_admin_20261018.sql'), 'utf8');
const OWNER = '83077af7-8475-4628-9328-25bd335db240', EMMA = '11111111-1111-4111-8111-111111111111', JOE = '33333333-3333-4333-8333-333333333333';

const SETUP = `
create role anon nologin; create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key, email text, created_at timestamptz default now(), last_sign_in_at timestamptz, is_anonymous boolean default false);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
grant usage on schema public to anon, authenticated;
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, name text);
alter table public.profiles enable row level security;
create policy "read all" on public.profiles for select using (true);
grant select on public.profiles to anon, authenticated;
create table public.messages (id bigserial primary key, user_id uuid references auth.users(id), body text);
alter table public.messages enable row level security;
create policy "read all" on public.messages for select using (true);
create policy "own insert" on public.messages for insert to authenticated with check (user_id = auth.uid());
grant select, insert on public.messages to authenticated; grant usage on sequence public.messages_id_seq to authenticated;
insert into auth.users(id, email) values ('${OWNER}', 'e@x'), ('${EMMA}', null), ('${JOE}', 'j@x');
insert into public.profiles values ('${OWNER}', 'eman'), ('${EMMA}', 'Emma'), ('${JOE}', 'Joseph Castellar');
`;

let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
async function as(db, role, uid, q, params) {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid || ''}', false); set role ${role};`);
    try { const r = await db.query(q, params); return { rows: r.rows }; } catch (e) { return { error: e.message, code: e.code }; } finally { await db.exec('reset role'); }
}

(async () => {
    // wrong owner: the guard aborts and changes nothing
    const bad = new PGlite();
    await bad.exec(SETUP.replace("('" + OWNER + "', 'eman')", "('" + OWNER + "', 'Emma 2')"));
    let refused = false; try { await bad.exec(SQL); } catch (e) { refused = /not the "eman" profile/.test(e.message); }
    ok(refused, 'script refuses when the owner id is not the eman profile');

    const db = new PGlite();
    await db.exec(SETUP);
    await db.exec(SQL);
    ok(true, 'proposal runs');
    await db.exec(SQL);
    ok(true, 'proposal runs a second time (idempotent)');

    let r = await as(db, 'authenticated', OWNER, 'select public.is_app_owner() as v');
    ok(r.rows && r.rows[0].v === true, 'owner: is_app_owner() = true');
    r = await as(db, 'authenticated', JOE, 'select public.is_app_owner() as v');
    ok(r.rows && r.rows[0].v === false, 'non-owner: is_app_owner() = false');
    r = await as(db, 'anon', '', 'select public.is_app_owner() as v');
    ok(!!r.error, 'anon cannot call is_app_owner (' + (r.code || '') + ')');
    r = await as(db, 'authenticated', JOE, 'select * from public.app_admins');
    ok(!!r.error, 'non-owner cannot read app_admins');

    r = await as(db, 'authenticated', JOE, `select public.admin_kick(array['${EMMA}']::uuid[]) as n`);
    ok(r.code === '42501', 'non-owner kick refused (42501)');
    r = await as(db, 'authenticated', JOE, 'select * from public.admin_members()');
    ok(r.code === '42501', 'non-owner member list refused (42501)');
    r = await as(db, 'authenticated', JOE, `insert into public.community_kicks(user_id) values ('${EMMA}')`);
    ok(!!r.error, 'non-owner cannot write community_kicks directly');

    r = await as(db, 'authenticated', OWNER, 'select * from public.admin_members()');
    ok(r.rows && r.rows.length === 3 && r.rows.find(x => x.id === OWNER).is_owner === true, 'owner sees all 3 members, himself marked owner');
    r = await as(db, 'authenticated', OWNER, `select public.admin_kick(array['${OWNER}','${EMMA}']::uuid[]) as n`);
    ok(r.rows && r.rows[0].n === 1, 'owner kick: Emma kicked, owner skipped himself');

    r = await as(db, 'authenticated', JOE, 'select name from public.profiles order by name');
    ok(r.rows && r.rows.map(x => x.name).sort().join(',') === 'Joseph Castellar,eman', 'kicked profile hidden from others');
    r = await as(db, 'authenticated', EMMA, 'select name from public.profiles order by name');
    ok(r.rows && r.rows.some(x => x.name === 'Emma'), 'kicked member still sees own profile');
    r = await as(db, 'authenticated', EMMA, `insert into public.messages(user_id, body) values ('${EMMA}', 'hi')`);
    ok(!!r.error, 'kicked member cannot post');
    r = await as(db, 'authenticated', JOE, `insert into public.messages(user_id, body) values ('${JOE}', 'hi')`);
    ok(!r.error, 'others can still post');
    r = await as(db, 'authenticated', JOE, 'select count(*)::int as n from public.community_kicks');
    ok(r.rows && r.rows[0].n === 1, 'signed-in users can read the kick list');

    r = await as(db, 'authenticated', JOE, `select public.admin_unkick(array['${EMMA}']::uuid[]) as n`);
    ok(r.code === '42501', 'non-owner undo refused');
    r = await as(db, 'authenticated', OWNER, `select public.admin_unkick(array['${EMMA}']::uuid[]) as n`);
    ok(r.rows && r.rows[0].n === 1, 'owner undo');
    r = await as(db, 'authenticated', JOE, 'select count(*)::int as n from public.profiles');
    ok(r.rows && r.rows[0].n === 3, 'after undo Emma is visible again');
    r = await as(db, 'authenticated', EMMA, `insert into public.messages(user_id, body) values ('${EMMA}', 'back')`);
    ok(!r.error, 'after undo Emma can post again');

    console.log(fails ? fails + ' failed' : 'all passed');
    process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
