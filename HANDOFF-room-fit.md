# HANDOFF room-fit (25 Oct 2026, task bdcea27d) - DONE

Released quietly (no push, no Community post, no What's New):
- 20261025-152749: Room rows by join date (newest on top), opens zoomed out so everyone fits, a user's zoom/pan kept until the app
  closes (double-tap at full zoom = everyone again), still deep-blue background in Community, Manuuii hidden, ROWS_SINCE 14:50 UTC.
- Emmy's "E": the energy pad sits in the Room's bottom-right corner and the label pass keeps names off it. mapFit now takes
  {avoid, big} and tries lifting the bottom rows / moving the right column away from the pad, keeping the view that loses the fewest
  names, then the closest zoom (tests/room-fit.test.cjs, pad sizes measured on iPhone 13, 15 Pro Max size, iPad).
- Layout wobble 14 -> 6 px so a name never grazes the companion below.
- Zoom test: tools/room-fit/check-room.cjs pinches with two touch pointers (a mouse wheel is not delivered in mobile emulation).
- Heat: sky() + cgBob paced by idle tiers 20/10/5 (tests/room-idle-pace.test.cjs), LowiPower when present.
- 20261025-154222: fitCam re-checks for the pad shortly when it is hidden (zoom-out from Home).

Live checks (tools/room-fit/check-room.cjs against the live site, mocked data, no writes): iPhone 13 + iPad, Chromium + WebKit: 15 people,
0 bots/tests, all on screen, no name lost, rows in join order, zoom kept. Idle pacing measured in Chromium (24.5/s touched, 19/s calm,
bobbing held then handed back). Headless WebKit here gets ~2 frames a second, so its pace numbers mean nothing.

Open: real iPhone/iPad. Long names (Joseph Castellar, Marleys Puello yeneris) end in "..." by the name width cap, never a letter.
Old builds can still write companion_rest spots in the old layout until they update; rows older than ROWS_SINCE are ignored.
