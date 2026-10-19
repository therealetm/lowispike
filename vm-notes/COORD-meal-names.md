# COORD: meal names understood + Log meal panel cleanup (MEAL worker)

Task: LOWiSPIKE: meal names understood + Log meal panel cleanup (forked task, started 2026-10-19)
Branch: meal-names  Worktree: /home/sprite/wt-meal-names  Base: origin/main 73fc57f (build 20261019-144057, 1587 tests)
Handoff: /home/sprite/HANDOFF-meal-names.md

## Owns (will claim exact files after reading)
- Log meal panel UI, typed Scanner / Log meal food-name parsing, new meal database module + tests/meal-*.cjs

## Will not touch
Worlds code (worlds playtest), bughunt worktrees, food-photo AI code (photo recognition), content-studio research.

## Status
- started, reading code
- RELEASED 20261019-151237 (tests 1604/1604, CI ok, live OK). Next: WebKit iPhone 13 live check of Log meal + Scanner, voice note.
- LIVE CHECK PASS (WebKit iPhone 13, live 20261019-151237): tests/meal-names-live.cjs, 9/9. Script committed on branch meal-names (6f?), NOT on main: release --no-bump hit VM-load crashes in unrelated test files (load avg 52). Land it with the next release.
- Release B (more dishes) not needed: FNDDS db + dish list already shipped in one release.
