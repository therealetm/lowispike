# Cycle benefits audit: what women get today, and what should change

Audit only, done on 24 October 2026. No app files changed, nothing released, no account or database writes, no announcements or pushes. Owner: the cycle benefits audit task. It reads files owned by other tasks but changes none (2083c80b owns birthday and profile, f8fd0a5f owns Scan hold and the tutorial).

- **Code read:** origin/main at release 20261024-085600, in a separate read-only worktree (/home/sprite/wt-cycle-audit).
- **Live check:** https://therealetm.github.io/lowispike/. version.json showed 20261024-084818 at the start of the audit and 20261024-085600 at the end.
- **Highest proof rung:** Playwright WebKit with the iPhone 13 profile at 390x844, against the live site. It used the repo's test harness with a fake cloud and a throwaway browser with no account. The probe scripts and their output are in /home/sprite/cycle-audit. Nothing was tried on a physical iPhone or iPad.

## Bottom line

Tracking a cycle today gets a woman a pretty phase picture and some XP for logging, and nothing else. Her world, her Misty, her Move goal, her sunbeams and her tips don't change at all. The personalised tips are still in the code, but nobody can see them. One small gap works against her: on a low-energy or painful day, Misty looks weaker and earns less, and resting counts for nothing. There are also two privacy gaps. The XP history (ledger) shows on which days a period start was logged, and the only button that deletes cycle data is in a screen nobody can reach.

## What is live and reachable (build 20261024-085600)

- **Opt-in:** women (`gender === 'f'`) get an optional question during setup. To find it again, hold Community, open the profile hub and tap the My cycle tile (`LowiG2E` tile `.g2e-cycle`, live text "Day 8 · Grow").
- **Cell world sheet:** `cycle-world.js` `open()` / `paint()`. It shows the day, the phase name, one line of text, the next estimated start, the "started today / on a date" buttons, a hedge ("estimate from your dates") and Turn off. A live start 7 days ago showed Day 8, Grow, with three buds. It's a small SVG animation, not the playable world.
- **XP:** `index.html` `markStart()` → `giveSetupXP()` (+25 once) and `giveLogXP()` (+15 per log day). Live, XP went from 2400 to 2425 on setup. There's also a +50 weekly bonus for 7 days of logging in a row. The cell world only logs period starts, so nobody can reach that bonus in stage 1.

## Calculated but not visible

- **Phase tips and quests:** `LowiCycle.phaseNow()`, `LowiCycle.tips()` and `cycleInfo()` do return them. Day 8 gives the quest "Try one swap you've never made" and the tip "Energy is coming back… a bit more strength". They're only drawn into the old Home extras and the old Profile tab. Live, those nodes are hidden or sit under the world canvas: `#cyProf` is "covered by" the world layer and `#cyToday` isn't displayed. **Women see no personalised recommendation.**
- **Move phase badge:** `.cy-sessbadge` only attaches to `[data-r3a="play"]` session cards. The live Move page has none, so the badge never shows.
- **Old full sheet:** `LowiCycle.open()` has symptoms, mood, energy, a calendar, phase food, PCOS, settings, opt-in `cycle_sync` and Delete all. It only opens through the API. No visible control leads to it.

## World and Misty

- **No cycle code in the world.** There are no cycle references in `world-home.js`, `world-home.css`, `world-health-core.js`, `world-mood-core.js`, `sun-meter.js`, `care-board-core.js` or `move-bubble.js`. The only match in `world-home.js` is unrelated. There's no phase marker on Misty's bubble.
- **A low-movement day works against her (this affects everyone, but people with painful periods feel it most).** In `sun-meter.js` `energyNow()`, Misty's energy is 0.15 + 0.85 × (food 0.4 + water 0.3 + move 0.3). `move-estimate-core.js` counts Casual as only a third of the Move share and Rest as nothing. So a day that would be perfect except for Casual movement caps Misty's energy at about 0.83 instead of 1.0. It also gives fewer sunbeams and 5 XP instead of 11 (Steady) or 16 (Epic). A day spent resting with cramps reads as a lower-energy Misty. Already kind: `world-health-core.js` skips days with nothing logged, so quiet days aren't punished.

## Privacy and consent

