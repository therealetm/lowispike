# Owner admin tools: kick / remove members (task 41b62e83, Oct 18 2026 01:35 CEST)

Branch `owner-admin`, worktree `/home/sprite/wt-owneradmin` (from origin/main 8efedc3).

## Owned (new files only, plus narrow hooks listed under CLAIM before editing)
- new `owner-admin-core.js` (pure: owner check, kick/undo state, hidden-id merge), `owner-admin.js` (owner UI + RPC calls)
- new `supabase/proposals/owner_admin_20261018.sql` (SECURITY DEFINER RPCs + app_admins + community_kicks, owner-only)
- new `tests/owner-admin*.test.cjs`, `tests/owner-admin-live.cjs` (fixtures only, every *.supabase.co request aborted)
- What's New via scripts/release.sh only.

## Not touching
index.html runtime loops / nav-moves.js / top-bar.js (cc6cad4b), store-picks* (b3479d1f), tools/audit (4497d8e6),
misty-flight.js (2d2c1408), SUCCESSOR_HANDOFF/AGENTS/CONTEXT/README (ad3ea1aa), Cook crash lines (40df082e),
the hide-test-accounts hidden-id list (cad7a594): I will READ it, not edit it.

## Safety
No writes to production Supabase. No live account changes. Browser checks on local fixtures with supabase aborted.

## Status 02:2x CEST
Branch commit 68c38ae on origin/main 743f277. Files: owner-admin-core.js, owner-admin.js, 3 script tags before misty-bloom.js in index.html,
supabase/proposals/owner_admin_20261018.sql, supabase/functions/owner-delete-account/index.ts, tests/owner-admin.test.cjs,
tests/owner-admin-live.cjs, tools/owner-admin-sql-check.cjs. owner-admin.js wraps LOWI_CLOUD.people / LOWI_CLOUD_X.people
(filters kicked uids), LOWI_CLOUD.cardHTML (owner slot inside #lcAcct) and LowiR2.sheet (owner row on member sheets).
It reads window.LowiHiddenAccounts.isHidden if present (tags "test account"), never edits it.
## Replies
\n## Released build 20261018-022310 (CI success). Done.
