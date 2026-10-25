# HANDOFF: Give a hand (gift a healthy basket), 25 Oct 2026

Spec: docs/gift-basket-spec.md (same as /home/sprite/gift-basket-spec.md). Branch gift-basket-20261025.

## What is in the code
- gift-basket-core.js: pure rules. Strict payment links (Ko-fi / buy|donate.stripe.com / PayPal.me), low-spike-only items,
  build/view, the 7-day receipt and verdict windows, and the verified score. Tests: tests/gift-basket-core.test.cjs.
- gift-basket.js + gift-basket.css: the panel (Give a hand / I could use a hand). It opens on top of Shop as `.stp-ov.gb-ov`,
  so the back stack (R2 foreign sweep) adopts it, and X / Back bring Shop back.
- store-picks.js: only giftEntry(), the row in Kitchen and in the Supermarket tab footer, plus one click line.
- The server API is LowiGiftBasket._api (cloud by default). tools/check-gift-basket.cjs swaps in an in-page fake server.
- Server gate: the Shop row appears only after the `gift_baskets` table answers (localStorage lowi.giftBasket.server.v1,
  re-checked every 10 min while missing, every 6 h once present).

## NOT DONE: the database change is not applied
The Supabase CLI sign-in had expired (~/.supabase/access-token missing). The login request timed out with nobody there to approve it.
Apply:
  cd /tmp/sbwork && /tmp/supabase-cli/supabase login --no-browser   (Emmanuel approves and pastes the code)
  /tmp/supabase-cli/supabase db query --linked --project-ref vnfwmifmsfecascwaody -f <repo>/supabase/proposals/gift_baskets_20261025.sql -o json
The last select should return table_ready/help_ready/trust_ready/receipts_private = true. Then, on the live site, sign in on
a fresh test account and confirm Shop > Kitchen shows "Give a hand". Test two accounts end to end: share, help, receipt,
verify, and confirm a third account can't read the receipt (storage policy). Delete the test accounts afterwards.

## Next steps (in order)
1. Apply the SQL (above) and run a live two-account test.
2. Show the verified badge on the profile card (profile-share owns it; call rpc gift_trust([uid])).
3. A ping when someone helps, when a receipt arrives, and when a window is about to close (the notification task owns pushes).
4. Misty carries a basket to the other person's companion (galaxy code; another task owned it on 25 Oct).
5. Receipt OCR to auto-match receipt lines to basket items for the giver.
6. Report a basket, plus owner tools to take one down; a server-side allow list for item names.

## Proof so far
- All 3227 unit tests pass.
- tools/check-gift-basket.cjs: 30 of 30 checks pass at 390x844 in Chromium and WebKit, in English, German and Spanish, plus German in day mode. It uses a fake server.
