Branch and last commit: liquid-fill-perf @ 6c997f3deee7445325352491f88c20250d3533f1 (pushed; based on origin/main badebb0, build 20261018-195906)

Done (and how it was checked):
- Measured the suspected liquid-fill slowdown. The handoff blamed layout reads in living-bubbles.js: getBoundingClientRect per bubble every frame, plus getComputedStyle up each bubble's parents every 180 ms. The measurement does not back that up.
- Tool: tests/ui-liquid-frame-cost-live.cjs. It serves a copy of living-bubbles.js with timers around frame() and refreshVis(); the repo file is unchanged.
- Results at Home with 15 bubbles and 3 liquids, 10 s windows (frame() includes its refreshVis pass):
  - Chromium 390x844: 0.30% of wall time, p50 0.5 ms per frame
  - WebKit iPhone 13: 0.16%, p50 about 1 ms (1 ms timer resolution)
  - Chromium iPad 820x1180: 0.09%
  - WebKit iPad 820x1180: 0.12%
  - Earlier runs: 0.06% to 0.4%
- Chromium layout (CDP): about one layout per drawn frame whether the living-bubbles frame callback runs or is switched off (6.4 per second off, 5.9 and 4.6 per second on). Layout time is 0.2 to 0.9 ms per second in total. So the per-frame reads add no layouts.
- Render cost, alternating 3 s windows on one page: hiding all 15 membranes took WebKit iPhone 13 renderer.render() from 69 ms to 51 ms per frame (one run, under load). Hiding only the liquid meshes took it from 38 ms to 37 ms. Chromium's JS-side render() is 1.5 to 3.4 ms because its GL runs in the GPU process.
- The VM draws at 1 to 7 fps whatever living-bubbles does. The cause is software WebGL and raster, with load average 13 to 20 on 8 cores because other worker tasks run browsers at the same time. That matches the handoff's "about 1.5 fps", and it says nothing about a physical iPhone.
- Reduced motion: body-world-3d.js falls back to 2D by design, so living-bubbles runs 0 frames and rAF runs at 60 per second.
- Suite 1378/1378 (floor 1378). release-check OK. git diff --check clean. Zero page errors in every view.

Not done:
- No change to living-bubbles.js. The suspected bottleneck wasn't present, so a speculative patch would only risk the visuals.
- Nothing tested on a physical iPhone. Heat and memory can't be seen on the VM.

Next exact step:
- Integrator: nothing to release for the user. The fixture can ride along with any later release; it's not a .test file, so the suite count doesn't change.
- If Home still lags on the real phone, the next lead is GPU fill: 15 transparent full-shader membranes drawn with depthTest off (about 18 ms of software render in one WebKit run), plus the renderer's pixel ratio. That's a visual-quality trade-off and needs Emmanuel's on-device feedback first. Also see the open WebKit soak gap in SUCCESSOR_HANDOFF.md section 3.

Traps found:
- Absolute fps on this VM swings 2 to 3 times between runs because of the shared CPU. Compare the share of time per module, not fps.
- WebKit performance.now() has 1 ms resolution, so p50 shows as 0 or 1.
- refreshVis max can reach about 130 ms right after load. That's a cold style recalc, not steady state: steady-state max is 1 to 13 ms.
- With --reduce there is no 3D world. That's expected, not a failure.
