# Shopping frequency bubbles + own onboarding entries (task e8ab3f38-aa3e-436e-ac0e-0351c15171fe, Sun 25 Oct 2026)

Status: PART 1 LIVE, PART 2 BUILT NOT RELEASED (task ran out of budget)

- Part 1 (shopping bubbles): commit a446b86a on main, quiet release, build 20261025-094915. Proof: live version.json, GitHub check passed, live Playwright check at 390x844 Chromium + WebKit in en/de/es all ok (qa-shopfreq.cjs).
- Part 2 (own entries): UNCOMMITTED in /home/sprite/wt-shopfreq (own-entries.js new, index.html, your-details.js, sw.js, tests/onboarding-own-entries-1025.test.cjs). All 3,216 tests pass. Local browser check (qa-ownentries.cjs): Chromium en/de/es all ok; WebKit timed out at the first tap in the harness (element visible at the tap point, 42 animations running; looks like a harness stability wait, not confirmed). Next: fix or confirm the WebKit run, commit, scripts/release.sh --quiet, verify live.

- Branch: shop-freq-own-entries-20261025 (from origin/main 925c08c6)
- Worktree: /home/sprite/wt-shopfreq
- Two releases, one after the other: (1) shopping frequency bubbles, (2) own entries at "I want" and "Anything we should look out for?".

Files I own:
- shop-plan-core.js, shop-plan.js, shop-plan.css
- tests/shop-frequency-1025.test.cjs, tests/onboarding-own-entries-1025.test.cjs (new), and the shopping asserts in tests/onboarding-current.test.cjs
- index.html: ONLY the onboarding "About you" step (paintOb step 2, goalList/condBlock and their click handlers), the Edit profile goals/conditions block, and new rows in the translation table for these strings
- ONBOARDING.md (shopping + own-entry lines only)

Files I will NOT touch: tutorial files (tutorial-auto.js and friends), anything for Delete my account (supabase/functions/*, the delete dialog), grocery-hunt.js (it only reads LowiShopPlan; `every` stays filled so it keeps working).

Data: `lowispike.shopplan.v1` gains `freq` ('1'|'2'|'3'|'more'|'varies'); `every` (days) is kept and derived so grocery-hunt and dueState keep working. Old saves are migrated on read.

## Replies

## Oct 25, 12:01 UTC+1: own entries LIVE in 20261025-120116 (task "finish own onboarding entries + merge free-text line")
- Released quietly (scripts/release.sh --quiet; no pop-up, no What's New, no push). CI "Release check and tests" passed on 30c8bd31; main = 30c8bd31. Tests 3255/3255.
- Merge done (Emmanuel's call, made for him): the separate "Noch etwas? Hier eintippen" line is gone. Old S.health.condNote text is folded into own condition chips (own-entries.js fold/splitNote: split at , ; / + · and " - ", 50/100 stays whole, long parts wrapped at a word). Only parts that do not fit in 6 chips stay in condNote and show in Your details.
- WebKit "first tap timeout + VM out of memory" = test/VM problem, not the feature. Proof: the build BEFORE own entries (a446b86a) stalls and runs away the same way. Causes: (1) several tasks run WebKit at once, each WPEWebProcess 1-1.8 GB on an 8 GB VM -> VM reboots (happened twice today); (2) headless WebKit renders this app at ~0 frames/s on the loaded VM (blank page 57 fps, app 0-1), so Playwright actionability waits, screenshots and scrollIntoViewIfNeeded hang, and a pending screenshot blocks every later call.
- Harness options added (tools/sim/harness.cjs, all off by default): SIM_WK_VIEWPORT=1 (390x844 in WebKit), SIM_WK_NOSHOT=1 (skip WebKit screenshots), SIM_REDUCED_MOTION=1, SIM_DPR=n. Screenshots now time out after 20 s.
- Guards for everyone: /home/sprite/memguard.sh MIN_AVAIL_MB LOG -- cmd (kills only its own tree when the VM gets low) and /home/sprite/wkrun.sh LOG -- cmd (waits for 3.5 GB free, one WebKit run at a time via /home/sprite/.lowi-webkit.lock). Never `pkill -f <pattern>` from exec: it matches your own shell.
- Proof: tools/check-onboarding-gender-note.cjs (rewritten for the Add box + old-note carry-over) on LIVE: Chromium de/en/es 29/29 ALL PASS; WebKit de/en/es: every own-entries and merge check passes (27/27 en and de, 25/25 es); the run then dies on the Profile tab world in WebKit (VM rendering, pre-existing).
