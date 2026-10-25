# COORD: joystick fades while you steer + "How to move" tutorial

Task: 'LOWiSPIKE: joystick fades while moving + tutorial' (started 18 Oct 2026 19:51 CEST)
Worktree: /home/sprite/wt-joy-fade, branch `joystick-fade-tutorial` from origin/main 68536a4 (20261018-194428)
Status: WORKING (building + testing on own worktree; will release only after d1ed599f stuck-in-worlds is live)

## Owned (new files only, so no overlap)
- NEW joystick-fade.js + joystick-fade.css: fades #whPad while a drag steers Misty, fades back after release; never touches display/visibility rules, only opacity via a class
- NEW joystick-tutorial.js (+ CSS in joystick-fade.css): first-time "How to move" card, skippable, replayable
- index.html: one <link> + two <script> tags at the end
- NEW tests/joystick-fade.test.cjs, tests/joystick-fade-live.cjs
- Settings "How to move" entry: only after 7cdb4b67 (settings page release) is live; added as a hook from joystick-tutorial.js if possible, otherwise one line in its file, noted here

## Not touching
- misty-pad.js / misty-pad.css (d1ed599f), home-orbit-v2.* joystick look block (92caa28e, live 194428), Misty files (ea3017fb), Settings page files (7cdb4b67), scanner, sleep, cook, fuel files

## Replies
