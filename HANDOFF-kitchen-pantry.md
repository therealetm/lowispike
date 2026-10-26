# HANDOFF kitchen-pantry (Mon 26 Oct 2026, stopped at token limit)

Branch kitchen-pantry. NOT released.

Done on branch: kitchen-core.js keeps shelf+product data (addProduct, setShelf); kitchen-game-core.js (9 shelves fridge+cabinet, EN/DE/ES word sorting, health in scanner words, capped points look 5/day, bin 2x3/day, healthy 10/day); kitchen-game.js + kitchen-game.css (Cook > Kitchen view: meter, product search via LowiDex.search, scan button, doors that swing open, shelf cards, bin -> shopping list with Undo, To buy sticky note with Bought -> back into kitchen); index.html Cook view seg "Kitchen", fView/ckView, kgRoot in fHomeHTML, script/link tags; sw.js STATIC line; shop-scan.js "In my kitchen" button; store-picks.js hides Kitchen tab and redirects to Cook when the game is loaded; tutorial.js kitchen route opens Cook > Kitchen. Smoke test in Chromium 390x844: add, open shelf, bin, bought all work, no page errors.

Next exact steps: 1) tutorial-steps.js: rewrite new-kitchen text (Kitchen now in Cook next to Shuffle/Swipe; DE Kochen/Mischen/Swipen, ES Cocinar), new-give-hand: open shop, "next to Seller Zone", VERSION 28; update tests/give-hand-tab.test.cjs. 2) New tests tests/kitchen-pantry-*.test.cjs (core sorting, parse keeps p/c, store-picks no Kitchen tab, Cook seg). 3) Full suite, WebKit iPhone 13 + Reduce Motion + EN/DE/ES, check search with live network. 4) TICKETS.md: decorate/upgrade kitchen with points (future). 5) DECISIONS.md entry, MAYA-HANDOFF log line. 6) rebase on main, scripts/release.sh --news with tour new-kitchen (silent).

Traps: LowiHost.award needs perDay or it pays once ever; g2c fit may tighten Cook in kitchen view (check LowiG2C.fit); bot-recipe also touches kitchen-core.js (append only); docs-only MAYA-HANDOFF 0.19 push ran from /home/sprite/wt-kp-docs (see /tmp/kp-docs.log).

## Oct 26 13:30 CET, finishing task
- Fixed the 3 CI failures on this branch (runs 40318859863, 40319563280): sw.js kitchen-game line now sits before the kitchen-core line (tests/kitchen.test.cjs), shop-scan.js Add to cart button written after the verdict again (tests/shop-scan.test.cjs), GESTURE_EXEMPT entry for kitchen-game.js drag-to-bin (tests/tutorial-gestures.test.cjs).
- new-kitchen rewritten (opens Cook > Kitchen), new-give-hand opens 'shop' (Kitchen left Shop), VERSION 28, voices recorded EN/DE/ES.
- tests/kitchen-pantry-game.test.cjs (9 tests), ticket LS-KITCHEN-DECOR in TICKETS.md. Full suite green locally.
- Next: WebKit iPhone check EN/DE/ES with Reduce Motion, rebase, release.sh --news, live check, MAYA-HANDOFF log.
