# COORD: Settings single tap opens the full page

Parent: /home/sprite/COORD-ui-rollout.md (SETTINGS worker)
Task: "LOWiSPIKE Settings: single-tap full page" (started 18 Oct 2026 21:23 CEST)
Branch: ui-settings-page
Worktree: /home/sprite/wt-ui-settings-page (from origin/main badebb0, build 20261018-195906)
Status: READY FOR INTEGRATION (ownership of home-settings-sleep-v2.js/.css released to the integrator)

## Brief (five lines)
- Goal (one behavior): a single tap on the Home Settings bubble opens one full Settings page holding Me, Look & sound, Account, Menu bar and the More entries, instead of blooming chips.
- What the user saw: tapping Settings fans out chips (Me, Look & sound, Account, Menu bar, More); More then opens a second panel.
- Done when: tests/ui-settings-page.test.cjs passes, whole suite >= 1378 and no failures, Chromium + WebKit (iPhone 13 390x844, iPad) show the page on tap with every entry, close (x, Escape, tap again) returns to Home.
- Files I may edit: home-settings-sleep-v2.js, home-settings-sleep-v2.css, new tests/ui-settings-*.cjs.
- Out of scope: double tap ring, hold secondary page, Sleep, index.html / loaders / sw.js / version.json / apple-ui.js, other workers' files, release, push to main.

## Owns
- home-settings-sleep-v2.js, home-settings-sleep-v2.css
- tests/ui-settings-*.cjs

## Will not touch
index.html, apple-ui.js, sw.js, version.json, release scripts, docs, home-blooms-v2.*, living-bubbles.js, scan-*, home-orbit-v2.*, existing tests.

## Result
- Branch ui-settings-page @ 5c6e9d070840e38345262bd90446f3ab5bd43a4e (rebased on origin/main b3d5f62), pushed. Not live.
- Files: home-settings-sleep-v2.js, home-settings-sleep-v2.css, tests/ui-settings-page.test.cjs (new), tests/ui-settings-page-live.cjs (new).
- Suite 1389/1389 (main 1384). Live script PASS: Chromium 390x844; WebKit iPhone 13, 390x844, iPad portrait (post-rebase); SE 320x568, iPad landscape (pre-rebase).
- Loader needs: none. index.html already loads home-settings-sleep-v2.js/.css; no new files to load, no new strings.
- Integrator to-dos: update the Settings steps in home-settings-sleep-v2-live.cjs, home-orbit-v2-live.cjs and everything-else-trim-live.cjs (they encode the old chip bloom); What's New EN/DE/ES; release.
- Pre-existing bug found (separate task): WebKit iPhone SE + reduced motion -> bw3-off fallback hides Scan/Sleep/Settings bubbles.
- Full details: /home/sprite/wt-ui-settings-page/HANDOFF.md (copy at /home/sprite/HANDOFF-ui-settings-page.md)

## Replies
