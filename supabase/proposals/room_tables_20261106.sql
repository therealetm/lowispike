-- LOWiSPIKE · billiard tables of 24 (design review point 6, Emmanuel, 6 Nov 2026)
-- PROPOSAL: not applied by the agents (no Supabase access from the build machine). Run it once in the Supabase SQL editor.
--
-- What it does
--   * public.room_seats: one row per member who opened the Room: which table they sit at (1, 2, 3 ...).
--   * public.room_seat(p_inviter): the app calls it when the Room opens. It
--       - frees every seat that was not used for 14 days (that member gets a free seat again when they come back),
--       - keeps your seat when you have one (and notes that you were here),
--       - otherwise seats you: at the inviter's table when you came with an invite and it has room, else at the first table
--         with a free seat, else at a new table. Never more than 24 at a table. No asking, no choice.
--   * Everyone signed in may read who sits at which table (only member ids and table numbers), nobody writes rows directly.
-- What stays the same: chat, ranking, energy, the positions table (public.companion_rest) and everything else are shared by all.
-- Each table shows only its own members' balls, so each table has its own middle and its own middle XP (room-table.js).
-- Until this runs, the app keeps one table for everyone, exactly as before (room-table.js falls back when the function is missing).
--
-- Undo:  drop function if exists public.room_seat(uuid); drop table if exists public.room_seats;

create table if not exists public.room_seats (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  table_no   integer not null check (table_no >= 1),
  seated_at  timestamptz not null default now(),
  last_seen  timestamptz not null default now(),
  invited_by uuid null
);
create index if not exists room_seats_table_idx on public.room_seats (table_no);
create index if not exists room_seats_seen_idx on public.room_seats (last_seen);

alter table public.room_seats enable row level security;
drop policy if exists room_seats_read on public.room_seats;
create policy room_seats_read on public.room_seats for select to authenticated using (true);
revoke insert, update, delete on public.room_seats from anon, authenticated;
grant select on public.room_seats to authenticated;

create or replace function public.room_seat(p_inviter uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  me  uuid := auth.uid();
  t   integer;
  cap constant integer := 24;
begin
  if me is null then
    raise exception 'not signed in';
  end if;
  -- one seating at a time, so two people can never take the last seat of a table together
  perform pg_advisory_xact_lock(hashtext('lowispike.room_seat'));

  -- 14 days without the Room frees the seat
  delete from public.room_seats where last_seen < now() - interval '14 days';

  select s.table_no into t from public.room_seats s where s.user_id = me;
  if t is not null then
    update public.room_seats set last_seen = now() where user_id = me;
    return t;
  end if;

  -- came with an invite: the inviter's table, when it has a free seat
  if p_inviter is not null and p_inviter <> me then
    select s.table_no into t from public.room_seats s where s.user_id = p_inviter;
    if t is not null and (select count(*) from public.room_seats s where s.table_no = t) >= cap then
      t := null;
    end if;
  end if;

  -- else the first table with a free seat, else a new table
  if t is null then
    select g.n into t
      from generate_series(1, coalesce((select max(s.table_no) from public.room_seats s), 0) + 1) as g(n)
     where (select count(*) from public.room_seats s where s.table_no = g.n) < cap
     order by g.n
     limit 1;
  end if;

  insert into public.room_seats (user_id, table_no, invited_by)
  values (me, t, case when p_inviter is not null and p_inviter <> me then p_inviter else null end);
  return t;
end;
$$;

revoke all on function public.room_seat(uuid) from public;
grant execute on function public.room_seat(uuid) to authenticated;
