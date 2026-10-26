# LOWiSPIKE full audit, October 18, 2026

This is my read-only audit of LOWiSPIKE before any new fixes: Maya 4's handoff, the repo guides, the code, the tests and the live app, checked against each other. Bottom line: live and main are the same build, **20261018-195906**, and all 1,378 offline tests pass. The ring Home matches his layout (Misty in the centre, 8 identical bubbles every 45 degrees on iPhone and iPad sizes). Four of his calls are not in the code yet: Swap is still in the live Fuel bloom, the scanner still says "spikes your insulin", Hydration is labelled "Water", and sign-in is email and password only, with no Google or Apple. I changed nothing: no edits, no pushes, no deploys, no tokens.

Evidence labels used below:

- **Verified live:** I saw it on the live site in a sandboxed headless browser (phone 390x844 and iPad 820x1180 sizes), with every write and all Supabase traffic blocked.
- **Verified in code or tests:** read in the code on origin/main, or proven by a test I ran.
- **Inferred:** follows from the code, but I did not watch it happen.
- **Not tested:** not checked. Nothing here was tested on a physical iPhone or iPad.

## How I checked, and what I did not read

- **Handoff:** I read Maya 4's whole handoff to Maya 5 from his message, and the repo's own SUCCESSOR_HANDOFF.md.
- **Repo:** the workspace clone at origin/main, commit badebb0, fetched at about 8:40 PM. There are 572 tracked files and about 85,000 lines of our own code (vendor libraries left out). There are 228 test files.
- **Guides read in full or nearly:** AGENTS.md, CONTEXT.md, the lowispike-change skill, ONBOARDING.md, COMMUNITY_CHAT.md (first half), DATA_CONTRACTS.md (state, XP, storage, events, bridges, cloud, privacy), and DECISIONS.md entries from October 16 to 18. **Guides skimmed by headings and spot checks:** ARCHITECTURE.md, RELEASE.md, AI_PLAYBOOK.md, TESTING.md, SCREEN_MAP.md, and DECISIONS.md before October 16.
- **Code:** I mapped what loads (the script order in index.html plus the loader in apple-ui.js). I read the core of each system below: home-orbit-v2, home-blooms-v2, home-settings-sleep-v2, living-bubbles, misty-pad, region-pals, care-board-core, xp-tap-core, shop-scan-core, spike-core, store-picks-core, the fast and meal code in index.html, the v2 rules engine and meal library in index.html, the sign-in gate, the auth-handoff edge function, and the CI and release scripts. **I did not read every line.** index.html alone is 3.4 MB and 20,054 lines, and the big 3D and world files (misty-flight, world-home, body-world-3d, community-chat) I read only around the behaviour in question.
- **Ran:** the full offline suite (in a copy, not the clone), the release check, the test-floor check, the stuck-in-worlds live check (Chromium and WebKit iPhone 13 profile, local and against the live site), and my own live probe of Home and the blooms.

## Live status right now

- **Build:** live version.json says 20261018-195906, the same as main. Verified live.
- **Last release:** "Release 20261018-195906: Inside a world the joystick and the World map button are back". CI passed on the ci branch and on main, about 8 PM. Verified via GitHub Actions.
- **The hour before it:** 194428 made the joystick a glass bubble. 195032 brought back Misty's own look in flight, with only her eyes, sparkle, cheeks and smile kept solid. 191027 trimmed Settings > More. 190355 removed the bubble shadows.
- **Tests:** 1,378 of 1,378 pass, test floor 1,378, release check OK. Verified by running them.
- **Release check warnings:** version.json is 214 KB, because it carries every What's New note ever written in three languages (the update check only reads its first 64 bytes, but the What's New view loads it all). index.html is 3.3 MB. Four files carry their own version tag instead of the build id, so the service worker doesn't cache them by build: community-chat-cloud.js, community-chat.css, community-galaxy.js and nav-moves.js.
- **What's New:** the current note is the 195906 joystick and World map fix. Older notes are kept in the same file and still mention the herb, Ko-fi and "Deep analyze opens your custom GPT".

