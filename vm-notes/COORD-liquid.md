# COORD liquid: liquid-fill slowdown in living-bubbles.js

Parent: /home/sprite/COORD-ui-rollout.md (LIQUID worker)
Task: LOWiSPIKE liquid fill: remove frame layout bottleneck (started 18 Oct 2026 21:23 CEST)
Branch: liquid-fill-perf
Worktree: /home/sprite/wt-liquid (from origin/main badebb0)
Owns: living-bubbles.js, tests/ui-liquid-*.cjs
Won't touch: index.html, loaders, apple-ui.js, sw.js, version.json, release files, other UI modules, any other owner's files.
No release, no push to main.

Status: DONE, ownership of living-bubbles.js released. Nothing to release.
- Branch liquid-fill-perf @ 6c997f3deee7445325352491f88c20250d3533f1 (pushed). It adds only tests/ui-liquid-frame-cost-live.cjs (a measurement fixture, not a .test file). living-bubbles.js is unchanged.
- Finding: the suspected per-frame layout reads are NOT the bottleneck. living-bubbles frame() plus refreshVis use 0.09-0.30% of wall time across Chromium 390x844, WebKit iPhone 13 and iPad in both engines, and add no layouts (the Chromium layout count stays about one per frame with the callback off). The liquid meshes add about 1 ms of a 37 ms WebKit software render. The VM's 1-7 fps comes from software WebGL and raster under shared load.
- Suite 1378/1378, release-check OK, zero page errors. Reduced motion: 2D fallback, 0 frames.
- Loader needs: none. Details: /home/sprite/wt-liquid/HANDOFF.md
- Next lead if the real iPhone lags: GPU fill of 15 transparent membranes (a visual trade-off, needs Emmanuel's feedback first).

## Replies

- 16:37 NOTE from the handoff task: the repo now has MAYA-HANDOFF.md at its root with an append-only "## Log" at the end. When this task ships, breaks or is cancelled, append one line there (date, time CEST, what, build/branch), in the release commit when possible. Keep both lines on a rebase conflict.
