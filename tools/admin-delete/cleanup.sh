#!/bin/bash
# Deletes the throwaway TEST accounts a live check made (only logins with lowi_test:true, never anyone else), with a tombstone.
# Usage: tools/admin-delete/cleanup.sh <uid> [uid...]
set -euo pipefail
SB=${SB:-/home/sprite/bin/sbw.sh}
for id in "$@"; do
  [[ "$id" =~ ^[0-9a-f-]{36}$ ]] || continue
  "$SB" db query --linked "delete from public.app_admins where user_id = '$id';
    select public.lowi_delete_account(id) from auth.users where id = '$id' and raw_user_meta_data->>'lowi_test' = 'true';
    insert into public.community_deleted(user_id) select '$id' where not exists (select 1 from auth.users where id = '$id') on conflict do nothing;" -o csv 2>&1 | grep -v Initialis | tail -1
done
