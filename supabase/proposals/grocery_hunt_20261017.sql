-- LOWiSPIKE grocery hunt (Oct 17, 2026): shared, shop-tied finds and food combos, so one shopper's find becomes a hint for others.
-- STATUS: proposal. Not applied by the app. Until someone with Supabase admin access runs this in the SQL editor, the hunt works on
-- each phone only and says so (grocery-hunt.js: "Sharing with other shoppers isn't switched on yet").
-- Privacy: a row holds the shop (a public OpenStreetMap shop id and name), the product (name, barcode, generic kind, the app's
-- estimate) and how it was caught (barcode or photo). No position, no photo, no display name. Rows are only written after the user
-- turns on "Share my finds" in the hunt. Each user can delete their own rows. Finds older than 60 days are not read by the app.

create table if not exists public.grocery_finds (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  store_id text not null check (char_length(store_id) between 1 and 40),
  store_name text not null default '' check (char_length(store_name) <= 60),
  product_key text not null check (char_length(product_key) between 3 and 70),
  name text not null check (char_length(name) between 1 and 80),
  barcode text not null default '' check (barcode ~ '^[0-9]{0,14}$'),
  kind text not null default '' check (char_length(kind) <= 20),
  verdict text not null default '' check (verdict in ('', 'spike', 'mild', 'none', 'unknown')),
  method text not null check (method in ('barcode', 'photo')),
  found_at timestamptz not null default now(),
  unique (user_id, store_id, product_key)
);
create index if not exists grocery_finds_store on public.grocery_finds (store_id, found_at desc);
alter table public.grocery_finds enable row level security;
create policy grocery_finds_read on public.grocery_finds for select to authenticated using (true);
create policy grocery_finds_insert on public.grocery_finds for insert to authenticated with check (user_id = auth.uid());
create policy grocery_finds_update on public.grocery_finds for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy grocery_finds_delete on public.grocery_finds for delete to authenticated using (user_id = auth.uid());

create table if not exists public.grocery_combos (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  store_id text not null default '' check (char_length(store_id) <= 40),
  name text not null check (char_length(name) between 1 and 40),
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 2 and 4),
  created_at timestamptz not null default now()
);
create index if not exists grocery_combos_store on public.grocery_combos (store_id, created_at desc);
alter table public.grocery_combos enable row level security;
create policy grocery_combos_read on public.grocery_combos for select to authenticated using (true);
create policy grocery_combos_insert on public.grocery_combos for insert to authenticated with check (user_id = auth.uid());
create policy grocery_combos_delete on public.grocery_combos for delete to authenticated using (user_id = auth.uid());
