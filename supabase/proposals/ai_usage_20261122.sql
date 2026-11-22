-- LOWiSPIKE AI limits (22 Nov 2026). Every AI request (supabase/functions/lowi-ai, studio-ai) takes one unit here first.
-- Per person per feature per day, and one whole-app cap per day so the free Gemini quota (about 500 a day) is never used up.
-- Only the service role (the edge functions) may call ai_take; nobody can read or write the table through the API.
begin;
create table if not exists public.ai_usage (
  day date not null default (now() at time zone 'utc')::date,
  subject text not null,
  feature text not null,
  n int not null default 0,
  primary key (day, subject, feature)
);
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;
create or replace function public.ai_take(p_subject text, p_feature text, p_user_max int, p_global_max int)
returns text language plpgsql security definer set search_path = '' as $$
declare d date := (now() at time zone 'utc')::date; mine int; total int;
begin
  perform pg_advisory_xact_lock(hashtext('ai_take' || d::text));
  select coalesce(sum(n), 0) into total from public.ai_usage where day = d;
  if total >= p_global_max then return 'global'; end if;
  select coalesce(n, 0) into mine from public.ai_usage where day = d and subject = p_subject and feature = p_feature;
  if coalesce(mine, 0) >= p_user_max then return 'user'; end if;
  insert into public.ai_usage (day, subject, feature, n) values (d, p_subject, p_feature, 1)
    on conflict (day, subject, feature) do update set n = public.ai_usage.n + 1;
  delete from public.ai_usage where day < d - 14;
  return 'ok';
end $$;
revoke execute on function public.ai_take(text, text, int, int) from public, anon, authenticated;
grant execute on function public.ai_take(text, text, int, int) to service_role;
commit;
