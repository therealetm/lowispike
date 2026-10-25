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

## DONE 25 Oct 2026: the database change is live
supabase/proposals/gift_baskets_20261025.sql was applied to the production project (vnfwmifmsfecascwaody) in one run; the
last select returned table_ready/help_ready/trust_ready/receipts_private/staples_ok/spike_refused = true. Changes made while applying:
- public.community_kicks is NOT on the live project (owner_admin_20261018.sql was never applied), so the two "owner kick"
  policies are only created when that table exists and gift_help() checks it dynamically. Rerun the file after kicks land.
- Server-side backstop (a tampered app): check constraint gift_items_low_spike = public.gift_items_ok(items) refuses item names
  matching the spike word list in tools/gift-basket/deny.cjs (strings must also be 2..40 chars, no < > or control chars);
  gift_kofi_page refuses the Ko-fi dashboard paths (KOFI_RESERVED). tests/gift-basket-server.test.cjs keeps the SQL and the
  list in sync, and tools/gift-basket/deny-corpus.cjs proves no food the app rates JA is refused (2 intended: sugar-coated nuts).
  If you change the word list: regenerate the SQL block, rerun the file (it is idempotent), rerun the test.
Live proof: tools/gift-basket/live-e2e.cjs (33 checks, Chromium + WebKit, live site + real Supabase, three throwaway email
accounts gift-test-{a,b,c}@lowispike-test.invalid, deleted afterwards). Anonymous visitors get the sign-in gate on the live
site, so a live test needs email accounts; the script signs in with GIFT_PW and the accounts are made in auth.users by SQL.

## Next steps (in order)
1. Show the verified badge on the profile card (profile-share owns it; call rpc gift_trust([uid])).
2. A ping when someone helps, when a receipt arrives, and when a window is about to close (the notification task owns pushes).
3. Misty carries a basket to the other person's companion (galaxy code; another task owned it on 25 Oct).
4. Receipt OCR to auto-match receipt lines to basket items for the giver.
5. Report a basket, plus owner tools to take one down. The server word list is a backstop, not the app's full rating;
   porting LowiFoodPolicy.rateName to an Edge Function would make it exact.

## Proof so far
- All 3227 unit tests pass.
- tools/check-gift-basket.cjs: 30 of 30 checks pass at 390x844 in Chromium and WebKit, in English, German and Spanish, plus German in day mode. It uses a fake server.
- 25 Oct: live two-account test on the real server, see above. Plus tests/gift-basket-server.test.cjs (5 tests).
