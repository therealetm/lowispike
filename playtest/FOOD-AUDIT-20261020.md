# Food audit, 20 October 2026: Log meal, Snap, Scan, Shop, Cook, Gap, Food journal

One bounded first pass of Emmanuel's full-app audit request, food journeys only. It ran alongside the central crash audit (task f26091fa) and the other audit workstreams. Branch `food-audit-20261020`, from `origin/main` d281622 (live 20261020-090200). Nothing here is released: the central audit integrates and ships.

## How it was tested

- A simulated iPhone 13 (WebKit, 390 x 664, touch, Europe/Berlin time), plus iPad Pro 11 for the photo sheet, and Chromium with a fake camera for the camera loops.
- The app files of this worktree served locally. Every other host was blocked: Supabase, Open Food Facts, the photo AI. Nothing real was read or written, and no messages went out.
- A local fixture account in localStorage (onboarded, signed-in look, no real user).
- "Server unreachable" runs leave everything blocked. "Mock" runs answer one URL with a fixed reply: a fake Open Food Facts product (milk chocolate, barcode 4000417025005) or a fake food-photo reply (rice and sesame chicken).
- Scripts: `playtest/food-audit-lib.cjs` (harness) and journeys `food-audit-a` to `-g`. Run with `node playtest/food-audit-a-logmeal.cjs` (needs Playwright at /tmp/pw). Raw outputs were kept outside the repo in /home/sprite/FOODAUDIT.

Limits, plainly: this is emulation, not Safari on a real iPhone. WebKit here has no camera, so live barcode reading and the camera shutter were not tested on WebKit; Chromium's fake camera only shows a test pattern, which proves the camera opens and closes, not that a real barcode is read. The VM restarted three times under load from other tasks, and the load average sat around 40 to 55, so some runs timed out and were rerun.

## Fixed on this branch (tests added; not live)

| ID | Severity | What a person saw | Cause and change | Commit |
|---|---|---|---|---|
| FA-1 | High | Scanning a milk chocolate said "Likely spikes · Liquid sugar, 56 g per 100 ml: it reaches the blood fastest". | `catOf()` in index.html tested for drinks with substrings: "cola" matched choCOLAte and "water" matched WATERmelon. Every chocolate (Open Food Facts tag en:chocolates) and every watermelon became a drink, and a drink with more than 5 g sugar is a spike, so 85 % dark chocolate (14 g sugar) and fresh watermelon (6 g) were "Likely spikes" in ml. Whole words now; the same "cola" substring in meal-photo.js too. | bc22154 |
| FA-2 | Medium | Log meal > Scan, barcode typed, product server unreachable: "Not in any database yet · Be the first to add it." | A lookup with no answer counted as "not found" unless `navigator.onLine` was false, and iPhones report online on a weak signal. The screen invites people to add a product that may already exist. Now: "I couldn't check this product right now" and "The product database didn't answer (no connection?)...". Checked again in the browser after the fix. | e3c89fd |
| FA-3 | Medium | Shop > Scan in the shop, same case: "We don't know this product yet" (German: "Dieses Produkt kennen wir noch nicht"). | Same cause in shop-scan.js. Now "I couldn't check this one right now" with a Try again button for the same barcode; a real "not found" still says unknown. Checked again in the browser after the fix. | 01b5a54 |
| FA-4 | Medium | Log meal > Snap > choose a photo with no connection: "Photo recognition isn't switched on yet, so type what it is." | The availability check turned any network miss into "off" and kept that for 10 minutes, so photo checks stayed off after the connection came back; a session refresh that never answered could keep "Looking at your plate..." spinning. Now: "I can't reach the photo check right now (no connection?)...", asked again on the next photo, separate lines for a time out and an expired sign-in, and the token wait gives up after 8 seconds. Checked again in the browser after the fix. Part of open item 1 (Snap food); the server side of item 1 is untouched. | 3cf9e49 |

New tests: `tests/food-audit-photo-honest.test.cjs`, `tests/food-audit-shop-noreach.test.cjs`, `tests/food-audit-chocolate-not-drink.test.cjs` (the chocolate test fails on the code before the fix). The 203 tests whose names match food, meal, scan, shop, spike, photo or strings were run together: the only failures were three browser `-live.cjs` scripts (timed out on the overloaded VM, or missing playwright-core) and `oct19-string-pov.test.cjs`, which passes on its own, 11 of 11. The full suite and release checks are for the integrating task.

