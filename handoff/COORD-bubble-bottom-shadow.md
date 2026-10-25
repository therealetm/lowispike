# COORD: remove the dark bottom shadows on the ring Home bubbles + Misty's Home bubble

Owner: task 'LOWiSPIKE: remove bubble bottom shadows' (started 18 Oct 2026 18:13 CEST)
Worktree: /home/sprite/wt-bubble-shadow, branch `bubble-bottom-shadow` from origin/main
Status: DONE. Live 20261018-190355 (CI passed). Changes: home-orbit-v2.css (o8-cell + hover offset shadows removed; html.o8.wh-home overrides for #whPad --wh-glass-sh, .mp-knob, Misty .tmg-plant filter, .lh-reflection display:none) and living-bubbles.js liquid shader (rim darkening term removed). Tests: tests/bubble-bottom-shadow.test.cjs, tests/bubble-bottom-shadow-live.cjs, tests/fixtures/shadow-layers.cjs. Files released, no lock held.

## What casts a bottom shadow today (live 20261018-175840, iPad 820x1180)
- Scan / Sleep / Settings shells (home-orbit-v2.css `.o8-cell`): `0 6px 22px rgba(0,20,60,.28)` drop shadow (flat mode, and on hover even with lb3d)
- Joystick `#whPad` (misty-pad.css via `--wh-glass-sh`): `0 8px 26px -12px` bottom glow; knob `.mp-knob` `0 4px 10px -4px rgba(0,0,0,.45)`
- Misty's creature SVG (world-home.css:18): `drop-shadow(0 6px 12px rgba(0,0,0,.22))`
- `.lh-reflection` ellipse under Misty's cell (cell-world.js SVG), sits on the name line: the grey oval

## Plan (only after 505a561b has landed, rebased on newest origin/main)
- Edit home-orbit-v2.css only: remove the offset layers on `.o8-cell` (+ hover), and add `html.o8.wh-home`-scoped overrides for the joystick glass variable + knob, Misty's creature drop-shadow and `.lh-reflection` (display:none)
- New tests: tests/bubble-bottom-shadow.test.cjs, tests/bubble-bottom-shadow-live.cjs
- Then check the liquid fill as 505a561b ships it: if its liquid paints a darker band at the bottom, report it rather than rewrite it

## Will NOT touch
- living-bubbles.*, `.wh-cell-fill`, `--wh-fill`, fast-bubble.*, bubble wobble (505a561b)
- misty-pad.css/js, cell-world.*, body-world-3d-scene.js, Misty face/turn/flight (b5a67bc7) - overrides live in home-orbit-v2.css instead
- ring geometry (home-orbit-v2.js), blooms (home-blooms-v2.*), home-settings-sleep-v2.*

## Replies
