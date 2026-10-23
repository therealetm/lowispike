-- 23 Oct 2026, queue step fairplay-sql: server-side fair play for the Care board (Move > Care board) and the profile row.
-- FOR THE OWNER TO RUN once in the Supabase dashboard (SQL Editor > New query > Run) as the project owner. Nothing here runs
-- by itself. Safe to run twice. Undo: drop trigger if exists profiles_fairplay on public.profiles;
--                                   drop function if exists public.profiles_fairplay();
--
-- Why: every phone writes its own public.profiles row (index.html pushProfile -> upsert). The app already clamps what it
-- shows (care-board-core.js scoreOf: sunbeams never above days-so-far x 12), but the database stores whatever a hand-written
-- request sends, so a forged xp_week of 99999 sits in the table and older or third-party readers would trust it.
-- This trigger makes the database itself clamp the numbers to what the app can really earn. It never raises an error, so a
-- normal phone's sync never fails; an impossible number is simply cut down to the ceiling.
--
-- Same model as the app (keep in sync; tests/fairplay-sql.test.cjs checks the constants against the code):
--   * Care board score = sunbeams, at most 12 a day (care-board-core.js GOAL, sun-meter.js full sun).
--     xp_week / xp_month carry the week's / month's sunbeams; wk / mo carry the tag "care1:<period>:<full-sun days>"
--     (period = Monday YYYY-MM-DD for the week, YYYY-MM for the month, in the phone's local time).
--   * Levels 1-25 (world-home-core.js STAGES, 25 levels since evo-levels, build 20261022-222617).
--   * All-time XP: a regular day earns about 250 XP (MAYA-HANDOFF.md section 8). The ceiling is 1000 XP per day since the
--     row was last written, plus one day of slack, the same generous cap the leaderboard branch used (leaderboard-20261022).
--   * Phones count days in their own time zone and the server in UTC, so every day count gets one day of slack.
--   * updated_at is set by the server (now()), so it can't be backdated to unlock a bigger XP jump.
-- Writes from the SQL editor or the service role (no signed-in user) are left alone, so the owner can still fix a row.
-- No new table, so the 30 Oct 2026 grants change does not apply here.

create or replace function public.profiles_fairplay() returns trigger
language plpgsql set search_path = '' as $$
declare
  sun_day   constant int := 12;    -- sunbeams a day (full sun)
  xp_day    constant int := 1000;  -- all-time XP a day, generous
  max_lv    constant int := 25;    -- levels
  m         text[];
  pkey      date;
  days      int;
  cap       int;
  full_days int;
  since     numeric;
  req_role  text := coalesce(current_setting('request.jwt.claim.role', true), '');
begin
  if req_role = '' then
    begin req_role := coalesce((nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'), ''); exception when others then req_role := ''; end;
  end if;
  if req_role not in ('authenticated', 'anon') then return new; end if;

  new.updated_at := now();

  -- level: 1..25
  if new.lv is not null then new.lv := greatest(1, least(max_lv, new.lv)); end if;

  -- all-time XP: never negative, never more than one capped day per day since the last write (+1 day slack)
  if new.xp is not null and new.xp < 0 then new.xp := 0; end if;
  if tg_op = 'UPDATE' then
    if new.xp is not null and new.xp > coalesce(old.xp, 0) then
      since := greatest(0, extract(epoch from (now() - coalesce(old.updated_at, now()))) / 86400.0);
      if new.xp - coalesce(old.xp, 0) > xp_day * (ceil(since) + 1) then
        new.xp := coalesce(old.xp, 0) + xp_day * (ceil(since) + 1);
      end if;
    end if;
  elsif new.xp is not null and new.xp > xp_day * 2 then
    new.xp := xp_day * 2;
  end if;

  -- week sunbeams: tag care1:<Monday>:<full days>; at most 12 x days of this week so far (+1 day slack), never above 84
  if new.xp_week is not null and new.xp_week < 0 then new.xp_week := 0; end if;
  m := regexp_match(coalesce(new.wk, ''), '^care1:([0-9]{4}-[0-9]{2}-[0-9]{2}):([0-9]{1,3})$');
  if m is not null then
    begin pkey := m[1]::date; exception when others then pkey := null; end;
    days := case when pkey is null then 0 else least(7, greatest(0, (current_date - pkey) + 2)) end;
    if pkey is not null and pkey > current_date + 1 then days := 0; end if;   -- a week that has not started
    cap := days * sun_day;
    if coalesce(new.xp_week, 0) > cap then new.xp_week := cap; end if;
    full_days := least(m[2]::int, days, ceil(coalesce(new.xp_week, 0) / sun_day::numeric)::int);
    new.wk := 'care1:' || m[1] || ':' || full_days;
  elsif new.xp_week is not null and new.xp_week > 7 * sun_day then
    new.xp_week := 7 * sun_day;                                                -- untagged rows: one full week at most
  end if;

  -- month sunbeams: tag care1:<YYYY-MM>:<full days>; at most 12 x days of this month so far (+1 day slack), never above 372
  if new.xp_month is not null and new.xp_month < 0 then new.xp_month := 0; end if;
  m := regexp_match(coalesce(new.mo, ''), '^care1:([0-9]{4}-[0-9]{2}):([0-9]{1,3})$');
  if m is not null then
    begin pkey := (m[1] || '-01')::date; exception when others then pkey := null; end;
    days := case when pkey is null then 0 else least(31, greatest(0, (current_date - pkey) + 2)) end;
    if pkey is not null and pkey > current_date + 1 then days := 0; end if;   -- a month that has not started
    cap := days * sun_day;
    if coalesce(new.xp_month, 0) > cap then new.xp_month := cap; end if;
    full_days := least(m[2]::int, days, ceil(coalesce(new.xp_month, 0) / sun_day::numeric)::int);
    new.mo := 'care1:' || m[1] || ':' || full_days;
  elsif new.xp_month is not null and new.xp_month > 31 * sun_day then
    new.xp_month := 31 * sun_day;                                              -- untagged rows: one full month at most
  end if;

  return new;
end $$;

drop trigger if exists profiles_fairplay on public.profiles;
create trigger profiles_fairplay before insert or update on public.profiles
  for each row execute function public.profiles_fairplay();

-- One-time clean-up of numbers stored before this trigger existed (touching the rows runs the trigger on them).
-- Optional: run it only if the check below finds rows. It changes nothing on honest rows.
--   select id, name, xp_week, wk, xp_month, mo, lv from public.profiles
--    where xp_week > 84 or xp_month > 372 or lv > 25 or lv < 1;
-- The SQL editor runs as the owner, which the trigger skips on purpose, so clean those rows by hand, for example:
--   update public.profiles set xp_week = least(xp_week, 84), xp_month = least(xp_month, 372), lv = greatest(1, least(25, lv))
--    where xp_week > 84 or xp_month > 372 or lv > 25 or lv < 1;

-- Also worth checking once (read only): a member may write only their own row. This should list an UPDATE/INSERT policy
-- whose check is auth.uid() = id. If it doesn't, tell the next Maya before running anything else.
--   select policyname, cmd, qual, with_check from pg_policies where schemaname = 'public' and tablename = 'profiles';
