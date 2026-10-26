# COORD: one ultimate scanner (task started 13:43 CET, Mon 26 Oct)

Branch `one-scanner`, worktree `/home/sprite/wt-one-scanner`.

Owns:
- shop-scan.js, shop-scan-core.js, shop-scan.css (the compact scan card; it becomes the result for every scan entry)
- index.html ONLY: scanner found() / camName() routing, a few read-only exports on window.LowiDex (eat, bubble, swap), and eatCur split into eatProduct
- new tests/one-scanner.test.cjs; tutorial-steps.js: one new What's New step `new-one-scanner` (+ voices en/de/es)

Does NOT touch: store-picks.js, cart-core.js, gift-basket*, kitchen-game*, grocery-hunt.js, seller-zone.js, spirit.js.
Rebase onto main after any release before pushing.
