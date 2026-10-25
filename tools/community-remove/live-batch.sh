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
URL="${1:-https://therealetm.github.io/lowispike/}"
OUT=/tmp/cr-live; mkdir -p "$OUT"
OWNER=83077af7-8475-4628-9328-25bd335db240
SQLF="$PWD"
q() { /home/sprite/.push-home/sb.sh db query --linked -o json -f "$(readlink -f "$1")" 2>&1 | grep -v "Initialising login role"; }
qs() { printf '%s\n' "$1" > "$OUT/_q.sql"; q "$OUT/_q.sql"; }
VISIBLE="select p.id, p.name, p.lv, p.xp, p.joined_at, u.created_at, p.updated_at, u.is_anonymous as anon,
  split_part(coalesce(u.email,''),'@',2) as dom, (select count(*) from public.messages m where m.user_id = p.id) as msgs,
  (select max(m.created_at) from public.messages m where m.user_id = p.id) as last_msg, u.last_sign_in_at,
  to_jsonb(p) - 'avatar' - 'photo' - 'state' - 'name' - 'lv' - 'xp' - 'id' - 'updated_at' - 'joined_at' as extra
  from public.profiles p left join auth.users u on u.id = p.id
  where coalesce(p.test,false) = false and coalesce(p.bot,false) = false and coalesce(trim(p.name),'') <> ''
    and (to_regclass('public.community_kicks') is null or not exists (select 1 from public.community_kicks k where k.user_id = p.id))
  order by u.created_at"
if [ "${LIVE_ONLY:-}" != 1 ]; then
echo "== 1. visible before"; qs "$VISIBLE;" > "$OUT/before.json"; head -c 300 "$OUT/before.json"; echo
echo "== 2. migration"; q supabase/proposals/community_remove_20261025.sql | tee "$OUT/migration.txt" | tail -15
echo "== 3. hide test-run copies"
# 17 "Emmanuel" copies confirmed by hand against the live list at 18:55 UTC on 25 Oct: Level 5, 2000 XP, birthday 1 Aug (Leo),
# 0 messages, made 14:05-16:38 UTC on 25 Oct by our own live test runs (16 anonymous + the Studio lock test login @lowispike.test).
# The guard repeats every condition, so a real account can never be caught even if an id were wrong.
HIDE="'69b30697-7539-4234-8359-8b378f497489','97dc1e83-90cd-403a-8a51-4902a9d227e6','364c8ecf-0831-46f5-9cae-f16daef8b194','e9515f99-d917-415c-97f5-67d5742024fd','ef400ac3-0920-4df5-b838-805f230be855','93f3081c-b203-4e28-a861-68a6199b406d','fe291277-de99-4432-8d9c-f137a8116612','fae197fa-56e9-477b-92a0-ed36498d3035','8dc379a7-a6b4-44f8-8303-55d1731a4174','f7fc9b0a-2916-4b20-973d-45985d1d65b4','47bc7906-14ca-43e7-bc55-43ef33b0c28c','2f5b1f7a-0918-4419-8852-c6b961ed887a','bbb1fa90-080c-4bbf-8a0d-10421bcf061b','7e279d5e-b89c-45de-aa5d-3b8855a9897c','22104164-1738-456c-9126-cc6ddc21b99e','e24c5b7d-e5c0-474c-9590-bfe686b8e11b','86c91769-fded-4ae6-a4a3-e62cc8c71b59'"
qs "with c as (
  select p.id, p.name from public.profiles p join auth.users u on u.id = p.id
  where p.id in ($HIDE) and p.name = 'Emmanuel' and p.lv = 5 and coalesce(p.bot,false) = false
    and not exists (select 1 from public.messages m where m.user_id = p.id)
    and not exists (select 1 from public.app_admins a where a.user_id = p.id)
    and p.id <> '$OWNER'
), m as (
  update auth.users u set raw_user_meta_data = coalesce(u.raw_user_meta_data,'{}'::jsonb) || '{\"lowi_test\":true}'::jsonb from c where u.id = c.id returning u.id
), p as (
  update public.profiles p set test = true from c where p.id = c.id returning p.id
) select c.id, c.name, (select count(*) from m) as meta, (select count(*) from p) as flagged from c;" | tee "$OUT/hidden.json" | head -c 4000; echo
echo "== 4. visible after"; qs "$VISIBLE;" > "$OUT/after.json"; head -c 300 "$OUT/after.json"; echo
fi
echo "== 5. live checks"
export CR_ADMIN_ON="bash tools/community-remove/admin-toggle.sh on {uid}"
export CR_ADMIN_OFF="bash tools/community-remove/admin-toggle.sh off {uid}"
IFS=, read -ra RL <<< "${RUNS:-chromium de,webkit en}"
for run in "${RL[@]}"; do
  set -- $run
  timeout 900 node tools/community-remove/check.cjs "$1" "$2" "$URL" > "$OUT/live-$1.log" 2>&1; echo "exit $? $1" >> "$OUT/live-$1.log"
  grep -E "IDS|ok |FAIL|PASS|exit" "$OUT/live-$1.log"
done
echo "== 6. cleanup"
bash "$(dirname "$0")/cleanup.sh" "$OUT"
echo "== done"
