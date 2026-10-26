-- Rolled-back server test for supabase/proposals/admin_delete_account_20261026.sql. Run by tools/admin-delete/sql-test.sh,
-- which wraps: begin; <migration>; <this file>; rollback;  Nothing it creates survives. Two fake logins only.
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
create temp table _t (k text primary key, v uuid) on commit drop;
grant select on _t to authenticated;
insert into _t values ('admin', '83077af7-8475-4628-9328-25bd335db240'),
  ('victim', gen_random_uuid()), ('other', gen_random_uuid());
insert into auth.users (id, instance_id, aud, role, email, is_anonymous, created_at, updated_at, raw_user_meta_data)
  select v, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', null, true, now(), now(),
         '{"lowi_test":true}'::jsonb from _t where k in ('victim', 'other');
insert into public.profiles (id, name, test) select v, 'ZZ-delete-test', true from _t where k in ('victim', 'other')
  on conflict (id) do update set name = excluded.name;
insert into public.messages (id, user_id, room, body) select 'zz-del-test-' || gen_random_uuid(), v, 'zz-delete-test', 'zz test' from _t where k = 'victim';
insert into public.community_kicks (user_id, kicked_by) select v, (select v from _t where k = 'admin') from _t where k = 'victim';
insert into public.energy_gifts (from_id, to_id, to_online) select (select v from _t where k = 'victim'), v, false from _t where k = 'other';
insert into public.companion_rest (user_id, rx, ry, moved_by) select v, 0.5, 0.5, v from _t where k = 'victim';

-- 1. a non-admin can't delete anyone
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select v from _t where k = 'other'), 'role', 'authenticated')::text, true);
do $$ begin
  perform public.community_delete_account((select v from _t where k = 'victim'));
  raise exception 'FAIL: a non-admin deleted an account';
exception when insufficient_privilege then raise notice 'ok 1 non-admin refused';
end $$;
-- 1b. a non-admin can't call the raw delete either
do $$ begin
  perform public.lowi_delete_account((select v from _t where k = 'victim'));
  raise exception 'FAIL: authenticated may call lowi_delete_account';
exception when insufficient_privilege then raise notice 'ok 1b raw delete refused';
end $$;
-- 1c. a non-admin can read tombstones but not write them
do $$ begin
  insert into public.community_deleted (user_id) values (gen_random_uuid());
  raise exception 'FAIL: authenticated wrote a tombstone';
exception when insufficient_privilege then raise notice 'ok 1c tombstone write refused';
end $$;

-- 2. the admin can't delete themselves
select set_config('request.jwt.claims', json_build_object('sub', (select v from _t where k = 'admin'), 'role', 'authenticated')::text, true);
do $$ begin
  perform public.community_delete_account((select v from _t where k = 'admin'));
  raise exception 'FAIL: admin deleted themselves';
exception when invalid_parameter_value then raise notice 'ok 2 not yourself';
end $$;

-- 3. the admin deletes the victim: login, profile, messages, kick row, energy, room spot all gone; tombstone + log written
do $$ declare r jsonb; vid uuid := (select v from _t where k = 'victim'); begin
  r := public.community_delete_account(vid);
  if not (r->>'deleted')::boolean then raise exception 'FAIL: not deleted %', r; end if;
  reset role;
  if exists (select 1 from auth.users where id = vid) then raise exception 'FAIL: login left'; end if;
  if exists (select 1 from public.profiles where id = vid) then raise exception 'FAIL: profile left'; end if;
  if exists (select 1 from public.messages where user_id = vid) then raise exception 'FAIL: messages left'; end if;
  if exists (select 1 from public.community_kicks where user_id = vid) then raise exception 'FAIL: kick row left'; end if;
  if exists (select 1 from public.energy_gifts where from_id = vid or to_id = vid) then raise exception 'FAIL: energy left'; end if;
  if exists (select 1 from public.companion_rest where user_id = vid) then raise exception 'FAIL: room spot left'; end if;
  if not exists (select 1 from public.community_deleted where user_id = vid) then raise exception 'FAIL: no tombstone'; end if;
  if not exists (select 1 from public.community_removal_log where target = vid and action = 'delete') then raise exception 'FAIL: no log'; end if;
  if not exists (select 1 from public.profiles where id = (select v from _t where k = 'other')) then raise exception 'FAIL: other person touched'; end if;
  raise notice 'ok 3 deleted with every row';
end $$;

-- 4. deleting again answers gone (no error), so a retry after a lost answer still clears the person
set local role authenticated;
do $$ declare r jsonb; begin
  r := public.community_delete_account((select v from _t where k = 'victim'));
  if not (r->>'gone')::boolean then raise exception 'FAIL: second delete %', r; end if;
  raise notice 'ok 4 second delete is gone';
end $$;
reset role;
select 'ALL SQL CHECKS PASSED' as result;
