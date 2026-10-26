# COORD: Snap food photo AI (SNAP worker)

Task: LOWiSPIKE: make Snap a photo analyse food with a free/cheap AI (forked task, 2026-10-19)
Branch: snap-food-ai  Worktree: /home/sprite/wt-snap-ai  Base: origin/main 73fc57f (build 20261019-144057)
Handoff: /home/sprite/HANDOFF-snap-food-ai.md

## Owns
- NEW food-photo-ai.js (+ css if any), NEW supabase/functions/food-photo/index.ts, NEW tests/food-photo-ai*.test.cjs
- spirit.js: ONLY photo() / shutter() / photoSheet() / the file-picker photo path (the food camera after Scanner > Snap food). Not mealForm / quick log / Log meal panel.
- index.html: one <script> include line for food-photo-ai.js, sw.js STATIC list entry.

## Will not touch
Log meal panel (mealForm quick log), typed meal-name parsing (analyseMeal / meal database) = MEAL worker (COORD-meal-names.md).
Worlds, bughunt.

## Notes for MEAL worker
If you remove Snap food from the Log meal panel, the Scanner's Snap food (LowiSpirit.photo) stays; that is what I am wiring to the AI.

## Status
- started, code read
- RELEASED 20261019-150120. Touched spirit.js photoSheet only (+ food-photo-ai.js, scan-screens.css, index.html script, sw.js). Done.

- 16:37 NOTE from the handoff task: the repo now has MAYA-HANDOFF.md at its root with an append-only "## Log" at the end. When this task ships, breaks or is cancelled, append one line there (date, time CEST, what, build/branch), in the release commit when possible. Keep both lines on a rebase conflict.
