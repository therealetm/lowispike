# Rooms load test, 20 Oct 2026

Why the cap is 30 people per room (`CAP` in `community-rooms-core.js`).

## Node load test (`node tools/sim/rooms-load.cjs <N> <arrivalSeconds>`, cap 30, real community-rooms.js on the fake realtime server)

Each phone chats once a minute and shoots once every 10 seconds.

| People | Arrival | Rooms | Occupancy min/avg/max | Not placed | Settled | Join p50 / p95 / max | People moved | Live items per phone per second | Same, everyone in one room |
|---|---|---|---|---|---|---|---|---|---|
| 100 | 30 s | 4 | 10 / 25 / 30 | 0 | 30.4 s | 0.62 / 1.92 / 2.04 s | 10 | 3.2 (max 3.95) | 11.6 |
| 1000 | 60 s | 34 | 10 / 29.4 / 30 | 0 | 62.6 s | 0.58 / 0.79 / 2.08 s | 439 (628 moves) | 3.33 (max 4.2) | 116.5 |

What each phone receives stays flat at about 3.3 items a second whether 100 or 1,000 people are online. With one shared room it grows with everyone: about 12 a second at 100 and 117 at 1,000. Nobody was left without a room. Bursts of arrivals do cause over-cap moves at 1,000 people (439 people moved once or more), but the move is quick: 95% of joins took under 0.8 s.

## Browser runs (earlier, `/tmp/rooms-runs.out`, Chromium, headless, phone size)

fps while the room is live (4 messages a second plus shots), on the Room tab / Chat tab:

- Before rooms, 100 members: 1.9 / 1.0 fps, worst frame 717 / 1733 ms, about 18,000 DOM nodes, 97 bodies.
- Before rooms, 1,000 members: 0.6 / 0.5 fps, worst frame 4.3 / 4.5 s, about 34,000 nodes, 261 to 280 bodies.
- After, 1,000 members, my room has 11 people: 2.6 / 6.8 fps, about 5,300 nodes.
- After, my room has 21 people: 3.3 / 8.2 fps, worst frame 400 / 267 ms.
- After, 30+ seated (the next arrival opens room 2): 4.0 to 4.8 / 9.5 to 10.1 fps, about 5,500 nodes, 30 bodies at most.

The galaxy draws at most about 30 bodies once the room is capped, so the page cost no longer grows with the number of members. This headless browser is far slower than a phone, so read these as before/after ratios, not absolute fps.

## Decision

Cap 30 regular members, plus up to 4 guests let in by knocking. It keeps per-phone traffic around 3 to 4 items a second and the galaxy at 30 bodies or fewer, and a room of 30 still feels busy. Not yet checked: the Supabase realtime concurrent-connection limit for the project plan (each phone holds the global channel, its room channel and, for room leads, the directory channel).
