# HANDOFF: Delete my account (25 Oct 2026)

Branch `delete-account-20261025`. Released quietly (no news card): build 20261025-095340 (commit f73d72be) and build
**20261025-095815** (commit 44711066, release 97db444f). GitHub: Release check and tests, Deploy to GitHub Pages and Live on GitHub
Pages all passed on 97db444f. Live version.json showed 20261025-095815.

## What was wrong (a tester, Luise, saw "We couldn't delete your account right now. Nothing was deleted")
1. The app never reached the server: `serverDelete()` in home-settings-sleep-v2.js used `LOWI_CLOUD_X.client()` without `await`
   (it is async), got a Promise, found no `.functions` and returned false at once. So Luise's account was not touched at all.
2. The Edge Function `delete-my-account` had never been deployed (404 at the gateway).
3. Its order (photos, rows table by table, login last) could half-delete an account, and the login step always failed for anyone
   who caught a product: `products.caught_by` ON DELETE SET NULL is undone by the `lowi_rate_products` trigger, so Postgres
   raised 23503 `products_caught_by_fkey` (reproduced in a rolled-back block: tools/delete-account/repro-products-fk.sql).
4. `swipe_foods` and the Oct 24 chat archives have no foreign key to the login, so their rows would have stayed.

## What changed
- DB (applied live): `public.lowi_delete_account(uid)` in supabase/proposals/delete_account_20261025.sql. One transaction: refuse the
  owner (app_admins), release caught products through the trigger (product stays, name blanked), clear the archives and
  swipe_foods, delete auth.users so everything else cascades, return the media file paths. Execute: service_role only.
- Edge Function `delete-my-account` (deployed, version 1, verify_jwt on): calls the RPC, then removes media files (retry once,
  never a reason to fail), drops this phone's `n1_push` row by its endpoint. 403 owner, 500 db (nothing deleted), 401, 400.
- App: awaits the client; sends the push endpoint; unsubscribes push after ok; new `delOwner` line in EN/DE/ES.
- Tests: tests/delete-account-1025.test.cjs (5 tests; the behaviour test fails on the old code: 0 calls to the server). Two older
  tests updated for the new return shape. Full suite 3214/3214.

## Proof (highest rung: live build, real server, fresh test account, two engines)
`node tools/delete-account/live-delete-e2e.cjs --engine webkit|chromium` on https://therealetm.github.io/lowispike/ (20261025-095815),
390x844, fresh anonymous account marked lowi_test before it got rows (profile, user_state, cycle_sync):
- Dialog in EN, ES, DE: right title, text and buttons, fits the screen, nothing clipped (both engines). Screenshots on the VM:
  /home/sprite/delacct-shots/.
- Blocked call (DE): shows "Dein Konto konnte gerade nicht gelöscht werden. Es wurde nichts gelöscht."; tools/delete-account/count-rows.sh
  then showed auth user, profile, user_state and cycle_sync all still 1.
- Real delete (DE): server 200 ok, media_left 0; count-rows.sh: every count 0 (auth user, identities, sessions, all rows, files).
  The page reloaded as a new anonymous visitor (new uid).
- Leftover test accounts from my runs (5, all made by this task between 08:57 and 09:10 UTC) were deleted with the same function.

## Not done / limits
- Not tried on a real iPhone; not tried with a real Google/Apple sign-in (only anonymous accounts); the push unsubscribe and the
  n1_push row removal were not exercised live (the test browser had no push subscription); media removal was exercised with 0
  files only.
- The "maya-delacct-20261025" token from the other account exists on Supabase but its value was never available here. This VM
  used Supabase CLI logins instead (tokens maya-delacct-cli-vm-20261025 and maya-delacct-cli-vm2-20261025; the first login vanished
  mid-task, probably another task logging out). Delete them on supabase.com/dashboard/account/tokens when no longer needed.
- tools/delete-account/live-delete-e2e.cjs: the final working version (scroll-and-tap, German last) is on this branch only.
