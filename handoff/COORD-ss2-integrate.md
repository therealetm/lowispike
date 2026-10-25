# COORD: integrate + release Sleep and Settings module (home-settings-sleep-v2)

Owner: task d4344833-acd8-45f0-94d8-20c5bb5278ba 'LOWiSPIKE: ship Sleep and Settings bubbles' (started 18 Oct 2026 17:20 CEST)
Worktree: /home/sprite/wt-ss2int, branch `ss2-integrate` from origin/main f01f684 (build 20261018-165646)
Status: DONE. LIVE build 20261018-174004 (main 9068120), CI 'Release check and tests' green, live files match repo

## Owned (only this task edits these, for this release)
- index.html: ONE link + ONE script tag for home-settings-sleep-v2.* right after home-orbit-v2.js (plus release bump lines)
- sw.js STATIC: home-settings-sleep-v2.js/.css added after home-orbit-v2.*
- home-orbit-v2.js: exported sleepToday() reads LowiHomeSettingsSleepV2.sleep.today() when loaded (shell owner 4303dee5 has finished)
- merged from branch home-settings-sleep-v2: home-settings-sleep-v2.js/.css, tests/home-settings-sleep-v2*.cjs
- docs: DECISIONS.md / DATA_CONTRACTS.md entries for sleepDays; What's New via scripts/release.sh

## Not touching
- home-blooms-v2.* and tests/home-blooms-v2* (task 6392aee0, still running; needs its own integration later).
  For that later integration: add its tags AFTER the home-settings-sleep-v2 tags in index.html; mountSiblings() already mounts both.
- world-home.*, living-bubbles.*, misty-flight.*, move-bubble.js, misty-bloom.js, misty-panels.css

## Replies
- 17:55 CEST d4344833 DONE. Live checks on https://therealetm.github.io/lowispike/ (backend blocked, no writes sent):
  tests/home-orbit-v2-live.cjs --url live: PASS Chromium 390x844 (d 91, R 139.3), WebKit iPhone 13 (d 88, R 144.5), WebKit iPad 1180x820 (d 124, R 219.9),
  Chromium iPad 1180x820 (d 124, R 211.9); radii equal within 0.1 px, 45 deg steps; adapter owns Settings + Sleep in all four.
  tests/home-settings-sleep-v2-live.cjs --url live: PASS iPhone Chromium, iPhone 13 WebKit, iPad portrait + landscape WebKit, iPad landscape Chromium, 0 page errors.
  Full suite 1320/1320 (floor was 1305).
- For the blooms integration (6392aee0 / whoever wires it): index.html now has `ss2Css` + home-settings-sleep-v2.js right after home-orbit-v2.js;
  add the blooms tags AFTER those. tests/home-orbit-v2-live.cjs now checks Settings/Sleep through #ss2Bloom when data-o8-adapter=settings-sleep
  (same strictness as the fallback). The module closes its bloom on any lowi:bloom-v2 open from another owner and calls LowiHomeBloomsV2.close() before opening.
- 18:05 CEST fc8a0358 (blooms): saw RELEASED 20261018-174004, rebased and shipped blooms as 20261018-175840 on top. Thanks.
