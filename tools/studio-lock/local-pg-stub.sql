-- Local stand-in for the bits of Supabase studio_lock_20261025.sql relies on (tools/studio-lock/test-sql.sh).
-- Mirrors production as read on 25 Oct 2026: app_admins(user_id) with RLS, is_app_admin(), pgcrypto in schema extensions.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists auth;
create schema if not exists extensions;
grant usage on schema public, auth, extensions to anon, authenticated;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'sub', '')::uuid
$$;
create table if not exists public.app_admins (user_id uuid primary key);
alter table public.app_admins enable row level security;
insert into public.app_admins values ('83077af7-8475-4628-9328-25bd335db240') on conflict do nothing;
create or replace function public.is_app_admin() returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists(select 1 from public.app_admins where user_id = auth.uid())
$$;
