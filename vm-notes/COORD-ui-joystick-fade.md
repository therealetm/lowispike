# COORD: Joystick fades while you steer

Parent: /home/sprite/COORD-ui-rollout.md (JOYSTICK worker)
Task: "LOWiSPIKE joystick: steering fade without losing control" (started 18 Oct 2026 21:24 CEST)
Branch: ui-joystick-fade
Worktree: /home/sprite/wt-ui-joystick-fade (from origin/main badebb0, build 20261018-195906)
Status: READY FOR INTEGRATION (not released, not live). Ownership of misty-pad.js / misty-pad.css released to the integrator.
- Branch ui-joystick-fade, commit b4704259b7d40c4e1a0743a7678bc476160d5d7f, pushed. Author therealetm noreply. Base origin/main badebb0.
- Branch CI run 39160445503: success.
- Unit: 1389 pass / 0 fail (floor 1378). tests/ui-joystick-fade.test.cjs: 11 tests, 8 fail on main before the change.
- Live (emulation only): tests/ui-joystick-fade-live.cjs PASS on Chromium 390x844, WebKit iPhone 13, WebKit iPad landscape, Chromium iPad. Opacity rest 1, drag 0.4 (still under the finger, steering), lift 1; forward hold 0.4; tap never fades; pointercancel and blur restore; inside liver world drag 0.4 with Misty moving, lift 1; reduced motion still fades; more contrast 0.7. 3D membrane fades with it. joystick-bubble-style-live PASS (WebKit iPhone 13).
- Loader requests: none beyond the usual ?v= bump of misty-pad.js / misty-pad.css in index.html at release.
- Full details, What's New text and the iPhone check: /home/sprite/wt-ui-joystick-fade/HANDOFF.md (untracked on purpose).
- iPhone check for Emmanuel after release: drag the joystick on Home; it goes see-through but keeps steering; let go and it comes back. Same inside a world.

## Brief (five lines)
- Goal (one behavior): while a finger actively steers the joystick (drag or forward/back hold), it fades to see-through but keeps working; it comes back when steering stops (lift, pointer cancel, lost capture, app hidden, window blur), on Home and inside worlds.
- What the user saw: the joystick stays fully opaque under the thumb while steering and covers the world.
- Done when: tests/ui-joystick-fade.test.cjs passes, suite >= 1378 with no failures, Chromium + WebKit (390x844 iPhone 13, iPad) show computed opacity drop while dragging, steering still sends input, and full opacity after release/cancel.
- Files I may edit: misty-pad.js, misty-pad.css, new tests/ui-joystick-*.cjs.
- Out of scope: replayable tutorial, joystick glass style (already shipped), placement, home-orbit-v2.*, living-bubbles.js, index.html / loaders / sw.js / version.json / apple-ui.js, other workers' files, release, push to main.

## Owns
- misty-pad.js, misty-pad.css
- tests/ui-joystick-*.cjs

## Will not touch
index.html, apple-ui.js, sw.js, version.json, release scripts, docs, home-orbit-v2.*, living-bubbles.js, clean-view*, home-blooms-v2.*, home-settings-sleep-v2.*, scan-*, existing tests.

## Replies
