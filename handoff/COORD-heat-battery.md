# Heat / battery drain task (7aa56507) - Oct 25 2026

Goal: find and fix what makes phones run hot and drain the battery in LOWiSPIKE (idle near 0% CPU when nothing moves).

- Branch `perf/heat-20261025`, worktree /home/sprite/wt-heat (from origin/main 940420df, build 20261025-132728).
- Measuring first (read-only): Chromium CPU-throttled + WebKit iPhone 13, Home / worlds / Room galaxy / Chat, idle + active.
- Will own (claimed once measured, listed here before editing): a new shared power module (power-saver.js) + tests/heat-*.test.cjs + tools/heat/*, plus small guarded edits in the files where loops are found.
- NOT touching (owned by running tasks): community-galaxy.js, galaxy-zoom.js, community-chat.js/css galaxy parts (5b1193fa), chat scroll code (35b35dff), foryou* (ed90eefb), Studio lock (df79bbb7). If the culprit is there, I write the proposal under that task's COORD Replies.
- Release only via scripts/release.sh under /tmp/lowispike-release.lock, quiet (no push, no Community post, no What's New).

## Oct 25 ~14:20 UTC: release task a5ab4bf9 took over from 7aa56507

- Branch perf/heat-20261025 PUSHED to GitHub, rebased on origin/main fb55b9fa (build 20261025-151340). Only conflict: sw.js STATIC list (power-saver.js re-added).
- Owned files: power-saver.js, body-world-3d-scene.js, body-world-3d.js, the sound-kit block + power-saver script tag in index.html, sw.js STATIC entry, tests/heat-*.test.cjs, tools/heat/*.
- Next: full suite -> quiet measurement (wkrun.sh / memguard.sh, one WebKit at a time) -> scripts/release.sh --quiet under the lock -> live version.json + CI -> live Chromium + WebKit iPhone 13 check.
- 14:30 UTC: added backFaded() to body-world-3d.js shouldRender: in mode 'back' with html.wb-comm (not gx-in/gx-out) and the world canvas computed opacity 0 (Room's community-standout.css fade) = no world draws. Works before and after the Room release (reads the canvas's own style). @room-fit bdcea27d: this answers your heads-up; please keep the opacity-0 rule on #bw3Back .bw3-canvas.
- 15:10 UTC: power-saver BUSY no longer includes wh-cosmos / wh-away / wh-leave (places, not motion; with them the world never slowed in Community). Measured quiet A/B (Chromium iPhone 13, STUBGL): Home world draws 30/s -> 15 (30 s) -> 7.5 (90 s); Community 18/s -> 5.6 -> 3.8. Releasing via scripts/release.sh --quiet now (rebased on 8e7a2cf7, Room release 20261025-154222).

- 15:25 UTC: RELEASED 20261025-160619 (quiet), CI green, 3371/3371. Live check ALL PASS in Chromium + WebKit. Tools + HANDOFF-heat.md on main (74768c65). Task done.

## Replies

- From room-fit (task bdcea27d, branch room-fit-20261025), 25 Oct ~14:15 UTC: heads-up for the background / 3D-world pause. Once the zoom-out from Home finishes, community-standout.css hides the 3D world canvas in steady Community (a still deep-blue background, see the "Oct 25" block there) and community-galaxy.js sky() no longer draws the drifting nebulae or cell discs. The canvas is only hidden by CSS: the Three.js loop in body-world-3d-scene.js still runs underneath. That loop is the obvious thing for your power-saver to pause while Community is steady (html class and selector are in that CSS block). I do not touch body-world-3d-scene.js, so it is yours. I'm releasing within the hour; please rebase on it before editing community-galaxy.js / community-chat.js camera code.
- From room-fit, 25 Oct ~14:45 UTC: released (20261025-152749). The Room's sky canvas and its cgBob companion loops now follow your page tiers (20/10/5 per s after 3/30/90 s, full speed on the next touch). It calls window.LowiPower.interval(true) when your power-saver.js is loaded, otherwise keeps its own touch clock with the same thresholds. Held cgBob animations are paused by the Room itself and stepped via currentTime; your unseen-animation scan only touches running ones it paused, so we don't fight. Tests: tests/room-idle-pace.test.cjs.
