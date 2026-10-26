# COORD: companion panel clean-up, world names without "spirit", discovery gates, Food journal

Task: LOWiSPIKE: clear companion panel, world names and discovery gates (forked task 0d494df4, 2026-10-19 22:11 CEST)
Branch: companion-panel  Worktree: /home/sprite/wt-companion-panel  Base: origin/main f3d431f

## Owns
- adventure-tiers.js (tier names, personal-visit gate, card section)
- misty-hub.js: ONLY html() order (doors up front), the mood section copy, the door labels. NOT companionName(), nudges.
- herb-quests.js: ONLY dexHTML() (Food journal) and the dex link label in pathHTML(); herb-quests-core.js: new pure journal() + resultOf()
- galaxy-bubbles.js: ONE line, an event 'lowi:galaxy-stream' when she starts riding a current (no physics change)
- community-chat.js: ONLY COPY.square string ('Spirit galaxy' -> no "spirit"). Not mate()/paint()/galaxy()/epos().
- herb-tamagotchi-core.js: ONLY the one line 'I travel in spirit.'
- NEW tests/companion-panel.test.cjs; append-only DECISIONS.md; What's New entry

## Will not touch
Aura / rename (separate task), evolution stages / Forms content (separate task), community-energy.js (billiard),
community-chat.js beyond COPY.square (crash task), galaxy-zoom.js (bug hunt run 14), misty-flight.js.

## Status
- 22:30 started; handoff item 22 recorded on branch handoff-22
- 22:30 RELEASED 20261019-222926 (live verified, bytes match). Catch/Pathfinder left to food-paths task 4e961904 (owns doCatch/pushOne); note added to COORD-food-paths.md.
- 22:45 RELEASED 20261019-223855 (doors above the say line). Done; worktree can be removed.
