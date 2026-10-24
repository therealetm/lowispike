# LOWiSPIKE nutrition policy (binding for every text in the app)

Source: Emmanuel's nutrition audit of five experts (Bikman, Jamnadas, Fung, Dr. Boz, Glucose Goddess), sent Sat 24 Oct 2026
with the words "Update this bc it's wrong" about the Gap cards "After eating". From that day on this file is the content rule
for every user-facing text: Gap / after-eating cards, spike tips, scanner and food-engine texts, tutorial, voice lines,
creator scripts, bot posts, Cook and Shop. Read it before you write or change any food, health or fasting text.
Tests that guard it: `tests/gap-meal-curve.test.cjs` (cards), `tests/nutrition-policy.test.cjs` (app-wide phrases).

## The core

The useful core all five agree on: cut refined sugar and starch, build meals around protein and non-starchy vegetables, no
liquid sugar, no constant snacking, move after eating, and treat cravings and energy crashes as a useful signal.

LOWiSPIKE is an app for food choices, not a medical protocol. Never diagnose; use "possible risk" language only.
Rate sugar, flour, rice, pasta, soft drinks and juice strictly, especially with insulin-resistance or craving patterns.

## What goes in

1. Strict on fast sugar and starch: sugar, flour, bread, rice, pasta, potatoes, cereal, juice, soft drinks, sweets.
2. Protein first: eggs, fish, chicken, turkey, lean beef, Greek yogurt, cottage cheese. It fills you up, less snack hunting.
3. Non-starchy vegetables as the default: cucumber, salad, peppers, broccoli, zucchini, spinach, mushrooms, cabbage.
4. No liquid sugar: juice, smoothies, sweet coffee drinks, soft drinks.
5. No health halo: keto, protein, vegan, gluten-free, zero sugar, no added sugar, organic are not an automatic pass.
6. Craving-aware: when someone says "I can't stop", never suggest "just have a little". Ultra-processed, super-tasty food is
   rated stricter, and gets no small-portion tips.
7. Order: veggies, protein and fat first, starch and sweets last.
8. A 10-minute walk after carb-heavy meals. It helps; never "it helps most".
9. Sweets as dessert right after a meal, never as breakfast or a snack on their own.
10. Eat earlier, no starch in the evening: a general tip, never a strict rule.

Also good: a savory first meal of the day; no "naked" carbs; whole fruit instead of juice, smoothies or dried fruit; vinegar only
as optional ("may help a little for some people"), never a hack that fixes a meal; a CGM only as an optional learning tool, never a
diagnosis. Type 2 diabetes: say "remission", never "cure" or "Heilung". Calories do count, and food quality counts too.

Fasting only gentle and optional, no long fasting protocols (and not with pregnancy, diabetes medication, eating-disorder risk,
frailty, kidney disease or risk of low blood sugar). The medication line ("On insulin or diabetes medication? Talk to your care
team first") stays wherever food or movement advice is given.

Belly fat, cravings, tiredness after carbs and frequent snacking are a possible risk signal (not a diagnosis): rate sugar, flour,
rice, pasta and juice stricter.

Sardines and canned fish: a food option, but histamine-relevant for some; never a mono diet or a challenge. LOWiSPIKE's pork rule
still applies. Grapes, banana, mango and dates are sugar-rich: rate them strictly.

## What stays out

- Keto heals or reverses chronic disease
- Insulin is the cause of everything
- Calories don't matter (and also: only calories matter)
- Long fasting protocols; fasting is superior
- Sardines-only challenge; carnivore is best; keto for everyone
- Fiber is unnecessary
- LDL doesn't matter
- Seed oils are poison (focus on ultra-processed and deep-fried food instead)
- Mold or toxin detox against heart disease
- Exogenous ketones = fat burning; ketones heal Alzheimer's, Parkinson's or depression
- Methylene blue for the brain; supplements as a mandatory protocol; anti-spike supplement products
- Starving cancer with keto
- Healing PCOS or fertility with glucose hacks (PCOS and insulin resistance only as risk context)
- Glucose spikes as the cause of ADHD, dementia, depression, PCOS or infertility
- Calcium supplements are always bad (no medical advice)
- **Resistant starch makes rice, pasta or potatoes LOWiSPIKE-friendly.** Cooked-and-cooled rice or potatoes are WRONG for
  LOWiSPIKE; rice, potatoes and pasta stay strict. No "smaller carb portions" tip for them either: swap them for veggies and protein.

## Truth table (short)

- Refined carbs and sugar raise glucose and insulin more than protein and fat: true, core.
- Protein and vegetables fill you up: true, core.
- Juice and smoothies are not healthy sugar: true, core.
- Eating order lowers the spike: true, tip.
- A 10-minute walk after eating: true, tip.
- Vinegar can dampen the glucose response: partly, optional tip.
- Low carb improves diabetes numbers: true, but medical, general info only.
- Type 2 diabetes remission is possible: true, say "remission".
- Sugar-free or diet products are automatically fine: false for LOWiSPIKE, stay strict.
- Whole fruit is better than juice: true, use it.

## Positioning

A food scanner that helps you avoid fast sugar and starch loads, calm cravings, build satisfying junk-food remakes and steady
your energy, without diagnosing disease, prescribing fasting or keto, or selling supplements.
Claim: "Smarter eating. Same pleasure. Fewer crashes. Better cravings control."

## Applied on 24 Oct 2026 (what changed in the app)

- Gap, "After eating" cards (`gap-view.js`, EN/DE/ES, and the recorded voice lines): cooled rice / potatoes and "smaller carb
  portions" are out, replaced by "Swap sugar, bread, rice, pasta and potatoes for veggies and protein"; "No naked carbs"; vinegar
  is "Optional ... may help a little for some people"; the walk is "A 10-minute walk after eating helps" (no "helps most");
  "Water, no liquid sugar", "Sweets only as dessert", "Whole fruit, not juice"; a savory first meal; "eat more earlier, a light
  dinner without starch" as an if-it-suits-you tip. The medication caution stays.
- Spike tips (`herb-shop.js`): "Water helps your kidneys clear extra sugar" (not a fit claim) became "Water instead of juice or
  soda: no liquid sugar"; the vinegar tip is optional.
- Scan card, "Skip it" (`food-card-core.js`, `food-knowledge-core.js`): "Eating it anyway? A small portion right after a meal"
  became "Right after a meal, never on its own, then a ten-minute walk" (no small-portion tip for a Skip-it food).
- Swap "cauli_mash" (`food-assess-core.js`): no "small portion of sweet potato", now cauliflower or celeriac mash.
- Checked and left as they are: the fasting stages (hedged: "may", "maybe", "not a promise", medication line), PCOS mode (risk
  context only), the cycle food (already strict), the scanner tier names (Everyday / Small portion / Skip it are the rating
  scale, not a craving tip). Scoring logic needed no change: nothing rated cooled rice better.
