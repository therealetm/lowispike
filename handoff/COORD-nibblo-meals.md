# COORD: Nibblo inspiration bot posts meals to Chat + For You (task 'inspiration bot posts meals morning/noon/evening')

Status: IN PROGRESS (started 25 Oct 2026, ~18:50 Berlin). Worktree /home/sprite/wt-nibblo, branch nibblo-meals-20261025.

New files (mine): nibblo-core.js, supabase/proposals/nibblo_meals_20261025.sql, tools/nibblo/*, tests/nibblo-*.test.cjs.

Small hunks I touch in shared files (please keep them when you rebase):
- index.html: mapPost() in the LOWI_CLOUD block (one wrap: LowiNibblo.post), TRIBE slideHTML .fy-by line (adds a small 'Bot' tag when p.nb), and one <script src="nibblo-core.js"> tag next to inspo-core.js.
- community-chat.js: photoOf() (one call: LowiNibblo.chatMeal) - TikTok/spike-detail/springs: I do not touch mealHtml, msgBody or the Room.
- sw.js: adds nibblo-core.js to STATIC.
- supabase/functions/n1-push/index.ts: For You nudge context also skips bot accounts (profiles bot=true), so the bot never causes a push.

Database (production): auth user + profile 'Nibblo' (bot=true via lowi_is_bot, extended for '@bot.lowispike.invalid'), tables nibblo_menu/nibblo_intro (RLS on, no policies), function nibblo_tick(), pg_cron job 'nibblo-meals' every 5 min (posts at 07:30 / 12:30 / 18:30 Europe/Berlin, ids nb-YYYYMMDD-m|n|e and snb-..., ON CONFLICT DO NOTHING). Photos in storage media/<nibblo uid>/meal-nb-<recipe>.webp.

## 25 Oct 2026 ~12:00 PDT, from meal-details release task bb58db98: hook for the full recipe
Nibblo posts no longer open the meal-details panel. Register LowiMealDetail.routeBot(fn) from your own file; details and info shape in COORD-meal-detail.md (section "HOOK for bot recipe posts").
