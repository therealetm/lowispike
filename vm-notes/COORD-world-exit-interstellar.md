# COORD: Interstellar world exit (slower, rocket POV) + weak Misty pulled back (Oct 19 2026)

Task: "LOWiSPIKE: Interstellar world exit + weak Misty pulled back" (started Mon 19 Oct 07:28 CEST).
Emmanuel (call, morning): exit still too fast, POV doesn't communicate escape; wants a rocket fighting to leave a world, Interstellar launch perspective. Weak Misty (below half energy, existing rule) fails at the rings and gets pulled back, with a shuffled no-repeat pool of lines.
Worktree /home/sprite/wt-exit-interstellar, branch world-exit-interstellar, off origin/main 27c9151 (live build 20261019-064609).
Follows COORD-world-exit-reverse.md (that task's step 1 released, step 2 taken over here).

## Claimed files
- body-world-regions.js (ONLY the way-out: seamStep / travel / finish exit code)
- misty-flight.js (ONLY startOut / outFrame / exitGo)
- misty-hunt.js (added gateOut / heldSay / HELD / bagNext; nothing else changed)
- DATA_CONTRACTS.md: one new row (lowi-misty-held-bag) right under lowi.guides.v1 (companion task: I do not touch your row)
- tests/oct17-no-inbetween.test.cjs, tests/one-world-home.test.cjs (harness / code-shape updates for the new pacing)
- tests/oct18-world-exit-reverse.test.cjs (assertions only added/updated for new timing), tests/oct19-exit-*.test.cjs (new), tests/oct19-exit-*-live.cjs (new)
- At release: DECISIONS.md (append), What's New, build bump via scripts/release.sh under the lock

## Not touching
misty-explore.js, galaxy-bubbles.js (autopilot task 3a4c3c3a), region-pals*, arrival-cards*, speech/companion files (Remember task), misty-pad*, home-orbit-v2.css (joystick task), home-settings-sleep-v2* (Settings side panel), world-home.js (read only), body-world-3d*.js (read only unless noted here first).

## Status
- [x] Failing tests (tests/oct19-exit-interstellar.test.cjs, 10, all fail on main) + code for both parts (one release: weak exit is gated to steering only)
- [x] Full suite 1446/1446 locally
- [x] Browser checks pre-release: oct19-exit-launch-live launch + weak in Chromium 390x844 and WebKit iPhone 13, launch on WebKit iPad landscape; world-exit-reverse-live Chromium; stuck-in-worlds-live WebKit iPhone 13 + Chromium: all pass
- [x] RELEASED build 20261019-080527, main d54777e, tests 1466/1466, CI on main success, live files match
- Files free again: body-world-regions.js, misty-flight.js, misty-hunt.js, tests above.

- 16:37 NOTE from the handoff task: the repo now has MAYA-HANDOFF.md at its root with an append-only "## Log" at the end. When this task ships, breaks or is cancelled, append one line there (date, time CEST, what, build/branch), in the release commit when possible. Keep both lines on a rebase conflict.
