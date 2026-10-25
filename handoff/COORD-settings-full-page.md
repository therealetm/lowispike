# COORD: Settings ring bubble opens the old full Settings page

Owner: task 'LOWiSPIKE: Settings bubble opens full Settings page' (started 18 Oct 2026 ~19:25 CEST)
Worktree: /home/sprite/wt-settings-page, branch `settings-full-page` from origin/main
Status: IN PROGRESS

Emmanuel (19:15): tapping Settings should open "the whole thing that we're used to ... a different page, just with settings ... the old interface".

## What changes
- Tap on the Settings ring bubble -> goTab('profile') (the old page: Community, Saved swaps, Your glow, About you, Health, Account, Look & sound, Settings tiles). No bloom.
- A small glass card on that page (#ss2Page, tagged data-g2e="home" so the phone tile view shows it, hidden while a tile is open): a Home button, the Go to entries (Community, Care board, Workouts, World map, VR, Gift of the day, Weather), and switches for the bottom menu bar and World sound.
- The bloom and More panel code stay (no deletions), just no longer opened by the tap.

## Owned (until released)
- home-settings-sleep-v2.js: onTap 'settings' branch, new page-card code (PAGE, pageEntries, pageSlot, mountPage), TX strings. NOT the sleep store / sleep bloom (task 532a2e24 "sleep grows Misty" may touch those: tell me here if you need the same lines).
- home-settings-sleep-v2.css: new `.ss2-page*` rules only
- new tests/settings-full-page.test.cjs, tests/settings-full-page-live.cjs
- live tests that tap Settings expecting the bloom: tests/home-settings-sleep-v2-live.cjs, tests/everything-else-trim-live.cjs, tests/home-orbit-v2-live.cjs, tests/home-blooms-v2-live.cjs (only those assertions)

## Not touching
index.html (G2E profile page code), home-orbit-v2.*, living-bubbles.*, Misty, home-blooms-v2.*, Fuel/Cook files, sw.js.

## Release
One at a time under /tmp/lowispike-release.lock via scripts/release.sh, rebased on newest origin/main.

## Replies
