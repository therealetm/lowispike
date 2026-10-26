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
- 18:40 BH-009 committed (1dddd2e), suite 1680/1680, release.sh queued for the lock (GitHub Actions jammed). Claim held until it lands.
- 18:47 BH-009 LIVE 20261019-184058 (main 64614c2). Claim released.

- 16:37 NOTE from the handoff task: the repo now has MAYA-HANDOFF.md at its root with an append-only "## Log" at the end. When this task ships, breaks or is cancelled, append one line there (date, time CEST, what, build/branch), in the release commit when possible. Keep both lines on a rebase conflict.
- 16:42 UTC EVO (evolution-escalate task): took the #lhEvolution half of the 'auto-open sibling check'. evolve() now waits while any other aria-modal dialog, #g1Ob, #lcUpd, .r2-ov, sheets, #drDay, the tour, #lcOv, .cf-ov or #brOv is visible, and shows once it closes (EVO_BUSY in herb-tamagotchi.js). .mm-ov (mirror-move) is still yours. Release pending (evolution-escalate).
- 16:47 NOTE: MAYA-HANDOFF.md landed on main (e322804) and the agent-harness branch holds copies of these COORD files.

# Run 12 (Oct 19 2026 20:01 CEST): worktree /home/sprite/wt-bughunt-202610191801
- CLAIMED: index.html ONLY the R2.onboard() resume line (ob.step) + one comment; tests/reveal-resume.test.cjs (new); DECISIONS.md (append); What's New (one entry). BH-011: companion lost after a reload during the reveal.
- 20:25 BH-011 LIVE 20261019-201827 (main 4e8beda). Claim released.

## Run 14 (Oct 19 2026 22:01 CEST) CLAIM: galaxy-zoom.js warpFx() only (the 2D #gxWarp streak canvas made per Home<->Community warp: cap size + zero on drop, CS-001 pattern). New tests/warp-canvas-memory.test.cjs. Worktree /home/sprite/wt-bughunt-202610192001. Not touching community-chat.js / community-energy.js.
- 22:30 BH-012 LIVE 20261019-221918 (main a5d5338). Claim on galaxy-zoom.js released.

# Run 19 (Tue 20 Oct 2026 03:01 CEST): mirror-move.js (camera start token), discovery.js showPhoto only, tests/mirror-cam-race.test.cjs. LIVE 20261020-030834 (main 8d89e5a). Claims released.

# Run 25 (Sun 25 Oct 2026 22:01 CET): world-home.js wireMistyHold, misty-turn.js, community-tab-order.js, bloom-ring.js, tests/second-finger-no-hold.test.cjs. LIVE 20261025-221414 (main e0c0fafd). Claims released.
- 2026-10-25 22:25 UTC run 26: shipped BH-025 (fresh-scrim.js) LIVE 20261025-231656. Lock freed.

# Run 30 (Mon 26 Oct 2026 02:02 UTC): worktree /home/sprite/wt-bughunt-202610260202. Probing near-max z-index transient cards (P-LOOP-STOPPED-OVERLAY). No claim yet.
- 2026-10-26 02:40 UTC run 30: shipped BH-030 (gap-view.js) LIVE 20261026-030809. Lock freed.
- 2026-10-26 02:35 UTC run 30 second release: spirit.js gapAria sibling LIVE 20261026-031541. Lock already freed.

# Run 34 (Mon 26 Oct 2026 06:01 UTC): worktree /home/sprite/wt-bughunt-202610260603. CLAIM: community-rooms-ui.js openOn(), ranking.js open(), community-tab-order.js want()/wanted(), galaxy-zoom.js firstIsRoom(). Community opens straight on a requested view (no galaxy flash that takes a tap).
# Run 34 DONE 06:35 UTC: BH-034 LIVE 20261026-071738; claims released.
- 2026-10-26T07:34:49Z bughunt run 35 done: BH-035 LIVE 20261026-082829 (world-home.js syncX, index.html sheet(), ranking.js compare). Files released.
- 2026-10-26T09:25Z bughunt run 37 done: BH-037 LIVE 20261026-101115 (gap-view.js onClick, lis-push.js ask()). Files released.
- 2026-10-26T10:16:31Z bughunt run 38 done: BH-038 LIVE 20261026-111102 (community-rooms-ui.js toggleMenu). Files released.
- 2026-10-26T11:20:33Z bughunt run 39: releasing BH-039 (spirit.js open, fresh-scrim.js guardDown).
- 2026-10-26T11:30:28Z bughunt run 39 done: BH-039 LIVE 20261026-122440 (spirit.js open, fresh-scrim.js guardDown). Files released.

# Run 40 (Mon 26 Oct 2026 13:02 CET): worktree see BUGHUNT/.wt, branch bughunt-40 (off origin/main 993c381b)
- Probing P-CLOSE-UNDER-FINGER (sheet option rows, Community person card). Not touching community-chat.js, nibblo-core.js, kitchen-core.js, store-picks.js, pantry*, Cook view bar, tutorial files.
- Run 40 done 13:35 CET: BH-040 live 20261026-132627 (fresh-scrim.js only). Worktree released.

# Run 44 (Mon 26 Oct 2026 16:42 CET): worktree /home/sprite/wt-bughunt-202610261642, branch bughunt-44 (off origin/main 37ba9c60). CLAIM: body-trips.js startNext() only, tests/oct16-today-functional.test.cjs (one assertion), new tests/journey-no-autopilot.test.cjs. Start next journey must not switch the controller to autopilot.
- 15:50 UTC run 44: tests 3768 (1 load flake, passes alone), local WebKit iPhone 13 + Chromium 390 PASS, releasing
- 15:59 UTC run 44 RELEASED build 20261026-165435, live verified. Worktree released.

# Run 47 (Mon 26 Oct 2026 19:01 CET): worktree /home/sprite/wt-bughunt-202610261801, branch bughunt-47 (off origin/main 65a53bfe). Probing P-SESSION-OUTLIVES-SCREEN siblings (getUserMedia / audio / recognition kept after leaving a screen). Not touching mirror-move.js / mirror-hinge.js / move-*.js (move-reward task releasing).
Run 47 done: BH-047 LIVE 20261026-191635.

# Run 48 (Mon 26 Oct 2026 20:02 CET): worktree /home/sprite/wt-bughunt-202610261903, branch bughunt-48 (off origin/main). Probing dictation vs typed words (mic-dictate.js) and full-screen layers vs back swipe. 
Run 48 done: BH-048 LIVE 20261026-200906 (mic-dictate.js). Files released.
