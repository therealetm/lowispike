# COORD: hourly bug hunt (scheduled task, run of Oct 19 2026 09:01 CEST)

Worktree /home/sprite/wt-bughunt-202610190701, branch bughunt-202610190701 (off origin/main 20261019-080527).

## Claimed (this run)
- region-pals.js, region-pals-core.js (guide speech-bubble placement only: obstacles() keep-clear and the dock rule)
- tests/guide-bubble-joystick.test.cjs (new), tests/guide-bubble-joystick-live.cjs (new)
- DECISIONS.md (append one entry), whats-new data (one entry, EN/DE/ES)

Not touching: misty-galaxy.js / misty-explore.js / galaxy-bubbles.js / camera files (Ant-Man POV release task), body-world-regions.js,
world-home.js, home-orbit-v2*, misty-pad*, Settings files.

## Status
- [x] guide bubble never covers the joystick inside worlds: LIVE 20261019-094129 (run done, files released)

# Run 3 (Oct 19 2026 11:01 CEST): worktree /home/sprite/wt-bughunt-202610190901
- [x] praise.js, sun-meter.css (lp-dock), tests/praise-ring-clear.test.cjs, DECISIONS.md: BH-003 LIVE 20261019-110810. Files released.
- Next run plans BH-004 (language switch): index.html setLang + home ring repaint. Not claimed yet.

# Run 4 (Oct 19 2026 12:01 CEST): worktree /home/sprite/wt-bughunt-202610191001
- [x] index.html (setLang + picker click), home-orbit-v2.js, misty-pad.js, spirit.js, cell-world.js (lowi:lang repaint only),
  tests/lang-switch-repaint.test.cjs, tests/lang-switch-live.cjs, DECISIONS.md: BH-004 LIVE 20261019-121209. Files released.

# Run 5 (Oct 19 2026 13:01 CEST): worktree /home/sprite/wt-bughunt-202610191101
- [x] home-blooms-v2.js (Move note placement only), home-blooms-v2.css, tests/move-note-clear.test.cjs, DECISIONS.md: BH-005 LIVE 20261019-130951. Files released.

# Run 6 (Oct 19 2026 14:01 CEST): worktree /home/sprite/wt-bughunt-202610191202 (off origin/main d43d2f4, 20261019-135912)
- CLAIMED: world-home.js, misty-hub.js, misty-scale.js, spirit.js (ONLY the companion-name helper: never the herb auto name "Moss Leaf"),
  tests/companion-name-home.test.cjs (new), DECISIONS.md (append), What's New (one entry). BH-006 = sibling of worlds task W-003.
  New-user walkthrough: your FINDINGS #4 ("Minti Leaf" on Home behind setup) is this same bug; I'm fixing the name source, please skip it.
- Run 6 RELEASED 20261019-143513 (BH-006 name, BH-007 companion key). Claims released. Also touched cell-room.js (cellName only).
  Old-design purge: spirit.js aria-labels still say "Your herb's world" (left for you). Worlds: region-pals mistyName ignores typed names.

# Run 7 (Oct 19 2026 15:01 CEST): probes only, no files claimed, nothing shipped. Worktree removed. Lock released.

# Run 8 (Oct 19 2026 16:01 CEST): worktree /home/sprite/wt-bughunt-202610191402
- [x] daily-ritual.js (tick() yield only), tests/day-card-yields.test.cjs, DECISIONS.md: BH-008 LIVE 20261019-160738. Files released.

# Run 9 (Oct 19 2026 17:01 CEST) stopped before release; Run 10 (18:01 CEST) finishing it: worktree /home/sprite/wt-bughunt-202610191502
- CLAIMED: index.html ONLY R2.onboard() first line (ob.step resume), saveOb() final/setupMid line, new setupPending() helper,
  R2.authBoot() two onboard-reopen lines. NOT finishOb() (AUTO worker), NOT simpleCardHTML (product card).
  tests/setup-resume.test.cjs (new), DECISIONS.md (append), What's New (one entry). BH-009: setup lost after a reload past the birthday step.
