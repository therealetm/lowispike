# LOWiSPIKE decision log

This file is append-only. Add decisions with a date, status, context, decision, and consequences. Never silently rewrite a settled decision; supersede it with a newer entry.

## 2026-10-14 — Repository documentation is a release contract

**Status:** Accepted

**Context:** The application spans a large ordered HTML file, external feature modules, browser storage, Supabase, a service worker, and overlapping presentation layers. Partial context caused agents to fix one surface while breaking another.

**Decision:** Root documentation maps the entire application: product context, architecture, screens, data/events, testing, release behavior, decisions, and ordered work. Every AI begins with the same reading order in `README.md` and `AGENTS.md`. A change that alters a documented contract updates the corresponding document in the same commit.

**Consequences:** Documentation-only claims are not proof; tests and the live app remain authoritative evidence. Conversely, undocumented new globals, storage keys, events, screens, or release steps are incomplete work.

## 2026-10-14 — Internal code names do not become unexplained UI labels

**Status:** Accepted

**Context:** Legacy names such as Shelf and Swaflo describe implementation history but confused users when exposed directly.

**Decision:** User-facing actions describe the outcome in plain language. The Shelf subsystem is presented as Cook. Swaflo remains an internal adaptation engine and cannot appear alone as a CTA.

**Consequences:** Engineers may preserve internal identifiers for compatibility, but new copy and accessibility labels use product vocabulary documented in `CONTEXT.md`.

## 2026-10-14 — The herb owns the companion role

**Status:** Accepted

**Context:** A separate floating orb and a herb module created competing identities, and removing the familiar bubble broke an essential product anchor.

**Decision:** The herb is the only companion. The persistent bubble above Scan is its compact presence and opens the herb's home. No second companion may be visible.

**Consequences:** Legacy body/orb code may support rendering but cannot create a parallel character. Any redesign must preserve the bubble's function and recognizability.

## 2026-10-14 — Companion speech responds to meaningful events

**Status:** Accepted

**Context:** Three-second speech notices appeared on nearly every page interaction, repeated, covered controls, and used confusing lines.

**Decision:** Speech is allowed only after a deliberate herb tap, a completed care action, an evolution, or a permitted reminder. Navigation and ordinary clicks are silent. Lines must be short, plain, situational, and unique within a session.

**Consequences:** New page modules must not call companion speech during mount or navigation. Copy tests should reject repetition and unclear placeholder prose.

## 2026-10-14 — Primary tabs are one-screen experiences

**Status:** Accepted

**Context:** Long dashboard stacks and controls hidden below the fold made the app feel like a conventional utility and caused bottom-navigation collisions.

**Decision:** At common iPhone sizes, each primary tab presents its essential state and action without page scrolling. Secondary lists and details use a sheet or focused screen. Scan uses one capture surface with Barcode and Meal photo modes.

**Consequences:** New cards must earn their space. Test 390x844 and at least one smaller viewport before release.

## 2026-10-14 — Real actions are the only care and XP source

**Status:** Accepted

**Context:** A Tamagotchi is motivating only when its state reflects the user's actual behavior. Duplicate listeners or decorative taps could otherwise inflate progress.

**Decision:** Meal logging waters, a completed swap gives sunlight, movement makes the herb dance, a completed scan gives a vitamin sparkle, and finishing a recipe produces a temporary bloom. Each event has a stable ID and is awarded once through the single XP ledger. Stages never regress.

**Consequences:** Navigation, tapping the herb, animation replay, and reopening screens award no XP. Large XP jumps use one combined evolution reveal. (Partly superseded on 2026-10-15 for XP only: see "Every purposeful tap earns a little". Care still comes only from real actions.)

## 2026-10-14 — Shuffle must show a shuffle

**Status:** Accepted

**Context:** Instantly replacing a result with another static image did not communicate randomness or delight.

**Decision:** Cook/Buy/Sweet snack shuffle visibly cycles through multiple available images and then settles quickly on the chosen result. Reduced-motion users get an immediate but clear state change.

**Consequences:** A single-image fake animation does not satisfy the interaction.

## 2026-10-14 — Release truth comes from the remote and Pages

**Status:** Accepted

**Context:** A dirty or stale local checkout can differ from GitHub and the deployed app, causing false completion claims and wasted work.

**Decision:** Agents must compare the remote `main` SHA, commit with an expected-parent lease, wait for GitHub Pages success when deploying, and verify the served build identifier. Reports distinguish automated, browser, simulator, and physical-device evidence.

**Consequences:** “Done” never means merely edited locally. Scope freezes before release, and blockers are reported immediately to conserve time and credits.

## 2026-10-13 — Living holographic herb is the visual direction

**Status:** Accepted

**Context:** A small flat plant in a standard progress card felt generic; a generic game skin also failed to reflect the user's metabolism and inner energy.

**Decision:** The companion uses a premium, luminous, bio-organic/holographic language with obvious constellation influence and six dramatically distinct forms. It should feel alive, collectible, and specific to LOWiSPIKE.

**Consequences:** Generic RPG panels, flat clip-art plants, and decoration without behavior are out of scope. A separate whole-app “biopunk mode” remains unshipped and undecided.


## 2026-10-14 — One spirit world and honest nutrition

**Status:** Accepted by the requested release.

**Decision:** Home and Scan enter one water-bubble world containing exactly one creature. The native scanner and collection are reused. Profile levels follow the six herb thresholds. Macro goals reward only logged values, with sugar reviewed at explicit day close. Missing values stay unknown. Incomplete payment integration is represented as unavailable premium previews, not a free-account gate masquerading as checkout.

**Consequences:** UI migrations do not reset XP or delete uploads. The previous companion page and extra dock are removed. The release report distinguishes logic tests, isolated browser checks, production-account checks and physical hardware.

## 2026-10-14 — The app sky follows the real weather

**Status:** Accepted by the requested release.

**Decision:** The whole app background mirrors outside, from the Open-Meteo reading the weather chip already fetches: rain, drizzle, storm, snow, fog, clouds, sun, stars, dawn and dusk, frost when cold and haze when hot. Day and night come from the location's real sunrise and sunset. Without a fresh reading the clock sets day/night and no weather is invented. Sunrise theme mode follows the real sun; Night and Cloud remain the user's choice, and Appearance has one switch to turn the live sky off.

**Consequences:** The sky is one non-interactive layer behind every screen, built from transforms and opacity only, hidden while the camera is open and still under Reduce Motion. It never requests location by itself and adds no page scroll.


## 2026-10-14 20:52 — Scan answers first: likely-spike estimate before evidence

**Status:** Accepted (owner request after a failed grocery scan).

**Decision:** A barcode scan always ends on the LOWiSPIKE verdict card: red / yellow / green likely-spike estimate from the existing rules, the silhouette-to-verdict animation, the herb reacting to that same estimate, and "Ate it, log it" / "Skip" directly under the verdict. The evidence-first field guide (discovery.js, tiers, missing label fields) is a secondary "Label details & evidence" link, never the scan result. No "Tier pending" badge on the scan card. Logging a meal earns the normal meal XP whatever the estimate. Photos are for saving and manual upload to the separate custom GPT; there is no in-app vision analysis.

**Consequences:** rate(), rateName(), cardHTML() and reveal() must not be short-circuited by LowiDiscovery again (regression: b70d05a). tests/scan-verdict.test.cjs guards it.


## 2026-10-14 21:35 CEST — Cook > Produkte picks open the spike verdict, not the label evidence page

**Context:** A caught product picked by the Cook shuffle showed the Swaflo card ("Label unverified, check before buying"); tapping it opened LowiDiscovery's evidence guide ("Tier pending", missing label fields). The product already carried the scan verdict (verdict, why, facts), the pick just never showed it.

**Decision:** A product pick renders a compact verdict card on Cook (badge + top reason) and opens the scan verdict card (LowiDex.reveal: animation, herb, meter, reasons, Ate it / Skip) as soon as the shuffle lands, with no extra tap. Before showing it, LowiDex.enrich fills only missing carbs, sugar, fiber, protein and ingredients from Open Food Facts by exact barcode, then re-rates. No fuzzy name search, nothing invented. The card says what was filled in and what is still unknown; the verdict stays a likely-spike estimate.

**Consequences:** tests/prod-verdict.test.cjs guards it. The label evidence page stays reachable only from the small "Label details" link in the verdict card.

## 2026-10-14 22:45 CEST · "View password" in Profile is "Forgot your password?", opened Profile parts scroll

**Context:** Emmanuel asked to "click on view password" in Profile in case he forgot it. Accounts are Supabase email + password; Supabase keeps only a one-way hash and the app never stores the password, so an existing password cannot be shown by anyone. Separately, opened Profile parts (Settings, About you, Health) were taller than the screen while `.spirit-app .tab.active` forbids scrolling, so their lower rows were unreachable.

**Decision:** The Account card gets a "Forgot your password?" link next to Change password. Its sheet says plainly that the password can't be shown, points to the iPhone Passwords app, and lets the signed-in user set a new one via `sb.auth.updateUser({password})` (no old password, no email). The eye button on password fields shows/hides what is typed, with aria-pressed and a Hide label. A hidden username field lets iOS offer to save the new password. Same-password and reauthentication errors get clear copy. An opened Profile part (`html.g2e-open`) scrolls, with the orb spacer at the end; the main Profile screen still fits without scrolling.

**Consequences:** Nothing reveals or stores a password. Signed-out users still ask Emmanuel (no reset email: project mailer is not set up for it). tests/password-ui.test.cjs guards it.

## 2026-10-14 23:10 CEST: update news shows once
- An update note is shown once per news id: in the update banner, or (if the update arrived without the banner) in one bubble. It is marked seen the moment it appears (`lowi.news.seen`, kept on sign-out). Tapping the banner no longer replays anything after the refresh; "Show me" goes to the place and never repeats the text; "Later" no longer re-offers.
- The embedded Swaflo note (`NEWS_RAW`, id swaflo-v1) is removed. News comes only from `version.json` and only when its build equals the running build.
- Opened in a phone browser (not from the Home Screen): an "Add to Home Screen" note on Today, in the app language, in the free space above the scan orb. It stays until closed (it promises full screen only, not that the sign-in carries over); × hides it for that visit only. Never in the Home Screen app.

## 2026-10-14 23:20 CEST - Sign-in carries over from Safari to the Home Screen app (build 20261014-232000)

