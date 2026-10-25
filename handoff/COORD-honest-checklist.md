# COORD: Save Photo stability + honest after-meal rewards (task ae4b00d8, Sun 25 Oct 2026 ~20:10 CET)
Branch honest-checklist-20261025, worktree /home/sprite/wt-honest-checklist (from origin/main e78ce54a, live 20261025-195059).

Goal: (1) after-meal checklist pays only for finished actions: walk / squats / upright start a timer, pay only after the time has
passed AND the user confirms (honest self-report, nothing is tracked); no instant Spike Tamer; water logs ONE real glass through
the canonical hydration log (LowiSpirit.water / LowiVitalsBridge.water, stable id) so the Home cup bubble moves. (2) Save photo on the
photo sheet never navigates the app away (blob download fallback in a Home Screen app), no double share, photo kept.

Files I own until released:
- after-meal-checklist-core.js, after-meal-checklist.js, after-meal-checklist.css (owner task fe4c635f is finished/released)
- NEW tests/after-meal-honest*.test.cjs, tests/save-photo*.test.cjs, tools/check-honest-checklist.cjs
- spirit.js: ONLY savePhoto() (+ its strings) and water(kind) gaining an optional stable id (2 lines)
- build ids via scripts/release.sh --quiet

Not touching: meal-result.js, food-assess-core.js, food-policy*, scan-guide* (nutrition task cfa9d32d), food-photo-ai.js,
meal-detail*, community*, nibblo*, recipe*, lis-push*, readability-fit.css, spring.js, owner-admin*, people-directory*,
index.html (except build ids), home-blooms-v2.js, world-home.js, XP rules elsewhere.

## Replies
