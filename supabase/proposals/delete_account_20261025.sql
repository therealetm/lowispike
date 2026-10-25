-- LOWiSPIKE: one-transaction account delete (25 Oct 2026, Emmanuel: "Delete my account" must work; a tester got
-- "We couldn't delete your account right now").
-- Why a database function: the Edge Function used to delete the rows table by table and only then the login. Two things went
-- wrong with that: (1) the function was never deployed, so the app got a 404; (2) for anyone who ever caught a product, the
-- login delete itself fails: products.caught_by is ON DELETE SET NULL, but the lowi_rate_products BEFORE UPDATE trigger puts
-- the old caught_by back unless lowi.sys = '1', so Postgres raises 23503 products_caught_by_fkey. With the old order their
-- profile, posts and chats would already be gone while the login stayed: a half-deleted account.
-- Here everything happens in ONE transaction: either the whole account goes, or nothing changes.
-- Called only by the delete-my-account Edge Function with the service role. Nobody else may run it.
-- Applied with: supabase db query --linked -f supabase/proposals/delete_account_20261025.sql

create or replace function public.lowi_delete_account(uid uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $fn$
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

  -- the login; every other table (profiles, user_state, cycle_sync, messages, reactions, posts, post_likes, rooms,
  -- room members, product catches/deals/reports, mentoring requests, auth_handoff, vip_messages) goes with it by ON DELETE CASCADE
  delete from auth.users where id = uid;

  return jsonb_build_object('deleted', true, 'gone', false, 'media', to_jsonb(media));
end
$fn$;

revoke all on function public.lowi_delete_account(uuid) from public;
revoke all on function public.lowi_delete_account(uuid) from anon, authenticated;
grant execute on function public.lowi_delete_account(uuid) to service_role;
