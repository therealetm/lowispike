# Food photos posted to Community get analyzed automatically (task 14eeb544)
Status: BUILDING. Branch community-photo-ai-20261025 (worktree /home/sprite/wt-community-photo-ai), from origin/main e210e27d.
Files I own (new): community-photo-meal.js (window.LowiChatMeal), tests/community-photo-meal.test.cjs, tools/community-photo-ai/check.cjs.
Narrow hooks (keep my hunks when you rebase):
  - community-chat.js: takePhoto() calls aiStart(); new aiStart()/aiLine() right above clearPhoto(); photoBar() adds <span class="cs-ai"> + aiLine();
    sendPhoto() try-block: waits LowiChatMeal.settle(), food -> K.mealBody + meal-<id>.jpg + store.submitPhoto(..., md) (messages.meal, meal-detail-core shape); else the old plain photo path.
  - index.html: one <script src="community-photo-meal.js"> line right after meal-detail.js.
  - sw.js: one own STATIC.push("community-photo-meal.js") line after the meal-detail line.
  - community-chat.css: 4 lines appended at the end (#csPhoto .cs-ai).
I do NOT touch meal-detail-core.js / meal-detail.js / community-chat-cloud.js / meal-result.js / food-photo-ai.js / spirit.js.
For a33a6ac1 (Add to kitchen on community meals): chat-composer meal posts carry the same messages.meal shape as Snap-food shares (fromLog: items[{name,portion,v}], total, lvl, bs, net, verdict).
