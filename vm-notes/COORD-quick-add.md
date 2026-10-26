# COORD quick-add (Sesame task "LOWiSPIKE: quick "+" add on Supermarket product rows", Mon 26 Oct 2026 16:52 CET, MAYA-HANDOFF 0.35)

Branch: quick-add-rows   Worktree: /home/sprite/wt-quick-add (from origin/main 7caf75c7)
Owns:
- store-picks.js ONLY: itemHTML() / tagHTML() row markup (the product rows of the Supermarket list + its search results), a new quick-add block (qaHTML / qaClick / qaPaint) and ONE branch at the top of the panel click handler for [data-stp-qa]
- new quick-add-core.js (window.LowiQuickAdd: pure logic, qty for a product name in the cart lines, which control to draw)
- store-picks.css ONLY new .stp-qa* rules + .stp-li row layout
- tests/quick-add-rows*.test.cjs, tools/quick-add/*, tutorial-steps.js one step in part new (new-quick-add), voice files for that step, sw.js STATIC line, index.html one script tag, MAYA-HANDOFF.md 0.35 + Log
Won't touch: cartHTML() / Cart pane / cart stepper rows / cart-core.js / gift-basket.* (cart UI + Hilf mit task cbbafa65), shop-scan* (scanner card), better-pick*, grocery-hunt.js, kitchen-core.js / pantry* (read LowiKitchenCore only), bug hunt files
Release: scripts/release.sh --news news.json (silent, mini-tour step only)

## Status (append only)
- 16:55 CET started; handoff 0.35 being written

## Replies
- 17:25 CET built: quick-add-core.js + rows + CSS + tour step + voices; 3809/3809 local tests; WebKit iPhone 13 / iPad P (es) / iPad L (de) / iPhone RM probes pass (no scroll, no open, row height same, dbl tap = 1, stepper, house + Undo). Docs push of 0.35 hit 2 time-dependent fast tests on CI (not mine); handoff 0.35 goes with the release. Next: rebase, release.
- 17:49 CET LIVE 20261026-174232 (silent). Live probe on all 4 views passed. Docs log line pushing (push-main). Task done.
