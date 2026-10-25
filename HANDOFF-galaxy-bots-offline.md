# COORD: galaxy without bots, offline companions parked, energy to offline, rest sync (task b146b400, Sun 25 Oct 2026)

- Branch `galaxy-bots-offline-20261025`, worktree /home/sprite/wt-galaxy-bots (rebased on origin/main 16380375).
- Owned files: community-galaxy.js, community-energy.js, community-chat.js (roster + galaxy render + energy() only), community-chat.css (galaxy body styles only), hidden-accounts.js (2 agent test ids), tests/galaxy-bots-offline*.test.cjs, tools/galaxy-bots/*, supabase/proposals/energy_offline_20261025.sql
- Not touching: lis-push*, sw.js push handlers, tutorial*, foryou*, delete-account, shop files.

## Database (APPLIED to production 25 Oct ~13:20 CET via the SQL editor; file supabase/proposals/energy_offline_20261025.sql)
- `public.energy_gifts(id, from_id, to_id, to_online, created_at, seen_at, pushed_at)`
  - The app inserts one row when the user's energy shot lands on a real person's companion (online or offline). `to_online` = the sender's phone saw the recipient online.
  - Server trigger `energy_gifts_guard` (security definer) forces from_id = auth.uid(), now(), seen_at/pushed_at null, and rejects: self, bots (either side), test<->real, and spam:
    same sender->same person 1 per 5 min, one sender 20 per hour, one recipient 30 per hour (Maya's numbers, Oct 25).
  - RLS: insert own; select if you are sender or recipient; recipient may only set seen_at. service_role bypasses everything.
- `public.companion_rest(user_id pk, rx, ry, moved_by, updated_at)`: where a knocked companion came to rest, room coordinates (same on every device). Shooter's phone writes; everyone reads. Trigger: moved_by forced to auth.uid(), bots can't write, test accounts only move test companions, 60 rows/min per mover.

## Hook for the notifications task (2be3db10): "energy received while offline"
- Push sender (service role, e.g. lis-push cron or a Database Webhook on INSERT into public.energy_gifts) should pick:
  `select * from energy_gifts where pushed_at is null and seen_at is null and to_online = false and created_at > now() - interval '1 day' order by created_at`
  then send (or decide to skip) and `update energy_gifts set pushed_at = now() where id = ...`. Index `energy_gifts_push_due` covers this.
- Suggest coalescing per recipient (one push per recipient per ~30 min, "3 people sent Misty energy"). Your decision.
- The client ALSO calls `window.LisPush.energySent(toUid, {n: senderName})` (your hook) after every landed shot on a real person, if it exists. Use either; the DB row is the one with server-side limits.
- The recipient's app sets seen_at when it shows the gift (planned; for now rows stay seen_at null).

## Takeover
- Task d23d4d76 ('LOWiSPIKE: finish + release galaxy without bots, offline companions visible') took over 25 Oct ~12:30 CET, same branch/worktree, same owned files. Branch now pushed.

## Status
- DB applied and checked with a REST probe (self gift -> energy_gift_self, bot gift -> energy_gift_bot, forged moved_by overwritten).
- Next: client roster (no bots, offline parked), energy to offline, rest sync, tests, release.

## Replies

## RELEASED 25 Oct 12:56 CET: build 20261025-125456 (main 08e09974, CI green, live version.json matches) — task d23d4d76
- Room galaxy = G.roomMembers(profiles + chat writers without a profile): no made-up bots, no server bot/test flag, no hidden id, one body per name (online account wins, then lv/xp/id). Seats from the whole room (blocked + own other accounts count).
- Offline = .cg-away (orb .5 opacity, desaturated); online (room presence or wrote <10 min) = .cg-live glow.
- Names: below -> above (.cg-nt) -> first letter (.cg-ni/.cg-ini) -> hidden only if even that covers an orb.
- Energy: every landed own hit on a real uid inserts energy_gifts {to_id,to_online}; calls window.LisPush.energySent(uid,{n}) if it exists (notifications task).
- companion_rest: shooter upserts moved companions (room coords) when play settles/halts; every phone loads on Community mount, visibilitychange visible, pageshow, 'online', lowi:chat ready/reconnect.
- index.html PEOPLE select now includes bot,test (mapPerson bot/test) so flagged bots never flash in.
- Hidden: two One Chat Test ids. Nuke Test stays.
- Proof: unit 3275/3275; tools/galaxy-bots/check-local.cjs on the LIVE site with a fake Supabase fed by the real profiles snapshot: 17 bodies, 0 bots, 0 nameless, 15 dim/1 glow in Chromium+WebKit at 390x844 and 820x1180 (German); shot at an offline companion wrote energy_gifts + companion_rest in Chromium. WebKit ran at ~1 fps on the loaded test box so its shot never landed in the window.
- Open: real-account two-device check (iPhone+iPad) of companion_rest; WebKit shot landing.
