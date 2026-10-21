# Onboarding: what a new person sees, and what each line is based on

E-man (Oct 17, 2026): always check that the onboarding is up to date with the newest changes: "the style, how it looks,
the design, the logos, the pictures you use, the wording, the explanation, everything."

This file is the source of truth for the first-run flow. `tests/onboarding-current.test.cjs` reads it and the code, and
fails when they drift apart. **Every release that changes something a new person would see or be told must update this
file and the onboarding copy in the same commit.**

## The flow, in order

| # | Screen | Code | Explains | Based on |
|---|--------|------|----------|----------|
| 0 | Add to Home Screen guide (phone browsers only, first) | `index.html` `LowiA1` (start mode) | one plain line first: "Free app: eat smarter and lose weight, as a game." then how to add it | `index.html` |
| 1 | What it is + why + proof | `herb-start.js` step 0 | headline "Eat smarter and lose weight, as a game.", the five habits (Shop & scan, Fuel, Water, Move, Gap) power the companion, founder proof "Made by Eman, who lost 45 kg in 7 months." Button "Get started" | `shop-scan.js`, Home bubbles, founder bio in `index.html` |
| 2 | Your first name | `herb-start.js` step 1 | it learns your name. Button "Continue" | `LowiHerbIdentityCore.cleanName` |
| 3 | First XP + free account | `herb-start.js` step 2 | first spark (+5 XP), "Create free account" | `firstReward()` |
| 4 | Account form | `index.html` gate (`R2`) | email + password; the name field is only shown when the start didn't get a name ("Two fields. That's it.") | `index.html` (LOWI_CLOUD) |
| 5 | Setup 1: birthday | `index.html` `paintOb` step 0 | birthday gives the companion its face and name | `companion-birth.js` |
| 6 | Setup 2: photo | `paintOb` step 1 | optional avatar | |
| 7 | Setup 3: goals | `paintOb` step 2 | what you want most | `S.profile.goals` |
| 8 | Setup 4: grocery shopping | `paintOb` step 3, `shop-plan.js` | the person TYPES how often they shop, read back in plain words (7 = "Once a week", 30 = "Once a month", `plainEvery`); weekdays + shop optional; Later skips; what the shopping glow does | `shop-plan-core.js`, `grocery-hunt-core.js` (reads the rhythm) |
| 9 | Starter plan (optional) | `herb-start.js` `ivOpen` | up to 4 optional questions, first steps on Today | `starter-core.js` |

Existing users never see this flow again (`S.setupDone`). Their shopping rhythm is set or changed in
Profile > About you > Grocery shopping (`shop-plan.js` card), never forced.

## Facts the copy must keep true

- **Shopping rhythm:** only the number the person typed (1 to 60 days). No default, no guess. Missing a shop never means
  someone ate badly. Stored in `lowispike.shopplan.v1`; read it through `LowiShopPlan` / `LowiShopPlanCore` only.
- **Shopping glow + hunt** (`grocery-hunt-core.js`, `grocery-hunt.js`): two different products caught on one day (barcode
  in the shopping scanner or a fresh product photo) is a shopping check-in. The worlds glow brighter for the rhythm plus a day,
  then fade over one rhythm back to the normal look, never below it. Pause and "couldn't scan" exist. The hunt reads the
  rhythm from `LowiShopPlan`; without a typed rhythm it uses a quiet weekly timing and shows no number. Shop finds and power
  combos (e.g. Speisequark + kiwi + almonds) work on this phone; sharing with other shoppers needs the proposed Supabase
  tables and the person's consent, so the copy must not promise other people's finds yet.
- **Scanner:** live barcode, typed barcode, barcode from a photo. Results are *estimates* from the label, not medical
  advice and never a promise of "no spike". The Deep analyze link opens the LOWiSPIKE GPT; the photo upload there is manual
  and nothing comes back into the app automatically.
- **Controls:** drag the controller to fly, hold = forward, 2 taps = back, 3 taps = autopilot, double tap with a second
  finger while flying = her shot. Exploring trips can be called back by tapping the timer.
- **Before the birthday step the companion is not called Misty** (`tests/onboarding-misty.test.cjs`).

## Look

Same see-through blue glass as the Move panel: `onboarding-world.css`, `herb-start.css`, `shop-plan.css`. Round bubble
controls, light buttons keep dark text, no screenshots or stock pictures (the companion is drawn live, so it never shows an
old version of the app). The wordmark is the live `LOWiSPIKE` text, not an image.

## Release checklist (onboarding)

1. Did this release add, rename or remove anything a new person is told about? Update the copy (EN, DE, ES) and this file.
2. Did it change a control, a bubble name or a world? Controls are taught in the app (`misty-hints.js`, `misty-pad.js`, the tutorial), not before the account (21 Oct 2026, simpler conversion screens). Check the habit chips on screen 1.
3. Run `node --test tests/onboarding-current.test.cjs`.

## Replay tutorial (19 Oct 2026)

Settings > Tutorial replays a guided tour (`tutorial.js`, steps ONLY in `tutorial-steps.js`) as if the person were new, without touching their data. Its first step, for accounts that still have the standard Misty, opens the claim-your-own-companion step (owned by the own-companion work, `LowiBirthCompanion.claim` / `openCreator`). When onboarding copy changes, check that the matching tutorial step still says the same thing: every release's news.json names its `"tutorial"` step or `{"none": "why"}` (TUTORIAL.md).
