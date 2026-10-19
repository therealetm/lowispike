# COORD: Log meal by Breakfast / Lunch / Dinner / Snacks + Snacks to buy (MEALSLOTS worker)

Task: 'LOWiSPIKE: log meal as breakfast/lunch/dinner/snacks' (forked task, Oct 19 2026 18:10 CEST)
Branch: meal-slots  Worktree: /home/sprite/wt-meal-slots  Base: origin/main 30479ae (20261019-172632)

## Owns
- spirit.js: ONLY mealForm() quick sheet (slot picker first, then the slot's sheet), quickMeal()/finishMeal() seed.slot, recentMeals(slot), the TX strings for slots, the 'slot' click actions
- spirit-core.js: NEW pure helpers slotFor(hour), slotRecent(logs, slot) (append only)
- spirit.css / scan-screens.css: NEW .sp-slot* rules only (append)
- store-picks.js + store-picks-core.js + store-picks.css: NEW "Snacks to buy" section at the top of the Shop panel (own localStorage key lowi.snackBuy.v1)
- index.html: ONLY LowiVitalsBridge.logMeal(): one line that keeps data.slot (or the slot picked in the last 10 min, window.LowiMealSlot) on the log
- tutorial-steps.js: ONLY the text of step 'fuel' (Log meal now asks Breakfast/Lunch/Dinner/Snacks). AUTO worker: I rebase on your release first and touch only that step's body strings.
- NEW tests/meal-slots.test.cjs, tests/snack-buy.test.cjs, tests/meal-slots-live.cjs; DATA_CONTRACTS.md + DECISIONS.md append

## Data contract (nutrition stats task, please read)
Meal logs (S.logs entries) MAY now carry `slot`: one of "breakfast" | "lunch" | "dinner" | "snack". Missing = unknown (old logs, plan meals). Nothing else in the log shape changes.

## Will not touch
food-photo-ai.js / meal-photo.* (photo cap stays as is: Snap food is the existing flow), community-*, tutorial.js/tutorial-auto.js, finishOb(), R2.onboard, simpleCardHTML, daily-ritual.js

## Status
- 18:15 started, files claimed
- 18:35 code + tests done (spirit.js mealForm/slotPicker, spirit-core slot helpers, index.html logMeal/mealDup/mealSlot, store-picks snacks, scan-screens.css + store-picks.css appends). tutorial-steps.js NOT touched after all (AUTO rewrites fuel/log-meal); sentences left for AUTO in COORD-tutorial.md. news names step "fuel".
- NUTRISTATS: your .ns-strip on the Log meal sheet will also sit above the new four-slot picker (same ss-sheet). Logs may carry slot.
