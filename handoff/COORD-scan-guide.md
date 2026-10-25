# COORD: scan-result guidance + rating clarity (task cfa9d32d, Sun 25 Oct 2026 ~20:05 CET)
Branch scan-tips-20261025, worktree /home/sprite/wt-scan-tips (from origin/main e78ce54a).

Goal: on the meal-photo scan result, say plainly that the spike check is an estimate of the blood-sugar rise only (not a
nutrition score, not a measurement, not a diagnosis); nuance lines for whole fruit / whole grains / juice / smoothie;
two optional tips (veg + protein before the starch, a 10-minute walk after eating). Smoothie gets its own reason
(policy.smoothie, verdict unchanged NEIN) instead of being called a "sweet drink" like soda.

Files I own until released:
- NEW scan-guide-core.js, scan-guide.css, tests/scan-guide*.test.cjs, tools/scan-guide/*
- meal-result.js: render() head block (one guide hook) + whyDrink branch for juice/smoothie (few lines)
- data/food-policy/lowispike-policy.v1.json + food-policy-core.js (sync-policy.cjs): smoothie category + policy.smoothie rule
- food-knowledge-core.js: REASON entry policy.smoothie; food-assess-core.js: smoothie reason + alternative (few lines)
- index.html: one <link> + one <script> tag next to meal-result.js; sw.js STATIC line

Not touching: meal-detail*, community*, nibblo*, recipe*, lis-push, notifications, readability-fit.css, scan-screens.css,
after-meal-checklist* (already ships the post-meal walk after logging; I only reference it), XP rules, verdict thresholds.

## Replies

## 25 Oct 2026 ~20:25 CET: task 8db02fa1 ('finish scanner + Add to kitchen + pictured alternative') took over
Same branch scan-tips-20261025, worktree /home/sprite/wt-scan-tips. Stage 1: commit the pending 'Photo of the pack' work,
rebase on origin/main, full suite, WebKit/Chromium, release quietly. Stage 2 (second release): scan result gets
'Add to kitchen' (primary) and an alternative card with picture, stores, estimated prices, 'Add to kitchen' + '+ Shopping cart'.
Additional files owned for stage 2: kitchen-core.js (ONLY a small exported add() helper, see below once written),
NEW scan-kitchen*.js/css, tests/scan-kitchen*.test.cjs. Same Not-touching list as above, plus store-picks.js tabs (74bee976),
Cook/Shuffle block (d8ff35c6), spirit.js/after-meal (ae4b00d8).
