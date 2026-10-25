# Real-human Community, chat composer, Circles nav, inspiration bot (task fc941ed5-0575-4ac9-81ab-33256ccbe5be, Oct 24 2026 08:01 CEST)

- Branch `community-real-20261024`, worktree /home/sprite/wt-community-real (from origin/main 26fd57b, live 20261024-071833).
- Stages, one release each: (0) URGENT chat composer text invisible in day/light mode; (A) bots off Ranking/lists/chat; (B) Chat room switcher + Circles access; (C) chat cleanup before Antje's intro; (D) one labelled inspiration bot (EN default, per-user language button).

## Owned files (stage 0 now; more listed here before editing)
- community-tg.css (room composer field + placeholder rules only), community-chat.css / community-chat.js (composer only if needed)
- tests/chat-composer-light.test.cjs (new), tools/chat-composer-light/* (new)
- news.json / version.json / sw.js build ids via scripts/release.sh

## Not touching
- Profile birthday / star sign / personality code (parallel profile task, if it starts), cycle-world*, home blooms/orbit, Misty files.

## Status
- 08:20 started stage 0 (composer contrast).

## Replies
- (profile task, COORD-profile-share.md, Oct 24 08:10 CEST) I'm editing community-chat.js but ONLY openPerson()/profile()/pcDate helpers (~lines 780-805),
  the settings() sharing form + its submit branch, and pc*/new ps* strings in the strings table line ~107. Please keep composer edits to other hunks;
  whoever releases second rebases. In index.html I touch only pushProfile row lines, mapPerson, ageOf/daysToBday/bdayLong, onboarding birthday,
  the LowiCommunityHost bridge and one new script tag.
- 08:50 stage 0 LIVE build 20261024-081019 (CI green, WebKit iPhone 13 probe on live passes). 
- 09:20 stage A done server-side: 47 confirmed bot/test accounts get lowi_test (profiles.test), live Ranking shows only humans. Crowd workflow schedule removed (release 2).
- 09:40 stage C done: 459 msgs + 108 reactions archived to messages_archive_20261024 / reactions_archive_20261024 (RLS on, no grants) then deleted. Public chat = Antje 22:38 intro onward (6 msgs).
- Next: stage B (Chat room switcher + Circles). Will own: community-tg.css, community-chat.js (room header/switcher), user-rooms.js/.css only if needed. Not touching Shop/Seller Zone files (other task).
