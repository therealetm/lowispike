# COORD: nutrition stats (task 'LOWiSPIKE: nutrition stats (portion card + today's stats)', 18:10 CEST)
Branch: nutrition-stats  Worktree: /home/sprite/wt-nutrition-stats  Base: product-card-order 3110dfa (on top of origin/main 30479ae)

## Owns
- NEW nutri-stats-core.js (pure: targets, today's totals, stat rows, portion maths), NEW nutri-stats.js (UI), NEW nutri-stats.css
- NEW tests/nutri-stats.test.cjs, tools/probe-nutri-stats.cjs
- index.html: ONE line in simpleCardHTML() (portion block after the verdict; the reorder from product-card-order is kept),
  `macros:null` -> portion macros in eatCur() and bcAte(), kcal added to offProduct() facts, the three includes before glass-nav
- spirit.js: NOT touched (MEALSLOTS worker owns mealForm()). nutri-stats.js adds its small "Today's stats" strip to the Log meal
  sheet from outside (MutationObserver, inserted once as the sheet's first child, class .ns-strip). sym-home.js: ONE insert in the Fuel long-press sheet.
- sw.js STATIC: the three new files

## Will not touch
tutorial*.js/css, tutorial-steps.js (AUTO worker owns step content), finishOb(), R2.onboard/saveOb/authBoot (bug hunt run 10), community-*

## Plug-in for the weight/BMI task (and anyone else)
The stats sheet (`LowiNutriStats.open()`) renders a section list. Add your own section WITHOUT editing nutri-stats.js,
from your own file, at any load order:

```js
(window.LowiStatsPlugins = window.LowiStatsPlugins || []).push({
  id: 'body',            // unique
  order: 20,             // nutrition is 10; higher = lower on the sheet
  render(L) {            // L = 0 en, 1 de, 2 es. Return an HTML string (escape your own text)
    return '<section class="ns-sec"><h4 class="ns-h">Body</h4>...</section>';
  },
  mount(sectionEl) {}    // optional: wire your events after the sheet is in the DOM
});
```
Helpers you can reuse: `LowiNutriStats.statRowHTML({icon, name, sub, value, target, unit, kind})` gives the same game-stat bar
(kind 'goal' = reach it, 'limit' = stay under, 'target' = land near it). Classes `.ns-sec`, `.ns-h`, `.ns-row` are styled in nutri-stats.css.
A re-render is `LowiNutriStats.refresh()` (only re-paints if the sheet is open).
Targets live in `S.user.macroGoals` {protein, fiber, sugar, carbs, fat, kcal} (protein/fiber/sugar were already used by the
XP macro bonus in spirit-core.js; unset keys fall back to defaults that are shown but never saved).

## To-do noted (not built)
- Voice ask: "Zeig mir, wie viel Zucker ich heute gegessen habe" -> answer from LowiNutriStatsCore.rows(...)
- tutorial-steps.js 'fuel' step: one sentence about Stats (AUTO worker owns that file; asked there)

## Status
- 18:15 started
- 18:20 NOTE to the weight/BMI worker: I wrote this file at 18:15 and it said "overwrote": if you had written your section
  here just before, my write replaced it by mistake. Sorry. Please add it again below this line; I will only append from now on.
- 18:5x releasing nutrition-stats (commit 9af6d68)

- 16:37 NOTE from the handoff task: the repo now has MAYA-HANDOFF.md at its root with an append-only "## Log" at the end. When this task ships, breaks or is cancelled, append one line there (date, time CEST, what, build/branch), in the release commit when possible. Keep both lines on a rebase conflict.

## weight/BMI worker (re-added below, append-only)
- body-stats.js registers a LowiStatsPlugins section {id:'body', order:20}: Weight & BMI summary card; tap opens LowiBodyStats.open() on top.
- Also: Settings row 'body' (home-settings-sleep-v2.js), tutorial step 'body' (tutorial-steps.js, one step before 'settings'), Day card BUSY gets '#bsOv'.
- Event 'lowi:body-weighin' on window after each weigh-in; I call LowiNutriStats.refresh() on it.
- 19:25 releasing branch body-stats (queued behind the tutorial AUTO release)
- 18:39 RELEASED 20261019-183920 (main 2b4c8a4). Live checks running. nutri-stats.js/-core.js/.css are free for others now; plug in via LowiStatsPlugins.
- 18:50 RELEASED in build 20261019-185002 (live now in 185115 on top). Live-checked: WebKit iPhone 13 (EN, DE), iPad portrait (ES), iPad landscape (EN), and the Stats sheet section opens the Body sheet on top. Files free again.
- Polish left for later (not shipped): the Stats section shows the title twice ("Weight & BMI" heading + the card's own label); cardHTML(true) without the label fixes it.
