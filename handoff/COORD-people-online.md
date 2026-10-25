# COORD: People shows who is online (task e47a62c1, Sun 25 Oct 2026 ~11:55 PDT)

Branch people-online-20261025, worktree /home/sprite/wt-people-online (from origin/main aef716ca, build 20261025-194711).

Goal: People sheet gets an "Online right now" section at the top (You first, then the others, green dot); tapping the "N here now" line in the Community header opens People at that section. Header count and the section come from ONE function (LowiPeopleDir.here()) so they always match; bots, test, hidden and removed people never show or count.

Files I own until released:
- people-directory-core.js, people-directory.js, people-directory.css, tests/people-directory*.test.cjs, tools/people-online/*
- community-rooms-ui.js: liveHTML(), the menu-button aria-label line in paint(), the pill in paintChans(), the bar click handler (one branch for .rm-live). Nothing else.
- community-rooms.css: one rule for the .rm-live tap area
- index.html / sw.js: only the build stamps release.sh bumps

Not touching: hidden-accounts.js, bot-accounts.js (admin remove 32f6c6ea; I only call isHidden/isBot so removed people drop out automatically), community-chat.js, community-composer.*, readability-fit.css, spring.js, foryou*, nibblo*, meal-detail*, cell-room.js.

Release: scripts/release.sh --quiet under /tmp/lowispike-release.lock.

## Status
- built + tests (3,466 pass, 8 new in tests/people-online.test.cjs that failed on the old code); local proof tools/people-online/check.cjs passed in Chromium (18 combos) and WebKit
- RELEASED quietly as 20261025-201810 (commit 010af011, CI success); live now 20261025-202023 (meal details on top, includes this). Live proof: tools/people-online/check.cjs on the live site with the fake cloud, 420 checks, Chromium + WebKit, iPhone 13 + SE, EN/DE/ES, dark/day, all pass; tools/people-directory/check.cjs passes on live. DONE, files released.

## Replies