index.html is touched by FA-1 and FA-2 only: one regex line in `catOf()`, the `reveal(...)` line of the scanner lookup, the title choice in the not-found card, and two new strings (`noReach`, `noReachS`). Each fix is its own commit and can be cherry-picked alone.

## Found, not fixed (needs a product decision or touches shared code)

| ID | Severity | Where | Steps | Expected | Actual |
|---|---|---|---|---|---|
| FA-5 | Medium | Shop | Add "bell pepper" and "almonds" under Snacks to buy, then open Shopping list. | One list. | Two separate lists: Snacks to buy (lowi.snackBuy.v1) and Shopping list (the planner). The snacks never show in the Shopping list. |
| FA-6 | Medium | Shopping list | Fresh account, open Shopping list. | Empty, with a way to add an item. | Ten ingredients already listed for two recipes the person never chose ("Tandoori lettuce wrap plate", "Nori smash burger stack"), from the default plan. No field to add an item by hand inside the list. |
| FA-7 | Low | Shopping list | Open it from the Shop panel, then close it. | Back to the Shop panel. | Back to Home; the Shop panel is gone. |
| FA-8 | Low | Shop chooser | Open Shop. | Fine print that fits everyone. | A paragraph about there being no Føtex in Germany and Flensburg shows to every user. |
| FA-9 | Low to medium | Gap bubble | Gap > "Ate earlier · pick the time". | The sheet asks when. | It opens with "Just now" picked and the main button reads "I just ate · end fast"; right after "I just ate" there are no earlier chips, only the clock edit. One screen uses three names for one thing: Gap, fast, Gap clock. |
| FA-10 | Low | Log meal sheet | Open Log meal before eating anything. | Nothing scored yet. | "Today's stats · Sugar 1/6": staying under the sugar limit counts as a win before the first meal. |
| FA-11 | Low | Scanner from Log meal | Log meal > a slot > Scan. | Actions that move forward. | The scanner offers "Log meal" (where the person just came from) and a "Deep analyze · Your custom GPT" link. |
| FA-12 | Low | Shopping list, German | FA-6 with German set. | All German. | Recipe headers ("FOR TANDOORI LETTUCE WRAP PLATE") and "0 of 10" stay English. |
| FA-13 | Low | Cook tab | Fuel > Cook. | Every control clear of the tab bar. | The tile row (All recipes, My Recipe Book, By ingredient) sits about 7 px under the bottom tab bar at iPhone 13 size. The screen also offers eight choices before any recipe (eBook, Recipes, Products, All, Savory, Shuffle, For You, Swipe) plus Cook it and Shop it. |

## Coverage, first pass

| Journey | Exercised | Result |
|---|---|---|
| A. Log meal | Fuel > Log meal, slot picker, Write (keyboard focus), empty submit, typed meal with estimate, double tap on Log meal, saved sheet, Fuel bubble count, reopen, recent list, Change slot, reload | Works. Empty submit blocked, the double tap logged once, meal and slot kept after reload, Fuel shows 1/3. No page errors. |
| B. Snap | Camera screen without a camera, choose a photo, AI unreachable, AI mocked success, iPad Pro 11 photo sheet, Log as meal, close camera | FA-4 (fixed). Mocked success filled the name and macros and logged the meal with its photo. No overlapping controls on iPad Pro 11 portrait. Retake not reached: it sits below the fold and the script did not scroll to it. |
| C. Shop | Shop panel, Snacks to buy (add, empty Enter, tick), Shopping list, Scan in the shop with a typed barcode (unreachable and mocked), Add to cart, cart > list, German, reload | FA-3 (fixed), FA-5 to FA-8, FA-12. A shop scan never logged a meal and never touched the Gap clock. |
| D. Cook, Gap | Cook tab, I just ate, Ate earlier, logging a meal restarts the Gap clock | FA-9, FA-13. Opening a recipe was not reached (no selector matched). |
| E. Scan from Log meal | Typed barcode, unreachable and mocked | FA-1, FA-2 (fixed). |
| F. Camera loops (Chromium fake camera) | Open and close Scan, Snap and Scan in the shop four times each; count camera tracks left running; shutter | RESULT_F |
| G. Food journal | Log two meals, Misty > Food journal | RESULT_G |

Not covered in this pass: real barcode reading from a camera, Safari on a physical iPhone or iPad, the iOS photo picker and HEIC photos, the keyboard covering fields on a real phone, Swipe and For You in Cook, editing or deleting a wrong meal log, Spanish, landscape phones, and long sessions.

## Notes for the next person

- `git stash` is shared by every worktree of this repo. A stash pop here once picked up another task's stash (both sides were restored). Do not use it while other tasks run.
