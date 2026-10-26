#!/bin/bash
# Runs the server test against the linked Supabase project inside ONE transaction that is always rolled back.
# Usage: tools/admin-delete/sql-test.sh [--with-migration]   (prints ALL SQL CHECKS PASSED, or the FAIL line)
set -euo pipefail
cd "$(dirname "$0")/../.."
SB=${SB:-/home/sprite/.push-home/sb.sh}
f=$(mktemp /tmp/admin-delete-XXXX.sql)
{ echo 'begin;'
  [ "${1:-}" = --with-migration ] && grep -v '^notify ' supabase/proposals/admin_delete_account_20261026.sql
  cat tools/admin-delete/sql-test.sql
  echo 'rollback;'; } > "$f"
"$SB" db query --linked -f "$f" 2>&1 | grep -v Initialising | tail -8
rm -f "$f"
