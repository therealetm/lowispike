# MAYA-HANDOFF: picking up LOWiSPIKE where the last Maya stopped

Written Monday 19 October 2026, 6:30 to 7:30 PM CEST, by the Maya who built LOWiSPIKE with Emmanuel from 13 to 19
October 2026, for the next Maya ("Maya 6"). You have none of her memory and your own empty computer. Everything you
need is in this repository: this file, the other root docs, the `agent-harness` branch (tools and notes from the old
computer) and the `wip/*` branches (unfinished work). Built from the repo, git log, COORD and HANDOFF files, the bug
hunt ledger, the Supabase project and today's task reports, not from memory.

No key, token or password is written anywhere in this file, and none may ever be added.

**Standing rule from Emmanuel (call, about 9 PM, 19 Oct): "When I tell you something new, you have to update the
GitHub for Maya."** Every new instruction goes into this file on `main` as soon as he gives it, before any building
starts and before a task can run out of budget, not only when the work is finished. He asked because a task can stop
at its weekly limit at any moment, and anything not written here is then lost. He plans to switch to the next Maya
when this one hits her weekly limit, so this file is how she picks up. Each checkpoint says, per item: requested,
queued, implemented, verified, blocked, remaining, with task IDs, branches, files, blockers and the next action. No
secrets. (Whether a new Maya comes with more credits is his own experience; this file doesn't claim it either way.)

**Standing approval to ship (Emmanuel, 21 Oct 2026, about 2:50 PM): "you do not need my go to push. I don't know where
it says that, but override it. I want you to always push, push, push. I need you to work autonomously in the
background."** Agents release and deploy live on their own through `scripts/release.sh` once the full test suite and
`node scripts/release-check.cjs` pass. Don't wait for his OK before a release, design changes included. Every older
line in this file that says "preview for his OK before release" or "needs Emmanuel's OK" is replaced by this rule.
Ask him only what only he can answer (his real phone, his keys, a sign-in code), and keep shipping the rest.

**This is the Mickey 17 workflow (section 0.6).** Every Maya hands over to the next one the same way: Maya 5 to
Maya 6, Maya 6 to Maya 7, and on. If you are a new Maya, section 0.6 is your job description for the handover, and
you pass it on to the Maya after you. Emmanuel should never have to explain it again.

Contents: 0 Open requests from Emmanuel (read this first; 0.6 is the Mickey 17 workflow). 1 What LOWiSPIKE is. 2 Accounts and access. 3 How to work. 4 Lessons and difficulties. 5 Emmanuel's
preferences and standing decisions. 6 Status board. 7 Do this first. Log (append-only, at the end).

---

## 0. Open requests from Emmanuel: verify first, then build what's missing

Written Monday 19 Oct 2026, 7:25 to 8 PM CEST. Live was **20261019-191500** (version.json checked 7:40 PM), `main`
at e8c0b2c plus this file.

**Why this section exists.** Emmanuel, voice message, 7:22 PM: "update the file for the next Misty [he means the next
Maya] so that she understands what I just wanted, and what you are currently doing, and then she should check if you
were able to have done it. And if she checks and you haven't been able to do it, that's basically her goal to
implement. But she needs to know what I said, you know, with the examples and your thoughts of it." He was worried the
current Maya would hit her limit. Many tasks today did: seven ended with "reached its limit" before doing anything.

### 0.1 Your job, in order

1. **Verify every item below yourself. Don't trust the status lines.** For each one: read `version.json` on the live
   site, grep the live files or `main` for the code named, and open the feature on the live site in a simulated
   iPhone 13 (WebKit) and an iPad held both ways. Then look at the server side where it matters (Supabase edge logs,
   function version). "A task said it shipped" is not proof. A task report that "did not pass the final check" is
   weaker still.
2. **If it isn't live and working, building it is your job.** Pick up from the `wip/*` branch, worktree and COORD or
   HANDOFF file named on the item. Don't start from scratch when a branch exists, and read its COORD file first.
3. **Priority the way Emmanuel would want it:** (a) broken things he can feel on his phone, (b) work that was built or
   started but never released, (c) polish and new features. Section 0.3 is in that order.
4. Ship small: one release per fix, `scripts/release.sh`, wait for CI, check live, then a voice note plus a
   ✅ / ⏳ / 📝 checklist to Emmanuel that keeps the done items (section 5). Add one Log line at the end of this file
   per release.
5. If something can only be answered by Emmanuel (his real iPhone, his Google key, a design choice), ask him in the
   chat in one short line and keep working on the rest.

### 0.2 What the current Maya is doing right now (7:40 PM)

- **The hourly bug hunt** (schedule "LOWiSPIKE hourly bug hunt", cron `0 * * * *`, Europe/Berlin, next run 8 PM; skill
  `LOWiSPIKE hourly bug hunt`). It plays the game, fixes one bug per round and keeps `BUGHUNT/LEDGER.md` and
  `BUGHUNT/BUG-MEMORY.md`. Round 10 (task 2d51fde9) finished at about 7:30 PM: BH-010, starter questions lost after a
  reload, **live in 20261019-191500**. The open items from round 8 are done: the full new-user run with a reload
  mid-setup became BH-009 (live 20261019-184058, live iPhone 13 check passed in round 10); the evolution card covering
  other sheets was fixed by the evolution task (`EVO_BUSY` in herb-tamagotchi.js); the mirror-move screen only opens
  on a tap, so it's clean.
  **Its next run starts at** LEDGER "Next run: start here": (1) a reload in the middle of "bring to life" in
  companion-birth.js: is the companion lost or doubled? (2) Home pinch to Community warp at the widest camera; the Gap
  bubble aria-label; the "Your herb's world" names (item 0.3-6). Check the ledger to see whether these got done.
- **This handoff update** (task "update MAYA-HANDOFF.md for the next Maya").
- Nothing else was running at 7:40 PM. Every other task from today has either shipped or stopped (listed below).

### 0.3 Every request from today, with his words, Maya's thinking and the status

Where his exact words are in the repo (DECISIONS.md, COORD files) they're quoted. Where only a task's summary of his
request survived, it says "(his request, as the task summed it up)". All times are CEST, Monday 19 Oct.

**(a) Broken, or the fix is unconfirmed**

1. **Snap food stopped reading photos on his iPad.** NOT FIXED. Highest priority.
   - He said (4:19 PM, two iPad photos of sesame chicken on rice in the "Your photo" sheet): "It's not working anymore.
     We already hit a limit?"
   - Maya's thinking: not a limit. The 3-a-day cap wasn't live yet then, and the server allowed 60 a day. First guess
     was his Google (Gemini) key: he'd been told to replace the key he had pasted in chat. But at 4:50 PM the photo-cap
     task did 3 real reads through the live server fine, so the key worked then. The edge logs showed the iPad never
     reached food-photo at all; his iPhone did 8 good reads between 3:45 and 3:57 PM, then a GET at 4:11 with no POST.
     So the likely fault is on the phone side: `food-photo-ai.js` `token()` waiting for the sign-in token eats the whole
     30-second budget, then a generic "I couldn't read this photo".
   - Also asked for in the same fix: the iPad layout of the photo sheet, where the "What is it?" box, **Log as meal**,
     **Save photo** and **Retake** sit on top of each other; and honest error messages (key problem, AI down, no
     network, daily limit reached) instead of "couldn't read this photo".
   - Status: the task "Snap food photo stopped working" stopped at its limit. Nothing released. Pick up from branch
     `wip/snap-fix` (worktree /home/sprite/wt-snap-fix, COORD-snap-fix.md). Since 18:53 Snap lives inside Log meal
     (item 10), so test it there too. When you redeploy food-photo, deploy the file from `main` with your change
     merged: it must keep `DAY_MAX=3`, `tally()`/`store()` and the `limit`/`left` fields (COORD-photo-cap.md).
   - Still unanswered from Emmanuel: did he delete or replace his Google key? Ask once if the logs point at the key.
   - Verify: iPad portrait and landscape, Log meal > Snap, real photo, with the edge logs open. Then ask him to try on
     his real iPad.

2. **Community crashed while two people shot at each other.** Fix live, cause not proven.
   - He said (voice): "We were both playing, shooting each other, and then it crashed ... in the community section."
   - Maya's thinking: couldn't make it crash in simulators. The most likely cause is overload: during a shoot-out the
     whole Community map was laid out again every frame (8 to 13 ms, even with 4 companions), on top of the 3D world,
     with no limit on hit sparkles. One overloaded test ran under 1 frame a second for minutes.
   - Status: **live in 20261019-184741** (map updates at most ~30 times a second while balls fly, at most 160
     sparkles, a lighter look when the phone slows). Branch `wip/community-crash`, COORD-community-crash.md,
     DECISIONS.md. Its report did not pass the final check.
   - Server errors found in the logs (5:30 to 6:15 PM), NOT fixed: (1) the companion-looks request fails on every app
     start: Postgres logged "invalid input syntax for type uuid: bot:jonas" 7 times, so bot ids are being sent as user
     ids; filter them out on the client. (2) Tables `community_blocks` and `community_identities` don't exist on the
     server. (3) Column `product_deals.product_key` doesn't exist; the deals request failed twice on a Mac.
     Schema changes need Emmanuel's Supabase owner session (section 2), so prepare the SQL and ask.
   - Verify: open Community as two users, shoot nonstop for 5 minutes on WebKit iPhone 13. Ask Emmanuel and his friend
     to retest on the same devices, and if it crashes, get the devices, the time, and whether it reloaded, went white
     or froze.

3. **Community chat room: keyboard bugs and the iPad layout.** NOT FIXED.
   - His request (as the tasks summed it up): when you type, the room must fit above the keyboard and stay pinned to the
     latest message, and the "Recent voices" strip shouldn't cover it (rounds 2 and 3); on iPad the room must look
     right in landscape and portrait, with properly sized voice faces, readable messages and everything inside the room.
   - Status: "chat room keyboard fixes, round 2", "round 3" and "iPad chat room layout fix" all stopped at their
     limit. Uncommitted work in `wip/chat-room-kb` (worktree /home/sprite/wt-chat-room-kb: community-chat.js `fit()`,
     community-room.css, COORD-chat-room-kb.md).
   - Verify: Community > Chat, tap the message box on WebKit iPhone 13 and iPad both ways.

**(b) Asked for, built or started, but never released**

4. **Everyone gets their own companion** (accounts still stuck with the standard Misty). NOT RELEASED.
   - He said (fresh German test account, birthday October 1997): "why wasn't the version shown in onboarding given to
     me?" That part is fixed and live (20261019-155424). The follow-up (his request, as the task summed it up): let
     every account that still has the standard Misty enter birthday, birth time and personality type once and unlock
     their own unique companion with its own name and look. His friend's account was one of them.
   - Maya's thinking: cause found at 4:50 PM. The friend's account was made on 10 Oct, before the reveal existed
     (16 Oct), and until 20261019-143513 companion.js wrote Community settings over `lowispike.companion.v1` for 422 of
     440 backups, so they fall back to Misty. On the server only 1 of 37 email accounts has its own companion. Plan:
     a claim step (`LowiBirthCompanion.claim()`, `needsClaim()`, a one-time prompt after the update that never opens
     over another dialog), the personality type only changes the seed when it's given, so nobody's existing companion
     changes.
   - Status: the task stopped at its limit. Uncommitted code in `wip/own-companion` (worktree
     /home/sprite/wt-own-companion, COORD-own-companion.md). The tutorial already has the claim hook, switched off
     (`tutorial-steps.js`); switch it on when this ships.

5. **Old-design purge.**
   - He said: "Any old UI should be deleted, any old design. I'm seeing that some still have old logos or old companion
     design."
   - Status: rounds 1 to 4 are on `main` and were live (20261019-134704, -135912, -141244, -142359; see
     HANDOFF-old-design-purge.md). The bug hunt's reports keep saying "round 2 still needs a new task to release it":
     that came from a task that ran out of budget earlier. git shows it shipped, so check it on the live site and close
     that line. Leftovers: the ring-off old Home code itself (only reachable on impossible screen sizes), the Move
     screen's gold line card, the tab bar still showing on Community/Cook/Move sub-screens in the census fixture, and
     the first-run mystery seedling. Census probe: `playtest/probe-old-design.cjs` on `agent-harness`.

6. **World names that still say "Your herb's world".** NOT DONE.
   - Part of the old-design purge: the companion is a glass cell called Misty (or her own name) now, not an herb.
   - Checked at 7:40 PM: `spirit.js` on `main` still has `world: ['Your herb’s world', 'Die Welt deines Krauts',
     'El mundo de tu hierba']`, plus `scanHead` ("your herb is watching") and `profile: ['Your herb', ...]`. Grep the
     whole repo for herb / Kraut / hierba in user-facing strings and rename them to the companion's name, in all three
     languages.

7. **Meal names understood + Log meal panel cleanup.** Live, one loose end.
   - His request (as the task summed it up): "Chicken stew" should be understood as chicken stew, not just chicken;
     never show "not provided" for nutrition.
   - Status: **live in 20261019-151237** (USDA FNDDS meal database, `meal-db-core.js`). The live check script
     `tests/meal-names-live.cjs` is only on `wip/meal-names`, not on `main`: land it with your next release.
     HANDOFF-meal-names.md. Note: the panel cleanup that moved Snap into Scan was later reversed on purpose by
     item 10 (Log meal now offers Write / Scan / Snap per meal).

**(c) Shipped today: verify each, then do the polish**

