# LOWiSPIKE screen and flow map

## Global shell

The app is a single document with a persistent header and bottom navigation. The center Scan control has the companion bubble above it. The header avatar opens Profile; the atmosphere button controls visual appearance. A primary tab is a game screen, while secondary material opens in a bottom sheet or focused full-screen layer.

On phones, essential content should fit between the safe-area header and bottom navigation. Tablet/desktop may retain multi-column or longer layouts. The bottom navigation must never cover tappable content.

## Primary destinations

### Today (`tab-home`)

Purpose: show the user's living status and one clear next action.

Phone hierarchy:

1. Compact living-herb strip with stage, name, zodiac treatment, XP progress, and one current line.
2. Date/greeting.
3. Daily Quest board with the next unfinished quest.
4. Fasting card when active.
5. Six compact entry tiles: Check-ins, Meals, Your plate, Medicine, Shopping, Extras.

Secondary content opens through `LowiG2H` sheets. “All quests” is a sheet. The herb strip and floating Scan bubble represent the same companion; never show two creatures.

States: first-time/onboarding, signed out, no active fast, active fast, all quests complete, evening close-day invitation, storage unavailable, and update/install notice.

### Community (`tab-foryou`)

Inner sections are Chat, For You, and Leaderboard. Their order may be customized.

- Chat: internally scrolling message list, replies, mentions, reactions, member profiles, and composer above the bottom navigation.
- For You: intentionally scrollable media/feed surface and unified New Post sheet.
- Leaderboard: compact current progress, period selector, podium, visible ranks, Full ranking sheet, and Unlocks sheet.

Demo bots are local examples only. They must stay visibly non-deceptive and must never be uploaded as real community content.

States: offline/local fallback, loading cloud data, empty feed, blocked/hidden items, own post actions, media upload failure, and signed-out account gate.

### Scan (`tab-scan`)

Purpose: one obvious capture surface, not multiple competing scanners.

Phone hierarchy:

1. Heading and brief promise.
2. Product/Pokédex progress summary.
3. Unified capture card with explicit Barcode and Meal photo modes.
4. In Barcode mode: camera, photo-of-barcode fallback, manual number entry, and typed product search remain reachable.
5. Recent/community catches in a bounded secondary region or detail sheet.

Product results open as detail sheets. Barcode lookup checks the app/Supabase catalogue and may fall back to Open Food Facts. A completed real scan emits one care/reward event; opening the scanner or switching modes does not.

States: camera not requested, permission granted, permission denied, no camera support, decoding, lookup, not found, insufficient label evidence, result, reported/caught, offline, and manual entry.

### Cook (`tab-shelf`)

“Shelf” is the internal module name; the user-facing destination is Cook.

Phone hierarchy:

1. Preparation choice: Cook/Bake or Buy.
2. Category choice: Meals or Sweet snacks.
3. Clear input/action describing the result, never the unexplained internal word “Swaflo.”
4. Shuffle result hero.
5. Secondary tiles: Swipe foods, All recipes, My Recipe Book, By ingredient, LOWiSPIKE GPT, plus saved/current piles when populated.

Shuffle must cycle through multiple real candidates and settle visibly. Reduced motion may skip the reel but must still show a clear result change. Recipe and ingredient details open in sheets; cooking mode is a focused step experience.

States: empty query, no complete adaptation, Cook result, Buy result, sweet-snack result, shuffle in progress, settled result, no candidates, saved swap, recipe book empty/search/result, and offline step images.

### Move (`tab-move`)

Purpose: start an accessible session immediately.

Phone hierarchy:

1. Recommended session hero and duration.
2. Duration chips.
3. Alternative session grid/list including in-bed, seated, and walking options.
4. Secondary tiles/sheets: equipment, audiobook, weekly activity, and history.
5. Safety access remains reachable.

The compact structure must exist before first paint so the old long page never flashes. A completed movement session—not merely opening it—cares for the herb and awards any applicable XP once.

States: first use/safety, idle, session countdown, paused, completed, audiobook on/off, no equipment, history empty, and reduced motion/sound off.

### Profile (`tab-profile`, opened from header avatar)

Phone hierarchy:

