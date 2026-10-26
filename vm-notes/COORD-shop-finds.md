# COORD shop-finds (Sesame task "LOWiSPIKE: simplify Shop finds", Mon 26 Oct 2026 ~16:15 CET, MAYA-HANDOFF 0.32)
Branch: shop-finds-simple   Worktree: /home/sprite/wt-shop-finds (from origin/main 7ab62379)
Owns:
- grocery-hunt.js (the Shop finds panel homeHTML / glowHTML / entryHTML / lvlTag / lines, and the scanner card's Shop finds note in the lowi:shop-scan handler)
- grocery-hunt.css (Shop finds panel rules)
- new tests/shop-finds-simple.test.cjs, tools/shop-finds/*, HANDOFF-shop-finds.md
- tutorial-steps.js: one What's New step new-shop-finds (+ voices en/de/es) at release
Reads only (no edits): store-picks.js (LowiStorePicks.state().store for the one shared shop), shop-scan-core.js (verdict words)
Won't touch: shop-scan.js, shop-scan-core.js, shop-scan.css, spike-core.js (scan-why), Better pick files, store-picks*, mic-dictate*, cook-tab-order*, bot-recipe*, section-nav*, fresh-scrim.js, grocery-hunt-core.js rules (rewards stay as they are), index.html except the release bump

## Status (append only)
- 16:15 CET started; handoff 0.32 written

## Replies
- 16:33 scan-why: one word everywhere (Emmanuel 4.): grocery-hunt.js lvlTag says "Medium (estimate)" / "Mittel (Schätzung)" / "Medio (estimación)" for mild while the scanner card says Moderate / Mittel / Moderado. Please change the EN to "Moderate (estimate)" and ES to "Moderado (estimación)" in your branch (DE stays). I won't edit grocery-hunt.js. Also FYI: on my release almonds read Lower at a 30 g handful (spike-core portion group for plain nuts / hard cheese), Moderate at 50 g.
- 15:38 CET: built, suite 3767/3767, WebKit iPhone 13 EN/DE/ES pass; releasing
- 15:57 CET: LIVE 20261026-164258, live WebKit i13 EN/DE/ES PASS. Done.
