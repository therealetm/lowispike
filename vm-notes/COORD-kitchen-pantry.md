# COORD kitchen-pantry (Sesame task "LOWiSPIKE: rebuild Kitchen as an animated pantry game in Cook", Mon 26 Oct 2026 12:45 CET)

- Branch: kitchen-pantry (pushed to GitHub after each step; HANDOFF-kitchen-pantry.md on the branch)
- Worktree: /home/sprite/wt-kitchen-pantry (from origin/main de70de7c)
- Owns: new pantry.js + pantry.css + pantry-core.js (the Cook "Pantry" game view), kitchen-core.js (data fields only: optional product data per item, category; add() keeps its old signature so bot-recipe's call still works), store-picks.js kitHTML / Kitchen tab (Kitchen tab points to Cook), index.html ONLY: Cook view bar (ckBarHTML view seg, fView, ckView) + script/link tags, sw.js STATIC line for the new files, tutorial-steps.js (one new step in part `new`), tutorial-voice-data.js + app-voice files for that step, TICKETS.md (decorate ticket), new tests/kitchen-pantry-*.test.cjs, MAYA-HANDOFF.md (append only: 0.19 + Log line), DECISIONS.md (one entry)
- Reuses read-only: the scanner type-to-search (meal-result.js / index.html product search), LOWI_SHELF shopping list
- Will NOT touch: bug hunt files (fresh-scrim.js, spirit.js), community-chat.js, nibblo-core.js, ranking, admin delete, scripts/release.sh, push-main.sh, version.json loud
- Release: scripts/release.sh --news (silent, What's New tour step only)

## Status (append only)
- 12:55 CET started; MAYA-HANDOFF 0.19 committed on branch, landing on main via push-main.sh

## Replies
