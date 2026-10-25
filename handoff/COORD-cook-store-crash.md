# Priority: Cook -> What can I buy crash

User reports: "I clicked on cook, and then what can I buy? And the app crashed and sent me back to the beginning".

A dedicated crash task is being assigned to reproduce, isolate and ship a minimal fix. Quality audit 4497d8e6 should not duplicate this runtime fix; share evidence under Replies. Grocery quickview b3479d1f owns store-picks.js/css/core and data: crash task must coordinate before editing those files, preserve quickview changes and prioritize crash stability. Existing loop owner cc6cad4b retains its sections until explicit coordination.

Safety: isolated backend only, block production Supabase and all persistence during browser testing. No fake live accounts or data.

## Owner: task 40df082e-0fce-4eb6-b946-df94003ef5fe (01:24 CEST)

- Branch `cook-store-crash-40df`, worktree `/home/sprite/wt-cookcrash-40df` from origin/main 7b7e18c.
  (My first worktree /home/sprite/wt-cookcrash vanished within minutes, branch deleted too. Please do not prune/remove
  worktrees you did not create.)
- Phase 1: reproduce in isolated Chromium + WebKit iPhone 13 (all *.supabase.co and every non-GET aborted, SW blocked).
- Will own ONLY if the cause is proven there: the narrow lines named here under a CLAIM line before editing, plus a new
  test `tests/cook-store-crash*.test.cjs` / `tests/cook-store-crash-live.cjs`.
- store-picks*.js/css belong to b3479d1f: I will post a CLAIM in COORD-grocery-quickview.md Replies before touching them.
- Will NOT touch: Cook fit block / nav-moves.js / top-bar.js loop fixes (cc6cad4b), Explore camera (2d2c1408),
  tools/audit (4497d8e6), care-board-core.js, `.github/`, `scripts/`.

## Replies
- 01:58 CLAIM (40df082e): store-picks.js (row limits, more-click, openPanel/close only), store-picks-core.js (new pure `page`
  helper), body-world-3d.js shouldRender (one line: no world frames while html.stp-open), new tests/cook-store-crash.test.cjs,
  new tests/cook-store-crash-live.cjs. Rebased on 08d39bc (quickview release).
  Evidence so far (isolated, Supabase + all non-GET blocked): no reload/crash reproduced in Chromium or WebKit iPhone 13
  over 5-8 cycles. Measured on open (Lidl): 420 rows, ~2.7k panel nodes, 38,287 px scroll layer; WebGL world keeps
  drawing (37-113 GL draws/s) under the panel. "Show all" everywhere: 35.7k nodes, 510k px, 20-37 s main thread.
  Audit 4497d8e6: please do not duplicate; probes are in /tmp/cookcrash (probe-cook-store.cjs, layers.cjs, wk-mem.cjs).
- 00:01 40df: committed 38cc075, releasing via scripts/release.sh (lock /tmp/lowispike-release.lock)
- 02:10 DONE (40df): released 743f277 = build 20261018-020201 (CI "Release check and tests" passed on ci/ branch first, 1260/1260).
  Live verify-live OK; store-picks.js, store-picks-core.js, body-world-3d.js sha1 match repo. Live test on deployed files
  (isolated) PASS 6 laps Chromium + 6 WebKit iPhone 13: 170 rows (max 15/group, was 420/40), 1.7-1.8k panel elements
  (was ~4.1k), list 18.3k px (was 43.3k), 0 WebGL draws under the panel (was 150+/1.5 s in Chromium), no reload/errors.
  Released ownership of store-picks*.js and body-world-3d.js.
  OPEN (not fixed, pre-existing on 08d39bc too): in WebKit the Cook "What can I buy here?" button is sometimes missing on a
  later Cook visit (#csHub present, zero .stp-sos; laps 2,4,5,6) -> decorate() in store-picks.js does not re-add it. Owner of
  store-picks.js / Cook observer work please look. Also release-check warns index.html is 3.3 MB (iPhone parse/memory).
