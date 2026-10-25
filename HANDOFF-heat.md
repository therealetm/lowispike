# Heat / battery pass: released (Oct 25 2026)

Live: build 20261025-160619 (quiet release: no push, no Community post, no What's New; `loud` stays 20261024-213102). CI "Release check and tests" green, 3371/3371 tests.

## What shipped
- power-saver.js (window.LowiPower): active / calm (3 s) / rest (30 s) / deep (90 s). World frame gap: Home 30/15/8 fps, pages 20/10/5. Any touch = active on the very next frame.
- Automatic battery saver: Low Power Mode guess (slow frames), hot device, low battery, Data Saver. Throttles sooner, DPR cap 1.5. `localStorage['lowi.power']` = normal|saver forces a mode.
- BUSY html classes = motion only (flights, warps, gx-in/out/hold, mm-cam, mp-on, lt-on). wh-cosmos / wh-away / wh-leave are places, not motion (with them the world never slowed in Community).
- body-world-3d.js backFaded(): in steady Community, when the Room CSS has faded the world canvas to opacity 0, the world is not drawn at all.
- Unseen CSS loops paused (hidden Today sheet etc.), plant breathing + badge glow pause after 30 s idle.
- Sound kit (AudioContext) suspends 6 s after the last sound, wakes on pointerdown (own listener; the sound-stays-on test line is unchanged).
- Room galaxy (community-galaxy.js) reads LowiPower.interval(true) for its own drawing.

## Measured (VM, simulated iPhone 13, STUBGL=1 = world draw counted but skipped so the VM's software GPU is not the bottleneck)
Chromium A/B, quiet VM (load 1-3), tools/heat/heat-probe.cjs via /tmp/heat-ab.sh:
- Home ~20 s quiet: world draws 30/s -> 15/s, main busy 10.1% -> 5.8%, page frames 60 -> 20/s
- Home ~100 s quiet: 30/s -> 7.5/s, busy 9.4% -> 6.6%
- Community Room: world 18/s -> 5.6/s (30 s) -> 3.8/s (90 s), busy 14.1% -> 9.5% / 12.8% -> 8.9%; running CSS animations 23 -> 6; audio running -> suspended
- Touch: full speed (37 -> 39 world/s, 60 fps)
WebKit on this VM is saturated by software compositing (~13 fps even with draws skipped), so its before/after is not meaningful beyond: touch 8.4 -> 17.6 world/s, animations 24 -> 6 in Community, audio suspended.
Without STUBGL the VM's software GPU caps the world at ~4-8 frames/s both before and after, so busy % does not move there.

## Live check (tools/heat/heat-live-check.cjs, stand-in Supabase, nothing written)
- Chromium: touching 59.9 world/s, 9% busy; 103 s quiet = deep, 7.5/s, 3.4% busy; one touch = active, first frame 16.5 ms, 60 frames next second. ALL PASS
- WebKit (wkrun.sh): touching 14.2/s; 103 s quiet = deep, 6.2/s; one touch = active, first frame 12 ms, 19 frames next second. ALL PASS

## Not done / next
- Real iPhone heat: only Emmanuel can confirm.
- Ideas not built: lower world DPR on Home after long idle even outside saver; pause the world fully when the page is hidden behind a full-screen sheet.
