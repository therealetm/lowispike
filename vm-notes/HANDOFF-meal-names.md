# HANDOFF: meal names + Log meal cleanup

Worktree /home/sprite/wt-meal-names, branch meal-names. Coord: /home/sprite/COORD-meal-names.md.

## Plan (small releases)
1. Release A: Log meal panel cleanup (remove What can I buy here?, Snap food, Scan product; keep Eaten recently, Misty suggestions, Manual) + never "not provided" (estimate protein/fiber/sugar always).
2. Release B: built-in meal database (dishes, per-serving nutrition + ingredients) + ingredient-split fallback, wired into typed Scanner and Log meal.

## Steps (tick as done)
- [x] find code paths (spirit.js mealForm/finishMeal/macroHTML/quickMeal; store-picks.js SPOTS; index.html logMeal bridge)
- [x] Code done in ONE release (DB + not-provided + panel): meal-db-core.js, data/meals/fndds.json (tools/meal-data/build.cjs from USDA FNDDS 2021-23), spirit.js, beta.css, store-picks.js, index.html (log.est), sw.js + apple-ui.js (load meal-db-core.js). Tests: tests/meal-names.test.cjs (9, 3 spirit tests fail on old spirit.js; whole file fails without meal-db-core.js), updated misty-panels + store-picks asserts.
- [x] Release A release.sh / wait-ci / verify-live / webkit iPhone 13 check
- [ ] Release B code + tests
- [ ] Release B release + checks
- [ ] voice note + checklist

## Status log

- code + tests written, uncommitted in worktree; next: full test run, DECISIONS.md, news json, commit, release.sh
- committed b5b4cea+; releasing 13:11:17
- RELEASED 20261019-151237 (tests 1604/1604, CI ok, live OK). Next: WebKit iPhone 13 live check of Log meal + Scanner, voice note.
- LIVE CHECK PASS (WebKit iPhone 13, live 20261019-151237): tests/meal-names-live.cjs, 9/9. Script committed on branch meal-names (6f?), NOT on main: release --no-bump hit VM-load crashes in unrelated test files (load avg 52). Land it with the next release.
- Release B (more dishes) not needed: FNDDS db + dish list already shipped in one release.
