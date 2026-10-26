# COORD: fluid Give a hand swipe (Apple fluid-interface rules) (task started 14:36 CET, Mon 26 Oct)

Sesame task "LOWiSPIKE: learn from TikTok video, implement if useful". Video: @lucablancom, "Apple Design + SwiftUI Expert" agent skills.
The Apple Design skill is already in the repo (.agents/skills/apple-design, pinned since 11 Oct). The new Give a hand swipe deck
(built today) does not follow its rules: commit is decided by average speed, not the release flick; grabbing the card while it
springs back jumps it to the finger; the skip fly-out ignores finger speed.

Branch `fluid-swipe`, worktree `/home/sprite/wt-fluid-swipe` (from origin/main d77e3972).

Owns:
- gift-basket.js: onDown / onMove / onUp only (the drag)
- gift-basket-core.js: swipeDecision (+ new pure helpers project, releaseVelocity, txOf)
- gift-basket.css: .gb-swipe.gb-fly rule only
- new tests/give-hand-fluid-swipe.test.cjs
- AI_PLAYBOOK.md section 10 (one bullet), MAYA-HANDOFF.md (append only: instruction + Log line)

Does NOT touch: shop-scan*, store-picks*, week-basket*, cart-core.js, kitchen-*, tutorial-steps.js, index.html (except release bump).
Release: scripts/release.sh --quiet (feel fix, no tour card).

## Status (append only)
- 14:36 CET started; video transcribed; swipe deck read against apple-design SKILL.md
