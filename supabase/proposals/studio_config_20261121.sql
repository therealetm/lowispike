-- LOWiSPIKE Studio: the owner's folders, order data and added videos (21 Nov 2026, Emmanuel: "as an admin I should be able to
-- manually easily add new things" / "I should be able to rename them and also organise things into the right folders").
--
-- One row (id = 'main') holds one JSON document the Studio page reads on top of studio/cards.json:
--   {v:1, folders:[{id,name,sys?}], items:{<cardId>:{f:[folderId], hide:bool, views:number}}, added:[{id,title,creator,link,hook,views,steps,thumb,f,ts}]}
-- Security (same model as owner_admin_20261018.sql):
--   * Everyone (signed in or not) may READ the row: Studio is public.
--   * Nobody may write the table directly. The only write path is public.studio_save(doc), SECURITY DEFINER with
--     search_path = '', which checks public.is_app_owner() (public.app_admins) on the server first.
--   * The document is capped at 400 KB so a mistake cannot fill the database.
-- Safe to run twice. Nothing else is touched.
begin;

create table if not exists public.studio_config (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
alter table public.studio_config enable row level security;
revoke all on public.studio_config from anon, authenticated;
grant select on public.studio_config to anon, authenticated;
drop policy if exists "studio config readable by everyone" on public.studio_config;
create policy "studio config readable by everyone" on public.studio_config for select to anon, authenticated using (true);

create or replace function public.studio_save(doc jsonb)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare t timestamptz := now();
begin
  if not coalesce(public.is_app_owner(), false) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if doc is null or jsonb_typeof(doc) <> 'object' then
    raise exception 'bad document' using errcode = '22023';
  end if;
  if octet_length(doc::text) > 400000 then
    raise exception 'document too large' using errcode = '22023';
  end if;
  insert into public.studio_config (id, data, updated_at, updated_by)
  values ('main', doc, t, (select auth.uid()))
  on conflict (id) do update set data = excluded.data, updated_at = excluded.updated_at, updated_by = excluded.updated_by;
  return t;
end $$;
revoke execute on function public.studio_save(jsonb) from public, anon;
grant  execute on function public.studio_save(jsonb) to authenticated;

commit;
