# COORD: Delete my account works (task 3a02b7b3 'LOWiSPIKE: fix Delete my account', Sun 25 Oct 2026 ~10:40 CET)

Status: DONE (live 20261025-095815, ~11:00 CET)

## Result
- Branch `delete-account-20261025` (pushed, HEAD 799383d2 with HANDOFF.md). Released to main: f73d72be (build 20261025-095340) and 44711066 / release 97db444f (build **20261025-095815**). GitHub: Release check and tests, Deploy, Live on GitHub Pages all success on 97db444f. Live version.json = 20261025-095815.
- DB: public.lowi_delete_account(uid) applied live (service_role only). Edge Function delete-my-account deployed (v1, verify_jwt on).
- Highest proof rung: LIVE build + real Supabase + fresh anonymous test account, WebKit and Chromium at 390x844: dialog EN/ES/DE correct and fitting; blocked call -> delFail text and all rows still there; real delete -> 200 ok and every count 0 (auth user, identities, sessions, profile, user_state, cycle_sync, all other tables, media). 5 leftover test accounts from my runs deleted.
- Extra root cause: serverDelete used the async LOWI_CLOUD_X.client() without await, so the button never called the server at all.

## Not done
- Real iPhone; a real Google/Apple account; push unsubscribe + n1_push removal and media removal with files were not exercised live.
- Supabase CLI tokens maya-delacct-cli-vm-20261025 and maya-delacct-cli-vm2-20261025 exist (the first login vanished mid-task, likely another task's logout). Delete when done. No token value was written anywhere.
- Final e2e tool version is on the branch only.

- Branch `delete-account-20261025`, worktree /home/sprite/wt-delete-account (from origin/main 925c08c6, live 20261025-085147).
- One behavior: Settings / Community > You > Delete account deletes the signed-in account (auth user + data rows + media) and the dialog reads right in EN/DE/ES.

## Root cause found at intake (08:40 UTC)
- The app calls Edge Function `delete-my-account`; GET https://vnfwmifmsfecascwaody.supabase.co/functions/v1/delete-my-account -> 404 NOT_FOUND. The function was never deployed (dashboard lists only auth-handoff, food-photo, n1-push). So every delete failed at the gateway before any code ran: no server row or login was touched, and the client clears the phone only after ok.

## Owned files
- supabase/functions/delete-my-account/** (source + deploy), supabase/proposals/delete_my_account_*.sql (new, if needed)
- home-settings-sleep-v2.js: ONLY the delete strings (delTitle..delGuestGo) and askDelete/doDelete/serverDelete
- community-me.js: ONLY askDelete/delGo
- tests/delete-account-*.test.cjs (new), tools/delete-account/* (new)
- news.json / version.json / sw.js build ids via scripts/release.sh

## Not touching
- Tutorial (35edc1a4), shop frequency/onboarding (e8ab3f38), galaxy bots (b146b400), push notifications (2be3db10) files.
- Other Edge Functions (food-photo, n1-push, auth-handoff, owner-delete-account) are not redeployed by me.
- No real user accounts (Luise or anyone): only fresh anonymous test accounts this task creates.

## Replies
