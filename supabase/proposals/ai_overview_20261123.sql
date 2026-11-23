-- 23 Nov 2026 (Emmanuel: "how much does it cost every time I add someone's profile ... I need to see how much I've got left somewhere as
-- an admin, so I know what is using it, how many people are using it, and how much I've got left").
-- 1) Profile autofill (studio-ai "profile") reads the public TikTok / Instagram page; it is not AI, so it no longer counts against the
--    whole-app AI cap (it keeps its own 30 a day per connection).
-- 2) ai_overview(): owner only. Per day (UTC, last 14 days) and per feature: uses and how many people, from public.ai_usage (Misty,
--    translate, link check, meal fix, voice, Studio) plus the meal photo checks (food-photo keeps each person's recent checks in
--    auth.users app_metadata.food_photo.t). Returns the app's own daily AI cap so the page can say what is left today: `ai` counts against it (meal photos have their own
--    limit per person), `total` is every AI request that day.
begin;
create or replace function public.ai_take(p_subject text, p_feature text, p_user_max int, p_global_max int)
returns text language plpgsql security definer set search_path = '' as $$
declare d date := (now() at time zone 'utc')::date; mine int; total int;
begin
  perform pg_advisory_xact_lock(hashtext('ai_take' || d::text));
  select coalesce(sum(n), 0) into total from public.ai_usage where day = d and feature <> 'profile';
  if p_feature <> 'profile' and total >= p_global_max then return 'global'; end if;
  select coalesce(n, 0) into mine from public.ai_usage where day = d and subject = p_subject and feature = p_feature;
  if coalesce(mine, 0) >= p_user_max then return 'user'; end if;
  insert into public.ai_usage (day, subject, feature, n) values (d, p_subject, p_feature, 1)
    on conflict (day, subject, feature) do update set n = public.ai_usage.n + 1;
  delete from public.ai_usage where day < d - 14;
  return 'ok';
end $$;
revoke execute on function public.ai_take(text, text, int, int) from public, anon, authenticated;
grant execute on function public.ai_take(text, text, int, int) to service_role;

create or replace function public.ai_overview() returns json
language plpgsql stable security definer set search_path = public, auth as $$
declare res json;
begin
  if not coalesce(public.is_app_owner(), false) then raise exception 'owner only' using errcode = '42501'; end if;
  with photo as (
    select (to_timestamp((x.v)::bigint / 1000.0) at time zone 'utc')::date as day, u.id::text as subject, 1 as n
    from auth.users u, jsonb_array_elements_text(coalesce(u.raw_app_meta_data -> 'food_photo' -> 't', '[]'::jsonb)) as x(v)
    where (x.v) ~ '^[0-9]+$'
  ), rows as (
    select day, subject, feature, n from public.ai_usage
    union all select day, subject, 'photo', n from photo
  ), f as (
    select day, feature, sum(n)::int as uses, count(distinct subject)::int as people from rows
    where day >= (now() at time zone 'utc')::date - 13 group by day, feature
  ), d as (
    select day, sum(uses) filter (where feature not in ('profile', 'photo'))::int as ai, sum(uses) filter (where feature <> 'profile')::int as total, (select count(distinct r.subject) from rows r where r.day = f.day and r.feature <> 'profile')::int as people,
      json_agg(json_build_object('feature', feature, 'uses', uses, 'people', people) order by uses desc) as features
    from f group by day
  )
  select json_build_object('today', (now() at time zone 'utc')::date, 'cap', 400,
    'days', coalesce((select json_agg(json_build_object('day', day, 'ai', coalesce(ai, 0), 'total', coalesce(total, 0), 'people', people, 'features', features) order by day desc) from d), '[]'::json))
  into res;
  return res;
end $$;
revoke all on function public.ai_overview() from public, anon;
grant execute on function public.ai_overview() to authenticated;
commit;
