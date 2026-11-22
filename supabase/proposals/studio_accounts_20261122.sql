-- 22 Nov 2026 (Emmanuel): Studio > Profile. Each signed-in person keeps their own accounts (personas) and the Swipe file videos
-- they copy for each one. One row per person, only that person can read or write it.
create table if not exists public.studio_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  doc jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint studio_accounts_size check (pg_column_size(doc) <= 300000)
);
alter table public.studio_accounts enable row level security;
drop policy if exists studio_accounts_own_select on public.studio_accounts;
drop policy if exists studio_accounts_own_insert on public.studio_accounts;
drop policy if exists studio_accounts_own_update on public.studio_accounts;
drop policy if exists studio_accounts_own_delete on public.studio_accounts;
create policy studio_accounts_own_select on public.studio_accounts for select to authenticated using (user_id = auth.uid());
create policy studio_accounts_own_insert on public.studio_accounts for insert to authenticated with check (user_id = auth.uid());
create policy studio_accounts_own_update on public.studio_accounts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy studio_accounts_own_delete on public.studio_accounts for delete to authenticated using (user_id = auth.uid());
grant select, insert, update, delete on public.studio_accounts to authenticated;
revoke all on public.studio_accounts from anon;
