# COORD: Community shooting crash (forked task, started Mon Oct 19 2026 17:28 CEST)
Emmanuel: two people shooting each other in Community -> crash. Worktree /home/sprite/wt-community-crash, branch community-crash, off origin/main 407bc67 (20261019-171941).
## Claimed files
- community-energy.js, tools/soak/community-shoot.cjs (new), tests/community-shoot-crash.test.cjs (new)
- possibly community-chat.js energy()/place() only (will note here before touching)
- At release: DECISIONS.md append, news json, scripts/release.sh
## Not touching
tutorial files (tutorial-steps.js, tutorial*), bug-hunt areas.
## Status
- 18:47 RELEASED 20261019-184741 (d30c322): community-energy.js cap/throttle + tests/community-shoot-crash.test.cjs + tools/soak/community-shoot.cjs. Files free again.

- 16:37 NOTE from the handoff task: the repo now has MAYA-HANDOFF.md at its root with an append-only "## Log" at the end. When this task ships, breaks or is cancelled, append one line there (date, time CEST, what, build/branch), in the release commit when possible. Keep both lines on a rebase conflict.
