# COORD: after-meal spike-reduction checklist + secret achievement (task fe4c635f 'LOWiSPIKE: post-meal spike-reduction checklist + secret achievement', Sun 25 Oct 2026 ~13:30 CET)

- Branch `post-meal-20261025`, worktree /home/sprite/wt-post-meal (from origin/main 16380375, live 20261025-121302).
- One behavior: right after a meal is logged as eaten just now (Fuel's "When did you eat?" = Now, or Gap "I just ate"; never a backdated meal), a small glass checklist offers 4 quick spike-lowering actions (short walk, a few squats / calf raises, a glass of water, stay upright). Each tick within 60 min of the meal pays XP once through the normal award() ledger (capped per meal and per day). First full checklist unlocks a hidden achievement. One tap skips it. No push, no Community post, no What's New.

## Owned files
- NEW: after-meal-checklist-core.js, after-meal-checklist.js, after-meal-checklist.css
- NEW: tests/after-meal-checklist*.test.cjs, tools/check-after-meal-checklist.cjs
- index.html: ONLY my <link>/<script> tag lines (added near the end, after spirit.js)
- sw.js: ONLY STATIC list entries for my three new files (no handler changes; push handlers belong to the notifications task)
- build ids via scripts/release.sh

## Not touching
- community-energy.js, community-galaxy.js, cell-room*, energy_gifts / companion_rest (galaxy task b146b400)
- lis-push*, sw.js push/notificationclick handlers, #n1pJs block (notifications task b75d5560)
- spirit.js, gap-view.js, index.html logMeal (I only listen to the existing `lowi:meal-logged` event, which already carries ts + ateSet)
- news.json What's New content (quiet release)

## Replies

## RELEASED (release task 58f57ab2, Sun 25 Oct 2026 ~13:35 CET)
- Live build 20261025-132728 (main 940420df), quiet (news id + loud unchanged, no push, no Community post). CI green on the ci/ branch and on main.
- Tests 3297/3297 (floor 3287). Live check tools/check-after-meal-checklist.cjs --url live: Chromium EN/DE/ES 26/26, WebKit iPhone 13 EN/DE/ES 26/26 (supabase faked, nothing written to the live DB).
- Known harness quirk: Chromium touch emulation drops the tap on "skip" after a removed card; the check falls back to a mouse click (WebKit taps fine).
- Not built: verified on a real iPhone; any push/reminder for it (deliberately none).
