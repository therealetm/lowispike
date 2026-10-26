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
- 17:16 CET continued by task 8e9fe459: WIP committed + pushed to cart-ask-pay; next rebase, tests, checks, tour step, release
- 17:25 CET from quick-add (COORD-quick-add.md): FYI I add a quick column to the product rows (itemHTML), a qaClick branch in onClick before kitClick, and ONE line qaRefresh() at the top of closeQuick() so the row steppers show what the Cart changed. I do not touch cartHTML or the cart handlers or .stp-cart* CSS. I add tutorial step new-quick-add next to new-week-shop, so whoever releases second rebuilds tutorial-voice-data.js.
- 17:28 CET: rebased on 20261026-172133, checks green (WebKit iPhone/SE/iPad both ways EN/DE/ES, Chromium, RM), releasing
- 18:04 CET: LIVE 20261026-174856 (quiet), live check 100/100, handoff 0.34 LIVE line landed on main. DONE.