1. Avatar/bubble, name, age/sign/personality/weight summary, Edit profile, and “How others see you.”
2. Level progress and next unlock.
3. Streak/shields/activity summary.
4. Focused tiles: Community, My swaps, Your glow, About you, Health, Account, Look & sound, Settings, plus incomplete-profile work.

`LowiG2E` turns each tile into a focused internal page with Back. Do not add stray buttons whose meaning depends on an internal feature name.

States: incomplete profile, local-only use, signed in, signed out, storage unavailable, private health present/empty, account error, and edit/photo removal.

## Companion surfaces

### Floating herb bubble

Persistent above Scan and recognizable on every primary tab. It is a compact doorway, not a notification generator. Navigation is silent. Tap opens the herb home; direct tapping of the creature may produce a reaction without XP.

### Home herb strip

Compact, alive, and tappable. It shows the current form and next-form progress without taking over Today. Its line reflects time/progress and must not repeat within the session.

### Herb home (`tmgScreen`)

Full-screen terrarium/windowsill world with the large animated herb, current mood/need, real-action care routes, six-stage evolution path, cosmetics, naming, star-sign/personality settings, and next unlock.

### Evolution (`lhEvolution`)

Short modal reveal after crossing one or more stage thresholds. A large XP jump produces one combined reveal of the final reached form. It respects reduced motion and does not award more XP.

## Major modal and sheet systems

| Surface | Owner/use |
|---|---|
| `.r2-ov > .r2-sh` | Preferred shared bottom-sheet system through `LowiR2.sheet`; enhanced by `apple-ui.js` and `LowiPF`. |
| `#sheetwrap / #sheet` | Older shared sheet for core actions. |
| `#rsSheet` | Cart/store sheet. |
| `#fstSheet` | Fast-ending flow. |
| `#f2Sheet` | Post-fast meal continuation. |
| `#cySheet` | Cycle information/settings. |
| `#fyvSheet` | For You/new-post media flow. |
| `#shModal` | Shelf/Cook modal surface. |
| `#tmgScreen` | Herb home dialog. |
| `#lhEvolution` | Evolution dialog. |

Only the top active modal owns focus. Escape/back and a reachable close control must work. Opening a second surface must close or intentionally stack with the first; it must never leave an invisible overlay blocking input.

## Cross-feature flows

### Meal and fasting

Active fast → user ends fast → `LowiFastStop` reward/result → `LowiF2` asks for meal → photo/barcode/text analysis → log with stable event ID → canonical XP award once → Daily Quest updates → herb water care effect.

### Product scan

Open Scan → choose Barcode → camera/photo/manual input → decode/lookup → evidence/result sheet → catch/report if applicable → stable scan completion → vitamin sparkle and any XP once.

### Food adaptation

Open Cook → choose Cook/Buy and Meal/Sweet snack → type request or shuffle → Swaflo/core resolves without replacing the cultural identity of the dish → view recipe/product → save swap once → sunlight reaction and one reward.

### Movement

Open Move → choose accessible format and duration → complete timer/session → store session → quest/XP update → dance reaction. Canceling or merely viewing awards nothing.

### Community posting

Community → New Post → video/photo/link/text → validate/preview → publish through cloud when signed in or local fallback where supported → refresh feed → post quest completion once.

### Account and restore

Local state may precede account creation. Auth through Supabase preserves the session in `lowi.auth`; cloud restore/backup must retain local-private health exclusions and must not overwrite newer work silently.


## Spirit surfaces (supersedes compact-strip and separate-room descriptions)

Home uses the herb and fasting water bubbles, a clear status/action, Yesterday/Today/Tomorrow strip, habit dots and existing quest/live tiles. Opening Home’s herb bubble expands the same creature into `spWorld`. Scan opens that world in capture mode, with the native scanner inside its stage. The former `tmgScreen` and floating duplicate dock are removed after Spirit loads. Four capture actions are Scan, Food photo, Meal and Water. Wardrobe, collection, profile and sealed evolution use internal sheets. Food picks expose ingredient, macro and rationale views with Cook/Log actions. Physical iPhone camera and production signed-in feed verification remain required.


## World-first Home
Home presents the shared body world and the single companion. Compact water, fasting, Today and zoom controls remain reachable. Today opens the existing log/status sheet; the companion opens its detail sheet. The shared round close control dismisses the active sheet; primary navigation is retained.
