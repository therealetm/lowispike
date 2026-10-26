# COORD: new-user walkthrough round 2 (forked task, Oct 19 2026)

Worktree /home/sprite/wt-newuser, branch newuser-walkthrough. Handoff: /home/sprite/HANDOFF-newuser-walkthrough.md

## Claimed files
- herb-start.css, herb-start.js (copy + 'done' fasting target only; NOT the old 2D art, which is the purge task's)
- starter-core.js (fastTarget only)
- sym-home.js (Fuel aria label only)
- world-home.js + world-home.css (first-timer 'Drag to look around' hint placement only)
- tests/newuser-walkthrough.test.cjs (new), tests/newuser-*-live.cjs (new)
- At release: DECISIONS.md (append one entry), What's New (one entry EN/DE/ES), build bump via scripts/release.sh under its lock

## Not touching
region-pals*, adventure.js (worlds playtest); body-world-regions.js, misty-*.js, galaxy-bubbles.js (crash squad);
icons / companion art / cell-room / community art (old-design purge); praise.js, home-blooms-v2.* (bug hunt).

## Status
- [x] round 1: onboarding fits short iPhones, fasting goal from starter plan, Fuel/Gap naming, VoiceOver Fuel, hint docks: LIVE 20261019-142009 (1545/1545, CI green). ALL FILES RELEASED.
- [x] round 2: g1 update bubble held during setup (index.html g1 decorate() + one interval in init()): LIVE 20261019-144057 (1587/1587, CI green). ALL FILES RELEASED.
- Found, not fixed (not my files): Settings panel Close button (.ss2-page-x, home-settings-sleep-v2.*) sits on the World map chip on iPhone 13 Safari (tap at 340,610 hits Close).
- Skipped: 'Moss Leaf'/'Minti Leaf' name on Home = bug hunt BH-006 (claimed world-home.js/misty-hub.js/misty-scale.js name helper).

- 16:37 NOTE from the handoff task: the repo now has MAYA-HANDOFF.md at its root with an append-only "## Log" at the end. When this task ships, breaks or is cancelled, append one line there (date, time CEST, what, build/branch), in the release commit when possible. Keep both lines on a rebase conflict.
