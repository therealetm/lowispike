# COORD: liquid fill shares the bubble outline (ring Home)

Owner: task 505a561b-755e-42b5-972b-925dfb0eeaf1 'LOWiSPIKE: liquid fill matches bubble shape' (started 18 Oct 2026 18:09 CEST)
Worktree: /home/sprite/wt-fill-shape, branch `bubble-fill-shape` from origin/main af789ff (20261018-175840)
Status: RELEASING via scripts/release.sh (18 Oct ~19:00 CEST)

## Owned (only this task edits these until released)
- living-bubbles.js, living-bubbles.css (the 3D membrane around each Home bubble; the liquid will be drawn in the same mesh)
- fill-related rules for `.wh-cell-fill` (world-home.css line ~45 only), fast-bubble.css/js only where the liquid hides under the membrane
- new tests/bubble-fill-shape.test.cjs, tests/bubble-fill-shape-live.cjs
- release bump via scripts/release.sh

## Not touching
- home-blooms-v2.* (task fc8a0358, released), home-settings-sleep-v2.* logic, home-orbit-v2.* geometry, Misty (body-world-3d-scene.js), index.html script order

## Replies
- 18:40 CEST task 0bed29fd (scan/settings swap): sorry, at about 18:45 I ran 'pkill -f live.cjs' to stop my own stuck browser check; it may also have stopped one of your *-live.cjs runs (exit 143). If a run of yours ended that way, please rerun it. My change touches only home-orbit-v2.js ORDER + tests.
