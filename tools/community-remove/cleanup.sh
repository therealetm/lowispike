#!/usr/bin/env bash
# Deletes every throwaway account a live check wrote to $1/live-*.log (IDS lines), and any admin rights it had.
# Never touches the owner. Prints what is left so the run proves it.
set -u
OUT="${1:-/tmp/cr-live}"
OWNER=83077af7-8475-4628-9328-25bd335db240
q() { local f; f=$(mktemp /tmp/cr-q.XXXX.sql); printf '%s\n' "$1" > "$f"; /home/sprite/.push-home/sb.sh db query --linked -o json -f "$f" 2>&1 | grep -v "Initialising login role"; rm -f "$f"; }
IDS=$(grep -h '^IDS ' "$OUT"/live-*.log 2>/dev/null | cut -d' ' -f2- | tr ' ' '\n' | grep -E '^[0-9a-f-]{36}$' | grep -v "$OWNER" | sort -u | sed "s/.*/'&'/" | paste -sd, -)
if [ -n "$IDS" ]; then
  q "delete from public.app_admins where user_id in ($IDS) and user_id <> '$OWNER';
     delete from public.community_kicks where user_id in ($IDS);
     delete from public.community_removal_log where target in ($IDS) or actor in ($IDS);
     delete from public.messages where user_id in ($IDS);
     delete from public.profiles where id in ($IDS) and id <> '$OWNER';
     delete from auth.users where id in ($IDS) and id <> '$OWNER';" > "$OUT/cleanup.txt" 2>&1
fi
q "select (select count(*) from public.app_admins) as admins, (select count(*) from public.app_admins where user_id = '$OWNER') as owner_is_admin,
  (select count(*) from auth.users where id in (${IDS:-'00000000-0000-0000-0000-000000000000'})) as test_accounts_left,
  (select count(*) from public.profiles where id in (${IDS:-'00000000-0000-0000-0000-000000000000'})) as test_profiles_left,
  (select count(*) from public.community_kicks) as removed_now, (select count(*) from public.community_removal_log) as log_rows;" | tee "$OUT/final.json"
