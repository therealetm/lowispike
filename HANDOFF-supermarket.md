# HANDOFF: Supermarket "Shop from home" (virtual grocery shopping)

Emmanuel, Mon 26 Oct 2026 ~1:05 PM CET (voice + screenshot of Shop > Supermarket): "Also redesign supermarket because it's quite
annoying. I'm at home and I want to go grocery shopping now. And I would have loved to be able to virtual grocery shop, just like all
those apps that are going viral, the ones that we are trying to copy from. Whatever they are doing, whatever their feature is that is
making people want to use their app, we could be using that, literally inside of our supermarket. Include that into the handover if
you're not able to actually get this done because of the weekly limit." Full context: MAYA-HANDOFF.md 0.21 (and 0.22 for the
parallel Cart / Seller Zone / Give a hand task, branch supermarket-cart-swipe, COORD-cart-swipe.md).

Branch `supermarket-virtual`, worktree /home/sprite/wt-supermarket, COORD /home/sprite/COORD-supermarket.md.

## Status (Mon 26 Oct 2026, 14:55 CET): slice 1 DONE and shipped
Released silently with scripts/release.sh (news id week-shop-*, tour ["new-week-shop"]), after rebasing on the Cart release
(20261026-135558). Since the Cart is the shopping list (0.22), the week now fills the Cart: "Put it in my Cart / In meinen Warenkorb /
Anadir a mi carrito", then "Open my Cart" presses the Supermarket Cart button. The door sits above Supermarket's scroll (tests pin
Shop's two buttons + Snacks at the top of the scroll). CI was red on 12:37/12:40 UTC runs: 6 tests (door before shopActs, tour card over
140 chars, no recorded voices); all fixed. Checks: full suite 3723/3723, WebKit iPhone 13 EN/DE/ES + iPad portrait/landscape with
Reduce Motion (probes/SUPERMARKET/check.cjs on agent-harness). Next slices below are still open.

## Slice 1: Shop from home weekly basket
Files (new, owned by this task): week-basket-core.js (logic), week-basket.js (sheet), week-basket.css, tests/week-basket.test.cjs.
- Household 1-6+, dinners 3-7, weekly budget (EUR, -5/+5 or typed), store chips with each store's week total (cheapest marked).
- A week of low-spike dinners (r === 'ja', Cook recipes + the three featured dinners; m_ rebuilds left out: their ingredients are
  aisle names), varied (at most two with the same main), stable all ISO week, New week reshuffles, Swap per dinner, Recipe opens it.
- One basket grouped by aisle, packs: one per dinner per two people, spices/sauces/oils/seeds once a week. Prices only from
  LowiStoreList.price (the existing seven-store estimates), labelled "estimates, not live prices".
- Running total vs budget with a bar; over budget: "Fit my budget" swaps the priciest dinner for cheaper ones.
- Tap the circle = already at home, off the bill; items in your Kitchen (LowiKitchenCore) start as at home.
- Put it on my shopping list (LOWI_SHELF.addIngredients, the same list as the Cart); Copy or share the list; delivery links from
  TD_ORDER.groceries (REWE Lieferservice, Knuspr, Flink, Picnic).
- Door: a "Shop from home" card at the top of Supermarket (store-picks.js listHTML, data-stp="weekshop").

## Status
- [x] MAYA-HANDOFF 0.21 details (landing on main)
- [x] core + tests (failing-first wiring test), sheet, css, Chrome 390 prototype run (works: people, budget, fit, have, swap, list)
- [x] rebased on main after kitchen-pantry release (132627); door in store-picks.js (wbDoor + weekshop click), index.html + sw.js tags
- [~] tour step new-week-shop written in tutorial-steps.js + OPEN route supermarket in tutorial.js; NEXT: record voices with tools/tutorial-voice/build.py, run tutorial tests
- [ ] full suite, WebKit iPhone 13 390x844 Reduce Motion EN/DE/ES, release.sh --news, verify live, report

## Next slices (not started)
- When the Cart task (0.22) is live: button says Cart / Warenkorb / Carrito and opens their cart pane (LowiCart).
- Import a recipe from a TikTok / Instagram link (share button) into the week.
- Shared household list; offers of the week per chain (only from a real source, never invented).
