#!/bin/bash
# admin-toggle.sh on|off <uid>: makes a throwaway TEST account admin for a moment during tools/community-remove/check.cjs, and back.
# Never touches the owner's row.
set -euo pipefail
OWNER=83077af7-8475-4628-9328-25bd335db240
[[ "$2" =~ ^[0-9a-f-]{36}$ ]] || exit 2
[ "$2" = "$OWNER" ] && exit 3
f=$(mktemp /tmp/cr-admin-XXXX.sql)
if [ "$1" = on ]; then echo "insert into public.app_admins(user_id) values ('$2') on conflict do nothing;" > "$f"
else echo "delete from public.app_admins where user_id = '$2';" > "$f"; fi
cd /home/sprite/.push-home && SUPABASE_ACCESS_TOKEN=$(cat /home/sprite/.push-home/.sbtoken) /tmp/supabase-cli/supabase db query --linked -f "$f" >/dev/null
rm -f "$f"
