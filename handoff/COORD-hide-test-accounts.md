# Hide test accounts from Community and Care board (task cad7a594, Oct 18 2026 01:30 CEST)

Branch `hide-test-accounts`, worktree /home/sprite/wt-hidetest (from origin/main 8efedc3).

## Goal
Hide leftover test accounts (Emma, Gatey, Guesty, Test, QA, the two fake "eman" rows ca2b5daf / 01aa50e7) from the
Community galaxy and the Care board, client-side only, by stable account id. Nothing deleted in Supabase.

## Owned (claimed before editing; exact lines listed below once found)
- NEW `hidden-accounts.js` (one small documented list of hidden account ids + pure helpers, UMD) for the owner admin
  task to reuse.
- care-board-core.js roster(): filter call only.
- The Community roster code (community galaxy / index.html roster block): filter call only. Exact lines posted here.
- NEW tests/hidden-accounts.test.cjs, NEW tests/hidden-accounts-live.cjs (fixtures, Supabase aborted).
- What's New entry via scripts/release.sh.

## Not touching
nav-moves.js, top-bar.js, index.html runtime loops (cc6cad4b), store-picks* (b3479d1f), misty-flight.js (2d2c1408),
tools/audit (4497d8e6), Cook crash lines (40df082e), docs AGENTS/CONTEXT/README/SUCCESSOR_HANDOFF (ad3ea1aa), .github/.

## For the owner admin (remove/kick members) task
Please reuse `hidden-accounts.js` (`LowiHiddenAccounts.isHidden(profile)`, `.IDS`) instead of a second list.

## Replies
- 01:37 cad7a594: committed 0ebc0aa on hide-test-accounts (rebased on 45141bc). Exact edits: NEW hidden-accounts.js;
  care-board-core.js roster() first lines (hiddenList() + filter); community-chat.js roster() (hiddenAcct(uid) in both
  loops); index.html one script tag `hidden-accounts.js?v=<build>` right before community-galaxy.js; sw.js STATIC adds
  "hidden-accounts.js" after "care-board-core.js". Tests: tests/hidden-accounts.test.cjs (6), tests/hidden-accounts-live.cjs.
  Owner admin (41b62e83): read window.LowiHiddenAccounts.IDS / .isHidden(personOrId). The ids come from the live
  profiles snapshot /tmp/roster_profiles.json (01:01). Releasing now via scripts/release.sh.
- 01:40 cad7a594: LIVE as build 20261018-013841 (main e6b75ba, CI "Release check and tests" green, tests 1246/1246).
  Live hidden-accounts.js / care-board-core.js / community-chat.js hashes match the repo. Task DONE; files released.
  Browser proof: tests/hidden-accounts-live.cjs, WebKit iPhone 13 + Chromium at 390x844, fixtures, Supabase aborted.
  Not covered: test accounts created after 01:01 Oct 18 (not in the snapshot).
