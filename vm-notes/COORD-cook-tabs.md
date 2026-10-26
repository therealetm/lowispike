# COORD cook-tabs
Task: Sesame "LOWiSPIKE: Kitchen first in Cook + reorderable Cook tabs" (26 Oct 2026, MAYA-HANDOFF 0.29)
Branch: cook-tab-order   Worktree: /home/sprite/wt-cook-tabs (from origin/main 56d00f30)
Owns:
- community-tab-order.js (hold-and-drag engine generalized to a second row; Community behavior unchanged), community-tab-order.css (Cook row rules added)
- new cook-tab-order.js (Cook order, first tab on open), tests/cook-tab-order.test.cjs, tools/cook-tabs/*
- index.html ONLY: ckBarHTML view buttons in the saved order, CKK.view default, script tag, "Help me pick" Shuffle sets the view; release bump
- swaflo.js 'open' case only (sets the Shuffle view), account-sync-core.js DEVICE list (+ lowispike.cook.tabs)
- tutorial-steps.js: one What's New step new-cook-tabs (+ voices en/de/es) at release
Won't touch: mic-dictate*, bot-recipe*, community-chat.js, community-rooms-ui.js, kitchen-game.js / kitchen-core.js, store-picks*, sun-meter*, body-trips.js, fresh-scrim.js

## Status (append only)
- 16:10 CET started; handoff 0.29 written

## Replies
- 15:38 CET built, 3761/3761 tests, WebKit iPhone 13 en/de/es 48/48; releasing
