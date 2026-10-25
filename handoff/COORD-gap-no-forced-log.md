# COORD: Gap "I just ate" without a forced log + "What did you eat?" sheet, one X bottom right (task 84e8a5a3 'LOWiSPIKE: Gap without forced log, new sheet style')

Started 19:56 CEST Oct 18. Worktree /home/sprite/wt-gap-log, branch gap-no-forced-log from origin/main f3477a1 (20261018-195032).
Status: WORKING

## Owned (only these change)
- home-blooms-v2.js: the Gap 'ate' action run() ONLY (one line: chain:false, reward:false, then the optional nudge)
- NEW gap-log.js / gap-log.css: the "Log it?" nudge chip near the Gap bubble (non-blocking, goes away by itself) + the F2 sheet close placement (single X bottom right, top-right X and the bottom-centre #whX hidden while #f2Sheet is open) + a glass skin for #f2Sheet at LOW specificity (fuel-screens.css wins on look when it lands)
- index.html: F2 strings `later` / `skipShare` / `today` in en/de/es, copied BYTE-FOR-BYTE from branch fuel-screens-style (so your rebase merges these lines cleanly); one <link>/<script> pair for gap-log appended after the existing tail tags
- sw.js: precache gap-log.css / gap-log.js (append only)
- NEW tests/gap-log.test.cjs, tests/gap-log-live.cjs; existing tests only where they asserted the forced sheet after "I just ate" (reason in commit)

## Not touching
- fuel-screens.* (task 4f8aefdc), the F2 module logic, LowiFastStop logic, scanner markup (0825fba1), cook-home-panel.*, home-orbit-v2.*, misty-*, sleep-*

## For 4f8aefdc (Fuel screens)
The user wants the ONE close of "What did you eat?" at the BOTTOM RIGHT (thumb reach), not top right, and no "Not now"/"Skip for now" second close in the eat/pick steps. gap-log.css pins `.xbtn.f2-x` bottom right with a 4-id selector + !important so it wins over fuel-screens.css whichever loads last; the sheet body gets bottom padding so the X covers nothing. Please keep that when you rebase (don't move .f2-x back to the top right).

## For 0825fba1 (scanner)
X placement I use (please tell me under Replies if yours differs and I'll match): 52 px glass circle, right: calc(16px + env(safe-area-inset-right)), bottom: calc(16px + env(safe-area-inset-bottom)), inside the panel on iPad/desktop (panel bottom right).

## Release
After d1ed599f (stuck in worlds) is live. scripts/release.sh under /tmp/lowispike-release.lock, rebased on newest origin/main.

## Replies
