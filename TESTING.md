# LOWiSPIKE testing guide

## Required automated checks

Run from the repository root:

```bash
node --test tests/*.test.cjs
git diff --check
```

The suite uses Node's built-in test runner and VM/static checks. There is no install or build step.

## Current automated coverage

| File | Coverage |
|---|---|
| `tests/discovery.test.cjs` | Label completeness, zero values, EU/US fiber basis, tiers, evidence separation, identity, reward caps, price freshness, drafts, Scan integration, and syntax. |
| `tests/herb-body.test.cjs` | Stage thresholds, multi-stage evolution, no regression/XP loss, private health persistence, body observation validity, native care rewards, and duplicate replay. |
| `tests/herb-living.test.cjs` | Twelve zodiac profiles, time/mood, six tap reactions plus dizziness, five care effects, wilting/recovery, needs, session-unique voice, cosmetics, reminder quiet hours, and script parsing. |
| `tests/herb-tamagotchi.test.cjs` | Companion integration and expected source contracts. |
| `tests/mobile-shell.test.cjs` | Multi-image shuffle/deceleration, stale spin cancellation, reduced motion, Move pre-paint compaction, unified Scan capture, silent navigation, and inline-script syntax. |
| `tests/swaflo.test.cjs` | Recipe preservation, food adaptation, sweet lane, Cook/Buy filtering, shopping fallback, price integrity, immutable source recipes, and safe defaults. |
| `tests/swaflo-ui.test.cjs` | Clear food actions, explicit mode/category selection, legacy Cook entry, EN/DE/ES copy, saved-swap access, and profile cleanliness. |
| `tests/weather-sky.test.cjs` | Live weather sky: rain/drizzle/storm, sun/clouds/fog/snow codes, real sunrise/sunset day-night with dawn/dusk, rain at night without stars, cold/freezing/hot bands, missing and stale reading fall back to the clock, fresh-only `is_day`, Open-Meteo parsing, layer first in `#app`, no location request from the sky, event repaint, Night/Cloud preserved and Sunrise following the real sun, off/on switch, loader/offline-cache/reduced-motion wiring. |
| `tests/update.test.cjs` | No false update prompt, explicit refresh semantics, retry cooldown, build verification, URL preservation, in-flight dedupe, notice exclusivity, and version alignment. |

When changing a module, run the whole suite. The app's global ordering means an apparently isolated edit can invalidate another screen.

## Visual fixtures

| Fixture | Use |
|---|---|
| `tests/mobile-layout-qa.html` | Primary regression fixture for compact Today, Scan, Cook, and Move. |
| `tests/mobile-layout.html` + `tests/mobile-layout.js` | Shared isolated shell/state behind mobile QA. |
| `tests/herb-visual-qa.html` | Six stages, zodiac appearance, effects, cosmetics, evolution, and room presentation. |
| `tests/herb-iphone.html` | Companion at a realistic phone viewport. |
| `tests/herb-fixture.js` | Deterministic time/state and care/reward fixture. |

Minimum browser viewport matrix for a UI change:

- 390 × 844 — modern iPhone baseline.
- 375 × 812 — smaller common iPhone.
- 375 × 667 — short viewport stress case.
- One tablet/desktop width when the changed module has a separate non-phone layout.

Check both `prefers-reduced-motion: reduce` and the default. If translucent UI changes, also check increased contrast/reduced transparency where the browser supports it.

## Manual critical-path matrix

### Shell and navigation

- First launch, onboarding skip/finish, sign-in gate, and returning session.
- Every tab changes without stale-screen flash, stray companion speech, duplicate listener, or scroll-position leakage.
- Header/profile and bottom navigation remain reachable above safe areas and the keyboard.
- Only one modal/sheet owns focus; Escape/close returns focus to the trigger.

### Today and rewards

- Daily Quest completes each task once and all-six bonus once.
- Fast start/stop and post-fast meal continuation work.
- Repeating, refreshing, going offline/online, or reopening does not duplicate XP.
- Current XP, profile level, leaderboard total, and herb stage agree.

### Herb

- Idle motion is present; reduced motion is calm/static but understandable.
- At least six tap reactions cycle; rapid taps become dizzy; taps award no XP.
- Meal, swap, movement, scan, and recipe completion produce water, sunlight, dance, vitamin, and bloom respectively.
- 100 XP reaches Sprout with one evolution reveal; a multi-stage jump reveals the final stage once.
- All six forms are distinct; zodiac changes palette/constellation; one real action reverses wilting.
- Navigation produces no speech bubble and no line repeats within a session.

### Scan, Cook, and Move

- Camera allowed/denied/unavailable, barcode photo fallback, number entry, meal photo, and typed product all remain reachable.
- Product result, insufficient evidence, offline, and not-found states are clear.
- Cook/Buy and Meal/Sweet snack selections can be changed repeatedly.
- Shuffle visibly cycles through at least two candidates and settles; a second spin cancels the first completion.
- Move's compact screen appears on first paint, and cancel versus completion are rewarded correctly.

### PWA/update/notifications

- Online and offline navigation, fresh install, stale service-worker cache, and explicit refresh.
- Build notice appears only when served HTML is truly older than `version.json`.
- Notification permission denial is respected; no repeated prompt.
- Herb reminder is at most daily and not at night; tapping focuses/opens the herb.

### Weather sky

- With location allowed, the background matches outside: rain, snow, fog, clouds, sun or stars; frost edges when cold.
- After real sunset, Sunrise mode turns dark even before 19:00; Night and Cloud never change on their own.
- With location denied or offline, no weather is shown, day/night follows the clock, and no prompt repeats.
- The sky never covers text or takes touches; it is hidden while the scan camera is open and holds still under Reduce Motion.

## Evidence language

Report exactly what was performed:

- **Automated:** name the command and pass/fail count.
- **Fixture/browser:** name the viewport and fixture/live URL.
- **Simulator:** name the device/OS.
- **Physical device:** name the actual device/OS and installed/browser mode.
- **Live:** give the commit SHA, build identifier, Pages result, and served build verification.

Never convert fixture success into “tested on iPhone.” Never report deployment based only on a local edit or GitHub commit.

## Adding tests

- Put pure transformations in a `*-core.js` file that supports CommonJS and browser globals, then test it directly.
- For inline modules, isolate the smallest source range or use source-contract tests; always retain a full inline-script syntax check.
- Add duplicate initialization and duplicate-event replay tests for any new listener or reward path.
- A visual bug fix needs an automated structural assertion where possible and a fixture state that reproduces the original screenshot.


## Spirit release checks

`tests/spirit.test.cjs` exercises the native reward/meal bridge, duplicate capture and water retry, shared six-stage levels, optional/unknown macros, once-daily bonuses, gradual dehydration/recovery, throw boundaries/velocity, date/personality names, German/Spanish voice and non-destructive feed merging. With the original regressions the suite contains 50 passing tests. `tests/spirit-qa.html` supplies 390×844, 375×812 and 375×667 isolated component fixtures with real Spirit UI and reward functions. Fixtures deliberately do not exercise a real camera, signed-in backend or payment. They are not physical-device evidence.
