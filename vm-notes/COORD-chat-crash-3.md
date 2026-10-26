# COORD: Community + chat crash on real iPhone, round 3 (forked task, started Tue 20 Oct 2026 05:26 CEST)
Emmanuel: open app -> Community -> chat -> Safari "A problem repeatedly occurred" (WebKit content process killed).
Worktree /home/sprite/wt-chat-crash-3, branch chat-crash-3, off origin/main 09a95ba (20261020-051313).
## Claimed files (narrow; will add here before touching more)
- community-chat.js, community-galaxy.js, community-chat.css, community-room.css (memory / render cost only)
- new tests/chat-crash-3*.test.cjs, tools/soak/chat-open-probe.cjs
- MAYA-HANDOFF.md item 29 + Log lines (append only), DECISIONS.md append, news json at release
## Bug hunt: please skip community-*.js while this claim stands.
## Status
- 05:30 handoff item 29 written, pushing

## 25 Oct ~20:20 CEST: resumed after the pause. The 20 Oct RSS numbers above were summed over every browser on the VM, not evidence. Picture-per-companion measured as no win; dropped. Tools + handoff pushed as a82eb89. Claims released.
