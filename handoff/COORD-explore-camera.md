# Explore: Misty too small (task 2d2c1408, Oct 18 2026 01:20 CEST)

Branch fix/explore-camera, worktree /home/sprite/wt-explorecam (from origin/main 7b7e18c).

## Owned (only these)
- misty-flight.js: insideFrame() size line ("the size she had at the door"), enterInside() size, startOut() starting size,
  new pure helper inSizeK/IN_SIZE in its core export. Nothing else in that file.
- New test tests/misty-in-size.test.cjs, new tool tools/explore-probe.cjs (diagnosis probe).
- What's New entry in version.json via scripts/release.sh only.

## Not touching
nav-moves.js, top-bar.js, world-home.js, spirit.js, index.html loops (cc6cad4b), Care board/Community roster (29c228f1),
.github/ and scripts/ (b98e4217), grocery quick view (b3479d1f).

## Finding (measured, Chromium 390x844, tools/explore-probe.cjs)
The timed trip hands Misty to the autopilot tour. Free flight keeps her on-screen size constant (160-220 px sprite).
Inside a cell world she is pinned at K.MIN_K = 0.42 of her size the whole stay (92 px sprite vs 220, camera dist 24.9),
and she never comes closer. Orbit-in shrinks her to ~0.13 on purpose (owner is fine with that).

## Replies

## Status 01:45 CEST
- Fix committed on fix/explore-camera (misty-flight.js inside size only + tests/misty-in-size.test.cjs + tools/explore-probe.cjs).
  Measured Chromium 390x844: inside a world 192 px sprite most of the time (was 92-95 pinned), far spell down to ~96 px for a few s.
  Joined heart (base 90): 76 px (main: 38). Recall from inside: she leaves at her inside size (no pop), lands home.
- Releasing via scripts/release.sh under the shared lock now.

## RELEASED (01:43 CEST) build 20261018-014128, commit 9867970 on main via scripts/release.sh (ci/ branch green, fast-forward, no force).
Tests 1250/1250 (floor 1246). CI on main run 39080064698 success. Live misty-flight.js == repo. Live has since moved to 20261018-014246 (another task), fix still in.
I own nothing any more.
