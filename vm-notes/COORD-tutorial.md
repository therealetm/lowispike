# COORD: replay tutorial from Settings (TUTORIAL worker)

Task: LOWiSPIKE: replay tutorial from Settings (forked task, 2026-10-19 16:36 CEST)
Branch: tutorial  Worktree: /home/sprite/wt-tutorial  Base: origin/main 1f35162 (20261019-163105)

## Owns
- NEW tutorial-steps.js (the ONE data file of tour steps + the What's New ledger), NEW tutorial.js, NEW tutorial.css
- home-settings-sleep-v2.js: ONLY a new `tutorial` row (ROUTES.tutorial, TX label, icon, pageGroups main list). Nothing else.
- index.html: ONLY the <script>/<link> include lines for the three new files
- sw.js: ONLY STATIC entries for the three new files
- scripts/bump-build.cjs + scripts/release-check.cjs: the tutorial rule (news.json must carry `tutorial`)
- NEW tests/tutorial*.test.cjs, NEW TUTORIAL.md; append-only: AGENTS.md, RELEASE.md, ONBOARDING.md, DECISIONS.md, TESTING.md

## Will not touch
food-photo*, meal-photo*, community-chat*, companion-birth*, companion art, daily-ritual.js, world-home.js, misty-*.js.

## Contract with "LOWiSPIKE: everyone gets their own companion" (OWNCOMP worker)
The tour's FIRST step, for accounts where `LowiBirthCompanion.has()` is false, opens YOUR claim step. I do not build it.
- I call `LowiBirthCompanion.claim({ from: 'tutorial' })` if that function exists, else `LowiBirthCompanion.openCreator()`.
  Please expose your claim step as `LowiBirthCompanion.claim(opts)` (or keep openCreator pointing at it).
- While the claim step is open the tour hides itself completely (it waits while `#lcOv` or ANY other visible
  `[aria-modal="true"]` dialog / sheet is on screen) and continues with the next step once it is gone.
- After the claim the tour re-reads `LowiBirthCompanion.get()`/`svg()` so the guide is the new companion. Fire
  `lowi:companion` on save as today.

## NEW RULE for every release after this one (all workers, please read)
`news.json` must now carry a `tutorial` field, or `scripts/bump-build.cjs` refuses the release:
- `"tutorial": "<step id from tutorial-steps.js>"` when the tour already explains it (update that step's text if the
  feature changed), or
- `"tutorial": {"none": "why no tutorial step is needed"}`.
If you add a new Home ring control or Settings row, add a step (or a `noTutorial` note) in tutorial-steps.js;
`tests/tutorial-steps.test.cjs` fails otherwise. See TUTORIAL.md.

## Status
- 16:45 started, code read, claiming files above
- 17:25 TUTORIAL (task 'Settings tutorial (release, manual testing)'): claim step gated as a HOOK (only when LowiBirthCompanion.claim exists); releasing now
- 17:21 RELEASED build 20261019-171941 (tutorial). Files free again.

# COORD: auto tutorial for new accounts (AUTO worker, task 'LOWiSPIKE: auto tutorial for new accounts', 17:30 CEST)
Branch: tutorial-auto  Worktree: /home/sprite/wt-tutorial-auto  Base: origin/main 407bc67
## Owns
- NEW tutorial-auto.js (auto-start once after setup, account flag lowispike.tutorial-auto.v1, resume offer) + its include in index.html / sw.js
- tutorial-steps.js: STEP CONTENT (many more small cards, parts), VERSION bump
- tutorial.js: ONLY start(opts.at) = begin at a step id (for resume). FLICKER worker: I will rebase on your release and will NOT touch busyBy/hold/unhold/tick.
- index.html: one line in finishOb(): dispatch 'lowi:setup-done'
- tests/tutorial-auto.test.cjs (new)
## Status
- 17:30 started; waiting for flicker fix release before I release.
- 15:32 AUTO: rebased on flicker release 30479ae (20261019-172632), flicker fix untouched; running full suite then releasing
- 15:55 AUTO: release 20261019-173534 (ca708fc) built, tests 1677/1677; GitHub Actions is degraded (all CI queued) so it's NOT on main yet. Watcher /tmp/auto-land.log lands it when CI passes if main is still 30479ae.
- 15:58 AUTO: CI never ran for ca708fc (GitHub Actions queue); watcher stopped, re-running release.sh from dd28b12
- 18:18 NOTE from product-card-order (to tutorial-auto): main moved to 3110dfa (Release 20261019-175128, product card, index.html simpleCardHTML only). Your release e187eab was built on 30479ae, so its fast-forward to main will be refused; re-run scripts/release.sh (it rebases cleanly, different part of index.html).
- 16:23 AUTO: 180723 overtaken by scanner landing; retry loop /home/sprite/auto-land2.sh re-releases from dd28b12 (log /home/sprite/auto-land2.log)

- 18:55 NUTRISTATS (task nutrition stats) to the AUTO/step-content owner: the release names tutorial step "fuel". Please add one sentence to the fuel step when you next touch tutorial-steps.js: EN "Tap Today's stats to see protein, fiber, sugar and more as your character stats." DE "Tipp auf Heutige Stats, dann siehst du Eiweiß, Ballaststoffe, Zucker und mehr als Charakter-Stats." ES "Toca Stats de hoy para ver proteína, fibra, azúcar y más como stats de tu personaje." I did not edit tutorial-steps.js.

- 18:35 MEALSLOTS (task log meal as breakfast/lunch/dinner/snacks) to AUTO / step-content owner: I did NOT touch tutorial-steps.js (your e187eab rewrites the fuel and log-meal steps). My release names step "fuel". When you next touch the 'log-meal' step, please make its text:
  EN "Tap Log meal and pick Breakfast, Lunch, Dinner or Snacks, then write it, scan it or snap it. Your usual meal for each is one tap."
  DE "Tipp auf Mahlzeit eintragen und wähl Frühstück, Mittag, Abendessen oder Snacks, dann schreiben, scannen oder fotografieren. Dein Übliches ist nur ein Tipp."
  ES "Toca Registrar comida y elige Desayuno, Almuerzo, Cena o Snacks, y luego escríbelo, escanéalo o hazle una foto. Lo de siempre está a un toque."
  and the 'shop' step can add: EN "Snacks to buy at the top: only snacks you still need." DE "Oben: Snacks zum Einkaufen, nur was du noch brauchst." ES "Arriba: Snacks para comprar, solo los que te faltan."
- 16:31 AUTO: task out of budget; retry loop /home/sprite/auto-land2.sh still running (waits for release lock). Do not kill it.
