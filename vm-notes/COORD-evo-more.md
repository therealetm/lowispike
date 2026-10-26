# COORD: more levels and majestic evolutions (forked task "LOWiSPIKE: extend meaningful companion levels and majestic evolution", started Mon Oct 19 2026 22:11 CEST)
Emmanuel: has reached the last form (level 6 Legend) and wants more levels and evolutions that "really, truly evolve into something majestic".
Worktree /home/sprite/wt-evo-more, branch evo-more, off origin/main.

## Claimed
- herb-config.js: ONLY `stages` (4 new entries after 'legendary'; existing thresholds unchanged)
- companion-core.js: clampStage max, CELL_R/PAD/POWER/STAGE/TRAITS arrays, layers() new traits for forms 7-10, LOOK_RX stage digit, path() slice
- companion.css: new per-stage trait rules only (.cf-st6..9, new trait classes)
- world-home-core.js: ONLY the STAGES array (level names). NOT AURAS / auraItems / cleanAura (aura task ce74d1af owns those)
- herb-tamagotchi.js: ONLY evoTier(), the evoPow strings and the 'all' line; herb-tamagotchi.css: ONLY #lhEvolution tier rules (.lh-evo-t6..t9)
- spirit.js: ONLY pathHTML() layout if 10 forms don't fit (will write here first)
- NEW tests/evolution-more.test.cjs; EVOLUTION.md; at release DECISIONS.md, news json, MAYA-HANDOFF.md Log line

## Not touching
Collection / discovery*.js copy and entry points, world names, adventure-tiers.js gates (panel task 0d494df4); companion naming,
aura picking/applying (ce74d1af); community-*.js (crash 9472a9a4, billiard 34bb0a32); cell-world.js (body stays the stage-6 size; it already clamps).

## Rule from Emmanuel (Oct 19, 10:2x PM): evolution must never require specific foods or a full Collection. XP thresholds only.

## Status
- 22:25 handoff item 22 written, pushing via push-main.sh
- 22:26 Grocery Catch (item 24) is built by the companion-panel task, not here. My handoff item is 25. Code done (companion-core/css, herb-config stages, world-home-core STAGES, herb-tamagotchi evo tiers, companion.js FALLBACK + 'of N'), tests updated; next: release
- 22:30 releasing (scripts/release.sh, log /home/sprite/evo-more-release.log)
- 22:40 RELEASED build 20261019-222803 (main 7af1a38), tests 1779/1779, CI passed, live serves it. Live probes (sim iPhone 13 + Chrome 390): all 10 forms render inside the frame, Forms path 2 rows of 5 'Form x of 10', tier-9 evolution moment, no errors. DONE.
