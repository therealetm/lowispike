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
/home/sprite/.push-home/sb.sh db query --linked -f "$f" >/dev/null 2>&1
rm -f "$f"
