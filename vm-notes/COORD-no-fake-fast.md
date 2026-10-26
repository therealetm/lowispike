# COORD: new users get no invented fast (NOFAST worker)

Task: LOWiSPIKE: stop inventing a fast for new users (forked task, 2026-10-19 15:05 CEST)
Branch: newuser-no-fake-fast  Worktree: /home/sprite/wt-no-fake-fast  Base: origin/main 9f9f77e (build 20261019-150120)

Root cause: index.html LOWI_FAST st() (old Today fasting card module, ~line 5487) writes lowi_fast_v1.last = 8 PM yesterday
whenever last is missing, and its 30 s refresh runs on every page, so every new device shows a fast since 20:00.

## Owns (small, surgical edits only)
- index.html: LowiFastStop module (~1940-2090: st/startOf area, body(), new meal-logged listener, one-time guess cleanup)
  and LOWI_FAST module st()/hrs()/shows() (~5486-5503). Nothing else in index.html.
- spirit.js: ONLY the noFast copy line (~135). Not the meal sheet (MEAL worker) or photo (SNAP worker).
- NEW tests/no-fake-fast.test.cjs, NEW tests/no-fake-fast-live.cjs
- DECISIONS.md (append one entry), What's New (one entry)

## Will not touch
Energy / Misty power / peak visuals (bc320f5d), companion appearance (CMATCH), meal parsing / Log meal panel (MEAL),
snap photo (SNAP), herb-start.js.

## Notes for others
- After this, lowi_fast_v1.last can be 0/absent for a new user: "no meal known yet". Every reader already handles 0
  (startOf() returns 0). Please don't add a default start anywhere.
- The first real meal (Gap "I just ate"/"Ate earlier", or a Log meal save via the window event lowi:meal-logged) starts
  the Gap clock when none is known.
- Energy worker: no fasting milestone XP can come from an invented fast any more.

## Status
- [x] root cause found
- [x] fix + tests (tests/no-fake-fast.test.cjs 14, 10 fail on old code; tests/no-fake-fast-live.cjs)
- [x] released: build 20261019-154642, main 25942be, CI green, live verified (index/sw/version same as repo)
- [x] live browser check PASS on the live site: WebKit iPhone 13 (DE), WebKit iPad portrait (EN)
DONE. Claims released. Full suite 1618/1618 at release.

- 16:37 NOTE from the handoff task: the repo now has MAYA-HANDOFF.md at its root with an append-only "## Log" at the end. When this task ships, breaks or is cancelled, append one line there (date, time CEST, what, build/branch), in the release commit when possible. Keep both lines on a rebase conflict.
