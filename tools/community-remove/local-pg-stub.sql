-- Local stand-in for what supabase/proposals/community_remove_20261025.sql relies on (tools/community-remove/test-sql.sh).
-- Mirrors production as read on 25 Oct 2026: app_admins(user_id) with RLS, is_app_admin(), profiles and messages with RLS on
-- and a permissive read policy. posts is created WITHOUT RLS to check the script leaves such a table alone.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists auth;
grant usage on schema public, auth to anon, authenticated;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'sub', '')::uuid
$$;
create table if not exists auth.users (id uuid primary key, is_anonymous boolean default false);
create table if not exists public.app_admins (user_id uuid primary key);
alter table public.app_admins enable row level security;
insert into public.app_admins values ('83077af7-8475-4628-9328-25bd335db240') on conflict do nothing;
create or replace function public.is_app_admin() returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists(select 1 from public.app_admins where user_id = auth.uid())
$$;
create table if not exists public.profiles (id uuid primary key, name text, test boolean default false);
alter table public.profiles enable row level security;
drop policy if exists "read all" on public.profiles;
create policy "read all" on public.profiles for select to authenticated using (true);
grant select on public.profiles to authenticated;
create table if not exists public.messages (id bigserial primary key, user_id uuid, body text);
alter table public.messages enable row level security;
drop policy if exists "read all" on public.messages;
create policy "read all" on public.messages for select to authenticated using (true);
drop policy if exists "post own" on public.messages;
create policy "post own" on public.messages for insert to authenticated with check (user_id = auth.uid());
grant select, insert on public.messages to authenticated;
grant usage on sequence public.messages_id_seq to authenticated;
create table if not exists public.posts (id bigserial primary key, user_id uuid, body text);
grant select on public.posts to authenticated;
insert into auth.users values ('83077af7-8475-4628-9328-25bd335db240'), ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222'), ('33333333-3333-4333-8333-333333333333') on conflict do nothing;
insert into public.profiles values ('83077af7-8475-4628-9328-25bd335db240', 'eman'), ('11111111-1111-4111-8111-111111111111', 'Antje'),
  ('22222222-2222-4222-8222-222222222222', 'Emmanuel'), ('33333333-3333-4333-8333-333333333333', 'Q') on conflict do nothing;
insert into public.messages (user_id, body) values ('22222222-2222-4222-8222-222222222222', 'hi from a stranger'),
  ('11111111-1111-4111-8111-111111111111', 'hallo');
