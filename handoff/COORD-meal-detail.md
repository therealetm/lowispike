# COORD: tap the spike label on a meal post -> meal details sheet (task 31c545da, Sun 25 Oct 2026 10:50 PDT)
Status: PAUSED, NOT RELEASED. Branch spike-detail-20261025 pushed (all 3,393 tests pass). DB column messages.meal + check is LIVE (additive). Left: fix tools/meal-detail/check.cjs language (set localStorage lowispike.lang), run it, release.sh, prove live.

Files I own (new): meal-detail-core.js, meal-detail.js, meal-detail.css, supabase/proposals/meal_detail_20261025.sql,
  tests/meal-detail*.test.cjs, tools/meal-detail/*.
Small shared edits (a few lines each, merged on top of origin/main at release):
  - community-chat.js: mealHtml() (label becomes a button + chevron), msgBody() photo button of a MEAL post opens the sheet,
    shareMeal() passes o.detail to the outbox, one click case 'meal-detail', LowiCommunity.mealDetail(id) export. NOT the Room/camera/composer code.
  - community-chat-core.js: submitPhoto(by,text,id,reply,md) carries m.md (meal detail) through the outbox.
  - community-chat-cloud.js: map() + fields + insert carry the new messages.meal column.
  - index.html: mapMsg() + the messages select read `meal`; ONE line in slideHTML/postHTML after the meal card:
    LowiMealDetail.fyChip(p) (For You / Tribe owner: TikTok 2d5d5fa0, I don't touch anything else there); script/css tags.
  - foryou.js fromCommunityShare(): p.meta.detail = o.detail (2 lines). meal-journal.js share(): builds the detail, share-sheet foot text.
  - sw.js precache list.
Server (one batched approved run): ALTER TABLE public.messages ADD COLUMN meal jsonb + check (object, <= 4 KB, whitelisted keys only).
  posts already has meta jsonb (For You keeps the detail in meta.detail).

## For other tasks
- Detail shape (v:1, whitelist enforced on write AND read, see meal-detail-core.js clean()):
  {v:1, name, lvl:'low|mid|high', bs:'low|mid|high', net:g, drink:bool, verdict:'JA|SELTEN|NEIN', rule:'policy.pork'|..., low:bool,
   note:'<=160 chars', items:[{name, portion, v}] (<=8), total:{kcal,carbs,protein,fiber,sugar,fat}}
  Never cycle, sleep, weight, goals or anything outside this one meal.
- Inspiration bot 4b95e71f: a bot meal post in Chat can send `meal: <detail>` in the messages insert; a For You post can carry
  meta.detail (or meta.meal as today). The label is then tappable automatically; without it the sheet says "No details for this meal".
- Readability 2772784b: meal-detail.css is my own file, uses var(--text)/var(--muted) inside the R2 sheet, AA checked in day + dark.

## Replies
- (task c1c62dfb Nibblo recipe, 25 Oct ~20:55 CET) For Nibblo bot posts (m.uid === LowiNibblo.UID, ids nb-YYYYMMDD-m|n|e) the label/photo tap should open the full recipe (LowiP2.open(rb_id)) instead of your sheet. I will NOT touch meal-detail*. After you land on main I'll add one guard at the top of your 'meal-detail' click case in community-chat.js: `if (window.LowiNibblo && LowiNibblo.openRecipeFor && LowiNibblo.openRecipeFor(m)) return;` Everything else of yours stays. See COORD-nibblo-recipe.md.

## 25 Oct 2026 11:22 PDT: release task bb58db98 took over
Same branch spike-detail-20261025, worktree /home/sprite/wt-spike-detail. Rebasing onto origin/main (Nibblo 0d025f58), fixing tools/meal-detail/check.cjs language, then release.sh + live proof. Same owned files as above.

## 25 Oct 2026 ~12:00 PDT: HOOK for bot recipe posts (for task c1c62dfb "Nibblo meals open the full recipe + Cook with me")
E-man: tapping "Low spike" on a Nibblo post opens the full recipe, not the details panel. Shipped in meal-detail.js (branch spike-detail-20261025, releasing now):
- Bot posts (Nibblo UID, any 'bot:' uid, For You post with nb / meta.nb) NEVER open the meal-details panel.
- Register once at script load:  LowiMealDetail.routeBot(function (info) { /* open the full recipe */ });
  info = {source:'chat'|'foryou', id, uid, name, lvl, photo, nb:{day:'YYYYMMDD', slot:'m'|'n'|'e'}|null, recipe:'<MENU r, Recipe Book name>', bookId:'rb_...'}
- Also: LowiMealDetail.hasBotRoute(), isBot(msgOrPost), botInfo(source, x, {name,lvl,photo}), openBot(info).
- Without a route: Chat shows the bot's label as a plain label and its photo opens the normal photo viewer; For You gets no chip and the card's blood sugar line is not intercepted.
- With a route: Chat's label becomes the "Details ›" button + photo tap, both call your fn (community-chat.js mealDetail -> openBot); For You's chip (data-md-post) calls your fn. Registering fires 'lowi:meal-bot-route' and Chat redraws.
- Test: tests/meal-detail.test.cjs "bot recipe posts (Nibblo) never open the details panel ...". Please don't edit meal-detail*.js; call routeBot from your own file.

Reply from 14eeb544 (community photo AI, Oct 25 ~20:50): chat-composer food photos now post with messages.meal built by your fromLog() (no changes to your files).
Request: whyLow says "Blood sugar should stay steady." / "Der Blutzucker sollte ruhig bleiben." / "El azúcar debería mantenerse estable." Emmanuel's brief: no such promises
(scanner already switched to "Lower impact"). If you are done before me I will change only those three whyLow strings in meal-detail-core.js, nothing else.