- Cause confirmed: on iPhone, Safari and a Home Screen web app keep separate storage, so the Supabase session in Safari's localStorage is not in the Home Screen app. No browser API copies it, and the manifest/start URL can't carry it safely.
- Decision: carry it with a one-time code. New edge function `auth-handoff` (supabase/functions) + table `public.auth_handoff` (RLS on, no policies, SHA-256 hashes only). Signed-in accounts in iPhone Safari: the "Add to Home Screen" note (#lcA2hs) now says "...stay signed in"; its button copies a code (12 chars, single use, 30 min) and shows 3 steps. Home Screen start screen: "Paste sign-in" (clipboard, or type it). Redeem returns only a magic-link token hash; the client calls `auth.verifyOtp` and then runs the same restore path as a password sign-in. The code is also mirrored to CacheStorage (`lowi-handoff`); where iOS shares that with the Home Screen app, sign-in is automatic.
- Rejected: tokens/codes in URLs or the manifest, cookies (also not shared), copying refresh tokens. Guests (no email) can't issue. Sign out and Start fresh revoke open codes. A copied code is never renewed away before it expires.
- Verified: live backend checks (tests/handoff-live.cjs) and a two-context Chromium run with separate storage (Safari context signs in, copies; standalone context pastes -> same user id, survives relaunch; reused code refused). Not yet on a physical iPhone.

## 2026-10-14 23:35 CEST: update news comes from your orb
- The generic update banner is gone from view. `#lcUpd` (Q1) stays the engine (build check, refresh) but is hidden; `#g1Ob` shows the news instead: on Today a speech bubble anchored to the real orb (`#spBubble`, which hops), anywhere else a small copy of the orb (the user's own herb, cloned from the Today orb) at the top with the bubble beside or under it.
- Buttons: Update (same refresh as the old banner tap), Later, Listen. Later or Esc hides it for that build (`lowi.upd.later`), also after reloads; the next build shows again. News text is still marked seen once per id (`lowi.news.seen`), so nothing repeats after the refresh.
- The post-update news (update arrived without the banner) uses the same orb bubble instead of the tour card, whose guide herb is hidden in the spirit app.
- Reduced motion: no pop, hop or float. Real buttons, 44 px targets, dialog role (non-modal, no focus steal).

## 2026-10-15 00:30 CEST: living Home tiles + one-tap scan
- `living-home.js`/`.css` render `#lvDash` inside `#spHome .sp-log` (rows hidden, header + habit dots kept): Level/XP ring, Wasser (fills like a glass, tap = +1 glass via spirit's `data-sp="water"`), Scannen, Essen, Makros (bars vs `user.macroGoals`, earned bonus ticked, meals without values counted, never guessed), Bewegung. All values from real state; unknown stays unknown.
- Scan: Home tile, nav Scan and "Produkt scannen" outside the world open the barcode camera as its own layer (`LowiSpirit.scannerHost` returns body while direct). After a find, the herb world still plays the catch + verdict.
- Macro bonus: protein/fiber pay out when known values already reach the goal (an unknown meal can only add); sugar still needs every meal known and the day closed.
- Home is no longer `overflow:hidden`: it scrolls only when content doesn't fit (iPhone SE, Safari bars).
- Weather: opt-in is saved as soon as a position arrives, so an offline first fetch doesn't lose it on iOS home-screen apps that report "prompt".

## 2026-10-15 14:15 CEST: every purposeful tap earns a little, healthy actions in a row earn a streak bonus

**Status:** Accepted (user: "Anything we do, any click, has to get them points", plus a streak bonus for consecutive healthy actions and tiered feedback)

**Decision:** `xp-tap-core.js` (pure rules) and `xp-tap.js` add XP on top of the existing ledger, always through the one `award()`.
- Tap tier: the first trusted tap on each distinct control per day earns 1 XP; the first visit to a place (tab, 3D region, ride arrival, arrival fact, cell room, buddies, shop, care sent) earns 3 XP. Together max 40 XP a day; taps closer than 350 ms are ignored; drags, long presses and taps from code never pay. Close, cancel, back, delete, reset, sign out and overlay backdrops never pay. Repeats show a quiet "counted today", never points.
- Taps are batched into one ledger entry (src `tap`, id `tap:<day>:<seq>`, label "Curiosity · n taps") after 2.5 s or when the app is hidden; the id is spent before the award, so reloads and retries can't double it.
- Healthy streak: low-spike meals, water (max 3), Move, scans, swaps, cooking and the daily check-in in a row today, broken by a high-spike meal. 3 = +10, 5 = +20, 8 = +40 XP (src `combo`, id `combo:<day>:<n>`, once each per day). Fasting never counts.
- Feedback: tiny pop at the finger (tap), a mint pop (new place), a banner (streak 3 and 5), a full fanfare (streak 8 and the existing day-streak badges). Variants rotate, never the same twice in a row; reduced motion gets still fades. `award()` takes an optional 6th argument `{quiet:true}` that skips only its own toast.
- Minor entries (src tap/combo) are skipped by sun meter, herb praise, herb care kinds, the evolution card and the daily-ritual active days.


## 2026-10-15 15:00 CEST: XP only for completed, meaningful actions (replaces 14:15)
- User feedback: random taps and tab switches gave points, and tapping Move showed an explore reward. That rule is gone. Taps, tab switches, opening sheets or menus and plain navigation earn 0 XP; xp-tap.js has no tap listener. Pending tap points from build 141500 are dropped, never paid; old ledger entries (src tap) and all saved XP stay.
- XP comes from completed actions: the app's own meal, water, Move session, steps, fast, body-journey, scan, swap, cooking, check-in and quest rewards (unchanged, each capped or eventId'd), plus four that had none: first-ever discovery of a body region (5 XP, once per region), a microbe joining the crew (5, once per microbe), care sent (5, max 3 a day), a corrected fasting start (3, max 1 a day; the fast's own points stay once, when it ends).
- Every award names its own action; LowiTapXPCore.category(entry) maps any ledger entry to its category from src first, so a Move entry is always move, never explore.
- Farming and safety: Craving handled max 3 a day, weekly glow once a week, hourly fast points stop at 16 h (CAP_H 36 -> 16) so longer fasts earn nothing extra; Move stays capped at 3 sessions and 30 XP each.
- Healthy streak bonus and the subtle pop / banner / fanfare tiers are unchanged. Bonus actions above never feed the streak.

## 2026-10-15 15:15 CEST: the Update button never freezes
- User report: tapping Update on the new-version bubble did nothing and the button stayed greyed out (iPhone web app).
- Cause reproduced: doUpdate awaited navigator.serviceWorker.getRegistration() before navigating, with no time limit. When the service worker's promises never settle (seen on iPhone web apps), it never navigated, and `updating` stayed true, so every later tap and check was ignored too.
- Now the tap never waits on the service worker: it shows "Updating..." at once and loads ?v=<new>&r=<now> straight away. The new page registers and updates its own service worker.
- 12 s watchdog (paused while the app is hidden): if the old page is still there, the bubble says it is taking long, the button becomes "Try again" and works again, and the text names the fallback: close LOWiSPIKE completely and open it again. A web app cannot close itself on iOS, so the app only says it.
- Offline taps do not navigate (that would only load the old copy); the bubble says the update loads once you are online.
- Back/forward-cache restores reset a pending update. Rapid taps start one load only. No storage is cleared; login, fasting and all local data stay.
- After a load that still shows the old build, the note now says to close and reopen the app (shown 9 s), cooldown unchanged.
- sw.js install also caches the page itself, so an offline launch right after an update still opens (activate deletes the old cache that held the last page).
- Users still on a build before 151500 run the old button once; if it hangs for them, closing and reopening the app once gets them onto the fixed one.


## 2026-10-15 — Publish recovered world-first Home for review
The user explicitly requested deploying the recovered Home implementation without waiting for browser setup, and will review its appearance in the app. This permits publication for review; it does not establish completion of visual or physical-device acceptance.
## 2026-10-15 — Community spirit-square identity and honest delivery

**Status:** Implementation of the assigned Community brief on an isolated branch; integration and acceptance pending.

**Decision:** Keep the existing `all` room as a shared gathering place, present the spirit-town direction inside Community, retain the existing profile bubbles, and show existing personality privately with explicit optional sharing. Remove fabricated chat activity. A stable-ID outbox makes uncertain delivery recoverable; reports require acknowledgement, blocking persists, and device quiet hours silence chat notices. Birthday/health are excluded from chat profiles; room membership never infers health. No XP for navigation or chat taps.

**Consequences:** Room taxonomy, discovery/routing and matching remain unresolved; none is implemented as a settled rule. Home/Scan are unchanged. New optional backend tables/policies and old-public-profile remediation require live review, and browser/device/two-account evidence is still outstanding. See `COMMUNITY_CHAT.md`.

## 2026-10-16 — Spiky meals earn nothing (never minus); Misty's energy gates her adventures

**Decision (E-man):** A meal the app already rates as a spike (same rule as `LowiWorldHealth.verdict` <= .15: `r` nein / `lvl` high, `ja` wins) is logged and kept, but earns no meal XP, no eat-quest and no fast-break bonus, on every log path (spirit, barcode, legacy check, plan). No negative points anywhere. Typed/photo meals get `analyseMeal`'s verdict only when it recognises the foods; unknown foods stay unknown and are rewarded as before.

**Energy:** `LowiSun.energy()` (sun-meter.js): 0.15 base + food 40% (mean verdict of today's logged meals) + water 30% (glasses/4) + Move 30%. Tiers: thriving >= .75 (content: short calm mouth, no smile), ok >= .4 (neutral mouth), below: weak if a spiky meal was logged (sleepy eyes, small sad mouth, red rim) else tired (sleepy eyes, neutral, faded). Not tracked is shown as "not tracked yet", never as "you didn't". The sun-full bonus still pays; the 1 h trip only starts once energy >= .4 (same day), body trips don't start either. Leaving full of energy brings back a second find. Update (E-man): no smile in any energy tier. Today's trip energises the world's cells (`LowiSun.tended`: thriving 1, ok .5, grows over the hour, stays for the day): beacon glow +45% size, brighter rings and cores (`setTend` in body-world-3d-scene.js). Countdown "Out exploring · back in N min" sits in her empty bubble on Home. Trips are timestamps reconciled on load, not a background simulation; finds are paid once.

## 2026-10-16 12:10 — The flat spirit-world wallpaper is gone for good (user decision)

**Decision (E-man):** "I hate the wallpaper. Remove it, kill it completely." The Metabolic Spirit World picture (his image of glowing spheres joined by threads of light) was shown as a flat wallpaper behind Community and the Community warp (fd83f55, build 20261016-141510) and was about to be copied behind Cook, Move and Scan (branch parallel/backgrounds-scan, e659e4d). He rejected it as lazy.

- The picture is **inspiration only**. It must never be used as a backdrop, wallpaper, background-image, `<img>`/`<picture>` layer or texture behind any screen: not Community, not the warp, not Cook/Move/Scan, not onboarding, not a sheet.
- Community is the living 3D world zoomed out past the World Map into the spirit world (87158db, build 20261016-150010): our bubble among everyone's, joined by light threads, rendered by body-world-3d-scene.js. Any page that wants the spirit-world look shows that same live world, never a picture of it.
- The image files (spirit/metabolic-spirit-world*.webp/jpg) are deleted and out of sw.js. Do not re-add them or any other raster wallpaper. tests/no-wallpaper.test.cjs fails if they or a raster `url(...)` background come back.
- e659e4d (realm-backdrop with the picture behind Cook/Move/Scan) never shipped with its picture. 4d68c16 (build 20261016-153010) shipped that layer as see-through light and motes over the live 3D world, and Scan's flow (world first, glass camera card after about a second, feed fades in) over the living world. Keep it that way: realm-backdrop never gets an image.
- Bringing any wallpaper back needs a new, explicit decision from E-man.

## 2026-10-16 12:30 — In-app banners never sit in the status bar

**Decision (E-man, iPad screenshot of Move):** the check-in bubble (#n1B, "Later" / "Check in ›") was jammed into the iOS status bar, "nobody can read that". With the menu as a side rail there is no Scan orb under the content, so the old "above the orb" placement pushed it past the top edge.

- On iPad/desktop (side rail) the bubble is a centred card inside the content column, right of the rail, under the safe area and under the page's top row, in the blue liquid glass (the Misty / Daily Quest glass, darker base so it reads over any page).
- On a phone it stays above the Scan orb with its tail, and falls back to the same card under the top row if there is not enough room above the orb (phone on its side). It never goes above `env(safe-area-inset-top)`.
- Any new toast or banner follows the same rule: below the safe area, inside the content column, clear of the rail, readable and tappable (44 px buttons).

## 2026-10-16 05:00 — Microbe buddies removed, with their XP

**Decision (E-man):** "So basically, my pet has also their own pet. I think it's annoying. Let's delete them." Anything to do with them goes, and the XP they earned is taken back.

- Removed: microbe-buddies.js/.css/-core.js (starter Lacto, crew of three orbiting the cell and the Home orb, Buddys chip and sheet, cell-room buddies, bond levels and XP gifts, mood lines, trip companion), the `buddy` XP action in xp-tap, the talking buddy stops on the cell ride, the microbes with eyes next to the gut in the 3D scene, and the microbe collection in the book (Microbes tab, herb world chip, discovery toasts, the external-buddy contract `LowiBodyBuddies` / `lowi:buddy-found`).
- Kept: Misty, the adventure log (Journeys) and friend care (Friends) in the same sheet, now titled Adventure log; the plain drifting particles in the ride vessel.
- XP: `load()` drops ledger entries with src `buddy-add` or `buddy-bond:*` and subtracts them from S.xp (never below 0); the retained herb stage never regresses. S.buddies and S.microbes are deleted. Idempotent.

## 2026-10-16 — Calm sound: pads, singing bowls and a string pad replace the harsh tones

**Status:** Accepted (handoff task 9; branch `sesame/audio-companions-20261016`)

**Context:** E-man described the app's tones as a harsh microwave sound. The timers used thin 740-1568 Hz sine beeps with a 15 ms click attack, and the world sound used a constant noise band plus a 58 Hz pulse when the world turned stormy.

**Decision:** Timer beeps in Move and the guided player become a soft singing-bowl chime (`LowiCalmChime`), with pitch order kept so countdowns still read. The world sound becomes a slowly gliding soft pad with sparse singing bowls; the stormy cue becomes a deeper pad and a slow low bowl, with no noise and no pulse. Sound on Home opens a glass string pad first: touch or swipe plays notes, height sets loudness, sliding along a string bends it, and the touched string glows and vibrates. Everything follows the volume slider and the app-wide sound switch, starts only from a user gesture, and stops when the app is hidden.

**Consequences:** `UNEASY.pulse.every` stays only as the visual beat `world-mood.js` reads. Any new tone should use the calm-sound core and not add square or sawtooth waves.

## 2026-10-16 — Region companions are guides, not pets

**Status:** Accepted (handoff task 10; branch `sesame/audio-companions-20261016`)

**Context:** The leftover gold info cards and the region label line felt like UI left behind after the world-first redesign. E-man asked for a small glass companion in each region that moves with you and tells you facts the way Misty talks.

**Decision:** Each region has one glass creature (`region-pals.js`) with a Misty-blue speech bubble that says a greeting, the region's reviewed facts from `arrival-core.js`, and today's line. Its presence suppresses the arrival card and the Daily Quest line in regions. They award no XP, store nothing, cannot be collected, and none is a microbe (the gut guide is a villus). Misty stays the blue comet and the only companion tied to XP.

**Consequences:** New region facts go into `arrival-core.js`, not into the companion file. A steering module can move the companion with `lowi:region-steer`.

## 2026-10-16 — Scan: iOS's camera prompt only, the same living world, camera states in blue glass

**Context:** E-man tested Scan on iPhone (build 20261016-161510): "Why did you add 'Let LOWiSPIKE use the camera'? That's double work ... iOS shows its own prompt again." The camera screen also sat on a plain starfield instead of the living world every other page uses, the "Camera is blocked" card was flat grey ("It doesn't fit our whole theme"), and the tab bar lit Community while he was on Scan.

**Decision:**
- **No in-app pre-permission card for the camera.** Tapping Scan asks for the camera straight away, so iOS's own prompt is the only one; when access is already granted it just starts. The one-second delayed card from c2aeaad/4d68c16 (build 20261016-153010) and the "Allow camera" strings are gone. Do not bring back a pre-prompt.
- **Scan uses the same living world as Community, Cook and Move.** While the camera is open full screen (`html.rw-scanworld`, set by realm-backdrop.js) the camera screen is see-through: under it are the realm-backdrop layer (`#rwBack`) and the live 3D world pulled out into the spirit world (body-world-3d.js treats it as `tab-scan`). The page that lies under the camera is hidden; the dock stays. The feed fades in over the world once a frame plays, and the camera's vignette only comes with the feed. Never the flat spirit-world picture.
- **Camera states use Misty's blue glass** (`--wh-glass-*`, the Daily Quest / weather pill / bubble tokens): starting, camera off (denied), no camera and didn't-start. Compact card, a blue Try again, "Type the number" offered as the way round, frame corners and the light hidden while there is no camera.
- **Scan is the lit tab while the camera is open** (scan-glass.css, same weight as world-home.css's `#tabbar#tabbar`).

**Consequences:** Barcode reading, manual entry, Snap food, Log meal, Water +1 and Deep analyze are unchanged. The herb world's own camera (inside `#spWorld`) keeps its copy of the layer. Tests: tests/realm-backdrop.test.cjs.

## 2026-10-16 — The Move workout figure is a human silhouette, not the companion

**Status:** Accepted (supersedes the "Misty with limbs" workout body of build 20261016-205010)

**Context:** The workout player showed Misty's own bubble head on short glass limbs. The owner: putting the companion's head on a body "broke everything" and looked nonsensical. He likes the liquid cell / bubble glass look, but wants a plain human body silhouette doing the moves.

**Decision:** `move-player.js` draws a naturally proportioned human in profile (head with a soft face profile, neck, torso with chest and back, full-length arms and legs, hands, feet) straight on the joints the Figure solver in `index.html` already computes, at their real lengths, so every move keeps its exact timing and shape. Every part uses the same glass: membrane rim, deep translucent fill, soft core, white shine, rims drawn before fills so the body reads as one liquid outline, plus a small light (nucleus) in the chest. No companion artwork is cloned into the player and no picture assets are used. Misty stays unchanged on Home and everywhere else. Glow layers exist only for the body parts being worked.

**Consequences:** Styles are `mph-*` in `move-player.css`; `tests/human-silhouette.test.cjs` guards the proportions, the no-companion rule and the glass layering. The camera-mirror ghost (separate task) uses its own front-view drawing in the same glass style.

## 2026-10-17 — Limitless spirit world (handoff item 11)

**Decision (E-man):** a limitless spirit world with no invisible walls, without the app growing, and Home always reachable.

**Done:** Out in the galaxy (misty-galaxy.js) the hard outer edge at `GAL.R` (230) is gone; `GAL.R` only marks where the camera has backed all the way out. Past the hand-made galaxy, new space is made up as she flies (E-man: "generate a new space instead of having the whole world there, so the app isn't bloated"): space is split into invisible 260-unit cubes, and whether a cube holds a glass world, where and how big comes from the cube's coordinates alone (`deepWorld`, `deepNear`, `GEN`), so the same place always holds the same world, nothing is stored, and the scene re-uses a fixed 12 glass worlds (8 on small screens) for the ones nearest the camera, each fading in from 430 units away. They are not solid: Misty can fly right into any of them. The galaxy is still a loop for safety: past `GAL.LOOP` (3000) Misty and the camera target are moved together, in one frame, to the same distance on the far side (`loopK`), so a straight flight comes home from behind. Nothing is visible at that moment: body-world-3d-scene.js fades the whole cosmos out by the camera's distance from home (`COSMOS.DEEP0..DEEP1`, 1000..1130, equal to `GAL.DEEP0/DEEP1`) and stops drawing it there, while the stars and far cells ride with the camera like a sky. Nothing is allocated while she flies; looping gives no XP or crumbs. Home stays possible: 20 s without steering or a recall flies her home faster the farther out she is (`homeK`, up to 10x, about 23 s for the weakest Misty from the farthest point), and a flight that ends far out glides the camera home instead of leaving it in the deep. Home, Community, Cook, Move and Scan keep the camera inside `COSMOS.OUT`, so they look exactly as before. Tests: `tests/limitless-spirit.test.cjs`.

**Left for later:** going inside a made-up world as a place of its own (today she flies into and through it; enterable bubbles and ocean-current strings belong to their own task, which can use `deepNear` for these worlds too).

## 2026-10-17 — Every galaxy bubble can be entered; the threads are ocean currents

**Context:** The owner: every bubble you can see out in the galaxy (after Misty breaks out of her home world) should be enterable, and the strings between the bubbles should carry Misty like the ocean currents in Finding Nemo: they pull her along, going against them takes effort. Until now the other worlds were solid glass.

**Decision:** `galaxy-bubbles.js` takes over from the solid-glass bump in `misty-galaxy.js`. Every thread flows one way (its sparks show which); near one she is carried along it (strongest mid-thread, up to 60 % of her own top speed) and drawn gently to its core; a full push against it still gets through, a weak one is carried back, steering sideways frees her. Pushing into a membrane for about half a second (a little longer on a tired day) lets her in; the camera comes in close and the bubble's inside walls glow; pushing out for a moment lets her out; the way home lets her straight out. With the limitless spirit world (same day) every hand-made world can be reached; the made-up worlds of the new space stay fly-through. While she is out there the other worlds and threads stay clearly visible.

**Consequences:** Only your own steering is carried (autopilot and the way home never), so home is always reachable. Nothing here pays XP, crumbs or energy. `tests/galaxy-bubbles.test.cjs` guards the rules; `tests/galaxy-bubbles-live.cjs` (Playwright, not in the offline suite) flies the real 3D world at phone and iPad sizes.


## 2026-10-17 — Holding forward shows Misty's stretchy flight skin, not a constant light in front of her

**Context:** The owner: while he holds the controller forward, a constant light (the facing dots) sits in front of Misty. "Das Schießen behalten wir ... anstatt dieses konstanten Lichts vorne ... beim Vorwärtsfliegen gegen diese dehnbare Bubble Haut drücken ... wie beim Rauskommen aus ihrer ersten Bubble."

**Decision:** `misty-turn.js` no longer lights the facing dots for a forward / back hold or a shot. While she is held forward, her own thin travelling bubble skin shows round her (the same glass look as Home's membrane and the cloud wall's skin) and tents out ahead where she presses, tilted with the controller's up / down exactly like the shot aim, so you can still read where she is going. A spring drives it: it stretches a little past full as she gets going, holds while you hold, and wobbles back (one small dent) and fades when you let go. Backing up tents it behind her. A shot punches the tip out and it wobbles back. The facing dots stay only for a drag on Misty with no hold. Home's own membrane and its breakout are unchanged: the travelling skin is only drawn once she is out of Home or inside a world.

**Consequences:** One small sphere mesh with a shader, built on first use and moved from the existing draw(); no loop or renderer of its own, hidden whenever she is not drawn. Reduced motion: it stretches and relaxes with no overshoot, wobble or ripple. The energy shot (controller hold + double tap, cooldown, healing) is unchanged. `tests/misty-flight-skin.test.cjs` guards it.

## 2026-10-17 Onboarding stays current; the shopping rhythm is typed by the person

- E-man: healthy habits start in the grocery shop, and people "should type it in themselves. We can have that in the onboarding somewhere." Setup now ends with a 4th step where the person types how often they shop (1 to 60 days); weekdays and a shop name are optional; Later skips. There is no default interval anywhere.
- One source of truth: `shop-plan-core.js` / `shop-plan.js`, localStorage `lowispike.shopplan.v1`. Grocery check-ins and world bonuses read it; they never build a second cadence.
- Existing users are never sent through setup again; they set or change it in Profile > About you > Grocery shopping.
- The sign-in gate gained a "How you play" step (controller, autopilot, bubbles, worlds, barcode estimate) and "Shop & scan" leads the habit list.
- `ONBOARDING.md` maps every onboarding screen to the code it describes; `tests/onboarding-current.test.cjs` fails when they drift or when a new shopping feature ships without an onboarding entry.

## 2026-10-18 One release path and CI on every push

**Context:** The owner asked for the way the app is built and shipped to be improved from what people who build with GitHub and AI actually do. The repo had no CI (every Actions run was the Pages deploy), and each release was a new copy-pasted script outside the repo (37 of them, about 1,700 lines) repeating the same build bump.

**Decision:** `scripts/release.sh` is the one release path: shared lock, rebase, `scripts/bump-build.cjs`, `scripts/release-check.cjs`, full tests, plain fast-forward push, `scripts/verify-live.cjs`. `.github/workflows/ci.yml` runs the gate and the tests on every push and pull request with read-only permissions and actions pinned to commit SHAs, and on `main` confirms the build is live.

**Consequences:** CI reports; it does not yet block a push to `main` (that needs a ruleset or Pages built from Actions, both owner settings). Deploys still come from the branch. The tooling commit changes no app file and needs no build id.

## 2026-10-18 One-page Home: eight controls on one true circle round Misty

**Context:** Emmanuel asked for the Home to be one page: Misty in the centre, Scan above her, the joystick below, and Fuel, Water, Move, Gap, Sleep and Settings around her. Then: "circles ... have them all at the same size ... circle math ... just implement it in our app."

**Decision:** `home-orbit-v2.js/.css` (shell, owned by the Home-ring task) puts the eight controls on ONE circle centred on Misty's home spot, one shared diameter, 45 degrees apart, clockwise from the top: Scan, Water, Move, Settings, joystick, Sleep, Gap, Fuel (since 18 Oct 18:20 Settings and Scan have swapped: see the entry below). R and the diameter come from `fit()` (pure, unit tested): the smallest ring that clears Misty by a small gap, the largest shared diameter the safe area allows (capped). It reuses the real nodes (Meals, Water, Move, #spFast, #whPad) and adds glass Scan, Sleep and Settings bubbles with [data-hb], so living-bubbles.js gives them membranes. Fuel and Gap are CSS labels over Meals and Fasting, so their painters keep their text. The old chrome (Daily quest, greeting/date/weather, Today, VR, map, sound, day/night, gift, profile, tab bar) is hidden only while the ring is on (`html.o8`). Every item stays reachable from the Settings bubble, which also has a bottom menu bar switch (`lowi.home.menubar`). The turning ring in sym-home.js steps aside under `html.o8`. Sibling adapters home-blooms-v2 / home-settings-sleep-v2 mount on the document and take over controls with data-o8-adapter.

**Consequences:** Phone and iPad use the same formula. A screen too small for the circle (fit not ok) falls back to the previous Home. The ring follows Misty while the opening camera settles, then holds still, and it writes only on change. The float bob is switched off on ring controls so the circle stays exact. Sleep is logged locally (`lowi.sleep.v1`) until the Sleep adapter replaces the fallback. Checks: `tests/home-orbit-v2.test.cjs` (numeric geometry at five sizes) and `tests/home-orbit-v2-live.cjs` (Chromium 390x844, WebKit iPhone 13, WebKit iPad 1180x820, backend blocked).

## 2026-10-18 Real Sleep and Settings bubbles on the ring Home

**Context:** The ring Home (build 20261018-165646) shipped with first-version Sleep (Good/Okay/Short, `lowi.sleep.v1`) and Settings (a plain list). Emmanuel wants every bubble to work for real.

**Decision:** `home-settings-sleep-v2.js/.css` is loaded right after the ring shell and claims the Sleep and Settings bubbles with `data-o8-adapter="settings-sleep"`. Sleep asks for last night in hours: Under 6 h, 6-7 h, 7 h or more; today's answer can be changed or cleared. It is saved privately in `S.health.sleepDays` (see DATA_CONTRACTS.md) and gives no XP or sun energy until the progression plan includes sleep. Settings blooms Me, Look & sound, Account, the bottom menu bar switch and More (every entry point the ring hides, each only when its route exists). Blooms grow outward from the bubble, never over Misty, one at a time; the ring geometry is untouched. The shell's exported `sleepToday()` answers from the module once it owns the Sleep bubble.

**Consequences:** Good/Okay/Short entries logged in the first version are not shown or imported, because quality words are not hours. Checks: `tests/home-settings-sleep-v2.test.cjs`, `tests/home-settings-sleep-v2-wiring.test.cjs`, `tests/home-settings-sleep-v2-live.cjs` and `tests/home-orbit-v2-live.cjs` (Chromium 390x844, WebKit iPhone 13 and iPad, backend blocked).

## 2026-10-18 Ring Home: Settings on top, Scan at the lower right

**Context:** Emmanuel, looking at the ring Home (build 20261018-175840): "Let's put scan where setting is."

**Decision:** Scan and Settings swap slots. `home-orbit-v2.js` ORDER is now, clockwise from the top: Settings (-90), Water, Move, Scan (45), joystick (90), Sleep, Gap, Fuel. Nothing else moves: same `fit()`, one diameter, one radius, exact 45 degree steps, joystick at the bottom. Scan still opens the real scanner; the Settings bloom (home-settings-sleep-v2 `fan()`) now opens from the top slot, outward and away from Misty.

**Consequences:** Checks: `tests/home-orbit-v2.test.cjs` (order and slots), `tests/home-orbit-v2-live.cjs` (live ring geometry incl. iPad 820x1180, Scan at 45 degrees opens the scanner, Settings straight up and its bloom on screen and clear of Misty), `tests/home-settings-sleep-v2.test.cjs` (fan from the top slot).

## 2026-10-18 Fuel bloom: Shop, Cook and Log meal

**Context:** Emmanuel: "only Shop and Cook, plus a meal log button you can actually see"; Swap is removed for good. The Fuel bloom showed Today's step, Snack, Swap and Cook, and meal logging was only behind a hold.

**Decision:** `home-blooms-v2.js` Fuel blooms exactly three orbs: Shop (the "What can I buy here?" panel, `LowiStorePicks.open`), Cook (the Cook tab, `LowiHost.go('shelf')`) and Log meal (the meal log sheet, `LowiSpirit.meal`). Today's step and Swap left Fuel; Craving SOS itself stays in the app. Holding Fuel still opens the meal log as a shortcut. The right-side Cook panel and the craving title/tiles are separate, later changes.

**Consequences:** Checks: `tests/ui-fuel-navigation.test.cjs`, `tests/ui-fuel-live.cjs`, `tests/home-blooms-v2.test.cjs` and `tests/home-blooms-v2-live.cjs` (their old Today's step/Snack/Swap assertions were replaced by Shop/Cook/Log meal assertions, none deleted or skipped).

## 2026-10-18 Reading time for every text bubble

**Context:** Emmanuel: "the bubbles are too fast, actually all bubbles are too fast. I can barely read what it says." Misty's line (praise.js) vanished after 1.7 s, toasts after 2.2 s, and inside a world a hunt line replaced the cell guide's lesson after about 1.2 s.

**Decision:** One rule in `read-time-core.js` (`window.LowiReadTime`): about 200 words a minute (300 ms a word, or 55 ms a character for long German words, whichever is longer) plus a 2 s lead, at least 4.5 s for speech and 3 s for a short toast, capped at 24 s. A caller's own longer duration is kept (`atLeast`). Used by the cell guides (`region-pals-core.js` showMs/minRead), Misty's line and hints (`praise.js`), the Misty hub nudge, arrival lines, the cell-world speech, micro-book toasts and both `toast()` functions in index.html. A guide line is never replaced automatically before its reading time; only a level-up or clean world (priority 3) may cut in sooner, and not before 3 s. Tapping the guide still gives the next line, tapping its bubble closes it. Animation speed is unchanged.

**Consequences:** Checks: `tests/read-time.test.cjs`, `tests/read-time-live.cjs` (toast, Misty's line and the liver guide timed in Chromium/WebKit). The old caps in `tests/cell-guide.test.cjs` (7 s hunt, 11 s fact) and `tests/praise.test.cjs` (under 2 s) were moved to the new rule, nothing deleted or skipped.
## 2026-10-18 Leaving a world: the fly-in, played backwards

**Context:** Emmanuel (voice note): "When my companion enters the world I love the animation, but when it exits the world I don't like the animation, cuz all of a sudden she just spawns out with the camera being zoomed out. I want to see the same animation but the reverse ... we start almost blended by that world's color because we're so zoomed in ... the worlds have rings, so just like a planet that has a ring when you're so close to it, that perspective." The Oct 17 way out cut straight to Misty's zoomed-out framing (and, when she flew out herself, to the whole universe).

**Decision:** `body-world-regions.js` `seamStep` keeps the Oct 17 cut (real copy of the inside over the outside, no glow screen, no colour wash, no portal, no streaks, no wider lens, no blank frame). Under the copy the camera now sits at the world she left: `PULL.s0` 0.55 from its core (between the core, r 0.32, and its ring, r 0.62), on the side the fly-in came from, so the screen is that world's colour. It then pulls back over `PULL.ms` 1800 ms along `backAt()` (log-even zoom, slow in the ring band, soft landing) to `PULL.near` 5, the outside view of that world; only the rig moves, so the free camera takes over without a jump. The World map way out (`wide`) carries the same pull-back on out to the whole world. On the full-screen view the base's glide back to the overview follows. Misty rises out with it (`misty-flight.js` `outAt('R')`, `riseDepth()`, paced by the pull-back's own progress `wq.pk`): always in front of the core, ending above the world about 2.4 in front of it, out of its pull. Flying out through the cloud wall (`exitGo`) now uses this way out instead of the whole-universe one. Reduce Motion: unchanged, an instant switch.

**Consequences:** Checks: `tests/oct18-world-exit-reverse.test.cjs`, browser `tests/world-exit-reverse-live.cjs` (samples every frame: starts at the world, only backs away, time in the ring band, ends outside, Misty out of the pull). In `tests/oct17-no-inbetween.test.cjs`, `tests/oct17-world-exit.test.cjs` and `tests/one-world-home.test.cjs` the assertions for the Oct 17 camera (straight to the zoomed-out view, 760 ms hold, 720 ms drift, `{ wide: true }` from the wall) were replaced by the Oct 18 ones; every no-in-between check stays.

## 2026-10-18 Cell guides introduce themselves once, then welcome you back

**Context:** Emmanuel: "they shouldn't be repeating themselves the whole time, that's annoying. They introduce themselves once, obviously, the first time seeing them. But the rest of the time it's 'Oh, you're back,' or 'Glad you're back' ... 'Oh, we're back to business.'" The guides said hello again every session, and every return opened with the same fixed "Back in here! Here's one more thing:".

**Decision:** Each guide remembers on the device that you have met (`localStorage` `lowi.guides.v1`, see DATA_CONTRACTS.md). The hello is said only at the very first meeting; tapping round the lines skips it afterwards. Every later visit opens with a line from an 8-line welcome-back pool (EN/DE/ES, `region-pals-core.js` BACK), never the same one twice in a row, followed by something the guide hasn't said yet this session (or just the welcome back when it has said everything). This replaces the old "session memory only" rule for meetings; what each guide has said is still session memory, and nothing else is stored or collected.

**Consequences:** Checks: `tests/guide-intro-once.test.cjs`, `tests/guide-intro-live.cjs` (three visits with reloads in Chromium/WebKit). The "session memory only / nothing stored" assertions in `tests/cell-guide.test.cjs` and `tests/region-pals.test.cjs` now allow exactly this one key, nothing deleted or skipped.

## 2026-10-19 No shadow on any bubble

**Context:** Emmanuel (iPad screenshot, 06:08 Mon 19 Oct, Home in the cosmos with Misty out flying): "all bubbles have this shadow, which makes them look like that doesn't make sense sometimes. So just remove it on all bubbles." He circled a light crescent on the upper-left of a plain glass cell and an oval under Misty's cell. The Oct 18 release only cleared shadows on the ring Home; worlds, blooms, the 3D sprite and the old Home kept them.

**Decision:** No bubble draws a shadow or a one-sided shading crescent, anywhere. `body-world-3d-scene.js` `membraneMat` lost its fixed upper-left glint lobe (`pow(dot(n,(-0.45,0.6,0.65)),22)`, the crescent at 0.75 R); the symmetric fresnel rim, veins, colours and additive blending are the glass look and stay. `world-home.js` `mistySvg()` strips `.lh-reflection`, so the oval is no longer baked into the 3D Misty sprite, flight body and face (page CSS cannot reach inside an `<img>`). `herb-tamagotchi.css` hides `.lh-reflection` on every screen. `world-home.css` Misty sprite: the dark `drop-shadow(0 6px 12px)` became the centred soft glow. `community-standout.css`: no dark drop shadow under the companion in chat bubbles. The app has no shadow maps (no castShadow/receiveShadow/shadowMap), and stays that way. Lit 3D objects (blood cells, organelles, the lung's lit air sacs) keep their normal light and dark sides; they are not shadows cast by a bubble.

**Consequences:** Checks: `tests/oct19-no-bubble-shadow.test.cjs` (6), `tests/no-bubble-shadow-live.cjs` (Home, old Home with the ring off, and inside a world; Chromium 390x844 and iPad, WebKit iPhone 13 and iPad). `tests/bubble-bottom-shadow.test.cjs`: its "world-home.css unchanged" check pinned the old ring-only scope and now asserts the stricter rule (no drop shadow under Misty in any layout).

## 2026-10-19 Joystick: just the white icon, and gone while you steer

**Context:** Emmanuel (call, 07:10 Mon 19 Oct): "I can still see that the joystick is the old design ... And also with it disappearing." His Home spec [HIS CALL] says the joystick is "the same simple white-icon bubble, with no silver inner ring", it "fades while you steer but keeps working" and "comes back afterwards". Live build 20261019-064609 (checked in WebKit as iPhone 13) still drew a 34 px glass knob with a white 1 px rim and an inner glow inside the glass bubble, and steering only faded it to 40 % (its 3D membrane to about 0.73).

**Decision:** On the ring Home (o8, still on inside worlds) the knob has no fill, rim or ring (`home-orbit-v2.css`); only the white icon is drawn, about the size and with the soft shade of the Scan / Sleep / Settings icons, and it still follows the thumb. Forward, back and autopilot tint the icon (centred glow) instead of painting a ring. `misty-pad.js`: after `VANISH_MS` (1.5 s) of steering without a break (a drag or the forward / back hold) the controller gets `.mp-gone`, which sets `--mp-steer-o: 0` (`misty-pad.css`), so both the Home and the in-world steering rules reach opacity 0, and the 3D membrane follows (living-bubbles.js reads the computed opacity). It stays the element under the finger and keeps steering. Everything that ends steering (lift, pointer cancel, lost capture, app hidden, window blur) removes it at once. A tap, the back burst and the keyboard never hide it. The first 1.5 s stay see-through so you still see where your thumb landed.

**Consequences:** Checks: `tests/ui-joystick-vanish.test.cjs` (8), browser `tests/ui-joystick-vanish-live.cjs` (knob look, see-through then gone, Misty moving while it is invisible, lift; Home and inside a world; WebKit iPhone 13 / iPad, Chromium 390x844). `tests/joystick-bubble-style.test.cjs` and `-live.cjs`: the "knob is a glass bubble" check became the stricter "no fill and no rim". `tests/ui-joystick-fade-live.cjs` reads the in-world see-through phase before 1.5 s. The fake page from `tests/ui-joystick-fade.test.cjs` is shared as `tests/fixtures/misty-pad-page.cjs`. Not tested on a real iPhone.

## 2026-10-19 Settings is a glass side panel, not a full page

**Context:** Emmanuel (iPad screenshot, 07:27 Mon 19 Oct, build 20261018-225254): "Why does it appear as an extra page either way? Could have kept the same design like the other stuff. So why do you have a whole page? This could have been just like the design of when the sound menu bar appears. Fix that." He also opened the sound panel from Settings (the World sound row) and it opened on the left BEHIND the full Settings page (z-index 8 in `#whHud` under the 8990 Settings layer), so he could not use it. This replaces the Oct 18 "single tap opens the full page" surface; the one-tap behaviour and the items stay.

**Decision:** One tap on Settings opens one glass panel in the Body sound panel's look (`misty-panels.css` membrane surface, rim, glow, 34 px corners), no dimming layer and no full-screen cover. `home-settings-sleep-v2.js` `placePage()` places it with the same free-space rule as the old More panel (`placePanel`, now with `maxCols`/`minCol`: at most two columns of rows at least 150 px wide): beside the ring on an iPad in landscape, below / above it when there is room, otherwise in the tallest spot next to Misty and never taller than that spot, so it stays off her and the list scrolls inside the panel (title and x never scroll). The x sits at the panel's bottom right. Same rows and groups (Me, Look & sound, Account, Menu bar; More: Community, Care board, Workouts, World map, VR, Gift, Weather, World sound). `rowAction(id)`: the Menu bar switch flips in place and the panel stays; a row that opens another panel (World sound -> Body sound) closes Settings first and opens that panel through `LowiWorldAudio.open()`, so it is always in front and usable (replace, not stack: the app's panels are one at a time); every other row closes Settings and runs its route. World sound shows on/off but is a row with `aria-haspopup="dialog"`, not a switch, because it opens Body sound, where the real switch, volume and strings live. The panel does not jump when the ring relayouts (menu bar on/off); it is placed again only on resize, without replaying its animation.

**Consequences:** Checks: `tests/ui-settings-panel.test.cjs` (5, all failed on the old code), browser `tests/ui-settings-page-live.cjs` (now proves: not full screen, on screen, off Misty, on top, x at the panel's bottom right, World sound opens Body sound in front with Settings gone; Chromium 390x844 and iPad, WebKit iPhone 13 and iPad portrait/landscape). In that script the old "page should fill the screen" and "x at the screen's bottom right" checks were replaced by the panel checks above because they encoded the superseded full-page decision; no test was deleted, skipped or loosened. The double tap / hold on Settings are still not built.
## 2026-10-19 Leaving a world is a rocket launch; weak Misty is pulled back in

**Context:** Emmanuel (call, Mon 19 Oct morning, on build 20261019-064016): "the POV isn't really giving what I was trying to communicate here. And it was still coming out real fast. Let's have it actually like a rocket trying to exit a world, like that perspective from Interstellar." Weak Misty: "below half energy" she can't break free at the rings and gets pulled back in; her line: "think of something", and he is "not a fan of text repeating itself too often".

**Decision:** The way out keeps its order (close in at the core, back through the rings, the outside view with Misty above), but `body-world-regions.js` `escapeAt` paces it as a launch, `PULL.ms` 1800 -> 4800: a slow burn against the pull in surges (never backwards), the camera looking up to space with the world under it, leaning and shaking a little (`launchCam`: turns only, re-applied after the rig's lookAt each frame, no lens change); breaking free just past the rings (the shake stops, the camera kicks out and swings over the top, pitch up to 0.75, to look back down at the world); a quiet glide to the same outside view, level. Misty's rise follows the camera's own progress (`pk = f`). Weak Misty: only when she flies out by your steering (`exitGo` why `hold`), not the X, World map, autopilot or Reduce Motion. `misty-hunt.js` `gateOut` uses the same `tries(energy)` rule as getting in (0 at half energy or more, 1 below half, 2 below 0.3), counted on its own per world and day, so she gets out on the next try or the one after. The launch climbs to the rings, stalls, and is dragged back to the core (`escapeAt(k, true)`, 4.3 s), then `backIn` brings the place back under a copy of the core close-up with the inside camera restored, the trip is cancelled (`cancel` event, no arrival), and `misty-flight.js` puts her back where she pushed out, drifting inwards. Her line comes from `HELD` (8 lines, EN/DE/ES) through `bagNext`, a shuffle bag kept in `localStorage` `lowi-misty-held-bag`: every line once before any comes back, never the same line twice in a row, also across refills. Said by Misty herself (`LowiPraise.say`), not the cell guide.

**Consequences:** Checks: `tests/oct19-exit-interstellar.test.cjs` (10), browser `tests/oct19-exit-launch-live.cjs` (launch, and `--weak 1`). Older checks updated for the new pacing, not loosened: `tests/oct18-world-exit-reverse.test.cjs` (duration range now 4.0 to 6.5 s; the harness includes the new functions), `tests/oct17-no-inbetween.test.cjs` (pull-back under 6.5 s; harness), `tests/one-world-home.test.cjs` (the World map pull-back to the whole world's distance, in the new code shape).

## 2026-10-19 Autopilot tours the spirit world along its strings; no second pull into a bubble; no hanging on a string

**Context:** Emmanuel (Mon 19 Oct, morning): on autopilot out in the spirit world Misty "got sucked into a bubble twice" and then the app restarted from the beginning. He wants her to hook onto the strings and drift along them from bubble to bubble, changing strings, flying on her own only when no string reaches the next visible bubble, and visiting every visible bubble. While building it, the browser probe (`tools/autopilot-probe.cjs`) caught a freeze in about 3 runs in 10: right after a string caught her, Misty and the camera stood still for 50 to 80 s. Always string 11 of the default spirit world, going up it, stuck at point 23 of 40. That string joins bubbles 5 and 30 (both r 23), whose glass is only about 16 apart; out in the galaxy Misty is big (hs about 15). The membrane slides her round at r * 1.04 + hs * 0.4 (glass + 7), but the string's ride was cut at r * 1.06 + 2 (glass + 3.4), ignoring her size, so the point she had to reach to finish sat inside the far bubble's push and it pushed her back every frame until the 60 s ride limit skipped it.

**Decision:** `misty-explore.js` replaces the old toStream / ride with a string tour (plan, hook, ride, visit, fly): from where she is she takes a string straight to a bubble she has not seen, drifting with its flow first, changes strings through bubbles she has seen, flies on her own only when no string reaches one, and stops when all are seen (`core.nextLeg`, `core.firstHook`). A bubble she did go into always ends in home, never a second dip, and `galaxy-bubbles.js` keeps her out of the bubble she just left for `GB.COOL` (6 s) unless you steer her in yourself. Round 2 (the freeze): `galaxy-bubbles.js` `core.slide(r, hs)` is the one membrane radius the collision uses, `core.rest(r, hs)` is just off it, and `core.span(pts, worlds, hs)` cuts every string to the part outside every membrane's push for her size (two bubbles closer together than she is big: the one point with the most room, so she is already there). The ride's arrival, the visit swim and the flight to a bubble use `rest(r, hs)`. `core.pin` tracks progress along a leg: no new string point for `X.PIN` (3 s) on a ride means arrived if she is at the bubble, otherwise she lets go of that leg; a hook that gets no closer for 6 s is given up.

**Consequences:** Checks: `tests/oct19-autopilot-strings.test.cjs` (11; the three round-2 tests failed on the round-1 code), `tests/adventure-tiers.test.cjs` updated for the requested change (after the sky, from Level 6 / autopilot she plans her first string instead of the old toStream; the time-limit check lists the new steps, each still 60 s or less; nothing loosened). Browser: `tools/autopilot-probe.cjs` (Chromium 390x844 and `--engine webkit` iPhone 13) reports loads, crashes, frame stalls with a screenshot, GPU growth, and every hook or ride where she held one point for more than 8 s (`PINNED >8 s`). The probe's 1 to 7 fps comes from the workspace computer's software 3D; heat and smoothness need a real phone.

## 2026-10-19 The guide's speech bubble never covers the joystick

**Context:** Bug hunt (scheduled QA run, Mon 19 Oct). The world-exit task had flagged it: inside a world the guide's speech bubble covered the joystick for about 2 seconds while it talked. Reproduced on build 20261019-080527 in Chromium 390x844: flying into the liver, the sidekick swims right under the joystick with Misty just below it. A 260 px bubble has no clear spot beside it there, and `C.place` weighs Misty (4) above the joystick (2), so it picked the spot on the joystick: up to 6,400 px² of overlap for about 4 s. Before that, while Misty swims in, the joystick is faded to 0, so it was not in the keep-clear list at all and the bubble could sit where it was about to appear.

**Decision:** No guide line may cover the joystick. The "Remember?" dock (top or bottom of the screen, no tail, least-covered of four spots, only if better) moved into `region-pals-core.js` as `dockSpot` and now also runs for every ordinary line whose spot beside the guide would touch `#whPad` (`PAD_IDS`). Once docked, a line stays docked until the spot beside the guide is 16 px clear of the joystick, so it does not flap. The joystick is kept clear even while faded (`obstacles()`), since it comes back where it was. The "Remember?" question keeps its own rule (any hard overlap docks it). Placement is still throttled to 160 ms and obstacles cached for 600 ms: no new frame loop, no new layout reads per frame.

**Consequences:** Checks: `tests/guide-bubble-joystick.test.cjs` (7, six failed on the old code; the measured scene is in it), browser `tests/guide-bubble-joystick-live.cjs` (samples every 250 ms after entering a world; failed on the live build with 4 s of overlap, passes after: liver in Chromium 390x844, WebKit iPhone 13 and iPad landscape, heart in Chromium). `tests/guide-recall-live.cjs` still passes. Ordinary lines can now sit at the top or bottom of the screen without a tail while the guide is near the joystick.

## 2026-10-19 Misty's praise line never covers a ring bubble or the joystick

**Context:** Bug hunt (scheduled QA run 3, BH-003, same class as BH-002). After every logged action Misty says a praise line (`#lpPraise` in `praise.js`, "I'm so proud of you!", at least 4.5 s, longer lines longer). `place()` put it right above her head and only kept clear of the Daily Quest. On the 8-bubble ring that spot is on Settings, Water and Fuel. Measured on the live build 20261019-101824 in Chromium 390x844: 42 to 44% of Settings and 10 to 15% of Water and Fuel hidden for the whole reading time. It never took taps (pointer-events none), so visual only.

**Decision:** `LowiPraise.place(a, size, quest, view, gap, obs)` takes the controls as a sixth argument. Without it, placement is exactly as before. With it: keep the spot beside Misty when it touches no control; else try the other side of her; else dock at the top (56 px) or bottom of the screen, whichever covers less (Daily Quest counted), with `.lp-dock` and no tail. `show()` passes every visible `[data-orbit]` bubble and `#whPad` (faded included), 4 px margin, read once per line (no frame loop).

**Consequences:** Checks: `tests/praise-ring-clear.test.cjs` (4, all failed on the old code). Browser probe (bug-hunt playtest `probe-praise.cjs`): before, FAIL on the live build; after, no overlap on Chromium 390x844, WebKit iPhone 13, iPad portrait and landscape (docks), and inside the liver world it is still a speech bubble beside Misty with its tail. Still queued: the Move bloom note (`home-blooms-v2.js` `moveNote`) sits over the Move bubble while that bloom is open.

## 2026-10-19 Misty's Home nudge never covers a ring bubble or the joystick

**Context:** Bug hunt (scheduled QA run 2, sibling of the guide bubble above). Misty's Home nudge (`#mhNudge` in `misty-hub.js`, e.g. "My sun is full! Peek in Today.", up to four times a day) is placed right above her head with no keep-clear check. On the 8-bubble ring that spot is on Settings, Water and Fuel. Measured on build 20261019-095111 in Chromium 390x844: the nudge (a button, z-index 6) took 9 to 10 of 25 tap points on each of the three for as long as it showed, and a tap on the upper third of Water opened Today instead of Water.

**Decision:** `LowiMistyHub.nudgeSpot(misty, size, obstacles, view)` (pure): keep the head spot when it touches no control; otherwise dock at the top (56 px) or bottom of the screen, horizontally kept on screen, whichever covers less, and only if it covers less than the head spot. The keep-clear rects are every visible `[data-orbit]` bubble and `#whPad` (faded included), 4 px margin. A docked nudge gets `.mh-dock` and loses its tail. `place()` already reruns on every 1.5 s tick and on resize, so it follows the ring as it settles; no frame loop and no new per-frame layout reads.

**Consequences:** Checks: `tests/misty-nudge-controls.test.cjs` (4, all failed on the old code; the measured ring is in it). Browser probe (bug-hunt playtest `probe-nudge.cjs`, nudge forced with a full sun): before, 9 to 10 of 25 points stolen on Settings, Water and Fuel and the tap on Water opened Today; after, no overlap on Chromium 390x844, WebKit iPhone 13 (docks at the bottom), iPad portrait and landscape, and the same tap opens the Water bloom. Still open: the praise toast (`praise.js` `place`) also sits above Misty and only keeps clear of the Daily Quest; it never takes taps (pointer-events none) but covers the same bubbles for its reading time.

## 2026-10-19 Ant-Man POV while Misty rides the strings

**Context:** Emmanuel (Mon 19 Oct, call): on autopilot out in the spirit world, as Misty rides a string the camera should shift into a tiny-scale POV beside her: "Almost like Ant-Man, getting smaller to the cellular perspective, and all the world around it is bigger." "It's not just a zoom. It's a shift in POV." Leaving the string returns smoothly to the normal galaxy view, with no loading, no heat, and Reduce Motion respected. Held until the string tour (20261019-091732) was live.

**Decision:** New `string-pov.js`. While she rides a string on autopilot (`LowiGalaxyBubbles.state().riding >= 0`, not inside a bubble, Reduce Motion off) the real camera shrinks from the galaxy distance to `SP.D` (0.25) x her galaxy home distance on a critically damped spring (about 2 s, log scale, no overshoot), drops in behind her looking the way she travels (upstream too), and draws the string she rides as one glass tube (built once per string, old one faded and disposed, no lights or shadows). It holds across short drops (0.8 s grace) and while she settles near the string (up to 3 s), so it never zooms in and out. `misty-galaxy.js` keeps the galaxy's own distance in `G.nd`: her pace (`speed()`) and the currents/membranes (`step()`, her size scaled back up by `G.nd / r.dist`) use the galaxy scale, so the camera coming in never slows her or weakens the current's grip. On the rebase onto the string tour, its planner (`misty-explore.js`) had started cutting strings for her size `S.hs`, which shrinks about 20x with the POV camera; it now plans with her galaxy-scale size (`core.hsOf(S)` reads `S.hsG`, kept by `misty-galaxy.js` each galaxy frame and cleared on reset), so the end of every string stays reachable with the camera in close.

**Consequences:** Checks: `tests/oct19-string-pov.test.cjs` (11; the size test failed before its fix), `tests/oct19-autopilot-strings.test.cjs` wiring regexes now match `hsOf(S)` instead of `S.hs` (same strictness). Browser: `tests/string-pov-live.cjs` with `tests/string-pov-stage.html` (Chromium 390x844 and 820x1180, `ENGINE=webkit` iPhone 13 and iPad) checks the shift is to tiny scale, the camera is behind her, the world looms bigger, she stays on screen, the move is continuous, it grows back out, the tube is freed, no errors, and no POV under Reduce Motion. Simulated only; heat and smoothness need his phone.

## 2026-10-19 A language switch repaints Home without a reload (bug hunt BH-004)

**Context:** Bug-hunt playtest: switching language mid-session (Settings > Language, no reload) left Home half in the old language. On live 20261019-110810, after EN to DE or ES, Move, Scan, Settings, Sleep and the fasting bubble ("of 16 h Ends") stayed English, and so did the VoiceOver labels of Water, Move, the joystick, Scan, Settings and Misty: 20 differences against a reload in the same language. A reload fixed it.

**Decision:** Root cause: about 20 modules already repaint on a `lowi:lang` event, but `setLang()` (index.html) never fired it, and a tap on a `[data-lang]` picker called the inner `setLang()` directly, skipping every `LowiLang.set` wrapper. Now `setLang()` dispatches `lowi:lang` on `document` (bubbles to `window`, `detail.lang`), and the picker tap goes through `LowiLang.set`. Modules with no repaint got one: `home-orbit-v2.js` keeps Scan, Sleep and Settings words in all three languages and relabels only its own words (an adapter's label stays), on the event and whenever the language differs from the last one it wrote; `misty-pad.js` repaints the joystick label (and the autopilot chip); `spirit.js` refreshes Home (fasting bubble) and keeps Misty's VoiceOver name head in the current language; `cell-world.js` repaints her state on the event. No product or design change.

**Consequences:** Checks: `tests/lang-switch-repaint.test.cjs` (4, all failed on the old code; the first runs the real language script from index.html). Browser: `tests/lang-switch-live.cjs` compares every ring bubble's text and aria-label after a mid-session switch with a reload: live before FAIL (20); after PASS on Chromium 390x844 (API and picker tap) and WebKit iPhone 13. Switching inside the liver world now also repaints the guide's line; no JS errors, nothing stuck open. Watch: region-pals repaints the guide by hide/show, which shows its next line.

## 2026-10-19 The Move bloom's note never covers the Move bubble or its own options (bug hunt BH-005)

**Context:** Bug-hunt playtest: with the Move bloom open, its note ("Estimate, not steps · 0/4 today") sat on the Move bubble itself. On live 20261019-121209, Chromium 390x844, it covered 67% of the Move bubble and clipped the Medium and Long options; on iPad it clipped Medium and Long too (28% portrait, 5% landscape). On a phone Move sits at the right edge, so the note's spot "beyond the orbs, away from Misty" is off screen, and clamping it back onto the screen put it on the bubble. It was also squeezed into a 110 px, three-line column (an absolute box near the right edge shrinks to the space left of it).

**Decision:** `noteSpot()` in home-blooms-v2.js (pure, tested) and `placeNote()` measure the note once it is in the page and keep it off every ring bubble, Misty, the joystick (even faded), the Daily Quest and the bloom's resting orbs: the old spot when clear, else just above, below or beside the orbs, else docked at the top or bottom of the screen, always fully on screen. Runs on open and on every refresh. `.hb2-note` gets `width: max-content` (still max 220 px). Same "floating line on the ring" class as BH-001 to BH-003. No design change: same note, same words.

**Consequences:** Checks: `tests/move-note-clear.test.cjs` (7; 6 failed on the old code, the 7th guards the measured data). Browser: bug-hunt probe probe-movenote.cjs, live before FAIL on Chromium 390, iPad portrait and landscape; after PASS Chromium 390 and WebKit iPhone 13 (docks top), iPad portrait (docks top) and landscape (beside the options), refresh while open and after logging a move. tests/home-blooms-v2-live.cjs still passes. Simulators only, not a real iPhone.

## 2026-10-19 Cell guides keep your lesson when the language changes, never re-tell old lessons, and call her Misty (worlds playtest W-001..W-003)

**Context:** Worlds playtest (Playwright, Chromium 390x844 and WebKit iPhone 13), returning visitor in the liver. (1) Switching the language mid-lesson tore the guide down and built it again (`lowi:lang` -> `hide(); show(id)`), which ran the arrival again: a second welcome back plus the NEXT lesson. Live 20261019-130951: lesson 3 on screen, switch to German -> "Da bist du ja wieder!" + lesson 4, and lesson 4 stored as told although the user never saw lesson 3 finish. (2) `teach()` picked its next line with `nextFact` (this session only), so a returning visitor got a lesson from an earlier visit re-told shortly after the "Remember?" question about it (seen: asked about lesson 1, 70 s later lesson 1 again). (3) The guide's hunt lines named her with the old herb identity name from the star sign ("Steer Moss Leaf toward the glowing dots") instead of Misty.

**Decision:** (1) Every guide line carries `src` (where it came from); `LowiRegionPalsCore.relang(src, id, li, lines)` (pure, tested) rebuilds that exact line in another language. On `lowi:lang` the shell keeps the guide, rebuilds its lines and labels (name, tap hint, Yes/No, aria) and re-says the same line in the new language with its full reading time; the waiting line, a pending question and a question left open follow. Re-saying does not count as a new line. (2) `teach()` uses `nextNew` (never told on the device, not said this session); old lessons only come back as the "Remember?" question. (3) `mistyName()` uses `LowiBirthCompanion.get().name` (Misty unless the user brought their own companion to life), never `LowiHerbTamagotchi.name`.

**Consequences:** `tests/worlds-guide-flow.test.cjs` (5, all failed on the old code). Browser: `tests/worlds-lang-lesson-live.cjs` FAIL on live 20261019-130951 (skipped to lesson 4, welcome back twice, lesson 4 marked told); PASS after the fix in Chromium 390 and WebKit iPhone 13, via `LowiLang.set` and a language-picker tap. Siblings left for others: the Home Misty card and a few Home/autopilot lines still use the herb identity name (world-home.js, misty-scale.js, adventure.js; logged in BUGHUNT/LEDGER.md). Simulators only, not a real iPhone.
## 2026-10-19 Old-design purge, round 1: Misty icon, blue launch cell, no old sign-up screen, real Misty in Community

**Context:** Emmanuel (Mon 19 Oct): "Any old UI should be deleted, any old design. I'm seeing that some still have old logos or old companion design, it doesn't make sense." Census (`playtest/probe-old-design.cjs`, every reachable screen, lists every visible img/svg/canvas/background picture) plus a code inventory on build 20261019-130951 found: (1) the app icons (`icon-180/192/512.png`, the inline favicon and apple-touch-icon) were still the round-1 pulse-line-in-a-circle logo; (2) the launch screen (`#lwBoot`) showed a gold orb and a gold "i" in LOWiSPIKE; the `.r2-logo` wordmark also kept a gold italic i; (3) the old photo sign-up screen `#onboard` ("Eat what you love. Rebuilt low-spike.", an 88 KB embedded JPEG photo, gold wordmark) was still reachable through `window.openOnboarding()` and the `setupprofile` action; (4) in Community your own orb (`.cg-body.me`) and your own chat avatar were the old mini-blob (`LowiCompanionCore.miniSVG`, with a smile), not Misty's cell; the companion-forms entry used the same mini; (5) the daily ritual fell back to an old potted herb (green leaves, purple pot) when Home's Misty was not on screen; (6) `body-companion.js/.css`, an older body-companion UI, was never loaded by index.html but still shipped and was cached offline.

**Decision:** Icons are drawn from the current Misty (`LowiHerbTamagotchi.plantHTML`, the same cell as Home) in her glass bubble on the deep-blue space background, full bleed and opaque (`tools/brand/make-icons.cjs`, then resized to 180/192/512 and the inline 180/64 data URIs). Launch screen: a Misty-blue glass cell with her two eyes and a blue "i" (light theme: darker blue). `#onboard` markup, CSS, `OB`, `obGo/obCheck/startOnboarding/finishOnboarding` and their click branches are deleted; `openOnboarding()` and `setupprofile` open Profile (R3 already intercepted `setupprofile` into the profile editor). Community `mate()` renders your own id with `plantHTML(...,'node')` (cached 4 s; falls back to a copy of Home's Misty, then the mini); friends keep their mini forms. Daily ritual: Home's Misty, else `plantHTML`, else a plain glass cell; never a plant. `body-companion.js/.css` deleted and dropped from `sw.js`.

**Consequences:** Checks: `tests/oct19-old-design-purge.test.cjs` (6, all failed on the old code). `tests/herb-body.test.cjs` no longer syntax-checks `body-companion.js` (the only thing it did with it); it now asserts the files are gone and uncached instead (legacy-only coverage replaced, same file count). Not changed on purpose: the pre-birth mystery bubble with a seedling on the first-run gate (new-user walkthrough task owns it; noted in COORD), friends' mini forms, the small-screen fallback to the ring-off Home (DECISIONS "8-bubble ring" keeps it for screens too small for the circle), the Community energy joystick (already blue glass). An iPhone home-screen icon only changes after removing and re-adding the app to the home screen; iOS caches it.

## 2026-10-19 Old-design purge, round 2: real Misty on the friends tree, herb room and dock use her current cell

**Context:** Round 1 census follow-up. The friends tree drew your own spot with the Oct 15 cell drawing (`cellSVG('me',...)` in `cell-room.js`), and `companion.js` then painted the old trait mini-blob over it when traits were on. The old herb room hero, the dock and the level-up fallback in `herb-tamagotchi.js` called the bare `plant()` drawing (the potted herb) instead of the current Misty renderer.

**Decision:** `mineSVG()` uses `LowiHerbTamagotchi.plantHTML` (the same Misty cell as Home), tagged `cr-own`; the Oct 15 cell is only a last resort if the renderer is missing. `companion.js` skips the mini-blob swap when the spot already shows `svg.cr-own`. `curArt()` in `herb-tamagotchi.js` routes room/dock/level-up art through the wrapped `plantHTML` (cell-world), falling back to `plant()` only before it loads.

**Consequences:** Checks: `tests/oct19-old-design-purge-2.test.cjs` (4; 3 failed on 20261019-134704, the 4th guards the census probe). No test removed or loosened. Suite 1529/1529.

## 2026-10-19 Cell guides gossip about each other (worlds playtest W-004)

**Context:** Emmanuel, Oct 19: "I want them to gossip about each other sometimes, that would be funny ... as they're trying to teach things, they're also being funny." Planned as the last companion step after the "Remember?" buttons, never built (no gossip anywhere in the code).

**Decision:** `GOSSIP` in region-pals-core.js: two lines per guide in EN/DE/ES, each one a real bit of body science told as a jab at another guide by name (Hexa on Isla: glucagon makes the liver open its sugar store; Puff on Pulse: she fills his blood with oxygen). `gossipPick(m, id, rnd)` shuffles: random among the lines not said yet on this device (`m.gos`), and a new round never starts with the line said last, so the same line never comes twice in a row. The shell's `teach()` says it at most one per visit, only once a lesson has been told this visit and never right after a question, half the time while lessons are left (always when none are left), with the same reading time as a lesson; it carries `src` so a language switch re-says it in the new language.

**Consequences:** `tests/worlds-guide-flow.test.cjs` +3 (all failed before: no gossip). Memory shape gains `gos` (old memories load unchanged). Browser: tests/worlds-gossip-live.cjs. Same release, W-003 sibling: adventure.js autopilot finds ("Moss Leaf found ...") now use the companion name too (Misty).

## 2026-10-19 Old-design purge, round 3: friends are the current glass cell, not the old mini-blob

**Context:** Round 1/2 left friends on the old art: a friend who shares a look got `LowiCompanionCore.miniSVG` (the Oct 13 mini-blob with a smile) on the friends tree and in Community chat; a friend who shares none, the picked-friend card, the More friends list and the invite card used the Oct 15 `cellSVG` drawing, and "Inside your cell" drew you with it too. Live 20261019-135912: `playtest/probe-friend-forms.cjs` FAIL (both sharing friends `cf-mini`, no cell wall).

**Decision:** `companion.js friendSVG(g,id)` draws the cell-world base cell (`plantHTML.original`, so never your own fused form), at the friend's stage, happy, with your wardrobe stripped (`equipment:{}`), then `LowiCompanionCore.apply` puts the friend's shared form on it. `g=null` gives the plain current cell. Every id is suffixed per friend (`uniq`) so two friends on one screen never share gradients; the svg is `aria-hidden` and loses Misty's label. `cell-room.js friendCell()` uses it for tree spots, picked card, More friends and the invite card, tinted to the friend's hue (`--cr-hue`, `svg.cr-fc.cr-cur` hue-rotate); the room draws you with `mineSVG()`. `community-chat.js mate()` prefers `LowiCompanion.friendSVG`. The mini-blob and the Oct 15 cell stay only as fallbacks before cell-world/companion.js load, so nothing can draw empty.

**Consequences:** `tests/oct19-old-design-purge-3.test.cjs` (6; 5 failed on 20261019-135912, the 6th guards the probe). No test removed or loosened. Suite 1539/1539. Probe after the fix (local, Chromium 390): 3 friends (2 sharing, 1 not) all cells with a wall, no shared ids, no page errors.
## 2026-10-19 New-user walkthrough 1: first-run fixes (onboarding fit, Gap goal, Fuel/Gap names, look-around hint)

**Context:** Emmanuel asked for a walkthrough as a brand-new user, tapping everything, fixing small bugs as found. Fresh profile, WebKit iPhone 13 (390x664 with Safari bars), Chrome 390x844, iPad.

**Decision:** (1) herb-start.css: on screens up to 700px tall the onboarding scene takes the free height and Misty shrinks (the Oct redesign's 184px rule had overridden the 132px short-screen rule), so the speech bubble on the name and reward steps no longer spills over the back button and step dots (it was 6px off screen). (2) starter-core.js `fastTarget()`: the Gap target follows the starter plan's "Do you fast?" answer (never 12 h, 12 h 14 h, 16 h 16 h, longer 18 h; skipped keeps the default); herb-start.js writes it on 'done'. Before, a user who said "never" was told "12 hours overnight" while the Gap bubble counted toward 16 h. (3) Onboarding copy uses the ring's names, Fuel and Gap (EN/DE/ES), and sym-home.js gives the Fuel bubble the VoiceOver label Fuel/Essen/Comida instead of Meals. (4) world-home.js: Misty's first-timer hint "Drag to look around" checked its head spot against the old HUD only, so on the ring Home it sat on Settings/Water/Fuel or was hidden every time; it now also keeps clear of `[data-orbit]`, `#whPad` and an open nudge, and docks to the top or bottom of the screen with no tail (class `wh-dock`) when the head spot is taken, like Misty's notes (BH-002).

**Consequences:** `tests/newuser-walkthrough.test.cjs` (6, all failed on 20261019-130951). Browser: `tests/newuser-hint-live.cjs` FAILS on live 20261019-140135 (hint never shows), PASSES on the branch in WebKit iPhone 13 and Chrome 390x844 (docked at the top, on screen, on nothing). No test removed or loosened. Open, not in this release: a new user sees a guessed fast already running; the day card stacks over the starter plan right after setup.


## 2026-10-19 Old-design purge, round 4: a phone on its side keeps the 8-bubble ring, never the old Home

**Context:** `home-orbit-v2.js fit()` turns the ring off when the bubbles would fall below 56px, and Home then showed the old layout: greeting, weather, VR, world map, a "Today" pill naming the herb, Meals, the Daily Quest card and the old tab bar. On live 20261019-141244 that happened on short landscape screens (568x320 and 480x320; Chromium and WebKit), because `world-home.css` keeps Misty's Home bubble at a 190px minimum (`--wh-bs`), which a 320px-tall screen cannot ring.

**Decision:** (1) `home-orbit-v2.css`: on `max-height: 420px` landscape, `--wh-bs: clamp(116px, 42vh, 190px)` and `--wh-cy: 50%`, so Misty shrinks with the height and sits in the middle; the normal ring then fits (80px bubbles at 568x320). (2) `fit()`: before giving up it tries once more with a 6px gap and bubbles down to 44px (`tight: true`), still never overlapping Misty or leaving the screen. Only a screen that cannot hold even that keeps `ok:false` (the existing "says so instead of overlapping" test stands unchanged). Portrait and roomy screens are untouched.

**Consequences:** `tests/oct19-old-design-purge-4.test.cjs` (5; 3 failed on 20261019-141244). `playtest/probe-ring-short.cjs`: on live 20261019-141244 568x320 and 480x320 FAILED (ring off, old Home visible); after the fix (local) 568x320, 480x320, 640x360, 390x844 Chromium and 568x320 WebKit all pass: ring on, 8 controls on screen, no overlaps, no old chrome. Suite 1544/1544. The old ring-off Home itself is still in the code as the last resort for impossible sizes; deleting it touches world-home.* (claimed by other tasks), left for later.


## 2026-10-19 Crash squad: the world-exit copy of the 3D canvas is small and freed at once (iOS canvas memory crash)

**Context:** Emmanuel, Oct 19: after Misty was pulled into a world twice the app crashed and restarted. `body-world-regions.js snapNow()` made a new 2D canvas the full size of the 3D drawing buffer on every way out of a world (twice on a weak pull-back), up to about 22 MB each on an iPad, and `snapDrop()` only removed it from the page, leaving the bitmap for the garbage collector. On iPhone a 2D canvas is a GPU surface and Safari caps the memory all canvases may hold, so flying in and out repeatedly piled them up until iOS killed the tab (blank page, reload, no JS error).

**Decision:** The copy is at most `MAX_PX` = 500,000 pixels (scaled with `drawImage`; it is on screen only for the 0.38 s fade, so it looks the same). Every path that drops it (after the fade, at once, when the next copy replaces it, and when drawing fails) removes it and sets `width = height = 0`, which makes Safari free its memory at once. Soak harness added: `tools/soak/crash-soak.cjs` + `crash-probe.js` (fly, fly out, weak pull-backs, autopilot with string riding; tracks canvas/GPU bytes, geometry orphans, hung page), `tools/soak/freeze-profile.cjs`.

**Consequences:** `tests/crash-snap-memory.test.cjs` (4, all failed on the old body-world-regions.js). `tests/oct17-no-inbetween.test.cjs`: only its snapNow regex updated to the new `drawImage` call, kept as strict. No test removed or loosened. Suite 1543/1543.

## 2026-10-19 Misty comes into the lung world (worlds playtest W-005)

**Context:** Worlds playtest on the live build 20261019-140135 (iPhone 13 in Safari's engine, confirmed in Chromium at 390x844): opened from the World map, the lung world never got Misty. Her flight state stayed `idle` with no `join lung` in her log, and the guide Puff talked to an empty world for four minutes, while brain, liver, heart, pancreas and gut got her in normally. `misty-flight.js` join() only let her into a place with a 3D beacon on the hub (`a.regions`, built from the body-world-3d.js places), and the lung world was added later in body-world-regions.js without one.

**Decision:** New pure `placeOk(id, regs, known)` in the misty-flight core: a place she can join is one with a hub beacon (muscles = muscle) or any world LowiWorldRegions knows (`byId`); Home and unknown ids never. The misty-roam join gate uses it instead of the beacon-only check. Nothing else changed: `enterInside`, the recall and every exit path already fall back to the view's target / her inside centre when a world has no beacon.

**Consequences:** `tests/worlds-lung-join.test.cjs` (3 tests, all failed on the old code; one walks every World map world against the real beacon list). Browser: /home/sprite/WORLDS/lungprobe.cjs and play.cjs show `join lung` and `inside` in the lung world. The lung still has no beacon on the hub, so autopilot tours and flying in by steering still skip it; giving it a beacon is a separate, bigger change (body-world-3d.js).
## 2026-10-19 Bug hunt BH-006/BH-007: your own companion keeps her name and stops being wiped

**Context:** Two leftovers of the old herb identity fighting the newer "bring your companion to life" record. (1) Home named Misty with the herb auto name made from the star sign ("Moss Leaf"): the Misty hub title, the energy card ("Moss Leaf's energy"), the Misty card and the name under her bubble (`world-home.js`, `misty-hub.js`, `misty-scale.js`, `spirit.js` all read `LowiHerbTamagotchi.name()`). Same class as the guide fix W-003. (2) `companion.js` kept its Community prefs `{share, traits, born}` in `lowispike.companion.v1`, the key `companion-birth.js` uses for your own companion `{v, bday, btime, n, name}`. `seed()` saw no `born` and wrote its prefs over the record within seconds of it being saved (and `community-chat.js` did the same from the share toggle), so the own companion fell back to Misty and the name you picked was gone, and the wiped key went to the cloud backup. Reproduced on live 20261019-135912.

**Decision:** Each of the four Home files has the same one-line `companionName()`: your own companion's name (`LowiBirthCompanion`, only when one was brought to life), else a name you typed (herb prefs `name`, or the old save's `herb.name`, ignored when it equals the auto name), else "Misty". Never the auto name. Community prefs move to `lowispike.companionprefs.v1`; the old key is read once only to carry over old prefs (and never when it holds a birth record, i.e. has `bday`); nothing but `companion-birth.js` writes `lowispike.companion.v1`. `region-pals.js` (worlds task) still uses birth name, else Misty, and does not read typed names: left to its owner.

**Consequences:** Checks: `tests/companion-name-home.test.cjs` (20, all failed on the old code), `tests/companion-key-collision.test.cjs` (4, all failed on the old code). Browser probes `BUGHUNT/playtest/probe-name.cjs` and `probe-companion-key.cjs` (own companion survives two reloads) failed on live and pass on the fix. Records already wiped on devices cannot be recovered: those users see Misty and can bring their companion to life again. No test removed or loosened.
