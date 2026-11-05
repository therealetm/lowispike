-- LOWiSPIKE: Give a hand takes the whole cart (5 Nov 2026, owner walkthrough).
-- "Why is it even leaving out stuff? Everything in a freaking Warenkorb should go in there, with a total price."
-- Before: a basket held at most 12 foods and the server refused anything its word list called spiky (gift_items_low_spike).
-- After: up to 60 foods, any food name; the same format checks stay (2 to 40 characters, no < > or control characters),
-- the total stays €5 to €150 and the pay link rules stay exactly as they were. Nothing is deleted; existing baskets stay valid.
-- The app asks gift_limits() which rules apply, so until this file has run it keeps the old rules and says plainly what it can't take.
-- PROPOSAL ONLY: nobody has run this on the live database yet. Run once in the Supabase SQL editor, after
-- gift_baskets_20261025.sql. Safe to run again. No payments, card data or Stripe here: givers pay on the person's own page.

begin;

alter table public.gift_baskets drop constraint if exists gift_items;
alter table public.gift_baskets add constraint gift_items
  check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 60 and octet_length(items::text) <= 6000);

-- format only: the spike word list is gone from the server
create or replace function public.gift_items_format_ok(items jsonb)
returns boolean language sql immutable set search_path to '' as $fn$
  select jsonb_typeof(items) = 'array' and not exists (
    select 1 from jsonb_array_elements(items) e(x)
    where jsonb_typeof(e.x) <> 'object' or jsonb_typeof(e.x->'n') <> 'string'
       or char_length(e.x->>'n') not between 2 and 40
       or (e.x->>'n') ~ '[<>[:cntrl:]]')
$fn$;

alter table public.gift_baskets drop constraint if exists gift_items_low_spike;
alter table public.gift_baskets drop constraint if exists gift_items_format;
alter table public.gift_baskets add constraint gift_items_format check (public.gift_items_format_ok(items));

-- what the app reads to know the rules
create or replace function public.gift_limits()
returns jsonb language sql stable set search_path to '' as $fn$
  select jsonb_build_object('any_food', true, 'max_items', 60, 'min_eur', 5, 'max_eur', 150)
$fn$;
revoke execute on function public.gift_limits() from public, anon;
grant  execute on function public.gift_limits() to authenticated;

commit;

-- check after running: every food goes in, broken shapes still don't
select public.gift_items_format_ok('[{"n":"Halloumi"},{"n":"Courgette","q":3},{"n":"Cola"},{"n":"Bananen"},{"n":"Toastbrot"}]') as any_food_ok,
       not public.gift_items_format_ok('[{"n":"x"}]') and not public.gift_items_format_ok('[{"n":"<b>Eier</b>"}]')
         and not public.gift_items_format_ok('["Eier"]') as bad_shapes_refused;

-- Undo (back to the 25 Oct rules; only works while no open basket has more than 12 foods or a food the old list refuses):
-- alter table public.gift_baskets drop constraint if exists gift_items_format;
-- alter table public.gift_baskets drop constraint if exists gift_items;
-- alter table public.gift_baskets add constraint gift_items check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 12 and octet_length(items::text) <= 1500);
-- alter table public.gift_baskets add constraint gift_items_low_spike check (public.gift_items_ok(items));
-- drop function if exists public.gift_limits();
