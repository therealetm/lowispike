-- LOWiSPIKE "Give a hand" (25 Oct 2026, Emmanuel): people pay for each other's HEALTHY groceries.
-- LOWiSPIKE never touches money. A person who could use a hand shares a basket of low-spike staples, a rough euro total and
-- their OWN payment link (Ko-fi page, Stripe Payment Link, PayPal.me). Givers leave the app for that link. No Stripe Connect,
-- no payment form, no card data, nothing about money is stored here except the rough total the person typed.
--
-- One giver per basket: the first "I helped" takes the basket (gift_help), so two people never pay the same groceries.
-- Verification (Emmanuel, like rating an Uber driver): after a basket is helped the recipient has 7 days to photograph the
-- grocery receipt (private bucket gift-receipts, visible only to the owner and that basket's giver). The giver taps
-- Verified or Doesn't match. A receipt the giver leaves unanswered for 7 days counts as verified. No receipt in 7 days, or
-- Doesn't match, counts against the person. Score = verified / counted helped baskets, "New" until something counted.
-- Same rules as gift-basket-core.js trust() (tests/gift-basket-core.test.cjs pins both).
--
-- Applied with: supabase db query --linked -f supabase/proposals/gift_baskets_20261025.sql (idempotent)

begin;

create table if not exists public.gift_baskets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  first_name  text,
  anon        boolean not null default false,
  city        text,
  items       jsonb not null,
  total_eur   numeric(6,2) not null,
  pay_url     text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '21 days',
  helper_id   uuid references auth.users(id) on delete set null,
  helped_at   timestamptz,
  receipt_path text,
  receipt_at  timestamptz,
  verdict     text,
  verdict_at  timestamptz,
  constraint gift_name_len  check (first_name is null or char_length(first_name) between 1 and 24),
  constraint gift_city_len  check (city is null or char_length(city) between 1 and 40),
  constraint gift_anon_name check (not anon or first_name is null),
  constraint gift_items     check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 12 and octet_length(items::text) <= 1500),
  constraint gift_total     check (total_eur >= 5 and total_eur <= 150),
  constraint gift_pay_url   check (char_length(pay_url) <= 120 and pay_url ~ '^https://((www\.)?ko-fi\.com/[A-Za-z0-9_]{2,40}|(buy|donate)\.stripe\.com/(test_)?[A-Za-z0-9]{8,40}|(www\.)?paypal\.me/[A-Za-z0-9]{1,20}(/[0-9]{1,4}([.][0-9]{1,2})?(EUR)?)?)$'),
  constraint gift_verdict   check (verdict is null or verdict in ('verified', 'mismatch')),
  constraint gift_not_self  check (helper_id is null or helper_id <> user_id)
);
-- one open (not yet helped) basket per person
create unique index if not exists gift_baskets_one_open on public.gift_baskets(user_id) where helper_id is null and helped_at is null;
create index if not exists gift_baskets_open_list on public.gift_baskets(created_at desc) where helped_at is null;
create index if not exists gift_baskets_helper on public.gift_baskets(helper_id);

alter table public.gift_baskets enable row level security;
revoke all on public.gift_baskets from anon, authenticated;
grant select, delete on public.gift_baskets to authenticated;
-- only the basket itself can be written by its owner; help, receipt and verdict go through the functions below
grant insert (user_id, first_name, anon, city, items, total_eur, pay_url) on public.gift_baskets to authenticated;
grant update (first_name, anon, city, items, total_eur, pay_url, updated_at) on public.gift_baskets to authenticated;

drop policy if exists "gift read" on public.gift_baskets;
create policy "gift read" on public.gift_baskets for select to authenticated
  using (user_id = (select auth.uid()) or helper_id = (select auth.uid()) or (helped_at is null and expires_at > now()));
drop policy if exists "gift insert own" on public.gift_baskets;
create policy "gift insert own" on public.gift_baskets for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "gift update own open" on public.gift_baskets;
create policy "gift update own open" on public.gift_baskets for update to authenticated
  using (user_id = (select auth.uid()) and helped_at is null) with check (user_id = (select auth.uid()) and helped_at is null);
