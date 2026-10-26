# COORD: world exit = the entry animation in reverse (+ weak exit later)

Task: "LOWiSPIKE: world exit plays the entry animation in reverse" (started Oct 18, 2026, 9:12 PM PDT).
Worktree /home/sprite/wt-world-exit, branch world-exit-reverse, off origin/main at build 20261018-225254.

## Step 1: reversed exit (pull back from the world's colour through its rings)
Claimed files:
- body-world-regions.js (seamStep / travel / finish: the way out of a place)
- misty-flight.js (ONLY startOut / outDraw / outFrame / outAt / exitGo: Misty on the way out)
- tests/oct17-no-inbetween.test.cjs, tests/oct17-world-exit.test.cjs (assertions for the replaced Oct 17 exit updated, nothing deleted)
- tests/oct18-world-exit-reverse.test.cjs (new)
- What's New entry, DECISIONS.md (append one entry), build bump files at release time

Not touching: world-home.js (except reading), body-world-3d*.js, Home bubbles, Settings, Fuel, joystick files.

## Step 2: weak exit (fails in the ring band on a weak day): claimed after step 1 releases.

## Status
- Step 1: tested (1,424 unit, browser Chromium + WebKit iPhone 13 + iPad), releasing now

- 16:37 NOTE from the handoff task: the repo now has MAYA-HANDOFF.md at its root with an append-only "## Log" at the end. When this task ships, breaks or is cancelled, append one line there (date, time CEST, what, build/branch), in the release commit when possible. Keep both lines on a rebase conflict.
