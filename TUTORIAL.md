# Tutorial (Settings > Tutorial)

Emmanuel, 19 Oct 2026: "There should be a tutorial button where you can click on it and then basically our companion takes you
through everything from the beginning, as if you were new. Obviously, you can skip if you already know this. So, with every new
update, the tutorial also needs to be updated."

## Files
- `tutorial-steps.js`: the ONE data file. Steps in order, each with `id`, `area`, `target` (CSS selectors of the real Home control to
  spotlight, first visible one wins; `null` = centred card), optional `when` / `action`, `covers` (feature ids) and `title` / `text` /
  `cta` in `en`, `de`, `es` (`{name}` = the companion's name). `NO_TUTORIAL` lists features that need no step, with the reason.
  `VERSION` goes up whenever steps change.
- `tutorial.js`: the player (`window.LowiTutorial.start/stop/isOn/step`). `tutorial.css`: glass card + glow spotlight.
- `home-settings-sleep-v2.js`: the Settings row `tutorial` (ROUTES, TX label, icon, main group).
- `tests/tutorial-steps.test.cjs` (unit + rule), `tests/tutorial-live.cjs` (browser: iPhone 13 WebKit / iPad / Chrome).

## How it behaves
- Plays as if new, never wipes or writes app data. Only key: `localStorage['lowi.tutorial.v1']` `{v, at, done, skipped, last}`.
- First step for accounts that still have the standard Misty (`!LowiBirthCompanion.has()`): opens the claim-your-own-companion step
  (birthday, optional personality type, optional birth time). That step is owned by the own-companion work, not by the tutorial:
  the tour calls `LowiBirthCompanion.claim({from:'tutorial'})` only once it exists (marked HOOK in tutorial-steps.js, off until the own-companion task ships it; there is no fallback), hides while it is open and goes
  on to the next step when it closes.
- Every step: Back, Skip (skips the rest of this part, e.g. all Home bubbles), Next, and Skip all. Esc = Skip all, arrows move.
- It never opens panels. It hides completely (`.lt-held`, invisible and untouchable) while setup / the sign-in gate, any other visible
  `[aria-modal=true]` dialog, any sheet in the Day card's `BUSY` list, Settings or Misty's flight is up, and comes back where it
  was. The Day card lists `#ltTour:not(.lt-held)` in its `BUSY`, so it waits for the tour (bug hunt round 8).

## Keep it current (every release)
1. `news.json` must carry `"tutorial"`:
   - `"tutorial": "<step id>"` when a step explains the change. If the feature changed, update that step's text in all three
     languages. A new feature gets a new step (and its feature id in `covers`).
   - `"tutorial": {"none": "why no step is needed"}` (at least 8 characters), e.g. a server-only fix.
   `scripts/bump-build.cjs` refuses the release without it (exit 5, `BLOCKER:`); `scripts/release-check.cjs` fails a published
   What's New without it (from build `TUTORIAL_RULE_FROM` on). The field is copied to `version.json` `news.tutorial`.
2. A new Home ring control (`home-orbit-v2.js` `ORDER`) or a new Settings row (`pageGroups` / `MORE`) needs a step whose `covers`
   lists it, or a `NO_TUTORIAL` reason. `tests/tutorial-steps.test.cjs` fails otherwise.
3. Bump `VERSION` in `tutorial-steps.js` when steps change. Keep each card's text under 230 characters (phone card).

Example news.json:

```json
{"slug": "water-goal", "tutorial": "water", "text": {"en": "...", "de": "...", "es": "..."}}
```
