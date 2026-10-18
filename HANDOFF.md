# HANDOFF: Fuel screens one style + two-step Swap (stopped early, NOT released)

Worktree /home/sprite/wt-fuel-style, branch fuel-screens-style (uncommitted). COORD: /home/sprite/COORD-fuel-screens-style.md

Done (local only):
- NEW fuel-screens.css / fuel-screens.js: tags Fuel panels (.fs-panel: #sos, #sheet with #f2Sheet, R2 .sp-pick/.sp-quick-log, .stp-card), Home glass skin, one close top-right, hides #whX while open, docks beside Misty via LowiBloomDock.dockSpot on >=700px. Linked at end of index.html, precached in sw.js.
- index.html: Swap rewritten in two steps (openSOS, SOS_TX de/es, sosnext case, sosgave opens LowiSpirit.meal, timer is a link, JA tag gone); F2 strings no longer say Today; XP shown once (fs-xp) instead of per-row pills.
- home-blooms-v2.js: Swap bloom no longer forces data-c=sweet, so it opens on step 1.
- tests/fuel-screens.test.cjs: 14/14 pass; fails 6 on origin/main.
- tests/fuel-screens-live.cjs: browser check for all 6 views.

Next:
1. Run node tests/fuel-screens-live.cjs --view ipad_landscape_chromium --out /tmp/fs/after. On the first run, Your pick showed no panel to the probe, though /tmp/fs/dbg.cjs showed it opening. Check the probe timing and filter. Then fix every FAIL and run all 6 views.
2. Store picks (.stp-card) has only the generic skin. If it looks wrong, remove 'snack' from kindOf and ship it in a second release.
3. Run npm test (the full suite). Check for tests asserting the old F2 strings or the old SOS markup.
4. Shoot before screenshots: run with --root on a checkout of origin/main and --shoot-only.
5. Add What's New in EN, DE and ES. Commit, rebase on origin/main and release under /tmp/lowispike-release.lock via scripts/release.sh. Then confirm the live version.json build and CI, and run the live check with --url.
