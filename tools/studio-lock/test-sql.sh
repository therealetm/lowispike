#!/bin/bash
# Runs supabase/proposals/studio_lock_20261025.sql on a throwaway local Postgres database and checks the server rules:
# nobody can read the PIN hash or the tables, the owner gets in, a wrong PIN is refused, the right one gives a pass that
# studio_access accepts, and the rate limits hold. The PIN used here is a local test PIN, never the real one.
# Needs a local Postgres (sudo service postgresql start). Usage: tools/studio-lock/test-sql.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=studio_lock_test
P() { sudo -u postgres psql -X -q -v ON_ERROR_STOP=1 -d "$DB" "$@"; }
sudo -u postgres dropdb --if-exists "$DB" >/dev/null
sudo -u postgres createdb "$DB"
P -c "create extension pgcrypto with schema extensions" 2>/dev/null || { P -c "create schema if not exists extensions"; P -c "create extension pgcrypto with schema extensions"; }
P -f tools/studio-lock/local-pg-stub.sql
P -f supabase/proposals/studio_lock_20261025.sql 2>&1 | grep -v "^NOTIFY" || true
P -f supabase/proposals/studio_lock_20261025.sql >/dev/null 2>&1   # twice: safe to run again
P -c "update public.studio_lock set pin_hash = extensions.crypt('4321', extensions.gen_salt('bf', 10)) where id = 1"
OWNER=83077af7-8475-4628-9328-25bd335db240; U1=11111111-1111-4111-8111-111111111111; U2=22222222-2222-4222-8222-222222222222
as() { # as <role> <uid|-> <sql>
  local claims='{"role":"'"$1"'"}'; [ "$2" != "-" ] && claims='{"role":"'"$1"'","sub":"'"$2"'"}'
  P -At -c "set role $1; select set_config('request.jwt.claims', '$claims', false); $3" | tail -1
}
fail=0; ok() { if [ "$2" = "$3" ]; then echo "  ok   $1"; else echo "  FAIL $1: got '$2' want '$3'"; fail=1; fi; }
ok "anon cannot read the PIN hash" "$(as anon - 'select pin_hash from public.studio_lock' 2>&1 | grep -c 'permission denied')" 1
ok "signed-in cannot read the PIN hash" "$(as authenticated $U1 'select pin_hash from public.studio_lock' 2>&1 | grep -c 'permission denied')" 1
ok "signed-in cannot read passes" "$(as authenticated $U1 'select count(*) from public.studio_passes' 2>&1 | grep -c 'permission denied')" 1
ok "signed-in cannot read tries" "$(as authenticated $U1 'select count(*) from public.studio_pin_tries' 2>&1 | grep -c 'permission denied')" 1
ok "owner gets in with no pass" "$(as authenticated $OWNER 'select public.studio_access(null)')" t
ok "normal account is locked" "$(as authenticated $U1 'select public.studio_access(null)')" f
ok "signed out is locked" "$(as anon - 'select public.studio_access(null)')" f
ok "a made-up pass is refused" "$(as authenticated $U1 "select public.studio_access(repeat('a',48))")" f
ok "wrong PIN refused" "$(as authenticated $U1 "select public.studio_unlock('1111')->>'reason'")" wrong
ok "letters refused" "$(as authenticated $U1 "select public.studio_unlock('abcd')->>'reason'")" wrong
R=$(as authenticated $U1 "select public.studio_unlock('4321')::text")
ok "right PIN opens" "$(echo "$R" | python3 -c 'import sys,json; d=json.load(sys.stdin); print(d["ok"], len(d["pass"]))')" "True 48"
PASS=$(echo "$R" | python3 -c 'import sys,json; print(json.load(sys.stdin)["pass"])')
ok "pass opens Studio on that device" "$(as authenticated $U1 "select public.studio_access('$PASS')")" t
ok "pass also opens signed out (same device)" "$(as anon - "select public.studio_access('$PASS')")" t
ok "only the pass hash is stored" "$(P -At -c "select count(*) from public.studio_passes where token_hash = '$PASS'")" 0
ok "normal account cannot forget devices" "$(as authenticated $U1 'select public.studio_forget_devices()' 2>&1 | grep -c 'only the app owner')" 1
# rate limit per account: 5 wrong in 15 min, then even the right PIN waits
for i in 1 2 3 4; do as authenticated $U2 "select public.studio_unlock('000$i')" >/dev/null; done
ok "5th wrong still answered" "$(as authenticated $U2 "select public.studio_unlock('0005')->>'reason'")" wrong
ok "after 5 wrong the account waits" "$(as authenticated $U2 "select public.studio_unlock('4321')->>'reason'")" wait
# rate limit for everyone together: 12 wrong an hour (U1 2 + U2 5 so far)
for i in 1 2 3 4 5; do as anon - "select public.studio_unlock('99$i$i')" >/dev/null; done
ok "after 12 wrong in an hour everyone waits" "$(as authenticated $U1 "select public.studio_unlock('4321')->>'reason'")" wait
ok "the owner still gets in while the PIN waits" "$(as authenticated $OWNER 'select public.studio_access(null)')" t
ok "owner can forget devices" "$(as authenticated $OWNER 'select public.studio_forget_devices()')" 1
ok "forgotten pass no longer opens" "$(as authenticated $U1 "select public.studio_access('$PASS')")" f
sudo -u postgres dropdb "$DB"
[ $fail = 0 ] && echo "studio lock SQL: all checks passed" || { echo "studio lock SQL: FAILED"; exit 1; }
