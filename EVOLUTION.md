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

## Body plan per form (Oct 21 2026 redesign, companion-core.js `ANATOMY`, alias `POWER`)

Eman: the old fins, armour stones and horns on a bubble were "boring ... not very Pokemon like ... you can really go big here ... like Digimon ... in our own design with cellular metabolic". Approved path: a simple glowing cell, then a swimming filament creature, then a many-limbed reef spirit, then a massive celestial organism with orbiting organelles. The user's own generated cell (face, colours, family palette) stays the luminous core at every form; the anatomy round it changes.

| Form | Phase | What it has |
|---|---|---|
| 1 Spark | cell | glowing core, a ring of cilia |
| 2 Bud | cell | more cilia, two daughter buds |
| 3 Sprite | first swimmer | one whip tail, small fins |
| 4 Drifter | filament swimmer | streamlined outer membrane, three tails, bigger fins |
| 5 Guardian | filament swimmer | five tails, double fins, dorsal membrane sail |
| 6 Radiant | reef spirit | eight glowing arms, coral crown (3 branches), frilled mantle |
| 7 Nova | reef spirit | ten arms, coral crown (5), bigger mantle |
| 8 Titan | celestial | giant bell with rim lights, twelve arms, two long filaments, three organelles on one orbit |
| 9 Monarch | celestial | two orbits, five organelles (mitochondria, nucleus-planets, vesicles), star corona |
| 10 Majesty | celestial | fourteen arms, four filaments, seven organelles, golden edges |

- Organelles passing in front stay at the sides, never over the face. Under a hat nothing grows on top of the head (no sail, no coral).
- `frame` (room round the body) never shrinks from one form to the next; tools/companion/evo-forms.cjs renders all ten in a browser and measures that every piece stays inside it.
- Pure SVG paths, no filters; motion is transform/opacity only and stops under Reduce Motion.
- Locked forms are never drawn: the Forms path shows a mystery orb, ??? and the XP needed, so every evolution is a reveal. Reached forms stay viewable.
- tests/evolution-anatomy.test.cjs covers the phases, counts, face clearance, clean SVG, locked forms, copy and motion.

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
