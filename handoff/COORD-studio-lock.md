# COORD: Studio locked (admin + PIN) (task df79bbb7 'LOWiSPIKE: lock Studio (admin + PIN)', Sun 25 Oct 2026 ~14:40 CET)

- Branch `studio-lock-20261025`, worktree /home/sprite/wt-studio-lock (from origin/main 940420df, live 20261025-132728).
- One behavior: Community > Studio shows a calm locked "Under construction" glass screen (DE/EN/ES) to everyone except the owner.
  No Affiliates/Creation frame loads behind it. Owner gets in automatically (server is_app_owner / app_admins) or with a PIN
  checked on the server (RPC studio_unlock, bcrypt hash in a no-grant table, rate limited). A correct PIN returns a device pass
  (only its sha256 is stored server-side); studio_access(pass) is the server's yes/no.

## Owned files
- NEW: studio-lock-core.js, studio-lock.js, studio-lock.css, tests/studio-lock*.test.cjs, tools/studio-lock/*, supabase/proposals/studio_lock_20261025.sql
- community-rooms-ui.js: ONLY ensureView (no frame while locked), studioSwitch (hidden while locked), the two "Copy Affiliates/Creation link" menu rows (hidden while locked)
- index.html: ONLY my <link>/<script> tag lines
- sw.js: ONLY STATIC list entries for my new files

## Not touching
- community-galaxy.js, galaxy-*, community-energy.js (task 5b1193fa)
- community-chat.js / community-chat.css / chat scroll (task 35b35dff)
- foryou*, TRIBE module in index.html (task ed90eefb)
- affiliates/*, create/* standalone pages (now locked too, by the follow-up task, see COORD-studio-pages.md)

## Status
- SQL LIVE in production (25 Oct ~15:20 CET): tables studio_lock / studio_pin_tries / studio_passes (RLS on, no grants), RPCs studio_access(pass), studio_unlock(pin), studio_forget_devices(). Owner = existing public.is_app_admin() (app_admins, one row = Emmanuel). PIN hash set (bcrypt, only in the DB).
- RELEASED (done): in-app lock live in 20261025-152512 (admin-before-sign-in fix included), GitHub CI green. Task finished.
- 25 Oct ~17:32 CET follow-up (task 'lock standalone Studio pages too', see COORD-studio-pages.md): affiliates/ and create/ now use the same server lock via studio-gate.js; unlocked Studio shows a 'Private · only you' badge + Lock (device flag lowi.studio.locked). Live in 20261025-173238, CI green.

## Replies
