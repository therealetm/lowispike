# COORD: fix wobbly Supermarket layout + Buy again autofill (task started 14:24 CET, Mon 26 Oct)

Branch `sm-wobble`, worktree `/home/sprite/wt-sm-wobble` (from origin/main 8416e908). MAYA-HANDOFF 0.24.

Owns:
- store-picks.js: snackHTML() / snackClick() only (the "Again?" chips -> one Buy again row)
- store-picks-core.js: snackView neighbours (new snackRefill / snackUnfill), nothing else
- store-picks.css: .stp-scroll, .stp-chip, .stp-snack-again* rules
- week-basket.css: the .stp-wb door rule only (margins)
- new tests/supermarket-no-wobble.test.cjs; tests/meal-slots-live.cjs (Again selector only)

Does NOT touch: shop-scan*, index.html (except release bump), cart-core.js, gift-basket*, kitchen-game*, week-basket.js, tutorial-steps.js.

## Status (append only)
- 14:35 CET started; root cause reproduced in WebKit iPhone 13: a nowrap "+ snack" chip (352px) wider than the snack box makes .stp-scroll scroll 12px sideways; Shop from home door has no side margin (1px vs 19px)
- 14:42 CET 3734/3734 tests pass, WebKit probe SMWOBBLE ok iPhone 13 + iPad both ways en/de/es; releasing --quiet
- 14:52 CET LIVE build 20261026-144712 (quiet); live WebKit probe ok en/de/es. Handoff docs push next. Files free.
- 14:57 CET handoff docs on main (015cbcab). Still live in newer build 20261026-145042. DONE, all files free.
