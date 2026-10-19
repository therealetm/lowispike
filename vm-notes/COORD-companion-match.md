# COORD: onboarding companion = Home/Forms companion (started Oct 19 2026 15:09 CEST)
Worktree: /home/sprite/wt-companion-match (branch companion-match, off origin/main 9f9f77e, 20261019-150120)

Bug: the companion revealed in onboarding (companion-birth-core.js svg: own body, colours, eyes, mouth, marks, sign motif,
accessory) never reaches Home / Forms / care room / 3D sprite: those draw the shared glass cell (cell-world.js compose) for everyone.

## CLAIM RELEASED 16:00 CEST (files were)
- companion-birth-core.js (export shared part builders; svg() output unchanged)
- cell-world.js (compose(): own companion body/face when the user has one; nothing else)
- companion.js (friendSVG only: friends never get the user's own body)
- tests/companion-own-look.test.cjs (new), playtest/companion-own-look.cjs (new)
- DECISIONS.md (append), What's New (one entry), release files per RELEASE.md

## Will not touch
spirit.js, world-home.js, misty-*.js, herb-tamagotchi.js, index.html onboarding, worlds, meal/snap code.

## Status
- 15:45 CEST: root cause found (cell-world compose never read the birth record's look). Fix implemented in the worktree; unit tests 6/6 (5 failed on old code); browser flow runs in progress. Also touching cell-world.css (3 lines, own-companion twinkle). Not released yet.
- 15:52 CEST (round 2): committed, rebased on origin/main 1d6d941 (20261019-154834; DECISIONS.md append conflict resolved, both kept). Full suite 1634/1634 on a quiet machine (killed orphan wt-newuser WebKit drivers from the ended walkthrough task). Second Oct 1997 run, WebKit iPhone 13, port 8877, 1997-10-27 07:45: reveal = Home = Forms (7/7 own) = after reload, name kept, no page errors.
- Side finding (not fixed, for bug hunt): after a reload during setup the weekday "Day N" card (daily-ritual.js #drDay) can already be open and sits above the setup sheet (it is only closed for g1Ob/lcUpd/gate-up/mf-on, not for .r2-ov). Round-1 flow hit it at the birthday Next button.
- 15:54 CEST: scripts/release.sh running (build 20261019-155424).
- 15:56 CEST: RELEASED build 20261019-155424, main f93f687 (CI green, live verified, bytes match). What's New EN/DE/ES "own-companion-home".
- 16:00 CEST: live check, WebKit iPhone 13, fresh context on https://therealetm.github.io/lowispike/, new user (local test sign-in, no server account), birthday 1997-10-19: reveal = Home = Forms (7/7) = after reload, name kept, no page errors.
- DONE. Claim released. Worktree /home/sprite/wt-companion-match can be removed.
