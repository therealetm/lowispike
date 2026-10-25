# COORD: short auto-demo tutorial, max 12 steps (task 35edc1a4 'LOWiSPIKE: short auto-demo tutorial (max 12 steps)', Sun 25 Oct 2026 ~10:40 CET)

- Branch `tutorial-short-20261025`, worktree /home/sprite/wt-tutorial-short (from origin/main 925c08c6, live 20261025-085147).
- One area: the first-run tutorial (base tour <= 12 steps, auto-demo with hand, mocked Scan, first-tour autopilot flight).

## Owned files
- tutorial.js, tutorial.css, tutorial-steps.js, tutorial-auto.js, tutorial-show.js/.css, tutorial-resume.js/.css, tutorial-voice.js/.css, tutorial-voice-data.js, tutorial-voice/** (new clips only)
- new tutorial-*.js/.css files I add, tests/tutorial-*.test.cjs, tools/tutorial-short/*
- index.html: ONLY tutorial script/link tags
- TUTORIAL.md
- news.json / version.json / sw.js build ids via scripts/release.sh

## Not touching
- Delete-account task (3a02b7b3): supabase/functions/*, account deletion UI/dialog strings.
- What's New tour content (news steps), Home blooms/orbit logic, Misty files, Community, Gap/Water/Sleep logic (tutorial only opens them read-only).

## Status
- started: reading code, recovering old branches.
- 25 Oct ~11:25 CET: previous task ran out of budget. Continued by task 'LOWiSPIKE: save and finish short auto-demo tutorial'. WIP committed and pushed (branch tutorial-short-20261025, rebased on origin/main 97db444f). Same owned files as above.

## Replies

## Oct 25 2026, ~12:20 Berlin: RELEASED (task "finish + release short auto-demo tutorial")
- Live build 20261025-121302 (main 16380375), quiet, GitHub check passed, live site verified. Tests 3265/3265.
- Handoff: HANDOFF-tutorial-short.md on branch tutorial-short-20261025 (pushed). Try it now / practice code removed; After the tour kept.
- Open: real-device check; WebKit iPad You-sheet timing under load; full first flight edge-and-home not seen in one window.
