-- LOWiSPIKE: the admin "Remove from community" deletes the account for real (Mon 26 Oct 2026)
-- Why: Emmanuel removed an account named "E" and it was still there: "This should be deleting their accounts. Fix it."
-- Before: community_remove() only wrote a reversible row in community_kicks (nothing deleted). It looked like the removal
-- failed because five identical throwaway accounts were all named "E" and the galaxy shows one account per name, so the next
-- "E" took the removed one's place.
-- Now: public.community_delete_account(target) runs as the signed-in admin (auth.uid(), the same guard as community_remove:
-- admins only, never yourself, never an admin, rate limited), writes a tombstone + a log row, and deletes the login and every
-- row in ONE transaction through public.lowi_delete_account. The Edge Function owner-delete-account calls it with the
-- admin's own token and removes the photo/video files after it committed.
-- Applied with: supabase db query --linked -f supabase/proposals/admin_delete_account_20261026.sql (idempotent)

-- 1. tombstones: ids of deleted accounts, so every phone also hides a person it still has in a cache (no FK on purpose: the
--    login is gone). Only ids and a time, no names. Signed-in people can read them, nobody can write them from the app.
create table if not exists public.community_deleted (
  user_id uuid primary key,
  deleted_at timestamptz not null default now()
);
alter table public.community_deleted enable row level security;
drop policy if exists community_deleted_read on public.community_deleted;
create policy community_deleted_read on public.community_deleted for select to authenticated using (true);
revoke all on public.community_deleted from anon, authenticated;
grant select on public.community_deleted to authenticated;

-- 2. the admin log knows deletes too
alter table public.community_removal_log drop constraint if exists community_removal_log_action_check;
alter table public.community_removal_log add constraint community_removal_log_action_check
  check (action = any (array['remove', 'restore', 'delete']));

-- 3. lowi_delete_account also clears the four tables that hold a person's id without a foreign key (found 26 Oct):
--    companion_rest (where their companion rests in the Room), energy_gifts (energy sent and received), studio_passes,
--    studio_pin_tries. Everything else still goes by ON DELETE CASCADE with the login.
create or replace function public.lowi_delete_account(uid uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  media text[];
  t text;
begin
  if uid is null then raise exception 'no user' using errcode = 'P0001'; end if;
  if exists (select 1 from public.app_admins a where a.user_id = uid) then
    raise exception 'owner' using errcode = 'P0001';
  end if;
  if not exists (select 1 from auth.users u where u.id = uid) then
    return jsonb_build_object('deleted', false, 'gone', true, 'media', '[]'::jsonb);
  end if;

  -- the photos and videos they uploaded: the Edge Function removes these files through the Storage API after this commits
  select coalesce(array_agg(o.name), '{}') into media from storage.objects o
   where o.bucket_id = 'media' and (o.owner = uid or o.owner_id = uid::text or o.name like uid::text || '/%');

  -- products they caught stay for everyone, without their name (lowi.sys lets the caught_by change through the trigger)
  perform set_config('lowi.sys', '1', true);
  update public.products set caught_by = null, caught_by_name = '' where caught_by = uid;
  perform set_config('lowi.sys', '', true);

  -- tables that hold their rows but have no foreign key to the login (no cascade)
  foreach t in array array['messages_archive_20261024', 'reactions_archive_20261024', 'swipe_foods'] loop
    if to_regclass('public.' || t) is not null then
      execute format('delete from public.%I where user_id = $1', t) using uid;
    end if;
  end loop;
  if to_regclass('public.companion_rest') is not null then
    execute 'delete from public.companion_rest where user_id = $1 or moved_by = $1' using uid;
  end if;
  if to_regclass('public.energy_gifts') is not null then
    execute 'delete from public.energy_gifts where from_id = $1 or to_id = $1' using uid;
  end if;
  foreach t in array array['studio_passes', 'studio_pin_tries'] loop
    if to_regclass('public.' || t) is not null then
      execute format('delete from public.%I where uid = $1', t) using uid;
    end if;
  end loop;

  -- the login; every other table (profiles with the ranking columns, user_state, cycle_sync, messages, reactions, posts,
  -- post_likes, rooms, room members, n1_energy_log, community_kicks, product catches/deals/reports, mentoring requests,
  -- auth_handoff, vip_messages, push_subs) goes with it by ON DELETE CASCADE
  delete from auth.users where id = uid;

  return jsonb_build_object('deleted', true, 'gone', false, 'media', to_jsonb(media));
end
$function$;
revoke all on function public.lowi_delete_account(uuid) from public, anon, authenticated;
grant execute on function public.lowi_delete_account(uuid) to service_role;

-- 4. the admin delete: called by the Edge Function owner-delete-account WITH THE ADMIN'S OWN TOKEN, so auth.uid() is the
--    caller and community_remove_guard does the admin check (raises not_admin for everyone else).
create or replace function public.community_delete_account(target uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare me uuid; nm text; res jsonb;
begin
  me := public.community_remove_guard(target);
  select p.name into nm from public.profiles p where p.id = target;
  insert into public.community_deleted (user_id) values (target) on conflict (user_id) do nothing;
  insert into public.community_removal_log (actor, target, action, target_name) values (me, target, 'delete', nm);
  res := public.lowi_delete_account(target);
  return res || jsonb_build_object('user_id', target, 'name', nm);
end $function$;
revoke all on function public.community_delete_account(uuid) from public, anon;
grant execute on function public.community_delete_account(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';
