#!/bin/bash
# Makes a throwaway TEST account the admin for a moment (live check only). on|off <uid>. Never touches Emmanuel's row.
set -euo pipefail
OWNER=83077af7-8475-4628-9328-25bd335db240
SB=${SB:-/tmp/sbw.sh}
[[ "$2" =~ ^[0-9a-f-]{36}$ ]] || exit 2
[ "$2" = "$OWNER" ] && exit 3
if [ "$1" = on ]; then q="insert into public.app_admins(user_id) select id from auth.users where id = '$2' and raw_user_meta_data->>'lowi_test' = 'true' on conflict do nothing"
else q="delete from public.app_admins where user_id = '$2'"; fi
"$SB" db query --linked "$q" >/dev/null 2>&1
