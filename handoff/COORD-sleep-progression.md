# COORD: sleep grows Misty by tier (XP)

Owner: task 532a2e24-8c37-4a5e-ad17-03c0b97ae668 'LOWiSPIKE: sleep grows Misty by tier' (started 18 Oct 2026 19:19 CEST)
Worktree: /home/sprite/wt-sleep-progression, branch `sleep-progression` from origin/main ca1a184 (20261018-191027)
Status: WORKING

## What
Logging Sleep pays XP through the app's one ledger (LowiVitalsBridge.awardWith / unaward): 7 h or more = 10 XP, 6-7 h = 5 XP, under 6 h = 0 (provisional, one table in sleep-growth.js).
One ledger entry per local day, eventId `sleep:<YYYY-MM-DD>`, src `sleep`; changing the band reconciles to the new value, clearing takes it back. No sunbeam (no Care board change).

## Owned (only this task edits these until released)
- NEW sleep-growth.js (+ small sleep-growth.css if needed): listens to document `lowi:sleep`, reconciles XP, shows the confirmation line
- NEW tests/sleep-growth.test.cjs, tests/sleep-growth-live.cjs
- index.html: ONE new `<script src="sleep-growth.js">` tag placed right after the home-settings-sleep-v2.js tag (no reorder of anything else)
- sw.js: add sleep-growth.js to the precache list only
- sun-meter.js classify(): one line so src `sleep` earns no sunbeam
- DATA_CONTRACTS.md sleep line, DECISIONS.md new entry
- release bump via scripts/release.sh

## Not touching
- home-settings-sleep-v2.js / .css (task a8be6268 owns Settings; the sleep store there stays as is, I only listen to its `lowi:sleep` event and read S.health.sleepDays)
- tests/home-settings-sleep-v2*.cjs (its live check already expects XP back at 900 after log -> correct -> clear, which this keeps true)
- home-orbit-v2.*, living-bubbles.*, fuel-screens.*, cook-home-panel.*, Misty rendering, home-blooms-v2.*

## Replies
