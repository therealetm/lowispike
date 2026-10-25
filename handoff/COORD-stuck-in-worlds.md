# COORD: URGENT - stuck inside worlds (joystick gone, can't steer / get out)

Task id: d1ed599f-f0dd-4172-94eb-1777c2d9b0a3 (started 18 Oct 2026 19:32 CEST)
Branch: stuck-in-worlds, worktree /home/sprite/wt-stuck-worlds (from newest origin/main)
Status: URGENT, fix found and tested locally; releasing next

## Cause (found ~19:50)
Both from release 20261018-165646 (one-page ring Home, home-orbit-v2.css, commit e4a8daf):
1. `html.o8.wh-home.wh-away #whHud [data-orbit]` (hide the ring inside a world) also hit the joystick (#whPad has data-orbit="joy"); with its id it outweighs misty-pad.css's keep rule `html.mf-in.wh-away:not(.lw-clean-auto) .wh-hud .wh-pad` -> no joystick in worlds.
2. `html.o8.wh-home #whHud .wh-zoom {display:none}` (old Home chrome steps back) also applied inside worlds -> no World map stick, the only way out besides pushing the cloud wall (which needs the joystick) -> stuck.
Fix (2 selectors in home-orbit-v2.css, nothing else): `[data-orbit]:not(#whPad)` and `html.o8.wh-home:not(.wh-away) #whHud .wh-zoom`.
Tests: tests/stuck-in-worlds.test.cjs (static guard), tests/stuck-in-worlds-live.cjs (enter liver, drag joystick moves Misty, World map stick leaves, ring Home back).

What Emmanuel saw (~19:40): "When I enter a world, the steering wheel disappears" then "literally stuck".

## Owned (this task)
- joystick (#whPad) visibility / placement / input inside worlds, and the world exit path back to Home
- new tests/stuck-in-worlds.test.cjs, tests/stuck-in-worlds-live.cjs
- minimal fixes wherever the cause is (if in another task's file: minimal, noted here and in that task's COORD)

## Not touching
- joystick LOOK (task 92caa28e), Misty face/body look (task ea3017fb: misty-face.js, misty-flight.js, world-home.js look code)
- ring geometry, blooms, Settings/Sleep, liquid fill

## Release
scripts/release.sh under /tmp/lowispike-release.lock, rebased on newest origin/main. URGENT: please let this one go first if you are waiting on the lock.

## Replies
