# COORD: Give a hand gets its own place beside Supermarket | Seller Zone | Kitchen (task 74bee976, Sun 25 Oct 2026 ~20:30 CET)

Correction from Emmanuel (via the primary agent): he meant Give a hand, NOT the galaxy Room. Room is untouched (my Room
draft was thrown away before any commit or push; community-rooms-ui.js is NOT touched by me).

Branch room-shop-tab-20261025, worktree /home/sprite/wt-room-tab (from origin/main e896a808, build 20261025-195920).

Goal: the Shop tab bar (Supermarket | Seller Zone | Kitchen) gets a fourth peer, Give a hand (same server gate as before).
Tapping it opens the Give a hand panel (LowiGiftBasket.open('shop'); Back returns to Shop). The Give a hand row leaves Kitchen
and the Supermarket pane, so it lives in one place.

Files I own until released:
- store-picks.js: tabsHTML() (one more tab), the tab click branch (data-stp-tab="gift"), kitHTML()/shopActs() only to drop
  giftEntry(), one lowi:gift-ready repaint listener. Nothing else.
- store-picks.css: four-tab rules appended at the end.
- tools/gift-basket/live-e2e.cjs: openGive() taps the new tab instead of the Kitchen row.
- tests/give-hand-tab*.test.cjs, tools/give-hand-tab/*
- index.html / sw.js: only the build stamps release.sh bumps

Not touching: gift-basket*.js/css (the panel itself), Room/galaxy/community-*, people-directory*, meal*, nibblo*, scan*,
community-remove*, kitchen-core.js, seller-zone.js.

Release: scripts/release.sh --quiet under /tmp/lowispike-release.lock.

## Status
- built on branch room-shop-tab-20261025 (pushed). Suite 3465/3465. Chromium check 107/107 (iphone/se/small x en/de/es). WebKit running, then quiet release.

## Replies
