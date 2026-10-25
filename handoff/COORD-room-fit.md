# COORD: Room opens zoomed out, join-ordered rows, test accounts, nameless bubbles, leftovers (task started 25 Oct 2026 06:34 PDT)

Branch: room-fit-20261025 (worktree /home/sprite/wt-room-fit, from origin/main)

Files I am changing: community-galaxy.js (mapLayout, mapZooms, new mapFit), community-chat.js (camera: fit-to-all on open, remember manual zoom; roomOf passes join date), community-energy.js (LAND_KEY v3, ignore old companion_rest rows), index.html (profiles select adds joined_at, mapPerson j, LOWI_CLOUD_X.joined, host.joined), hidden-accounts.js (owner's extra accounts), CSS for the Room background if needed.

Database (done, production):
- profiles.joined_at timestamptz not null default now(), backfilled from auth.users.created_at; trigger profiles_keep_joined_at keeps it fixed (supabase/proposals/profiles_joined_at_20261025.sql)
- profiles.test=true + lowi_test metadata for GiftTestA (ac019549), GiftTestB (71a396d1), Nuke Test (1953ba3e), T (f9ceb91e, anonymous, created 25 Oct 09:53 UTC, lv1 0 xp)

Other tasks: please do not edit mapLayout/mapZooms/place()/onShow camera code until this lands.

## Update 25 Oct ~14:15 UTC (task bdcea27d takes over from 5b1193fa, same branch/worktree)
- Rebased on origin/main 817abcb4. Fixing Emmy's initial: mapFit now takes {avoid: energy pad rect, big} and keeps the pad corner free (community-galaxy.js mapFit, community-chat.js fitCam). Layout wobble 14 -> 6 px.
- Releasing via scripts/release.sh under /tmp/lowispike-release.lock, quiet. ROWS_SINCE in community-energy.js is set to the release time.
- Owned until released: community-galaxy.js (mapLayout/mapFit/mapZooms/mapClamp/sky), community-chat.js camera (place/fitCam/camTo/mapGestures), community-standout.css Room background block, community-energy.js ROWS_SINCE/LAND_KEY, hidden-accounts.js.

## Replies

## Released 25 Oct (task bdcea27d)
- 20261025-152749 (c5289f74): rows by join date, fit-to-all start, kept user zoom, clean background, Manuuii hidden, energy-pad corner kept free (no name shrinks to a letter), Room idle pacing.
- 20261025-154222 (8e7a2cf7, pending live): fit re-checks the pad when it is not measurable yet.
- Idle pacing (heat ask): community-galaxy.js sky() draws ~30/s while touched, then 20/10/5 per s after 3/30/90 s, using window.LowiPower.interval(true) when power-saver.js is loaded (else its own touch clock with the same tiers). The cgBob loops in the Room are held and stepped at the same pace, played again on the next touch or when the Room closes. Files not touched: body-world-3d*.js, power-saver.js, audio, CSS animation files of the heat task.
- Room camera/galaxy files are free again.
