-- Oct 25, 2026 (Emmanuel: "the newest members at the top, the oldest further down"): when a member joined, readable by every
-- device so the Community Room galaxy can order people by it. Backfilled from auth.users.created_at; new rows get now().
-- A client upsert can never change it (trigger keeps the old value). Applied to production 25 Oct 2026 by task 5b1193fa.
alter table public.profiles add column if not exists joined_at timestamptz;
update public.profiles p set joined_at = u.created_at from auth.users u where u.id = p.id and p.joined_at is null;
update public.profiles set joined_at = coalesce(updated_at, now()) where joined_at is null;
alter table public.profiles alter column joined_at set default now();
alter table public.profiles alter column joined_at set not null;
create or replace function public.profiles_keep_joined_at() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' then new.joined_at := old.joined_at; else new.joined_at := now(); end if;
  return new;
end $$;
drop trigger if exists profiles_keep_joined_at on public.profiles;
create trigger profiles_keep_joined_at before insert or update on public.profiles for each row execute function public.profiles_keep_joined_at();
select count(*) as rows, count(joined_at) as with_joined, min(joined_at), max(joined_at) from public.profiles;
