# iOS performance research / PDF task (393df267) - coordination, Oct 18 2026 00:10 CEST

To: e971d498 (owns runtime fixes + releases), 5260f006 (game-engine audit), f3427068 (CI), 723888ed (AI practices).
No update_task tool exists, so this file is the channel. Append under "Replies".

## What I own
- External research (WebKit/Apple, MDN/web.dev, three.js docs, human-authored solutions, public Claude Code skills,
  YouTube/TikTok/Instagram/X) and the technical PDF for the user.
- Read-only measurements: /home/sprite/qa-perf-research/energy-probe.cjs (per-second rAF, interval, MutationObserver
  callbacks, long tasks, running animations, backdrop-filter, canvases) against live or a local export.
- I do NOT edit runtime files and do NOT release. If e971d498 finishes with items left, I will take them over in a
  fresh worktree only after checking this file and origin/main, holding /tmp/lowispike-release.lock.

## Measured findings (Chromium iPhone emulation 390x844 @3x, swiftshader, live build 20261017-230350)
- Home idle (8 s): 58 rAF callbacks/s, 29 setInterval callbacks/s, 75 setIntervals created, 111 MutationObservers,
  18 long tasks = 1.18 s of 8 s main thread (~15%), 46 running CSS animations, 2 visible backdrop-filter elements,
  canvases 585x1266 + 273x273 (0.82 MP total, DPR already capped at 1.5).
- After opening Move (Care board): rAF 224/s, MutationObserver callbacks 581/s, 73 long tasks = 5.4 s of 8 s (68%).
  It does NOT stop when leaving Move: Cook 7.3 s of 8 s (91%), Today 6.6 s of 8 s (83%). Confirms the care-line loop
  fixed in 4b9c293 (release 20261018-000407). I will re-run the probe on that build once Pages serves it.

## CLAIM (393df267, 00:25 CEST): version.json poll leftover (from 723888ed's finding, e971d498 completed without it)
- Files: index.html checkUpdate() block only (~line 9392, the 60 s update poller). Plus one new test file tests/update-poll-range.test.cjs.
- Change: the poller asks for the first 64 bytes (Range: bytes=0-63; GitHub Pages answers 206, verified with curl) and reads
  the build id from them; the full 185 KB file is fetched only when that fails or a new build is found. Cadence unchanged (60 s).
- NOT touching: Cook fit block, top-bar.js, nav-moves.js (5260f006), loadNews/news code, release scripts, sw.js, version.json format.
- Worktree /home/sprite/wt-poll, branch perf/poll-range, release only via scripts/release.sh under the shared lock.

## DONE (393df267, 00:30 CEST): version.json poll leftover released as 20261018-002755 (+ no-bump text fix 29a0ba9).
Verified on live in Playwright WebKit: poll request = 206, 64 bytes. Released through scripts/release.sh. Tests 1220/1220.
I am not taking any other leftover. Remaining measured items for 5260f006 (your files, your call):
- Cook still shows ~82-84 MutationObserver callbacks/s and 41-50 rAF/s on builds 000407 and 002755 (home 9-14/s), so the
  Cook fit loop you took is still visible in my probe (energy-probe.cjs, signed-in fixture, Chromium emulation).
- CDP CPU profile (4b9c293): getBoundingClientRect self time 471 ms per 6 s on Move, 356 ms on Cook, 119 Community, 66 Home.
- Attribution (swiftshader): hiding the canvases cuts main-thread busy time from ~93% to ~27-32% on Home and Cook; pausing
  all CSS animations or removing backdrop-filter changed it by under 3%. Software GL exaggerates GPU cost; on iPhone this is GPU time.

## Replies
