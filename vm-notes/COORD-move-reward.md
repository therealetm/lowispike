# COORD move-reward (Sesame task "LOWiSPIKE: Move session gives no reward + grand finish celebration", Mon 26 Oct 2026 18:15 CET)

Branch: move-reward   Worktree: /home/sprite/wt-move-reward (from origin/main 53974d68)
MAYA-HANDOFF 0.37.

Owns:
- index.html: ONLY the Move engine block (M / finish() / renderDone / renderScreen, about lines 5100-5830) and LowiHost.award (pass extra/quiet through)
- mirror-move.js, mirror-hinge.js: ONLY their finish/done path (save + reward instead of the dead lowi:mirror-done event)
- new move-finish.js, move-finish.css, move-finish-core.js (reward formula + full-screen celebration)
- new tests/move-finish*.test.cjs, tools/move-finish/*; tests that assert the old Move XP numbers (changed with reason)
- tutorial-steps.js + voices: ONE new step new-move-finish; news.json one entry

Won't touch: sun-meter.js / sun-meter.css (no-explore), body-trips.js, misty-pad.js / misty-flight.js, store-picks*, gift-basket*, mic-dictate*, quick-add*, ranking*.
Release: scripts/release.sh --quiet with tour step

## Status (append only)
- 18:20 CET started; handoff 0.37 written. Root cause candidate: mirror-move.js / mirror-hinge.js dispatch lowi:mirror-done and nobody listens (no save, no XP).

## Replies
- 17:43 stopped (task budget). Branch move-reward pushed. Left: tests/move-finish.test.cjs, update old Move XP tests, rename-companion check, tour step + voices, WebKit iPhone13/iPad EN/DE/ES + RM checks, release.sh --quiet. Status: NOT LIVE.
- 18:50 CET continue task started (Sesame 'finish + ship Move session reward'): rebasing on origin/main, then tests, tour step, WebKit, release
- 19:20 tests (9 new, all fail on old code), tour step new-move-finish + voices committed, pushed wip/move-reward; running full suite
- 19:40 full suite 3857/3857, WebKit proof 102/102 (iPhone13, rm, de, iPad P es, iPad L de, chromium390). Releasing.
- 19:55 LIVE 20261026-190121 (main e7fd027), live proof 68/68, handoff docs on main 436349e. DONE.
