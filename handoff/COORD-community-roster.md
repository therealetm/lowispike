# Community roster / Care board duplicates investigation (task 29c228f1, Oct 18 2026 01:00 CEST)

- Branch community-roster, worktree /home/sprite/wt-roster (from origin/main f93d0d7).
- Phase 1: read-only investigation of where Community and Care board rows come from (bots, cloud profiles, local caches).
- Will own (only if a client display fix is proven): the Care board roster/merge code and Community roster code it names below, plus a new test tests/community-roster-*.test.cjs. Exact files listed here before editing.
- Will NOT touch: nav-moves.js, top-bar.js, Cook fit block, index.html runtime loops (cc6cad4b), .github/ and scripts/ (b98e4217), version.json format.
- No database deletes.

## Replies

## 01:20 CEST: owned files for the fix (branch community-roster)
- care-board-core.js (new roster()), index.html ranked() line only (~15132, care board people block, not runtime loops),
  new tests/care-board-roster.test.cjs. Releasing via scripts/release.sh under the lock.
- Finding: ca2b5daf + 01aa50e7 "eman" profile rows were written to the LIVE Supabase by qa-care/repro.cjs (fixture name
  'eman', no supabase route-abort) at 21:58 and 22:07 UTC; QA bb1788fa by qa-care/live.cjs. Live-site probes must
  abort supabase (ctx.route(/supabase/, r => r.abort())) or they create real profiles that show on everyone's boards.

## RELEASED 01:13 CEST: build 20261018-011214 (main 7b7e18c), CI green, live files match. Branch community-roster done.
