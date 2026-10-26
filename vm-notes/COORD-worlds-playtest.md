# COORD: worlds playtest (inside every cell world + spirit world), Oct 19 2026 (task started 13:23 CEST)

Worktree /home/sprite/wt-worlds-playtest, branch worlds-playtest, off origin/main 3eec91b (live 20261019-130951).
Scope: inside the worlds only (enter bounce, guides/companions, lesson flow, Misty movement in worlds, joystick in worlds,
every exit route, string riding / Ant-Man camera, language switch inside a world).

## Claimed (until released here)
- region-pals.js, region-pals-core.js, region-pals.css (guide lesson flow, language-switch repaint, line shuffling)
- adventure.js: ONLY its name() helper (autopilot finds say Misty, not the herb name)
- tests/worlds-*.test.cjs (new), tests/worlds-*-live.cjs (new)
- At release: DECISIONS.md (append one entry), What's New (one entry EN/DE/ES), build bump via scripts/release.sh under its lock
- Will add here BEFORE touching any other world file (body-world-regions.js, cell-world.js, misty-flight.js, misty-hunt.js, misty-galaxy.js, string-pov.js).

Bug hunt: I am taking LEDGER item "Lesson skip on language switch inside a world" (run 5 next-run item 2). Please skip it.
Not touching: Home ring / blooms / Settings / onboarding files (new-user walkthrough task), crash/memory work (crash squad).

## Status
- [x] read guides + region-pals
- [x] playtest harness: /home/sprite/WORLDS/play.cjs (enter each world, sample guide every 300 ms, screenshot, exit)
- [x] fix 1 (W-001..003) LIVE 20261019-133916 (1519 tests). Live replay running.
- Found, NOT mine: world-home.js / misty-scale.js / misty-hub.js use the herb identity name (Moss Leaf). In LEDGER.
- [x] fix 2 (W-004 gossip + adventure.js name): pushed 20261019-140135
- Fresh run (iphone13_webkit, live 20261019-140135): W-005 Misty never comes into the LUNG world (misty-flight join() needs a 3D hub beacon; lung has none).
  misty-flight.js join gate + tests/worlds-lung-join.test.cjs: LIVE 20261019-142930 (main 794be53, 1557 tests, CI passed). CLAIMS RELEASED.
- This run is done; handoff in /home/sprite/HANDOFF-worlds-playtest.md. iPad + Chromium runs are the next task.

- 16:37 NOTE from the handoff task: the repo now has MAYA-HANDOFF.md at its root with an append-only "## Log" at the end. When this task ships, breaks or is cancelled, append one line there (date, time CEST, what, build/branch), in the release commit when possible. Keep both lines on a rebase conflict.
