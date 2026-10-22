-- Community strength leaderboard: server-side fair play (Oct 22 2026). FOR THE OWNER TO RUN in the Supabase SQL editor.
-- The app already checks every row on each reader's phone (leaderboard-core.js) and keeps rows that break the daily XP caps off
-- the board. This trigger makes the database refuse those numbers too, so a hand-written request cannot even store them.
-- Same ceiling as the app: DAY_CAP = 1000 XP a day (every daily cap filled, rounded up generously).
-- Safe to run twice. Undo: drop trigger profiles_fairplay on public.profiles; drop function public.profiles_fairplay();

create or replace function public.profiles_fairplay() returns trigger language plpgsql as $$
declare
  day_cap constant int := 1000;
  days numeric;
  wk_xp int;
  wk_key date;
  wk_days int;
begin
  if new.xp is null or new.xp < 0 then new.xp := coalesce(old.xp, 0); end if;
  -- all-time XP can only grow by one capped day per day since the last write, plus one day of slack
  if tg_op = 'UPDATE' and new.xp > coalesce(old.xp, 0) then
    days := greatest(0, extract(epoch from (now() - coalesce(old.updated_at, now()))) / 86400.0);
    if new.xp - coalesce(old.xp, 0) > day_cap * (ceil(days) + 1) then
      new.xp := coalesce(old.xp, 0) + day_cap * (ceil(days) + 1);
    end if;
  elsif tg_op = 'INSERT' and new.xp > day_cap * 2 then
    new.xp := day_cap * 2;
  end if;
  -- week XP rides wk as care1:MONDAY:FULLDAYS:xWEEKXP[:h]; it can never pass days-so-far x cap or the all-time XP
  if new.wk ~ '^care1:[0-9]{4}-[0-9]{2}-[0-9]{2}:[0-9]{1,3}:x[0-9]{1,6}(:h)?$' then
    wk_key := substring(new.wk from 7 for 10)::date;
    wk_xp := substring(new.wk from ':x([0-9]{1,6})')::int;
    wk_days := greatest(1, least(7, (current_date - wk_key) + 1));
    if wk_xp > least(new.xp, wk_days * day_cap) then
      new.wk := regexp_replace(new.wk, ':x[0-9]{1,6}', ':x' || least(new.xp, wk_days * day_cap));
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_fairplay on public.profiles;
create trigger profiles_fairplay before insert or update on public.profiles
  for each row execute function public.profiles_fairplay();
