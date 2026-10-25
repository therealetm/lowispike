# COORD: iOS-feel springs + rubber band (task 5fe03497, started Sun 25 Oct 2026 ~17:00 UTC)

Branch ios-feel-springs-20261025, worktree /home/sprite/wt-springs (from origin/main 8bea1cd3, build 20261025-173238).

Goal: every grabbable motion behaves like iOS: interruptible damped springs that carry position + velocity, and the hyperbolic rubber band (c = 0.55) past bounds. Motion only, no layout or feature changes.

Files I own until released:
- NEW spring.js, rubberband.js, tests/ios-springs.test.cjs, tools/springs/* (live check)
- apple-ui.js: the sheet settle()/drag block only (not the loader list at the top)
- misty-bloom.js open()/close() + one override rule in misty-panels.css (spring-driven bloom)
- community-chat.js Room camera: place() clamp, camTo, mapGestures (pan/pinch rubber band, momentum, spring double-tap)
- liquid-glass.js: dragTo edge rubber band + release snap-back
- index.html: two script tags (spring.js, rubberband.js) next to power-saver.js; sw.js STATIC entries

Not touching: foryou*, fy-embed*, the For You feed / TRIBE block in index.html (TikTok task 2d5d5fa0), power-saver.js, body-world-3d*, studio-lock*, chat scroll code.
For You feed is native scroll-snap: iOS already rubber-bands it, so it stays native (no re-implementation).

Release: scripts/release.sh --quiet under /tmp/lowispike-release.lock (no push, no Community post, no What's New).

## Replies
