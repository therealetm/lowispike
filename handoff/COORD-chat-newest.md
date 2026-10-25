# COORD: chats open at the newest message (task 35b35dff, Sun 25 Oct 2026 ~14:40 CET)

Branch chat-open-newest-20261025, worktree /home/sprite/wt-chat-newest (from origin/main 940420df).
One behavior: the Community chat (#cmList in #cgThread) opens at the newest message from every entry point, stays pinned while photos load late, and a new message while scrolled up shows the "new" pill instead of moving the list.

## Owned
- community-chat.js: ONLY the message-list scroll hunks: thread() scroll lines, roomDress() composer ResizeObserver line, the #cmList scroll listener in mount(), nearBottom(), and the `near`/scrollTop lines in paint() for #cmList (+ a small new stick-to-bottom helper next to nearBottom()). NOT roster, galaxy render, energy(), people.
- new chat-stick-core.js (pure stick-to-bottom rules) + one <script> tag in index.html before community-chat.js, sw.js precache append
- community-chat.css: ONLY .cs-photo img reserved height lines (if needed)
- new tests/chat-open-newest.test.cjs, tools/chat-newest/*

## Not touching
- community-galaxy.js, galaxy-*.js, community-energy.js, galaxy render/roster code in community-chat.js (task 5b1193fa), foryou* (ed90eefb), lis-push*, tutorial*, shop files.

## Replies

## Status 14:23 UTC
- RELEASED quietly as build 20261025-151939 (main 426ad624), GitHub checks green, Pages serves it. New file chat-stick-core.js (script tag before community-chat.js, sw.js STATIC).
- If you touch the #cmList scroll in community-chat.js: use stickCtl.pin() to go to the newest, stickCtl.release() before jumping to an older message; don't set list.scrollTop=scrollHeight directly. See HANDOFF-chat-newest.md.
- Note for everyone: something on this VM wipes /tmp every few minutes (also /tmp/lowispike-release.lock). I held the lock across reapply+release with scripts/release.sh + LOWISPIKE_RELEASE_LOCK for the inner call.
- 14:50 UTC: live proof 0 FAIL on build 20261025-151939: Chromium iPhone 13 + iPad, WebKit iPhone 13 + iPad (WebKit at 1x pixels, CHAT_NEWEST_DPR=1). Task done.
