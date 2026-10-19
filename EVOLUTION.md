# Companion evolution: forms, thresholds and power (Oct 19 2026)

Eman: "aus diesen kleinen Flossen kriegt er richtig dicke Dinger, kriegt er noch mehr Stein ... es soll immer heftiger werden".
Every form must look clearly more powerful than the one before, and the evolution moment must get stronger each time.

## Thresholds (unchanged, herb-config.js `stages`, total XP)

| form | XP | name | about when (active day = 80-150 XP: meals 15, moves up to 30, quests) |
|---|---|---|---|
| 1 | 0 | Spark | start |
| 2 | 100 | Glimmer | day 1 |
| 3 | 300 | Young Comet | day 2-4 |
| 4 | 700 | Bright Comet | about a week |
| 5 | 1500 | Radiant Comet | about two weeks |
| 6 | 3000 | Legendary Comet | about a month |

The first two evolutions come within the first days, so the escalation is felt early. `highestStage` keeps a form once reached.
The thresholds were kept on purpose: Forms unlocks, cosmetics and the world-home cell stages all read them.

## Power per form (companion-core.js `POWER`, pure SVG paths on top of the user's own generated cell)

| form (index) | fins/ears length x | thickness x | stones | stone size (xR) | horns (xR) | frame x |
|---|---|---|---|---|---|---|
| 0 | - | - | 0 | - | - | 1.22 |
| 1 | little nubs | - | 0 | - | - | 1.15 |
| 2 | 1 (first fins) | 1 | 2 | .07 | - | 1.08 |
| 3 | 1.3 + tail | 1.45 | 4 | .09 | - | 1.08 |
| 4 | 1.5 + wings + crest | 1.8 | 6 | .11 | .30 | 1.15 |
| 5 | 1.9 (capped .8R) + bigger wings x1.25/1.35, second wings, crown | 2.2 | 9 | .13 | .46 | 1.23 |

- frame: how much room the picture leaves round the body. Young forms sit small; later forms fill the frame with traits.
  Probe check (playtest/probe-evo-stages.cjs): no trait leaves the frame for four birthdays/elements; painted area grows
  about 45-75 % from form 1 to form 6.
- Stones sit on the rim (angles 75-285 deg from straight up, at 0.9R), never on the face.
- The user's own body, colours, name and face stay as generated. Home choices kept: no smile, mouth follows energy, no glow ring.

## Ten forms (Oct 19 2026, 10 PM: four more after Legendary)
Emmanuel reached Legendary (level 6, "Legend") during testing: "we need to add more evolutions ... it should really,
truly evolve into something majestic looking". Forms 7-10 follow, with longer XP steps (an active day earns roughly
80-150 XP, so Nova is about two weeks after Legendary and Majesty several months of steady use):

| Form | XP | Level name | Form name (companion-core) | What's new |
|---|---|---|---|---|
| 7 | 4500 | Nova | <element> Nova | a mane of blades round the upper body, a gold crown of 4 spikes, 11 stones, bigger wings |
| 8 | 7000 | Titan | <element> Titan | twin tails, a third pair of wings fanned between the others, 13 stones |
| 9 | 10000 | Monarch | <element> Monarch | a burst of power spikes behind everything, a second inner pair of horns, the tall 6-spike crown |
| 10 | 14000 | Majesty | <element> Majesty | a tilted ring of stars (far half behind, near half in front), golden edges on every piece |

- The body (cell-world.js) stops growing at form 6 (`CELL_R` 94); later forms grow in traits, and `POWER.frame` widens
  (1.27, 1.32, 1.40, 1.46) so nothing is cut off. `playtest/probe-evo-forms10.cjs` renders all ten and checks the frame.
- Evolving is XP only: no food, no Collection progress, no Catch. `herb-config.js` stages carry only id, xp and names.
- Earned progress is kept: retained `highestStage` and XP are untouched; anyone already past 4500 XP evolves on the next
  open (the moment plays the highest new tier once).
- Evolution moment tiers 6-9: gold rays (rose-gold at tier 8, white-gold at tier 9), double shake from tier 8, ray length
  and glow capped for small phones.
- The Forms path shows two rows of five; the four forms after Legendary have a gold tint.
- The look code (`1.<form>.`) now accepts forms 0-9.

## Evolution moment (herb-tamagotchi.js evolve, herb-tamagotchi.css #lhEvolution)

Tier t = the new form (1..5). The old form charges up for 0.5 + 0.22t s, shaking harder each tier, then a flash, and the new
form bursts in (overshoot 1.06 + 0.05t). Rays: 4 + 3t, longer each tier, gold at tier 5. Glow 0.9 + 0.18t. Tier 3+ shakes the
card. A power line names what is new (EN/DE/ES). Vibration gets one more pulse each tier. Stays up 7 + 0.7t s.
Reduced motion: only the new form, no charge, flash or rays. transform/opacity only, nothing in the 3D scene.
It waits while another dialog, sheet, setup, the tour or the Day card is open and shows once that closes.
