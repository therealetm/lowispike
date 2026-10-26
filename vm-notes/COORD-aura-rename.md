# COORD aura-rename
Task: "LOWiSPIKE: working aura customization and companion renaming" (started 22:11 CEST 19 Oct)
Branch: aura-rename, worktree /home/sprite/wt-aura-rename

## Claims (narrow)
- world-home.js: auraId()/applyAura()/pickAura()/panelAura(), companionName() only; NOT the Home ring, HUD layout, zoom, sheet tab structure.
- companion-birth-core.js / companion-birth.js: name storage for a manual rename (if needed).
- misty-hub.js: only the name line in Misty's card (a rename button) if needed; NOT Forms/Collection/How-do-you-feel sections (companion-panel task 0d494df4 owns those).
- new tests/aura-rename.test.cjs
- At release: news json, MAYA-HANDOFF.md item + Log line (append only), DECISIONS.md append.

## Not touching
community-*.js (crash 9472a9a4, billiard 34bb0a32), evolution stages/forms (evolution task), world names / unlock gates (panel task 0d494df4), tools/community-crowd.

## Status
- 22:13 started, reading code
- 22:56 code+tests done (1797 + tutorial pass), probe 11/11 iPhone13, releasing
- 23:00 releasing (handoff item 28; 27 was taken by food paths)
- 23:10 RELEASED 20261019-224907 (tests 1821/1821, CI green, verify-live same). Live probe 11/11 on iPhone 13 WebKit + Android Chrome.
