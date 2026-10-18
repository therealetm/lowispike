-- LOWiSPIKE owner tools (Oct 18, 2026): the app owner can kick members out of Community (with undo)
-- and see every account. Deleting an account for good is done by the Edge Function
-- supabase/functions/owner-delete-account (Supabase recommends deleting users through the admin API
-- on a server, never from the browser).
--
-- REVIEWED PROPOSAL. Nothing here runs by itself: the owner pastes it into the Supabase dashboard
-- (SQL Editor > New query > Run). It is safe to run twice.
--
-- Security model (Supabase docs: Database Functions, Row Level Security, "Securing your API"):
--   * public.app_admins holds the owner's user id. RLS is on and it has NO policies and no grants,
--     so nobody can read or change it through the API. Only SECURITY DEFINER functions look inside.
--   * Every owner function checks (select auth.uid()) against app_admins on the server before it
--     acts, runs with `set search_path = ''`, and is executable by signed-in users only (never anon).
--   * No service_role key anywhere in the app or the repo.
--   * A kick is a row in public.community_kicks. Everyone signed in may read the ids (so every app
--     hides kicked members), nobody may write them except through admin_kick / admin_unkick.
--     Restrictive policies hide a kicked member's profile and messages and stop them posting.
--     Undo = delete the row; nothing about the account is changed.

begin;

-- 1. Owners -------------------------------------------------------------------------------------
create table if not exists public.app_admins (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;
revoke all on public.app_admins from anon, authenticated;

-- Emmanuel's real account: the "eman" profile with the most sunbeams and the 21 chat messages.
-- The guard stops the script if that id is not an "eman" profile, so it can never make someone else owner.
do $$
declare owner_id constant uuid := '83077af7-8475-4628-9328-25bd335db240';
begin
  if not exists (select 1 from auth.users where id = owner_id) then
    raise exception 'Owner account % not found. Nothing was changed.', owner_id;
  end if;
  if to_regclass('public.profiles') is not null
     and not exists (select 1 from public.profiles where id = owner_id and lower(trim(name)) = 'eman') then
    raise exception 'Account % is not the "eman" profile. Nothing was changed.', owner_id;
  end if;
  insert into public.app_admins(user_id) values (owner_id) on conflict do nothing;
end $$;

create or replace function public.is_app_owner()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.app_admins where user_id = (select auth.uid()));
$$;
revoke execute on function public.is_app_owner() from public, anon;
grant  execute on function public.is_app_owner() to authenticated;

-- 2. Kicks --------------------------------------------------------------------------------------
create table if not exists public.community_kicks (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  kicked_by  uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.community_kicks enable row level security;
revoke all on public.community_kicks from anon, authenticated;
grant select on public.community_kicks to authenticated;
drop policy if exists "kicks readable by signed-in users" on public.community_kicks;
create policy "kicks readable by signed-in users" on public.community_kicks
  for select to authenticated using (true);

create or replace function public.admin_kick(targets uuid[])
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); n integer;
begin
  if me is null or not exists (select 1 from public.app_admins where user_id = me) then
    raise exception 'only the app owner can kick members' using errcode = '42501';
  end if;
  if targets is null or cardinality(targets) = 0 or cardinality(targets) > 200 then
    raise exception 'pick between 1 and 200 accounts' using errcode = '22023';
  end if;
  insert into public.community_kicks(user_id, kicked_by)
    select t, me from unnest(targets) as t
    where t <> me and t not in (select user_id from public.app_admins)
      and exists (select 1 from auth.users u where u.id = t)
    on conflict (user_id) do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.admin_unkick(targets uuid[])
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); n integer;
begin
  if me is null or not exists (select 1 from public.app_admins where user_id = me) then
    raise exception 'only the app owner can undo a kick' using errcode = '42501';
  end if;
  delete from public.community_kicks where user_id = any(coalesce(targets, '{}'));
  get diagnostics n = row_count;
  return n;
end $$;

