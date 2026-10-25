-- Delete my account, 25 Oct 2026: reproduce the database failure without touching any real account.
-- A throwaway auth user is made inside this block, catches one throwaway product, then the login is deleted the way
-- auth.admin.deleteUser() does it. The block always ends by raising, so Postgres rolls everything back: nothing stays.
do $$
declare uid uuid := gen_random_uuid(); pid uuid; res text;
begin
  insert into auth.users (id, aud, role, raw_user_meta_data, is_anonymous) values (uid, 'authenticated', 'authenticated', '{"lowi_test":"true"}'::jsonb, true);
  insert into public.products (name, name_key, caught_by, caught_by_name, verdict) values ('QA rollback item', 'qa rollback item', uid, 'QA', 'ok') returning id into pid;
  begin
    delete from auth.users where id = uid;
    res := 'login delete OK';
  exception when others then
    res := 'login delete FAILED: ' || sqlstate || ' ' || sqlerrm;
  end;
  raise exception 'ROLLBACK_REPORT %', res;
end $$;
