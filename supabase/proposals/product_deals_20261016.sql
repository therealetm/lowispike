-- LOWiSPIKE community deals (Angebote), Oct 16, 2026. Proposal: run once in the Supabase SQL editor to make deals shared.
-- Until this table exists the app keeps posted deals on the phone only (spike-catch.js falls back quietly).
create table if not exists public.product_deals (
  id uuid primary key default gen_random_uuid(),
  product_key text not null check (char_length(product_key) between 2 and 100),
  name text not null check (char_length(name) between 2 and 80),
  barcode text not null default '' check (char_length(barcode) <= 14),
  store text not null check (char_length(store) between 2 and 40),
  price numeric(7,2) not null check (price > 0 and price < 1000),
  ends_at timestamptz not null check (ends_at > now() and ends_at < now() + interval '15 days'),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  user_name text not null default '' check (char_length(user_name) <= 40),
  created_at timestamptz not null default now()
);
create index if not exists product_deals_active on public.product_deals (ends_at);
create index if not exists product_deals_key on public.product_deals (product_key);
alter table public.product_deals enable row level security;
-- everyone signed in can read active deals; expired deals simply stop showing (the app filters ends_at > now())
create policy "deals readable" on public.product_deals for select to authenticated using (ends_at > now());
create policy "post own deals" on public.product_deals for insert to authenticated with check (user_id = auth.uid());
create policy "delete own deals" on public.product_deals for delete to authenticated using (user_id = auth.uid());
-- optional cleanup: delete from public.product_deals where ends_at < now() - interval '7 days';
