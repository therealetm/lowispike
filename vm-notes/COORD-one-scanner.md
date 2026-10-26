# COORD: one ultimate scanner (task started 13:43 CET, Mon 26 Oct)

Branch `one-scanner`, worktree `/home/sprite/wt-one-scanner`.

Owns:
- shop-scan.js, shop-scan-core.js, shop-scan.css (the compact scan card; it becomes the result for every scan entry)
- index.html ONLY: scanner found() / camName() routing, a few read-only exports on window.LowiDex (eat, bubble, swap), and eatCur split into eatProduct
- new tests/one-scanner.test.cjs; tutorial-steps.js: one new What's New step `new-one-scanner` (+ voices en/de/es)

Does NOT touch: store-picks.js, cart-core.js, gift-basket*, kitchen-game*, grocery-hunt.js, seller-zone.js, spirit.js.
Rebase onto main after any release before pushing.

## Status (append only)
- 14:25 CET continuation task (finish and ship one ultimate scanner) took over branch one-scanner @ 1a69f3c8; rebasing on origin/main
- 14:58 CET rebased on main 8416e908, fixed Shop finds note hiding Add to cart, 3737 tests pass, WebKit probe ONESCAN all pass en/de/es; releasing
- 15:40 CET LIVE build 20261026-143321 (quiet); handoff on main 86ebfe6c; probe committed to agent-harness. DONE.
