# LOWiSPIKE: Redesign Handoff (v9, final)

**For:** the app designer agent
**From:** Eman (owner) + Claude
**Visual reference:** `LOWiSPIKE-v9.pdf` (screens 00–16) and `LOWiSPIKE-v9-source.html` (exact styles, open it in a browser)
**Rule of thumb:** if this doc and the PDF disagree, the PDF wins on looks and this doc wins on behaviour.

---

## 0. The goal in one sentence

An 8-year-old and an 80-year-old can open any part of LOWiSPIKE and know in under one second **where they are, what the one thing is, and what they can do**, inside Eman's holographic bubble world.

---

## 1. Ten rules (do not break these)

1. **Home is untouched.** The galaxy, Misty and the bubble cluster stay exactly as they are now (screens 00).
2. **Bubbles are the interface.** Everything you tap is a round glass bubble. No tab bars, no menu bars, no hamburger menus, no top tabs.
3. **Every world has the same 4 zones**, always in the same spot:
   1. **Header (top left):** world bubble (46 pt) + title + one status line.
   2. **Hero (centre):** the biggest bubble (190 pt), and the **only** thing that glows.
   3. **Choices (below the hero):** **max 4** bubbles (74 pt) on a soft arc, a word under each.
   4. **Back (bottom centre):** one bubble (54 pt) with the **name of where it goes** under it.
4. **The X button is gone everywhere.** It's replaced by the back bubble: "Home" on level 1, "‹ Shop", "‹ Misty" etc. deeper. Swipe down does the same thing. Nothing ever closes more than one level.
5. **Max 3 taps from home to anything.**
6. **Colour = where you are.** Each world uses the colour of its home bubble. Status colours: mint = good, amber = careful. **No red for food or health.** Red only for "Delete account" and unread badges.
7. **Words under every bubble.** Icons never stand alone. Labels are 14.5 pt bold minimum; sub-labels 12.5 pt.
8. **One motion for everything:** tap a bubble and it glides to the centre and becomes the hero (spring, ~350 ms). Back glides it home.
9. **XP is the only currency.** Remove ☀ suns as a separate points system (see §7).
10. **Reward, never shame.** Misty can get dim, never sick or dead. No "fail" screens.

---

## 2. Design tokens

### 2.1 Background
- Worlds: `#08090E` with 2–3 soft diagonal light beams (white 5–7 % opacity), a few star dots, and 4 small floating "discs" (opacity .35), matching the home scene.
- Behind each hero: a radial **aura** (Ø 420 pt) in the world colour (see table), fading to transparent at 62 %.

### 2.2 World colours (glass tints)

| Token | Used for | Bubble base | Rim (1.5 pt inner stroke) | Aura |
|---|---|---|---|---|
| `glass` | neutral bubbles | rgba(46,58,98,.62) | rgba(150,175,255,.42) | rgba(120,140,220,.22) |
| `green` | Check, Log it | rgba(30,86,52,.66) | rgba(150,240,180,.60) | rgba(80,210,140,.34) |
| `blue` | Shop | rgba(40,60,130,.68) | rgba(160,185,255,.65) | rgba(90,130,255,.36) |
| `cyan` | Your body, water, VR | rgba(30,74,112,.66) | rgba(150,215,255,.62) | rgba(80,180,240,.32) |
| `coral` | Lounge | rgba(110,50,50,.62) | rgba(255,180,170,.60) | rgba(240,120,110,.30) |
| `mint` | Move | rgba(30,86,74,.66) | rgba(140,240,210,.60) | rgba(90,220,180,.30) |
| `lav` | Misty, sleep, Goodnight | rgba(70,58,124,.68) | rgba(200,185,255,.62) | rgba(150,120,250,.36) |
| `gold` | XP, rewards, ranking, AI | rgba(90,70,30,.66) | rgba(240,210,140,.70) | rgba(230,190,100,.32) |
| `dim` | off, locked, skip | rgba(40,44,60,.40) | rgba(170,180,220,.25) | none |

