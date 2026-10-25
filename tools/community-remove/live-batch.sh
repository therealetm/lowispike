#!/bin/bash
# ONE batched run against the real database for the admin "Remove from community" task (25 Oct 2026), so Emmanuel is asked once.
#   1. reads every profile real people can see now (before.json)
#   2. applies supabase/proposals/community_remove_20261025.sql
#   3. hides the test-run copies: anonymous accounts that never wrote a message and carry a test name ("Emmanuel" is the
#      sim harness's seed name), the same way earlier tasks hid test accounts (auth metadata lowi_test + profiles.test)
#   4. reads the visible list again (after.json)
#   5. live checks on the released site in Chrome's and Safari's engines with throwaway test accounts (one is admin for a moment)
#   6. deletes those throwaway accounts and their log rows, and checks the admin list holds only the owner again
# Usage: tools/community-remove/live-batch.sh <live-url>   (output in /tmp/cr-live/)
set -uo pipefail
cd "$(dirname "$0")/../.."
URL="${1:-https://lowispike.com/}"
OUT=/tmp/cr-live; mkdir -p "$OUT"
export SUPABASE_ACCESS_TOKEN=$(cat /home/sprite/.push-home/.sbtoken)
CLI=/tmp/supabase-cli/supabase
OWNER=83077af7-8475-4628-9328-25bd335db240
q() { (cd /home/sprite/.push-home && "$CLI" db query --linked -o json -f "$1" 2>&1); }
qs() { printf '%s\n' "$1" > "$OUT/_q.sql"; q "$OUT/_q.sql"; }
VISIBLE="select p.id, p.name, p.lv, p.xp, p.joined_at, p.created_at, p.updated_at, u.is_anonymous as anon,
  split_part(coalesce(u.email,''),'@',2) as dom, (select count(*) from public.messages m where m.user_id = p.id) as msgs,
  (select max(m.created_at) from public.messages m where m.user_id = p.id) as last_msg, u.last_sign_in_at,
  to_jsonb(p) - 'avatar' - 'photo' - 'state' - 'name' - 'lv' - 'xp' - 'id' - 'created_at' - 'updated_at' - 'joined_at' as extra
  from public.profiles p left join auth.users u on u.id = p.id
  where coalesce(p.test,false) = false and coalesce(p.bot,false) = false and coalesce(trim(p.name),'') <> ''
    and (to_regclass('public.community_kicks') is null or not exists (select 1 from public.community_kicks k where k.user_id = p.id))
  order by p.created_at"
echo "== 1. visible before"; qs "$VISIBLE;" > "$OUT/before.json"; head -c 300 "$OUT/before.json"; echo
echo "== 2. migration"; q supabase/proposals/community_remove_20261025.sql | tee "$OUT/migration.txt" | tail -15
echo "== 3. hide test-run copies"
qs "with c as (
  select p.id, p.name from public.profiles p join auth.users u on u.id = p.id
  where coalesce(p.test,false) = false and coalesce(p.bot,false) = false and u.is_anonymous
    and not exists (select 1 from public.messages m where m.user_id = p.id)
    and not exists (select 1 from public.app_admins a where a.user_id = p.id)
    and lower(trim(p.name)) ~ '^(emmanuel|eman|cr test|sim( |$)|sim test|fixture|soak|ballcheck|gift ?test|studio lock test|test( |$)|tester)'
), m as (
  update auth.users u set raw_user_meta_data = coalesce(u.raw_user_meta_data,'{}'::jsonb) || '{\"lowi_test\":true}'::jsonb from c where u.id = c.id returning u.id
), p as (
  update public.profiles p set test = true from c where p.id = c.id returning p.id
) select c.id, c.name, (select count(*) from m) as meta, (select count(*) from p) as flagged from c;" | tee "$OUT/hidden.json" | head -c 4000; echo
echo "== 4. visible after"; qs "$VISIBLE;" > "$OUT/after.json"; head -c 300 "$OUT/after.json"; echo
echo "== 5. live checks"
export CR_ADMIN_ON="bash tools/community-remove/admin-toggle.sh on {uid}"
export CR_ADMIN_OFF="bash tools/community-remove/admin-toggle.sh off {uid}"
for run in "chromium de" "webkit en"; do
  set -- $run
  timeout 900 node tools/community-remove/check.cjs "$1" "$2" "$URL" > "$OUT/live-$1.log" 2>&1; echo "exit $? $1" >> "$OUT/live-$1.log"
  grep -E "IDS|ok |FAIL|PASS|exit" "$OUT/live-$1.log"
done
echo "== 6. cleanup"
IDS=$(grep -h '^IDS ' "$OUT"/live-*.log | cut -d' ' -f2- | tr ' ' '\n' | grep -E '^[0-9a-f-]{36}$' | sort -u | sed "s/.*/'&'/" | paste -sd, -)
if [ -n "$IDS" ]; then
  qs "delete from public.app_admins where user_id in ($IDS) and user_id <> '$OWNER';
      delete from public.community_kicks where user_id in ($IDS);
      delete from public.community_removal_log where target in ($IDS) or actor in ($IDS);
      delete from public.messages where user_id in ($IDS);
      delete from public.profiles where id in ($IDS);
      delete from auth.users where id in ($IDS);" > "$OUT/cleanup.txt" 2>&1
fi
qs "select (select count(*) from public.app_admins) as admins, (select count(*) from public.app_admins where user_id = '$OWNER') as owner_is_admin,
  (select count(*) from auth.users where id in (${IDS:-'00000000-0000-0000-0000-000000000000'})) as test_accounts_left,
  (select count(*) from public.community_kicks) as removed_now, (select count(*) from public.community_removal_log) as log_rows;" | tee "$OUT/final.json"
echo "== done"
