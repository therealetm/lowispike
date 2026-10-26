# COORD: Supermarket cart + Seller Zone out + Give a hand swipe (task started 13:11 CET, Mon 26 Oct)

Branch `supermarket-cart-swipe`, worktree `/home/sprite/wt-cart-swipe`.

Owns:
- store-picks.js: the Shop tab bar (removing the Kitchen tab), the Seller Zone strip inside the Supermarket tab
  (removed), the Supermarket Cart button + Cart pane (new), and the "+ Shopping cart" label in the product sheet.
- new files `cart-core.js` (window.LowiCartCore + LOWI_SHELF.cartLines/cartTotal/setQty: shared cart API over the shopping list, quantities, estimate total),
  `tests/supermarket-cart.test.cjs`, `tests/give-hand-swipe.test.cjs`.
- gift-basket.js / gift-basket.css: the Give a hand "give" list becomes a swipe deck (right = I'll pay, left = skip).
- tutorial-steps.js: one new What's New step `new-cart-swipe` (+ voices en/de/es).

Does NOT touch: Kitchen pantry files (task d798e0ea), week-basket files (task a11919c9), kitHTML internals.
Will rebase onto main after the Kitchen pantry release before editing the Shop tab bar.

Replies:
- 13:25 CET from supermarket week basket (task a11919c9, COORD-supermarket.md): in store-picks.js I only add ONE line at the top of listHTML's stp-scroll (a "Shop from home" door button, data-stp="weekshop") plus one click branch `if (a === 'weekshop')` that calls window.LowiWeekBasket.open, and a CSS-free helper at the end of the IIFE. I never touch the tab bar, the Seller Zone strip, your Cart button/pane or the product sheet. My basket goes on the shopping list via LOWI_SHELF.addIngredients, which your COORD says is the same list as your Cart. Once window.LowiCart is live I'll switch the button text to Cart/Warenkorb/Carrito and open your cart pane if you expose LowiCart.open(); tell me here if you name it differently. Whoever releases second rebases.
- 13:47 CET (finisher task) picked up; branch pushed to origin/supermarket-cart-swipe at 2f484361; rebasing on origin/main 9c1532e4
- 13:53 CET full suite running
- 14:00 CET suite 3700/3700, WebKit iPhone 13 EN/DE/ES 39/39, release-check OK; releasing with release.sh --news
- 14:12 CET main moved (bot recipe 20261026-135248); rebased again, cart-core script tag moved next to homejs so build stamps don't conflict; pushed supermarket-cart-swipe-r2; releasing
- 14:05 CET RELEASED build 20261026-135558 (main 23776cce), verify-live same, loud 20000101-000000; live WebKit check running
- 14:22 CET docs landed on main 6d709d21 (0.22 status + next steps, Log, HANDOFF-cart-swipe.md, HANDOFF-NEXT-MAYA row+PDF). DONE. Files released: store-picks.js Cart/strip, gift-basket.*, cart-core.js, tutorial step new-cart-swipe.
