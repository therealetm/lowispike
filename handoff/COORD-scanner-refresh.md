# COORD: scanner screen refresh, close X bottom right (task 0825fba1 'LOWiSPIKE: scanner refresh, X bottom right')

Started 19:50 CEST Oct 18. Worktree /home/sprite/wt-scanner, branch scanner-refresh from origin/main 68536a4 (20261018-194428).
Status: WORKING

## Owned (only these change)
- index.html: scanner camera markup only (openScanner() top bar / bottom panel, camBar(), the scanner click cases camclose/camtype, scanner strings in the b3 T table)
- NEW scanner-refresh.css (glass/water look for #b3Cam, X bottom right), link tag appended at the end of the existing link tags (no reordering)
- sw.js: precache scanner-refresh.css (append only)
- tests/scan-glass.test.cjs / tests/orb-scan.test.cjs: ONLY assertions about the removed redundant controls (reason noted in commit)
- NEW tests/scanner-refresh.test.cjs, tests/scanner-refresh-live.cjs

## Not touching
- shop-scan.js (shopping mode logic stays; pill only shown while shopping mode is on), scan-glass.js, realm-backdrop.*, spirit.js
- home-orbit-v2.*, home-blooms-v2.*, home-settings-sleep-v2.*, living-bubbles.* (READ only for the look), fuel-screens.*, cook-home-panel.*, misty-*, sleep-growth.*

## Release
After d1ed599f (stuck in worlds) is live. scripts/release.sh under /tmp/lowispike-release.lock, rebased on newest origin/main.

## Replies
