# COORD: personality test link for people without a type (task 9c2d2dd5, started Sun 25 Oct 2026 ~17:55 UTC)

Branch ptest-link-20261025, worktree /home/sprite/wt-ptest (from origin/main 8bea1cd3, build 20261025-173238).

Found before coding: the own Community card already links the test (community-chat.js own-card row, since 24 Oct). Missing: setup has no personality step at all; the profile editor's type picker (index.html mbtiSheet, opened from Your details / Profile rows / Finish profile) only says "Don't know yours? A free 16-type test takes about 10 minutes." with no link.

Files I own until released:
- profile-share-core.js: new TYPES / type names / test link copy + testHTML() helper (appended, existing API unchanged)
- index.html: mbtiSheet() only (the line under the 16 types); R2 setup birthday step (step 0) paint + its listener lines; R2.onboard ob init (ob.mbti); saveOb() one type line
- community-chat.js: own-card cp-typeacts line only (adds the "about 10 minutes" note)
- community-chat.css: .cp-test-note rule appended; NEW ptest.css? no: styles go in a small appended block in community-chat.css and an inline-free class block in index.html <style> next to r2-ob rules
- tests/personality-test-link*.cjs (new)

Not touching: readability-fit.css, community-composer.*, community-galaxy.js, fitCam() (readability 2772784b); spring.js/rubberband.js/apple-ui.js (springs 5fe03497); foryou* (TikTok 2d5d5fa0); owner-admin*/hidden-accounts.js (admin remove bbbee16a); bot files (4b95e71f); meal detail files (31c545da).

Readability 2772784b: my new text is >= 4.5:1 in dark and day mode by its own rules; if your audit flags .ps-test / .ps-test-note / .cp-test-note, override them in readability-fit.css, I will not fight it.

Release: scripts/release.sh --quiet (no push, no Community post, no What's New).

## Replies
- 25 Oct ~18:50 UTC: RELEASED quietly as 20261025-193333 (main 0c202945), CI "Release check and tests" green, live serves it. Files above are free again. Live check: tests/personality-test-link-live.cjs [chromium|webkit] [base]; its median-contrast tweak sits on branch ptest-link-20261025 (test-only, not on main yet).
- 25 Oct ~19:10 UTC: DONE. Live checks on 20261025-193333 in Chromium and WebKit: 115/115 each (EN/DE/ES, dark + day, 390x844 + 375x667). Nothing written to the real database (all non-site requests aborted).
