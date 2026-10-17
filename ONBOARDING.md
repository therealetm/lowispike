# Onboarding: what a new person sees, and what each line is based on

E-man (Oct 17, 2026): always check that the onboarding is up to date with the newest changes: "the style, how it looks,
the design, the logos, the pictures you use, the wording, the explanation, everything."

This file is the source of truth for the first-run flow. `tests/onboarding-current.test.cjs` reads it and the code, and
fails when they drift apart. **Every release that changes something a new person would see or be told must update this
file and the onboarding copy in the same commit.**

## The flow, in order

| # | Screen | Code | Explains | Based on |
|---|--------|------|----------|----------|
| 1 | Language + "A being of light is waiting for you" | `herb-start.js` step 0 | companion has no name/face until the birthday | `companion-birth.js` |
| 2 | "Your habits are its energy" | `herb-start.js` step 1 | Shop & scan, Meals, Water, Move, Fasting fill its energy; tired days = rest | `shop-scan.js`, Home bubbles, `adventure.js` energy gate |
| 3 | "How you play" | `herb-start.js` step 2 | controller, 3 taps autopilot, tap bubbles, cell world + spirit world, barcode estimate | `misty-pad.js` hints, `misty-hints.js`, `cell-world.js`, `spirit-core.js`, `shop-scan-core.js` |
| 4 | Your name | `herb-start.js` step 3 | it learns your name | `LowiHerbIdentityCore.cleanName` |
| 5 | First reward | `herb-start.js` step 4 | first XP, spirit world where companions meet | `firstReward()` |
| 6 | Add to Home Screen + account | `index.html` gate (`LowiA1`, `R2`) | iPhone install, Google/Apple/email sign-in | `index.html` (LOWI_CLOUD) |
| 7 | Setup 1: birthday | `index.html` `paintOb` step 0 | birthday gives the companion its face and name | `companion-birth.js` |
| 8 | Setup 2: photo | `paintOb` step 1 | optional avatar | |
| 9 | Setup 3: goals | `paintOb` step 2 | what you want most | `S.profile.goals` |
| 10 | Setup 4: grocery shopping | `paintOb` step 3, `shop-plan.js` | the person TYPES how often they shop; weekdays + shop optional; Later skips | `shop-plan-core.js` |
| 11 | Starter plan (optional) | `herb-start.js` `ivOpen` | up to 4 optional questions, first steps on Today | `starter-core.js` |

Existing users never see this flow again (`S.setupDone`). Their shopping rhythm is set or changed in
Profile > About you > Grocery shopping (`shop-plan.js` card), never forced.

## Facts the copy must keep true

- **Shopping rhythm:** only the number the person typed (1 to 60 days). No default, no guess. Missing a shop never means
  someone ate badly. Stored in `lowispike.shopplan.v1`; read it through `LowiShopPlan` / `LowiShopPlanCore` only.
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
2. Did it change a control, a bubble name or a world? Check screen 3 ("How you play").
3. Run `node --test tests/onboarding-current.test.cjs`.
