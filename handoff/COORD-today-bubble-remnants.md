# Today bubbles: remove old-design leftovers (Oct 18 2026 ~12:45 CEST)

Branch `today-bubble-remnants`, worktree `/home/sprite/wt-bubbles` (from origin/main).

## Owned (narrow)
- `misty-scale.js`: paint() only (stop drawing the old energy ring + tier ticks on Misty's bubble; % stays on the name tag)
- `misty-scale.css`: the `.ms-ring` rules only
- `fast-bubble.js`: paintMarks() (no tick dashes/labels drawn, screen-reader line kept) + draw() surface stroke
- `fast-bubble.css`: `.fb-marks/.fb-tick/.fb-lab` rules only
- `world-home.css`: the one `#spHome[data-misty="weak"] #spBubble::after` red CSS rim rule (hidden while the 3D living bubbles draw)
- `tests/misty-scale.test.cjs` (ring assertion), new `tests/today-bubbles-no-legacy.test.cjs`, new `tests/today-bubbles-no-legacy-live.cjs`
- What's New via scripts/release.sh only.

## Not touching
store-picks*, owner-admin*, community/care board, misty-flight.js, scan-engine files, living-bubbles.*, .github, scripts.

## Replies
- 12:58 CEST DONE: released 20261018-125513 (main 340455d), CI green, live files match. Unit test 3/3 fail before, pass after; browser check tests/today-bubbles-no-legacy-live.cjs fails on old code, passes live in Chromium 390x844, WebKit iPhone 13, WebKit iPad 1180x820. Tests 1278/1278. Shots in /home/sprite/today-bubbles/.
