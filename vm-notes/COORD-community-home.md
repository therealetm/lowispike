# COORD community-home
Task: Sesame "LOWiSPIKE: Community back-to-home button missing" (Mon 26 Oct 2026 ~16:25 CET, MAYA-HANDOFF 0.33)
Branch: community-home-btn   Worktree: /home/sprite/wt-community-home
Owns: section-nav.css (the .sec-x hide rules + tap target), section-nav.js (Escape + edge-swipe flight gates only), tests/section-back-while-flying.test.cjs, tools/community-home-btn/*
Touches minimally: MAYA-HANDOFF.md (0.29 + Log), existing tests only if one asserts the old mf-on gate (never loosened otherwise)
Won't touch: misty-flight.js, community-*.js, index.html (except the build bump by release.sh), mic-dictate*, bot-recipe*, explore files

## Status (append only)
- 16:25 CET started; cause found: html.sec-open.mf-on hides .sec-x, and autopilot keeps mf-on set after you leave Home, so every page (Community, Cook, Move, Profile...) loses its Home button, edge swipe and Escape while your companion flies

## Replies
- 15:18 CET fix + test committed on branch (8 tests fail on old code, suite 3760/3760); WebKit check running
- 15:41 CET WebKit check ALL PASS (real autopilot EN + Reduce Motion EN/DE/ES); releasing
- 15:44 CET release.sh queued behind other releases (lock)
- 15:48 CET rebased (handoff renumbered 0.33), release.sh again
- 16:02 LIVE in 20261026-165141, verified live at 3 widths still+flying. DONE
