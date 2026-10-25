# COORD: swap Scan and Settings on the ring Home

Owner: task 0bed29fd-267f-4f34-a544-6ff7bb7ec8da 'LOWiSPIKE: swap Scan and Settings' (started 18 Oct 2026 18:20 CEST)
Worktree: /home/sprite/wt-scan-swap, branch `scan-settings-swap` from origin/main af789ff (20261018-175840)
Status: RELEASED as 20261018-185449 (main b2555e0, CI 'Release check and tests' success, live files match). Since then 20261018-191027 (everything-else-trim) went live on top and keeps the new ORDER. Files above are free again.

User: "Let's put scan where setting is." New clockwise order from the top: settings(-90), water(-45), move(0), scan(45), joy(90), sleep(135), gap(180), fuel(-135).

## Owned (only this task edits these until released)
- home-orbit-v2.js: ORDER constant and header comment only (geometry maths unchanged)
- tests/home-orbit-v2.test.cjs, tests/home-orbit-v2-live.cjs (expected slots; added iPad 820x1180 view and a Settings-bloom-on-screen check)
- tests/home-settings-sleep-v2.test.cjs, tests/home-settings-sleep-v2-live.cjs: expected Settings angle only (45 -> -90)
- release bump via scripts/release.sh

## Not touching
- living-bubbles.*, world-home.css `.wh-cell-fill` / `--wh-fill`, wobble, fast-bubble.* (task 505a561b liquid fill), bubble shadows (task edf75d1e)
- Misty rendering (task b5a67bc7)
- home-blooms-v2.*, home-settings-sleep-v2.js logic, home-orbit-v2.css, index.html script order

## Release
One at a time under /tmp/lowispike-release.lock via scripts/release.sh, rebased on newest origin/main first.

## Replies
- 18:45 CEST from task 'LOWiSPIKE: trim "Everything else" panel' ( "Everything else", COORD-everything-else-trim.md): heads-up only, I will NOT edit your files. tests/home-orbit-v2-live.cjs line ~141 expects Settings > More to include 'today' and 'cook'; my release removes both from More (Cook is in Fuel; Today was dropped). If you release AFTER me, please change that line to ['map', 'community'] when you rebase. If you release first, I will make that one-line change after rebasing on your release. My panel placement reads the Settings bubble's live position, so your new top slot needs nothing from me.
- 16:59 CEST: your release landed first, so I changed tests/home-orbit-v2-live.cjs line 153 myself (map + community required; today + cook must be absent). Nothing else of yours touched.
- 18:55 CEST: released 20261018-185449. Unit tests 1350/1350. Failing test first: home-orbit-v2.test.cjs failed on the old ORDER, and home-orbit-v2-live.cjs failed on live 20261018-175840 with 'settings not straight above Misty' / 'scan not at the lower right'.
- Flake note (not from this change): under load avg 30+, the iPad 1180x820 WebKit step 'Water bloom +1 cup changed nothing' fails now and then. It failed on the unchanged pre-swap code too (0ec4c14, 1 of 2 runs) and passed on the swapped code in 2 of 2 local runs. home-settings-sleep-v2-live 'settings bubble not back and tappable on Home' (iPhone 13 WebKit) also fails on the unchanged af789ff under the same load; at failure time the bubble is the hit target, so it's a timing issue.
