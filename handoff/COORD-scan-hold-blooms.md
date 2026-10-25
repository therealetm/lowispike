# Hold Scan opens every secondary bubble (task 'LOWiSPIKE: hold Scan to open all secondary bubbles', Oct 24 2026 ~08:55 CEST)

- Branch `scan-hold-20261024`, worktree /home/sprite/wt-scan-hold (from origin/main 69f06de, live 20261024-084818).
- One behavior: holding the Home Scan bubble opens the existing all-blooms overview (LowiHomeBloomsV2.openAll). A short tap on Scan still opens the scanner.
  The old two-finger tap on Misty no longer opens the blooms. Tutorial text, demos, practice and voice clips say "hold Scan" in EN/DE/ES.

## Owned files / hunks
- bloom-ring.js: the gesture section only (two-finger tap -> Scan hold handler, isTwoFingerTap -> isScanHold), mount() listeners.
- world-home.js: ONLY the one comment line in wireMistyHold about the second finger (no behavior change elsewhere).
- tutorial-steps.js: the 'misty-two' step text + its G(...) gesture entry. tutorial-voice-data.js + tools that generate tutorial voice clips + the new mp3s.
- tutorial-show.js / tutorial.js practice-pad hunks ONLY if they reference the two-finger Misty demo.
- tests/bloom-ring.test.cjs (two-finger expectations replaced by hold-Scan expectations, same coverage), tests/scan-hold*.cjs (new),
  tools/check-bloom-ring.cjs + tools/check-world-behind-bloom.cjs (the two-finger step becomes the Scan hold).
- index.html: ONLY the one comment line above the bloom-ring.js script tag (build ids via scripts/release.sh).

## NOT touching
- home-blooms-v2.js (label rendering / typography / openAll internals) — no edits planned; if one becomes necessary I will append here first.
- home-orbit-v2.js WORDS / visible labels / hydration, home-settings-sleep-v2.js, profile/birthday, Room, energy blast, Shop, Kitchen, Seller Zone.
- Pinch zoom, joystick, Misty's own hold (stats) and tap (pet) stay as they are.

## Status
- 08:55 claimed. Release through scripts/release.sh (its own lock) after rebasing on whatever task 2083c80b has landed.

## Replies
- ~14:30 UPDATE: hold Scan was already shipped by another run (release 20261024-094605). My first branch scan-hold-20261024 is abandoned (duplicate, not pushed).
  Only remaining delta, now on branch no-two-finger-20261024 (worktree /home/sprite/wt-no2f): remove the two-finger tap on Misty from bloom-ring.js
  (+ tests/scan-hold.test.cjs, tests/bloom-ring.test.cjs, tests/sleep-ring.test.cjs names, tools/check-bloom-ring.cjs, tools/check-world-behind-bloom.cjs,
  tools/check-scan-hold.cjs, one DECISIONS.md line). Quiet release via scripts/release.sh.
- ~14:38 DONE: two-finger removal live in 20261024-143558 (quiet, CI green). Branch scan-hold-20261024 abandoned, never pushed. Released bloom-ring.js ownership.
