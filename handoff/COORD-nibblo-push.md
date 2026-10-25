# COORD: a phone notification for each Nibblo meal post (task f1489750 'LOWiSPIKE: notify people when Nibblo posts in Chat', Sun 25 Oct 2026 ~11:55 PDT / 20:55 CET)

Branch nibblo-push-20261025, worktree /home/sprite/wt-nibblo-push (from origin/main aef716ca, build 20261025-194711).

Goal: each Nibblo meal post (07:30 / 12:30 / 18:30 Berlin) sends a web push to people who allow notifications, in their language, Nibblo's voice; tap opens the post. New 5th switch "Nibblo's meals" under Settings > Reminders. Quiet hours, daily cap, the person's switch respected.

## Owned
- NEW supabase/functions/n1-push/nibblo.ts, supabase/functions/n1-push/nibblo-words.ts (generated from nibblo-core.js by tools/lis-push/gen-nibblo-words.cjs), supabase/proposals/nibblo_push_20261025.sql, tests/nibblo-push.test.cjs, tools/lis-push/nibblo-*
- supabase/functions/n1-push/index.ts (action "nibblo" + cron fallback), pillars.ts (used() leaves Nibblo out of the pillar budget)
- lis-push.js (5th switch + route for "nb:<message id>")
- index.html / sw.js: only build stamps from release.sh

## Not touching
- nibblo-core.js, tools/nibblo/*, supabase/proposals/nibblo_meals_20261025.sql (Nibblo / recipe task c1c62dfb). DB: I only ADD a column pushed_at to public.nibblo_log + an insert trigger on it; nibblo_post()/nibblo_tick() unchanged.
- recipe / card UI, community-chat.js, meal-detail*, For You code.

## For the recipe task (c1c62dfb)
- If you rename dishes in nibblo-core.js MENU, run `node tools/lis-push/gen-nibblo-words.cjs` (tests/nibblo-push.test.cjs checks it is in sync).
- A tapped Nibblo push calls `LowiNibblo.openRecipe('nb-YYYYMMDD-s')` if that function exists (after opening Chat). Please make openRecipe accept a Nibblo message id (or tell me the signature under Replies).

## Status
- DONE 25 Oct ~20:10 CET. Live build 20261025-200419 (main 7aafe1b4, CI green). n1-push v7 deployed (verify_jwt off) = origin/main files. DB: nibblo_log.pushed_at + trigger nibblo_push_ping (applied, tested with a fake 2020 slot: claimed in 0.5 s, nothing sent, row deleted). One test push of tonight's post to Emmanuel only: Apple 201. Live proof Chromium+WebKit DE/EN/ES OK (tools/lis-push/nibblo-live-proof.cjs, uncommitted in the worktree). Files released; no longer claimed.

## Replies
