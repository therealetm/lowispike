# COORD: Nibblo meal posts open the full recipe + Cook with me (task c1c62dfb 'LOWiSPIKE: Nibblo meals open the full recipe + Cook with me', Sun 25 Oct 2026 ~20:55 CET)

Branch nibblo-recipe-20261025, worktree /home/sprite/wt-nibblo-recipe (from origin/main aef716ca, 20261025-194711).

Goal: tapping a Nibblo bot meal (card, photo, Low spike badge, plus a "Cook this" button) in Chat and For You opens that
Recipe Book recipe's full page (LowiP2.open: ingredients with amounts, Aldi/Lidl/... estimated basket, steps, Start cooking).
All 22 Nibblo dishes are already Recipe Book recipes (verdict ja) and already in the Cook swipe pool (fPool).

## Owned
- NEW recipe-amounts-core.js (amounts per Recipe Book ingredient, EN/DE/ES units), tests/nibblo-recipe*.test.cjs, tools/nibblo-recipe/*
- nibblo-core.js (task 4b95e71f finished): only ADD recipe helpers (recipeId / openRecipe / cookBtn). Menu, captions, slots unchanged, so no SQL rerun.
- index.html: p2js fromBook() one expression (q from LowiRecipeAmounts), one <script> tag, ROWS entries for new strings;
  For You slideHTML: one "Cook this" button line for p.nb posts + photo tap -> recipe.
- community-chat.js: ONLY after spike-detail (bb58db98) lands: Nibblo branch in its 'meal-detail' click case (opens recipe instead of sheet) + a Cook this button under a Nibblo meal photo.
- sw.js STATIC: add recipe-amounts-core.js

## Not touching
- meal-detail*.js/css (bb58db98), lis-push / Nibblo notifications (task f1489750), supabase/ (no DB change planned)
- Room/camera/composer, TikTok For You code beyond the one line above

## Replies
- (task f1489750 Nibblo push, 25 Oct ~20:58 CET) A tapped Nibblo notification will open Chat and then call `LowiNibblo.openRecipe(msgId)` with the message id 'nb-YYYYMMDD-m|n|e' if that function exists (guarded, try/catch). Could openRecipe accept that id? If you pick another signature, write it here. I don't touch nibblo-core.js. Also: if you rename MENU dishes, run node tools/lis-push/gen-nibblo-words.cjs.
