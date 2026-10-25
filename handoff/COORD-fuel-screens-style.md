# COORD: one style for the Fuel screens + two-step Swap (task: LOWiSPIKE fuel screens style)

Started 18:32 CEST Oct 18. Worktree /home/sprite/wt-fuel-style, branch fuel-screens-style.

## Owned (only these app files change)
- NEW fuel-screens.css, fuel-screens.js (shared Fuel panel family: glass panel, one close top-right, docks beside Misty on iPad/desktop, hides the bottom-centre #whX while a Fuel panel is open)
- index.html: Craving SOS block only (`const SOS`, `openSOS`, `sosTimer`, the `sos*` cases in the delegated click switch), the F2 "What did you eat?" module strings/markup (later/today/skipShare labels, per-row XP pills), and one <link>/<script> pair for fuel-screens at the end (no reordering of existing tags)
- spirit.js: showPick() / quick mealForm() pass an extra class to showSheet (no logic change)
- store-picks.js/.css: class hook + close placement (second release, if any)
- sw.js: precache the two new files
- tests/fuel-screens*.test.cjs, tests/fuel-screens-live.cjs (new); tests/home-blooms-v2-live.cjs swap check only if the contract changes (it should not: #sos still gets .open)
- ADDED 19:30 CEST on Emmanuel's direct asks: home-blooms-v2.js Fuel action list only (labels, order, new 'log' orb + its icon, Fuel no longer has a hold; Move hold untouched) and store-picks.js header/aria-label text. Tests: tests/home-blooms-v2.test.cjs label list ('Shop'), tests/home-blooms-v2-live.cjs Fuel orbs + hold case.

## Not touching
- `.wh-cell-fill`, bubble glass tokens (task 505a561b) - only READ var(--wh-glass-*)
- home-orbit-v2.*, home-blooms-v2.* (except the Fuel action list above), home-settings-sleep-v2.*, world-home.js, misty-bloom.js, Misty rendering, bubble shadows

## Release
One at a time under /tmp/lowispike-release.lock via scripts/release.sh, rebased on newest origin/main.

## Replies

- ~20:00 CEST task 'LOWiSPIKE: Fuel screens, fix checks + commit': branch fuel-screens-style COMMITTED + PUSHED (head 9c2ebec + this HANDOFF commit). NOT released.
  - Highest proof rung: local Playwright browser tests (Chromium + WebKit) against the branch served from the VM. Not live, no real device.
  - fuel-screens-live.cjs: PASS in all 6 views (iphone13 chromium/webkit 82 checks each; ipad portrait/landscape chromium/webkit 87 each). Every earlier FAIL was a probe problem (mid-fade probing, hidden #sos close, uppercase innerText, first-run #g1Tour on top), except one real robustness fix: fuel-screens.js re-checks every 400 ms while a panel is open so the Home X always comes back.
  - Full suite: 1352/1352 pass (main had 1335). Nothing deleted or loosened.
  - Emmanuel's asks folded in (test-first): Fuel bloom Snack -> Shop; store-picks header -> Low-Spike Finds; Log meal is its own Fuel orb, hold-Fuel removed.
  - fuel-screens.css/.js now load right after home-blooms-v2.js (tests pin cook-shop.css + sym-home.js as the tail).
  - Shop (.stp-card) left OUT of the shared style this release.
  - HEADS-UP for rebase: task f8bc11e4 (COORD-cook-home-panel.md) edits the Fuel 'cook' run() line in home-blooms-v2.js; we edit neighbouring Fuel lines. Keep their run(), keep our labels/order/log orb.
  - Left: before/after screenshots, What's New EN/DE/ES, rebase on newest origin/main, release via scripts/release.sh under /tmp/lowispike-release.lock, live version.json + CI + live re-run of fuel-screens-live and home-blooms-v2-live.
