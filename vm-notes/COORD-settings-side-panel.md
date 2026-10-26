# COORD: Settings as a glass side panel (Oct 19 2026)

Task: "LOWiSPIKE: Settings as a glass side panel, not a full page" (started Mon 19 Oct 07:28 CEST).
Emmanuel (iPad screenshot 07:27, build 20261018-225254): Settings should not be a whole page; use the same glass side-panel design as the Body sound panel, Misty/Home visible. Sub-panels opened from Settings (Look & sound / Body sound) appeared BEHIND the page: fix layering.
Worktree /home/sprite/wt-settings-panel, branch settings-side-panel, off origin/main.

## Claimed files
- home-settings-sleep-v2.js, home-settings-sleep-v2.css
- tests/ui-settings-*.cjs (new + the page tests updated to the panel contract, nothing loosened)
- At release: DECISIONS.md (append), What's New, build bump via scripts/release.sh (serialised under the release lock)

## Not touching
misty-pad.*, home-orbit-v2.css joystick rules (joystick task), misty-explore.js, galaxy-bubbles.js (autopilot task), region-pals*, companion/speech files (Remember task).

## Status
- [x] failing test: tests/ui-settings-panel.test.cjs (5, all fail on old code)
- [x] fix: commit f16ac6d on settings-side-panel (rebased on 9436080, joystick release 20261019-074527), 1449/1449 unit tests
- [x] browser checks: tests/ui-settings-page-live.cjs passed in Chromium 390x844 + iPad 820x1180, WebKit iPhone 13, iPhone 13 at 390x844, iPad portrait and landscape
- [x] RELEASED build 20261019-075402, main cd70648, CI success (run 39207024073), live version.json + Settings files match; live re-check passed in WebKit iPhone 13 and iPad landscape

FILES FREED: home-settings-sleep-v2.js/.css are free for the next task. Test floor now 1449.
Open: double tap / hold on Settings still not built. Settings panel on phones scrolls (12 rows in the space under Misty).

- 16:37 NOTE from the handoff task: the repo now has MAYA-HANDOFF.md at its root with an append-only "## Log" at the end. When this task ships, breaks or is cancelled, append one line there (date, time CEST, what, build/branch), in the release commit when possible. Keep both lines on a rebase conflict.
