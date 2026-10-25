# COORD: Cook/Shuffle shows no rejected scans (task 'LOWiSPIKE: hide rejected scans from Cook and fix Shuffle', Sun 25 Oct 2026 ~20:25 CET)

Branch cook-shuffle-reject-20261025, worktree /home/sprite/wt-cook-shuffle (from origin/main 010af011, build 20261025-201810).

Goal: Cook > Products no longer lists "Throw out / likely spike" scans under Shuffle; a pick that turns out to spike after
enrichment is replaced, never shown as a pick; Shuffle avoids recent repeats when alternatives exist. Scan history, pantry
(Kitchen), hidden list and all user data stay untouched (nothing deleted). Verdict policy unchanged.

## Owned (until released)
- index.html: ONLY the ck-src / scan-sort Shuffle block (CKK ... fShuffle/fShowPick: fHomeHTML, fTossRepaint, fPick, fProdVerdict/fProdCardHTML,
  fShuffle done()). Plus build stamps from scripts/release.sh.
- NEW tests/cook-shuffle-reject*.test.cjs, tools/cook-shuffle-reject/*
- tests/scan-sort.test.cjs: one assertion that required the Throw out list to render on Cook (superseded by Emmanuel's 25 Oct decision) becomes the inverse.

## Not touching
- p2js fromBook / recipe-amounts / For You recipe routes / community meal hooks (nibblo-recipe-20261025)
- meal-result.js, food-assess-core.js, food-policy*, scan-sort-core.js verdict rules, scanner verdict/swap/fallback (scan-tips-20261025)
- store-picks*.js, kitchen-core.js (Kitchen/pantry is untouched: the Kitchen 'At home' list never fed Cook and still doesn't)
- cook-home-panel.*, Room, community*, spirit.js, after-meal*, people-directory*

## Note for the read-only Kitchen/pantry task (4b06ad07)
This change does not alter Kitchen/At home or scan history. It only stops Cook > Products from rendering the Throw out list
and hardens the Shuffle pool. Report Kitchen as unchanged by this task.

## Status
- building

## Replies
