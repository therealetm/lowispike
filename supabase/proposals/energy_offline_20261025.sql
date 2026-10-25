-- Oct 25, 2026 (Emmanuel: "every real companion stays in the galaxy like a parked car, real people can send energy to offline
-- companions, and a phone that was asleep must not show the companion back on its seat").
-- Two small tables, both written only by signed-in app users through RLS, both safe to re-run.
--
-- 1) energy_gifts: one row per energy shot one real person lands on another real person's companion.
--    This is the hook for the push task ("energy received while offline"): a push sender reads rows where
--    to_online = false and pushed_at is null and seen_at is null, sends (or skips) and sets pushed_at.
--    Spam limits are enforced HERE, on the server, not only in the app (numbers are Maya's decision, Oct 25):
--      same sender -> same person: at most 1 per 5 minutes
--      one sender: at most 20 per hour
--      one person receiving from everyone: at most 30 per hour
--    Bots never send or receive; test accounts can only reach other test accounts.
-- 2) companion_rest: where a companion came to rest after it was knocked (room coordinates, the same on every device).
--    The shooter's phone writes it when its shot settles; every phone reads it on open, wake and reconnect.

create table if not exists public.energy_gifts (
  id bigint generated always as identity primary key,
  from_id uuid not null default auth.uid(),
  to_id uuid not null,
  to_online boolean not null default false,
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  pushed_at timestamptz
);
create index if not exists energy_gifts_to_idx on public.energy_gifts (to_id, created_at desc);
create index if not exists energy_gifts_from_idx on public.energy_gifts (from_id, created_at desc);
create index if not exists energy_gifts_push_due on public.energy_gifts (created_at) where pushed_at is null and seen_at is null and to_online = false;
alter table public.energy_gifts enable row level security;

drop policy if exists energy_gifts_insert on public.energy_gifts;
create policy energy_gifts_insert on public.energy_gifts for insert to authenticated
  with check (from_id = auth.uid() and to_id <> auth.uid());
drop policy if exists energy_gifts_select on public.energy_gifts;
create policy energy_gifts_select on public.energy_gifts for select to authenticated
  using (to_id = auth.uid() or from_id = auth.uid());
drop policy if exists energy_gifts_seen on public.energy_gifts;
create policy energy_gifts_seen on public.energy_gifts for update to authenticated
  using (to_id = auth.uid()) with check (to_id = auth.uid());

create or replace function public.energy_gifts_guard() returns trigger language plpgsql security definer set search_path=public as $$
declare sb bool;st bool;rb bool;rt bool;p int;s int;r int;
begin
if auth.role()='service_role' then return new;end if;
if tg_op='UPDATE' then
if (new.from_id,new.to_id,new.to_online,new.created_at)<>(old.from_id,old.to_id,old.to_online,old.created_at) or new.pushed_at is distinct from old.pushed_at then raise exception 'energy_gift_readonly';end if;
return new;end if;
new.from_id:=auth.uid();new.created_at:=now();new.seen_at:=null;new.pushed_at:=null;
if new.from_id is null or new.to_id=new.from_id then raise exception 'energy_gift_self';end if;
select coalesce(bot,false),coalesce(test,false) into sb,st from profiles where id=new.from_id;
select coalesce(bot,false),coalesce(test,false) into rb,rt from profiles where id=new.to_id;
if rb is null then raise exception 'energy_gift_unknown';end if;
if coalesce(sb,false) or rb then raise exception 'energy_gift_bot';end if;
if coalesce(st,false)<>rt then raise exception 'energy_gift_test';end if;
select count(*) filter(where from_id=new.from_id and to_id=new.to_id and created_at>now()-interval '5 minutes'),count(*) filter(where from_id=new.from_id),count(*) filter(where to_id=new.to_id) into p,s,r from energy_gifts where created_at>now()-interval '1 hour' and (from_id=new.from_id or to_id=new.to_id);
if p>=1 then raise exception 'energy_gift_rate_pair';end if;
if s>=20 then raise exception 'energy_gift_rate_sender';end if;
if r>=30 then raise exception 'energy_gift_rate_recipient';end if;
return new;end $$;
drop trigger if exists energy_gifts_guard on public.energy_gifts;
create trigger energy_gifts_guard before insert or update on public.energy_gifts
  for each row execute function public.energy_gifts_guard();

create table if not exists public.companion_rest (
  user_id uuid primary key,
  rx real not null check (rx between -6000 and 6000),
  ry real not null check (ry between -6000 and 6000),
  moved_by uuid not null default auth.uid(),
  updated_at timestamptz not null default now()
);
create index if not exists companion_rest_updated_idx on public.companion_rest (updated_at desc);
alter table public.companion_rest enable row level security;
drop policy if exists companion_rest_read on public.companion_rest;
create policy companion_rest_read on public.companion_rest for select to authenticated using (true);
drop policy if exists companion_rest_insert on public.companion_rest;
create policy companion_rest_insert on public.companion_rest for insert to authenticated with check (moved_by = auth.uid());
drop policy if exists companion_rest_update on public.companion_rest;
create policy companion_rest_update on public.companion_rest for update to authenticated using (true) with check (moved_by = auth.uid());

create or replace function public.companion_rest_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int; b boolean; t boolean; tt boolean;
begin
  if auth.role() = 'service_role' then return new; end if;
  new.moved_by := auth.uid(); new.updated_at := now();
  select coalesce(bot,false), coalesce(test,false) into b, t from profiles where id = new.moved_by;
  if coalesce(b,false) then raise exception 'companion_rest_bot'; end if;
  -- a test account can only move test companions (an agent's check never moves a real person's companion)
  select coalesce(test,false) into tt from profiles where id = new.user_id;
  if coalesce(t,false) and not coalesce(tt,false) then raise exception 'companion_rest_test'; end if;
  -- one phone moves at most 60 companions a minute (a big chain of hits is ~10)
  select count(*) into n from companion_rest where moved_by = new.moved_by and updated_at > now() - interval '1 minute' and user_id <> new.user_id;
  if n >= 60 then raise exception 'companion_rest_rate'; end if;
  return new;
end $$;
drop trigger if exists companion_rest_guard on public.companion_rest;
create trigger companion_rest_guard before insert or update on public.companion_rest
  for each row execute function public.companion_rest_guard();

grant select, insert, update on public.energy_gifts to authenticated;
grant select, insert, update on public.companion_rest to authenticated;

select 'energy_gifts' as t, count(*) from public.energy_gifts union all select 'companion_rest', count(*) from public.companion_rest;
