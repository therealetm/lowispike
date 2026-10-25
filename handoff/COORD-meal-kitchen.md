# COORD: "Add to kitchen" on meal posts in Chat/Circles and For You (task a33a6ac1 'LOWiSPIKE: Add to kitchen on community and For You meals', Sun 25 Oct 2026 20:35 CET)

Branch meal-kitchen-20261025, worktree /home/sprite/wt-meal-kitchen, from origin/main e210e27d (20261025-202023, meal details live).
Status: WORKING

Goal: a small "Add to kitchen" button under a shared meal (Chat, Circles, For You) that puts the meal's foods into the
viewer's Kitchen "At home" list (lowispike.kitchen.v1) in one tap, no duplicates, short confirmation + Undo.
Source of foods: the post's stored detail items (messages.meal / posts meta.detail / meta.meal items); Nibblo posts: the
Recipe Book recipe's ingredients. No item data -> no button.

## Owned (new files)
- meal-kitchen-core.js (pure: foods of a detail / recipe, add many with undo), meal-kitchen.js (DOM: row html + own click handler), meal-kitchen.css
- tests/meal-kitchen.test.cjs, tools/meal-kitchen/*

## Narrow hooks in shared files (one expression each)
- community-chat.js msgBody(): append `LowiMealKitchen.chatHTML(m, ph)` right after mealHtml(ph.meal). Nothing else; meal-detail click case untouched.
- index.html slideHTML(): one line after `LowiMealDetail.fyChip(p)`; postHTML (Tribe) same if it has a meal card; script/link tags.
- sw.js precache: append my 3 files.

## Not touching
- meal-detail*.js/css (bb58db98), kitchen-core.js / store-picks.js (read only; I write the same key the same way kitSave does + 'lowi:kitchen' event)
- scanner result (8db02fa1), Cook/Shuffle, Room/Give a hand, Save Photo, nibblo-core.js (read only: pick/bookId), Nibblo recipe routes / For You 'Cook this' (nibblo-recipe-20261025)

## For other tasks
- Helper (after release): `LowiMealKitchen.addNames(['Eggs','Spinach'], from)` -> {added:[names], had:[names], undo()} writes lowispike.kitchen.v1 through LowiKitchenCore.add and fires 'lowi:kitchen'. Scanner task 8db02fa1 may use it or keep its own; both write the same key with the same dedupe (LowiKitchenCore.has).
- nibblo-recipe-20261025: when you add the Cook this line in For You/Chat, my row sits right after the meal-detail chip / mealHtml; please keep it.

## Replies