- **Good:** `PRIVATE_KEYS = ['health']`. Cycle dates are taken out of the cloud backup (`snapshot()`), and the only sync is the opt-in `cycle_sync`.
- **Gap 1, the XP history gives it away.** `giveSetupXP()` and `giveLogXP()` write ledger entries labelled "Cycle set up" and "Cycle log", with dates, into `lowispike.v2`. The backup keeps the ledger, so for a signed-in user the cloud copy shows that she tracks and which days she logged a start. The XP toast ("+15 XP · Cycle log") is also visible on screen to anyone nearby.
- **Gap 2, no reachable delete.** Turn off in the cell world only calls `setShow(false)` and keeps the dates. Delete all exists only in the unreachable old sheet.
- **Who gets the question:** only `gender === 'f'` is asked. Trans men and non-binary people who have periods can't turn it on. Women who don't have periods (menopause, pregnancy, some contraception) are asked, which is fine because it's optional and can be declined. Opening the setting to anyone is a product decision for Emmanuel.

## Copy and evidence

- **Cell world copy:** symbolic and hedged. Fine.
- **Old copy in the `CY_PH` content:** states hormone levels and prescribes training by phase ("good time for strength", "strongest days"). The evidence doesn't support universal phase-based prescriptions. McNulty et al. 2020 (Sports Medicine, a meta-analysis of 78 studies) found only a trivial drop in performance in the early follicular phase, from mostly low-quality studies. It concluded that general guidelines can't be made and recommended a personal approach. The model also assumes ovulation at `len − 14`. A study of 612,613 real cycles (Bull et al. 2019, npj Digital Medicine) found an average cycle of 29.3 days and a follicular phase ranging from 10 to 30 days, so any phase shown is an estimate. Rewrite this content before surfacing any of it.
- **What is supported for comfort:** NHS (period pain) lists a warm bath or shower, a heat pad or hot water bottle, massage, gentle exercise (yoga, swimming, walking, cycling) and painkillers. A Cochrane review (2019, 12 trials, 854 women) found that exercise may reduce period pain, from low-quality evidence. This supports offering rest and gentle movement as choices. It doesn't support prescribing them by phase.

## Existing phase colours (for the Home marker)

| Phase | Cell world (`cycle-world.css`) | Old `CY_PH` | User asked for |
|---|---|---|---|
| Rest (Ruhen) | `--cw-rest` #f0839b, rose | #e0607a | red |
| Grow (Wachsen) | `--cw-grow` #55d6ad, mint | #3fbf9a | green |
| Glow (Leuchtend) | `--cw-glow` #f2c75e | #d9a640 | yellow |
| Gather (Sammeln) | `--cw-gather` #ad92f2 | #9b7fe0 | purple |

The colours already match what you asked for. Rest is a rose red. Conflict: Misty's "weak" state already shows as a red rim on the flat bubble and a reddish 3D membrane. A red rim or ring for Rest would read as "Misty is unwell". **Use a small separate dot, not a rim or a tint**, and reuse the `--cw-*` tokens so the cell world and Home always agree.

## First proposal: Gentle day, plus the Home phase dot

**1. Home phase dot (what you asked for).**

- **Look:** an 8–10 px seed sits on the edge of Misty's Home bubble (`#spBubble`) in the estimated phase colour. Light mode uses the light variants. There's no text on screen. The screen-reader label says "Cycle estimate: Grow, day 8" in en/de/es.
- **When it shows:** only when tracking is on and a start date exists, and only on her own local Home.
- **Where it never shows:** the galaxy or Circles companion, Community cards, the sync data, or the share image.
- **Control:** My cycle gets a switch "Show colour on Home", on by default after opting in.
- **Late periods:** if the period is more than 7 days late, the dot hides instead of guessing.
- **No side effects:** it doesn't change `data-misty`, Misty's face or the membrane colour.

**2. Gentle day (the benefit, with a playable world response).**

