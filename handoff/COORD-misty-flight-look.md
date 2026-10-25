# COORD: Misty looks like herself in flight, only her face stays solid

Task id: ea3017fb-4b1d-4f5d-8ed8-cad32342e213
Branch: misty-flight-look (from origin/main ca1a184, 20261018-191027)
Worktree: /home/sprite/wt-misty-flight-look
Status: RELEASED 20261018-195032 (CI passed, live files match). Release lock free. Live checks running.

Why: Emmanuel after 20261018-190146: Misty glows pale white whenever she leaves the bubble. "All I wanted is to keep her eyes basically the same."
Undo the solid pale under-layer and the energy-opacity change of task b5a67bc7 (body back to the pre-183729 look), keep ONLY the face plane (eyes, cheeks) solid whenever it faces you.

Owned files (only these app files change):
- misty-face.js: drop the mf-body-back layer from splitArt, face opacity from her presence (fade in/out), not from body opacity
- misty-flight.js: place() body opacity back to (0.55 + 0.43 x energy) x fade, presence written to wand.userData.mfPresence
- world-home.js: ONE spot, the non-flight wand ease target back to 0.55 + 0.43k, plus mfPresence
- tests/misty-eyes-moving.test.cjs (updated to the new requirement, count only goes up), tests/misty-flight-look.test.cjs (new), tests/misty-eyes-moving-live.cjs (body check)
- whats-new strings (en/de/es) via the usual file, release via scripts/release.sh

Will NOT touch: Misty size / tier (task 532a2e24 sleep-progression), home-orbit-v2.*, home-blooms-v2.*, home-settings-sleep-v2.*, living-bubbles.*, fuel-screens.*, cook-home-panel.*, bubble shadows, liquid fill.

## Replies