-- a helped basket stays (it is the person's verification history); only an open one can be taken down
drop policy if exists "gift delete own open" on public.gift_baskets;
create policy "gift delete own open" on public.gift_baskets for delete to authenticated
  using (user_id = (select auth.uid()) and helped_at is null);
-- kicked members can neither post baskets nor be seen
drop policy if exists "owner kick select" on public.gift_baskets;
create policy "owner kick select" on public.gift_baskets as restrictive for select to authenticated
  using (user_id = (select auth.uid()) or not exists (select 1 from public.community_kicks k where k.user_id = gift_baskets.user_id));
drop policy if exists "owner kick insert" on public.gift_baskets;
create policy "owner kick insert" on public.gift_baskets as restrictive for insert to authenticated
  with check (not exists (select 1 from public.community_kicks k where k.user_id = (select auth.uid())));

-- "I helped": the first giver takes the basket. Returns the basket id, or raises when it is taken / own / gone.
create or replace function public.gift_help(basket uuid)
returns uuid language plpgsql security definer set search_path to '' as $fn$
declare me uuid := auth.uid(); got uuid;
begin
  if me is null then raise exception 'sign in' using errcode = '42501'; end if;
  if exists (select 1 from public.community_kicks k where k.user_id = me) then raise exception 'kicked' using errcode = '42501'; end if;
  update public.gift_baskets set helper_id = me, helped_at = now()
   where id = basket and helped_at is null and helper_id is null and user_id <> me and expires_at > now()
  returning id into got;
  if got is null then raise exception 'taken' using errcode = 'P0001'; end if;
  return got;
end $fn$;

-- the recipient adds the receipt photo (path in gift-receipts: <owner uid>/<basket id>.jpg) within 7 days of the help
create or replace function public.gift_receipt(basket uuid)
returns timestamptz language plpgsql security definer set search_path to '' as $fn$
declare me uuid := auth.uid(); at timestamptz;
begin
  if me is null then raise exception 'sign in' using errcode = '42501'; end if;
  update public.gift_baskets set receipt_path = me::text || '/' || basket::text || '.jpg', receipt_at = now()
   where id = basket and user_id = me and helped_at is not null and verdict is null and now() <= helped_at + interval '7 days'
  returning receipt_at into at;
  if at is null then raise exception 'too late' using errcode = 'P0001'; end if;
  return at;
end $fn$;

-- the giver answers: verified / mismatch, once, only after a receipt is there and while it is not auto-verified (7 days)
create or replace function public.gift_verdict(basket uuid, v text)
returns text language plpgsql security definer set search_path to '' as $fn$
declare me uuid := auth.uid(); got text;
begin
  if me is null then raise exception 'sign in' using errcode = '42501'; end if;
  if v not in ('verified', 'mismatch') then raise exception 'bad verdict' using errcode = 'P0001'; end if;
  update public.gift_baskets set verdict = v, verdict_at = now()
   where id = basket and helper_id = me and receipt_at is not null and verdict is null and now() <= receipt_at + interval '7 days'
  returning verdict into got;
  if got is null then raise exception 'closed' using errcode = 'P0001'; end if;
  return got;
end $fn$;

-- the public score: counts only, never who gave or how much. Same rules as LowiGiftBasketCore.trust().
create or replace function public.gift_trust(uids uuid[])
returns table (user_id uuid, counted int, verified int, pending int)
language sql stable security definer set search_path to '' as $fn$
  select b.user_id,
    count(*) filter (where b.verdict is not null
                        or (b.receipt_at is not null and now() > b.receipt_at + interval '7 days')
                        or (b.receipt_at is null and now() > b.helped_at + interval '7 days'))::int,
    count(*) filter (where b.verdict = 'verified'
                        or (b.verdict is null and b.receipt_at is not null and now() > b.receipt_at + interval '7 days'))::int,
    count(*) filter (where b.verdict is null
                        and ((b.receipt_at is not null and now() <= b.receipt_at + interval '7 days')
                          or (b.receipt_at is null and now() <= b.helped_at + interval '7 days')))::int
  from public.gift_baskets b
  where b.helped_at is not null and b.user_id = any(coalesce(uids, '{}')) and cardinality(uids) <= 200
  group by b.user_id
$fn$;

revoke execute on function public.gift_help(uuid), public.gift_receipt(uuid), public.gift_verdict(uuid, text), public.gift_trust(uuid[]) from public, anon;
grant  execute on function public.gift_help(uuid), public.gift_receipt(uuid), public.gift_verdict(uuid, text), public.gift_trust(uuid[]) to authenticated;

-- receipt photos: private bucket, 1.5 MB jpeg, read by the owner and that basket's giver only
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gift-receipts', 'gift-receipts', false, 1572864, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 1572864, allowed_mime_types = array['image/jpeg'];

drop policy if exists "gift receipt upload" on storage.objects;
create policy "gift receipt upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'gift-receipts' and exists (select 1 from public.gift_baskets b
    where (select auth.uid()) = b.user_id and name = b.user_id::text || '/' || b.id::text || '.jpg'
      and b.helped_at is not null and b.verdict is null and now() <= b.helped_at + interval '7 days'));
drop policy if exists "gift receipt replace" on storage.objects;
create policy "gift receipt replace" on storage.objects for update to authenticated
  using (bucket_id = 'gift-receipts' and exists (select 1 from public.gift_baskets b
    where (select auth.uid()) = b.user_id and name = b.user_id::text || '/' || b.id::text || '.jpg' and b.verdict is null))
  with check (bucket_id = 'gift-receipts');
drop policy if exists "gift receipt read" on storage.objects;
create policy "gift receipt read" on storage.objects for select to authenticated
  using (bucket_id = 'gift-receipts' and exists (select 1 from public.gift_baskets b
    where name = b.user_id::text || '/' || b.id::text || '.jpg'
      and ((select auth.uid()) = b.user_id or (select auth.uid()) = b.helper_id)));

commit;

-- check: the table, the functions and the bucket exist
select to_regclass('public.gift_baskets') is not null as table_ready,
       to_regprocedure('public.gift_help(uuid)') is not null as help_ready,
       to_regprocedure('public.gift_trust(uuid[])') is not null as trust_ready,
       (select public from storage.buckets where id = 'gift-receipts') = false as receipts_private;

-- To take it back out (no other table is touched):
--   drop policy if exists "gift receipt upload" on storage.objects; drop policy if exists "gift receipt replace" on storage.objects;
--   drop policy if exists "gift receipt read" on storage.objects;
--   drop function if exists public.gift_help(uuid), public.gift_receipt(uuid), public.gift_verdict(uuid, text), public.gift_trust(uuid[]);
--   drop table if exists public.gift_baskets;   (then empty and delete the gift-receipts bucket in the dashboard)
