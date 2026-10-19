# COORD: evolutions get bigger each stage (EVO worker)

Task: LOWiSPIKE: evolutions get bigger each stage (forked task, 2026-10-19 18:11 CEST)
Branch: evolution-escalate  Worktree: /home/sprite/wt-evolution  Base: origin/main 30479ae (20261019-172632)

## Owns
- companion-core.js: ONLY layers() traits (per-stage growth, stones/armor, horns) + PAD + a new pure `power(stage)` helper
- companion.css: per-stage trait rules only (.cf-stone, .cf-st*)
- herb-tamagotchi.js: ONLY evolve()/finishEvolution() (tiered evolution moment, before->after morph, waits while another modal is open)
- herb-tamagotchi.css: ONLY #lhEvolution rules (tier classes)
- NEW tests/evolution-escalate.test.cjs, NEW EVOLUTION.md (stage thresholds)
- append-only: DECISIONS.md; What's New entry

## Will not touch
cell-world.js (Home face/mouth, no glow ring), companion-birth*.js, companion.js myGenome()/seed() (OWNCOMP), herb-config.js thresholds,
index.html, daily-ritual.js, tutorial*, community-*, food-photo*, misty-*.js, world-home.js, spirit.js.

## Bug hunt
BH ledger item "#lhEvolution auto-open sibling check": I take the #lhEvolution half (evolve() waits until no other aria-modal
dialog / sheet / onboarding is up). .mm-ov (mirror-move) stays with the bug hunt.

## Status
- 18:20 started
- 18:55 tests 1676/1676, releasing
