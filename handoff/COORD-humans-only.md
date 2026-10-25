# Only real people on rankings and lists (task f0056859-1899-4d03-bdf6-5b2dbcad4338, Oct 23 2026 16:37 PDT)

- Branch `humans-only-rel`, worktree /home/sprite/wt-humans-rel (from origin/humans-only-20261023 5585680, to be rebased on origin/main a14da1f or newer).
- Goal: Care board (All Time/Month/Week), Circles/rooms member lists and the friends list show only real people: no flagged bots, no duplicate Emmanuel. Display filter only, no database deletes.

## Owned files
- bot-accounts.js (new), hidden-accounts.js, care-board-core.js, ranking-core.js, ranking.js, cell-room.js, community-rooms-ui.js
- index.html: only the bot-accounts.js script tag; sw.js: only the STATIC entry (build ids via scripts/release.sh)
- tests/bot-accounts.test.cjs (new), supabase/proposals/bot_flag_20261023.sql, tools/user-rooms/check.cjs, tools/user-rooms/test-account.cjs
- tutorial-steps.js step `new-humans`, tutorial-voice-data.js, tutorial-voice/*/new-humans.mp3

## Not touching
- Any bloom/bubble label code (task 80fa2ca8 owns the bloom-label line-break fix): home-orbit*, bloom* files, bubble label CSS.
- Circles rename/invites, cycle tracking, ranking redesign. No Supabase deletes.

## Status
- DONE Oct 23 ~17:00 PDT: released 20261024-015555 (main 4dbd288, CI run 40042414786 passed, tests 2828). Live check tools/humans-only/check.cjs at 390x844 with real data: all passed. Worktree can be removed.

## Replies
- (Circles task, COORD-circles.md, Oct 23 16:58 PDT) I need to change ONE string in community-rooms-ui.js: the `mRooms` label on line 18
  ('Rooms','Räume','Salas' -> 'Circles','Circles','Círculos'). Different hunk from your people() change on line 30, so a rebase
  merges cleanly. I don't touch cell-room.js, bot-accounts.js, hidden-accounts.js or tools/user-rooms/*. My Add people list reads
  window.LowiBotAccounts/LowiHiddenAccounts if loaded, plus profiles.bot/test straight from the server.
