# COORD: Ant-Man POV while Misty rides the strings (Oct 19 2026)

Task: "LOWiSPIKE: Ant-Man POV while Misty rides the strings" (started Mon 19 Oct 07:29 CEST).
Emmanuel (call): on autopilot, as Misty nears and rides a string, the camera shifts into a tiny-scale POV beside her on the string:
the string becomes a huge structure, the bubble galaxies loom. "It's not just a zoom. It's a shift in POV." Leaving the string
(flying herself across a gap) smoothly returns to the normal galaxy view. No loading, no heat, Reduce Motion respected.

DEPENDS ON: COORD-autopilot-strings.md (task 3a4c3c3a). Nothing is built on their files until they release.
Until then: read-only study + a scratch worktree (/home/sprite/wt-string-pov) off origin/main for the NEW file only.

## Will claim (after autopilot-strings releases)
- string-pov.js (new): pure helpers + the POV camera and the near-string tube mesh
- tests/oct19-string-pov*.cjs (new)
- misty-galaxy.js: ONLY cam() and speed() (one hook each, so her pace along the string does not drop when the camera comes in)
- index.html: ONE new <script src="string-pov.js"> tag; sw.js: ONLY adding string-pov.js to the STATIC lists
- At release: DECISIONS.md (append), What's New, build bump via scripts/release.sh

## Not touching
misty-explore.js, galaxy-bubbles.js (autopilot task; only READ via LowiGalaxyBubbles.state()/stream()), body-world-3d-scene.js (read only),
misty-flight.js, body-world-regions.js (world-exit tasks), misty-pad*, home-orbit-v2*, region-pals*, Settings files.
Interstellar exit task: if you touch misty-galaxy.js cam() or rig.dist/yaw in the galaxy, please note it here.

## Status
- [x] guides + camera/world code read (read only)
- [x] built + tested in scratch worktree /home/sprite/wt-string-pov (branch string-pov, local only, on 27c9151): 1445/1445, Chromium + WebKit iPhone 13 stage ok
- [x] integration dry run (NOT committed anywhere): my branch + wt-autopilot's in-progress galaxy-bubbles.js/misty-explore.js in /tmp copies,
      tools/autopilot-probe.cjs 230 s: POV goes in on each ride, holds across string transfers, no hunting, no errors.
      FYI autopilot task: in the same probe WITHOUT string-pov (control, /tmp/sp-ctrl) she sits on string 11 at u~0.36 for ~80 s
      (t 124-202, 'ride', camera dist frozen 75.3) until the 60 s+ ride limit; looks like an upstream stall in the in-progress code.
- [x] waiting for autopilot-strings release (released 20261019-091732)
- RELEASE TASK (started Mon 19 Oct 09:26 CEST): rebased string-pov onto origin/main 1c3e794 (index.html / sw.js conflicts were only
  build stamps; re-added the one script tag + STATIC entry). Autopilot-strings task is finished, so I also claim, for the size fix
  below only: misty-explore.js (the S.hs reads in line()/nearTo()/rest calls) and tests/oct19-autopilot-strings.test.cjs (regexes
  updated to the new call, same strictness). Bug hunt: not touching any file it has changed (its worktree is clean on d54777e).
  Found on rebase: misty-explore's strand()/rest() now take her size S.hs, which shrinks ~20x while the POV camera is in, so the
  string's last point is cut for a tiny Misty while the membrane pushes her at galaxy size -> a 3 s pin at each string end.
  Fix: explore reads her galaxy-scale size (S.hsG, set by misty-galaxy.js).
- RELEASED 20261019-095111 (Mon 19 Oct ~09:52 CEST, main 076aa19, tests 1495/1495, CI passed, live files match). misty-explore.js /
  tests/oct19-autopilot-strings.test.cjs claim released. Live autopilot probe (Chromium 390x844, 300 s): POV fully in on all 10 rides,
  no pinned ride, no frame stop, 1 load. Worktree /home/sprite/wt-string-pov can be removed.
