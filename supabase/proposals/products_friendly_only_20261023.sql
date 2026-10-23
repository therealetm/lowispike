-- 23 Oct 2026, bubble catch: the shared product database (public.products, the Bubble Dex) keeps insulin-friendly products only.
-- FOR THE OWNER TO RUN once in the Supabase dashboard (SQL Editor > New query > Run) as the project owner. Nothing here runs
-- by itself. Safe to run twice.
--
-- Why (Eman, Oct 23): "Everything that's under Spike doesn't have to be saved extra, cuz when they search for it, they find it,
-- and they skip it. I think we should focus more on just having a database of insulin-friendly snack products."
-- Since build feat/bubble-catch-20261023 the app only publishes a product whose verdict is "ok" (green), the Bubble catch
-- button only appears for green products, and the app hides any non-green row it still downloads. This file does the database
-- side: it removes the rows that are already there and stops new ones.
--
-- What it touches: public.products and the shared catch records in public.product_catches that point at the removed rows.
-- What it does NOT touch: anybody's food log, meals, scans, history, profile or the products saved on their own phone.
-- Those live in other tables or on the phone, and they stay as they are.
--
-- Step 0 (optional, read only): see what would go.
--   select verdict, count(*) from public.products group by verdict order by 2 desc;
--
-- Undo: the removed rows are copied to private.products_removed_20261023 (and their catches to
-- private.product_catches_removed_20261023) first, so they can be put back with an insert ... select.
-- To undo the guard: drop trigger if exists products_friendly_only on public.products;
--                    drop function if exists public.products_friendly_only();

begin;

-- 1) keep a private copy of what goes (not reachable from the app: the private schema isn't exposed to the API)
create schema if not exists private;
revoke all on schema private from anon, authenticated;

create table if not exists private.products_removed_20261023 as
  select * from public.products where false;
insert into private.products_removed_20261023
  select p.* from public.products p
  where coalesce(p.verdict, '') <> 'ok'
    and not exists (select 1 from private.products_removed_20261023 r where r.id = p.id);

do $$
begin
  if to_regclass('public.product_catches') is not null then
    execute 'create table if not exists private.product_catches_removed_20261023 as select * from public.product_catches where false';
    execute 'insert into private.product_catches_removed_20261023
               select c.* from public.product_catches c
               join public.products p on p.id = c.product_id
               where coalesce(p.verdict, '''') <> ''ok''';
    -- 2) remove the shared catch records of non-friendly products (works with or without on delete cascade)
    execute 'delete from public.product_catches c
               using public.products p
               where p.id = c.product_id and coalesce(p.verdict, '''') <> ''ok''';
  end if;
end $$;

-- 3) remove every product that isn't insulin-friendly (verdict other than ok: better, spike, unknown or empty)
delete from public.products where coalesce(verdict, '') <> 'ok';

-- 4) guard: a signed-in or anonymous request can only add or keep green products. Writes from the SQL editor or the service
--    role (no signed-in user) are left alone, so the owner can still fix a row. It raises an error, the same way the app's own
--    check does (index.html pushOne), so a forged insert fails instead of being stored.
create or replace function public.products_friendly_only() returns trigger
language plpgsql set search_path = '' as $$
declare
  req_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
begin
  if req_role = '' then
    begin req_role := coalesce((nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'), ''); exception when others then req_role := ''; end;
  end if;
  if req_role not in ('authenticated', 'anon') then return new; end if;
  if coalesce(new.verdict, '') <> 'ok' then
    raise exception 'Only insulin-friendly products join the shared database' using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists products_friendly_only on public.products;
create trigger products_friendly_only before insert or update of verdict on public.products
  for each row execute function public.products_friendly_only();

commit;

-- After running: select verdict, count(*) from public.products group by verdict;  -> only 'ok' is left.
