# HANDOFF: Fuel screens one style + two-step Swap (committed + pushed, NOT released)

Worktree /home/sprite/wt-fuel-style, branch `fuel-screens-style` (pushed to origin), based on origin/main af789ff (20261018-175840).
COORD: /home/sprite/COORD-fuel-screens-style.md

## Status (Oct 18, ~20:15 CEST, task 'LOWiSPIKE: Fuel screens, fix checks + commit')
Highest proof rung: **local browser tests (Playwright, Chromium + WebKit engines) against the branch served from the VM**. Not live, not on a real iPhone/iPad.
- Full unit suite `node --test tests/*.test.cjs`: see COORD for the final count (1351+ pass, 0 fail; was 1335 on main; nothing deleted or loosened).
- `node tests/fuel-screens-live.cjs` per view: results in COORD Replies (per view PASS/FAIL).

## What is in the branch
- NEW fuel-screens.css / fuel-screens.js: one Fuel panel family (#sos Swap, #sheet with #f2Sheet "What did you eat?", R2 .sp-pick "Your pick", R2 .sp-quick-log "Log a meal"). Glass skin, one close top-right, hides #whX while open, docks beside Misty on >=700px. While a panel is open it re-checks every 400 ms so the Home X always comes back (WebKit close fade could outlast the burst).
- Loaded right AFTER home-blooms-v2.js (not at the very end: tests pin cook-shop.css/sym-home.js as the tail). Precached in sw.js.
- index.html: Swap in two steps ("What are you craving?" tiles -> card), F2 strings no longer say Today, XP shown once.
- User asks folded in this evening (all test-first):
  - Fuel bloom "Snack" -> **Shop** (DE Shop, ES Tienda). Internal id stays `snack`.
  - store-picks.js panel header + dialog aria-label "What can I buy here?" -> **Low-Spike Finds** (DE Low-Spike-Funde, ES Hallazgos Low-Spike). The Cook-page entry button still says "What can I buy here?" (it is a button, not the header) and the first-run shop picker still says "Which shop?".
  - Fuel bloom: **Log meal** is its own orb (Today's step, Log meal, Shop, Swap, Cook) -> LowiSpirit.meal(). Holding Fuel no longer logs (a hold is a tap: opens the bloom). Move keeps its hold (today's moves). 5-orb layout unit-tested on phone + iPad ring.
- Shop (.stp-card) is NOT in the shared family this release (its bottom close + paged list need a store-picks change first). It keeps its own look; live check only verifies it opens from Shop, header Low-Spike Finds, on top, no emoji, own close shuts it.

## Live-probe fixes (tests/fuel-screens-live.cjs) - all were probe problems, not app bugs
- Panels were probed mid-fade (opacity 0 on the slow VM GPU): now polls (`settle`) instead of fixed sleeps; bloom orbs tapped only once still.
- Card text read via textContent (CSS uppercases innerText); "Not now" read from the .f2-later button (text was sliced at 260 chars).
- closeByX taps the close that is on top (a closed #sos keeps a hidden .fs-x in the DOM).
- closeAll closes through the app (LowiR2.close / closesos / stp close) before the removal fallback.
- The first-run guide #g1Tour (appended to <html>, max z-index) pops up on the fresh test account when F2 opens and covered the panel: the harness removes it for the whole run.

## Other tests changed (behaviour asked for by Emmanuel, not loosened)
- tests/home-blooms-v2.test.cjs: label list expects 'Shop' instead of 'Snack'.
- tests/home-blooms-v2-live.cjs: Fuel orbs `step,log,snack,swap,cook`; new case "Log meal opens the meal log"; hold-Fuel case now asserts the hold opens the bloom and no meal sheet.

## Left to do (separate release task)
1. Re-run any view marked FAIL/crashed in COORD (WebKit segfaulted once when 3 browsers ran at once: run at most 2 views in parallel).
2. Before/after screenshots: `--root` on an origin/main checkout with `--shoot-only` (before), and `--shoot-only` on the branch (after). /tmp/fs/after has the after shots from this run.
3. What's New EN/DE/ES (one style for Fuel screens, two-step Swap, Shop + Low-Spike Finds, Log meal orb).
4. Rebase on newest origin/main. Expect a conflict in home-blooms-v2.js Fuel action list: task f8bc11e4 (COORD-cook-home-panel.md) changes ONE line, the Fuel 'cook' run(). Keep their run(), keep our labels/order/Log meal orb.
5. Release via scripts/release.sh under /tmp/lowispike-release.lock; check live version.json build + CI; run `node tests/fuel-screens-live.cjs --url https://therealetm.github.io/lowispike/` and home-blooms-v2-live.cjs against live.
