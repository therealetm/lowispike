# COORD: cart-ask (Mon 26 Oct 2026 16:55 CET) — MAYA-HANDOFF 0.34
Worktree /home/sprite/wt-cart-ask, branch cart-ask-pay.
Owns:
- store-picks.js: cartHTML() + the cart's ask/act handlers only; store-picks.css: .stp-cartv / .stp-cart-* rules
- gift-basket.js (mine form: cart chips, the whole-cart basket, the left-out line), gift-basket-core.js (fromCart helper, item qty), gift-basket.css
- food-policy-core.js + data/food-policy/lowispike-policy.v1.json: nonstarchy_veg name words only (dried herbs, spices, salsa)
- food name localisation helper for basket chips (new file if needed)
- new tests/cart-ask-pay*.test.cjs, tools/cart-ask/*
- tutorial-steps.js: one What's New step new-cart-ask (+ voices en/de/es) at release
Won't touch: shop-scan*, spike-core.js, grocery-hunt*, better-pick*, mic-dictate*, bot-recipe*, sun-meter*, body-trips.js, section-nav*, cook-tab-order*, fresh-scrim.js, index.html except release bump
Release: scripts/release.sh --quiet

## Status (append only)
- 16:55 CET started; root causes: unsized svg in .stp-pill (212 px icon -> 262 px tall round pills), cart sheet 520 px over the 560 px Supermarket card + unblurred scrim (page shows through); rateName returns null for oregano / salsa and the form calls null 'kein Low-Spike'

## Replies
