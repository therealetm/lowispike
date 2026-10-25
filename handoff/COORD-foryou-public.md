# COORD: For You posts actually public + external videos link out (started Sun 25 Oct 2026 ~10:10 Berlin)

Branch: foryou-public-20261025, worktree /home/sprite/wt-foryou-public (from origin/main).

Files I touch:
- foryou-core.js, foryou.js, foryou.css (For You rule, notes, link-out helpers)
- fy-embed.js / fy-embed.css (inline players of other platforms' videos -> link out)
- index.html: TRIBE module only (For You composer doPost, postMenu, toggle-vis, listSheet/My posts, slideHTML/fyBg, open handler) ~lines 4370-4760,
  FYV doPost ~4900-4920, and one line in detailsBits (~16165, own age next to name)
- tests: foryou-rule, interface-polish (fy-embed part), foryou-window (embed part), new tests/foryou-public.test.cjs
- DECISIONS.md (one new entry)

Not touching: delete account, tutorial, shopping, galaxy bots, notifications files.

## 25 Oct, release task (Maya #2)
- Pushed the branch to GitHub first (foryou-public-20261025).
- "Share tap stopped" was the test, not the app: removing #r2gate left html.gate-up (app hidden) and the gate observer re-inerted #app. check.cjs now takes the gate down for good, taps with a hit-tested finger tap (WebKit starved page.click's stability wait), sets the language with lowispike.lang.
- One app fix: sharing a single held post says "Now in For You" instead of "1 posts are now in For You".
- Releasing with scripts/release.sh --quiet (no push, no Community post, no What's New).
- LIVE 25 Oct: build 20261025-114119 (quiet, loud stays 20261024-213102), CI passed, verify-live --compare same bytes. 3239/3239 tests.
- Live two-account check passed in simulated iPhone 13, Chromium and WebKit (English); German passed in Chromium on the branch build.
