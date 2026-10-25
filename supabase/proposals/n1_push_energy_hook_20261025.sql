-- LOWiSPIKE phone notifications release (25 Oct 2026): energy received, pushed by the server.
-- Right after an energy shot lands (a row in public.energy_gifts, galaxy task, limits enforced there), ask n1-push to push it.
-- pg_net is asynchronous: the insert never waits for the push, and a failure never blocks the shot (cron flushes every 5 min).
-- No secret in here: the "gifts" action only handles shots the database already accepted, each claimed once.
create or replace function public.n1_energy_gift_push() returns trigger language plpgsql security definer set search_path to '' as $$
begin
  begin
    perform net.http_post(
      url := 'https://vnfwmifmsfecascwaody.supabase.co/functions/v1/n1-push',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := '{"a":"gifts"}'::jsonb,
      timeout_milliseconds := 20000);
  exception when others then null;
  end;
  return null;
end $$;
drop trigger if exists n1_energy_gift_push on public.energy_gifts;
create trigger n1_energy_gift_push after insert on public.energy_gifts
  for each statement execute function public.n1_energy_gift_push();
