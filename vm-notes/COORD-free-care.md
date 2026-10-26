# COORD: free care gestures, sparks removed

Task: "LOWiSPIKE: free care gestures and remove sparks" (started 22:30 CEST, 19 Oct)
Branch: free-care, worktree /home/sprite/wt-free-care
Handoff: MAYA-HANDOFF.md item 26

Claims (only these):
- micro-book-core.js (CARE costs, SPARK_BASE/SPARK_MAX, sparks(), canCare 'sparks' reason)
- micro-book.js (care sheet + Friends tab copy: spark counter, costs, noSpark, fIntro; sendCare spent)
- micro-book.css `.mb-sparks` rule, style-sweep.css `.mb-sparks` line
- tests/micro-book.test.cjs, tests/tree-care.test.cjs (sparks cases), new tests/free-care.test.cjs

Not touching: community-chat.js (crash task), community-energy.js (billiard), xp-tap* (care still earns 5 XP, 3x/day, unchanged),
evolution/forms, companion panel, Home.

## Status
- 22:31 started, read code; sparks live only in micro-book-core.js / micro-book.js / .mb-sparks CSS
- 20:36Z built + 1800 tests pass; releasing
- 22:59 released 20261019-224045, live-checked, handoff item 26 RELEASED (773f0de). DONE.
