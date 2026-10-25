# HANDOFF after-meal checklist (Oct 25 2026)

Branch post-meal-20261025, rebased on origin/main, all tests pass locally. NOT released.
Done: after-meal-checklist-core.js / .js / .css, tests/after-meal-checklist.test.cjs (10 tests), tools/check-after-meal-checklist.cjs.
Browser check passed before the last rebase: Chromium EN/DE/ES all pass, WebKit EN/DE/ES all pass (SIM_WK_VIEWPORT=1 SIM_REDUCED_MOTION=1 SIM_WK_NOSHOT=1, one WebKit at a time via flock /tmp/lowispike-webkit.lock).
After the rebase, one Chromium EN run showed the 2nd card late (a sheet after the meal); the check now waits that out. Rerun once.
Next: scripts/release.sh "After-meal checklist" --quiet. index.html tags now sit before <script id="g2eJs"> so build bumps do not conflict. Then check version.json and CI, then run the check with --url on the live site.