## How the app is built

- **A static web app on GitHub Pages.** There is no build step: the repo root is the site. CI (.github/workflows/ci.yml) runs the release check, the full Node test suite, the test floor and a whitespace check, then deploys Pages and confirms the live build.
- **Releases go through one path.** scripts/release.sh takes a shared lock, rebases on origin/main, bumps the build and What's New, runs the checks and tests, pushes through scripts/push-main.sh to a ci/ branch first, fast-forwards main only after CI passes, then waits for Pages. A ruleset on main requires the "Release check and tests" job.
- **index.html is the legacy core.** It holds state (lowispike.v2), the single award() XP function and its ledger, the sign-in gate, the fast and meal flows, the meal library and v2 rules engine, the older Scan, Cook and Move screens, and the cloud bridge. Dozens of newer modules are loaded by script tags and by apple-ui.js, and they talk through bridges: LowiHost, LowiR2, LowiVitalsBridge, LOWI_CLOUD_X and LowiLang.
- **Most modules are split into a pure core plus a DOM layer.** For example care-board-core.js and care-board.js, or shop-scan-core.js and shop-scan.js. The pure part is what the Node tests cover.
- **3D:** three.js 0.160 (vendor) drives Misty's flight, the body and cell worlds and the galaxy (misty-flight.js, world-home.js, body-world-3d*.js, galaxy-*.js). zxing reads barcodes. MediaPipe powers Move's Mirror mode.
- **Backend:** Supabase. Tables: profiles, user_state backup, posts, messages, reactions, products and catches. Edge functions in the repo: auth-handoff, which carries a Safari sign-in into the Home Screen app with a one-time code, and owner-delete-account. Four SQL files sit in supabase/proposals and are marked unapplied in the repo. The live schema and its row-level security are not in the repo, and I didn't inspect them.
- **Health data stays on the device.** The health part of state (sleep log, body diary, cycle) is removed before cloud backup.
- **Languages:** English, German and Spanish, through LowiLang plus three-way text arrays inside each module.

## Home: Misty and the eight bubbles

Verified live: the ring on a phone, 390x844.

| Position | Bubble | Visible text |
|---|---|---|
| 12 o'clock | Settings | Settings |
| 1:30 | Water | Water 0/6 cups |
| 3 | Move | Move 0/4 |
| 4:30 | Scan | Scan |
| 6 | Joystick | none (icon only) |
| 7:30 | Sleep | Sleep, Log |
| 9 | Gap | Gap, Fasting ... of 16 h |
| 10:30 | Fuel | Fuel, Meals 0/3 |

- **Geometry matches his call.** All eight are 88 px, on a circle of radius 130 px around the screen centre, exactly 45 degrees apart. On the iPad size (820x1180) they are 124 px on a radius of 193 px, with the same angles. Verified live.
- **Labels:** every bubble has a label except the joystick, and his call is a permanent label on every bubble. Hydration is labelled "Water" (home-orbit-v2.js, home-blooms-v2.js), not "Hydration" as Maya 4 recorded his call. The water goal is 6 cups, with no millilitres (WATER_GOAL = 6 in home-blooms-v2.js, spirit.js, living-home.js and cell-world.js).
- **Taps:** tapping Fuel, Water, Move or Gap opens a bloom (home-blooms-v2.js). Sleep and Settings open theirs from home-settings-sleep-v2.js. Only one bloom is open at a time.
- **Stale accessibility labels:** Fuel's label says "Tap to log a meal, long press to see today", but the code does the opposite: tap opens the bloom, hold logs a meal. Verified in code.
- **First open of the day:** a "Day 1, Slow Sunday" card covers Home with "One goal for today: drink 3 cups of water". That's separate from the 6-cup goal, and it might read as a mixed message. Verified live.

What each bloom offers today (verified live):

