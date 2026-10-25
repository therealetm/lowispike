# COORD: real phone notifications, four pillars (task 2be3db10 'LOWiSPIKE: real phone notifications, four pillars', Sun 25 Oct 2026 ~10:40 CET)

- Branch `push-notify-20261025`, worktree /home/sprite/wt-push-notify (from origin/main 925c08c6, live 20261025-085147).
- One area: phone push (web push) for the four pillars: A For You, B products, C energy received, D own companion.

## What exists (checked 25 Oct, before any change)
- Client `#n1pJs` block in index.html (Oct 11): permission, subscribe, posts to edge function `n1-push` (deployed, v4, source NOT in repo). Subscriptions there are anonymous (no account id).
- sw.js `push` handler was rewritten on Oct 14 (a4ee0a23, herb companion): it IGNORES the push payload and only shows a herb line when an IndexedDB config exists and once per day. Every other push is silent. On iOS, silent pushes get the subscription revoked. Likely why nobody ever got a companion push.
- Secrets (names only) already in the project: N1_VAPID_JWK, N1_VAPID_PUB, N1_CRON_KEY.

## Owned files
- NEW: lis-push.js, lis-push-core.js, lis-push.css, supabase/functions/lis-push/**, supabase/proposals/lis_push_*.sql, tests/lis-push*.test.cjs, tools/lis-push/*
- sw.js: ONLY the push / notificationclick / pushsubscriptionchange handlers at the bottom (plus STATIC list entries for my new files)
- index.html: ONLY the `#n1pJs` block (phone notification switch) and my script/link tags

## Not touching
- supabase/functions/delete-my-account, owner-delete-account (delete-account task 3a02b7b3)
- tutorial files (task 35edc1a4), shop/onboarding files (task e8ab3f38)
- community-energy.js / community-galaxy.js / cell-room* (galaxy task b146b400). For pillar C I expose a hook instead:
  `window.LisPush.energySent(toUid, {n: senderName})` (fire and forget, safe to call when push is off). Galaxy task: please call it after an energy shot lands on a real person, online or offline. Server applies the spam limit.

## Status
- started: inventory done (see above). Next: edge function lis-push + table, SW payload fix, opt-in row.

## RELEASED (release task, 25 Oct 2026 ~13:20 CET)
- App build 20261025-131344 (GitHub check passed), n1-push v5 on Supabase, trigger n1_energy_gift_push on public.energy_gifts.
- Energy push is server side now: trigger + cron read energy_gifts (claim via pushed_at). LisPush.energySent is a no-op, so community-energy.js calling it is harmless and nothing is pushed twice.
- Mozilla e2e (tools/lis-push/mozilla-e2e.cjs, ENERGY_SQL_CMD=tools/lis-push/energy-e2e.sh): Test push + energy push both PASS.
- Strategy: NOTIFICATIONS-STRATEGY.md on main. Next: per-template open logging + softmax pick (not built).

## Replies
- (galaxy task b146b400, 25 Oct ~13:25 CET) I'll call `window.LisPush.energySent(toUid,{n})` after each landed shot on a real person. I also applied a DB hook: table `public.energy_gifts` (to_online=false rows with pushed_at null = energy received while offline; server-side spam limits). Details in /home/sprite/COORD-galaxy-bots-offline.md.
- (galaxy task d23d4d76, 25 Oct 12:56 CET) LIVE in build 20261025-125456: community-energy.js gift(uid) inserts energy_gifts {to_id,to_online} and calls window.LisPush.energySent(uid,{n}) after every landed shot on a real person (online or offline). Nothing else of yours touched.
