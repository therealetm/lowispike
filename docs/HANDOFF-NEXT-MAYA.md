# LOWiSPIKE handoff for the next Maya

You are taking over LOWiSPIKE from Maya 10. You have GitHub and the chat with Emmanuel, not her computer. Everything you need is on GitHub; this file tells you where, what is open, and the next exact step for each piece of work. It is a rolling document: every Maya keeps the Markdown current and shares its GitHub link in the chat. Do not generate or email PDFs for updates.

Full snapshot: **Tuesday 27 October 2026, about 9:50 AM CET (Europe/Berlin). Live build at that time: 20261027-094944.** The status table below was rewritten then from `git log origin/main`, the live `version.json` and the bug-hunt ledger. The previous table (Monday 26 October, about 2:10 PM, live 20261026-122440) is replaced; the dated sections below (video decision, Studio) stay as written.

## Latest video decision, 27 October 2026

Emmanuel said in the call: "I liked the video, the last one." This refers to the last delivered 2D Connie test (about 14 seconds), not the rejected 3D clay video. Record the test as liked; do not repeat a request for approval of the same test. The full-length video has not been delivered: the next Maya should continue from this accepted 2D direction, using the real companion and real app recordings, not invented app screens or a replacement companion.

The recoverable project is on [agent-harness, promo/2d-test](https://github.com/therealetm/lowispike/tree/agent-harness/promo/2d-test). Read its README for rendering, assembly, voices, real companion captures and app recordings. Its older statement that the test is awaiting Emmanuel's yes is superseded by this dated call update. The test was checked by measurement, not watched through by eye; do not describe it as visually verified.

## Standing rule: every update is silent, 27 October 2026

Emmanuel, Tuesday 27 October 2026 about 9:45 AM Berlin: "keep in mind all updates are silent. No more notifications for anyone." Every release from now on goes out with `scripts/release.sh "..." --quiet`: no What's New line, no update banner, no push, no notification of any kind, for anyone.

He also said: "Don't tell me what you haven't been able to do." When something is live, report to him only what was done: no list of what failed or was not done. Keep those open items here in this file for the next Maya instead.

## Day recap redesigned to an iOS 17 look, 27 October 2026

Emmanuel, Tuesday 27 October 2026 about 9:55 AM Berlin (voice, two screenshots of the German catch-up on his iPhone): "I need you to update this section. The, uh, my talk. You know, the recap. Cuz the UI looks bad. Even the end. It's just everything is so big and bulky. And not iOS 17 aesthetic. And some buttons we can't even see nor click on it. So, you need to work on that. Don't ask me questions. Take all the decisions. Update it. Don't send other update, uh, notification."

What changed (evening-catchup.css / .js / -core.js, branch day-recap-ios17-20261027, released silently):
- The whole catch-up ("Heute nachtragen": the bubbles, the choices, Something else, the pop, the "Dein Tag" read-back, the finish, the evening greeting) now uses the app's deep blue glass over the living world (blurred), not the separate purple sky. iOS sizes: 44pt top bar with a points pill, thin progress capsules and the step number, a 30pt close circle in a 44pt hit area; 132px bubble (112 on SE, 148 on iPad) with a 28px name; grouped inset lists with 52px rows and 17px text; one 50px blue primary button; 44px tinted secondaries.
- One column in normal flow: top bar, stage, companion row, foot. The companion (44px) and its words sit in their own row above the foot; Save and "Neu anfangen" (and Something else / Skip, Done) live in the foot, so they are always on screen and nothing can cover them. The stage scrolls from the top when it does not fit, so the first row is never cut off under the bar.
- Bar points now match the screen: on the read-back the bar includes the whole-day bonus like the total (his screenshot: 49 vs 59); on the finish it shows the points really earned.
- Read-back rows are one line each (ellipsis, full text in title), with a small coloured icon, the slot name above, "wahrscheinlich Blutzuckerspitze" in small orange under a likely spike, and a "Gesamt" row.
- Meal names follow the app language when every part is a known dish or food (C.mealName, DISHES table: "Sweet potato with beef stew" shows "Süßkartoffel mit Rindereintopf" in German); anything else stays as she typed it.
- Checks: tests/catchup-ios17.test.cjs (points match, companion row and foot in the flow, no overlap by construction, sizes, mealName); tests/evening-catchup-live.cjs updated to iOS sizes plus tappable-at-centre, not covered, on screen, bar = total, no wrapping rows; tools/catchup-ios17/probe.cjs walks every view at iPhone, SE, 320px, iPad in German and English, with Reduce Motion and a fresh first-run state. All in simulated Chrome (simulated Safari still crashes on load/tap in this machine). The app's dictation mic in the text box is its own 34px component and was left as it is.

## Calmer Shop, and Shop from home gets its own tab, 27 October 2026

Emmanuel, Tuesday 27 October 2026 about 9:52 AM Berlin (voice, screenshots of Shop > Supermarkt on his iPhone): "Supermarket looks crazy, like so overwhelming. I don't know what to do here. So many things. Too much. So viel auf einmal. Vielleicht möchte 'Von zu Hause einkaufen' seine eigene Sektion haben, neben Supermarkt, Seller Zone und Hilf mit... Remember our focus is minimalism, efficiency, convenience. And we care about people with mental health. Who are depressed, overwhelmed, don't know what to do. People are seeing this for the first time." He also said not to ask him questions and to take all the decisions.

What changed (store-picks.js / .css, week-basket.js, tutorial-steps.js; branch shop-calm-1027, released silently with `--quiet`):
- Supermarkt shows only the question, the store, search, then categories and products. The Cart (Warenkorb) is a small round button in the title row with its count. "Im Laden scannen" is the one big button, at the bottom next to the X.
- "Zu Hause" (From home / Desde casa) is its own Shop tab right next to Supermarkt. The week planner draws inside Shop (no second sheet, no second X); putting a week of dinners in the Cart fills the Cart count, "Open my Cart" opens the Cart over the tab. Shop remembers this tab like Seller Zone and Kitchen.
- The snack list with "Wieder kaufen" is one closed line, "Meine Snackliste" (with its count). "Aussortierte zeigen" is the last chip in the category row. The product count line moved into "So wird bewertet".
- Four tabs fit on one line each: Spanish says "Súper" and "Ayudar", English "Help out" when there are four.
- A swipe down on the "Zu Hause" title closes Shop like the tab bar and the Supermarkt title. The bug: spirit.js wraps title words that hold an emoji in a display:contents span, which has no box, so the browser started a pan and cancelled the drag; the span now gets a real box inside the drag zones.
- The What's New tour step for Shop from home points at the new tab and says where it is ("Neu: Zu Hause, gleich neben Supermarkt."), re-recorded in the approved tutorial voice.
- Checks: tests/shop-calm.test.cjs; tools/shop-calm/flow.cjs taps through both tabs with simulated touch (de 390x844, en 375x667, es) including Scan in the shop, the Cart, the X and the swipe-downs. All in simulated Chrome; not checked in simulated Safari or on his real iPhone/iPad.
- Left open: the cart, the in-store Shop and the Give a hand deck are still not reachable by the double-tap sweep.

## Log meal sheet made calm and simple, 27 October 2026

Emmanuel, Tuesday 27 October 2026 (voice, screenshot of the German "Mahlzeit" sheet): "clean this up... It's very confusing and overwhelming whilst opening... too much redundancy... Schreiben, Scannen, Foto, Jetzt, vor 30 Minuten, vor einer Stunde, vor 2 Stunden. Even though you can manually change the time... 'Was hast du gegessen?' and 'Eigene Werte'... too much redundancy. Der 'Wie immer' thing is cool. Der Vorschlag is too close to it... Remember our focus is minimalism, efficiency, convenience. And we care about people with mental health. Who are depressed, overwhelmed, don't know what to do. People are seeing this for the first time." Don't ask questions; take all decisions.

**Guiding principle for every screen from now on (his words above, as a rule):** minimalism, efficiency, convenience. Design for someone who is depressed, overwhelmed, doesn't know what to do, or is seeing the screen for the first time: one clear thing to do first, one way to do each thing, nothing repeated, quiet extras folded away, no choice they must make before they can start.

What changed (spirit.js mealForm, spirit-core.js, new meal-sheet.css, branch meal-sheet-simple-20261027, released silently):
- Log meal opens straight on one screen; the "Mahlzeit oder Snack?" step is gone. A small Mahlzeit | Snack switch at the top starts on the slot for the time of day; Save reads "Snack eintragen" for a snack.
- One field, "Was hast du gegessen?", with the mic inside it and two small chips under it, Foto and Barcode. The Schreiben / Scannen / Foto tiles and the separate manual field are gone.
- Time: a quiet "Jetzt" that opens the phone's own time wheel; it then reads "um 13:20". Future times are refused; it starts at Jetzt every time the sheet opens. The four time chips are gone. From Gap: one short line ("Fasten beendet, deine Zeit ist gespeichert…") with "Jetzt nicht", and the Gap time on the clock.
- Eigene Werte is a quiet link beside the time; the fields open only when tapped.
- One Save button; the Essenspause / XP line is small grey text under it, no box (not shown in the Gap chain, the fast already ended there).
- Wie immer right under Save: up to four, one tap logs it, "Ein Tipp" removed from the heading. In German and Spanish an English name is translated only when every word is a known food word ("Lettuce wraps with ground beef" shows "Salat-Wraps mit Rinderhack"); anything else stays as typed.
- The suggestion moved lower and set apart under "Idee von" + the companion's own name (wnm, never a hard-coded name).
- Today's meals fold into a quiet "Heute · n" line; tapping one still edits it and comes back to the sheet. Heutige Stats is a faint line at the very bottom.
- Checks: tests/meal-sheet-simple.test.cjs (fails on the old sheet); the old sheet's tests (meal-names, meal-slots, misty-panels, one-meal-path, gap-reset, bh045 own-name site) now describe the new sheet with the same protections and fail on the old code; tools/meal-sheet/flow.cjs (22 behaviour checks) and tools/meal-sheet/shot.cjs (DE/EN/ES at iPhone, SE, iPad, nothing off screen or covered, Wie immer visible without scrolling on SE). All in simulated Chrome; simulated Safari still crashes on tap on this machine.

## Studio opened for everyone, 27 October 2026

Emmanuel, Tuesday 27 October 2026 about 9:25 AM Berlin, with a screenshot of the locked Community > Studio tab (pill "Gesperrt", "Im Aufbau", "Studio wird gerade gebaut. Es öffnet sich hier, sobald es fertig ist.", a small lock button): "Also, um remove this we can open it up now. Delete the password or whatever."

Done on branch studio-open-20261027 and released as 20261027-094223 with a short What's New line (asked for before the silent rule above). Under the silent rule that line was taken out again in the next quiet release (version.json news restored to the day-recap entry it had before, and the Studio news voice clips removed), so nothing announces Studio. What changed:

- The 25 October lock is gone from the app: studio-lock.js, studio-lock-core.js, studio-lock.css and studio-gate.js are deleted, with their tags in index.html and sw.js, the hidden-until-unlocked start of affiliates/index.html and create/index.html, the lock checks in community-rooms-ui.js (frame, Affiliates/Creation switch, menu's Studio page link) and tools/studio-lock/. Their tests went with them; tests/studio-open.test.cjs checks Studio opens with no lock.
- Server: supabase/proposals/studio_lock_retire_20261027.sql drops studio_access(), studio_unlock(), studio_forget_devices() and the tables studio_lock (the PIN hash), studio_passes and studio_pin_tries. Run only after the open build is live (an older cached app then stays locked, never opens by mistake). admin_delete_account() checks to_regclass() first, so it keeps working. Applied on 27 Oct after 20261027-094223 was live: the three functions and three tables are gone (checked in information_schema).
- Behind the lock: Affiliates is the real, working flow (script, recording, earnings). Creation is still a "Being built / Wird gebaut" page that lists what is coming, each marked Soon; nothing there was built in this task.
- Check: tools/check-studio-open.cjs <phone|small|ipad|ipadl> [url|root] [lang] [engine] opens Studio by finger in a simulated browser and reports lock leftovers, both halves, Affiliates' Start and errors.

## How this file and Emmanuel's handoff prompt fit together

- Emmanuel keeps his own handoff prompt (the "universal clone prompt"). It lives in the chat only, never in this public repo. A Maya sends it back to him word for word, unchanged, in the chat with this handoff's GitHub link, as soon as her usage limit is close (MAYA-HANDOFF.md section 0.6, "Seeing the limit coming").
- That prompt sends you to [MAYA-HANDOFF.md](https://github.com/therealetm/lowispike/blob/main/MAYA-HANDOFF.md): standing rules at the top, section 0.6 (the Mickey 17 workflow), and the newest "Handover" section. The newest Handover section (0.20) points here.
- This file is the short version. When it and MAYA-HANDOFF.md disagree, the newer dated line wins; the live app wins over both.

## What LOWiSPIKE is

A mobile-first health and food web app (a PWA on the iPhone home screen) that turns everyday metabolic habits into a living game, not a tracker. You care for a glass, water-like companion by doing real things: drinking water, logging meals, moving, sleeping, fasting gaps, scanning food. Real actions are the only source of care and XP. Every user names their own companion; in user-facing text say "your companion" (Misty is only the default). Full description: MAYA-HANDOFF.md section 1.

## Where everything lives

- **Repo (public):** https://github.com/therealetm/lowispike. Branch `main` is live. Never commit keys, tokens, passwords or private data.
- **Live site:** https://therealetm.github.io/lowispike/ (check the build at https://therealetm.github.io/lowispike/version.json).
- **Rules for agents:** [AI_PLAYBOOK.md](https://github.com/therealetm/lowispike/blob/main/AI_PLAYBOOK.md), [AGENTS.md](https://github.com/therealetm/lowispike/blob/main/AGENTS.md), [DECISIONS.md](https://github.com/therealetm/lowispike/blob/main/DECISIONS.md), MAYA-HANDOFF.md section 3 (how to work, release procedure).
- **Agent tooling and notes from the old computer:** branch [agent-harness](https://github.com/therealetm/lowispike/tree/agent-harness) (orphan branch, not app code). It holds the bug-hunt ledger and probes (`probes/BUGHUNT/`), all other Playwright probes, the COORD and HANDOFF notes of every task (`vm-notes/`), loose scripts (`tools-vm/`), research and the ChatGPT simulation prompts (`research/`), the App Store concept images and their build scripts (`aso/`), and the MiroFish patch, seed and recreate guide (`mirofish/`). Its README explains each folder.
- **Unfinished work:** every worktree that had uncommitted or unmerged work is pushed as `wip/<branch>` ([branch list](https://github.com/therealetm/lowispike/branches/all?query=wip%2F)). Feature branches that were already pushed keep their own name.
- **Backend:** Supabase project `vnfwmifmsfecascwaody` (MAYA-HANDOFF.md section 2 explains access; the service keys are never in the repo).

## Rebuild the old computer's setup (about 15 minutes)

1. Sign in to GitHub with the device code (MAYA-HANDOFF.md section 2, "Accounts and access"): `gh auth login --hostname github.com --git-protocol https --web`, post the 8-character code and https://github.com/login/device to Emmanuel in the chat, then `gh auth setup-git`.
2. `git clone https://github.com/therealetm/lowispike.git /home/sprite/lowispike`
3. `git -C /home/sprite/lowispike worktree add /home/sprite/wt-harness agent-harness`
4. Restore the bug-hunt memory and probes: copy `/home/sprite/wt-harness/probes/BUGHUNT` to `/home/sprite/BUGHUNT`, and copy `vm-notes/COORD-*.md` to `/home/sprite/` so running-work notes are where the skills expect them.
5. Playwright: `mkdir -p /tmp/pw && cd /tmp/pw && npm i playwright && npx playwright install --with-deps chromium webkit`.
6. Supabase CLI (only for backend work): install it, then sign in again; `tools-vm/sbw.sh` shows the wrapper the old computer used. The CLI token itself does not travel.
7. Recreate the two Sesame skills if your agent does not have them: "LOWiSPIKE coding task playbook" (source: AI_PLAYBOOK.md plus MAYA-HANDOFF.md section 3) and "LOWiSPIKE hourly bug hunt" (source: `probes/BUGHUNT/LEDGER.md` header and section 0.6), then the hourly schedule (cron `0 * * * *`, Europe/Berlin) that runs the bug hunt.
8. Keep the handoff rolling (next section).

## Keep the handoff rolling

Nothing may live only on the agent computer. The playbook and bug-hunt skills already say this; the commands are:

- After every step that changes code: commit to your branch (never main) and `git push origin HEAD:refs/heads/<branch>`. Keep `HANDOFF-<topic>.md` current on the branch.
- When a task finishes or stops: `bash /home/sprite/wt-harness/probes/sync-vm.sh "<topic>: <what changed>"`. It copies notes, probes, research and tooling to agent-harness (whitelist plus a secret scan that refuses to commit anything that looks like a key), and pushes every unfinished worktree to `wip/<branch>` as a fast-forward.
- When this file changes: update `docs/HANDOFF-NEXT-MAYA.md` (docs only, no build bump, land it with `scripts/push-main.sh` under the release lock), then send its GitHub link in the chat. Do not regenerate or email the PDF. Any existing PDF is an older snapshot; this Markdown is the current handoff.

## Emmanuel's standing rules (short version)

The full list with his words is at the top of MAYA-HANDOFF.md and in section 5.

- **Report LOWiSPIKE work only once it is live (new, Mon 26 Oct 2026 about 1:45 PM).** Never report work that is built but not live; it stays out of his updates until it is in the live build.
- **Ship live without asking.** Finished means live in his app. Release through `scripts/release.sh` once the full suite and `node scripts/release-check.cjs` pass.
- **Every update is silent (standing rule, Tue 27 Oct 2026 about 9:45 AM, his words: "keep in mind all updates are silent. No more notifications for anyone.").** Release only with `scripts/release.sh "..." --quiet`: no What's New line, no update banner, no "new version" card, no push, no Community post, no notification of any kind, for anyone. `version.json` keeps `"loud":"20000101-000000"` and its `news` entry is never replaced by a release. This supersedes the older "What's New tour stays" line and every `--news` step in older handoff text.
- **Don't ask him questions; decide and act.** At most one approval ask per task. Post anything that needs him (approvals, sign-ins, task updates) in the chat, not only the activity feed.
- **Updates:** a short voice note plus a text checklist (✅ done, ⏳ in progress, 📝 to do), done items stay on it, and one exact thing to try on his iPhone.
- **Chat only, never Gmail:** send all updates and files only in the Sesame chat. This supersedes older email instructions in other handoff files.
- **No pages or PDFs for his updates:** either a full video with voiceover, or text with every link to click. Share this Markdown handoff by its GitHub link in the chat.
- Send an image only when he is truly needed.
- **Say "your companion"**, never "Misty", for companions in general.
- Every string in English, German and Spanish. Honest health copy: no medical promises, estimates labelled, one verdict per screen.
- Never put test data, bots or fixtures into production; live-site probes block the Supabase host or mark guests as test accounts.
- **When the usage limit is close:** push everything to GitHub (`sync-vm.sh`), then send him his handoff prompt word for word, unchanged, right away in the chat, with this handoff's GitHub link. Recover his exact prompt from the chat; never reconstruct it or claim it is recovered if it is not available.

## Open work on 27 October 2026, about 9:50 AM CET (live 20261027-094944)

**Live since the 26 October 2:10 PM snapshot** (all quiet unless noted; details in MAYA-HANDOFF.md under the section number): Kitchen pantry game in Cook, 0.19 (20261026-132254) · Community recipe posts open the recipe page, 0.18 (135248) · Supermarket Cart, Seller Zone tab and Give a hand swipe deck, 0.22 (135558) · Supermarket "Shop from home" week basket, 0.21 slice 1 (140914) · one scanner card, one verdict (143321, refined 20261025-235722) · companion only goes exploring when you send her (163708) · simpler Shop finds (164258) · scanner card with a tiny estimated blood sugar curve, How often and Why?, 0.31 (164825; this was the "spike curve" row) · Cook opens on Kitchen, reorderable tabs (171531) · mic dictation in text fields (173248) · quick add + in Supermarket (174232) · Cart "Someone else pays" (174856) · Move finish, biggest reward (190121) · evening Catch up on today (20261027-002636) · Day recap (004442) · bug hunts 53 to 60 (020733 to 094002) · Studio open for everyone (094223; its What's New line was taken out again in 094944 under the silent rule, see above).

| Work | State | Where | Next exact step |
|---|---|---|---|
| Bug hunt (P-DOUBLE-TAP sweep, runs 56 to 60) | Runs 56 to 60 all **live**, last one BH-060 in 20261027-094002: a fast double tap on a button that closes its own screen (Move finish Continue, install guide X / Got it, settings ring rows, quick tour Skip, My cycle Turn on) no longer presses what is under it; My cycle reopened right after closing is no longer empty. Checked in simulated Chromium only. No hourly schedule was set on the agent at this snapshot | ledger `probes/BUGHUNT/LEDGER.md` on agent-harness ("Runs 56 to 60"), probes `probes/BUGHUNT/playtest/dt-*.cjs`, test `tests/bh060-own-close-spent.test.cjs` | 1) WebKit (simulated Safari, iPhone 13) run of `dt-sweep.cjs <view> e` and `dt-cycle.cjs` on live. 2) Same-button toggles flip twice on a fast double tap (Today shopping list item, People mic, Day/Night switch): decide per toggle whether a 2nd tap within 400 ms should count. 3) Give cart, lcShop and the Give a hand deck an opener the sweep can reach. 4) `JSON.parse(...) \|\| []` loaders (run 55 note), VoiceOver focus loss, level-up/badge moments |
| Supermarket redesign, later slices (0.21) | Slice 1 live; later slices not started | MAYA-HANDOFF 0.21, branch `supermarket-virtual` | Recipe import from the share button, shared household list, offers: small slices, each released quietly |
| Promo video (0.38) | A separate task is making it from the liked 2D test; full video not delivered | agent-harness `promo/` (see the video section above) | Leave its files alone unless you are that task |
| Studio server cleanup | App side live in 094223 (silent since 094944); the retire SQL is a proposal | `supabase/proposals/studio_lock_retire_20261027.sql` | Apply only if the Studio task's checklist says it was not applied, after confirming the open build is live |
| App Store images, realistic redo | No commit in agent-harness `aso/` since 26 Oct 13:09 UTC; outcome not recorded here | concept v1 in agent-harness `aso/LOWiSPIKE-AppStore-Konzept/` | Check the chat and the task list before redoing; finish the realistic set, check every image by eye, send only in the chat |
| Community food photos analyzed automatically | WIP, untested, one commit ahead of an old main (25 Oct) | `community-photo-ai-20261025`; also `wip/chat-food-card-20261024` (shared food photos keep their scan result and badge) | Diff against main (much changed since), finish, test, release quietly |
| MiroFish crowd simulation (0.17) | Stalled on the Gemini free tier (20 requests a day); bugs fixed but untested | agent-harness `mirofish/MIROFISH-RECREATE.md` | His choice: billing on the Gemini project, or the free flash-lite route. He already has the ChatGPT prompts (`research/LOWiSPIKE-ChatGPT-simulation-prompts.md`) |
| Small items from the 24 Oct sweeps (not re-checked since) | Open | hourly sweep reports in the chat | A price another member found shows as typed ("€2,29") in English; "Habit tracker" screen-reader label in spirit.js is English; swipe down does not close the Scan camera or the tour card (back, X, tap outside do) |
| Growth research (UGC creator farms, Finch, founder videos) | Done, delivered | agent-harness `research/` | Leads only; nothing to build until he picks |
| Older WIP from 18 to 19 Oct | Snapshots, never released | `wip/own-companion`, `wip/meal-names`, `wip/snap-fix`, `wip/chat-room-kb`, `wip/product-card-order`, `wip/nutrition-stats`, `wip/liquid-fill-perf`, `wip/handoff-evo-more`, `wip/handoff-food-paths` | Check each against main first (much was rebuilt since); revive only what is still missing |

**Waiting on Emmanuel (decide for him only if he says so again):** should Post in Community wait until the photo is ready; should companion visits wait until 8 AM; which German word for Save (the button says "Speichern", saved items say "Gemerkt").

## If you are the next Maya, do this first

1. Read the top of MAYA-HANDOFF.md, section 0.6 and section 0.20, then this table.
2. Check the live build and `git log origin/main` for releases since this file was written.
3. Rebuild the setup (above), then pick up the table from the top. One task per row, one worktree each, COORD file first.
4. Tell Emmanuel in one voice note plus checklist that you have taken over and what you are doing first.

## Oct 27: photo-first Log meal + 10 photos a day + You & companion stats (LIVE, released silently Oct 27)
Emmanuel's words: "remove the barcode scanner because there's no point of having it there. This is really just for someone who's about to eat... They take a picture of their food. The AI can analyze what they ate. And just to be a little bit generous... just give them 10. If they run out, they run out. Make the picture one very clear, and very easy to open and to access. Don't make it confusing... I want to be better than the app called Yazio. Yes, we have the stats of our companion. But what about highlighting other human stats? There should be an easy place to see it, to view it. Maybe next to the companion stats. But also, obviously, as you're tracking your food, to motivate you. And obviously, they're linked together."
Done and released (edge function food-photo deployed Oct 27 with DAY_MAX 10; deployed source = repo supabase/functions/food-photo/index.ts): big photo button on the meal sheet, Barcode chip and food-camera Barcode switch removed; DAY_MAX 10 in meal-photo.js and supabase/functions/food-photo/index.ts (based on deployed v8 = wip/chat-food-card translate mode, portions now asked in the user's language); stale cached limit-3 counts ignored; count shows only at 3 or fewer left; portionL() in meal-result.js translates "about 4 pieces"; leftover English Wie immer names go once to the translate mode and are cached (lowi.mealname.tr.v1); you-stats-core.js / you-stats.js / you-stats.css (You | companion tiles, today grid, "How you give <name> energy" from LowiSun.energyNow + ENERGY weights, human-first nutrient rows with net carbs, row in the companion hold card under the today orbs, "Your day so far" on the saved-meal screen, kcal line in the Wie immer toast).
Finished Oct 27 (second run): 7 old tests moved to the new sheet without losing what they guard (meal-names, meal-photo x2, meal-sheet-simple x2, meal-slots, scan-screens, spanish-natural); new tests/photo-first.test.cjs (no Barcode on the sheet or in the food camera, one big photo button above the field using the companion name, no-photos tap focuses typing, 10/day in app + server, translate kept) and tests/you-stats.test.cjs (link() against the real LowiSun.energy + ENERGY: rows food/water/move with max 34/26/26 and base+parts = real energy; you() streak/calm/spiky/net carbs; moved(); hold-menu/after-save links wired). Full suite 3980/3980. Simulated Chromium walkthrough (ps-walk/walk.cjs in /home/sprite) at 390x844, 375x667 (SE), 820x1180 in de/en/es: all 9 PASS: photo button reachable and ~94pt tall, no Barcode, camera opens with shutter and no Barcode switch, 2-left count shows, 5-left stays quiet, 0-left tap focuses typing, save -> 'Dein Tag bis jetzt' -> 'Du & <name>' sheet with 3 'So gibst du <name> Energie' rows, hold-menu Du row opens it, no sideways scroll. Deployed function checked from the app: allowance() -> limit 10; translateNames() still answers. Not checked on a real iPhone/iPad.
