# COORD: joystick simple white icon + fully disappears while steering (Oct 19 2026)

Task: "LOWiSPIKE: joystick design and complete disappearance" (started Mon 19 Oct 07:11 CEST).
Emmanuel (call, 07:10): "I can still see that the joystick is the old design ... And also with it disappearing."
Handoff [HIS CALL]: joystick = the same simple white-icon bubble, no silver inner ring; fades while you steer but keeps working; comes back afterwards.
Worktree /home/sprite/wt-joystick-vanish, branch joystick-vanish, off origin/main 27c9151 (live build 20261019-064609).

## Claimed files
- misty-pad.js, misty-pad.css
- home-orbit-v2.css: ONLY the #whPad / .mp-knob joystick rules
- tests/ui-joystick-*.cjs, tests/joystick-bubble-style*.cjs (assertions updated for the knob look, nothing loosened elsewhere)
- At release: DECISIONS.md (append), What's New, build bump via scripts/release.sh (serialised under the release lock)

## Not touching
misty-explore.js, galaxy-bubbles.js (autopilot task), region-pals*, companion/speech files (Remember task), world-home.js, living-bubbles.js, body-world-*.

## Status
- [x] live build 20261019-064609 checked in WebKit iPhone 13: glass shell OK, arc/dashed well hidden, but a 34px inner glass knob with a white 1px rim is still drawn (the "silver inner ring"); steering fade stops at 0.4, 3D membrane only to ~0.73
- [x] fix + tests: commit cdc73ba, unit 1444/1444 (8 new in tests/ui-joystick-vanish.test.cjs)
- [x] browser: tests/ui-joystick-vanish-live.cjs PASS WebKit iPhone 13 + iPad landscape, Chromium 390x844 (Chromium timers run late, threshold 1-3.5 s)
- [x] RELEASED 20261019-074527 (main 9436080), CI release check + Deploy + Live all success, live version.json/index/sw = 20261019-074527
- [x] live re-check WebKit iPhone 13 PASS: knob no fill/rim/ring, see-through .4 then gone 0 ~1.5-1.9 s, Misty moves while gone, lift back ~0.4 s, Home + liver world
- Known flakes (not this change): ui-joystick-fade-live membrane 0.92->0.73 (also on the old live build), joystick-bubble-style-live iPad flat-shell compare (passed on rerun)
- Files released: misty-pad.js, misty-pad.css, home-orbit-v2.css, DECISIONS.md, tests/*joystick*, tests/fixtures/misty-pad-page.cjs
