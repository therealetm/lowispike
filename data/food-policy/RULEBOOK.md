# LOWiSPIKE shared food-rating rulebook

Status: built in small released steps. Step 1 is live (see MAYA-HANDOFF.md for the verified build). Everything under
"Proposed" is not built. Nothing here has been reviewed by a dietitian; ratings are LOWiSPIKE brand rules plus an
estimate from label or photo numbers, never a measured insulin or blood-sugar response.

## Sources and their order

1. Master Knowledge (the custom GPT's v2 PDF; in the app as `master-knowledge.v3.md`). Binding.
2. Recipe Book (Stabil Insulin Meals, in the app as `recipe-book.v1.json`).
3. `NUTRITION-POLICY.md` (five-expert synthesis; a summary of public views, not a review of the app).
4. Older NOSPIKE files (CORE, FOOD ENGINE, HEALTH RISK ENGINE, EMPFEHLUNGSFREQUENZ, CONTENT ENGINE): only where v2/v3 is silent.
5. Owner decisions recorded in DECISIONS.md / MAYA-HANDOFF.md, dated.

Key passages used:
- v3 section 25: never judge a food from one nutrient number alone; plain yogurt's sugar is "its own milk sugar";
  honest uncertainty when data are missing.
- v3 section 39: the same food gets the same verdict on every screen; only the portion and the preparation can change
  it, and only as written (cheese above 30 g, berries above a handful, breading, sweet sauce).

## What the engine keeps apart

1. What the food is (category rules in `lowispike-policy.v1.json`, by name, label category and ingredients).
2. How much is eaten (`calculateServing`; a whole-pack label serving is not a serving, fix 20261028-152958).
3. Where the sugar comes from (step 1, `sugarSource`): added yes / no / unknown; "own sugar" only for a food the rules
   already call JA with a complete ingredient list and no added sugar or sweetener.
4. The LOWiSPIKE verdict (JA / SELTEN / NEIN).
5. A separate blood-sugar estimate (carb bands per serving), labelled as an estimate.

## Step 1 (implemented, shared product core: food-engine-core.js, spike-core.js, shop-scan-core.js)

- Own sugar (plain quark's milk sugar, a carrot's sugar) counts in full as carbohydrate, but the extra "15 g sugar per
  serving" trigger, which stands for fast added sugar, does not fire on it. Liquids keep their sugar bands.
- No blanket natural-sugar pass: juice, dried fruit, honey, sweet fruit portions are never JA, so their sugar is never
  "own sugar". A missing, unreadable or cut-off ingredient list means added sugar is "unknown" and nothing is relaxed.
- A food the rules call JA (a JA rule, nothing stricter, not provisional) is not turned into "Not insulin-friendly" by
  the Moderate carb band alone (v3 section 39). The card says it is an everyday food and names this portion's carbs.
- A Higher estimate still makes it not insulin-friendly (owner decision 24 Oct). For own sugar the card says this is
  about the amount, never "fast sugar".
- Card text: fibre is only named when there is some; "sugar gets into the blood quickly" only when sugar is at least
  half of the carbs; own sugar is described as own sugar / milk sugar with no sugar added.

Examples (per tests/rulebook-step1.test.cjs): plain quark 150 / 250 / 500 g insulin-friendly; 800 g (33 g carbs) not,
explained as amount. Carrots 150 / 250 g insulin-friendly, 500 g (35 g carbs) not. Fruit quark with sugar, bread,
juice unchanged.

## Food-analysis entry points (audit 28 Oct 2026)

| Entry point | Code path | Uses |
|---|---|---|
| Barcode scan short card (Scan, Log meal, Shop, Kitchen) | food-card-core model -> spike-core assess + food-engine scanFood | product core (step 1 applies) |
| Shop scan list, verdict + explanation | shop-scan-core verdictOf / explain -> spike-core | product core (step 1 applies) |
| Shuffle sort, store picks, Spike-catch dex, nutri stats, spirit | scan-sort-core, store-picks-core, spike-catch, nutri-stats, spirit -> spike-core / scanFood | product core (step 1 applies) |
| Typed name / database name, kitchen, gift basket, shop list by name | food-policy-core rateName, food-knowledge-core rateFood | name rules only, no nutrient estimate |
| Photo meal log | food-photo AI -> meal-result verdict: meal-photo bloodSugar (net-carb load score 20 / 40) + food-knowledge rateMeal | meal scale (different from product bands) |
| Community chat room photo | community-chat foodCard -> meal-result verdict + headline (same as photo log) | meal scale |
| Meal detail | meal-detail-core -> bloodSugar + rateMeal | meal scale |
| AI verdict block from the photo model | food-knowledge merge: can only make the verdict stricter | meal scale |

The chat room, photo log and meal detail already give plain quark at 150 / 250 / 500 g and carrots up to 500 g
"insulin-friendly" (checked 28 Oct). They use a different blood-sugar scale (net carbs minus fibre, protein / fat
damping) than the product card (available carbs per serving, 10 g / 30 g bands). So carrots 500 g read
insulin-friendly from a photo but not from a barcode. Aligning those two scales is the next step.

## Conflicts and unsupported numbers (not resolved by invention)

- NOSPIKE CORE "when unsure, rate stricter" vs v2 (removed). v2 wins; missing data = "can't rate" / provisional.
- Plantain: NEIN in v2, SELTEN in the older files. v2 wins.
- Quark is not named in v2 (only Greek yogurt and cottage cheese); the app's v3 lists it as JA. Kept JA.
- v3 section 39 (only written portion rules change a verdict) vs owner decision 24 Oct (a Higher estimate is never
  shown as fine). Step 1 keeps the owner decision for Higher and applies section 39 to Moderate.
- House numbers with no source in any knowledge file: carb bands 10 g / 30 g per serving, sugar 15 g per serving,
  liquid sugar 5 g / 10 g, plain-dairy sugar max 6 g per 100 g, meal load score 20 / 40, the 0 to 100 score.
- Frequency lines ("every day / 2-3 times a week / once a week"): no knowledge file has a frequency rule
  (EMPFEHLUNGSFREQUENZ was supplied but not located as a rule set in the repo); the owner asked for a number on 24 Oct, so
  they stay as owner wording and follow the final verdict.
- Photo AI prompt uses its own spike scale; it can only tighten.

## Proposed next steps (not built)

1. Step 2: one blood-sugar scale for product and meal paths (photo log, chat room, meal detail use the same bands and
   the same JA-at-Moderate rule as the product card), with cross-path tests on the same foods.
2. Step 3: name-only paths show an estimate with a clear "estimated" label when grams are known.
3. Step 4: "can't rate" instead of SELTEN when the photo AI cannot recognise the food.
4. Step 5: owner review of frequency wording; expert review of the test-food list.
