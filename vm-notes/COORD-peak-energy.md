# COORD: new users start at 100% energy + vivid peak-energy world (PEAK worker, task bc320f5d)

Started Oct 19 2026 15:20 CEST. Worktree: /home/sprite/wt-peak-energy (branch peak-energy, off origin/main).

Cause: sun-meter.js energy() is today-only from tracked habits; a new user has nothing tracked, so the base 0.15
("resting") shows: tier tired, sleepy face, slow flight. Fix: a welcome energy that starts a NEW account full and fades
out over its first day, derived from the synced ledger entry 'herb-first:planted' (no new stored key, no index.html edit).

## CLAIMED (small, surgical edits)
- sun-meter.js: welcome energy (pure core) + feel(k) (pace/peak curves)
- misty-scale.js: one welcome line on the energy card (en/de/es)
- world-home.js: adventure(): publish smoothed W.LowiVigorFeel; peak sparkle on her wand. Nothing else.
- misty-flight.js: speed() peak bonus, trail() peak sparkle. Nothing else.
- body-world-3d.js: one forwarder feelLook (debug read)
- body-world-3d-scene.js: step(): world pace x energy + peak glow/shafts/particles. Nothing else.
- misty-bump.js: worldSpeed() includes the same energy pace (so bumps predict the moved cells)
- NEW tests/peak-energy.test.cjs, NEW tests/peak-energy-live.cjs
- DECISIONS.md / DATA_CONTRACTS.md (append), What's New (one entry), release files per RELEASE.md

## Will not touch
index.html onboarding/fast modules (NOFAST), companion look files (CMATCH: companion-birth-core.js, cell-world.js,
companion.js), meal/snap code, herb-start.js, spirit.js.

## Status
- [x] reproduced: fresh onboarding -> energy 0.15, tier tired
- [x] fix + tests (commit d6d70e4; tests/peak-energy.test.cjs 10, live check 3 views PASS)
- [ ] release: running scripts/release.sh (15:5x)

- 16:37 NOTE from the handoff task: the repo now has MAYA-HANDOFF.md at its root with an append-only "## Log" at the end. When this task ships, breaks or is cancelled, append one line there (date, time CEST, what, build/branch), in the release commit when possible. Keep both lines on a rebase conflict.
