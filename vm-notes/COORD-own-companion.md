# COORD: everyone gets their own companion (OWNCOMP worker)

Task: LOWiSPIKE: everyone gets their own companion (forked task, 2026-10-19 16:36 CEST)
Branch: own-companion  Worktree: /home/sprite/wt-own-companion  Base: origin/main 1f35162 (20261019-163105)

## Owns
- companion-birth-core.js (optional personality type as an input: seed only changes when a type is given, so every
  existing companion keeps its look and name)
- companion-birth.js + companion-birth.css (NEW claim step: LowiBirthCompanion.claim(opts), needsClaim(), one-time
  post-update prompt; stored record gains optional `mbti`)
- companion.js: ONLY myGenome()/seed() (evolution reads the user's own companion: its element, colours, seed, type)
- companion-core.js: ONLY genome() (optional per-companion fill of body language when no type is set)
- NEW tests/own-companion-claim.test.cjs, NEW playtest/own-companion-claim.cjs
- append-only: DECISIONS.md; What's New entry via news.json (with `tutorial` field per COORD-tutorial.md)

## Will not touch
food-photo*, meal-photo*, community-chat*, tutorial*, home-settings-sleep-v2.js, daily-ritual.js, world-home.js,
misty-*.js, cell-world.js (Home stays: no smile, no glow ring), index.html onboarding.

## Contract with TUTORIAL worker (COORD-tutorial.md)
- `LowiBirthCompanion.claim({from:'tutorial'})` opens the claim step as `#lcOv` (role=dialog, aria-modal=true).
  It removes itself when done or closed. `lowi:companion` fires on save as today.
- `LowiBirthCompanion.needsClaim()` -> true for a signed-in account that only has the standard Misty.
- openCreator() stays and now opens the same claim step.
- The one-time post-update prompt never opens while another aria-modal dialog / onboarding sheet / tutorial is up,
  and is skipped when `opts.from==='tutorial'` already showed it (key lowispike.claimprompt.v1).

## Status
- 16:50 cause found (see report): friend's account (created Oct 10) predates the reveal (Oct 16); companion.js wrote
  Community prefs into lowispike.companion.v1 for 422 of 440 backups until 20261019-143513, so stored() is null -> Misty
  fallback (fixed name, fixed look). Server: 37 email accounts, only 1 has its own companion.

- 16:37 NOTE from the handoff task: the repo now has MAYA-HANDOFF.md at its root with an append-only "## Log" at the end. When this task ships, breaks or is cancelled, append one line there (date, time CEST, what, build/branch), in the release commit when possible. Keep both lines on a rebase conflict.
