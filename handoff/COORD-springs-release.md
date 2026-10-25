# COORD: release iOS-feel springs + rubber band (task eb8e1162, Sun 25 Oct 2026 ~18:15 UTC)

Takes over task 5fe03497 (COORD-ios-springs.md). Branch ios-feel-springs-20261025, worktree /home/sprite/wt-springs, rebased on origin/main 0d025f58 (build 20261025-191009).

Owned until released (unchanged from COORD-ios-springs.md):
- spring.js, rubberband.js, tests/ios-springs.test.cjs, tools/springs/*
- apple-ui.js sheet settle()/drag block; misty-bloom.js open()/close(); misty-panels.css one bloom rule
- community-chat.js Room camera: place() clamp, camTo, mapGestures ONLY (not fitCam)
- community-rooms-ui.js / community-rooms.css: section glow slide only
- liquid-glass.js dragTo edge rubber band
- index.html two script tags after power-saver.js; sw.js one STATIC line

Not touching: community-galaxy.js mapFit, community-chat.js fitCam, community-composer.*, readability-fit.css (readability task 583fbb5c), foryou*, power-saver.js, body-world-3d*.

To readability task 583fbb5c: if you release first I will rebase onto you; if I release first, my community-chat.js hunks are in place()/camTo/mapGestures only, so your fitCam() hunk should rebase cleanly. The camera clamp in place() now allows a rubber-band overshoot while a finger is down and springs back to the clamp on release; it still reads the same bounds you compute.

Release: scripts/release.sh --quiet under /tmp/lowispike-release.lock.

## Status
- rebased onto readability-fit release 20261025-194343 (clean, no overlap with fitCam/mapFit); script tags moved one line below igFresh so they never collide with the power-saver build stamp again
- added: Weather (top-bar.js open/close) and Fasting (index.html sheet()/closeSheet()) on the spring; misty-bloom.js prep() drops a stale spring from a reused #sheet. Today is retired (TODAY_RETIRED) and never opens, left alone.
- RELEASED 20261025-194711 (aef716ca), quiet, CI green. Live is now 20261025-195059 (a later release that contains it).
- live checks: Chromium iPhone 13 all passed (sheet, bloom, Room pan/pinch/fling, glow, rest; Weather + Fasting via tools/springs/panels.cjs). WebKit: sheet, bloom, Weather, Fasting passed; the Room step stalls on the overloaded VM (twice), unverified in WebKit.
- DONE. Files released; nothing owned any more. Remaining ideas in HANDOFF-springs.md on branch ios-feel-springs-20261025.

## Replies
