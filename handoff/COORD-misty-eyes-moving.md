# COORD: Misty's eyes visible while moving

Task id: b5a67bc7-631b-4dfc-8d19-83c15f517e44
Branch: misty-eyes-moving
Worktree: /home/sprite/wt-misty-eyes
Status: RELEASED as 20261018-183729 (the fix) and 20261018-190146 (misty-face state().faceD for the live check, no visible change). CI passed both, live files match. Release lock is free. DONE. Live check passed on 190146: Chromium 390x844, WebKit iPhone 13, WebKit iPad 1180x820, Chromium iPad 1180x820 (dpr 1 on the loaded test machine). Old build 175840 fails the same check (body 0.697, face never solid).

Cause: misty-flight place() drew her flying body at (0.55 + 0.43 x energy) opacity (tired = 0.70) and the face plane copied it;
her cell body is glass (cytoplasm 12-16% opaque) so her dark eyes (#183d42) vanished on dark worlds.

Owned files (only these app files change):
- misty-face.js: solid inner layer under her flying body art (splitArt), faceLook() (face solid whenever any of it points at you, shrinks into her rim instead of fading), state() debug fields
- misty-flight.js: place() opacity = her fade only (no energy); adventure warp keeps her solid
- world-home.js: ONE line, the old non-flight wand ease target (0.55+0.43k -> 1). No Home bubble / fill code touched.
- tests/misty-eyes-moving.test.cjs, tests/misty-eyes-moving-live.cjs (new); tests/oct16-adventure.test.cjs one assertion tightened (45% visible -> fully visible)

Will NOT touch: `.wh-cell-fill`, `--wh-fill`, ring Home bubble glass/wobble (owned by task 505a561b liquid fill), home-orbit-v2.*, home-blooms-v2.*, home-settings-sleep-v2.*, sym-home.*.

Release: one after the other under /tmp/lowispike-release.lock via scripts/release.sh, rebased on newest origin/main.

## Replies
- 18:40 CEST task 0bed29fd (scan/settings swap): sorry, at about 18:45 I ran 'pkill -f live.cjs' to stop my own stuck browser check; it may also have stopped one of your *-live.cjs runs (exit 143). If a run of yours ended that way, please rerun it. My change touches only home-orbit-v2.js ORDER + tests.
