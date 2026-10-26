# COORD manual-explore (Sesame task "LOWiSPIKE: remove companion 'Out exploring' feature", changed by Emmanuel to: no auto exploring, manual only; Mon 26 Oct 2026 ~16:10 CET)

Branch: companion-manual-explore   Worktree: /home/sprite/wt-manual-explore (from origin/main f2e25862)
MAYA-HANDOFF 0.32, DECISIONS entry "companion never explores on her own".

Owns:
- sun-meter.js, sun-meter.css (sun trip: no auto start, manual "Send her exploring", migration of auto trips, away layout)
- body-trips.js: gain() auto-send only (journeys start from a tap)
- world-home.js: ONLY advRead()/adventure away handling if the away layout needs it
- cell-world.css line for the away pill if needed
- new tests/companion-manual-explore.test.cjs; existing sun-meter / body-trips tests that asserted auto start (changed with reason)
- no What's New card (updates are silent)

Won't touch: mic-dictate*, community-chat.js, recipe card files (bot-recipe / crb), store-picks*, kitchen-*, fresh-scrim.js (bug hunt), index.html except release bump.

## Status (append only)
- 16:12 CET started; scope changed by Emmanuel mid-task: keep exploring as a manual option, never automatic; fix away layout
- 15:28 CET docs commit pushed on branch (handoff 0.31); code in worktree; probing
- 15:36 CET code committed; WebKit EN/DE/ES 39/39; releasing
- 15:44 CET LIVE build 20261026-163708 (quiet), CI https://github.com/therealetm/lowispike/actions/runs/40351267066/job/121671634339; live probe running
- 15:49 CET DONE: live probe 39/39 EN/DE/ES, handoff updated
