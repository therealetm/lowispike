-- LOWiSPIKE: the admin can remove a person from the Community (Oct 25, 2026).
-- Emmanuel (voice, 25 Oct): "Can you give me the option as an admin to just kick people out of the community? I can still
-- see names that I don't even know who they are. [...] A simple remove would be nice."
--
-- Safe to run twice. Nothing is ever deleted: a removal is one row in public.community_kicks, Restore deletes that row.
--
-- Security model (Supabase docs: Database Functions, Row Level Security):
--   * Who is admin is decided only by the existing public.is_app_admin() over public.app_admins (production already has
--     it; the Studio lock uses it). No admin id is written into this file or the app.
--   * Every write goes through a SECURITY DEFINER function with search_path = '' that checks is_app_admin() first,
--     never acts on the caller himself or on another admin, is rate-limited and writes a log row (who, when, whom).
--   * public.community_kicks: RLS on, signed-in people may read the removed ids (every app hides them), nobody may write.
--   * public.community_removal_log: RLS on, no grants at all; only the functions write it.
--   * Restrictive policies hide a removed person's profile, messages, posts and reactions from everyone but themself,
--     and stop them posting. They only narrow what the existing policies allow, and only on tables with RLS on.

begin;

-- 1. Removed people --------------------------------------------------------------------------------------
create table if not exists public.community_kicks (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  kicked_by  uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.community_kicks enable row level security;
revoke all on public.community_kicks from public, anon, authenticated;
grant select (user_id) on public.community_kicks to authenticated;
drop policy if exists "removed ids are readable" on public.community_kicks;
create policy "removed ids are readable" on public.community_kicks for select to authenticated using (true);

-- 2. Log of every remove and restore ---------------------------------------------------------------------
create table if not exists public.community_removal_log (
  id          bigserial primary key,
  at          timestamptz not null default now(),
  actor       uuid not null,
  target      uuid not null,
  action      text not null check (action in ('remove', 'restore')),
  target_name text
);
create index if not exists community_removal_log_actor_at on public.community_removal_log (actor, at desc);
alter table public.community_removal_log enable row level security;
revoke all on public.community_removal_log from public, anon, authenticated;

-- 3. Is the signed-in person the admin? (the app only uses this to show the button; the server checks again on every call)
create or replace function public.community_is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.is_app_admin(), false);
$$;
revoke execute on function public.community_is_admin() from public, anon;
grant  execute on function public.community_is_admin() to authenticated;

-- 4. Shared guard: admin only, never self, never another admin, rate limits --------------------------------
-- Limits per admin: 30 actions in 10 minutes and 300 a day (removes and restores together).
create or replace function public.community_remove_guard(target uuid)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare me uuid := (select auth.uid());
begin
  if me is null or not coalesce(public.is_app_admin(), false) then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if target is null then raise exception 'no_target' using errcode = '22023'; end if;
  if target = me then raise exception 'not_yourself' using errcode = '22023'; end if;
  if exists (select 1 from public.app_admins a where a.user_id = target) then
    raise exception 'target_is_admin' using errcode = '22023';
  end if;
  if (select count(*) from public.community_removal_log l where l.actor = me and l.at > now() - interval '10 minutes') >= 30
     or (select count(*) from public.community_removal_log l where l.actor = me and l.at > now() - interval '1 day') >= 300 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return me;
end $$;
revoke execute on function public.community_remove_guard(uuid) from public, anon, authenticated;

