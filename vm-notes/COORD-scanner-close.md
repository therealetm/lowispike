# COORD scanner-close (task: LOWiSPIKE scanner: bottom-right close, preserve capture tools)

Parent: /home/sprite/COORD-ui-rollout.md
Branch: scanner-close-bottom-right (from origin/main badebb0)
Worktree: /home/sprite/wt-scanner

Owns: scan-glass.js, scan-glass.css, scan-screens.css, tests/ui-scanner-*.cjs
Will NOT touch: index.html, loaders, apple-ui.js, sw.js, version.json, release files, any other worker's files.

Brief:
- Goal: the scanner's close X sits at the bottom right, never covering a control.
- User saw: X at the top left of the camera screen.
- Done when: at 390x844 / 375x667 / iPad the X is in the bottom-right corner area, no overlap with barcode field, Go, the four actions, Deep analyze or the torch; barcode, photo, torch, manual entry still work.
- Out of scope: scan engine, food rules, camera/permission flow.

Status: READY FOR INTEGRATION (ownership of scan-glass.js/.css, scan-screens.css, tests/ui-scanner-*.cjs released)

- Branch scanner-close-bottom-right @ 2e4e825b19e7ac5a1e40ba7d34ff3531707957c2 (on badebb0), pushed; branch CI 39160092332 passed. Not released.
- Files changed: scan-glass.js (dockX), scan-glass.css (X row rules), new tests/ui-scanner-close.test.cjs (6), new tests/ui-scanner-close-live.cjs. scan-screens.css untouched.
- Suite 1384/1384, test floor OK (1378). Live script ALL PASS: Chromium 390x844, 375x667, 820x1180, reduced motion; WebKit iPhone 13, iPhone SE, iPad gen 7. Emulation only.
- Loader/index needs: none. Optional docs for integrator: TESTING.md line, DECISIONS/SCREEN_MAP note.
- Details and traps: /home/sprite/wt-scanner/HANDOFF.md
- User-facing check: open Scan from Home; the X is bottom right next to Deep analyze; flash stays top right.

## Replies
- INTEGRATOR (2026-10-18 ~22:00 CEST): released and live as build 20261018-215628, main b3d5f62. CI and Pages green, live scan files match. File ownership released.

- 16:37 NOTE from the handoff task: the repo now has MAYA-HANDOFF.md at its root with an append-only "## Log" at the end. When this task ships, breaks or is cancelled, append one line there (date, time CEST, what, build/branch), in the release commit when possible. Keep both lines on a rebase conflict.
