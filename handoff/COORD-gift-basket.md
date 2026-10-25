# COORD: Gift a healthy basket (task 19a98681 'LOWiSPIKE: gift a healthy basket demo', Sun 25 Oct 2026 ~11:25 CET)

- Branch `gift-basket-20261025`, worktree /home/sprite/wt-gift-basket (from origin/main 97db444f, live 20261025-095815).
- One area: "Give a hand" under Fuel > Shop. A person shares a basket of low-spike staples + their OWN payment link (Ko-fi / Stripe Payment Link / PayPal.me). LOWiSPIKE never touches money.

## Owned files
- NEW: gift-basket-core.js, gift-basket.js, gift-basket.css, tests/gift-basket*.test.cjs, tools/gift-basket/*, supabase/proposals/gift_baskets_20261025.sql
- store-picks.js: ONLY one "Give a hand" entry button (data-stp="gift") in shopActs()/kitHTML and its click line
- index.html: ONLY my script/link tags
- sw.js: ONLY one STATIC.push line for my files (own line, like kitchen-core.js)
- news.json / version.json / sw.js build ids via scripts/release.sh (quiet)

## Not touching
- For You (foryou*, fy-embed*), tutorial*, shop-plan* / onboarding own entries, community-energy/galaxy/cell-room*, lis-push* / n1pJs, delete-account files.
- kitchen-core.js / shop list logic (read only: LowiKitchenCore, LOWI_SHELF.listOpen).

## Status
- RELEASED quietly as build 20261025-111641 (GitHub check passed on cdb4c68). Live check 30/30 in Chromium + WebKit with a fake server. Server SQL NOT applied: the Supabase CLI was logged out and the login request expired. Shop row stays hidden until gift_baskets exists. Next: HANDOFF-gift-basket.md in the repo.

## Replies

## 25 Oct 2026 ~11:00 UTC (switch-on task)
- SQL applied to production (one run, via the push task's 24h CLI token in ~/.push-home). Table + RLS + RPCs + private receipts bucket live.
- Added server constraints gift_items_low_spike (word list tools/gift-basket/deny.cjs) and gift_kofi_page. community_kicks missing on prod -> kick policies conditional.
- Live e2e tools/gift-basket/live-e2e.cjs: test accounts gift-test-{a,b,c}@lowispike-test.invalid (deleted after). Branch gift-on-20261025.
- DONE: live e2e 33/33 Chromium + 33/33 WebKit (build 20261025-114119). Released --quiet --no-bump: main b7fa6005, CI success. Test users + receipts deleted. Remaining: badge on profile cards, pings, Misty carrying basket, receipt OCR, report/take-down.
