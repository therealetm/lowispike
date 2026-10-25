# COORD: iPad bloom anchoring (Move options + Meals panel stay at their bubble, away from Misty)

Owner: task 'LOWiSPIKE: fix iPad bloom anchoring' (started 18 Oct 2026 15:55 CEST)
Worktree: /home/sprite/wt-ipadbloom, branch ipad-bloom-anchor from origin/main
Status: DONE — released 20261018-163447 (main 1fb0b6f), CI green, live verified. Files free.

Claimed files (do not edit while this is IN PROGRESS):
- move-bubble.js (openBloom geometry only)
- misty-bloom.js (prep: dock Home Meals/Move panels beside their bubble on wide screens)
- misty-panels.css (mb-dock rule only)
- tests/bloom-anchor.test.cjs (new), tests/bloom-anchor-live.cjs (new)
- release bump files touched by scripts/release.sh (index.html ?v=, sw.js, What's New entry)

Not touched: /home/sprite/lowispike-redesign-plan.html (owned by task 3aaf6f8b), sym-home.js, living-bubbles.js, wide-layout.css.

Cause found (fresh origin/main):
- move-bubble.js openBloom aims the four orbs at the screen middle (toward = atan2(vh*.5-cy, vw*.5-cx)). On iPad/desktop Misty sits at the screen middle, so Quick/Medium/Long/Epic land on Misty.
- Meals is not an orb bloom: tapping it opens the r2 meal sheet, which on screens >= 700px is centred (apple-ui.css align-items:center), i.e. a 600px panel over Misty in the middle.
