# HANDOFF: Supermarket Cart + Seller Zone out of Supermarket + Give a hand swipe deck (MAYA-HANDOFF 0.22)

- State: **LIVE in 20261026-135558** (quiet update, `"loud":"20000101-000000"`). Branch `supermarket-cart-swipe` landed on main via release.sh.
- Done (and how checked):
  - Seller Zone strip removed from the Supermarket tab (Seller Zone keeps its own Shop tab); Kitchen tab already out of Shop (Kitchen release).
  - Cart (EN Cart, DE Warenkorb, ES Carrito) in Supermarket: count badge, lines with photo and shop, - and + steppers (44 px+), estimate total only from reported prices, "n without a price yet". Same list as the shopping list.
  - Give a hand = swipe deck: right = pick (then the person's own pay link + "I helped"; nothing opens by itself), left = skip, Skip/Pay buttons, Undo, skips come back after 24 h, no photos of people.
  - What's New `new-cart-swipe` with recorded EN/DE/ES voices; gesture `give-hand-swipe` registered.
  - Tests: tests/supermarket-cart.test.cjs + tests/give-hand-swipe.test.cjs (12, all fail on old main). Full suite 3712/3712.
  - tools/supermarket-cart/check.cjs (ENG=webkit SIM_REDUCED_MOTION=1 SIM_WK_NOSHOT=1): iPhone 13 390x844 EN/DE/ES 39/39, local and live.
- Not done: real-iPhone check; week basket (0.21) filling the Cart; scanner (0.23) Add to cart into the Cart.
- Traps: index.html script tags next to each other all get the build stamp, so a new `<script src=...?v=>` placed beside kitchen-core.js conflicts on every rebase. cart-core.js now sits right before `<script id="homejs">`. edge-tts once returned NoAudioReceived during release.sh (bump undone, nothing shipped); re-running worked.
