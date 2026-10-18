# HANDOFF: Fuel bloom = Shop, Cook, Log meal

Branch `fuel-shop-cook-log`, based on origin/main badebb0 (build 20261018-195906). Not released. The integrator releases it.

## Done
- Tapping Fuel now blooms exactly three orbs, in this order: **Shop** (what to buy), **Cook** (recipes), **Log meal** (no subline). German: Einkaufen (was kaufen?) / Kochen (Rezepte) / Mahlzeit eintragen. Spanish: Comprar (¿qué compro?) / Cocinar (recetas) / Anotar comida.
- Swap and Today's step are gone from the Fuel bloom. The Craving SOS feature itself is not deleted from the app; only its Fuel orb is gone.
- The destinations are the same as before: Shop opens the "What can I buy here?" panel (LowiStorePicks.open('home-bloom'), where the old Snack orb went). Cook goes to the Cook tab (LowiHost.go('shelf')). Log meal opens the meal log sheet (LowiSpirit.meal()).
- Holding Fuel still opens the meal log, but only as a shortcut now. It's no longer the only way in.
- Dead code from the old orbs was removed from home-blooms-v2.js: todaysPick, pickName, openSOS, and the step/swap icons. The snack icon was renamed shop, and a log icon (note lines) was added.
- Water, Move and Gap code was not touched. The new unit test checks that Water and Gap actions are unchanged, and the live test still passes its Water, Move and Gap checks.

## Files
- home-blooms-v2.js: Fuel actions, icons, header comment
- home-blooms-v2.css: one comment line (example of a long label)
- tests/ui-fuel-navigation.test.cjs (new, 9 tests): runs the real module in a fake window (node:vm) and checks behaviour, not source text
- tests/ui-fuel-live.cjs (new, browser, not part of the node suite): en/de/es icon, label and subline inside each orb, no ellipsis, default and reduced motion, 390x844 / 375x812 / 375x667 / iPhone 13 WebKit / iPad WebKit
- tests/home-blooms-v2.test.cjs: contract update, see below
- tests/home-blooms-v2-live.cjs: Fuel case updated to shop,cook,log, plus a visible Log meal orb check

## Startup material read (second pass, before the apple-design fix)
- `.agents/skills/apple-design/SKILL.md`, read in full (290 lines, sections 1 to 17 and the quick reference)
- `TESTING.md` in full: the required three checks, the viewport matrix (390x844, 375x812, 375x667, plus tablet), default and reduced motion, and the evidence language
- `RELEASE.md` in full: branch-only work for workers, scripts/release.sh under the lock, CI before main, verify-live
- Already read in the first pass: AGENTS.md, .agents/skills/lowispike-change/SKILL.md, SUCCESSOR_HANDOFF.md, DECISIONS.md (Fuel entries), /home/sprite/COORD-ui-rollout.md

The first pass skipped the full apple-design read and the 375x812 / 375x667 rows of the TESTING.md matrix. Both are covered now.

## Apple-design review of the Fuel bloom
Broken by this change, now fixed:
- **Craft / "layouts that break read as carelessness":** some sublines were cut with an ellipsis or spilled past the round edge. Measured in WebKit iPhone 13 and Chromium:
  - German "was kann ich kaufen?" and "was du gegessen hast" were cut at 390 wide.
  - English "what can I buy?" was cut on the 71px orbs at 375 wide.
  - The German and Spanish Log meal orbs had text outside the circle, because a two-line label plus a subline was too tall.
- **The fix:**
  - Shop sublines are now "what to buy" / "was kaufen?" / "¿qué compro?".
  - **Simplicity, every element earns its place:** Log meal has no subline, since its label already says what it does.
  - Every icon, label and subline now sits whole inside its orb at every size tested, in all three languages.
- **Tests guarding it:**
  - `tests/ui-fuel-navigation.test.cjs`: sublines are 12 characters or less, and Log meal has no subline.
  - `tests/ui-fuel-live.cjs`: geometry and ellipsis checks for icon, label and subline.

Checked and fine in this change:
- Direct, specific labels (Shop, Cook, Log meal)
- One level for the common path: meal logging is no longer hidden behind a hold
- Instant press feedback (`.hb2-orb:active` scale), focus ring, 71 to 84px touch targets
- Line-art icon in the same style as the others
- Reduced motion shows the bloom at once with no running animation

