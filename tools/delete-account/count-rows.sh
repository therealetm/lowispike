#!/usr/bin/env bash
# Count what is left of one account on the live database (25 Oct 2026, Delete my account proof). Usage: count-rows.sh <uuid>
# Needs the Supabase CLI logged in on this VM (supabase login --no-browser). Prints one JSON line. Reads only.
set -euo pipefail
uid="$1"
[[ "$uid" =~ ^[0-9a-f-]{36}$ ]] || { echo "bad uuid" >&2; exit 2; }
SB="${SUPABASE_BIN:-/tmp/supabase-cli/supabase}"
q="select json_build_object(
 'auth_users',(select count(*) from auth.users where id='$uid'),
 'identities',(select count(*) from auth.identities where user_id='$uid'),
 'sessions',(select count(*) from auth.sessions where user_id='$uid'),
 'profiles',(select count(*) from public.profiles where id='$uid'),
 'user_state',(select count(*) from public.user_state where id='$uid'),
 'cycle_sync',(select count(*) from public.cycle_sync where id='$uid'),
 'messages',(select count(*) from public.messages where user_id='$uid'),
 'reactions',(select count(*) from public.reactions where user_id='$uid'),
 'posts',(select count(*) from public.posts where user_id='$uid'),
 'post_likes',(select count(*) from public.post_likes where user_id='$uid'),
 'swipe_foods',(select count(*) from public.swipe_foods where user_id='$uid'),
 'product_catches',(select count(*) from public.product_catches where user_id='$uid'),
 'products_caught',(select count(*) from public.products where caught_by='$uid'),
 'user_rooms',(select count(*) from public.user_rooms where owner_id='$uid'),
 'auth_handoff',(select count(*) from public.auth_handoff where user_id='$uid'),
 'media_files',(select count(*) from storage.objects where bucket_id='media' and (owner='$uid' or name like '$uid/%')),
 'is_test',(select coalesce(bool_or(test),false) from public.profiles where id='$uid')) as r;"
# the CLI wants a folder with supabase/config.toml (made once with: supabase init)
WORK="${SUPABASE_WORKDIR:-/tmp/sbwork}"; [ -f "$WORK/supabase/config.toml" ] || (mkdir -p "$WORK" && cd "$WORK" && "$SB" init --yes >/dev/null)
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
printf '%s\n' "$q" > "$tmp/q.sql"
cd "$WORK" && { "$SB" db query --linked --project-ref vnfwmifmsfecascwaody -f "$tmp/q.sql" -o json 2>"$tmp/err" || { cat "$tmp/err" >&2; exit 1; }; } | python3 -c "import json,sys; d=json.load(sys.stdin); r=d[0]['r'] if isinstance(d,list) else d; print(json.dumps(r if isinstance(r,dict) else json.loads(r)))"
