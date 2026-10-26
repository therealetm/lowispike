# COORD no-explore (Sesame task "LOWiSPIKE: fully remove companion exploring (finish removal)", Mon 26 Oct 2026 17:07 CET)

Branch: companion-no-explore   Worktree: /home/sprite/wt-no-explore (from origin/main 48f0b84b)
MAYA-HANDOFF 0.36 (replaces 0.32 manual exploring).

Owns:
- sun-meter.js, sun-meter.css (remove the sun trip: send, away, timer, call-back, LowiRecall; settle every old trip on open)
- adventure-tiers.js / cell-world.js / world-home.js: ONLY dead reads of the sun trip's away state if needed
- tests that asserted the trip / call-back: companion-manual-explore, oct17-recall, oct16-energy, sun-meter, oct16-blue (changed with reason)
- new tests/companion-no-explore.test.cjs, tools/no-explore/*
- tutorial-steps.js + voices: ONLY steps that talk about sending her exploring / calling her back (if any)

Won't touch: body-trips.js (Start next journey, BH-044), misty-pad.js / misty-flight.js autopilot logic, section-nav.* (Community Home button),
mic-dictate*, store-picks*, gift-basket*, better-pick*, shop-scan*, grocery-hunt*, index.html except release bump.
Release: scripts/release.sh --quiet (removal; no tour card)

## Status (append only)
- 17:10 CET started; handoff 0.36 written

## Replies
