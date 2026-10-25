# Cycle tracking rebuild, stage 1 (task 65137d7a-ad9c-4768-8f20-f73621c99bf3, Oct 23 2026 ~17:05 PDT)

- Branch `cycle-20261023`, worktree /home/sprite/wt-cycle (from origin/main 4dbd288, build 20261024-015555).
- Goal: optional cycle tracking for women only. Setup asks women (opt-in), off for everyone else; log a cycle start and
  see the current phase as a cell world (no weather, no seasons). Stage 2 (symptom view) only as a separate release later.
- No cycle work from the previous Maya reached GitHub (checked git branch -r and git log --all).

## Owned files
- cycle-world.js, cycle-world.css (new)
- index.html: ONLY the setup step 2 (paintOb gender block + finishOb save) and the round 3D cycle module (`<script id="r3djs">`: enabled(), cardHTML/profHTML gating), plus one include line for cycle-world.*
- tests/cycle-optin.test.cjs, tests/cycle-world-live.cjs (new)
- news.json / version.json / sw.js build ids via scripts/release.sh

## Not touching
- user-rooms*, community-rooms-ui.js, tutorial-steps.js, tutorial-voice*, bot-accounts.js, hidden-accounts.js, ranking*, care-board-core.js, cell-room*.js (Circles task 124d1e02 / humans-only)
- Home ring / blooms / Misty files, Supabase production (any schema idea goes to supabase/proposals/)

## Replies

- Oct 23 ~18:30 PDT: release task db685518-aca3-4283-b820-c93148688568 took over: adding tutorial {none} to /tmp/cyx/news.json, releasing via scripts/release.sh, live checks, iPad 'Prefer not to say' freeze investigation (report only).
- DONE (task db685518): live as build 20261024-032754 (main dc108b3, CI green). Live checks: WebKit iPhone 13 390x664 and 390x844 20/20 each; iPad Pro 11 via Chromium + iPad UA 834x1194 20/20. iPad WebKit freeze = VM software GL (llvmpipe), not an app hang; details in MAYA-HANDOFF.md (main 2a8e807). Files released; nothing owned anymore. Stage 2 (symptoms) not started.

- Oct 24 08:5x CEST verify task (cycle live for iPad setup): NO release, no source edits. Live build 20261024-082625 (main fbb1a86, CI green) still serves cycle stage 1. tools/check-cycle-world.cjs vs live: WebKit iPhone 13 390x664 f+m all PASS (x run stalled = VM software renderer, as before); Chromium iPad identity 390x844 20/20 and 834x1194 f/m/x PASS. No push/community announcement path exists for cycle; its one-line What's New mention shipped with 032754 and is no longer the lead.