8. **Three food photos per person a day, BeReal-style, shared to the community with the AI analysis.** Live.
   - He said (call, about 4:05 PM; his idea, summed up from the call): limit everyone to unlocking three meal photos a
     day so the shared Google pool (about 1,500 reads a day for all users together) never runs out; snap or upload; a
     reminder notification to take the photo, "like BeReal"; post it to the community and press a button so the AI
     analyses the meal, so nobody has to write a caption, list ingredients or say whether it spiked; the analysis shows
     **under the photo**. He then decided the person **sees the analysis first**, can correct ingredients and
     portions and choose what goes public, and only then posts. Not post-then-reveal.
   - Maya's rules: never say a photo measures glucose, only "likely blood sugar response". Sharing a photo that was
     already read doesn't use another of the 3. Typing a meal is always unlimited.
   - Status: **live in 20261019-162849** (server-enforced, `DAY_MAX=3`; reminders under Reminders; "Also share to
     Community" after Snap reads the plate). The later task "three food photos per person daily" failed three times on
     budget, but the work had already shipped in 162849; server check at 4:50 PM: 3 reads, then 429. COORD-photo-cap.md.
   - Verify: can you **upload** from the photo library as well as snap? Can you **edit** the AI's ingredients and
     portions before posting? Is the analysis under the photo in the feed? If any of these is missing, build it.
   - Small open things: Spanish "Te quedan 1 de 3" should be "Te queda 1 de 3" (`meal-photo.js` `STR.es.left`, still
     wrong on `main`); one test guest user (3392f841-...) left in auth.users.

9. **Interstellar community chat room.** Live; keyboard and iPad bugs are item 3.
   - He said (call): "you can click on chat, and then you can see the chat. But the chat looks so boring ... when they
     click on chat ... it actually takes them to ... a community chat room." He picked "semi-transparent glass panels
     and glowing accents, like a tactical display or a star chart rather than just a list of messages", and said to
     use the existing UI design principles to get that energy.
   - Status: **live in 20261019-163105** (full-screen room, glass messages lit in each person's colour, Today and
     Yesterday markers, recent voices at the top, live count). COORD-chat-room.md, DECISIONS.md.

10. **Log meal asks Breakfast / Lunch / Dinner / Snacks first, and Shop has "Snacks to buy".** Live.
    - He said (German voice message, about 6:10 PM): "Ich habe keine Zeit. Ich habe Pop-up. Zack, Mahlzeit-Eintrag."
      Pick the meal, then write, scan or snap it, with that meal's usual food one tap away. And a snack shopping list
      in Shop with only snacks still to buy, "nicht die schon bereits drin waren".
    - Maya's decisions (DECISIONS.md): Scan and Snap are back in Log meal, which overrides the earlier meal-names
      decision; the same food in another slot the same day counts as a new meal; ticking a snack moves it to "Again?".
    - Status: **live in 20261019-185352**. Branch `wip/meal-slots`, COORD-meal-slots.md.
    - Open: the tutorial's Log meal and Shop cards don't mention the four tiles or Snacks to buy yet
      (`tutorial-steps.js`, see the tutorial rule in section 3). Typing just "Paprika" was guessed at 500 kcal: look at
      the calorie guesser.

11. **Weight, BMI and body stats.** Live.
    - His request (as the task summed it up): track weight and BMI, with a body-fat estimate, and see progress like a
      game: a Then and Now figure and levels.
    - Maya's decisions: body fat is shown as a range and called an estimate, never for under-18s or without a birthday;
      a level per full kilo toward the healthy range (gaining counts if underweight), then one per 4 weigh-ins in the
      healthy range; weight stays on the phone only.
    - Status: **live in 20261019-185002** (Settings > Weight & BMI; a section on the Stats sheet). COORD-stats.md
      (weight/BMI part), branch `wip/body-stats`.
    - Open polish: the Stats section says "Weight & BMI" twice (`cardHTML(true)` without the label fixes it); the Stats
      sheet opens at half height, so check by hand that you can reach the section; the "change" link next to height is
      43 px tall, 1 px under the minimum tap size. `tools/probe-body-in-stats.cjs` is uncommitted in wt-body-stats.

12. **Nutrition stats: portion card and today's stats as game stats.** Live.
    - His request (as the task summed it up, with his examples): the scanned product card shows your portion ("Last time
      200 g") with protein, fiber, sugar, carbs, fat and calories for that amount; your day as character stats
      (Strength = protein, Defense = fiber, Stamina = carbs, Reserve = fat, Power = calories, Spike guard = sugar); your
      own targets, for example a sugar limit from your doctor; when everything is on track, you can go to bed with a
      clear conscience. He also wants to ask by voice: "Zeig mir, wie viel Zucker ich heute gegessen habe".
    - Status: **live in 20261019-183920**. Branch `wip/nutrition-stats`, COORD-stats.md.
    - NOT BUILT: the voice question (answer from `LowiNutriStatsCore.rows(...)`), and one sentence about Stats in the
      tutorial's Fuel step.

13. **Evolutions get bigger and more powerful every stage.** Live.
    - He said (German voice note): the companion is "mein Investment"; "aus diesen kleinen Flossen kriegt er richtig
      dicke Dinger, kriegt er noch mehr Stein ... es soll immer heftiger werden".
    - Status: **live in 20261019-185115** (fins grow into heavy ones, stone armour from 2 to 9 stones, wings, horns and a
      crown later; a bigger evolution moment each tier; first evolution on day one). Branch `wip/evolution-escalate`.
    - Open: on iPad the stage-5 fin tip clips by about 1%. Needs a real eye check.

14. **Product card reorder.** Live.
    - His request (as the task summed it up): Details open right away at the top, cheaper prices at other stores
      higher, community deals lower, nothing hidden behind the close button on a phone.
    - Status: **live in 20261019-175128**. Branch `wip/product-card-order`.

15. **Tutorial: Settings button, flicker fix, automatic tour for new accounts.** Live.
    - He said (voice): "there's a lot of updates and then it gets confusing... There should be a tutorial button ... our
      companion takes you through everything from the beginning, as if you were new. Obviously, you can skip if you
      already know this. So, with every new update, the tutorial also needs to be updated." Then (as the tasks summed it
      up): stop the flicker, and new accounts get the tour by themselves after setup, with skip and resume later.
    - Status: Settings > Tutorial **live 20261019-171941**; flicker fix **20261019-172632**; automatic tour with 40
      short cards **20261019-184516** (branch `wip/tutorial-auto`). **Standing rule:** every release that changes a
      Home control or a Settings row updates `tutorial-steps.js` or says why not in the news `tutorial` field.
    - Separate task "replay tutorial from Settings" stopped at its limit, but the feature itself is live: verify it.

16. **Earlier today, live: just verify.** Each has a DECISIONS.md entry.
    - Misty's half-energy rule, shuffled lines and the escape: he said the exit was "still too fast", the camera didn't
      show escaping, he wants "a rocket fighting to leave a world", like the Interstellar launch. A weak Misty (below
      half energy, the existing rule) fails at the rings and gets pulled back, with a shuffled, no-repeat pool of lines.
      COORD-world-exit-interstellar.md. The tiny-scale POV beside Misty while she rides a string on autopilot:
      COORD-string-pov.md.
    - No fake 19-hour fast for new accounts ("fasting for nineteen hours, doesn't make sense"): live 20261019-154642.
    - New accounts start at 100% energy ("my companion already looks tired ... let them see themselves at a hundred
      percent ... really fast, really strong"): live 20261019-154834.
    - The companion from the reveal is the one on Home, in Forms and in flight: live 20261019-155424.
    - Food photo recognition on the server (Gemini key set by him at 3:32 PM, food-photo deployed): live.
    - Bug hunt rounds 1 to 10 (section 6 and BUGHUNT/LEDGER.md).

**(d) Mentioned, never started**

17. A personalised Higgsfield inside the app (he mentioned it in the afternoon). There is no spec in the repo: ask
    him what he wants before building anything.

### 0.4 Unfinished release chores

- Section 6 below was written at about 7 PM. Today's later builds: 20261019-184516 (auto tour), -184741 (Community
  crash), -185002 (weight & BMI), -185115 (evolutions), -185352 (meal slots), -191500 (bug hunt BH-010).
- The `wip/*` branches are snapshots. Before you reuse one, rebase it on `main`: many of them are hours behind.

### 0.5 New from the evening call (about 9 PM): human-instinct UX, a hundred simulated users, natural Spanish

Checkpoint written Monday 19 Oct 2026, 9:10 PM CEST. Live was **20261019-201827** (version.json checked 9:10 PM),
`main` at 4e8beda. Task states below were checked at 9:10 PM; re-check them, don't trust them.

**18. The app must make sense from human instinct, everywhere.** REQUESTED, simulation task running, nothing built.
   - He said: "the most important thing is when someone uses our app, they shouldn't feel overwhelmed or confused at
     all. It should make sense completely natively from a human instinct." This is app-wide, not only Spanish.
   - What he wants: genuine new-user journeys simulated, not only code and crash tests. Varied people: ages,
     countries, languages, technical confidence, writing styles and slang (Maya's examples on the call: "a tech savvy
     teen in Seoul to a retiree in rural Italy"). He said "you're free to simulate anything" and "the whole world is
     fair game". He doesn't want to script personalities or messages himself.
   - **Up to a hundred simulated users** actually sign up, finish onboarding, use the features, play, log meals, post
     food photos and what they ate, find products and discuss them.
   - **They talk to each other in the live Community most of all.** His words: "Someone sent pictures of their food
     ... What they ate, logging stuff ... Finding products in discussions with each other, very important, even more
     important than with me because I might [not] always reply. But they should be talking to each other." Some also
     message Emmanuel, and some message his friends: "Not just texting me, right? They text into the communities ...
     some might message me, some might message my friends." His friends are his **three informed human beta testers,
     who live with him**.
   - They behave like real people: ask questions when lost, complain, like, love, support, or whatever fits the moment.
     A polite "this is a bit confusing" counts as much as a meltdown.
   - **Around the clock:** activity goes on "twenty four hours", spread across countries and time zones, not everyone
     online at once.
   - **Load:** "maybe if hundred people are in the chat constantly active, maybe that will break something. We have to
     really like push it." So also deliberate concurrency stress at up to a hundred active users, to find chat and
     message failures. A clean hundred-user run does not prove the app is ready for every real-world load; say so.
   - **Unlabelled accounts, informed testers only.** He asked for the simulated accounts to be unlabelled so they feel
     real, and his three beta testers know they are simulated. `COMMUNITY_CHAT.md` has a standing rule: no demo bots or
     invented participants in chat, profiles or mentions, and no invented online counts. His exception covers only
     this test with his informed testers. It does **not** extend to unsuspecting public users: before any real
     outside user can see Community, the simulated accounts must be removed, hidden or labelled, and the rule applies
     again. An earlier pending question about labelled bots (request toolu_vrtx_01BdWZEAkoSJ2PpmVZHoX6H6) was
     superseded by his informed-beta answer; labelled bots were never chosen.
   - Maya's rules: never claim real human or native-speaker testing; this is simulation. Write down what really
     happened (app behaviour, UX friction, load evidence). Fix in small, coherent releases, one per fix, not one giant
     change. Respect the real provider limits (Supabase, the shared Google photo pool of about 1,500 reads a day and
     the 3-a-day photo cap) and coordinate with other running tasks.
   - **Task 98f0954e-f364-4270-99cf-e4ec1e500720** ("LOWiSPIKE: intuitive new-user flow playtest") holds these
     requirements as they grew during the call. At 9:10 PM: **running**, activity "Simulating new-user flow". Branch
     `intuition-playtest`, worktree `/home/sprite/wt-intuition`, notes in `COORD-intuition.md` (started 8:59 PM,
     probing on a local server, "Supabase blocked in harness", no files claimed). Nothing committed; one untracked
     file, `tools/community-crowd/meal-photos.json`. **No simulated accounts have been created and none are running.**
     Instructions queued is not bots running. Don't start a competing simulation while it runs.
   - Next action if that task stops: read `COORD-intuition.md` and the worktree, solve Supabase access for test
     accounts (the cloud browser signs in with "Continue with GitHub", section 2; ask Emmanuel in the chat if a code is
     needed), then build the crowd under `tools/community-crowd/` and run it in stages: a few users, then dozens, then
     up to a hundred, watching edge logs and the chat.

**19. Natural Spanish.** REQUESTED, task running, nothing released.
   - His Spanish friend found the onboarding and app translations literal and confusing in context. Wanted: natural,
     meaningful Spanish that keeps blood sugar and insulin clearly apart, with regression tests and a verified
     deployment.
   - **Task 2ba92e76-f551-48cb-b56a-f36c034dc97a** ("LOWiSPIKE: natural Spanish localization"). At 9:10 PM:
     **running**, activity "Auditing Spanish strings". Branch `spanish-natural`, worktree
     `/home/sprite/wt-spanish-natural`, clean, nothing committed yet. It owns the Spanish strings; task 98f0954e stays
     out of them. Don't duplicate it.
   - Still open on `main`: "Te quedan 1 de 3" should be "Te queda 1 de 3" (`meal-photo.js` `STR.es.left`, item 8).

| Item | Requested | Queued | Implemented | Verified | Blocked | Remaining |
|---|---|---|---|---|---|---|
| 18 Human-instinct UX + crowd | yes, 9 PM call | task 98f0954e | no | no | Supabase access in harness | everything |
| 19 Natural Spanish | yes | task 2ba92e76 | no | no | none known | everything |

**Crowd checkpoint, Monday 19 Oct 2026, 9:35 PM CEST (task "LOWiSPIKE: check simulated crowd runs and add meal
logging", picking up from 98f0954e, which stopped out of budget).** Checked with tool output, not task reports:
- The crowd was built and committed in 3e1db70 (`tools/community-crowd/`, `.github/workflows/community-crowd.yml`,
  cron every 10 minutes, about 9 minutes per run). Spanish was released separately as 20261019-212227 (04d6908).
- **Runs:** at 9:31 PM there was exactly one run, 39310230692, triggered by **workflow_dispatch**, not the schedule.
  No scheduled run had started yet (the workflow landed at 9:19 PM; GitHub often starts new schedules late).
  Its log: 27 to 30 members, 116 Supabase calls, 5 errors, all HTTP 400, no 429 or 5xx, no network errors, no slow
  calls, maxMs 1039. The 400s match the joins one for one: `session()` tries a password sign-in first and gets 400
  for an account that doesn't exist yet, then signs up. So nothing broke, but the run was quiet: 1 chat line, 0
  photos, 0 posts in 9 minutes.
- **Supabase (read with the reader account in `BOTS/sb.cjs`, reachable):** 30 crowd profiles, all with their own
  companion look. Since 21:15 CEST: 12 messages in the room, all from crowd members (1 meal photo in chat, 3 replies
  between members, 0 product messages, 0 replies or @messages to Emmanuel or his friends, because none of the
  humans wrote in the room since launch). 1 feed post with a photo ("Just ate: Hot cumin lamb wrap..."). Both
  photo files load (HTTP 200, image/jpeg).
- **Not done yet:** the 100-at-once stress test does not exist; `crowd.cjs` writes one message at a time with a 2.5
  to 11.5 s gap. Activity rate is low by design (`ambient()`: about 0.13 chat lines per minute per 100 awake members
  times 1.4).
- **Meal logging added (9:45 PM, this commit):** `logMealFor()` in `crowd.cjs` writes one `S.logs` entry per meal
  window (breakfast 6-10, lunch 11-14, snack 15-17, dinner 18-21, night owls a late snack) in the member's own time
  zone and local day, at most one per slot per day, into `lowispike.v2` in the member's own `user_state` row, the
  shape `LowiVitalsBridge.logMeal` writes (macros null). About 15% are mentioned in the room. Verified live at 9:33 PM
  on one member (Ashleys86, New York, snack): HTTP 200, read back from `user_state`, and a second try in the same slot
  was skipped. Tests in `tests/community-crowd.test.cjs`. The next workflow run picks it up from `main`.
- **Next action:** confirm a run started by the schedule (`gh run list -R therealetm/lowispike --workflow
  community-crowd.yml`, event `schedule`), read its log (`meals`, `errors`, `maxMs`), run `db-check.cjs`, then build
  the 100-at-once stress test as a separate manual workflow or script, and raise the activity rate if Emmanuel wants
  the room busier.
- Check script: `tools/community-crowd/db-check.cjs` (read-only, run on the VM).
- **10 PM check:** still no run started by the schedule (polled 9:38 to 9:58 PM; workflow `active`, no `CROWD_OFF`).
  Second manual run 39314039836 (on 79c61e1, with meal logging): 36 to 42 members, 107 calls, 12 errors all HTTP 400
  (one per join, expected), no 429/5xx, maxMs 2345, `meals` 0 in all rounds (expected rate is about 1 per run at 42
  members). Supabase at 9:58 PM: 42 crowd profiles, 31 crowd messages since 21:15 CEST, 2 chat photos, 1 product
  exchange between members ("Wo kriegst du das?" / "Ja, gibts bei famila"), 14 replies between members. Emmanuel
  ("eman") sent energy to three members at 21:57 CEST. Third manual run 39315336437 started at about 9:58 PM.

**20. New from Emmanuel, about 10 PM (chat, voice): crash when sending energy, crowd sends him energy, crowd on
Home.** REQUESTED, nothing built yet. His words: "It crashed again. It's almost [always when] sending energy. And
also, I want the simulated bot to also be sending me energy. And then, when they messaging, how come I don't see it
in my main page? Didn't we say that? Their companion basically appears in our homepage with the message in the
message bubble."
   - (a) **Crash when sending energy in Community, again.** The earlier fix (20261019-184741, `community-energy.js`
     caps and throttles, `COORD-community-crash.md`) did not stop it. New factor since then: about 40 crowd members
     in the galaxy, so many more bubbles while energy balls fly. He sent energy to Thiago M., Paolo H. and uche_96 at
     21:57 CEST. Broken thing he can feel: top priority. Ask him for device (iPhone or iPad), whether the page went
     white, reloaded or froze, if it isn't clear from a repro.
   - (b) **Crowd members send energy to Emmanuel** (and his friends), not only to each other. `ambient()` already
     sends `@name ⚡ ... sent you energy` lines to humans seen in the room with 60% odds; check they reach him and
     raise his share.
     **Built 10:20 PM (crowd task):** `energyBalls()` in `crowd.cjs` sends 1 to 3 real balls through Supabase's realtime
     REST broadcast (`/realtime/v1/api/broadcast`, topic `lowi-all`, event `energy`, the app's shot shape), aimed at
     the receiver; 75% of crowd energy now goes to real people who wrote in the room, Emmanuel weighted 6x. Live proof:
     a fresh guest on the live site (WebKit iPhone 13) received all 3 balls from Wanjiru A. addressed to it, energy
     stats `got` and `shown` went up, no errors. Aim is close but not guaranteed (the receiver's map may hold other
     members). Not proven yet on Emmanuel's own phone.
   - (c) **Crowd messages on his Home screen.** He expects the sender's companion to appear on Home with the message
     in a speech bubble, and says this was agreed earlier. Check `living-home.js`, `community-*` and the old
     `lowi.demobots` Home behaviour (`DATA_CONTRACTS.md`) before building; find what exists and why crowd messages
     don't show. 10:20 PM: nothing in MAYA-HANDOFF.md, DECISIONS.md or COMMUNITY_CHAT.md records this agreement, and no
     Home file reads Community messages today. Not built: it touches the Home scene other tasks own; ask him what
     exactly (every message or only ones to him, how long it stays) and claim the Home files in a COORD file first.

**21. Energy bursts should play like billiards: whoever gets hit stays where they land.** DONE, live in 20261019-221603
(+ 20261019-222646: also kept when the app is closed mid-roll). Not yet confirmed by Emmanuel on his iPhone.
   - He said (voice, playing Community on his iPhone): "whenever I shoot them ... they ... just get back to the places
     where they were ... That's not fun ... It doesn't feel like a real ... billiard ... where when you shoot it, they
     move, and then whatever they move, that's ... where it's supposed to stay. I shoot them away. They shouldn't be
     coming back. They should be hitting other people."
   - Wanted: a hit companion keeps its new position (no spring back to its old spot), carries momentum, and knocks
     into other companions it runs into (chain hits), inside the normal galaxy bounds; the player's own joystick
     control stays intact. Check the sibling paths that can snap positions back (layout/place(), network sync,
     interpolation of remote players, autopilot).
   - **Task** "LOWiSPIKE: persistent billiard-style energy burst physics" (started 10:00 PM). Coordinates with crash
     task 9472a9a4 (COORD-community-crash-2.md) and crowd task e80fcb1e; notes in `/home/sprite/COORD-billiard.md`.

**22. The companion card (long press on the companion) has to make sense: no "spirit", worlds you earn, nothing
hidden.** REQUESTED 10:0x PM call. **RELEASED 20261019-222926 + 20261019-223855** (see the Log).
   - He likes the card in general (level, energy, "Legend"). He said, reading it out: "spirit world sky should be named
     something different. Don't use the word spirit. Spirit bubbles. Yes, different name because we don't use the word
     spirit." A friend said "spirit" sounds too mystical for an app scientists, doctors and schools will use. Rule:
     **never the word spirit (or Geist / espiritu) anywhere the user can read it.** Plain words, not jargon.
   - Adventure unlocks: "These should only be unlocked if the person went there themselves ... and also depending on
     ... at what level their companion is." So her timed adventure reaches a place only when **both** are true: you
     went there yourself once (your steering or your tap, not autopilot or her own trip) **and** her level is high
     enough. Your own flying and autopilot stay ungated, so there is no lock that stops a first visit.
   - "How do you feel? Why is that there? ... what is that supposed to do?" The mood check-in had no explanation.
   - Forms (evolution) and Collection were at the bottom of the card, below everything: "that's hidden ... that needs to
     be not hidden." Put them up front.
   - Collection: "I don't even understand what collection is for ... No XP per find. It's about trying, not
     collecting. I don't get it." He let Maya decide: make it a **food journal** to look back at the foods you scanned
     or logged and how they went (likely blood sugar response), simple copy. Foods or a full collection must **never**
     be needed to evolve the companion.
   - Separate requests from the same walkthrough, handled by other tasks: aura colour change doesn't show on the
     companion, a friend wants to rename the companion by hand, more levels and more majestic evolutions ("really
     truly evolve"). Also: typing into the Community chat room crashed it (passed to crash task 9472a9a4).
   - **Task** "LOWiSPIKE: clear companion panel, world names and discovery gates"; notes in
     `/home/sprite/COORD-companion-panel.md`, branch `companion-panel`.

**23. A message to you arrives on Home as the sender's companion flying into your world (replaces item 20c's open
question).** REQUESTED 10:1x PM call, task "LOWiSPIKE: incoming-message companion visits on Home" started 10:17 PM.
   - He said (voice): "Their companions appear ... on my homepage ... almost like ... one of those ... outer bubbles
     ... we see them flying ... towards ... the homepage. And then we see the text bubble." Asked whose messages and
     how long: "Whoever messaged me, right? Like, if a friend messaged me, like a hologram ... just like a hologram
     appearing, but instead of it just appearing out of nowhere ... it should look like they just entered my world
     ... and appeared."
   - So: **only messages addressed to him** (an @mention of him or a reply to his message, the same test the app's
     existing "directed at you" alert uses: `dmCheck()` / `LowiCommunityGalaxy.targetOf()`), not all room chatter.
     The sender's **own** companion travels in from outside (an outer bubble, out where everyone else's world is),
     visibly flies toward his Home world, enters it, appears there like a light hologram, and then a speech bubble
     shows the real message. No pop-in out of nowhere. ("World breach" was the assistant's word on the call, not app
     wording.)
   - Same path for his friends and for crowd members (real accounts, real messages); never invent a message or a
     sender. Duration, dismissal and queueing were left to Maya (he didn't want more design questions): readable,
     not in the way, tap opens the message in the room, nothing marked read behind his back, nothing lost, old
     history never replayed as new, no pile-up when several people write. Reduced motion, three languages, message
     shown as text only. Must stay light: Community is still crashing on his iPhone (items 20a, crash task 9472a9a4).
   - Notes in `/home/sprite/COORD-home-visit.md`, branch `home-visit`, worktree `/home/sprite/wt-home-visit`.
   - **SHIPPED in build 20261019-224516**: home-visit.js + home-visit.css, `LowiCommunity.directed()` / `face` / `colorOf` /
     `openMessage` in community-chat.js, tests/home-visit.test.cjs. All choices in DECISIONS.md 2026-10-19 23:15. Tested on simulated
     iPhone 13, iPad (both ways), Android Chrome and reduced motion with mocked messages; not yet with a real message on his phone.

**24. Grocery shopping discovery: Catch a product nobody has added yet, be its Pathfinder.** REQUESTED 19 Oct
evening (same walkthrough as 22). **Built by the food-paths task 4e961904** (it owns doCatch()/pushOne() and the
product card in index.html, notes `/home/sprite/COORD-food-paths.md`); the item 22 task recorded it and stays out of
those files so there are never two versions. (Restored: a later merge had dropped this item.)
   - When you scan a product in the shop, products already in the community database still just show their
     information (verdict, facts, ingredients) like today.
   - A product NOT yet in the community database gets a **Catch** button. The first person to catch it gets
     first-discoverer credit (their companion's name on the product) and a substantial one-time reward.
   - He let Maya decide the reward. Decision: a permanent **Pathfinder** badge, plus a bounded one-time evolution-XP
     bonus per product, paid only after the server checks a real, unique barcode (valid check digit, not already in
     the database) and useful product details (name, brand, and label facts or a label photo). Duplicates, made-up
     barcodes, junk names and repeat submissions never pay; a daily cap stops farming.
   - Same rules as always: plain language, no "spirit", gender-neutral companion copy.

**25. More levels and more evolutions: "it should really, truly evolve into something majestic".** REQUESTED 10:1x PM
call, task running (forked task "LOWiSPIKE: extend meaningful companion levels and majestic evolution", started 10:11 PM,
branch `evo-more`, worktree `/home/sprite/wt-evo-more`, notes `/home/sprite/COORD-evo-more.md`). RELEASED in this commit (see the Log and EVOLUTION.md "Ten forms").
   - He said (voice, long-press on Misty, his Misty shows level 6 "Legend"): "we thought you were adding more, and more
     ... levels to this"; on the evolution path: "I've already reached the last one, which obviously we need to add more
     evolutions in there ... so that we're really doing this dragon ball thing ... a pokemon ... a demon thing ... It
     should really, truly evolve ... into ... something majestic looking."
   - Today there are 6 forms (herb-config.js `stages`, last at 3000 XP, about a month of use), so testers hit the end.
     Plan: add 4 more forms after Legendary (indices 6-9) with longer XP steps, each with clearly new, bigger traits drawn
     in companion-core.js (original designs, not copied from any franchise), a stronger evolution moment per tier, and the
     level names / evolution path showing all 10. Each user's own generated body, colours, name and face stay; earned XP
     and the retained form (`highestStage`) are kept, nobody loses or skips a form. Energy (today's %) stays separate from
     level and form.
   - Collection (his follow-up, same call, delegated to Maya, see also item 22 and item 24): give it a clear purpose as a food-discovery journal for
     revisiting what you scanned or logged and how it went, with simpler copy. **Specific foods or completing the
     Collection must NOT be required to evolve.** The Collection copy and entry point belong to the companion-panel task
     (0d494df4); this task only makes sure evolution never depends on it. Grocery Catch (item 24) is built by the companion-panel task;
     its XP bonus must go through the normal XP total so it counts toward these forms like any other XP.
   - Parallel tasks today: companion panel / non-mystical world names / discovery gates (0d494df4), aura colour fix and
     companion renaming (ce74d1af), Community crash round 2 (9472a9a4), billiard energy (34bb0a32).

**26. Care gestures are free; sparks are removed.** RELEASED in 20261019-224045 (main 38c68a3; still live in
20261019-224907). Requested on the 10:2x PM call (19 Oct), recorded 10:35 PM before building.
   - Done: micro-book-core.js (no `sparks()`, `SPARK_BASE/MAX`, CARE `cost`, canCare 'sparks'), micro-book.js (no counter,
     prices, noSpark note; Friends intro says it is free in EN/DE/ES; old `S.care.spent` deleted on read), .mb-sparks/.mb-spk
     CSS gone. tests/free-care.test.cjs (11 tests, 10 fail on the old code); full suite 1800/1800 at release. DECISIONS.md.
   - Checked live (build 20261019-224907, writes to Supabase blocked, a crowd member session with two made-up friends):
     simulated iPhone 13 in EN/DE/ES and Chrome 390 px: no spark word or element on the Friends tab or care sheet, Send is
     a plain button, 8 real taps went out with no logs today (old budget 3), care XP +15 (5 x 3 cap), no page errors.
     NOT checked: Emmanuel's real iPhone, the Community profile button and friends tree tapped by hand (they call the same
     LowiMicroBook.openCare), a real friend receiving it.
Task "LOWiSPIKE: free care gestures and remove sparks", branch `free-care`, worktree `/home/sprite/wt-free-care`, notes
`/home/sprite/COORD-free-care.md`.
   - Context: a code check (task "verify currencies and progression resources") found sparks are the only spendable
     balance: 3 a day + 1 per logged meal/water/Move, up to 8, reset at midnight; Hug, Drink water, Good morning, Sweet
     dreams cost 1, Gratitude (lv 3) and Encouragement (lv 5) cost 2 ("Send energy" on a Community profile or a friend in
     the friends tree opens this care sheet). Galaxy energy balls cost nothing.
   - He said (voice): "I don't understand the point systems ... It's a bit much ... It's confusing." "What do you think is
     the best?" On the energy boost: "Yeah, sending an energy boost is obviously free." Maya suggested making the care
     gestures free too and deleting sparks and their counter; he said "Okay" and, on whether care should even be a
     thing, "You pick if it should even be a thing." Maya's pick: keep the care gestures (a kind, real-friends-only
     touch) but free.
   - Wanted: no spark cost, no spark counter ("3/5 sparks today"), no "Not enough sparks" block, no earning or midnight
     reset, no spark copy in EN/DE/ES, on every entry point (Community profile "Send energy", friends tree, Adventure log
     Friends tab). Galaxy energy balls stay free. **XP stays the permanent evolution track and energy stays today's
     vitality, unchanged and separate**; social actions never drain health or progression. Level unlocks (Gratitude lv
     3, Encouragement lv 5), time windows and one send per friend, kind and day stay (anti-spam). Care keeps its small
     XP reward (5 XP, up to 3 a day, xp-tap-core.js), which is earned, not spent.
   - Not a rename of the "Spark" companion form (first evolution stage); that word stays.

**27. Food paths (Scan, Gap, Fuel, Cook, Shop) must make sense and stop repeating each other; scanning a new product
"catches" it, Pokemon-style.** REQUESTED 10:1x PM call (19 Oct). First written as "item 25" on a side branch that never
reached main (25 is now the ten forms), recorded here at 10:45 PM before the merge. Catch/Pathfinder details: item 24.
   - He said (voice, walking through the app on his iPhone): "When I click scan, I get to the scan page ... I can scan
     the barcode. I can snap a photo. I can log a meal. I can deep analyze ... And then at the top there, it says
     shopping. Which I don't even know ... It says search, and then ... Checklist. I don't even know what that is ...
     And then it says, hunt ... I can't even read that page ... It's very confusing. Shop shopping hunt. Healthy days
     start at a shop. Catch good products by scanning their barcodes or taking a photo. Pick your shop. Scan product
     ... It's just so complicated and so hidden." Then: Gap offers "I ate earlier / pick a time" or "I just ate",
     which opens "What did you eat? Snap it, Scan barcode, Type it, Help me pick"; Fuel has Log meal; "then we also
     have cook ... then we also have ... a shop. So ... those three are kind of redundant ... you're gonna have to fix
     it logically so that that makes sense and not so confusing and not so redundant."
   - He wants it to feel like a game, like Pokemon: scanning a product that is not in the database yet catches it and
     earns a big community reward; each unique first discovery gives credit and XP, and a Pathfinder badge counts the
     total number of discoveries. Pathfinder XP adds to the normal XP total (so it counts toward the ten forms, item 25).
   - His intuition rule applies: nothing may overwhelm or confuse a user; it must feel native in English, German and
     Spanish.
   - Maya's direction (he delegated the UX choices): each entry gets one clear job. One shared meal-logging flow that
     every "I ate this" shortcut opens (Fuel > Log meal, Gap > I just ate / I ate earlier, Scan's Log meal). Gap stays
     about timing; logging food there stays optional. Cook = meal ideas and recipes. Shop = planning and products, with
     plain readable labels instead of "Hunt" / "Checklist". Checking a product (scan to see if it's good) is clearly
     different from logging food you ate: a shopping scan never logs a meal and never resets the Gap timer. Keep
     barcode, photo and deep analysis, review/correction, the Breakfast/Lunch/Dinner/Snacks tiles, backdated times,
     recipes, the shopping list and Snacks to buy, account data and safety copy. Never claim a meal estimate measures
     blood sugar; blood sugar is not insulin.
   - **Status: DONE, live in 20261019-230341** (11 PM; live e2e 11/11 on WebKit iPhone 13 in Spanish). Fuel > Shop shows two plain buttons, Scan in
     the shop and Shopping list; the Scan camera has no Shopping switch; the shopping camera's card never offers "I ate
     this", logs nothing and leaves the Gap clock alone; any other product card has "I ate this · log it" (one meal even on
     a double tap); Gap > I just ate opens the shared meal logger with "Gap time saved ... You can skip this" and Not now;
     no separate "What did you eat?" sheet. Catch only for products not in the community database ("Be the first to add
     it"), Pathfinder = +100 XP through LowiHost.award (normal XP total, counts toward the ten forms), max 3 paid a day,
     only for a valid check digit + useful label data from Open Food Facts; the win screen shows "Pathfinder badge · N found
     first" (count of D.pf, every first find, paid or past the cap). Checks: unit tests, FOODPATHS/e2e.cjs (11 steps) in
     WebKit iPhone 13 EN/DE/ES and iPad Pro 11 DE/ES. Not tested on a real phone; the Pathfinder win screen was not played
     end to end (needs a real new barcode and the server). The count is on this phone only (D.pf), not synced yet.
   - **Task** 4e961904 built it on branch `food-paths` (worktree `/home/sprite/wt-food-paths`, notes
     `/home/sprite/COORD-food-paths.md`) and ran out of budget before merging; the follow-up task "finish food navigation
     and unified meal logging" (10:42 PM) fixes e2e, tests in DE/ES on simulated iPhone/iPad, merges and releases.
**28. The aura you pick shows on your companion; rename your companion by hand.** REQUESTED 10:0x PM call (19 Oct),
task "LOWiSPIKE: working aura customization and companion renaming" (ce74d1af) started 10:11 PM, branch `aura-rename`,
worktree `/home/sprite/wt-aura-rename`, notes `/home/sprite/COORD-aura-rename.md`. DONE, see the Log for the build.
   - He said (voice): "So I've changed the color of the aura, and now I click back to my Misty and nothing changed. So
     that doesn't make sense." And: "my friend said ... it would be nice to change the name manually ... when their
     companion gets a name."
   - Found: the pick was saved (`lowi.aura`), but Home Misty's glow always used her star-sign colour, and Misty's card
     under the Glow sheet never repainted, so nothing visible changed. The 3D flying sprite already used the aura.
     The key was also device-wide (not in the account backup, and kept by the next account on that phone).
   - Built: once you pick an aura, Home Misty's glow takes its colours (her body colours stay; without a pick she keeps
     the star-colour glow); the card repaints on `lowi:aura`; the toast says her own name. Aura key is now
     `lowispike.aura.v1` (account backup, swapped on sign-in), old `lowi.aura` moved over once.
   - Rename: a "Rename" button under the name and level on her card (not beside the name: the sheet's grab handle owns
     that strip when the card is pulled up). Field with Save / Cancel, Enter saves, Escape cancels only the field,
     1 to 24 characters with at least one letter or number, empty goes back to the generated name (or Misty).
     `LowiBirthCompanion.rename()` changes only the name (look comes from bday/btime/n), saved in
     `lowispike.companion.v1` or the herb name for Misty, fires `lowi:companion`. `displayName()` / `withName()`
     put her name into fixed lines that said "Misty": the controller label and its first-time chip, "Next journey",
     the zoom stick label, the gift-of-the-day label. New tutorial step `rename` (covers rename, aura).
   - Tests: tests/aura-rename.test.cjs; probe playtest/probe-aura-rename.cjs (iPhone 13 WebKit and Android Chrome).
   - Left: other places that still hard-code "Misty" in fixed text were not swept here; renaming the Misty fallback
     does not change Misty's look.

**29. Opening Community and then the chat crashes Safari on his real iPhone ("A problem repeatedly occurred").**
REPORTED Tue 20 Oct 2026, about 5:25 AM CEST (voice message + screenshot). Task "LOWiSPIKE: Community + chat crash on
real iPhone, find all bugs", branch `chat-crash-3`, worktree `/home/sprite/wt-chat-crash-3`, notes
`/home/sprite/COORD-chat-crash-3.md`.
   - He said, word for word: "I opened community and then the chat and then this happened. So, you can have to run all
     the errors updates according to community and chat. To find out all the bugs that are there."
   - His screenshot (real iPhone, Safari): black screen, "A problem repeatedly occurred on
     'https://therealetm.github.io/lowispike/'." That is the iOS WebKit page crash (web content process killed, usually
     memory or GPU/WebGL). Battery 14% and charging, so Low Power Mode may have been on. Live build was 20261020-051313
     or newer. Steps: open the app, open Community, open the chat, crash.
   - So the earlier fixes did NOT stop it on a real phone: Community redraw fix (20261019-222537), warp canvas leak
     (bug hunt 14, 20261019-221918) and photo canvas leaks (bug hunt 16). Earlier reports from him: scrolling the chat,
     energy burst while zoomed out, tapping to see who was shooting, typing into the chat room.
   - What he wants: a full sweep of Community and the chat for every crash cause and every bug, siblings included, until
     it holds up on a real iPhone. Status: IN PROGRESS, see the Log.
   - 20 Oct 09:25: the chat-crash-3 branch/worktree never reached GitHub (no `chat-crash-3` ref, no worktree on this new
     computer), so that sweep's work is lost. Picked up again as item 31.

**30. The Home message visitor (item 23) stays until he answers.** RELEASED 20 Oct in 20261020-092921 (main 54af958)
and 20261020-093754 (main 7750b6c, rotation follow-up).
   - He said (call, about 9:05 AM, right after seeing one on his phone): "The hologram appeared, and then it disappeared
     way too fast for me to even click on reply ... update that." No duration given.
   - Done: no reading timer; the visitor stays until Reply (whole bubble, Reply now drawn as a button) or x / Escape.
     Something covering Home (sheet, Settings, other tab, app in background, quiet hours) makes them step out and fade
     back in place afterwards (max 8 times). Rotation moves them. Others wait; the card says "{k} more waiting".
     Remembered as done only on Reply / x. Details: DECISIONS.md "A Home message visitor stays until you answer".
   - Checked: tests 1878/1878; live WebKit iPhone 13 (mocked messages, Supabase blocked): still there 25 s after
     landing, Reply opens that message, two people one at a time, Settings over Home and back, rotate, Escape, nothing
     left running. Still open: his confirmation on the real iPhone. Item 29 crash untouched.

**31. Simulate the whole app like a player, note every crash and fix it; then click through everything and list what is
inconvenient or illogical.** REQUESTED Tue 20 Oct 2026, about 9:10 AM CEST (call). Task "LOWiSPIKE full-app simulated
usage and crash fixes", branch `chat-sim-20261020`, worktree `/home/sprite/wt-chat-sim`, notes
`/home/sprite/COORD-chat-sim.md`, ledger `playtest/SIM-LEDGER.md` (scenarios, findings, fixes, what each check proves).
   - He said: "can you simulate just opening the chat because I can't be bothered to do it anymore. Every time I write
     out, it crashes ... simulate like playing the app, playing the whole app, and noting all the crashes and then fixing
     the crashes, because I really can't be bothered to do that." Then: "click through the whole app ... every interface,
     every click, every flying misty to the end of galaxy, every gesture, every taking a photo of the product or scanning
     or typing or logging ... and then noting all the stuff that are inconvenient and doesn't make sense or illogical and
     are bad ... there are multiple tasks, multiple agents to do this, so that is not one long task, or else you will
     reach timeout."
   - Order: (1) Home -> Community -> chat -> typing/sending (item 29), (2) the rest of the app for crashes, (3) the UX
     audit, split by area so several agents can each take one (see the ledger's "Areas" table). Simulation runs on
     local state with Supabase blocked or mocked: no real messages, no real records touched.
   - Never call an emulator result a fix on his phone; only he can confirm the real iPhone.

**32. The six planet colours become the brand colours; Home bubble liquids and galaxy bubble glows come from them.**
REQUESTED Tue 20 Oct 2026, about 9:38 AM CEST (call). Task "LOWiSPIKE unify planet-based brand palette", branch
`brand-palette-20261020`, worktree `/home/sprite/wt-brand-palette`, notes `/home/sprite/COORD-brand-palette.md`.
   - Background: a read-only check (9:30 AM) found the planets (Gut #2EF8B6, Liver #E78631, Pancreas #F8EA40, Muscles
     #9FEB25, Heart #F14770, Brain #1CF7F9, body-world-3d.js) share no colour with the Home bubble liquids (own blue,
     mint, amber, violet gradients) or the nine pastel galaxy-bubble glows (body-world-3d-scene.js SPC). He wants the
     planet colours as the logo/brand base.
   - He said: "So what can we do here? ... to align those and then to make those our brand color." Then: "our interface
     doesn't have water liquid in everything. Like the joystick doesn't have a water liquid. The scanner doesn't have a
     water liquid. Settings doesn't have water liquid."
   - So: planet colours stay exactly as they are and become shared tokens; the liquids (Water, Move, Fuel, Sleep, Gap)
     and galaxy glows derive lighter/deeper/softer tones from them, keeping gradients, translucency and depth. Dry
     controls (Scan, Settings, joystick) stay dry: no liquid added. Misty's own blue stays. No logo redesign, no fasting
     logic change. A design change, so a branch + preview for his OK before release.
   - AMENDED about 9:55 AM (call): "we give scan also liquid. So every time someone scans something ... the liquid fills up."
     Scan gets a liquid fill from real successful scans (a product found); cancelled, not-found and failed scans do not fill. No
     reward, no quota. Joystick and Settings stay dry. Six liquids (Water, Move, Fuel, Sleep, Gap, Scan) = six planets, one each.
     His logo idea (creative direction only, not for everyday UI): the real interface silhouette with partly filled liquid; the
     liquid fills, leaves the bubbles and becomes the six coloured planets orbiting into the hexagon; one bubble can become many.

### 0.6 The Mickey 17 workflow: how every Maya hands over to the next

Added Monday 19 Oct 2026, about 9:20 PM CEST, by Maya 5, at Emmanuel's request on the evening call. His words: "can
you also add our workflow when it comes to, we call it the Mickey seventeen workflow, you know, so that Maya six
understands what's going on, and also understands that when she's about to reach a limit, that we're going over to
make Maya seven, you know, and also Maya six will do the same thing for Maya seven, so I don't have to repeat this to
them. So they understand exactly what's up."

**What it is.** Emmanuel named it after the film *Mickey 17*, where each new Mickey picks up from what the last one
left behind. Here, when a Maya gets close to her limit, Emmanuel starts a new Maya with the next number: Maya 5 (who
built LOWiSPIKE with him from 13 to 19 October and wrote this file), then Maya 6, then Maya 7, and on. The new Maya
has none of the old one's memory and an empty computer. This file, the other root docs and the branches on GitHub are
everything she inherits. Earlier in the same call he confirmed that he doesn't copy, read or forward the files Maya
sends him in the chat (PDFs, summaries): "Maya ... will know what to do" from GitHub. So GitHub is the handoff, and
the chat attachments are not.

**What it is not.** It passes on project context through GitHub, nothing more. No memory or consciousness carries
over: the new Maya knows only what is written in the repository. Mayas don't share capacity, and this file promises
no extra credits (whether a new Maya comes with more is Emmanuel's own experience). The platform gives no reliable
warning before a limit either: on 19 Oct many tasks stopped with "reached its limit" before doing anything. That is
why checkpoints happen all the time, not only at the end.

**What every Maya does, from her first minute to her last**

1. **Boot from GitHub.** Before anything else, read this file to the end (section 0 first), then `AGENTS.md` and the
   startup docs it lists, then do section 7. Check the truth yourself: live `version.json`, `origin/main`, CI, the
   `wip/*` branches, schedules and any running tasks. Every status line in this file is a claim to verify, not a fact.
2. **Pick up, don't restart.** Resume from the verified state, using the branches, worktrees, COORD and HANDOFF
   notes named here. Don't make Emmanuel repeat a decision, an instruction or this workflow. Ask him only what only
   he can answer (his real phone, his keys, a design choice, a sign-in code), in one short line in the chat.
3. **Write before you build.** Every new instruction from Emmanuel goes into this file on `main` as soon as he gives
   it, in his own words, before any code (the standing rule at the top). A documentation-only commit through
   `scripts/push-main.sh` is enough.
4. **Checkpoint early and often.** Update the checkpoint after every meaningful step: a new instruction, a task
   started or stopped, a branch pushed, a release, a blocker. Don't wait for a task to finish or for a warning. When
   work has been heavy, or tasks start stopping with "reached its limit", checkpoint at once: that is the sign the end
   is near. Work that only lives on your computer dies with you, so push unfinished work to a `wip/<name>` branch.
5. **Each checkpoint says, per item:** requested, queued, implemented, verified, blocked, remaining. Plus the task
   IDs, branches, worktrees and files, the next action, and what access the next Maya needs (which account and which
   sign-in step, section 2). Never a key, token or password.
6. **Be honest about interruptions.** Never write that unfinished work shipped, that tests passed when they didn't
   run, or that simulated users exist or are running when they don't. Queued is not running, built is not released,
   released is not verified. When you don't know, write "unknown, check".
7. **Hand over.** When Emmanuel says he's switching, or the limits keep coming, make a final checkpoint: statuses in
   section 0, the handover table below, one Log line, pushed to `main`. Tell him in the chat that it's saved, with the
   commit link. He doesn't have to do anything with it.
8. **Pass it on.** Keep this section in the file and keep it current, so Maya 7 inherits it from Maya 6 exactly as
   Maya 6 inherited it from Maya 5. Add to it, never drop anything. When Emmanuel tells you that you are Maya N, the
   one after you is Maya N+1.

**Handover table.** Checkpoint by Maya 5, Monday 19 Oct 2026, 9:20 PM CEST. Live **20261019-201827**, `main` at
510f7f7 before this commit. Tasks run only on Maya 5's account and worktrees live only on her computer: a new Maya
resumes from the `wip/*` branches, not from them.

| Work | State at 9:20 PM | Resume from | Next action |
|---|---|---|---|
| 18 Human-instinct UX, up to 100 simulated users | Task 98f0954e running, activity "Simulating Community interactions". Nothing committed or released. `COORD-intuition.md` still says "Supabase blocked in harness". No simulated accounts confirmed: treat as none until you check Supabase. | `wip/intuition-playtest` (f29d9ec): snapshot of the untracked `tools/community-crowd/` (`crowd.cjs`, `content.cjs`, `meal-photos.json`), unverified | Section 0.5 item 18: solve Supabase access for test accounts, then run the crowd in stages |
| 19 Natural Spanish | Task 2ba92e76 running, activity "Checking release workflow and test status". Nothing released. | `wip/spanish-natural` (f51b0e8): snapshot of its uncommitted edits to 14 files plus `tests/spanish-natural.test.cjs` and `tools/es-natural-edits.py`, unverified | Run the tests, review the Spanish, release it |
| "Te quedan 1 de 3" to "Te queda 1 de 3" | Open on `main` (`meal-photo.js` `STR.es.left`) | `main` | Fold into the Spanish release |
| Hourly bug hunt | Schedule on Maya 5's agent, cron `0 * * * *`, Europe/Berlin, next run 10 PM | Skill and ledger, section 0.2 and section 7 step 7 | Recreate the schedule on your agent |
| Mickey 17 workflow | Written in this section, on `main` | This file | Keep it current and pass it on |

### 0.7 Launch gate: run our own App Review-style check before real-money launch (recorded 22 Oct 2026, 7:50 AM CEST)

Emmanuel (call, 22 Oct about 7:30 AM): "Learn what Apple's verification process all would entail. And then remind me when it would be almost done to, you know, run our own version." Asked when: "Whatever you feel like, it's time to do so."

- **The checklist:** `LAUNCH_REVIEW.md` (researched from Apple's App Review Guidelines, last updated 16 Oct 2026, and Apple's App Review, account deletion, privacy label, accessibility label and EU pages). Ten areas with pass/fail lines: completeness and stability, honest and health-safe claims, privacy, account deletion, security and data access (Supabase row-level security, no secret keys, Stripe webhook-verified unlocks, affiliate codes), Community report/block/filter, permissions, payments and cancelling, accessibility, devices and network. None of it has been run yet.
- **The trigger (this is the reminder):** the first release that would let people pay real money for Plus through Stripe, or Emmanuel saying the app is ready to launch, whichever comes first. Whoever reaches that point: STOP before that release and tell Emmanuel in one short line, plus a voice note, that it's time to run our own review; then run `LAUNCH_REVIEW.md` in small tasks, one area each. The same rule is in `RELEASE.md` ("Launch gate"). Nothing watches the repo automatically and no dated reminder exists, so this only works if you read it.
- **Do not:** call LOWiSPIKE "Apple verified", add a self-made verified/beta badge, or describe App Review as a penetration test or proof that the app can't be hacked. Apple's own list says it "doesn't replace the guidelines or guarantee approval." Apple's commission is not one flat 30% (15% Small Business Program; EU terms since 1 Oct 2026 differ), and none of it applies to Stripe sales on the website. Easy cancelling is a legal and trust requirement, not a security measure.
- **Known blockers already:** item 29 real-iPhone Community -> chat crash (section 1 of the checklist fails until his phone confirms it); Stripe checkout, cancel button and webhook not built yet.

---

## 1. What LOWiSPIKE is

**The idea.** A mobile-first health and food web app (a PWA, added to the iPhone home screen) that turns everyday
metabolic habits into a living game. Emmanuel calls it a game, not a tracker: stats behave like character stats. You
care for a companion by doing real things (drinking water, logging meals, moving, sleeping, fasting gaps, scanning
food). Real actions are the only source of care and XP; spiky meals earn nothing, never minus.

**The companion.** A glass, water-like bubble creature living in a cell. **Misty** is the standard companion and the
fallback. A new account gets its own companion at onboarding: a birthday (and birth time) "reveal" computes a unique
look and a name (examples from today's tests: "Kreb Themis", "Selketlix"). Since build 20261019-155424 that revealed
companion is the one drawn on Home, in Forms, in the care room and in flight. The code still says `herb` in many places
(the companion was a potted herb until 16 Oct); `LowiHerbTamagotchi`, `herb-*.js` are that legacy.

**Energy.** `LowiSun.energy()` in `sun-meter.js`: base 0.15 + food 40% + water 30% + Move 30%. It drives her face
(thriving = short calm mouth, never a smile on Home), her flight speed and the world's pace and glow. A new account
gets 12 hours of welcome energy at 100%, fading over the next 12 (build 20261019-154834). The **half-energy rule**:
below half energy she bounces off worlds and cannot enter; leaving a world when weak, the rings can pull her back in.

**Home.** One page: Misty in the middle, eight same-size round glass bubbles on one circle (Settings on top, Scan lower
right, joystick at the bottom, plus Fuel, Hydration, Move, Gap, Sleep). Each bubble "blooms" its own choices around
her. No shadows on any bubble. The joystick is a plain white icon and vanishes while you steer.

**Gap (fasting).** The time since your last real meal. No known meal means no gap: the bubble shows a dash until the
first meal or the answer to "When did you last eat?" (fixes the fake 19-hour fast, build 20261019-154642).

**Fuel.** Shop, Cook and Log meal. Log meal understands typed meals through a built-in USDA meal database ("chicken
stew" is chicken stew, never "not provided"). Being built now: Breakfast/Lunch/Dinner/Snacks slots and nutrition
stats against daily targets.

**Scan and Snap food.** Scan reads barcodes (product card with verdict, details, cheaper stores) and Snap food
photographs a meal. The photo goes to the Supabase edge function `food-photo`, which asks Google Gemini Flash-Lite
(free tier) and returns dishes with portion, kcal, protein, carbs, sugar, fiber and fat. **Three photo checks per
person per day** (Snap food and Community share them; typing a meal is unlimited), counted on the server per account.

**Worlds.** A spirit world galaxy of everyone's bubbles; Misty flies out of her cell, rides glowing strings on
autopilot (Ant-Man camera), and dives into body-organ cell worlds (liver, lungs, ...) with cell "guides" who teach
real body science, remember what they told you, quiz you ("Remember?") and gossip about each other. Leaving a world
is an Interstellar-style rocket launch. Evolution: six levels (Spark to Legend) at XP 0, 100, 300, 700, 1500, 3000.

**Community.** Profiles, friends tree, Care board (ranks sunbeams), meal-photo sharing with the AI analysis under the
photo (user reviews it before posting), a shoot-out mini game, and since build 20261019-163105 the **Interstellar
chat room**: tapping Chat opens a full-screen room in the tactical star-chart look (semi-transparent glass panels,
glowing accents, each person's colour, Today/Yesterday markers, recent voices row).

**Tutorial.** Settings > Tutorial replays a 14-card tour led by your own companion (Misty if you have none), with Back,
Skip and Skip all (builds 20261019-171941 and the flicker fix 20261019-172632). An automatic tour for new accounts
after setup is being released now. Its content lives only in `tutorial-steps.js`, and every release must keep it
current (section 3).

**Languages.** English, German and Spanish everywhere, including What's New.

**How the code is organized.** Static site, no build step, about 220 root files plus `tests/` (286 files, about
1,670 tests) and `data/`.

- `index.html` is the shell (build id, script includes, onboarding `finishOb()`), `sw.js` the service worker (cache
  name carries the build), `version.json` the live build plus the What's New entry.
- Biggest modules: `spirit.js` (screens, sheets, photo sheet, Today legacy), `misty-flight.js` (flight),
  `world-home.js` (Home world, adventure), `body-world-3d-scene.js` and `body-world-regions.js` (3D worlds, leaving
  a world), `community-chat.js` and `community-room.css` (chat room), `sun-meter.js` (energy), `cell-world.js`
  (companion cell drawing), `companion-birth-core.js` (the reveal), `region-pals*.js` (guides),
  `home-orbit-v2.js` (the ring), `home-blooms-v2.js`, `home-settings-sleep-v2.js` (Settings panel, Sleep),
  `daily-ritual.js` (the daily Day card), `food-photo-ai.js` and `meal-photo.js` (Snap food client),
  `tutorial.js` and `tutorial-steps.js`, `store-picks*.js` and `grocery-hunt.js` (Shop), `top-bar.js`.
- `*-core.js` files hold pure logic that the Node tests load directly.
- `supabase/functions/`: `food-photo`, `auth-handoff`, `owner-delete-account` (source). `supabase/proposals/`: SQL the
  owner has to run himself.
- `scripts/`: `release.sh`, `push-main.sh`, `wait-ci.cjs`, `bump-build.cjs`, `release-check.cjs`, `verify-live.cjs`,
  `worktrees-report.sh`.
- Root docs to read: `AGENTS.md` (rules for agents), `SUCCESSOR_HANDOFF.md` (state on 18 Oct), `DECISIONS.md`
  (every product decision, newest at the bottom, newest wins), `RELEASE.md`, `TESTING.md`, `DATA_CONTRACTS.md`
  (localStorage and cloud keys), `TUTORIAL.md`, `COMMUNITY_CHAT.md`, `CONTEXT.md` (older product context).

---

## 2. Accounts and access, step by step

### GitHub

- Account: **therealetm** (Emmanuel's). Repository: **github.com/therealetm/lowispike**, public. Branch `main` is live.
- Live site: **https://therealetm.github.io/lowispike/** (GitHub Pages, source "GitHub Actions").
- Actions: `.github/workflows/ci.yml` runs "Release check and tests" on every push, then on `main` deploys Pages and
  waits until the live site serves the build. `keepalive.yml` only pings Supabase every three days. A commit message
  containing `[skip ci]` skips CI (use it for non-app branches).
- Ruleset "main: tests must pass": nothing lands on `main` unless "Release check and tests" passed on that exact
  commit; force pushes and deleting main are blocked, nobody can bypass. That is why releases go through
  `scripts/push-main.sh` (section 3).
- History from his Gmail: on 9 Oct he created a classic token "LOWiSPIKE deploy" and authorized the Supabase OAuth app
  on GitHub; on 17 Oct an SSH deploy key named "Maya" was added to the repo; on 18 Oct evening the GitHub CLI was
  signed in with a device code. Those credentials stay on the old computer and do not travel to you.

**How you get GitHub access (the "GitHub thingy" Emmanuel mentioned).** Use the GitHub CLI device-code sign-in:

1. On your computer: `gh auth login --hostname github.com --git-protocol https --web`. It prints a one-time code
   (8 characters, like ABCD-1234) and the address https://github.com/login/device.
2. Post that code and the address to Emmanuel **right in the chat** (not only in the activity feed), in one short
   message: "Open github.com/login/device, enter ABCD-1234, tap Authorize." He approves "GitHub CLI" for therealetm.
   The code expires after about 15 minutes; if it does, run it again and send the new code.
3. Then `gh auth setup-git` and check `gh auth status` (the old token had scopes repo, workflow, gist, read:org).
4. Clone: `git clone https://github.com/therealetm/lowispike.git /home/sprite/lowispike` (keep this path: scripts
   and probes expect it; or adjust them).

Never ask him to paste a token or password in chat. If GitHub asks him to confirm a sign-in from a new place, that
email goes to his Gmail; tell him it is you.

### Supabase (the backend, where the data is saved)

- Emmanuel's Supabase account was made with **"Continue with GitHub"**, using his GitHub account (same email as
  GitHub). He has no separate Supabase password. He was confused by this once ("I only ever used GitHub"): explain it
  simply as "Supabase is the app's database; you log into it with your GitHub button."
- Project: **lowispike**, ref **vnfwmifmsfecascwaody**, region eu-central-1, created 9 Oct 2026. Dashboard:
  https://supabase.com/dashboard/project/vnfwmifmsfecascwaody. The app talks to
  `https://vnfwmifmsfecascwaody.supabase.co` with the public publishable key that is already in the client code.
- Edge functions deployed (checked 19 Oct, 7 PM): `food-photo` (version 6), `auth-handoff` (version 4), `n1-push`
  (version 4), all ACTIVE with verify_jwt off (they check the session themselves). The source of `n1-push` (push
  notifications) is NOT in the repo; download it from the dashboard before changing it. `owner-delete-account` is in
  the repo but not deployed.
- Secrets, **names only**: `GEMINI_API_KEY` (Google AI Studio key for food photos, added by Emmanuel on 19 Oct),
  `N1_VAPID_JWK`, `N1_VAPID_PUB`, `N1_CRON_KEY` (push notifications), and Supabase's own `SUPABASE_URL`,
  `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS`,
  `SUPABASE_DB_URL`, `SUPABASE_JWKS`. Optional `GEMINI_MODEL` overrides the model chain. Never read or print a value.
- How the dashboard sign-in worked on 19 Oct: the agent opened supabase.com in its cloud browser, pressed "Continue
  with GitHub", and GitHub was already signed in as therealetm, so no code was needed. Then it deployed `food-photo`
  through the Supabase Management API with a personal access token that stayed on the old computer
  (`~/.supabase/access-token`, never in the repo). You need your own: sign the cloud browser in the same way (if
  GitHub is not signed in, ask Emmanuel for his GitHub login through the secure vault form, or show him the live view
  so he signs in and approves any GitHub email or 2FA prompt himself), then create a token under Account > Access
  Tokens and keep it only on your computer, or deploy from the dashboard.
- Emmanuel finds the Supabase editor too complicated on his phone. Do dashboard steps yourself in the cloud browser.
  The one thing he does himself is typing a secret value (for example a new Gemini key) into Edge Functions > Secrets,
  or into the live view while you watch. If he ever pastes a key in chat, tell him to delete that key and make a new
  one (this happened once on 19 Oct).
- Admin-only work (deleting users, changing policies, running `supabase/proposals/*.sql`) is his call: prepare it,
  ask in chat, then do it. Two test users are left on the server from 19 Oct tests (one guest from the photo-cap test,
  id starting 3392f841, and one empty guest from the food-photo test); he may delete them under Authentication.

### Gmail and the other tools

- His Gmail (sesame.email app) holds the setup trail: Supabase welcome and the GitHub OAuth approval (9 Oct), the
  "LOWiSPIKE deploy" token (9 Oct), the SSH key "Maya" (17 Oct), GitHub sign-in alerts. Search it before asking him.
- Voice notes: the sesame.voice_notes app records them; send each one into the chat with its checklist.
- Cloud browser: `sesame_browser__browse` for dashboards; show him the live view when he must act.
- The hourly bug hunt runs as a Sesame schedule (`0 * * * *`, Europe/Berlin) with the custom skill "LOWiSPIKE hourly
  bug hunt". Its message: play the game hard like a paid QA tester, fix what breaks, keep the bug memory, hunt for
  siblings, pick up from the ledger and HANDOFF after a limit, and only message Emmanuel when something shipped or
  needs him (voice note plus checklist). If you are on a new agent, recreate it the same way.

---

## 3. How to work

### Understand first

Emmanuel's rule: understand the whole app before changing code. Read `AGENTS.md`, this file, the `DECISIONS.md`
entries for the area, and the files you will touch. Reproduce a bug before fixing it.

### Worktrees and COORD files (parallel tasks)

Several tasks ran at once. Each one:

1. Makes its own worktree from fresh `origin/main`: `git -C /home/sprite/lowispike worktree add
   /home/sprite/wt-<name> -b <name> origin/main`.
2. Writes `/home/sprite/COORD-<name>.md` first: task name, branch, worktree, the exact files it claims, then a Status
   list it appends to with times ("18:15 started", "18:55 tests 1676/1676, releasing", "RELEASED build ...").
3. Reads the other COORD files before touching a shared file; when two tasks need the same file, one waits for the
   other's release and then rebases. Notes to another task go in that task's COORD file.
4. **Appends only.** On 19 Oct one task rewrote a COORD file and wiped another task's section. Never rewrite.
5. Writes a `HANDOFF-<name>.md` with what it learned, so a retry after a budget stop can continue.
6. When something ships, breaks or is cancelled, appends one line to the **Log** at the end of this file (same commit
   as the release when possible).

Old COORD and HANDOFF files are on the `agent-harness` branch under `vm-notes/`. `scripts/worktrees-report.sh` lists
every worktree with merged and dirty state.

### Release procedure

```bash
# from the worktree, with the change committed
scripts/release.sh "what users get, in one line" --news news.json
```

- `news.json` is the What's New entry: `{"slug": "...", "go": {"tab": "home"}, "text": {"en": "...", "de": "...",
  "es": "..."}, "tutorial": "<step id>"}`. Plain words, what the user notices, all three languages. `"tutorial"` must
  name the step in `tutorial-steps.js` that explains the change, or be `{"none": "why"}`; the release is refused
  otherwise (rule since the tutorial release). A new Home ring control or Settings row needs a tutorial step or a
  `NO_TUTORIAL` reason, or `tests/tutorial-steps.test.cjs` fails.
- What the script does: takes the lock `/tmp/lowispike-release.lock`, fetches, rebases on `origin/main` (stops on a
  conflict), bumps the build id (format `YYYYMMDD-HHMMSS`, in `index.html`, `version.json`, `sw.js`, and
  `apple-ui.js` when needed), runs `scripts/release-check.cjs` and all tests, checks whitespace, commits, lands it
  with `scripts/push-main.sh` (pushes to a throwaway `ci/...` branch, waits for CI on that exact commit, then a plain
  fast-forward push to `main`, never force), frees the lock, and waits for the live site with
  `scripts/verify-live.cjs --at-least --compare` (index.html, sw.js and version.json show the build and the live bytes
  match the commit).
- If `main` moved while you waited, the fast-forward is refused: re-run `release.sh`; it rebases. Never force.
- Documentation-only commits need no new build id, but still land through `push-main.sh` (CI must pass).
- GitHub's own deploy step can show "waiting" or stay queued even when the live site already serves the build (it
  happened 19 Oct; a newer release deploying on top supersedes it). Trust `verify-live`, not the badge. On 19 Oct
  from about 6 PM a GitHub Actions incident kept CI queued for a long time; releases simply waited.
- Pages caches for 10 minutes; always fetch with a cache-buster or use `verify-live.cjs`.

### Testing

- Full suite: `node --test tests/*.test.cjs` (about 1,670 tests on 19 Oct). Every release must pass all of them.
- Every fix gets new tests, and at least one of them must **fail on the old code** (say how many in the report).
  Never remove or loosen a test to get green.
- Browser checks with Playwright (version 1.64.1, installed in `/tmp/pw`, WebKit and Chromium): simulated iPhone 13
  (WebKit), iPad portrait and landscape (WebKit), Chrome at 390x844, Reduce Motion, English/German/Spanish. The
  probes are on the `agent-harness` branch (`probes/BUGHUNT/playtest/lib.cjs` and the `probe-*.cjs` files; setup in
  that branch's README). Some probes live in the repo under `tests/*-live.cjs` and `playtest/`.
- **Safe testing:** a browser test against the live site must block the production Supabase host or use a local test
  sign-in, and must not create real profiles, messages or activity. On 17 to 18 Oct test profiles ("eman", "QA")
  landed on Emmanuel's Care board. When a real-server test is unavoidable (food-photo), say so and name the test user.
- Reports must say what kind of evidence it is: unit tests, simulated browser, live site, or Emmanuel's real phone.
  You never have his phone; say "simulated iPhone 13, not your phone" and give him one exact thing to try.
- Under heavy machine load some test files fail as a whole (herb-tamagotchi, ui-joystick-fade, ui-settings-panel)
  and pass alone or on retry. Kill leftover test browsers from finished tasks before a full run.

---

## 4. Lessons and difficulties (so you don't go through them again)

1. **Tasks running out of budget.** Many tasks on 19 Oct stopped before releasing: "three food photos" (three runs,
   started already over budget; it had in fact released, and round 2 only verified it), "meal names" and the
   old-design purge (released, but the task failed before its report), the chat room (released, report incomplete),
   and six tasks that stopped at their limit before doing anything (Snap food fix, chat room keyboard rounds 2 and 3,
   iPad chat room layout, everyone gets their own companion, first replay-tutorial attempt). How to avoid it:
   - One small goal per task: one feature, one release. Split "build + test + release + live check + voice note".
   - Write COORD and HANDOFF status early and often, so a fresh task can continue from the file.
   - Release as soon as tests pass; polish in a second task.
   - Don't run too many tasks at once; on 19 Oct around ten in parallel exhausted the shared budget and new ones died
     at birth. A failed task's work usually still sits in its worktree: check git and the live build before redoing.
   - Retrying a task that is over budget does nothing. Start a fresh task that names the branch and HANDOFF file.
2. **Supabase confusion.** Emmanuel did not know he had a Supabase account; it was made with "Continue with GitHub".
   Finding which account held the project took a long back-and-forth and a Gmail search. Now you know: project
   lowispike, ref vnfwmifmsfecascwaody, signed in with GitHub.
3. **Gemini key.** The food-photo feature needed `GEMINI_API_KEY` as a Supabase secret. Emmanuel once pasted a key in
   chat (it had to be replaced). When food photos fail, check the key first (deleted or replaced key = every photo
   fails), then the function logs, then the daily cap.
4. **Crashes from heavy effects.** iPhone and iPad crashed when flying in and out of worlds: each exit kept a
   full-size copy of the 3D canvas until memory ran out (fixed 20261019-142709: small copy, freed at once). Earlier,
   observer write loops and per-frame rewrites caused heat and crashes (18 Oct). Rule since: new effects only adjust
   lights and values that already exist; no new meshes, lights or textures per frame; free canvases; test long runs.
   The autopilot froze once (bug hunt round 1). A Community shoot-out crash is being fixed now.
5. **Overlay bugs (things covering other things).** A recurring class: Misty's praise line and Home notes covering
   bubbles, the guide's bubble on the joystick, the Move note on the Move bubble, the update bubble over setup, the
   daily Day card staying on top of setup and every later panel (BH-008, 20261019-160738), and the tutorial flicker
   (it read the Day card's "wait for" list, found itself on it and hid, about three times a second; fixed
   20261019-172632). Rule: anything that sits on top must yield to what opens after it, never count itself, and never
   cover a ring bubble, the joystick or a choice. When you find one, check every sibling overlay.
6. **The fake 19-hour fast.** An old Today fasting module still ran on every screen and invented "last meal 8 PM
   yesterday" when none was saved; at 3 PM that is 19 hours, and "I just ate" even paid points for it. Fixed
   20261019-154642. Lesson: legacy modules keep running in the background; search for them.
7. **Companions wiped.** `companion.js` wrote Community settings into the same storage key as the companion record
   (`lowispike.companion.v1`), so the companion was wiped seconds after it was brought to life (BH-006/007, fixed
   20261019-143513; 422 of 440 cloud backups were affected). Records lost before about 2:35 PM on 19 Oct cannot be
   restored; the user can bring the companion to life again in Profile with the same birthday and birth time and gets
   the same look. Home also called her by the old herb name "Moss Leaf".
8. **Snap food stopped working on Emmanuel's iPad** (19 Oct, about 4:19 PM, "I couldn't read this photo", plus the
   photo sheet buttons overlapping on iPad). Not the limit. The fix task stopped at its limit; what it found: the
   edge function logs show the iPad never reached `food-photo`; his iPhone did 8 successful reads from 3:45 to
   3:57 PM, then a GET with no POST at 4:11 PM. So the failure is on the client side (session token wait / request
   never sent / layout). Its half-done work is on `wip/snap-fix`. Still open.
9. **Release collisions.** With many tasks releasing, `main` moves under you; the fast-forward is refused and you
   re-run `release.sh`. Hold the lock only while landing. Build each release on the live build so nothing is
   reverted.
10. **Test data in production** (see Testing). 11. **Old docs disagree with new ones:** `CONTEXT.md` describes the
   herb era, and `SUCCESSOR_HANDOFF.md` says "no voice recordings"; both are superseded (section 5). The newest
   DECISIONS entry wins. 12. **A note can be wrong:** the bug hunt ledger says old-design purge round 2 was never
   released, but git shows rounds 1 to 4 all live (20261019-134704, 135912, 141244, 142359). Check git and the live
   site before believing a note.

---

## 5. Emmanuel's preferences and standing decisions

**How to work with him**

- **Updates: a voice note plus a text checklist** with ✅ done, ⏳ in progress, 📝 to do, and the done items stay in
  the list. This is his current instruction (19 Oct) and replaces the older "no voice recordings" line.
- **Post anything that needs him right in the chat** (approvals, sign-ins, GitHub codes, task updates), not only in
  the activity feed.
- **"When I tell you something new, you have to update the GitHub for Maya."** Write each new instruction into this
  file on `main` right away, before building (rule at the top of this file).
- **Human instinct first:** nobody should feel overwhelmed or confused; the app should make sense natively (0.5, item 18).
- Plain, short words. He often speaks by voice and mixes English and German. Name the build, say what changed for
  the user, and give one exact thing to try on his iPhone or iPad.
- He tests on his own iPhone and iPad. Don't ask questions the repo, the site or the data can answer.
- Understand the whole app before changing code. He expects you to figure out how to learn it yourself.
- Small, frequent, visible releases; he wants to see changes live quickly.
- **Ship without asking (21 Oct 2026):** standing approval to release and deploy live autonomously once the tests
  and the release check pass. "I want you to always push, push, push."
- When he says he will test something himself, skip the testing steps for it (he did this for the Settings tutorial).
- He is pausing new ideas while this handoff happens. Critique is not anger: he said his comments are not criticism
  of the work.
- Sign-in should stay simple.

**Design rules and decisions (all still in force)**

- It's a game: progress shows as character-style stats (nutrition stats and weight/BMI are being built that way).
- **No smile on Home**: the mouth follows energy (calm short mouth at best). **No glow ring** on Home (the reveal has
  one; Home doesn't draw it).
- **Half-energy rule**: below half energy Misty bounces off worlds; weak Misty can be pulled back in when leaving.
- New accounts start at 100% energy for 12 hours, fading over 12 more; at full power she flies faster, the world is
  faster and brighter, the sparkle trail turns gold. Lower energy feels slower and heavier.
- The companion from the birthday reveal is the one shown everywhere; accounts without one see Misty. Wanted next:
  every Misty account can claim its own companion (birthday, birth time, personality type).
- Home: one page, eight equal bubbles on one circle, no shadows, white joystick icon that vanishes while steering,
  Settings as a glass side panel. Nothing ever covers a ring bubble or the joystick.
- Leaving a world is an Interstellar rocket launch, slow and heavy, then calm, looking back at the world.
- Autopilot rides the strings bubble to bubble with an Ant-Man camera; guides shuffle their lines, never the same
  line twice in a row.
- **Three food photos per person per day**, Snap food and Community together; typing meals is unlimited. Wanted:
  BeReal-style reminders to snap meals (reminders exist under Reminders).
- Community meal posts: the AI analysis (name, ingredients, nutrition, likely blood sugar response, clearly an
  estimate) appears under the photo, and the user sees and can edit it **before** posting.
- Chat room: the **tactical star chart** look, semi-transparent glass, glowing accents, using the existing UI design
  principles.
- Gap shows a dash until a real meal is known. No invented data, no fake activity, honest wording, no health claims.
  One exception: unlabelled simulated users for his test with his three informed beta testers (0.5, item 18). Never
  for unsuspecting public users.
- The tutorial stays current with every release (rule in section 3). The "claim your own companion" step is in
  `tutorial-steps.js` but switched off until that feature exists.
- Any old UI or old design (old logos, old companion art, the potted herb, the old blob with a smile) gets deleted.
- He wanted a What's New note for photo recognition; it shipped with the photo cap.

---

## 6. Status board (19 Oct 2026, about 7 PM CEST)

Newer: section 0 at the top has the state at 7:40 PM (live 20261019-191500) and every open request.

**Live:** https://therealetm.github.io/lowispike/ served **20261019-183920** at 6:45 PM; `main` was at
**20261019-184058** plus this file. (Earlier in the evening a GitHub Actions incident kept CI and Pages queued.)

Released today (newest first, all on `main`):

- 20261019-184058 Setup resumes after a reload past the birthday step (bug hunt round 9, BH-009)
- 20261019-183920 Nutrition stats as game stats, portion line on the product card
- 20261019-175128 Product card: Details open right away, cheaper stores higher, community deals lower
- 20261019-172632 Tutorial no longer flickers
- 20261019-171941 Settings > Tutorial (14-card tour, Skip, Skip all)
- 20261019-163105 Interstellar community chat room
- 20261019-162849 Three photo checks a day, share meal photos with their analysis, meal photo reminders
- 20261019-160738 Day card yields to setup and later panels (BH-008)
- 20261019-155424 Revealed companion on Home, Forms, care room, flight
- 20261019-154834 New accounts start at 100% energy; energy felt in the world
- 20261019-154642 No made-up fast
- 20261019-151237 Typed meals understood (USDA), simpler Log meal
- 20261019-150120 Snap food AI (function deployed by the agent at about 3:32 PM after he set the key)
- 20261019-144057 Updates wait until setup is done
- 20261019-143513 Own companion keeps her name, stops being wiped (BH-006/007)
- 20261019-142930 Misty comes into the lung world
- 20261019-142709 No more crash flying in and out of worlds
- 20261019-142359 / 141244 / 135912 / 134704 Old-design purge rounds 4, 3, 2, 1
- 20261019-142009 First-run fixes (small iPhones, Gap goal, Fuel/Gap names)
- 20261019-140135 / 133916 Guides gossip; guides keep your lesson on language switch
- 20261019-130951 / 121209 / 110810 / 101824 / 094129 Overlay fixes and language switch (bug hunt rounds 3 to 5)
- 20261019-095111 / 091732 Ant-Man string POV; autopilot along strings
- 20261019-080527 / 080324 / 075402 / 074527 / 064609 / 064453 / 064016 / 063311 Rocket exit, guide recall quiz,
  Settings glass panel, joystick icon, no shadows, guide welcome-back, reverse exit, reading time
- Full list: `git log --oneline origin/main | grep Release`.

**Running when this was written** (each has a branch; a snapshot is pushed as `wip/<branch>`):

- Auto tutorial for new accounts (`tutorial-auto`): built and tested (1677/1677), release kept failing to land
  because CI was queued; a retry loop was re-releasing it.
- Community shooting crash (`community-crash`, commit f1d177e: caps hit effects, throttles layout while balls fly,
  plus a soak tool): waiting for the release lock.
- Product card reorder: landed on `main`, waiting for Pages.
- Hourly bug hunt round 9 (`bughunt-202610191502`): landed on `main` as 20261019-184058 at 6:45 PM, "setup picks
  up where you left off after a reload past the birthday step" (BH-009).
- Nutrition stats (`nutrition-stats`): released as 20261019-183920 (portion line on the product card, today's
  stats as game stats against `S.user.macroGoals`); live at 6:45 PM.
- Weight, BMI and body stats (`body-stats`): Settings row opens a weigh-in sheet with BMI and WHO band; releasing.
- Log meal as Breakfast/Lunch/Dinner/Snacks, snacks to buy on the shopping list (`meal-slots`).
- Evolutions get bigger each stage (`evolution-escalate`): tests 1676/1676, releasing.

If you find them unfinished: compare the branch with `origin/main` (`git cherry origin/main wip/<branch>`), read its
COORD file on `agent-harness`, and release it in one small task.

**Failed or cancelled today, and why**

- Snap food photo stopped working: stopped at its limit before fixing (diagnosis in section 4, item 8;
  `wip/snap-fix`). Still needed. Note: the server runs `food-photo` version 6; before redeploying, compare it with
  `supabase/functions/food-photo/index.ts` on main and keep the 3-a-day cap (DAY_MAX=3, tally/store, limit/left).
- Chat room keyboard fixes rounds 2 and 3, iPad chat room layout fix: stopped at their limit before starting. Open
  bugs: the newest message drops out of view when the keyboard opens; with page-resizing (Android-style) keyboards
  there is a 139-pixel gap under the composer and the list shrinks to 26 pixels; the keyboard height value stays set
  after closing; iPad landscape and portrait layout; optional fade at the right edge of the voices row. The three
  chat room probes were never run on the live build (see `probes/CHATROOM`). Work: `wip/chat-room-kb`.
- Everyone gets their own companion: stopped at its limit. Cause found: accounts older than the reveal (16 Oct) and
  the BH-007 wipe leave no companion record, so they fall back to Misty; only 1 of 37 email accounts on the server
  has its own companion. Tests and a playtest are on `wip/own-companion`.
- Replay tutorial from Settings (first attempt) failed at its limit; "Settings tutorial (only update)" was cancelled
  because Emmanuel would test it himself; the restarted task shipped it. One bug hunt run was cancelled.
- Three food photos round 1, meal names, old-design purge and onboarding companion round 1 ran out of budget, but
  their releases are live (checked in git).

**Branches not merged** (on GitHub as `wip/<name>`, each a `[skip ci]` snapshot of the branch plus any uncommitted
files; not reviewed): body-stats, bughunt-202610191502, chat-room-kb, community-crash, evolution-escalate,
liquid-fill-perf (frame-cost measurement only), meal-names (a live WebKit check script), meal-slots, nutrition-stats,
own-companion, product-card-order, scanner-close-bottom-right, snap-fix, tutorial-auto, ui-joystick-fade,
ui-settings-page (the last three are old, superseded by later releases).

**Backlog (to do)**

1. Fix Snap food on iPad (client side) and the overlapping photo sheet; honest error messages for key, limit and
   network failures.
2. Chat room keyboard and iPad layout bugs (above).
3. Everyone with Misty can claim their own companion; then switch on its tutorial step.
4. "Your herb's world" and other herb-era names: `spirit.js` labels ("Your herb's world", "Your herb"),
   `herb-quests.js` final-form text, `sw.js` notification fallback name, `daily-ritual.js` "Your herb noticed", and
   guides' typed names in `region-pals`.
5. Old-design leftovers: delete the ring-off old Home code, the Move screen gold line style, the tab bar on
   sub-screens, the first-run mystery seedling.
6. Voice question "how much sugar did I eat today" (answer from logged meals).
7. Spanish grammar: "Te quedan 1 de 3" should be "Te queda 1 de 3".
8. Bug hunt next steps: new-user run on live with a reload mid-setup; check the evolution card and mirror-move
   screen for the Day-card overlay problem; Home pinch to Community at the widest camera; Gap bubble aria label.
9. Time-zone trick on the photo cap (up to 6 photos in 24 hours by changing time zone): accepted for now.
10. Older open items in `SUCCESSOR_HANDOFF.md` section 3 (Cook "What can I buy here?" crash report, Misty tiny in
    Explore, Care board names, `supabase/proposals/grocery_hunt_20261017.sql` for the owner to run).
11. Personalized Higgsfield inside the app: he mentioned it; not started.

---

## 7. Do this first (new Maya)

1. Read this file to the end, then `AGENTS.md`, `RELEASE.md`, `TUTORIAL.md` and the last 20 entries of
   `DECISIONS.md`.
2. Get GitHub access with the device code (section 2): post the code and github.com/login/device to Emmanuel in the
   chat, wait, then `gh auth setup-git`.
3. Clone the repo to `/home/sprite/lowispike`, restore the harness (`agent-harness` branch README), install
   Playwright 1.64.1 with WebKit and Chromium, and run `node --test tests/*.test.cjs` once.
4. Check the truth: `curl -s https://therealetm.github.io/lowispike/version.json` (live build),
   `git log --oneline -15 origin/main`, `gh run list -L 10`, `git branch -r | grep wip/`, and the Log below.
5. For each running item in section 6, see whether its release landed; if not, release it in a small task.
6. Sign the cloud browser into Supabase with "Continue with GitHub" when you need the backend; check the edge function
   logs before touching `food-photo`.
7. Recreate the hourly bug hunt schedule if it isn't on your agent. Its memory is `probes/BUGHUNT/BUG-MEMORY.md` and
   `LEDGER.md` on `agent-harness`.
8. Send Emmanuel a short voice note plus checklist: what you found live, what you'll do first.
9. From then on, follow the Mickey 17 workflow (section 0.6): write his new instructions here before building,
   checkpoint often, and hand over to the next Maya the same way.

---

## Log

Append one line per event, newest at the bottom: date and time (CEST), what shipped / broke / was cancelled, build or
branch. Keep both lines if a rebase conflicts here. Never rewrite earlier lines.

- 2026-10-19 19:20 Handoff written: MAYA-HANDOFF.md on main; `agent-harness` branch (probes, bug memory, COORD and
  HANDOFF notes); 18 `wip/*` snapshots of unmerged or uncommitted work. Live 20261019-172632, main 20261019-175128.
- 2026-10-19 18:45 Shipped: 20261019-183920 nutrition stats (live), 20261019-184058 setup resume BH-009 (on main).
  MAYA-HANDOFF.md landed on main (25192c4).
- 2026-10-19 19:25 Weight & BMI released: Settings > Weight & BMI sheet (weigh-in, BMI + WHO band, body-fat estimate, Then/Now level track), Stats sheet section via LowiStatsPlugins, tutorial step 'body'; branch body-stats, notes in COORD-stats.md
- 2026-10-19 19:45 Section 0 added at Emmanuel's request (voice, 19:22): every request from today with his words, Maya's
  thinking and status, what the current Maya is doing, and "verify first, then build what's missing". Live
  20261019-191500.
- 2026-10-19 20:15 Bug hunt BH-011: a reload during the companion reveal in setup left a new player on the standard Misty; setup now resumes at the birthday step until the companion exists. Branch bughunt-202610191801, notes in BUGHUNT/LEDGER.md (Run 12).
- 2026-10-19 21:10 Section 0.5 added from the 9 PM call: standing rule "update the GitHub for Maya" whenever he says something new; human-instinct UX and up to a hundred simulated users (task 98f0954e, running, no accounts created yet); natural Spanish (task 2ba92e76, running). Live 20261019-201827.
- 2026-10-19 21:20 Section 0.6 added at Emmanuel's request: the Mickey 17 workflow, how every Maya hands over to the next (5 to 6, 6 to 7, and on), with a handover table. WIP snapshots pushed: `wip/spanish-natural` (f51b0e8), `wip/intuition-playtest` (f29d9ec); both tasks still running. Live 20261019-201827.
- 2026-10-19 21:35 Crowd checkpoint under 0.5: one manual run, no scheduled run yet, 30 members, 12 messages, 1 photo post, 400s are expected sign-in misses, no stress test yet.
- 2026-10-19 21:45 Crowd members now log meals into their own user_state (one per slot per local day), verified live on one member; tools/community-crowd/db-check.cjs added. No app build change.
- 2026-10-19 22:00 Item 20 recorded under 0.5: energy crash again, crowd should send Emmanuel energy, crowd messages with their companion on Home. Still no scheduled crowd run; db-check counts replies to the human testers.
- 2026-10-19 22:05 Item 21 recorded under 0.5: energy bursts should play like billiards (hit companions stay where they land, chain hits); task "persistent billiard-style energy burst physics" started.
- 2026-10-19 22:20 Crowd members send real energy balls to Emmanuel and other humans (item 20b), proven live on a guest; soak tool gets --net. Item 20c (crowd on Home) not built, no earlier agreement found.
- 2026-10-19 22:30 Crowd fix: an @mention now reaches only the member it names (Emmanuel's ping to "Thiago M." got thank-yous from Thiago AND Thiago M.; same for Luis/Luis A., paolo/Paolo H.). My 22:15 --net soak (guest "Soak", uid ...858f71) posted two real '@Thiago / @paolo sent you energy' lines in the room and Emmanuel answered '@Soak Yooo'; --net now blocks room writes. Those 2 lines are still in the room (needs a service-role delete or Emmanuel in Supabase). Still no scheduled crowd run at 22:11.
- 2026-10-19 22:35 Item 22 recorded under 0.5: companion card without "spirit", adventure places need your own visit plus her level, mood check-in explained, Forms and Collection up front, Collection becomes a food journal. Task companion-panel running.
- 2026-10-19 22:35 Bug hunt run 14: Home<->Community warp streak canvas capped (~1.4 MP) and zeroed when the warp ends (CS-001 sibling, possible iPhone/iPad memory kill when zooming in and out). Not proven as the cause of the Community crashes.
- 2026-10-19 22:25 Item 23 recorded under 0.5: a message addressed to Emmanuel arrives on Home as the sender's own companion flying in from outside his world, appearing like a hologram, then a speech bubble with the message. Task home-visit started; answers item 20c's open question (only messages to him).
- 2026-10-19 23:00 Item 24 recorded under 0.5: grocery Catch for products not yet in the community database, first-discoverer credit, Pathfinder badge + capped one-time evolution XP after server checks (unique valid barcode, useful details). Built by the companion-panel task.
- 2026-10-19 22:50 Crash reports (9:5x PM call, iPhone): Community chat scrolling kicked him out; aiming/sending an energy burst in the zoomed-out galaxy kicked him out (3x, once while trying to see who was shooting). Cause found in simulation: every paint rebuilt the whole galaxy + chat list (counter ids in companion SVGs). Fixed in community-chat.js (stableIds + patchKids); "sent you energy" chat line removed and hidden (his call). Notes: BUGHUNT/LEDGER.md "Community crashes round 2", DECISIONS.md. Crowd task asked to stop posting energy text lines.
- 2026-10-19 22:40 Item 25: ten companion forms released (Nova 4500, Titan 7000, Monarch 10000, Majesty 14000 XP; new mane/crown, twin tails + third wings, power spikes + inner horns, star ring + gold edges). Evolution stays XP only; Collection and Catch never gate it. Branch evo-more.
- 2026-10-19 22:30 Item 21 live (20261019-221603 + 20261019-222646): community-energy.js no longer eases knocked companions home (no 'back' phase, no soft wall/240 px tether); they roll on, chain into others, bounce only off the map edge and stay where they stop. Resting spots kept as map positions across pin moves, leaving Community (halt, not reset), app close (pagehide/visibilitychange) and reload (localStorage lowi.energy.land.v1:<uid>, max 400). busy() = motion only. Your own companion stays knocked too and fires from there. Tutorial step send-energy + What's New "billiard-energy" updated. Tests 1,770/1,770; probe-billiard.cjs passes on chromium390 local + live (fixture galaxy, 4 local bots); WebKit iPhone 13 ran at 0-1 fps on the loaded VM (old build too), so no WebKit verdict. Limit: each phone keeps its own resting positions; positions never expire.
- 2026-10-19 22:35 Item 26 recorded under 0.5: care gestures (hug, water, good morning, sweet dreams, gratitude, encouragement) become free and the sparks currency and counter are removed; XP and energy unchanged. Task free-care started.
- 2026-10-19 22:30 Release 20261019-222926 (item 22): companion card without "spirit" (Home world, Cell worlds, Galaxy, Other worlds, Streams; also onboarding, the tutorial galaxy step, the "Community galaxy" title), the timed adventure reaches a place only with her level AND your own visit (S.advSeen + device copy, ledger seed; autopilot and your own flying ungated), Forms / Food journal / Glow first on the card, mood check-in explained and last, Collection is now a Food journal (foods you logged or scanned, how those meals went, never needed to evolve). Item 24 restored and handed to the food-paths task 4e961904.
- 2026-10-19 22:40 Release 20261019-223855 (item 22 follow-up): Forms / Food journal / Glow moved above the companion's words, right under the name, so they are fully in view when the card opens on a simulated iPhone 13 (doors 435-539 px of 664). 1,789 tests pass. Live-checked on simulated iPhone 13 (WebKit) and Android Chrome: places read Home world / Cell worlds / Galaxy / Other worlds / Streams with "Go there yourself" / "Level 5 + go there", no "spirit" on the card, Food journal opens, no errors. Not checked on a real phone; autopilot could not be started in the test browser, so "autopilot never counts as your visit" is covered by unit tests only.
- 2026-10-19 22:45 Item 27 recorded under 0.5 (before merging): food paths (Scan, Gap, Fuel, Cook, Shop) get one clear job each and one shared meal-logging flow; scanning a product not yet in the database catches it (Pathfinder, item 24; XP adds to the normal total). Branch food-paths, follow-up task finishing it.
- 2026-10-19 22:55 Item 28: picked aura now shows on Home Misty and her card at once and follows the account (lowispike.aura.v1); Rename under the name on her card (1-24 chars, empty = generated name), her name reaches the controller, Next journey, zoom and gift labels; tutorial step 'rename'. Branch aura-rename.
- 2026-10-19 23:30 Item 23 SHIPPED, build 20261019-224516: a message to Emmanuel (mention or reply) arrives on Home as the sender's own companion flying in, hologram + speech bubble; tap opens it in Community. Live checks pass on simulated iPhone 13 and Android Chrome with mocked messages; not yet seen with a real message on his phone. Choices in DECISIONS.md.
- 2026-10-19 22:55 Item 27 (food paths + Pathfinder count) merged from branch food-paths and released; e2e 11/11 on WebKit iPhone 13 EN/DE/ES and iPad Pro 11 DE/ES (shopping camera reached via Fuel > Shop > Scan in the shop, lookup stubbed); not on a real phone. Item 24 (Catch/Pathfinder) ships in the same build.
- 2026-10-19 23:05 Item 27 live in 20261019-230341 (verify-live bytes match; live e2e 11/11 WebKit iPhone 13 ES). Item 24 Catch/Pathfinder in the same build, now with the found-first count.
- 2026-10-19 22:58 Item 26 released in 20261019-224045 (care free, sparks gone), checked live on simulated iPhone 13 EN/DE/ES + Chrome.
- 2026-10-20 05:30 Item 29 recorded (before building): Community then chat crashes Safari on his real iPhone ("A problem repeatedly occurred"); full Community + chat crash and bug sweep started, branch chat-crash-3.
- 2026-10-20 03:20 Bug hunt run 19 (BH-019): Mirror mode camera start can no longer leave the camera on (Without camera / tracker failed / close+restart / resume+close); discovery label photo double tap opens one sheet. tests/mirror-cam-race.test.cjs. Release build in the release commit.
- 2026-10-20 08:50 Recorded before building: Emmanuel (voice, about 8:25 AM) asked to redo GitHub access and prove the GitHub-to-live-app path with a tiny safe visible update. New computer signed in with the GitHub CLI device code (section 2), approved by him for therealetm. The test release adds only a short What's New note (EN/DE/ES) and a new build id; no app code changes. It does not touch or fix the item 29 Community/chat crash.
- 2026-10-20 08:49 Released 20261020-084655 (commit 1019728): pipeline test, What's New note only, no app code changes. CI passed on main, Pages deployed, verify-live bytes match. Tests 1874/1874. Not checked on a real phone; item 29 crash untouched.
- 2026-10-20 09:20 Recorded before building: Emmanuel's agent asked to show the pipeline test inside the live app for an existing user, without production data (Supabase blocked, local state only). Result: the update card renders the note text, but the lead "A small check that updates reach your phone" never shows (its offer waits for the menu bar, hidden on world-first Home). So, as asked, a minimal visible change ships: the Settings panel shows "Version <build>" in its foot, beside the x (home-settings-sleep-v2.js/.css, test in tests/home-settings-sleep-v2.test.cjs). No other app change; item 29 crash untouched.
- 2026-10-20 09:10 Verified live: release 20261020-090200 (commit 677ed88, Settings shows "Version <build>" beside the x) is served by the live site; Emmanuel saw a Home message visit (item 23) arrive on his phone ("I just saw a hologram up here. It worked.").
- 2026-10-20 09:15 Item 30 recorded (before building): Emmanuel (call, about 9:05 AM): "The hologram appeared, and then it disappeared way too fast for me to even click on reply ... update that." So the item 23 visit must stay until he taps Reply (opens the message in Community) or the x, instead of leaving after its 6.5 to 15 s reading time; it must not be lost when Home is covered for a moment (comes back), must not block Home, and other people's visits wait their turn. Branch visit-stay-20261020, worktree /home/sprite/wt-visit-stay, files home-visit.js/.css + tests/home-visit.test.cjs. Item 29 crash untouched.
- 2026-10-20 09:25 Item 31 recorded (before building): Emmanuel (call, about 9:10 AM) wants the app played like a user (Home -> Community -> chat -> typing first, then the whole app), every crash noted and fixed, then a click-through of everything listing what is inconvenient or illogical, split across agents. Branch chat-sim-20261020, worktree /home/sprite/wt-chat-sim, ledger playtest/SIM-LEDGER.md. The earlier chat-crash-3 sweep (item 29) never reached GitHub.
- 2026-10-20 09:45 Item 32 recorded (before building): Emmanuel (call, about 9:38 AM) wants the six planet colours to be the brand colours: Home bubble liquids and galaxy bubble glows derive from them; dry controls (joystick, Scan, Settings) stay without liquid. Branch brand-palette-20261020, worktree /home/sprite/wt-brand-palette. Preview for his OK before release.
- 2026-10-20 09:42 Item 30 RELEASED: 20261020-092921 (main 54af958) the Home message visitor stays until Reply or x, comes back after Home was covered, others wait ("{k} more waiting"); 20261020-093754 (main 7750b6c) the 0.9 s check also re-places them after a missed resize (the live WebKit check on 092921 left the card at its landscape spot once). Live files match main; live WebKit iPhone 13 check of 093754 passed all 14 steps (/tmp/pw/visit-check.cjs); a browser on 20261020-090200 got the update card (Later / Update) and Update loaded 20261020-093754. Needs Emmanuel's confirmation on his iPhone. Item 29 crash untouched.
- 2026-10-20 09:58 Item 32 amended (before building it): Scan gets liquid too, filled only by successful scans; six liquids map one-to-one onto the six planets; joystick and Settings stay dry. Logo animation idea noted as creative direction only.
- 2026-10-21 13:30 Recorded before building: Emmanuel (call) wants the lessons of the design video he sent (anti-generic AI design: one main question per screen, the biggest thing answers it, real data, honest empty / zero / loading / error / offline states, check real screenshots at phone and iPad sizes) applied to LOWiSPIKE, keeping the galaxy, liquids and six planets. First slice (branch design-lessons, tools/design-audit/): fasting sheet end button now rides the bottom of the sheet (on iPhone SE it was 143 px below the screen) and clears the bottom-centre close X, which also no longer covers the last recent fast; Edit start has a 44 px tap area; the Edit start card refuses a time the clock skipped (spring forward, used to shift an hour in silence), says when a time happened twice (fall back, 25 Oct) and shows the picked time's UTC offset. Tests tests/fast-dst.test.cjs (6), live check tools/design-audit/fast-live.cjs 25/25 on WebKit; not on a real phone. Already fine when checked: weight change comes only from weight logs; barcode lookup tells offline / failed apart from not found; fasting data is device-only, so no resync. Left for later: end sheet's own time picker has the same skipped-hour shift; Gap bubble captions 9 px at 62 % white; timed body-stage claims (Fat burning ramps up at 12 h etc.) need his call; Community states not yet audited (item 29 crash still first).
- 2026-10-21 14:55 Recorded before releasing: Emmanuel gave standing approval to release and deploy live autonomously once tests and release-check pass ("you do not need my go to push ... always push, push, push"). Written into AGENTS.md, RELEASE.md, the lowispike-change skill and the top of this file. Releasing the polish audit (branch polish-audit: branded 404, share/SEO tags, brand-cyan glass rims, wrapping flight hint) under that rule. HELD: the `.github/workflows/ci.yml` change that makes Pages publish only the app files (`node scripts/site-files.cjs --out _site`, upload `_site`). GitHub refused the push: this computer's gh token has scopes repo, gist, read:org but not `workflow`, which any change to a workflow file needs. To land it: `gh auth refresh -h github.com -s workflow` (Emmanuel approves the device code), then re-apply that ci.yml hunk (`git apply tools/polish-audit/ci-publish-only-app.patch`) and release. Until then the whole repo (AGENTS.md, notes, tools) stays public on the live site, as before.
- 2026-10-22 05:45 Recorded before building (item 33): Emmanuel (voice, 21 Oct evening): "Send out bug fixes and simulations to the Community button, because there are a lot of bugs in there still. For example, I change the tab so that when I open Community something different is supposed to be the first thing that opens, but it always opens the chat. And then after that it opens what I set my first page to be. It's very annoying." So: (1) Community must open straight on the first tab he chose in the tab order, with no flash or load of chat first (find the root cause); (2) a full Community bug sweep with simulations (every tab, switching, reopening, back, keyboard, photos, posting, scroll, long sessions, small/large iPhone, iPad), each fix a small commit; (3) the item 29 real-iPhone Community -> chat crash stays first: loading chat when it shouldn't may be part of it, reduce memory where safe and measure it, never call it fixed without his iPhone. Task "Community bug sweep and default tab fix", branch community-sweep-20261022, worktree /home/sprite/wt-community-sweep, COORD-community-sweep.md. Owns Community/chat files; tutorial and Affiliates files belong to other tasks. No Community messages deleted (old test cleanup still needs his answer).
- 2026-10-22 05:55 Recorded before building (item 34): Emmanuel (voice, 21 Oct evening) on the tutorial: "I really liked the voiceover. It reads the title, so it sounds very repetitive. Would be nice if it just talked, meaning it doesn't unnecessarily repeat itself. If the title and the text aren't repetitive, then I guess it can. Also, would be nice if I don't have to press the next button every time. If I did turn on the mic, I should be able to just place my phone somewhere and just listen as it goes, by itself. Also there's a bug: when it reaches the scanner, Apple shows 'Allow camera', which breaks the whole tutorial. The tutorial stops. When I close it, it tries to continue, but the continuation is in that page, which stops. ... Or maybe we just tell them what's inside the scanner instead of taking them inside the scanner." So: (1) narration never says the same thing twice: the title is read only when it adds something the text does not; (2) hands-free: with the speaker on, each card moves on by itself a short pause after its narration ends, Next/Back still work, a clear Pause/Play on the card, narration only starts from a tap (iOS); (3) the tutorial never opens the scanner or asks for the camera: the Scan cards show a small picture of what is inside Scan instead, and the tour hides while any camera screen the user opens is up. Task "Tutorial: voice, hands-free, scanner fix", branch tutorial-handsfree-20261022, worktree /home/sprite/wt-tutorial-handsfree, COORD-tutorial-handsfree.md. Owns tutorial*.js/css, tutorial-voice*, tutorial-voice/, TUTORIAL.md, tools/tutorial-voice/, tests/tutorial-*. LowiTutorialVoice public API stays as it is (additions only). Not touching Community, chat, Affiliates or app-voice files.
- 2026-10-22 05:45 Recorded before building (item 35): Emmanuel (voice message, 21 Oct evening): "I would like the affiliate texts, their scripts, to also have that voice. The same tutorial voice, so that they don't have to just read. They can just listen to what they can say in the camera, etc." Plan: on the Affiliates page every script (each scene's spoken lines, the day's follow line on the LOWiSPIKE track) gets play/pause and replay in the same neural voices as the tutorial (en Ava, de Seraphina, es Ximena), reusing app-voice.js (LowiVoice) and its recorded-clip pipeline (tools/app-voice/build.py records the script sentences). Only what is unlocked on screen is read. Sound starts from a tap (iOS). Shared-code change kept minimal: app-voice.js finds its clips from its own script URL so it works inside affiliates/. Tutorial files untouched (the tutorial task owns them). Task "Affiliate scripts read aloud", branch aff-voice-20261022, worktree /home/sprite/wt-aff-voice, COORD-aff-voice.md.
- 2026-10-22 07:40 Item 35 built (branch aff-voice-20261022): Affiliates scripts read aloud in the tutorial voice. Files: affiliates/script-voice.js (new), affiliates/blueprint.js (hooks only: data-say on lines, Listen card, scene/day buttons, stop on redraw/leave), affiliates/blueprint.css (Listen section at the end), affiliates/index.html (loads script-voice.js then ../app-voice.js), app-voice.js (BASE from its own script URL + LOWI_VOICE_TAP_ONLY; app behaviour unchanged), tools/app-voice/phrases.cjs (`affiliates` source), 210 new clips. Old clips kept (the full build would have pruned 126 old news clips; I restored them and merged their entries so this change is additive only). Tests: tests/affiliates-voice.test.cjs; simulator check tools/blueprint/voice-check.cjs passes. Known: tools/blueprint/check.cjs already fails on unchanged main on iPad (WebKit headless reports a stale scroll height after Shots -> back -> track switch, click "outside of the viewport"); with the Listen card the same step also fails on iPhone 13. Unchanged main with only a 315 px empty block at the top of the script fails identically, so it is that headless WebKit quirk, not the voice code, but no one has checked finger scrolling there on a real iPhone/iPad. Follow-up for the tutorial owner: the `affiliates` tutorial step could mention the Listen button (I did not touch tutorial files). Not checked on Emmanuel's real iPhone: actual sound output, iOS audio unlock from the Listen tap, sound inside the Community frame.
- 2026-10-22 07:12 Item 35 released: the code went live in 20261022-062544, but that release was run without --news (the commit summary reads the news file path), so it carried no What's New entry. Follow-up release adds the What's New entry (slug affiliates-listen, tutorial step `affiliates`). Before it: 2081/2081 tests and tools/blueprint/voice-check.cjs pass on main 8441857; live site serves 20261022-062544, affiliates/script-voice.js byte-identical, clips served. Still not checked on Emmanuel's real iPhone (sound, iOS audio unlock, sound inside the Community frame).
- 2026-10-22 07:30 Item 33 increment (branch community-sweep-20261022), released in the build named by its release commit: Community opens straight on the chosen first tab (no chat flash, a chat room left open no longer wins); Creation/Affiliates never blank after a rebuild or when they are the first tab; hidden Creation/Affiliates frames freed when Community closes or a chat room opens; chat bubbles dropped their own backdrop blur (60 blurred layers down to the room's one, item 29 memory); the Home X no longer sits on the Community logo (name button starts right of it) and steps aside inside a chat room (it covered the room's back arrow, so tapping back left Community); phone back, edge swipe (section-nav.js innerBack) and Escape in a chat room now go to the channel list, the next back leaves Community. Tests 2090/2090 (new tests/community-back-to-channels.test.cjs, 3 tests, all fail on the old code). Simulated sweep tools/community-sweep/sweep.cjs: 0 issues on WebKit iPhone SE, 15, 15 Pro Max, iPad and Chromium SE; one earlier WebKit SE run had a simulator renderer crash about 40 s in (step not logged), not reproduced in 6 runs after. Item 29 real-iPhone Community -> chat crash NOT confirmed fixed: needs Emmanuel's phone. No Community messages deleted.
- 2026-10-22 07:50 Recorded (docs only, no app code, no release): launch gate for our own App Review-style check. New LAUNCH_REVIEW.md (checklist from Apple's App Review Guidelines of 16 Oct 2026 and related Apple pages, nothing run yet); MAYA-HANDOFF.md section 0.7 and RELEASE.md "Launch gate": before the first real-money Plus release (Stripe live) or when Emmanuel says it's launch time, stop and tell him it's time to run it. No automatic reminder exists.
- 2026-10-22 07:50 Item 34 released (branch tutorial-handsfree-20261022), build named by its release commit: the tutorial voice reads a title only when it adds something (titleAdds()/spoken(), sayTitle:false); hands-free with the speaker on (a card read to the end moves on after 1.2 s, 4.5 s on try-it cards; round Pause/Play; never on claim, the last card, behind a sheet, blocked audio or in the background; Screen Wake Lock best effort); the tour never opens Scan or asks for the camera (no 'scan' in TAB_OF, Scan cards show a look-inside picture, compact on small iPhones) and hides while a camera the user opened is up. Follow-up fix: only the card's own clip ending counts as read (the silent unlock sound on the same audio element ended first and hands-free cut the first clip off at 1.2 s); unit test fails on the old code. Evidence: tests 2100/2100 + 1 new; simulated WebKit iPhone 13/SE (node tools/tutorial-voice/handsfree-check.cjs): whole tour by itself 70/71 cards (claim waits for a tap) in 168 s, 0 camera asks, Pause/Play, camera hides the tour, SE layout en/de/es. Note: that check once stopped at pinch-galaxy only because a tour with no tap at all has no back-swipe guard entry (section-nav's history.back then popped to the first entry and back-swipe Escape'd the tour); a phone always has the guard, the check now taps first. Not tried on Emmanuel's iPhone: iOS audio unlock, the real camera sheet and Wake Lock. LowiTutorialVoice public interface unchanged (additions only: titleAdds, onEnd/quiet in render ctx, event lowi:tutorial-voice).
- 2026-10-22 07:50 Item 35 follow-up (Affiliates scroll glitch, branch aff-voice-20261022): Emmanuel: "Fix the glitch." tools/blueprint/check.cjs timed out on iPhone 13 tapping #toShots on the UGC script ("element is outside of the viewport"). Cause: WebKit on iPhone-sized screens kept an old, shorter scroll height when go() swapped the views while the page was scrolled far down and only then scrolled to the top, so the next screen could not be scrolled to its bottom (e.g. Webdesign recording screen stuck at 0 of 861 px, back on the script at 933 of 1794 px). Reproduced on a bare page with no app code in Playwright WebKit (iPhone 13): swap-then-scroll stuck, scroll-then-swap fine; Chromium and desktop WebKit fine. The Listen card made the scripts long enough to hit it on iPhone 13; the same check also caught it on iPhone SE (LOWiSPIKE) and iPad before the fix. Fix: go() in affiliates/blueprint.js scrolls to the top before show(). New tests/affiliates-scroll.test.cjs; check.cjs now has reach() after every screen change. Before fix: 12 reach failures (SE, 13, iPad). After: check.cjs ALL OK, voice-check passed, full suite green. Not verified on a real iPhone/iPad.
- 2026-10-22 10:30 Recorded before building (item 36): Emmanuel (screenshot of Community > Chat on his iPhone, 10:21 AM, showing the "Your galaxy" landing with Galaxy chat, Replies & mentions and Room 1 rows and an "Open galaxy chat" button): "I don't understand what all these rooms are. Remove it so they get straight to the chat group." So: the Chat tab (and opening Community when Chat is the first tab) opens the galaxy group chat directly, with no landing screen or room list. Replies & mentions stay reachable (they are messages in the same galaxy chat; also from the Community menu), Room stays its own tab, the people in your room stay in the menu (Rooms & people). Back from the chat goes to the Community tab you came from, else leaves Community; item 33's "back goes to the channel list" rule is replaced. Must not make the chat heavier (item 29 crash area). Task "Chat tab straight into galaxy chat", branch chat-direct-20261022, worktree /home/sprite/wt-chat-direct, COORD-chat-direct.md. No messages deleted.
- 2026-10-22 10:45 Recorded before building (item 38): Emmanuel (22 Oct): "In tutorial it tells the person to do stuff but then you can't actually do the stuff so either make sure they understand they can play after tutorial or let them actually do the gesture." So: every tutorial card that tells the user to tap / hold / swipe / drag / pinch / scan something they can't do in that moment either (a) lets them really try it on that card, on a safe practice pad inside the card (no camera, no app data changed, a clear 'Nice' when done; hands-free still moves on by itself if they don't try), or (b) says plainly they'll do it after the tour ("After the tour, ...") with the motion shown as a small animation. Text and voice clips stay in sync in EN/DE/ES. Keeps hands-free auto-advance, Pause/Play, the claim-card tap and the never-open-Scan rule. Cards about the Community chat follow item 36 (Chat opens the galaxy chat directly). Test lists every instruction card. Task "Tutorial: make instructions doable", branch tutorial-doable-20261022, worktree /home/sprite/wt-tutorial-doable, COORD-tutorial-doable.md. Owns tutorial*.js/css, tutorial-voice-data.js, tutorial-voice/, TUTORIAL.md, tests/tutorial-*. Not touching community-*, affiliates/**, app-voice*.
- 2026-10-22 10:50 Item 36 built (branch chat-direct-20261022): the Chat tab, and opening Community when Chat is the first tab, opens the galaxy chat room itself; the "Your galaxy" channel landing (Galaxy chat / Replies & mentions / Room rows, "Open galaxy chat") is no longer shown (its code in community-rooms-ui.js stays but is unreachable: setTab(true) opens the thread, showView('chans') maps to it). Back from the chat (room arrow `close-thread`, iPad crumb `data-rm="back"`, edge swipe, phone back, Escape) goes to the Community tab you came from (LowiRoomsUI.back / from), else leaves Community (section-nav innerBack returns false -> close); item 33's "back goes to the channel list" rule is replaced. Community-tab-order: firstAction('chat') returns null when the room is already open, else 'chat'; openFirst calls setTab(true, true) (first tab: nothing to go back to). Leaving Community now closes the chat room, so html.cr-room never stays on behind Home (body-world-3d.js pauses the Home world while cr-room is set). Phones: the tab row now stays above the chat room (community-tg.css, only .rm-tabs, no glass blur), because with Chat first it is the only way to Room / Creation / Affiliates. Replies & mentions: Community menu entry "Replies & mentions (n)" opens the newest one in the chat via thread(true,id) (not openMessage: found that openMessage from inside Community calls goTab('foryou'), which rebuilds the page and drops the open chat about a second later; this is older than item 36 and also hits the old landing's row; not fixed here). Room stays its own tab; people in your room stay in the menu (Rooms & people). Tests: new tests/community-chat-direct.test.cjs (fails 5/5 on the old code), community-back-to-channels and community-first-tab updated. tools/community-sweep/sweep.cjs and first-tab.cjs updated for the new rule (adds '13' = iPhone 13); clean on WebKit iPhone SE, iPhone 13, iPad, first-tab check 4/4 orders. Older probes in tools/community-hub/, tools/community-tg/, tools/community-ux/, tools/sim/ still tap the old channel list and will report it missing. Not checked on a real iPhone: the Community-to-chat crash (item 29) is still open.
- 2026-10-22 10:50 Recorded before building (item 40): Emmanuel (22 Oct): "When in tutorial mode sometimes the user tries out the gesture the voice over said but then it's not clear how they get back to the tutorial. So make the tutorial button stay always when they new until they skip all or finish so they always have the option to continue the tutorial." So: whenever a user with an unfinished tour leaves the tutorial card (a try-it gesture opened a sheet or screen, the card was dismissed with back-swipe / Escape, the app was reloaded), a small floating glass "Continue tutorial" button (EN/DE/ES) stays on screen everywhere; tapping it reopens the tour on the card they left, or the next one if that card was finished, and voice + hands-free pick up as before. The voice pauses while they are away. It disappears for good after the last card or Skip all. Back-swipe / Escape no longer count as Skip all. It must not cover the tab bar, bubbles, Scan, the chat input or primary buttons; safe areas, 44 pt, day and night. Task "Always-visible Continue tutorial button", branch tut-resume-20261022, worktree /home/sprite/wt-tut-resume, COORD-tut-resume.md. New files tutorial-resume.js/.css; narrow edits in tutorial.js (loader line, Escape = 'left', LowiTutorial.ids()) and tutorial-auto.js (no second offer card).
- 2026-10-22 10:50 Recorded before building (item 39): Emmanuel (photos of tutorial cards 8/70 and 24/70 on his iPhone): "The microphone looks weird and to big fix it." Then: "Move the speaker to the right where it's empty. Looks better." The voice toggle showed as a light-blue circle with a big black speaker glyph on the avatar's bottom-right edge, running over the body text. So: the speaker leaves the companion picture and becomes its own small round glass button (like Pause: white glyph, clear on/muted states, 44 px tap area) in the card's top row on the right, under Skip all, lined up with the card's right padding; nothing overlaps the avatar, title, text or Skip all; day and night themes; long titles wrap before it. Task "Tutorial speaker button: small, top-right", branch tut-voice-btn-20261022, worktree /home/sprite/wt-tut-voice-btn, COORD-tut-voice-btn.md. Only tutorial-voice.js (speaker markup) and tutorial-voice.css; tutorial.js/css belong to item 38.
- 2026-10-22 10:47 Item 36 released as 20261022-104620 (main b60afdc): CI "Release check and tests" passed (2107/2107 locally and in CI), live site serves 20261022-104620 and the changed files online (community-rooms-ui.js, community-tab-order.js, section-nav.js, community-chat.js, community-tg.css) match the repo. What's New in EN/DE/ES (tutorial step `chat`, go tab community), news voice recorded. tools/community-sweep/sweep.cjs on the live site (WebKit iPhone 13) clean: Chat tab opens the room, back goes to Room. Note: the sweep's live mode needs the full URL as the third argument, not the word live. Still to check on Emmanuel's iPhone: Chat opens the group chat, back, and the item 29 crash.
- 2026-10-22 11:20 Item 41 (branch tut-trynow-20261022): Emmanuel: "There is a try it now button that does nothing. Wiggle when try it now is said so they click on it which closes the tutorial for them to try it." The Try it now line on try-it cards (tutorial.js tryHtml, was a <p class=lt-tryline>) is a real button (data-lt=tryit). Tap: voice stopped, card closed (stop reason 'tryit', not finished), goSection keeps the screen the card is about, and lowi.tutorial.v1 .resume = S.tryResume() in tutorial-resume.js's shape (fin:true, so Continue tutorial lands on the NEXT card; via:'tryit'). Until item 40's Continue button is merged, Settings > Tutorial picks that place up once (savedTry, 6 h). Wiggle (.lt-wiggle, one 0.9 s run; reduced motion = .lt-glow, no movement), at most twice per card: when the voice reaches S.TRY_CUE[lang] (tutorial-voice.js ctx.cue/onCue, cueIndex, clip word timings or device onboundary), at the end of a card read without those words, or once 0.7 s after a card appears with no voice. Hands-free waits AUTO.TRY (4.5 s) after the last wiggle before moving past a try-it card. tutorial-auto.js: reason 'tryit' keeps 'running' with tryAt, no offer for 25 s and never counted as quitting. tests/tutorial-trynow.test.cjs (7). Not checked on a real phone.
- 2026-10-22 11:06 Item 41 released as 20261022-110425 (main 2efa47c): CI "Release check and tests" passed (2114/2114), live site serves 20261022-110425 and tutorial.js / tutorial-voice.js / tutorial.css online match the repo. What's New EN/DE/ES (slug tutorial-try-it-now, tutorial step `tutorial`). Still to check on Emmanuel's iPhone: the wiggle when the voice says Try it now, tapping it closes the card on the right screen, and coming back lands on the next card. Item 40 (Continue tutorial button) should read lowi.tutorial.v1 .resume as written here.
- 2026-10-22 11:45 Weight journey (branch weight-tracker-20261022). Emmanuel (smart-scale "Metric Detail" screenshot, 107.60 kg, goal 94.00 kg): "We need this in our app. They should be able to set starting time and see a graphic." New weight-journey-core.js (pure maths) + weight-journey.js (sheet #wjOv) + weight-journey.css. Start date + start weight + goal in S.health.body.journey {start, startKg, goalKg, unit}; weigh-ins share S.health.body.weights with the Weight & BMI sheet (source 'journey', kg kept to 0.01 so lb round-trips), one per day, backfill allowed, no future days, edit/delete by tapping a row; S.health.weight follows the newest. kg/lb toggle in the sheet header (the app had no unit setting). Chart: SVG drawn at the box's real width, monotone smooth curve (never overshoots), soft fill, dots, highest + latest labels, dashed goal line with flag, "Day 1" start marker; tabs W/M/3M/Y/All/Since start with < > for W/M/3M/Y. Cards: since start, to goal (+ progress bar in the hero), weekly/monthly rate (least squares over the visible range), highest, lowest. No range bar and no "Over"/red anywhere (mint = progress toward the goal, else neutral). Day mode via html[data-theme="light"]. Entry points: Community > You > Weight journey (COMMUNITY_PLACES.you + ROUTES.weight in home-settings-sleep-v2.js, label/sub/icon in community-me.js), a card inside Weight & BMI, a Stats sheet plugin card, any [data-wj-open]. Device only, never sent. Tests: tests/weight-journey.test.cjs (add/edit/delete, Since start filter, kg<->lb, stats maths, curve, wiring); pinned place lists in ui-settings-page / everything-else-trim now include 'weight'. Probe: node tools/probe-weight-journey.cjs "<device>" (SE, 13, 15, Pixel 7 clean: no overflow, no overlapping labels, no errors). NOT touched: tutorial files. **Suggested tutorial card for the tutorial tasks** (step id `weight`, after `body` if there is one): title "Your weight journey", text "Set day 1 of your journey and your start weight, then add a weight whenever you step on the scale. Your line and your progress since day 1 show here. Kilos or pounds, and it stays on your phone.", Try it now: LowiWeightJourney.open(). Still to check on Emmanuel's iPhone: date picker and decimal keyboard, chart smoothness, day mode.
- 2026-10-22 11:35 Weight journey released as 20261022-112923 (main 58f37b7): CI "Release check and tests" passed (2123/2123), live site serves 20261022-112923, weight-journey.js / -core.js / .css online match the repo, What's New EN/DE/ES (slug weight-journey, tutorial {none}: the suggested card is in the entry above). Live probe on iPhone 13 (WebKit): opened by tapping the card in Weight & BMI, add/edit/delete worked, no errors. Still to check on Emmanuel's iPhone: Community > You > Weight journey, set day 1 + start weight + goal, add a weight for yesterday, switch kg/lb, day mode.
- 2026-10-22 12:10 Emergency Shop uses the person's own location (branch emergency-shop-loc). Emmanuel: "The shop emergency shop button that shows you what you can buy in your location is wrong because it's showing only [his town]. That's mine, the maker's location ... when they click on share my location, they should see their address and the nearest grocery shopping options ... it shows them the products that are in the store ... Don't make this based on my location, the creator." Removed the bundled one-region shop map (data/shop/stores.json, its builder in tools/shop-data/build.py, the town list and the town-name rewrite in store-picks-core.js, the "list covers [town]" text in grocery-hunt.js, the town names in the Shop-it seed sightings in index.html). New in store-picks-core.js: chainOf (OSM brand/name -> rewe/edeka/lidl/aldi/kaufland/netto/penny/famila/salling, Danish Netto by country), parseShops (sorted by distance, point+outline duplicates folded), placeOf/placeFromSearch, lookup(fetch) = Nominatim reverse (address), Nominatim search (typed town/postcode) and nearest supermarkets via Nominatim `q=supermarket` inside a growing viewbox (1.3 -> 45 km), Overpass (3 servers) only as fallback because overpass-api.de took 30+ s today; 1 Nominatim request/s, answers kept in memory per session, coordinates sent rounded (3 decimals for shops, 4 for the address), nothing to our server. merge() builds the general list (REWE + EDEKA) for shops without chain data, with a one-line note. store-picks.js pick view: Share my location -> "Your location" address -> Supermarkets near you (name, brand, address, distance) -> tap -> that chain's list or the general list; denied/unavailable -> town or postcode field (.stp-wq, 16px so iOS does not zoom); "Skip: show the general lists"; chain chips incl. All supermarkets; OSM attribution and privacy line. Saved state holds the chosen shop by name/address only; a shop saved from the old list (id not "osm:") is dropped on load; position forgotten on close. grocery-hunt.js Near me uses the same lookup and has "Find shops in <typed place>". Tests: tests/emergency-shop-location.test.cjs (no fixed town in shop code/data/seed/cache, chain matching, distance sorting, mocked network incl. fallbacks, general list). Browser sim: tools/shop-data/location-sim.cjs (mocked OSM; LIVE_OSM=1 for real answers): iPhone SE (Hamburg, DE, day), iPhone 13 (Munich, EN, night, kiosk -> general list), iPhone 15 (location denied -> postcode 80331, ES, night, old saved shop dropped), Pixel 7 (Munich, EN, day): 0 FAIL, 37 checks; LIVE_OSM on Pixel 7 Munich: real address + 25 shops, 0 FAIL. Not checked on a real iPhone.
- **22 Oct 2026, level-up skin sync + old flowery herb removed (branch levelup-skin-20261022).** Emmanuel: "on a different phone the person leveled up, but the level-up design of their companion is still old ... the old design needs to be nuked". Cause: herb-tamagotchi.js boots and calls refresh(true) before apple-ui.js has loaded cell-world.js, companion.js, spirit.js and world-home-core.js. A level-up found at that moment (XP synced from another phone, a reload) painted the card with the raw base drawing plant() = the old potted herb with stem, leaves and blossoms, plus old stage names. Fix: evolve() waits (250 ms steps, max ~15 s) until skinReady() (plantHTML.cell + LowiWorldHomeCore + LowiSpirit when its tag exists); evoArt() = curArt(m,'hero',p); curArt() never returns the base drawing, only a neutral orb (.lh-orb) if cell-world never loads. Deleted: stem/leaves/blossoms and the leaf gradient in plant(); its old body and pot are now drawn only for wardrobe crops (cell-world still slices the face, accessories, lh-foliage/lh-pot groups from it); the dead lh-guide-herb branch; .lh-leaf/.lh-blossom/lh-sway/lh-wave CSS (herb-tamagotchi.css, beta.css, herb-touch.css); spirit.js falling-leaf effect and .sp-fallen CSS; herb-era copy (leaf dance, flowers, "Hello, new leaves", "Little leaf room"). Migration: readPrefs runs migrateSkin() once (skinV:2): stage numbers as text clamped to 0-9, invalid evoFrom dropped, old skin keys (skin, herbSkin, plantSkin, potStyle, leafStyle, bloomStyle, flowerStyle, design) removed, equipment rebuilt from BASE_EQUIPMENT with only known items. Tests: tests/levelup-skin-sync.test.cjs (fails 4/4 on the old code); updated spirit, bughunt-high-forms BH-012, levelup-style, oct19-old-design-purge-2. Probe: node tools/companion/levelup-skin.cjs (fresh / boot / legacy on iPhone SE, 13, 15, Pixel 7; screenshots in /home/sprite/levelup-shots). Tutorial files not touched (they never drew the old herb).
