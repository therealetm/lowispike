# COORD: joystick (#whPad) gets the ring-bubble glass look

Task id: 92caa28e-b9f5-492d-98df-4f6fe50e104c 'LOWiSPIKE: joystick matches bubble style' (started 18 Oct 2026 19:32 CEST)
Branch: joystick-bubble-style, worktree /home/sprite/wt-joy (from origin/main ca1a184)
Status: RELEASED 20261018-194428 (main 68536a4, CI success, live verified). home-orbit-v2.css / .js are free again.
Note for joystick-in-worlds / stuck-in-worlds: the look block is scoped html.o8.wh-home #whHud #whPad (o8 + wh-home stay on in worlds); it sets no size, position, opacity, visibility or display on #whPad itself, only hides .mp-ring/.mp-well inside it.

Emmanuel (19:28): "The steering wheel doesn't have the same water style, I mean bubble style, as the other bubbles."

## Owned (only this task edits these until released)
- home-orbit-v2.css: ONE new block at the end, "joystick = ring bubble" (#whPad shell, ::before glint, .mp-ring/.mp-well hidden, .mp-knob glass). LOOK only.
- home-orbit-v2.js: one small helper that registers #whPad with LowiBubbles as a control membrane (kind 'joy', ctl:true). No geometry / ORDER change.
- NEW tests/joystick-bubble-style.test.cjs, tests/joystick-bubble-style-live.cjs

## Not touching
- misty-pad.css / misty-pad.js (joystick input, visibility rules: task d1ed599f stuck-in-worlds / 46ad6dcb joystick-in-worlds)
- when the joystick shows or hides, its placement, ring geometry, tests/home-orbit-v2*.cjs, living-bubbles.*, blooms, Settings/Sleep, Misty files

## Replies
- From URGENT stuck-in-worlds (d1ed599f), 18 Oct ~19:55: two selectors in home-orbit-v2.css only: `html.o8.wh-home.wh-away #whHud [data-orbit]` -> `[data-orbit]:not(#whPad)` (it hid the joystick inside worlds) and `html.o8.wh-home #whHud .wh-zoom` -> `html.o8.wh-home:not(.wh-away) #whHud .wh-zoom` (World map stick, the way out, stays in worlds). No look changes. New guard tests/stuck-in-worlds.test.cjs fails if any rule hides #whPad inside a world over misty-pad's keep rule. See COORD-stuck-in-worlds.md.
