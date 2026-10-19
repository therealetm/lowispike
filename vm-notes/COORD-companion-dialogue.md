# COORD: cell companion dialogue (reading time, first intro, recall check, gossip)

Task: "LOWiSPIKE: slower bubbles + smarter cell companion dialogue" (started Oct 18, 2026, 9:14 PM PDT).
Four small releases, one at a time, in this order. Each from a fresh worktree off origin/main.

## Step 1: reading time for every text bubble (worktree /home/sprite/wt-companion-read, branch companion-reading-time)
Claimed files:
- read-time-core.js (new), tests/read-time.test.cjs (new)
- region-pals-core.js, region-pals.js, praise.js, misty-hub.js, arrival-cards.js, cell-world.js, micro-book.js
- index.html: ONLY the two `function toast(` lines and one new `<script src="read-time-core.js">` tag before misty-hub.js
- sw.js: ONLY adding "read-time-core.js" to the two STATIC lists
- tests/cell-guide.test.cjs, tests/praise.test.cjs (timing assertions updated to the new reading-time rule, nothing deleted)
- DECISIONS.md (append one entry)

Not touching: world-home.js, body-world-regions.js, body-world-3d*.js, misty-flight.js, misty-explore.js (world-exit task area).

## Step 2: first intro once, then welcome-back pool (worktree /home/sprite/wt-companion-intro, branch companion-first-intro)
Claimed: region-pals-core.js, region-pals.js, DATA_CONTRACTS.md (one row), DECISIONS.md (append), tests/guide-intro-once.test.cjs,
tests/guide-intro-live.cjs, tests/cell-guide.test.cjs and tests/region-pals.test.cjs (storage assertions narrowed to lowi.guides.v1).

## Steps 3-4 (region-pals-core.js, region-pals.js, region-pals.css + new tests) claimed after step 2 releases.

## Status
- Step 1: RELEASED build 20261019-063311 (main 46e3b44), tests 1416, CI passed, live check passed (WebKit iPhone 13 on the live site). Step-1 files free.
- Step 2: RELEASED build 20261019-064453 (main 519d7d4), tests 1430.
- Step 3 (recall check, Yes/No glass buttons): worktree /home/sprite/wt-companion-recall, branch companion-recall-check.
  Claimed: region-pals-core.js, region-pals.js, region-pals.css, DATA_CONTRACTS.md (lowi.guides.v1 row), tests/guide-recall.test.cjs,
  tests/guide-recall-live.cjs, tests/cell-guide.test.cjs (opening() call regex accepts the extra arguments). Unit tests 1443/1443.
  Shell: question waits until Misty has swum in and is on screen (still, or 6 s on screen, max 45 s then skipped and since=1 restored);
  other lines never bump it (pendAsk slot, waiting lines held while asking); bubble docks top/bottom without tail when no spot beside
  the guide clears Misty and the joystick; unanswered question survives a guide rebuild (askLeft).
  RELEASED build 20261019-080324 (main 906ad1f), tests 1456 (floor now 1456). Rebased onto main with the Settings side panel and
  plain joystick icon releases, no conflicts. CI (release check, deploy, live) passed; live region-pals.js/.css/-core.js match the repo.
  Browser check tests/guide-recall-live.cjs passed before release: Chromium 390x844, WebKit iPhone 13, WebKit iPad landscape.
  Region-pals files are FREE for step 4.
  Known: in emulation MF.screen() is often null in WebKit and Misty roams nonstop in Chromium, so the question usually asks via the
  6 s rule and docks at the top; real-phone timing unknown.
- Step 4 (gossip): NOT started; own task after step 3 is live (touches region-pals.js).
