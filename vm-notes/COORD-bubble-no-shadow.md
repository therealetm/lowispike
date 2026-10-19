# COORD: no shadow on any bubble (Oct 19 2026)

Task: "LOWiSPIKE: remove shadows from all 3D world bubbles" (Emmanuel's iPad screenshot, 06:08 Mon 19 Oct).
Worktree: /home/sprite/wt-bubble-shadow, branch `world-bubble-no-shadow`, off origin/main (live build 20261018-225254).

## Files (released, now free)
- body-world-3d-scene.js (only `membraneMat`, the cosmos cell glass shader)
- world-home.js (only `mistySvg()`, the art for the 3D Misty sprite / flight body / face)
- world-home.css (only the `html.wh-home #spBubble .tmg-plant` filter line)
- herb-tamagotchi.css (only the `.lh-reflection` rule)
- community-standout.css (only the `.cg-orb .cp-form` filter line)
- tests/oct19-no-bubble-shadow.test.cjs (new), tests/no-bubble-shadow-live.cjs (new), tests/bubble-bottom-shadow.test.cjs (one assertion)
- At release: DECISIONS.md (append), What's New, index.html/sw.js build bump via scripts/release.sh

## Not touching
body-world-regions.js, misty-flight.js, cell-world.js, region-pals*.js, arrival-cards*, speech/companion files (claimed by world-exit and companion tasks).

## Status
- [x] cause found, failing tests written, fix done, 1,416 unit tests pass, live checks pass (Chromium + WebKit iPhone 13 + iPad)
- [x] released as build 20261019-064609 (main 27c9151), CI green, live files match, live check PASS on WebKit iPhone 13 + iPad

FILES FREED: all claimed files above are free for other tasks.
