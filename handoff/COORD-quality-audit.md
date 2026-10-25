# COORD: quality audit (task 4497d8e6-c921-4dba-b90a-c04d5c6300e0)

Branch `quality-audit`, worktree `/home/sprite/wt-audit`, from origin/main 69bc80e.

## Owns (new files only)
- `tools/audit/` (isolated audit harness: Supabase and every non-same-origin request blocked, local fixtures only)
- new `tests/audit-*.test.cjs` / `tests/audit-*-live.cjs` if a regression test is added

## Will NOT touch
index.html, nav-moves.js, top-bar.js, spirit.js, world-home.js (cc6cad4b), `.github/` and `scripts/` (b98e4217),
care-board-core.js and index ranked() (29c228f1), Explore camera/companion (2d2c1408), store-picks/shop-data (b3479d1f).
Any runtime fix will be claimed here first under a CLAIM line before editing.

## Safety
No writes to production Supabase: the harness aborts every request to *.supabase.co and any host other than the
local static server / live Pages assets. No live profiles, messages or accounts.

## Replies

## CLAIM (01:58, 4497d8e6): same-value write guards only, no behaviour change
world-mood.js apply() (lines ~22-26), herb-shop.js ensureGift --hs-gl line (~139), daily-ritual.js --dr-p/won lines (~352-353),
living-home.js mount()/render() aria-label, lv-on, --lv-day, data-lv-period (~162-175). Each write happens only when the value differs.
Not touching world-home.js:975 (--wh-tb, 1.5/s same-value on <html>, also while hidden) or spirit.js:1702 (--sp-sign) or
index.html:2556 (aria-label) : those are cc6cad4b's files, listed below as findings for that owner.

## FINDINGS for other owners (4497d8e6, 02:15)
Measured with tools/audit/same-writes.cjs (Chromium 390x844, Supabase blocked) on main 69bc80e..e6b75ba:
- cc6cad4b (index.html / world-home.js / spirit.js): remaining same-value writers after my guards:
  world-home.js:975 `--wh-tb` on <html> 1.1-1.5/s in EVERY scenario incl. hidden (wakes the 4 <html> style observers
  index.html ~18309/18520/18653/18833); spirit.js:1702 `--sp-sign` 0.5-2.2/s (from observer at spirit.js:2006);
  index.html:2556 aria-label 3.3/s during Care board toggles. Same fix pattern: compare before write.
- community-chat.js:448 `if(!W.LowiCompanionCore&&mateTries<20){setTimeout(refresh,1500)}` keeps repainting Community
  (--nk at :290, text at :427/:458, ~1.2/s) for up to 30 s after you LEAVE Community. Bounded, low priority. Not claimed.
- 29c228f1 / hide-test-accounts: index.html boot() ~9149 calls sb.auth.signInAnonymously() on EVERY visit with no
  session, so every fresh browser (testers, crawlers, any probe that does not abort supabase) creates a real auth user.
  In my isolated runs it tried POST /auth/v1/signup 7 times in 6 laps (aborted). Root cause of test-account sprawl.
- Leak check (tools/audit/nav-audit.cjs, 6 laps Home>Move>Care week/month x4>Cook>Community zoom x6>hide/resume):
  nodes, heap (~stable), live intervals, live observers, canvases: flat. +3 canvas 2D contexts per lap (Community:
  community-energy.js:132, community-galaxy.js:114, galaxy-zoom.js:108 make a new canvas per visit; old ones removed
  without width=0). Suspected, not proven, WebKit canvas-memory risk on iPhone. Not claimed.

## RELEASED (4497d8e6): build 20261018-014246, commit ba9efc1 on main via scripts/release.sh (ci/ branch, CI green, Pages deploy green). Live == repo for index.html, sw.js, version.json, apple-ui.js, world-mood.js, herb-shop.js, daily-ritual.js, living-home.js. Tests 1250/1250. CLAIM released.
