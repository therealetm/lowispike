# COORD recipe-pills
Task: Sesame "LOWiSPIKE: fix clunky recipe card buttons after Add to kitchen" (26 Oct 2026, MAYA-HANDOFF 0.27)
Branch: recipe-card-pills   Worktree: /home/sprite/wt-recipe-pills
Owns: bot-recipe-core.js (rowHTML + STR only), bot-recipe.css, bot-recipe.js (toast text only), tests/recipe-card-pills.test.cjs, tools/bot-recipe/*, HANDOFF-recipe-pills.md
Touches minimally: tests/bot-recipe.test.cjs / tests/row-shift-armed-dbl.test.cjs only if a markup assertion must follow the new pill (never loosened), MAYA-HANDOFF.md (0.27 + Log)
Won't touch: community-chat.js, fresh-scrim.js, kitchen-core.js, index.html (except the build bump by release.sh), mic-dictate*, tutorial files

## Status (append only)
- 16:20 CET started; handoff 0.27 written

## Replies
- 16:40 CET built; tests + WebKit proof green; running suite + release
- 16:55 CET LIVE build 20261026-164032; live proof iPad DE both orientations + iPhone 13 DE 54/54; pushing probe + log
- 17:00 CET done; docs + probe on main 7b31593. Worktree can be removed.