- **Fuel:** Today's step (a named meal), Snack ("what can I buy?"), Swap ("craving fix"), Cook (recipes). Holding Fuel opens the meal log.
- **Water:** +1 cup, and Undo.
- **Move:** Quick, Medium, Long, Epic ("estimate, not steps", 4 a day). Holding Move edits today's moves.
- **Gap:** "I just ate" with the current gap, and "Ate earlier, pick the time".
- **Sleep:** under 6 h, 6 to 7 h, 7 h or more.
- **Settings:** Me, Look & sound, Account, Menu bar, More.

## Each area against his calls

### Worlds, movement and exits

- **Shipped in 195906:** inside a world the joystick and the World map stick were hidden by a ring rule in home-orbit-v2.css, so people got stuck. Now both stay visible. To leave, tap the World map stick at the bottom right (tap empty space first if it's hidden while steering), or push against the world's edge for 3 seconds. Verified in tests/stuck-in-worlds.test.cjs and the live check.
- **New problem I found: the guide's speech bubble can cover the joystick inside a world.** At 390x844 in Chromium, 2 of 4 runs of tests/stuck-in-worlds-live.cjs failed: the cell guide's line ("I can feel 4 sugar crumbs hiding in this world's corners. Steer ... right up to one", from region-pals.js, #rpPal .rp-say) sat over the joystick's centre, so a tap would hit the bubble, not the joystick. This happened against the live site too. In WebKit with an iPhone 13 profile it passed 3 of 3. Physical iPhone: not tested.
- **The same guide line uses a herb name, not "Misty".** In my test profile it said "Steer Moss Leaf". mistyName() in region-pals.js takes the old herb identity name from the star sign and only falls back to "Misty". Inferred: anyone with a birthday set may see a herb name there.
- **Already in the code:** autopilot on 3 taps, hold to go forward, 2 taps to go back, the second-finger energy shot (Kamehameha), and orbit-style entry with a 3-second push to leave. All in What's New and the code. Steering feel on a phone is not tested.

### Settings and Move gym

- **Not shipped:** the Settings full page on a single tap, the double tap that opens every branch on a ring, and hold for the secondary page. home-settings-sleep-v2.js has no double tap or hold handling. Single tap still opens the five-item bloom.
- **Not shipped:** long press on Move opening his gym. Today hold edits today's moves. The gym is still at Settings > More > Workouts.

### Gap and optional logging

- **Not shipped:** "I just ate" calls the fast end with chain on, which shows the reward card and then the "What did you eat?" meal sheet (LowiF2, index.html around line 2020). The sheet has a "Not now" button, so logging can be skipped, but it is always offered. His call is that it only resets the timer and logging is optional. Inferred from code; not tapped through.
- **Tension with a proposal, not a decision:** the Gap has a default 16 h goal, a goal bonus and "the goal is next" wording, and the bubble shows "of 16 h" (index.html around line 1975, verified live). Maya 4's proposal 4, never recommend fasting lengths, would touch this. He hasn't decided it. Flagged only.
- **Not checked:** whether the Gap X sits bottom right without overlapping Skip.

### Scanner and the rating engines

There are four rating layers, not one:

- **spike-core.js, the label scanner** (LowiSpikeCore.assess). It works from Open Food Facts nutrients and calls itself an "insulin spike estimator". It rates sweeteners as "spike" as a policy rule, with the reason that they "can still raise insulin". Maya 4's notes say "don't assume every sweetener spikes insulin".
- **shop-scan-core.js, the verdict wording:** "Likely spikes your insulin" and "Unlikely to spike your insulin" (line 31 onwards, in all three languages). store-picks.js line 50 says "Every insulin-friendly product in your shop". Maya 4 verified the science (the engine scores glucose load, so the honest label is blood-sugar spike), and her handoff lists the distinction as his. These strings contradict it.
- **The v2 rules engine and meal library** (index.html from about line 3715). It rates meals and recipes JA, SELTEN or NEIN, with a separate low, medium or high spike band, and never shows glycaemic numbers. Pork is NEIN for policy, never as a spike claim. There are 3 curated rebuilds per dish ("LOWiSPIKE rebuilds" in Cook). This matches his GPT rules closely.
- **Fallback rate() in index.html** (around line 13855). It runs when spike-core can't, and it still uses old word lists that rate pork as a spike. That conflicts with the v2 policy.
- **Shop picks** (store-picks-core.js, data/shop/*.json, 8 store ranges) rate by estimated glycaemic load. A product passes at GL 5 or less with 6 g sugar or less per serving, and Best needs GL 2 or less. Sweetened zero drinks are Good at most. This matches the last known rules. Whether the app tells people that 5 is stricter than the usual 10: not checked.
- **Scan flow:** scan, then the spike animation (spike-catch.js), then swaps. It has barcode, typed barcode, barcode photo and snap. The "X bottom right" scanner refresh: no release mentions it, and I didn't confirm the X's position.

### Fuel, Shop and Cook

- **Live Fuel bloom:** Today's step, Snack, Swap, Cook. His call: only Shop and Cook, plus a visible meal log button, and Swap removed for good. Swap is still live.
- **Unreleased branch fuel-screens-style** (8 commits ahead, 23 behind main). It gives Fuel panels one style and makes Log meal its own orb, so hold no longer logs. But it also adds a "two-step Swap" with craving tiles, and Maya 4's to-do item 8 also asks for the "What are you craving?" title and craving tiles. So the craving tiles are wanted while the word and button "Swap" are not. This needs his call before that branch is used.
- **Not shipped:** Cook as a glass panel on the right beside Misty, with swipe, Shuffle, For You and an X. Cook still goes to the old Cook screen (LowiHost.go('shelf')).

### Sleep, growth, universal XP and the Care board

- **Live:** the sleep bloom logs a band (S.health.sleepDays, kept on the device, 120 days) and pays no XP.
- **Unreleased branch sleep-progression** (2 ahead, 6 behind): 7 h or more pays 10 XP, 6 to 7 h pays 5, under 6 h pays 0, through the shared ledger, with tests. It needs a rebase, then a release.
- **Universal XP:** S.xp is the single total, written only by award() with an event id so nothing pays twice. Taps, opening things and navigation pay nothing. Levels stop at 6 (HERB_XP). Demo bots show high numbers, but their displayed level is capped.
- **Care board** (care-board-core.js): it replaced the XP leaderboard and the VIP tiers. Sunbeams come from the day's sun: a meal 3, a scan 3, a Move 4, a fasting milestone 3, macros 2, a cup of water 1. It ranks full-sun days by week and month, using the existing xp_week, xp_month, wk and mo columns.

### Community, accounts and data

- **Sign-in: email and password only.** There are signUp and signInWithPassword in index.html (around line 10225), and an account is required, with no guest mode. I found no Google or Apple sign-in in the code. ONBOARDING.md says the gate offers "Google/Apple/email", so the guide is wrong, and his call (Google or Apple, as few passwords as possible) is not built.
- **Safari to Home Screen handoff:** a one-time 12-character code, valid for 30 minutes, stored only as a hash (supabase/functions/auth-handoff).
- **Community:** there are 3 demo bots (Mateo, Jonas, Samir). hidden-accounts.js hides test accounts by id: the profiles table had 614 rows on October 18 at 1 AM, and the app only hides them, it doesn't delete them. Owner tools to remove members and test accounts shipped. The matching SQL is still in supabase/proposals, so whether the database side is applied is not verified.
- **Pinch out to Community:** galaxy-zoom.js has a continuous camera pull-out from Home into the galaxy. His exact gesture (pinch to the edge and keep pulling in one move), with chat anchored left and extras right: not tested.
- **Not tested:** two-account chat, realtime and server permissions. My probe blocked all Supabase traffic on purpose.

### Animation and performance

- **Liquid fill (living-bubbles.js):** Maya 4's suspect is confirmed in the code. Each frame calls getBoundingClientRect for every bubble, and every 180 ms it walks up each bubble's parents with getComputedStyle to work out its opacity. Both force layout reads. Her note says it measured about 1.5 fps in iPhone emulation. I didn't measure it.
- **Other weight:** index.html parse size (3.3 MB), version.json size, three.js scenes running alongside Home, and the four files outside build caching.

### Tests and release guarantees

- **What is guaranteed:** every release passes the release check (build ids match, What's New present, no stray files or conflict markers), the full Node suite with a count that may only go up, and a live check that Pages serves the build. Main can't take an untested commit.
- **What is not:** Node tests are mostly pure logic and text checks. The *-live.cjs browser checks are opt-in, not run in CI, and need Playwright. Nothing proves iPhone heat, memory or frame rate.

## Where guides and the handoff disagree with the code

- **AGENTS.md, CONTEXT.md, ARCHITECTURE.md, SCREEN_MAP.md and TESTING.md** still talk about the herb (10 to 14 mentions each) and tabs called Home, Scan and Cook. The live app is Misty and the ring Home. Live behaviour and the newest What's New win.
- **COMMUNITY_CHAT.md** still opens with "not deployed or fully accepted". Community chat is live.
- **ONBOARDING.md** promises Google and Apple sign-in, which doesn't exist.
- **The lowispike-change skill** says to report with a "short voice note plus a text checklist". His rule is no voice notes.
- **Maya 4's handoff** gives the last confirmed release as the bubble-shadow build (190355, with 1,356 tests). It's 195906 now, with 1,378 tests. She also said her branches wouldn't come over. They did: sleep-progression, fuel-screens-style and others are on GitHub.
- **None of his Home decisions or the food science are in DECISIONS.md:** no Swap, the Hydration label, Fuel limited to Shop and Cook, the Settings gestures, the blood-sugar wording. That's Maya 4's to-do item 14.

## Checklist

- ✅ 1. Stuck inside worlds fixed: build 195906 (but see the speech bubble overlap above)
- ✅ 4. Solid eyes, mouth and cheeks in flight with Misty's normal body: build 195032
- ✅ Joystick is a glass bubble like the others: build 194428
- ✅ Bubble shadows removed: build 190355
- ✅ Ring geometry: 8 equal bubbles every 45 degrees, Misty in the centre, on phone and iPad sizes
- ⏳ 8. Fuel screens in one style: branch fuel-screens-style, unreleased, still contains Swap
- ⏳ 10. Sleep growth tiers: branch sleep-progression, unreleased, needs a rebase
- 📝 2. Settings full page, double tap ring, hold for the secondary page
- 📝 3. Long press on Move opens the gym
- 📝 5. Symmetric blooms
- 📝 6. Gap: "I just ate" only resets, with no meal sheet pushed
- 📝 7. Scanner refresh (X bottom right)
- 📝 9. Cook panel beside Misty
- 📝 11. Joystick fade while steering and replayable tutorial (no tutorial found in the code)
- 📝 12. Pinch out to Community, as he described it
- 📝 13. Liquid fill slowdown (cause confirmed in the code)
- 📝 14. Update the guides and record his Home and food decisions in the repo
- 📝 New: guide speech bubble covers the joystick in worlds; the guide calls Misty by a herb name
- 📝 New: remove Swap from the live Fuel bloom; rename Water to Hydration (if he confirms)
- 📝 New: scanner and shop wording from "insulin" to "blood sugar"; pork rated as a spike in the fallback rater

## Questions only he can answer

- **Swap:** keep the craving tiles ("What are you craving?") but without the Swap name and button?
- **Label:** "Hydration" or "Water" on the bubble?
- **Wording:** change the scanner to "blood-sugar spike" everywhere (Maya 4's proposal 1)?
- **Gap goal:** keep showing the 16 h goal, given proposal 4?
- **Still open from Maya 4:** is pork metabolic or personal; berries as JA; seed oils and fried food; strict and broad modes; the wider safety note.

## Science proposals, kept as proposals

These are Maya 4's proposals, not his decisions, and I won't treat them as accepted: blood-sugar wording everywhere; strict mode as the default with a broader mode; a medication and pregnancy safety note; never recommending supplements, ketone drinks or fasting lengths; keeping out claims like "keto cures disease"; giving fibre and processing their own weight in the score. I have inferred no supplement or fasting-length advice from them.