Not caused by this change, so left alone. These styles are shared by the Fuel, Water, Move and Gap blooms, which makes them a separate small task for the coordinator's queue:
1. No `prefers-reduced-transparency` or `prefers-contrast: more` fallback on `.hb2-orb` and `.hb2-note`. Translucent glass stays translucent.
2. Reduced motion appears instantly instead of with a short cross-fade (skill section 14).
3. The bloom opens with an overshooting cubic-bezier (1.6) after a plain tap. The skill reserves bounce for momentum gestures and recommends critically damped springs (sections 4 and 3). CSS transitions can't be grabbed mid-flight.

## Contract conflict found in the old tests (replaced, not weakened)
Both old test files for this module asserted the navigation E-man removed on Oct 18. That made them contradict the new Fuel behaviour.
- `tests/home-blooms-v2.test.cjs` (node suite):
  - It required the words "Today's step", 'Snack' and 'Swap'. It now requires 'Shop', 'Log meal' and 'Cook', and a new assertion requires `T('Swap'`, `T("Today's step"` and `T('Snack'` to be absent.
  - It required the calls `LowiSpirit.showPick(` and `setAttribute('data-act', 'sos')`. Those are gone from the API list. `LowiSpirit.meal()`, `LowiStorePicks.open(` and `LowiHost.go('shelf')` stay, and a guard on the meal orb (`if (fn(W.LowiSpirit, 'meal')) A.push`) was added.
- `tests/home-blooms-v2-live.cjs` (browser):
  - It required the Fuel orbs to be `step,snack,swap,cook`, and checked that Swap opens Craving SOS and Today's step opens Misty's pick.
  - It now requires `shop,cook,log`, plus no Swap / Today's step / Snack text, a visible and enabled Log meal orb with its label inside the circle, Shop opening What can I buy here?, and Log meal opening the meal log.
  - Cook and the Fuel hold checks are unchanged.

No test was deleted or skipped. The node suite went from 1378 on main to 1388. The reason is also in the first commit's message.

## Proof (re-run after the apple-design fix)
- `node scripts/release-check.cjs`: OK. It gave 3 warnings, all already on main: version.json size, index.html size, and four assets with their own version tag.
- `node --test tests/*.test.cjs`: 1388 pass, 0 fail, 0 skipped. The new Fuel test failed 6 of 9 on main before the first change. The new subline check fails on the old German sublines.
- `git diff --check`: clean
- `node tests/ui-fuel-live.cjs`: PASS, 185 checks, in all three languages and in both default and reduced motion, on:
  - Chromium at 390x844, 375x812 and 375x667
  - WebKit as iPhone 13
  - WebKit on iPad landscape
- `node tests/home-blooms-v2-live.cjs`:
  - WebKit iPhone 13 and WebKit iPad landscape: PASS
  - Chromium 390x844: PASS on 2 of 3 runs. The one failure was "move bloom open, exactly one", in the Move bloom, which this change doesn't touch. It looks like a flaky timing in the existing script. Worth watching.
- Screenshots: /tmp/ui-fuel-shots, /tmp/fuel-shots
- Emulation only. Not tested on a real iPhone or iPad.

## For the integrator (files this worker must not edit)
- No loader or index.html change is needed. home-blooms-v2.js and .css are already loaded by index.html, and the cache-bust comes from the release bump.
- Docs entry to add to DECISIONS.md at release (suggested text):
  `2026-10-18 Fuel bloom = Shop / Cook / Log meal (E-man: "only Shop and Cook, plus a meal log button you can actually see"; Swap removed for good). Today's step and Swap left Fuel; Craving SOS stays in the app. Hold Fuel stays as a meal-log shortcut. Tests: tests/ui-fuel-navigation.test.cjs, tests/ui-fuel-live.cjs, tests/home-blooms-v2-live.cjs.`
- SCREEN_MAP.md: if it lists the Fuel bloom, update it to Shop / Cook / Log meal. ONBOARDING.md has no Fuel bloom text, so no onboarding change is needed.
- What's New lines (en/de/es) are for the integrator to write.
- One iPhone check for E-man after release: tap Fuel and confirm you see Shop, Cook and Log meal. Tap Log meal and the meal log sheet should open. In German, "Mahlzeit eintragen" should show whole on two lines.

## Not done (out of scope, queued elsewhere)
- Cook right-side glass panel (queue item 5)
- "What are you craving?" title and tiles
- Any food scoring change

## Traps
- Arrays built inside the node:vm realm aren't deepStrictEqual to this realm's arrays. The new test copies them through JSON.