**Glass bubble recipe** (same as the home bubbles):
- Fill: base colour + a specular highlight `radial-gradient(circle at 32% 24%, white 32 % → transparent 24 %)`.
- Inner shadows: rim stroke 1.5 pt; inner glow at the bottom (`0 -12% 30% inner-colour`); soft top inner light (white 7 %).
- Drop shadow: `0 8% 30% rgba(0,0,0,.45)`.
- **Glow** (hero or active only): `0 0 40% <world aura colour>`.

**Image bubble** (food or product): the photo fills a circle (products: `contain` on #EDEBE6; meals: `cover`), with a glass gloss overlay on top: specular highlight + 1.5 pt rim + bottom inner glow.

### 2.3 Status & text colours
- Good / low spike: `#8FE6C8`
- Careful / medium spike: `#F5C27A`
- More careful / spikes: `#F5A27E`
- XP / gold text: `#F0CF7F`, light gold `#F7E2A2`
- Misty / now: `#C6B6FF`
- Text: white 100 % (titles), 62 % (subtitles), 55 % (sub-labels), 40 % (hints)
- Destructive: `#FF9D97`. Unread badge: `#FF7D78`.

### 2.4 Typography (Inter or SF Pro)

| Role | Size / weight |
|---|---|
| World title | 26 / 700, tracking −2.5 % |
| World subtitle | 15 / 500, 60 % white |
| Hero label | 22 / 700 |
| Hero sub-line | 15 / 500 |
| Bubble label | 14.5 / 700 |
| Bubble sub-label | 12.5 / 500, 55 % |
| List row title | 17–17.5 / 700 |
| List row sub | 13.5 / 500 |
| Section caps | 11.5 / 800, tracking 14 % |

Support Dynamic Type. Nothing below 12.5 pt.

### 2.5 Sizes & layout (iPhone 390 × 844 pt)

| Element | Size | Position |
|---|---|---|
| Header bubble | 46 | top 62, left 22 (title to its right, gap 14) |
| Hero bubble | 190 | centre x, centre y 318 |
| Hero label / sub | – | y 432 / 462, centred |
| Choice bubbles (4) | 74 | centres x 56 / 148 / 242 / 334, y 600 / 620 / 620 / 600 (a smile) |
| Choice bubbles (3) | 74–78 | x 80 / 195 / 310, y 606 / 622 / 606 |
| Primary choice | 96–100 | replaces the middle choice, glows green |
| Back bubble | 54 | bottom 22 + label under it |
| Tap targets | ≥ 44 | always |

---

## 3. Components (build once, reuse everywhere)

1. **`Bubble`** with props: `tint`, `size`, `icon`, `text`, `sub`, `label`, `labelSub`, `glow`, `fill%` (liquid level), `badge`.
2. **`ImageBubble`** with props: `src`, `fit (cover | contain)`, `glowColour`, `badge` (e.g. 👑, "5", "Mon"), `play` overlay.
3. **`MistyBubble`** with props: `size`, `ringColour`, `hue` (other people's Mistys), plus a **profile-photo badge** (small circle, bottom right, 2 pt dark ring).
4. **`WorldHeader`** with props: `tint`, `icon`, `title`, `subtitle`, and an optional right `Chip` ("Change", "Send").
5. **`ChoiceArc`**: lays out 3 or 4 Bubbles at the positions in §2.5.
6. **`BackBubble`** with props: `label` ("Home" uses the house icon; anything else uses the ‹ chevron).
7. **`GlassPanel`**: rounded 30 pt, for reading content (the body phase card, budget, playroom drawer). Use panels only where people read text.
8. **`SearchField`**: 52 pt pill with magnifier + mic.
9. **`Segmented`**: 3 options max (Week / Month / All time).
10. **`ActivityRings`**: 3 rings (Eat = gold `#F0CF7F`, Move = mint `#7FE3C4`, Water = cyan `#7FCDF5`), 9 pt stroke.
11. **`Avatar`**: profile photo circle. Fallback: initial on a soft gradient.

---

## 4. Navigation map (17 screens)

```
00 Home (unchanged)
 ├─ water / sleep / steps / first & last meal bubbles → quick log on home (unchanged)
 ├─ ⟐ → controller / autopilot (unchanged)
 ├─ 📷 camera  → 01 Check
 │                ├─ 02 Plate result      (back: Check)
 │                └─ 03 Product result    (back: Scan; loops back to the live scanner)
 ├─ ⏱ timer   → 04 Your body
 ├─ 🛒 cart    → 05 Shop
 │                ├─ 06 Find food         (back: Shop)
 │                ├─ 07 This week         (back: Shop)
 │                ├─ 08 Your list         (tap the hero; back: Shop)
 │                └─ From others          (same layout as 06, filtered to community finds)
 ├─ 💬 chat    → 09 Lounge
 │                └─ 10 Playroom (drawer) → 11 Ranking → 12 VS
 ├─ 🏃 steps   → 13 Move
 └─ Misty      → 14 Misty
                  ├─ 15 Food-Dex
                  ├─ History · Worlds · Goodnight (same world layout)
                  └─ profile photo (top right) → 16 Settings → Your details
```

---

## 5. Screen specs

### 01 · Check (camera bubble)
- Header: green · photo · "Check your food" / "Spike or not, in seconds".
- **Hero:** green bubble "Take a photo". Label "Photo of your plate" / "Misty checks it for you".
- Choices: **Barcode** (sub "products") · **Gallery** · **Type it** · **Deep check** (gold, sub "GPT", opens the LOWiSPIKE GPT in ChatGPT).
- Back: Home.

### 02 · Plate result
- Header: verdict colour · "Low spike" / "Your blood sugar stays calm". Medium → amber "Medium spike"; High → amber/peach "Spikes", with copy that never shames.
- **Hero:** the user's photo in an ImageBubble with a mint (or amber) glow.
- Label: dish name. Sub: "● Low spike · 12 g carbs · 38 g protein".
- Choices: **Retake** · **Log it** (primary, 96 pt, green glow, label "+120 XP", sub "goes to your day") · **Not sure?** (gold, sub "Deep check").
- **Removed:** "Better: add a salad" (the AI only reports what it sees) and "To my list".
- Log it → +XP animation (gold particles fly into the back bubble), adds the meal to the day, starts the 04 Your body timer, and adds the food to the Food-Dex.

### 03 · Product result (live barcode)
- Header: blue · scan · product name / "brand · size · price".
- **Hero:** product ImageBubble (contain), mint/amber glow. Label "● Low spike" / one portion hint.
- If nobody has logged this product before, show a gold pill: "👑 First find! Nobody had this yet".
- Choices (2): **Skip** (dim, sub "next scan") · **Log it** (primary, label "+150 XP", sub "50 + 100 legendary").
- Logic: Log → XP + the product is published to **Shop → From others** (tagged with store + finder) + Food-Dex entry. Then return immediately to the live scanner. Skip → back to the scanner.
- Back: "Scan".

### 04 · Your body (timer bubble)
- Header: cyan · clock · "Your body" / "4 h 00 min since your last meal".
- **Journey (top half):** a winding dotted path bottom → top with 6 stops: Sugar rises (0) → Sugar peaks (30 min) → Insulin brings it down (1–2 h) → **Insulin low (now)** → Liver takes over (8 h) → Fat burning (12 h). Done stops are mint ✓, future stops are dim 🔒 with "in X h", and the travelled path is a mint→lavender gradient.
- **Misty sits on the current stop** (80 pt, lavender ring + glow) with the label "MISTY IS HERE / Insulin low / now · 4 h".
- **Phase card (GlassPanel, bottom):** title + "NOW" pill + 🔊 (Body sound reads it aloud), the mini curve with a dot at now, a 2-line explanation, "Typical, not measured." and one "Lower the spike" tip.
- Tap any stop → the card shows that phase (the content from the old 5-page "After your meal" carousel + the "Typical markers" list).
- Journey XP follows the existing rule: hourly fast XP stops at 16 h (`CAP_H`), so longer fasts earn nothing extra.
- Back: Home.

### 05 · Shop (cart bubble)
- Header: blue · cart · "Shopping" / "Lidl · €80 a week" + chip **Change** (store + weekly budget).
- **Hero:** basket bubble with up to 3 product thumbnails. Label "Your list" / "4 things · about €9.09". Tap → 08.
- Choices: **Find food** · **This week** (sub "plan & prep") · **From others** (product image, badge = new finds count) · **Send list**.
- **No scanner here**; scanning lives in Check.

### 06 · Find food
- Header: blue · search · "Find food" / "Lidl · best first". Search field (typed or spoken), e.g. "meat".
- Results = **one ranked scale, best on top**. A vertical gradient bar on the left (mint → amber → peach). Each row: emoji or product bubble (58) · name · "**Best** · €4.49 · 0 g carbs" (the rating word is coloured: Best / Great / Good in mint; OK / Spikes in amber) · ＋ bubble.
- A dashed divider where it changes from mint to amber.
- ＋ → the item flies into the list (back bubble pulses).
- Back: Shop.

### 07 · This week (the weekly planner; replaces the Fakeaway Week challenge)
- Header: blue · calendar · "This week" / "Theme: Fakeaway Week 🍔" (the theme can change weekly).
- Day bubbles M–S (today glows). Under them, the day's meals: Morning / Midday / Snack / Evening with a bubble, name and time/portion. "Left over from yesterday" stays as a sub-line.
- GlassPanel: budget ring "€77 of €80 · 24 things for the whole week".
- Primary pill: **Add the week to my list** (one tap).
- Back: Shop.

### 08 · Your list
- Header: blue · list · "Your list" / "Lidl · 4 things · about €9.09" + chip **Send**.
- Grouped by aisle (caps headers). Each row: check bubble (done = green ✓ + strikethrough) · product bubble · name · quantity.
- Primary pill: **Send to someone** (share sheet / link).
- Back: Shop.

### 09 · Lounge (chat bubble; replaces Chat, Circle, For You and People)
- Header: coral · chat · "Lounge" / "● 5 here now" + an avatar stack (photos, mint ring = here now).
- **Top panel (TV):** For You feed, vertical swipe inside the panel. Pill switch **For You | Watch together** (Watch together plays a YouTube link for everyone in the Lounge, in sync). Overlay: creator · dish · "● Low spike · 25 min" · **Save** bubble only. **No likes, no comments, no "to list".**
- **Bottom:** the group chat (avatar + name + bubble), own messages right-aligned in coral glass.
- Input row: **Playroom door** (gold bubble, label "Playroom") · message field · mic.
- Back: Home.
- Privacy: a "Show me as here" toggle in Settings → Privacy (default on). Presence shows only a count + small avatars, never a "watching you" list.

### 10 · Playroom (drawer from the door, like iMessage apps)
- A gold-tinted glass drawer slides up over the chat (the chat stays visible above it).
- 4 bubbles: **Billiards** (+60 XP) · **Ranking** ("you're #1") · **Swipe** (pick dinner) · **Shuffle** (surprise meal).
- Swipe down or back closes it → Lounge.

### 11 · Ranking
- Header: gold · crown · "Ranking" / "This month · Week · All time" (tap to change).
- Podium: 3 MistyBubbles (#1 biggest + crown + gold glow), each with a profile-photo badge, name and XP.
- Rows 4–6: rank + ▲▼ movement · small Misty + photo badge · Misty name · XP.
- Hint: "Tap anyone to go head to head" → 12.
- Removed: "XP / Forever / How it works" chips (How it works becomes one line in Help).

### 12 · VS (Eman's original design, cleaned)
- Two MistyBubbles + profile badges, gold italic **VS** between them, names + "owner · Lv".
- Segmented: Week / Month / All time.
- Score: big numbers left (gold glow if leading) and right + **tug-of-war bar** (blue ↔ coral).
- Gold pill: "Ahead by 83 XP · 12 days left".
- **4 comparison rows only:** Meals logged · Moves · Water · Full-sun days (bars grow outward from the centre).
- "Profile ›" link. Back: Ranking.
- **Removed:** the Week / Month / All-time rows (duplicates of the switch), the Level row (already under the name), Scans and Fasting (keep them on the profile).
- **Animation:** Mistys slide in from both sides → VS pulses once → the bar fills from the centre → numbers count up (600 ms). Plays once, not looping.

### 13 · Move (steps bubble)
- Kept as designed. Header: mint · walk · "Move" / "10,240 steps today · Epic ✓".
- **Hero:** Walk & Lift (5 min) · "Best right after eating".
- Choices: Mirror (new) · Desk 3 min · Seated 8 min · In bed 6 min.

### 14 · Misty (tap Misty)
- Header: lavender · "Misty" / her current line ("Feed me something green 🥒"). **Top right: the user's profile photo → Settings.**
- **Hero:** Misty inside **ActivityRings** (Eat / Move / Water). All 3 closed = a **full-sun day**.
- Label "Level 7 · Nova · #1". Sub: ring status coloured per ring.
- Choices: **Food-Dex** (gold, count) · **History** · **Worlds** (cyan, "look & aura": Look + Growth + Aura shop + Adventure unlocks merged) · **Goodnight** (lavender, "day recap": shows the day's recap, then puts Misty to sleep).

### 15 · Food-Dex
- What it is: the user's personal collection of **every food and product they log**. **No limit**; it grows forever.
- Header: gold · honeycomb · "Food-Dex" / "142 foods collected · no limit". Search field. Filter chips: All · Snacks · Meals · 👑 Legendary.
- Body: Apple-Watch-style honeycomb of ImageBubbles (80 pt), scrolls vertically with fading top/bottom edges. 👑 badge + gold glow = the user found it first. Lavender glow = rare.
- Tap a bubble → detail: photo, spike rating, first logged date, who found it first.
- Footer hint: "Every food you log lands here. Be the first → 👑 Legendary."
- Back: Misty.

### 16 · Settings (profile photo on Misty)
- Hero: the profile photo (118 pt, gold ring) · name · "Photo, name, body, goals, account" → Your details.
- 6 setting bubbles (glow = on): **VR** · **Language** · **Alerts** · **Privacy** (quiet hours, "Show me as here") · **Invite** (+200 XP) · **Calm** (less motion).
- Footer links: Help (tutorial, eBook, how ranking works) · Feedback (merged with the inbox) · Pay what you want · About (includes the Circle rules) · Delete account.
- **Your details** (list layout is fine here): Weight · Height · BMI · Weight journey · Photo · Name · Birthday · Gender · Goals (chips) · Health notes · Blood pressure log · Private health details · Email · Password.
- **Removed:** Personality type, Community order, VR as a separate list row (now a bubble), Body sound (now 🔊 in Your body), Look & Aura row (now Misty → Worlds).

---

## 6. Feature audit: apply these

| Feature | Decision | New home |
|---|---|---|
| Home quick-log bubbles (water, sleep, steps, first/last meal) | Keep | Home |
| Home bubbles Supermarket / Snack shelf / Baskets | **Cut** | cart bubble |
| Check (barcode, photo, gallery, type, deep analyze) | Keep | 01 |
| Supermarket | Merge | 06 Find food |
| Snack shelf | Merge | Shop → From others |
| Baskets (pay someone's groceries) | **Cut for now** | (no users yet, payment risk) |
| Fridge / Table / plate game | **Cut** | – |
| Fakeaway Week challenge | Move | 07 This week (theme) |
| Recipes (82) | Move | 07 meals + Save in For You |
| Products tab | Merge | 06 |
| eBook | Move | Settings → Help |
| Billiards / Swipe / Shuffle | Move | 10 Playroom |
| Ranking tab + chips | Move | 10 → 11 → 12 |
| For You likes / comments | **Cut** | only Save |
| Post / My posts | Keep | Lounge + profile |
| People list / "online right now" | Merge | Lounge "5 here now" |
| Chat | Keep | 09 |
| Move workouts, Mirror mode, Deadlift | Keep | 13 |
| Misty Today / what's missing / weekly goal | Merge | 14 rings |
| History (yesterday / week / month / year) | Keep | Misty → History |
| Look, Growth, Aura shop, Adventure unlocks | Merge | Misty → Worlds |
| Journeys (to Pancreas) | Merge | 04 journey |
| After your meal (5 pages + markers) | Merge | 04 card |
| Your day recap / My day | Merge | Goodnight |
| XP + ☀ suns | Merge | XP only |
| Body sound | Move | 04 card 🔊 |
| Feedback inbox | Merge | Feedback |
| Circle rules | Move | About |
| Personality type | **Cut** | – |
| Community order | **Cut** | – |

---

## 7. Logic changes

- **One currency: XP.** Every earn shows "+N XP". The old ☀ count becomes **Full-sun days** = days with all 3 rings closed (a streak stat, not points). Ranking and VS use XP.
- **XP table (starting point):** plate logged +120 · product logged +50 · first find (legendary) +100 · Billiards +60 · invite +200 for both. Tune later.
- **Product logging → community:** a logged product becomes visible to everyone in Shop → From others, tagged with store and finder. The first person ever to log it gets 👑.
- **Food-Dex:** every logged food or product adds a unique entry. Duplicates only increase a count.
- **Your body:** the timer starts at the last logged meal (or the Last meal quick-log). XP keeps the existing 16 h cap (`CAP_H`). Never reward fasting longer.
- **Spike rating scale** (used in Result, Find and Food-Dex): Best · Great · Good (mint) → OK (amber) → Spikes (peach). Never red.

---

## 8. Motion

| Moment | Motion |
|---|---|
| Open a world | the tapped home bubble scales up and glides to the hero position; the other elements fade in (stagger 40 ms) |
| Choose a choice bubble | it glides to the centre and becomes the next hero |
| Back | the reverse glide |
| Hero idle | slow "breathing" scale 1.00 → 1.02, 4 s loop (off in Calm mode) |
| Log it | gold particles fly from the hero into the back bubble, then "+120 XP" floats up |
| Add to list | the item bubble flies into the back bubble ("‹ Shop") and it pulses |
| Playroom | the drawer slides up with a spring; the chat dims to 55 % |
| VS | slide-in → VS pulse → bar fills from the centre → numbers count up (plays once) |
| Ring closed | the ring completes with a short glow sweep; all 3 → Misty glows (full-sun) |

**Calm mode** = no idle motion, crossfades instead of glides.

---

## 9. Accessibility

- Tap targets ≥ 44 pt. Labels ≥ 14.5 pt bold, nothing below 12.5 pt; support Dynamic Type.
- Colour is never the only signal: always a word ("Low spike", "Best", "now").
- VoiceOver label = the bubble label + its sub-label.
- Contrast: white text on glass ≥ 4.5 : 1. Sub-labels can be lower, but they're never the only information.

---

## 10. Acceptance checklist (the agent ticks every line)

- [ ] Home looks exactly as before.
- [ ] No X buttons anywhere; every screen has a back bubble with the destination's name.
- [ ] Every world has the 4 zones in the same spot.
- [ ] Max 4 choice bubbles per world; only the hero glows.
- [ ] Every bubble has a word under it.
- [ ] No scanner in Shop. No likes/comments in For You. No "Better" or "To my list" on the plate result.
- [ ] Barcode flow: Skip / Log it → back to the scanner; first find shows 👑.
- [ ] Lounge = For You panel + chat + presence + Playroom door. Watch together works.
- [ ] VS shows exactly 4 comparison rows and animates once.
- [ ] Misty has 3 rings; full-sun day = all 3 closed.
- [ ] XP is the only currency in the UI.
- [ ] Profile photos appear in Ranking, VS, Lounge and Settings.
- [ ] Every Cut / Merge / Move in §6 is done.
- [ ] Calm mode removes idle motion.

## 11. Do not

- Don't add tab bars, side menus or extra top-level bubbles.
- Don't put more than 4 choices in a world.
- Don't use red for food or health states.
- Don't show Misty sick, dead or crying.
- Don't add new features while applying this. Ship this first.

---

## 12. Repo rules this redesign must respect (from `AGENTS.md` / `MAYA-HANDOFF.md`)

- Follow the startup sequence in `AGENTS.md`. Work in **one worktree and one branch per slice**, and release each slice on its own with `scripts/release.sh` + `news.json` (tutorial step or `{"none": …}`). Use `--quiet` only for pure bug fixes.
- All new copy in **EN / DE / ES**. Update `tutorial-steps.js` and `ONBOARDING.md` whenever a slice changes what a new person sees.
- The test count only goes up. Add tests for every slice; never skip or delete one.
- Grandma rule stays: **Home bubbles keep symbols/numbers only** (Home is untouched in this redesign). Bubbles inside a world are "bloom" bubbles, so they keep short labels (rule of 24 Oct 2026); this design puts the label under the bubble.
- Keep the existing evolution stages and level names (`world-home-core.js` STAGES). The mockups show "Level 7 · Nova" only because the live app shows it.
- Medical boundaries stay: qualitative education only, "Typical, not measured", no numbers that pretend to be measured.

### Decisions the owner must confirm before those slices are built (log them in `DECISIONS.md`)
1. **XP only**: should the ☀ sunbeams / sun-meter stop being a separate currency? (Proposal: they become "full-sun days" = all 3 rings closed.)
2. **Baskets / Give a hand** (`gift-basket*`): cut for now?
3. **Fridge / Table / plate game**, **Personality type**, **Community order**: cut?
4. **⟐ bubble**: confirm it's the controller / autopilot and stays.

### Suggested release order (one user-visible change each)
The owning modules listed here are guesses from file names; check them against `ARCHITECTURE.md` and `SCREEN_MAP.md` before editing.

1. **Back bubble with a label** instead of X everywhere (`bottom-close.js/.css`).
2. **Plate result**: Retake · Log it · Not sure? (remove "Better" and "To my list") (`meal-result.js`).
3. **Barcode result**: Skip / Log it, first find 👑 → community shelf (`shop-scan*`, `grocery-hunt*`, `snack-shelf*`).
4. **Shop world** + **Find food** ranked scale + **Send list** (`store-picks*`, `shop-plan*`, `cart-core.js`).
5. **This week** planner from the Fakeaway challenge (`challenge-week*`, `fakeaway/`).
6. **Lounge**: For You panel + chat + presence (`community-chat*`, `foryou*`, `people-directory*`).
7. **Playroom** door with the games + Ranking (`circle-games*`, `room-table*`, `swaflo*`).
8. **Ranking + VS** cleanup and the once-only animation (`ranking*`).
9. **Your body** journey + phase card (`body-trips*`, `after-meal-checklist*`, `fast-bubble*`).
10. **Misty** rings + Worlds merge + Goodnight recap (`misty-hub*`, `day-recap*`, `sun-meter*`).
11. **Food-Dex** (new, built from the logged foods and scans).
12. **Settings** as bubbles + profile photo (`home-settings-sleep-v2*`).
