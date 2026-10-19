# COORD: autopilot crash in the spirit world + string travel (Oct 19 2026)

Task: "LOWiSPIKE: autopilot bubble re-entry crash and string movement" (started Mon 19 Oct 07:10 CEST).
Emmanuel: on autopilot out in the spirit world Misty got sucked into a bubble twice, then the app restarted from the beginning.
Wanted: she hooks onto the strings and drifts along them bubble to bubble, changing strings; flies on her own only when no string reaches the next visible bubble; visits every visible bubble.
Worktree /home/sprite/wt-autopilot, branch autopilot-crash, off origin/main (live build 20261019-064609).

## Claimed files
- misty-explore.js (the autopilot excursion)
- galaxy-bubbles.js (enter/leave/skin/currents)
- body-world-3d-scene.js: ONLY reading cosmos-threads userData (no edits planned; will note here if that changes)
- tests/adventure-tiers.test.cjs, tests/galaxy-bubbles.test.cjs (assertions only added/narrowed, nothing deleted)
- tests/oct19-autopilot-strings*.cjs (new), tools/autopilot-probe.cjs (new)
- At release: DECISIONS.md (append), What's New, build bump via scripts/release.sh

## Not touching
region-pals*, arrival-cards*, speech/companion files (companion Remember Yes/No task), body-world-regions.js, world-home.js, Home bubbles, Settings, Fuel, joystick.

## Status
- [x] reproduce crash ("pulled in twice": cause found, re-entry cooldown GB.COOL)
- [x] string tour built (uncommitted round 1, now WIP commit 152a71c)
- ROUND 2 (task started 08:38 CEST Oct 19): rebased on origin/main d54777e (build 20261019-080527). Hunting the 3-in-10 freeze
  right after a string catches her. Same claimed files as above, nothing new. Will release via scripts/release.sh, then note it here
  so the Ant-Man POV task (COORD-string-pov.md) can rebase and release after.
- [x] freeze captured: string 11 (bubbles 5 and 30, glass 16 apart), going up, pinned at point 23 by the far membrane for 56-58 s
  (2 of 2 probe runs before the fix). Fix: galaxy-bubbles core.slide/rest/span (strings cut to what she can reach for her size hs),
  misty-explore core.pin (no progress 3 s on a ride: arrive or let go; hook 6 s). 3 Chromium runs after: no ride pinned, string 11 in 7-9 s.
- [x] committed 908ba78 on autopilot-crash (one commit on origin/main d54777e). Suite 1477/1477.
- [x] WebKit iPhone 13 probe: no crash/errors/reload in 540 s, but too slow here (1-3 fps) to reach a string ride.
- [x] RELEASED 20261019-091732 (main 1c3e794, CI green, live serves it). Release lock is free: string-pov can rebase and release now. NOTE for string-pov: strand() now takes a 4th arg hs, and returns clear.
