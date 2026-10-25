#!/bin/bash
# Runs supabase/proposals/community_remove_20261025.sql on a throwaway local Postgres and checks the server rules:
# only the admin can remove and restore, never himself, a removed person's profile and messages vanish for others
# but not for themself, they cannot post, restore brings everything back, every action is logged, the rate limit holds.
# Needs a local Postgres (sudo service postgresql start). Usage: tools/community-remove/test-sql.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=community_remove_test
P() { sudo -u postgres psql -X -q -v ON_ERROR_STOP=1 -d "$DB" "$@"; }
sudo -u postgres dropdb --if-exists "$DB" >/dev/null
sudo -u postgres createdb "$DB"
P -f tools/community-remove/local-pg-stub.sql >/dev/null
P -f supabase/proposals/community_remove_20261025.sql 2>&1 | grep -i "notice" || true
P -f supabase/proposals/community_remove_20261025.sql >/dev/null 2>&1   # twice: safe to run again
OWNER=83077af7-8475-4628-9328-25bd335db240; ANTJE=11111111-1111-4111-8111-111111111111; STRANGER=22222222-2222-4222-8222-222222222222; Q=33333333-3333-4333-8333-333333333333
as() { # as <role> <uid|-> <sql>
  local claims='{"role":"'"$1"'"}'; [ "$2" != "-" ] && claims='{"role":"'"$1"'","sub":"'"$2"'"}'
  P -At -c "set role $1; select set_config('request.jwt.claims', '$claims', false); $3" 2>&1 | grep -v '^CONTEXT\|^PL/pgSQL\|^SQL statement' | tail -1
}
fail=0; ok() { if [ "$2" = "$3" ]; then echo "  ok   $1"; else echo "  FAIL $1: got '$2' want '$3'"; fail=1; fi; }
has() { if printf '%s' "$2" | grep -q "$3"; then echo "  ok   $1"; else echo "  FAIL $1: got '$2' want *$3*"; fail=1; fi; }
ok  "admin check: owner" "$(as authenticated $OWNER 'select public.community_is_admin()')" t
ok  "admin check: normal account" "$(as authenticated $ANTJE 'select public.community_is_admin()')" f
has "anon cannot ask" "$(as anon - 'select public.community_is_admin()')" "permission denied"
has "normal account cannot remove" "$(as authenticated $ANTJE "select public.community_remove('$STRANGER')")" "not_admin"
has "anon cannot remove" "$(as anon - "select public.community_remove('$STRANGER')")" "permission denied"
has "normal account cannot read the list" "$(as authenticated $ANTJE 'select count(*) from public.community_removed_list()')" "not_admin"
has "nobody can call the guard directly" "$(as authenticated $OWNER "select public.community_remove_guard('$STRANGER')")" "permission denied"
has "nobody can write kicks directly" "$(as authenticated $OWNER "insert into public.community_kicks(user_id) values ('$STRANGER')")" "permission denied"
has "nobody can read the log" "$(as authenticated $OWNER 'select count(*) from public.community_removal_log')" "permission denied"
has "admin cannot remove himself" "$(as authenticated $OWNER "select public.community_remove('$OWNER')")" "not_yourself"
ok  "before: Antje sees the stranger's profile" "$(as authenticated $ANTJE "select count(*) from public.profiles where id='$STRANGER'")" 1
has "admin removes the stranger" "$(as authenticated $OWNER "select public.community_remove('$STRANGER')")" '"removed": true'
ok  "removing twice is harmless" "$(as authenticated $OWNER "select (public.community_remove('$STRANGER'))->>'removed'")" true
ok  "after: Antje no longer sees the profile" "$(as authenticated $ANTJE "select count(*) from public.profiles where id='$STRANGER'")" 0
ok  "after: Antje no longer sees the messages" "$(as authenticated $ANTJE "select count(*) from public.messages where user_id='$STRANGER'")" 0
ok  "after: Antje still sees her own and Q" "$(as authenticated $ANTJE "select count(*) from public.profiles where id in ('$ANTJE','$Q')")" 2
ok  "the removed person still sees their own profile" "$(as authenticated $STRANGER "select count(*) from public.profiles where id='$STRANGER'")" 1
ok  "the removed person is told" "$(as authenticated $STRANGER 'select public.community_am_removed()')" t
ok  "others are not removed" "$(as authenticated $ANTJE 'select public.community_am_removed()')" f
has "the removed person cannot post" "$(as authenticated $STRANGER "insert into public.messages(user_id, body) values ('$STRANGER', 'x')")" "row-level security"
ok  "others can still post" "$(as authenticated $ANTJE "insert into public.messages(user_id, body) values ('$ANTJE', 'y') returning 1")" 1
ok  "everyone may read the removed ids" "$(as authenticated $ANTJE "select count(*) from public.community_kicks where user_id='$STRANGER'")" 1
has "but not who removed them" "$(as authenticated $ANTJE 'select kicked_by from public.community_kicks')" "permission denied"
ok  "admin list shows the name" "$(as authenticated $OWNER "select name from public.community_removed_list() where user_id='$STRANGER'")" Emmanuel
has "normal account cannot restore" "$(as authenticated $ANTJE "select public.community_restore('$STRANGER')")" "not_admin"
has "admin restores" "$(as authenticated $OWNER "select public.community_restore('$STRANGER')")" '"removed": false'
ok  "after restore: Antje sees the profile again" "$(as authenticated $ANTJE "select count(*) from public.profiles where id='$STRANGER'")" 1
ok  "after restore: and the messages" "$(as authenticated $ANTJE "select count(*) from public.messages where user_id='$STRANGER'")" 1
ok  "nothing was deleted" "$(P -At -c "select count(*) from public.profiles")" 4
ok  "every action is logged with who, whom, what" "$(P -At -c "select string_agg(action||':'||target_name, ',' order by id) from public.community_removal_log where actor='$OWNER' and target='$STRANGER'")" "remove:Emmanuel,remove:Emmanuel,restore:Emmanuel"
ok  "posts has no RLS, left alone" "$(P -At -c "select count(*) from pg_policies where tablename='posts'")" 0
P -c "insert into public.community_removal_log(actor, target, action) select '$OWNER', '$Q', 'remove' from generate_series(1, 27)"
has "rate limit: 30 in 10 minutes" "$(as authenticated $OWNER "select public.community_remove('$Q')")" "rate_limited"
ok  "rate limit blocked the write" "$(P -At -c "select count(*) from public.community_kicks where user_id='$Q'")" 0
sudo -u postgres dropdb "$DB"
if [ $fail = 0 ]; then echo "ALL SQL CHECKS PASSED"; else echo "SQL CHECKS FAILED"; exit 1; fi
