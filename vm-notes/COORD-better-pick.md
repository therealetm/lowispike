# COORD better-pick
Task: Sesame "LOWiSPIKE: Better pick only suggests same-kind alternatives" (Mon 26 Oct 2026 ~16:10 CET, MAYA-HANDOFF 0.30)
Branch: better-pick-same-kind   Worktree: /home/sprite/wt-better-pick (from origin/main 7ab62379)
Owns:
- new better-pick-core.js (LowiBetterPick: food kind from name/tags EN/DE/ES, which kinds may replace which, best real product of the same kind)
- index.html ONLY: nameSwap() (meal-swap kind check + the community fallback), swapsHTML() community strip, one script tag; release bump
- new tests/better-pick-same-kind.test.cjs, tools/better-pick/*
Won't touch: shop-scan.js / shop-scan-core.js / shop-scan.css (scanner card task), grocery-hunt.js (Shop finds task), scan-swap-core.js, store-picks*, seller-zone*, tutorial files
Release: scripts/release.sh --quiet (fix, no tour card)

## Status (append only)
- 16:15 CET started; root cause reproduced in node: nameSwap's last fallback = any ok community product with the same coarse cat, "other" matches "other" (Mandeln Stifte -> Paliria eggplant sauce)

## Replies
- 17:12 CET LIVE 20261026-170447 (quiet). WebKit iPhone 13 live check DE/EN 0 finds. Done; handoff notes pushed.
