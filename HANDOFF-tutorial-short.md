# Handoff: short auto-demo tutorial (Oct 25 2026)

Released quietly as build **20261025-121302** (main 16380375). GitHub's "Release check and tests" passed, and the live site
serves that build for index.html, sw.js and version.json. No push, no Community post, no new What's New (version.json `loud`
is still 20261024-213102, so nobody gets an update card). Tests: 3265/3265.

## What the tour is now
- At most 12 one-sentence cards: hello, gap, fuel, water, move, sleep, scan, community, settings, fly, done (11), plus
  "claim your companion" only for accounts that still have the standard Misty.
- Each card plays itself: a demo finger (`tutorial-demo.js`) does the gesture on the real control, the page opens read-only,
  the card goes to the free edge. With the speaker off the reading time moves it on.
- Scan is a mocked screen: "Kaum Spike · 9/10" / "Barely a spike · 9/10" / "Apenas pico · 9/10", marked DEMO. The camera is
  never asked for (`window.__camAsked` stays false in every check).
- After the first finished tour Misty flies once by herself (`tutorial-flight.js`, key `lowispike.first-flight.v1`, synced
  across devices by account-sync, any touch hands control back).
- Voice: 78 clips (EN/DE/ES) all match their text hash and their recorded length.

## What this task changed (commits 9e00027c, e0a0fb5d, eebb4cd7, 07b522a6)
- The 2 failing checks in `tests/tutorial-short.test.cjs` were wrong, not the app: the flight key is
  `lowispike.first-flight.v1`; the bloom routes are made by `bloom('x')`; the flight script is loaded by tutorial.js, not
  index.html.
- The three news-card clips had lengths that did not match their data (also on main): re-recorded.
- Removed from tutorial.js/css: the Try it now button, the practice pads, the tour's window touch watchers (pointerdown/move/up
  on every touch), `savedTry`. `later:` ("After the tour" motion) stays: What's New cards use it. Three tests that checked
  for that code now guard that it stays gone (same number of tests).
- Card overlap: the card stays hidden (`.lt-roomwait`) until a piece of the page it opened is visible, at most 2.5 s, so it
  never fades in at the top and then sits on bubbles that fly up under it. WebKit Fuel was 100% covered for 2.6 s before.
- The card counts the page's show time from when the page is really drawn (at least 1.8 s, waiting at most 6 s), for slow
  phones where a sheet appears late.
- The demo waits up to 3 s for a control that is still faded out (iPad: the pad comes back about 2 s after the You sheet
  closes), instead of showing the old finger. The demo finger no longer throws when there is nothing to point at.
- `tools/tutorial-short/check.cjs` only counts overlap while the card is visible.
- TUTORIAL.md describes the short tour and the removal.

## Checks run (simulated, test data, no real accounts)
- Chromium iPhone 13 (390x844): EN, ES all pass; DE all pass on the LIVE site after release.
- WebKit iPhone 13: EN all pass, DE all pass (local), Water/Fuel overlap 0%.
- Chromium iPad (gen 7): DE all pass (fly card has its finger, no page errors).
- WebKit iPad (gen 7): every card passes except one: the You/settings sheet was never seen visible during the settings card
  in full runs. In a short probe starting at the Community card it appeared 4.4 s after opening and stayed 3.6 s. The sheet's
  `on` class comes from requestAnimationFrame, which headless WebKit runs very slowly on this machine (load average 27-29
  from other tasks). Probably not a real bug; only a real iPad can say.
- First flight: on WebKit iPad Misty took off, went into a cell world (126 s), came out (248 s), headed for the edge (153 of
  230) and was still in the atmosphere when the 460 s check window ended. Once per account: after a finished tour the
  record is written, a touch hands back, and a second finished tour and a reload never start it again.

## Still open
- Real iPhone/iPad check by Emmanuel (Settings > tutorial, speaker off).
- WebKit iPad settings sheet timing (above), if Emmanuel sees the You sheet flash too briefly on his iPad.
- A full first flight to the soft edge and back home was not seen end to end inside one check window.
- `peek` cards and `tryMatch` in tutorial-steps.js are unused by the base tour but left in place (tests use tryMatch for the
  demo gestures).
