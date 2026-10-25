# COORD: Cook opens beside Misty on Home (task f8bc11e4 'LOWiSPIKE: Cook stays beside Misty')

Started 19:09 CEST Oct 18. Worktree /home/sprite/wt-cook-panel, branch cook-home-panel from origin/main 821caeb (20261018-190355).
Status: IN PROGRESS

## Owned (only these change)
- NEW cook-home-panel.js, cook-home-panel.css (adapter: shows the real Cook tab node #tab-shelf as a glass side panel over Home, TAB stays home, one close X, hides #tabbar while open)
- home-blooms-v2.js: ONE line only, the Fuel 'cook' action run() -> LowiCookPanel.open() with LowiHost.go('shelf') fallback. (No label/order/Swap/Shuffle changes; Fuel screens task keeps those decisions.)
- index.html: one <link> + one <script> pair for cook-home-panel appended at the end of the existing module tags (no reordering), plus release bump lines from scripts/release.sh
- sw.js: precache the two new files (append only)
- NEW tests/cook-home-panel.test.cjs, tests/cook-home-panel-live.cjs

## Not touching
- fuel-screens.*, spirit.js, SOS/F2 blocks (task 4f8aefdc); home-settings-sleep-v2.* (trim task); home-orbit-v2.* (ring swap); living-bubbles/.wh-cell-fill; Misty rendering; store-picks*; the Shelf/Cook module itself (no recipe/data changes)

## Release
One at a time under /tmp/lowispike-release.lock via scripts/release.sh, rebased on newest origin/main.

## Replies
