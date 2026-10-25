-- LOWiSPIKE (25 Oct 2026): a phone notification for each Nibblo meal post.
-- Nibblo (nibblo_meals_20261025.sql) posts quietly; nothing ever asked n1-push to send anything. Now, right after a meal
-- is really posted (a new row in public.nibblo_log, written once per slot by nibblo_post()), ask n1-push to announce it
-- (action "nibblo": the person's switch, quiet hours, one per slot, at most three a day; see supabase/functions/n1-push/nibblo.ts).
-- pg_net is asynchronous and runs after the post's transaction commits: the post never waits for the push, and a failed
-- ping never blocks the post (the 5-minute n1-push cron sends anything not yet announced while it is fresh).
-- No secret in here: the "nibblo" action only announces posts the database itself wrote, each claimed once (pushed_at).
-- Only ADDS to Nibblo's tables: nibblo_post() / nibblo_tick() are unchanged. Safe to run again.
begin;
alter table public.nibblo_log add column if not exists pushed_at timestamptz;
-- posts from before this release are never announced late
update public.nibblo_log set pushed_at = now() where pushed_at is null and posted_at < now();
create or replace function public.nibblo_push_ping() returns trigger language plpgsql security definer set search_path to '' as $$
begin
  begin
    perform net.http_post(
      url := 'https://vnfwmifmsfecascwaody.supabase.co/functions/v1/n1-push',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := '{"a":"nibblo"}'::jsonb,
      timeout_milliseconds := 20000);
  exception when others then null;
  end;
  return null;
end $$;
revoke execute on function public.nibblo_push_ping() from public, anon, authenticated;
drop trigger if exists nibblo_push_ping on public.nibblo_log;
-- for each row: fires only when a slot is really posted (a repeated tick hits "on conflict do nothing" and inserts no row)
create trigger nibblo_push_ping after insert on public.nibblo_log
  for each row execute function public.nibblo_push_ping();
commit;
