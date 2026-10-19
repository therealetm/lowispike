# COORD: crash squad (forked task, started Mon Oct 19 2026 13:22 CEST)

Task: "LOWiSPIKE crash squad: fly, fly out, autopilot until it can't crash". Scope: crashes, freezes, reloads, memory/GPU leaks on Home,
in flight, entering/leaving worlds (rocket exit, weak pull-back), autopilot, string riding / Ant-Man camera, spirit world.
Worktree /home/sprite/wt-crash-squad, branch crash-squad, off origin/main 3eec91b (build 20261019-130951).

## Claimed files
- tools/soak/crash-soak.cjs (new), tools/soak/crash-probe.js (new)
- tests/crash-*.test.cjs (new)
- Fix files: claimed here one by one as each cause is found (see below).
- CLAIMED 13:55 CEST: body-world-regions.js (snapNow/snapDrop: the full-size copy of the 3D canvas made on every world exit),
  tests/oct17-no-inbetween.test.cjs (only its snapNow regex, kept as strict)
- At release: DECISIONS.md (append), What's New (news json), build bump via scripts/release.sh

## Not touching
Home ring / blooms / Settings / Fuel / praise / nudges / guides' text (bug hunt + new-user walkthrough areas), old-design purge areas.

## Status
- [x] soak harness; fix RELEASED 20261019-142709
