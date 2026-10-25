# COORD: Misty's face (eyes, mouth, cheeks) fully solid in flight

Task id: 726192af-0867-4c78-97f8-91bcf36d622a
Branch: misty-face-solid (from origin/main f3477a1, live 20261018-195032)
Worktree: /home/sprite/wt-misty-face-solid
Status: investigating

Why: Emmanuel on 20261018-195032: "her eyes and mouth are still transparent the moment she leaves the bubble. Fix that." Body look stays as ea3017fb left it.

Owned files: misty-face.js (face plane only), possibly misty-flight.js face part, tests/misty-face-solid*.cjs (new)
Will NOT touch: body/glass look, joystick (#whPad), home-orbit-v2.*, home-blooms-v2.*, home-settings-sleep-v2.*, living-bubbles.*, fuel-screens.*, cook-home-panel.*, scanner, sleep tier size, worlds exit code (d1ed599f), pinch (b72f1902).

Release: scripts/release.sh under /tmp/lowispike-release.lock, rebased on newest origin/main.

## Replies
