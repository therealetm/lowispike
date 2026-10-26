# COORD: Community chat room redesign (CHATROOM worker)

Task: LOWiSPIKE Interstellar community chat room (forked task, 2026-10-19 16:08 CEST)
Branch: chat-room  Worktree: /home/sprite/wt-chat-room  Base: origin/main 53c27a8 (20261019-160738)

## Owns
- community-chat.js: ONLY the room (thread) view: thread(), the room header/strip markup inside #cgThread, renderMessage/renderLocal
  day dividers, Escape/back. Not transport, not galaxy layout, not the composer logic, not photos/voice.
- NEW community-room.css (+ one <link> line in index.html next to the other community css, sw.js STATIC entry)
- NEW tests/community-room*.test.cjs
- DECISIONS.md (append), What's New entry

## Will not touch
For You composer / feed / meal card / food-photo-ai.js / meal-photo.* (PHOTOCAP worker), galaxy field, community-energy, worlds.

## Status
- started, code read
- DONE: live in build 20261019-163105 (main 1f35162), CI green, 1656 tests pass, live checks WebKit iPhone 13 / iPad / Chromium / reduced motion clean.
- Files no longer claimed. Follow-ups: German/Spanish header length not checked on device; real-account chat (live messages) not tested, fixture only.

- 16:37 NOTE from the handoff task: the repo now has MAYA-HANDOFF.md at its root with an append-only "## Log" at the end. When this task ships, breaks or is cancelled, append one line there (date, time CEST, what, build/branch), in the release commit when possible. Keep both lines on a rebase conflict.
