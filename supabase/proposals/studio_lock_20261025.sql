-- LOWiSPIKE Studio lock (25 Oct 2026, Emmanuel: "Studio under construction. I want it locked. So no one can see inside.
-- But I can get access ... as the admin. So maybe lock it with a password.")
--
-- Who may open Community > Studio is decided HERE, on the server, never by a flag in the app:
--   * the app owner, automatically: public.is_app_admin() over public.app_admins, the owner role production already has
--     (one row, Emmanuel's account; owner_admin_20261018.sql's is_app_owner() was never applied, so this reuses the live one);
--   * a device that typed the right PIN. The PIN is never in this repo or in the app: only a bcrypt hash, in a table
--     with RLS on and no grants, so nobody can read it through the API. studio_unlock() compares on the server and
--     is rate limited (per account and for everyone together), so a 4-digit PIN can't be guessed from the public code.
--     A right PIN returns a random device pass; only its sha256 is stored. studio_access(pass) is the server's yes/no.
--
-- Safe to run twice. Applied to production with the Management API on 25 Oct 2026.
-- To set or change the PIN (SQL editor, never commit the PIN):
--   update public.studio_lock set pin_hash = extensions.crypt('<PIN>', extensions.gen_salt('bf', 10)), updated_at = now() where id = 1;
-- To log every unlocked device out again (owner, from the app or the SQL editor): select public.studio_forget_devices();

begin;

create extension if not exists pgcrypto with schema extensions;

-- 1. The PIN (one row, hash only) ------------------------------------------------------------------
create table if not exists public.studio_lock (
  id         smallint primary key default 1 check (id = 1),
  pin_hash   text,
  updated_at timestamptz not null default now()
);
alter table public.studio_lock enable row level security;
revoke all on public.studio_lock from public, anon, authenticated;
insert into public.studio_lock(id) values (1) on conflict (id) do nothing;

-- 2. PIN tries (for the rate limit; kept 2 days) ----------------------------------------------------
create table if not exists public.studio_pin_tries (
  id  bigserial primary key,
  uid uuid,
  ok  boolean not null,
  at  timestamptz not null default now()
);
create index if not exists studio_pin_tries_at  on public.studio_pin_tries (at);
create index if not exists studio_pin_tries_uid on public.studio_pin_tries (uid, at);
alter table public.studio_pin_tries enable row level security;
revoke all on public.studio_pin_tries from public, anon, authenticated;

-- 3. Device passes (sha256 of the pass only) --------------------------------------------------------
create table if not exists public.studio_passes (
  token_hash text primary key,
  uid        uuid,
  created_at timestamptz not null default now()
);
alter table public.studio_passes enable row level security;
revoke all on public.studio_passes from public, anon, authenticated;

-- 4. May this person / device see inside Studio? ----------------------------------------------------
create or replace function public.studio_access(pass text default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_app_admin()
      or (pass is not null and length(pass) between 32 and 128
          and exists (select 1 from public.studio_passes
                      where token_hash = encode(extensions.digest(pass, 'sha256'), 'hex')));
$$;
revoke execute on function public.studio_access(text) from public;
grant  execute on function public.studio_access(text) to anon, authenticated;

-- 5. Try a PIN ---------------------------------------------------------------------------------------
-- Limits (failed tries): 5 per account per 15 minutes; 12 per hour and 60 per day for everyone together.
-- Guessing all 10,000 four-digit PINs at 60 a day takes months, and the owner never needs the PIN to get in.
create or replace function public.studio_unlock(pin text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  me  uuid := (select auth.uid());
  h   text;
  tok text;
begin
  perform pg_advisory_xact_lock(hashtext('lowispike.studio_unlock'));  -- one try at a time, so parallel guesses can't slip past the limit
  delete from public.studio_pin_tries where at < now() - interval '2 days';
  if me is not null and (select count(*) from public.studio_pin_tries
                         where uid = me and not ok and at > now() - interval '15 minutes') >= 5 then
    return jsonb_build_object('ok', false, 'reason', 'wait');
  end if;
  if (select count(*) from public.studio_pin_tries where not ok and at > now() - interval '1 hour') >= 12
     or (select count(*) from public.studio_pin_tries where not ok and at > now() - interval '1 day') >= 60 then
    return jsonb_build_object('ok', false, 'reason', 'wait');
  end if;
  select pin_hash into h from public.studio_lock where id = 1;
  if h is null then
    return jsonb_build_object('ok', false, 'reason', 'unset');
  end if;
  if pin is null or pin !~ '^[0-9]{4,8}$' or extensions.crypt(pin, h) <> h then
    insert into public.studio_pin_tries(uid, ok) values (me, false);
    return jsonb_build_object('ok', false, 'reason', 'wrong');
  end if;
  insert into public.studio_pin_tries(uid, ok) values (me, true);
  tok := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.studio_passes(token_hash, uid) values (encode(extensions.digest(tok, 'sha256'), 'hex'), me);
  return jsonb_build_object('ok', true, 'pass', tok);
end $$;
revoke execute on function public.studio_unlock(text) from public;
grant  execute on function public.studio_unlock(text) to anon, authenticated;

-- 6. Owner only: forget every unlocked device ------------------------------------------------------
create or replace function public.studio_forget_devices()
returns integer language plpgsql volatile security definer set search_path = '' as $$
declare n integer;
begin
  if not public.is_app_admin() then
    raise exception 'only the app owner can do that' using errcode = '42501';
  end if;
  delete from public.studio_passes where true;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.studio_forget_devices() from public, anon;
grant  execute on function public.studio_forget_devices() to authenticated;

commit;

notify pgrst, 'reload schema';