-- 3. The owner's member list (reads auth.users, so it has to be SECURITY DEFINER + owner-only) ---
create or replace function public.admin_members()
returns table (id uuid, name text, created_at timestamptz, last_sign_in_at timestamptz,
               is_anonymous boolean, has_email boolean, kicked boolean, is_owner boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.app_admins where user_id = (select auth.uid())) then
    raise exception 'only the app owner can list members' using errcode = '42501';
  end if;
  return query
    select u.id,
           coalesce(nullif(trim(p.name), ''), '(no name)')::text,
           u.created_at, u.last_sign_in_at,
           coalesce(u.is_anonymous, false), (u.email is not null and u.email <> ''),
           exists (select 1 from public.community_kicks k where k.user_id = u.id),
           exists (select 1 from public.app_admins a where a.user_id = u.id)
    from auth.users u
    join public.profiles p on p.id = u.id
    order by lower(coalesce(p.name, '')), u.created_at;
end $$;

revoke execute on function public.admin_kick(uuid[])   from public, anon;
revoke execute on function public.admin_unkick(uuid[]) from public, anon;
revoke execute on function public.admin_members()      from public, anon;
grant  execute on function public.admin_kick(uuid[])   to authenticated;
grant  execute on function public.admin_unkick(uuid[]) to authenticated;
grant  execute on function public.admin_members()      to authenticated;

-- 4. Make a kick real on the server: hide the profile and messages, block new posts -------------
-- Restrictive policies only narrow what existing policies allow, and only on tables that already
-- have RLS on. Tables without RLS are left alone (the app still hides kicked members itself).
do $$
declare r record;
begin
  for r in select * from (values
      ('profiles',  'id',      'select'),
      ('messages',  'user_id', 'select'),
      ('messages',  'user_id', 'insert'),
      ('posts',     'user_id', 'insert'),
      ('reactions', 'user_id', 'insert'),
      ('post_likes','user_id', 'insert')) as v(tbl, col, cmd)
  loop
    if to_regclass('public.' || r.tbl) is null then continue; end if;
    if not exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = r.tbl and column_name = r.col) then continue; end if;
    if not (select relrowsecurity from pg_class where oid = ('public.' || r.tbl)::regclass) then
      raise notice 'public.% has no row level security, kick is enforced by the app only there', r.tbl;
      continue;
    end if;
    execute format('drop policy if exists %I on public.%I', 'owner kick ' || r.cmd, r.tbl);
    if r.cmd = 'select' then
      execute format(
        'create policy %I on public.%I as restrictive for select to authenticated using (%I = (select auth.uid()) or not exists (select 1 from public.community_kicks k where k.user_id = %I.%I))',
        'owner kick select', r.tbl, r.col, r.tbl, r.col);
    else
      execute format(
        'create policy %I on public.%I as restrictive for insert to authenticated with check (not exists (select 1 from public.community_kicks k where k.user_id = (select auth.uid())))',
        'owner kick insert', r.tbl);
    end if;
  end loop;
end $$;

commit;

-- 5. Check (shows one row: the owner's name and that the owner tools exist) ---------------------
select p.name as owner_name, a.user_id as owner_id,
       to_regprocedure('public.admin_kick(uuid[])') is not null as kick_ready,
       to_regprocedure('public.admin_members()')    is not null as list_ready
from public.app_admins a left join public.profiles p on p.id = a.user_id;

-- To take it all back out (owner tools only, no accounts are touched):
--   drop function if exists public.admin_members(), public.admin_kick(uuid[]), public.admin_unkick(uuid[]), public.is_app_owner();
--   drop policy if exists "owner kick select" on public.profiles; drop policy if exists "owner kick select" on public.messages;
--   drop policy if exists "owner kick insert" on public.messages; drop policy if exists "owner kick insert" on public.posts;
--   drop policy if exists "owner kick insert" on public.reactions; drop policy if exists "owner kick insert" on public.post_likes;
--   drop table if exists public.community_kicks; drop table if exists public.app_admins;
