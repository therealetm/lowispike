-- LOWiSPIKE meal details on Chat posts (task 31c545da, Sun 25 Oct 2026).
-- E-man: "I can click on a friend's picture and see the information that they got about whatever they are eating."
-- A meal post (body "🍽 <photo url>#l=...") can carry the poster's own photo check for THAT meal in messages.meal.
-- Additive and nullable: old clients never select it, old rows stay null (the sheet says "No details for this meal").
-- The check is the server half of meal-detail-core.js clean(): an object, <= 4 KB, only whitelisted keys at every level,
-- so cycle, sleep, weight, goals or any other health data can never be stored with a post, by the app or by anyone else.
-- messages has no UPDATE policy: a detail is written once, with the post, by its owner (insert policy unchanged).

create or replace function public.lowi_meal_detail_ok(j jsonb) returns boolean
language sql immutable parallel safe set search_path = pg_catalog as $$
  select j is null or (
    jsonb_typeof(j) = 'object'
    and octet_length(j::text) <= 4096
    and not exists (select 1 from jsonb_object_keys(j) k
      where k not in ('v','name','lvl','bs','net','drink','verdict','rule','low','note','items','total'))
    and (not (j ? 'items') or (
      jsonb_typeof(j->'items') = 'array' and jsonb_array_length(j->'items') <= 8
      and not exists (select 1 from jsonb_array_elements(j->'items') e
        where jsonb_typeof(e) <> 'object'
           or exists (select 1 from jsonb_object_keys(e) k where k not in ('name','portion','v')))))
    and (not (j ? 'total') or (
      jsonb_typeof(j->'total') = 'object'
      and not exists (select 1 from jsonb_each(j->'total') t
        where t.key not in ('kcal','carbs','protein','fiber','sugar','fat') or jsonb_typeof(t.value) <> 'number')))
  )
$$;

alter table public.messages add column if not exists meal jsonb;
alter table public.messages drop constraint if exists messages_meal_detail_ok;
alter table public.messages add constraint messages_meal_detail_ok check (public.lowi_meal_detail_ok(meal));

-- rollback: alter table public.messages drop constraint if exists messages_meal_detail_ok;
--           alter table public.messages drop column if exists meal; drop function if exists public.lowi_meal_detail_ok(jsonb);
