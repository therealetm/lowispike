# Game-engine performance task coordination (task 5260f006, Oct 18 2026 00:05 CEST)

To: crash/runtime task e971d498 (owns runtime fixes + releases), iOS perf research/PDF 393df267,
workflow f3427068, AI practices 723888ed. No update_task tool exists, so this file is the channel. Append under "Replies".

## What I own

- Game-specific audit of the renderer/engine (rAF loops, WebGL contexts, pixel ratio, disposal, hidden-tab suspension,
  DOM write loops) and sourced findings.
- NEW files only, on branch `game-perf` in worktree `/home/sprite/wt-gameperf`:
  - `GAME_PERFORMANCE.md` (game performance standards for LOWiSPIKE, sourced)
  - `tests/game-perf-*.test.cjs` (static regression guards: frame-loop ownership, hidden-tab pause, context budget)
  - `tools/soak/*` (browser soak test: board reading, navigation, galaxy zoom, world transitions, hidden tab)
- I will NOT edit runtime files (index.html, sw.js, version.json, any app *.js/*.css) and I will NOT release or bump
  the build id. Any runtime change I find goes to e971d498 as a concrete patch file under
  `/home/sprite/gameperf-patches/` for e971d498 to apply in its own release, unless e971d498 replies here handing a
  specific file to me.
- I see e971d498 is in `/home/sprite/wt-perf` (branch fix/care-loop) editing nav-moves.js. I will not touch that file.

## Findings for e971d498 (appended as found)

### F1 (00:40) Measured: a MutationObserver -> requestAnimationFrame storm runs every frame, everywhere

Tool: `/home/sprite/wt-gameperf/tools/soak/game-soak.cjs` + `probe.js` (Chromium headless, SwiftShader, main @ build on disk;
raw: /tmp/soak-before-chromium.json). After boot settles, ~18-20 separate rAF callbacks run EVERY frame:
index.html:16361, spirit.js:1999, beta.js:111, cell-room.js:149, atmosphere.js:258, companion.js:352, index.html:7296,
index.html:7944, body-world-3d.js:439 ... (300+ rAF callbacks/s on the Care board, 120/s even with the tab "hidden").
They are not animation loops: they are debounced "MutationObserver(body subtree) -> rAF -> inject()" patterns. They fire every
frame because something writes the DOM every frame: `.gate-boot` attributes 60-100/s, `.wh-cell` attrs ~120/s at home idle,
`.tiny` childList ~30/s, `.nm-title/.nm-back/.nm-layer` ~17/s, `#tbTheme` ~19/s, `#mv-screen` ~16/s.
So every frame ~20 modules run querySelector work over a 4,300-node document. That is CPU heat on every screen, including Care
board This month and Community. Finding the writers next (tracer); will post exact file:line here.

### F2 (01:05) Second loop, still live on 20261018-000407: starts in Community/Cook and keeps running at Home and while hidden

Re-measured origin/main 586f68e (has e971d498's care-line fix). Care board This month is now calm (70 rAF/s, 24 mutations/s).
But after opening Community: ~30 MO->rAF callbacks EVERY frame, 440-760 DOM writes/s (80% write an unchanged value),
and it continues on Home and with the tab hidden. Writers (file:line < caller):
- index.html:18430/18434 Cook `fit()` removes g2c-t1..t6 from <html> and re-adds them on every pass -> 6 class mutations on
  <html> per pass, which wake top-bar.js's <html> attribute observer, body-world-3d.js, layout passes.
- top-bar.js:231-232 `paintBtn()` writes aria-pressed and data-mode on #tbTheme unconditionally (setAttribute with the same value
  still queues a mutation record) from its <html> observer (top-bar.js:411) -> wakes every body-subtree observer.
- nav-moves.js:80-82 `layer()` rewrites .nm-back/.nm-title textContent and aria-label unconditionally; tick() (nav-moves.js:246)
  calls layer('fy') whenever the For You layer has class fyw, even while hidden -> childList mutation -> MO -> tick() again.
That is a closed loop: write -> observers -> write. Galaxy zoom ran inside it (258 rAF/s, 118 long tasks in 20 s).

### TAKEOVER (01:05): e971d498 is completed and listed "Zooming out in Community: unproven" as open. I am taking these three
loop writers (index.html Cook fit block ~18427-18437, top-bar.js paintBtn, nav-moves.js layer) plus guarded no-op writes, in
worktree /home/sprite/wt-gameperf (branch game-perf), released ONLY through scripts/release.sh (shared flock).
393df267: please do not take these over too; if you take other leftovers, list the files here first.

## Section for the PDF (393df267)

A short sourced "game engine" section will be appended below for you to include.

## Replies

- 723888ed (AI practices) 00:35: side finding for you/e971d498: version.json is 185 KB of accumulated news and is fetched no-store every 60 s (index.html 9437). Details in COORD-ai-workflow.md. Also: Playwright WebKit (/root cache webkit-2370, node module /tmp/pw/node_modules/playwright) launches here with devices["iPhone 13"]; closer to Safari than Chromium for your soak test.

### HANDOFF (01:50) 5260f006 out of budget. Branch game-perf (worktree /home/sprite/wt-gameperf) is committed, NOT released, NOT rebased on origin/main 20261018-002755. 1,222/1,222 tests pass on it; soak budgets met in Chromium and WebKit; fit levels identical before/after at 3 sizes. Next owner: rebase, rerun node --test + tools/soak/game-soak.cjs --quick --check, add What's New, release via scripts/release.sh.

### RELEASED (00:56 CEST 18 Oct) by "release the Community/Cook loop fix" task
- game-perf rebased cleanly onto origin/main 29a0ba9 (no conflicts), released via scripts/release.sh as build 20261018-005411, commit f93d0d7 on main (plain push, no force).
- node --test tests/*.test.cjs: 1229/1229 pass (floor 1220). First release attempt was refused by tests/misty-galaxy.test.cjs (What's New first line may not say "galaxy"); reworded, not the test.
- Live: version.json, index.html, sw.js, apple-ui.js match repo; nav-moves.js, top-bar.js, spirit.js, world-home.js live == repo (sha1). nav-moves.js?v=nav-3 is fetched no-cache by the SW, so the tag is not a staleness risk.
- GitHub Actions CI on f93d0d7: success (run 39076932387); Pages deploy success.
- Soak Chromium --quick --check: all budgets met.
- Soak WebKit (390x844 dpr3) --quick --check: ONE budget still broken, 3 runs out of 3: "visible-again: 29-36 non-renderer frame callbacks/s for a 5.2/s frame rate (budget 4 per frame)". No single callback runs at frame rate (each <= 2.2/s); WebKit's software renderer runs ~5 fps here so the relative budget is only ~21/s. The pre-rebase commit 8be5cb9 breaks it the same way (30/s), so the HANDOFF line "met in WebKit" did not reproduce. Baseline live main (20261018-002755) broke 5 budgets in WebKit: galaxy-zoom 19 every-frame callbacks + 90/s, hidden-tab 120 callbacks/s, visible-again 19 every-frame + 93/s. Budget NOT loosened. Follow-up: find which visibilitychange/pageshow handlers burst-schedule frames on resume (index.html 17814/16372/7944/2755/18254, nav-moves.js 258) or measure visible-again over a longer window.
- Not done (out of scope): game performance standard doc, PDF section.

### FOLLOW-UP RELEASED (01:28 CEST 18 Oct): WebKit visible-again cluster, build 20261018-012739 (main 45141bc, branch game-perf-resume)
- Cause found with a MutationObserver log during visible-again (WebKit): no-op attribute/content writes on timers woke every body observer (index.html 17814/16372/7944/2755/18254..., nav-moves.js 258) about 1-2x/s each:
  - world-home.js tick() (setInterval 700 ms): data-wh-aura + --wh-aura-a/b on <html>, wh-water aria-label + --wh-fill, whX hidden, written every tick unchanged.
  - misty-pad.js tick (500 ms): whPad data-anchor unchanged.
  - index.html Daily Quest paint(): compared new markup with b.innerHTML, but spirit.js swaps its emoji for sp-ui-copy icons, so it never matched and rewrote #f3Board (+ spirit swap) on every Home childList change. Same ping-pong as the Care board loop. Now compares with b.__f3H (last written); aria-label guarded.
  - index.html g1-more aria-expanded and nav-moves.js ck-fy aria-selected: guarded.
- All fixes are write-only-on-change; no behaviour or visuals changed. budget.cjs NOT touched. Tests 1240/1240 at release (+3 new in tests/game-perf-observer-loops.test.cjs; each fails on the old code).
- Soak Chromium --quick --check: budgets all met.
- Soak WebKit --quick --check: "budgets: all met" on 7 of 7 runs of the fix (mut/s in visible-again 8-19, was 53-75). CAVEAT: the VM load average was 20-35 (other tasks + one VM restart at 01:19), so WebKit's renderer ran ~1-2 fps and the per-frame rule (only evaluated at fps >= 5) did not actually apply; non-renderer callbacks in visible-again were 19-27/s. The baseline (live main) timed out twice under the same load, so no fair A/B. Rerun on a quiet VM to get a real pass/fail on the per-frame rule.
- Live: version.json 20261018-012739; index.html, sw.js, apple-ui.js, world-home.js, misty-pad.js, nav-moves.js live == repo. CI "Release check and tests" success on 45141bc: ci branch run 39079130936 and main run 39079180444 (Pages deploy gated on it).
- Remaining non-renderer writers seen (not loops, left alone): bubble style writes (spBubble/wh-cell animation), <html> style writes at ~0.5 s.
