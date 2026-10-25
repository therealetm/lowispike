-- Delete my account, 25 Oct 2026: check public.lowi_delete_account on the live database without touching any real account.
-- A throwaway login gets one row in every table that holds personal data (including a caught product, the case that used
-- to break), lowi_delete_account runs, and the block counts what is left. It always ends by raising, so Postgres rolls
-- everything back. Run: supabase db query --linked -f tools/delete-account/check-db-function.sql
do $$
declare uid uuid := gen_random_uuid(); pid uuid; rid uuid; r jsonb; left_rows int; prod record; res text;
begin
  insert into auth.users (id, aud, role, raw_user_meta_data, is_anonymous) values (uid, 'authenticated', 'authenticated', '{"lowi_test":"true"}'::jsonb, true);
  insert into public.profiles (id, name, test) values (uid, 'QA rollback', true);
  insert into public.user_state (id, data) values (uid, '{}'::jsonb);
  insert into public.cycle_sync (id, data) values (uid, '{}'::jsonb);
  insert into public.messages (id, room, user_id, who, body) values ('qa-' || uid, 'qa-rollback', uid, 'QA', 'x');
  insert into public.reactions (message_id, user_id, who, emoji) values ('qa-' || uid, uid, 'QA', 'x');
  insert into public.messages_archive_20261024 (id, room, user_id, who, body) values ('qa-a-' || uid, 'qa-rollback', uid, 'QA', 'x');
  insert into public.reactions_archive_20261024 (message_id, user_id, who, emoji) values ('qa-a-' || uid, uid, 'QA', 'x');
  insert into public.posts (id, user_id, who) values ('qa-' || uid, uid, 'QA');
  insert into public.post_likes (post_id, user_id) values ('qa-' || uid, uid);
  insert into public.swipe_foods (post_id, user_id, who, name) values ('qa-' || uid, uid, 'QA', 'QA');
  insert into public.products (name, name_key, caught_by, caught_by_name, verdict) values ('QA rollback item', 'qa rollback item', uid, 'QA', 'ok') returning id into pid;
  insert into public.product_catches (product_id, user_id, first) values (pid, uid, true);

  r := public.lowi_delete_account(uid);

  select (select count(*) from auth.users where id = uid) + (select count(*) from public.profiles where id = uid)
       + (select count(*) from public.user_state where id = uid) + (select count(*) from public.cycle_sync where id = uid)
       + (select count(*) from public.messages where user_id = uid) + (select count(*) from public.reactions where user_id = uid)
       + (select count(*) from public.messages_archive_20261024 where user_id = uid) + (select count(*) from public.reactions_archive_20261024 where user_id = uid)
       + (select count(*) from public.posts where user_id = uid) + (select count(*) from public.post_likes where user_id = uid)
       + (select count(*) from public.swipe_foods where user_id = uid) + (select count(*) from public.product_catches where user_id = uid)
    into left_rows;
  select caught_by, caught_by_name into prod from public.products where id = pid;
  res := format('result=%s rows_left=%s product_kept=%s caught_by=%s name="%s"', r, left_rows, (select count(*) from public.products where id = pid) = 1, coalesce(prod.caught_by::text, 'null'), coalesce(prod.caught_by_name, '<null>'));
  raise exception 'ROLLBACK_REPORT %', res;
end $$;
