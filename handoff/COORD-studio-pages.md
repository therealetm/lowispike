# COORD: Studio pages locked too (task 486c3009 'LOWiSPIKE: lock standalone Studio pages too', Sun 25 Oct 2026 ~17:20 CET)

- Branch `studio-pages-20261025`, worktree /home/sprite/wt-studio-pages (from origin/main 74768c65, live 20261025-160619).
- One behavior: affiliates/ and create/ show the same server-checked "Under construction" lock as Community > Studio
  (admin account straight in, everyone else needs the PIN). Their content sits in an inert <template> and their scripts are
  not fetched until the server says yes. Unlocked Studio shows a small "Private · only you" badge and a Lock button that
  locks this device again (device flag lowi.studio.locked, cleared by the right PIN).

## Owned files
- NEW: studio-gate.js, tests/studio-pages-lock.test.cjs, tools/studio-lock/pages-live.cjs
- studio-lock-core.js, studio-lock.js, studio-lock.css (task df79bbb7 finished)
- affiliates/index.html, create/index.html (head + wrappers only; blueprint*.js untouched)
- community-rooms-ui.js: ONLY ensureView (one line to paint the open badge)

## Not touching
- affiliates/blueprint*.js, access-*.js, script-voice.js; galaxy, chat, foryou, heat files; the SQL (server check, hash, limits stay)

## Status
- RELEASED quietly in 20261025-173238 (commit on main), GitHub CI green, 3382/3382 tests. Live checks passed on simulated iPhone 13 (Chromium + WebKit) for both standalone pages; in-app badge + Lock checked live in Chromium and on a local copy in both engines.
- Files released; nothing locked by this task any more. Live checker: tools/studio-lock/pages-live.cjs (branch studio-pages-20261025).

## Replies
