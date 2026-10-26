# HANDOFF bot-recipe (MAYA-HANDOFF 0.18)

Branch: bot-recipe-open (pushed as bot-recipe-ship2 after the rebases; never force-pushed). Worktree /home/sprite/wt-bot-recipe. COORD: /home/sprite/COORD-bot-recipe.md.

## Done (and how checked)
- Community Chat: a Nibblo recipe post's photo, dish name and the new Open recipe button open the Shuffle recipe page (LowiP2.open, #p2Rec). No second page.
- Four labelled buttons under the card: Open recipe / Cook it / Save / Add to kitchen (EN/DE/ES, 61 px tall at 390x844). A person's meal post with foods only gets Add to kitchen.
- The bubble menu's old "+" (emoji reactions) now says React / Reagieren / Reaccionar.
- Add to kitchen puts each recipe food into lowispike.kitchen.v1 once (never water or ice), in the phone's language; the card says "N in your kitchen" with Undo. The recipe page counts them as at home and has its own Add to kitchen button; after it, the Chat card says All in your kitchen.
- Cook > Kitchen (the pantry game, since 20261026-132254) shows the added foods on their shelves.
- Checks: tests/bot-recipe.test.cjs (12, all fail on old code: bot-recipe-core.js did not exist); tools/bot-recipe/check.cjs ALL PASS on WebKit iPhone 13 EN, iPhone SE DE, iPhone 15 Pro Max ES and Chromium 390x844 (photo, dish name, Open recipe, Add/Undo, recipe page add, Chat row All in your kitchen, Save, Cook it, React label, Cook > Kitchen lists, no page errors).

## Not done (follow-up)
- For You bot posts: the photo already opens the recipe (routeBot), but they have no button row yet. Chat only.
- No What's New tour step: shipped as a quiet fix.

## Traps found
- index.html conflicts on every rebase only in the build-id script block; keep main's side and re-add the three bot-recipe lines after meal-detail.js / meal-detail.css.
- The regress harness wipes /tmp/exec; harmless.
- WebKit: the recipe page shifts once (about 40 px) while pictures load; the check waits for the button to hold still before tapping.
- WebKit iPhone 13: the check's tap on the recipe page's own Add to kitchen timed out 2 times in about 12 runs (Playwright 'not visible/stable'); 6 runs in a row with diagnostics passed, so the cause is unknown. The check now prints CLICKERR + DIAG (button rect, sheet scroll, element under the finger) when it happens.
- Kitchen names are stored in the phone language (Gurke, Pepino), so compare against kitchen.v1, not the English recipe names.