- **Where:** a fourth Move choice, "Gentle" ("Sanft", "Suave"), for everyone, with no reason asked. When the estimate says Rest, My cycle also offers "Want a gentle day?" as a button. It never switches on by itself, and the phase never decides what she can do.
- **Credit:** it counts as the full Move share for Misty's energy and the sun meter (`mq 4`), and earns Steady XP (11). It's one entry per day and replaces that day's step choice. The step ranges are already self-reported, so this opens no new way to cheat, and it needs no cap. That matters for people with endometriosis or chronic illness. The Care board shows the sunbeams, never the reason.
- **World response:** `html[data-gentle="1"]`. Misty gets a warm amber halo (not red) and floats slowly. Her face stays content rather than tired. The bloodstream particles slow down. The calm sound (`calm-sound-core`) only plays if she switches it on. With reduced motion, the halo stays still. It ends at midnight, or earlier with "Back to normal".
- **Practical support:** one line of comfort ideas, without medical claims: "Warm bath, hot water bottle, a short walk or stretch", with the NHS as the source.

## Acceptance checks for future implementation (390x844, WebKit iPhone 13 and Chromium)

**Phase dot**

- **Each phase:** with a woman, tracking on and a start 7 days ago, the dot is on the edge of `#spBubble`, uses the `--cw-grow` colour, is at least 8 px, and has the en/de/es label. A start today shows `--cw-rest`. Day 14 of 28 shows `--cw-glow`. Day 20 shows `--cw-gather`.
- **When it's missing:** there's no dot for tracking off, a man, prefer not to say, no start date, the Home switch off, or a period more than 7 days late.
- **Where it never appears:** there's no dot in the galaxy or Circles, on Community cards, or in the `snapshot()` or sync data.
- **Misty unchanged:** `data-misty`, the face and the membrane colour are unchanged, and the existing weak-rim test still passes. In light mode, contrast against the bubble is at least 3:1.
- **Stability:** there are zero page errors, and no style is written every frame when nothing has changed.

**Gentle day**

- **The choice:** the Move bloom shows "Gentle", "Sanft" or "Suave". Picking it writes one `move:est` entry (`lvl gentle`, `mq 4`, eventId `move:est:<day>:steps`) and gives +11 XP. Picking it again changes nothing, and it replaces Casual on the same day.
- **Credit:** `LowiSun.energyNow().parts.move === 1`, and the Care board day includes the full Move share.
- **World:** `html[data-gentle="1"]` is set, the halo is visible, flight runs at 60% of normal speed or less, Misty's face isn't tired just because of movement, and with reduced motion nothing animates.
- **For everyone:** it works for men and for women with tracking off, asks no reason, and "gentle" never shows on the board or in any cloud profile row.
- **Undo:** "Back to normal" restores the earlier state.
- **Quiet:** there's no push and no Community post.

**Privacy fixes**

- After `markStart()`, the `snapshot()` data contains no "Cycle" or "Zyklus", and the toast label is neutral.
- The cell world offers "Delete my cycle data" with a two-tap confirmation. Afterwards, `S.health.cyc.days` is empty and `LowiCycle.model().has === false`. Turning tracking back on afterwards works with no penalty.

## Ranked backlog (each one ships on its own)

1. **Privacy:** neutral ledger label and toast for cycle XP, and a reachable "Delete my cycle data" in the cell world. Small, and should ship first.
2. **Home phase dot,** as specified above.
3. **Gentle day,** with the Move choice and the world response.
4. **Fair cycle XP:** make the weekly logging bonus reachable, or swap it for a monthly "you kept your dates" reward.
5. **Rewrite the old phase content:** "many people notice…", no hormone or training claims. Then surface one tip in the cell world with "Did this fit? Yes / No" so it adapts to her.
6. **Stage 2 symptoms in the cell world, self-reported:** shows her own pattern ("you logged cramps on days 1–2 in your last 3 cycles") instead of population averages.
7. **Who can opt in:** a "Do you have periods?" switch open to anyone in settings. This needs Emmanuel's decision.
8. **Optional shortcut:** a long press on Gap or Meal break to open My cycle, as Emmanuel suggested on the call. It would sit alongside the Community hold, not replace it. This audit didn't check that the gesture is free.

## Sources

- McNulty KL et al. 2020, Sports Medicine: https://pubmed.ncbi.nlm.nih.gov/32661839/
- Bull JR et al. 2019, npj Digital Medicine: https://doi.org/10.1038/s41746-019-0152-7
- Armour M et al. 2019, Cochrane, exercise for dysmenorrhoea: https://doi.org/10.1002/14651858.CD004142.pub4
- NHS, period pain: https://www.nhs.uk/conditions/period-pain/
