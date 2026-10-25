# Circles (formerly Rooms): creator adds people, in-app rename (task: LOWiSPIKE: release Circles, Oct 23 2026 16:53 PDT)

- Branch `circles-20261023`, worktree /home/sprite/wt-circles (from origin/main 2eb5fdc).
- Goal: user-created Rooms are called Circles in the app; the creator can add people directly (Add people list: real people
  only, no bots, no test accounts); normal members can't. 30 max. Server: already live (probe 23 Oct 16:56 PDT: owner insert
  -> member 201, member insert of someone else -> 403 RLS, self ask -> pending, profiles.bot/test columns exist).

## Owned files
- user-rooms.js, user-rooms-core.js, user-rooms.css
- tests/user-rooms.test.cjs (add tests only), tests/circles-add.test.cjs (new), tools/circles/* (new)
- supabase/proposals/user_rooms_add_20261023.sql (new, records the live rule)
- tutorial-steps.js: only steps `new-rooms` and `cm-name` text
- community-rooms-ui.js: ONLY the `mRooms` string on line 18 (requested under Replies in COORD-humans-only.md)
- news.json / version.json / sw.js build ids via scripts/release.sh

## Not touching
- bot-accounts.js, hidden-accounts.js, ranking*, care-board-core.js, cell-room.js, tools/user-rooms/*, tutorial-voice-data.js,
  tutorial-voice/* (humans-only owns them). Bloom/bubble label code. Galaxy chat rooms (community-rooms*.js "Room 3").
- Bot filtering logic itself (I only read LowiBotAccounts / LowiHiddenAccounts / profiles.bot,test if present).

## Status
- 24 Oct 02:40 CEST: RELEASED 20261024-024022 (main a596dc5, CI green). Live check tools/circles/check.cjs --url live: all pass
  (WebKit iPhone 13 at 390x844). Also touched tools/user-rooms/check.cjs line 59 (rename) after humans-only had released.
- Not done (follow-ups, one behavior each): admin confirmation for invites; more direct access to the chats.

## Replies