-- 5. Remove / Restore ---------------------------------------------------------------------------------------
create or replace function public.community_remove(target uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare me uuid; nm text;
begin
  me := public.community_remove_guard(target);
  if not exists (select 1 from auth.users u where u.id = target) then
    raise exception 'no_such_person' using errcode = '22023';
  end if;
  select p.name into nm from public.profiles p where p.id = target;
  insert into public.community_kicks (user_id, kicked_by) values (target, me) on conflict (user_id) do nothing;
  insert into public.community_removal_log (actor, target, action, target_name) values (me, target, 'remove', nm);
  return jsonb_build_object('removed', true, 'user_id', target, 'name', nm);
end $$;
revoke execute on function public.community_remove(uuid) from public, anon;
grant  execute on function public.community_remove(uuid) to authenticated;

create or replace function public.community_restore(target uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare me uuid; nm text;
begin
  me := public.community_remove_guard(target);
  select p.name into nm from public.profiles p where p.id = target;
  delete from public.community_kicks k where k.user_id = target;
  insert into public.community_removal_log (actor, target, action, target_name) values (me, target, 'restore', nm);
  return jsonb_build_object('removed', false, 'user_id', target, 'name', nm);
end $$;
revoke execute on function public.community_restore(uuid) from public, anon;
grant  execute on function public.community_restore(uuid) to authenticated;

-- 6. The admin's "Removed people" list (names come from profiles, which the restrictive policy hides from the app) ----
create or replace function public.community_removed_list()
returns table (user_id uuid, name text, removed_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not coalesce(public.is_app_admin(), false) then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  return query
    select k.user_id, coalesce(nullif(trim(p.name), ''), 'Member')::text, k.created_at
    from public.community_kicks k left join public.profiles p on p.id = k.user_id
    order by k.created_at desc limit 500;
end $$;
revoke execute on function public.community_removed_list() from public, anon;
grant  execute on function public.community_removed_list() to authenticated;

-- 7. Am I removed? (the removed person's app shows the calm "no longer part of this community" screen) ------------
create or replace function public.community_am_removed()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.community_kicks k where k.user_id = (select auth.uid()));
$$;
revoke execute on function public.community_am_removed() from public, anon;
grant  execute on function public.community_am_removed() to authenticated;

-- 8. Make a removal real on the server --------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in select * from (values
      ('profiles',     'id',      'select'),
      ('messages',     'user_id', 'select'),
      ('posts',        'user_id', 'select'),
      ('reactions',    'user_id', 'select'),
      ('messages',     'user_id', 'insert'),
      ('posts',        'user_id', 'insert'),
      ('reactions',    'user_id', 'insert'),
      ('post_likes',   'user_id', 'insert'),
      ('media',        'user_id', 'insert'),
      ('energy_gifts', 'from_id', 'insert'),
      ('gift_baskets', 'user_id', 'insert')) as v(tbl, col, cmd)
  loop
    if to_regclass('public.' || r.tbl) is null then continue; end if;
    if r.cmd = 'select' and not exists (select 1 from information_schema.columns
                   where table_schema = 'public' and table_name = r.tbl and column_name = r.col) then continue; end if;
    if not (select relrowsecurity from pg_class where oid = ('public.' || r.tbl)::regclass) then
      raise notice 'public.% has no row level security; removal is enforced by the app only there', r.tbl;
      continue;
    end if;
    execute format('drop policy if exists %I on public.%I', 'community removed ' || r.cmd, r.tbl);
    if r.cmd = 'select' then
      execute format(
        'create policy %I on public.%I as restrictive for select to authenticated using (%I = (select auth.uid()) or not exists (select 1 from public.community_kicks k where k.user_id = %I.%I))',
        'community removed select', r.tbl, r.col, r.tbl, r.col);
    else
      execute format(
        'create policy %I on public.%I as restrictive for insert to authenticated with check (not exists (select 1 from public.community_kicks k where k.user_id = (select auth.uid())))',
        'community removed insert', r.tbl);
    end if;
    raise notice 'public.%: removed people hidden/blocked for %', r.tbl, r.cmd;
  end loop;
end $$;

commit;

-- 9. Check ------------------------------------------------------------------------------------------------------------
select to_regprocedure('public.community_remove(uuid)') is not null as remove_ready,
       to_regprocedure('public.community_restore(uuid)') is not null as restore_ready,
       (select count(*) from public.community_kicks) as removed_now;

-- To take it back out (no account or message is touched):
--   drop function if exists public.community_remove(uuid), public.community_restore(uuid), public.community_removed_list(),
--     public.community_am_removed(), public.community_is_admin(), public.community_remove_guard(uuid);
--   drop policy if exists "community removed select" on public.profiles; (and on messages, posts, reactions)
--   drop policy if exists "community removed insert" on public.messages; (and on posts, reactions, post_likes, media, energy_gifts, gift_baskets)
--   drop table if exists public.community_removal_log; drop table if exists public.community_kicks;
