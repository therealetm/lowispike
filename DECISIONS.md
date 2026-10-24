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

**Context:** Two leftovers of the old herb identity fighting the newer "bring your companion to life" record. (1) Home named Misty with the herb auto name made from the star sign ("Moss Leaf"): the Misty hub title, the energy card ("Moss Leaf's energy"), the Misty card and the name under her bubble (`world-home.js`, `misty-hub.js`, `misty-scale.js`, `spirit.js` all read `LowiHerbTamagotchi.name()`), and `cell-room.js` used it for your spot on the friends tree and the name it sends friends (fallback "Lumi"). Same class as the guide fix W-003. (2) `companion.js` kept its Community prefs `{share, traits, born}` in `lowispike.companion.v1`, the key `companion-birth.js` uses for your own companion `{v, bday, btime, n, name}`. `seed()` saw no `born` and wrote its prefs over the record within seconds of it being saved (and `community-chat.js` did the same from the share toggle), so the own companion fell back to Misty and the name you picked was gone, and the wiped key went to the cloud backup. Reproduced on live 20261019-135912.

**Decision:** Each of those five files has the same one-line `companionName()`: your own companion's name (`LowiBirthCompanion`, only when one was brought to life), else a name you typed (herb prefs `name`, or the old save's `herb.name`, ignored when it equals the auto name), else "Misty". Never the auto name. Community prefs move to `lowispike.companionprefs.v1`; the old key is read once only to carry over old prefs (and never when it holds a birth record, i.e. has `bday`); nothing but `companion-birth.js` writes `lowispike.companion.v1`. `region-pals.js` (worlds task) still uses birth name, else Misty, and does not read typed names: left to its owner.

**Consequences:** Checks: `tests/companion-name-home.test.cjs` (25, all failed on the old code), `tests/companion-key-collision.test.cjs` (4, all failed on the old code). Browser probes `BUGHUNT/playtest/probe-name.cjs` and `probe-companion-key.cjs` (own companion survives two reloads) failed on live and pass on the fix. Records already wiped on devices cannot be recovered: those users see Misty and can bring their companion to life again. No test removed or loosened.

## 2026-10-19 New-user walkthrough 2: an update that goes live during setup waits until setup is closed

**Context:** Walkthrough as a brand-new user on the live site (WebKit iPhone 13 lite). While I was in the starter plan, build 20261019-142709 went live and the g1 update bubble ("I've got something new for you!", Later / Update, z-index max) opened over the plan's question and caught the taps; Update would reload mid-setup. Same for the birthday step.

**Decision:** index.html g1 `decorate()`: while `setupBusy()` (gate up/booting, `#r2ob` visible, or the starter plan `.hs-ivov.on`) the update bubble is held (`updHeld`), nothing is shown and no news is marked seen; a 1.5 s check started in `init()` re-runs `decorate()` once setup is closed, so the bubble appears then as before. Nothing else in the update flow changes.

**Consequences:** `tests/newuser-walkthrough.test.cjs` +1 (failed on the old index.html). Browser: `tests/newuser-update-hold-live.cjs` FAILS on live 20261019-142709 (bubble over the plan), PASSES on the branch in WebKit iPhone 13 and Chrome 390x844 (held during the plan, shown after "Not now"). No test removed or loosened.

## 2026-10-19 Snap food: the photo is analysed by Gemini (free tier) through a Supabase Edge Function

**Context:** Emmanuel: in Scan, "Snap a photo" takes the photo but no AI analyses it; he asked for the cheapest or a free AI. Code check: Scanner > Snap food (spirit.js `photo()` > `shutter()` > `photoSheet()`) only asked "What is it?"; the old Scan tab `onPhoto` is a fake 1.8 s scan line. The app is static on GitHub Pages; the only backend is Supabase (edge functions auth-handoff, n1-push). Agents have no Supabase deploy access. Compared Gemini API free tier, Groq, OpenRouter :free, Cloudflare Workers AI, Hugging Face, LogMeal, Passio, Calorie Mama (sources in HANDOFF-snap-food-ai.md).

**Decision:** Google Gemini API (Flash-Lite, free tier; about $0.002 a photo on the paid tier) called only from a new Supabase Edge Function `supabase/functions/food-photo/index.ts`. Key = Supabase secret `GEMINI_API_KEY`, never in client code. The function: GET -> `{ok, configured}`; POST `{image, mime, lang}` -> JSON-schema answer `{is_food, dishes[name, portion, grams, kcal, protein_g, carbs_g, sugar_g, fiber_g, fat_g], confidence, note}`; needs a LOWiSPIKE Supabase session (guests included, checked via /auth/v1/user), app origin only, 1.5 MB cap, soft limit 12 photos / 10 min and 60 / day per user, model chain `gemini-3.5-flash-lite` > `gemini-3.1-flash-lite` > `gemini-2.5-flash-lite` (override with secret `GEMINI_MODEL`), never logs images or keys. Client `food-photo-ai.js` (`window.LowiFoodAI`, config slot `window.LOWI_FOOD_AI_URL`): `available()` probes once, `analyse()` posts the 640 px photo with the user's access token, `normalize()` clamps the answer, `mount()` fills the photo sheet: dish list with portion and kcal / protein / carbs / sugar / fiber, a total, × to drop a wrong dish, the name prefilled, hidden macro inputs so the normal Log as meal (`finishMeal`) saves the macros. While the function is not deployed (404) or has no key, the sheet shows one note ("Photo recognition isn't switched on yet, so type what it is.") and the old typed flow works unchanged. No What's New entry until it is switched on.

**Consequences:** Owner step needed: create a Gemini key in Google AI Studio, add it as Supabase secret GEMINI_API_KEY, deploy the function `food-photo` from the dashboard. Free tier prompts and photos may be used by Google to improve its products (paid tier: not). `tests/food-photo-ai.test.cjs` (7, all failed on the old code). Browser probe `BUGHUNT/playtest/probe-foodai.cjs` (mocked function: on = 3 dishes, remove one, logged macros 464 kcal / 51 g protein; off = note + typed meal logs) passes in WebKit iPhone 13. Did not touch the Log meal panel or typed meal-name lookup (MEAL worker).

## 2026-10-19 Meal names understood: built-in USDA meal database, typed meals are never "not provided", Log meal panel trimmed

**Status:** Accepted

**Context:** Emmanuel: typing "chicken stew" or "chicken soup" in Log meal or the Scanner only understood "chicken"; a typed meal logged "protein not provided, fiber not provided, sugar not provided"; the Log meal panel repeated Snap food, Scan product and "What can I buy here?", which already live in Scan and Shop.

**Decision:** New `meal-db-core.js` (`window.LowiMealDB`: load/ready/parse/fill) with `data/meals/fndds.json` (about 5,250 foods and dishes, per-serving nutrition and ingredients, built by `tools/meal-data/build.cjs` from USDA FoodData Central FNDDS 2021-23, public domain). `parse()` matches the whole meal name first, then known dishes, then splits "x with y"/"x and y" into parts and sums them, else a rough typical meal; vague words (dish, meal, leftovers, grandma, Gericht, comida...) are stop words so they never match a random food. spirit.js `finishMeal()` fills only the values the user left blank (`MDB.fill`), the log keeps `est` {n, g, how, ing, f} through `LowiVitalsBridge.logMeal/editMeal`; `macroHTML()` estimates blanks of older logs and never renders "not provided". The JSON loads lazily on first meal form (fetch with `?v=build`), not in the sw.js STATIC list. Log meal panel: Manual (name field first, "Add your own numbers" folded), Eaten recently, Misty suggestions; store-picks SPOT `.sp-quick-cap` removed. Snap food photo AI (food-photo-ai.js, `photoSheet()`) untouched.

**Consequences:** `tests/meal-names.test.cjs` (10), `tests/misty-panels` and `tests/store-picks` asserts updated for the trimmed panel. Values are estimates for one typical serving and are labelled as such; the user's own numbers always win.
## 2026-10-19 New accounts: no invented fast; the Gap clock starts at the first real meal

**Context:** Emmanuel, on a brand new account right after setup: "I've been fasting for nineteen hours. It doesn't make sense." He had logged no meal and given no last-meal time. Root cause: index.html old Today fasting-card module (`LOWI_FAST`, `st()`) wrote `lowi_fast_v1.last` = 8 PM yesterday (8 PM today after 20:00) whenever it was missing, and its 30 s refresh runs on every page, so every new device (and every sign-in on a new device: `lowi_fast_v1` is device-only, not in the cloud backup) got a fast it never did. At 3 PM CEST that is exactly 19 h. Every reader (Gap bubble, Gap bloom, "Ate earlier" sheet, starter plan fasting goal, fasting milestones/points) then trusted it; tapping "I just ate" even paid points for the fake 19 h.

**Decision:** No meal known = no gap. `LOWI_FAST.st()` no longer writes a default; `hours()` is 0 and its card stays hidden without a known last meal. `LowiFastStop`: the "Ate earlier" sheet with no known meal asks "When did you last eat?" (no duration, no goal, no points) and the first answer starts the clock ("Gap clock started at ..."); the first meal saved anywhere else (Log meal / planned meal ticked, window `lowi:meal-logged`) also starts it, but only when no clock is known (a running clock is never restarted by Log meal). Gap bubble empty state shows "—" (was "Start a fast", which also did not fit the 70 px ring bubble). One-time clean-up per device (`noGuess` flag): a stored `last` that is exactly the old guess (local 20:00:00.000) with no logged fast, no start edit and no points paid is moved to `guess` (kept, never read); everything else, and any later real 20:00 entry, stays.

**Consequences:** `tests/no-fake-fast.test.cjs` (14; 10 failed on the old index.html/spirit.js). Browser: `tests/no-fake-fast-live.cjs` (fresh account, Log meal, reload, old-guess device, Gap sheet "I just ate"); FAILS on 20261019-150120 (Gap "Fasting 17 h 14 min ... Goal reached" in the UTC test browser), PASSES on the branch in WebKit iPhone 13 (EN/DE/ES), WebKit iPad portrait/landscape and Chrome 390x844. Limits: a fake fast someone already ended (points paid, entry in `hist`) is left as history; the rare person who typed exactly 20:00 as a last meal with nothing else logged, before this build, loses that start once (kept in `guess`).


## 2026-10-19 New accounts start at 100% energy; energy is felt in the world (peak look, world pace, flight speed)

**Context:** Emmanuel on a brand-new account: "I just started this game and my companion already looks tired and I'm at fifty percent ... at least when they begin, let them see themselves at a hundred percent ... really fast, really strong, the world should be moving ... even more beautiful than normal ... when their power goes down, they notice." Code check: `sun-meter.js` `energy()` is today-only from what was tracked, so an account with nothing tracked sits on the resting base 0.15: tier `tired`, sleepy face (`#spHome[data-misty=tired]`), slowest flight. Reproduced in the NEWUSER harness: fresh onboarding then Home = 0.15, tired.

**Decision:** (1) WELCOME energy in `sun-meter.js`: for 12 h after the account planted its companion (ledger `herb-first:planted`, synced, so reload / sign-in / another device keep it) energy is 100%, then it eases out (smoothstep) over 12 h; it fills the gap above what was really tracked (`real + (1 - real) * k`), so tracking still visibly raises her while it fades. No reset, no new stored key, no notification. Old accounts are excluded (any ledger entry or meal log older than the planting minus 1 h). Her energy card says so: "{name} starts out full: welcome energy for your first day. It fades out over the next N h, and what you track keeps her up." (en/de/es; replaces "Nothing tracked yet today" while it lasts). (2) `LowiSun.feel(k)`: one curve for how energy feels: world pace 0.8 resting, 1 at 60%, 1.6 at 100% (1 with Reduce Motion); peak 0..1 above 82%. `world-home.js` adventure() publishes it eased as `window.LowiVigorFeel` (name avoids the Community `LowiEnergy` module). `body-world-3d-scene.js` runs world time at user speed x pace and, at the peak, warms the cell glow, brightens light shafts (up to +80%) and drifting motes (+35% size), and pulses places bigger: existing values only, no new meshes, lights or textures. `misty-bump.js` predicts cells with the same pace. `misty-flight.js` `speed()` gives up to +30% out / +25% bubble exit / +20% inside a world at the peak, unchanged below 82% (low energy is exactly as heavy as before); the sparkle trail turns sunlit gold and thicker at the peak (fixed particle pool). The half-energy weak entry/exit rule (`misty-hunt.js` `tries`) is untouched.

**Consequences:** `tests/peak-energy.test.cjs` (10; 9 fail on the old code, the 10th guards the untouched half-energy rule). Browser: `tests/peak-energy-live.cjs` (iPhone Chromium, iPhone 13 WebKit, iPad WebKit; new vs resting account, liver world in and out, Reduce Motion with `--reduce 1`). Simulated only, not a real phone. Knobs: `WELCOME.HOLD_H/FADE_H`, `FEEL`, `misty-flight.js` `PEAK`.

## 2026-10-19 The companion the onboarding reveal shows is the one Home, Forms, the care room and the 3D sprite draw

**Context:** Emmanuel made a fresh test account (German), gave a birthday in October 1997, liked the unique companion the reveal showed and renamed it; on Home and in Forms he got the standard Misty instead: "why wasn't the version shown in onboarding given to me?" Code check: since Oct 16 the birth companion (companion-birth-core.js `svg()`: own body shape, colours, sign motif, marks, cheeks, eyes, mouth, accessory, particles) was drawn only by the reveal, Profile and herb-start's pre-signup art. Everything after onboarding draws Misty through `LowiHerbTamagotchi.plantHTML` > cell-world.js `wrap()` > `compose()` > `cellParts()`: the same cyan-magenta glass cell with nucleus and organelles for every user (only the vesicle/ER tint follows the sign), with the herb face. companion.js Forms (`formArt`) and the 3D sprite (world-home.js `mistySvg()` / misty-face.js) copy that same art. Nothing ever read the saved record's look; only its name (BH-006). Not caused by the old-design purge: `git log -S LowiBirthCompanion` shows no renderer ever used it. BH-007 (record overwritten by companion prefs) was a separate data bug, already fixed at 14:35.

**Decision:** companion-birth-core.js `parts(c, id)` returns the reveal's pieces; `svg()` now builds from it (output byte-identical, checked over 109 companions). cell-world.js `ownOpts()` (in `wrap()`) passes `parts()` of `LowiBirthCompanion.get()` when `has()`; `compose()` then uses `ownParts()` instead of `cellParts()`: the own body, motif, marks and accessory at this stage's cell size, its particles, an aura in its own colours, and the herb face replaced by its own eyes, cheeks and mouth (lh-smile) plus the mood parts (sleepy/dizzy eyes, flat/calm/frown/ooh mouths, so Home's energy face from Oct 16 still works). The wall ellipse stays, invisible, as the anchor companion-core `apply()` and misty-face `splitArt()` measure; the own face scale is capped at 2.3 so misty-face's crop holds it. Friends: companion.js `friendSVG` passes `own: false`. A `lowi:companion` event (reveal save, shuffle, Profile) refreshes Home at once. No record = the cell exactly as before (users before Oct 16, Misty fallback). cell-world.css: particles twinkle only with motion allowed.

**Consequences:** Existing accounts whose record exists get their own companion back automatically on the next load (the look is computed from birthday and birth time). Records wiped by BH-007 before 14:35 cannot be told apart from accounts that never had a reveal (birth time was only stored in the record), so they stay Misty until the user brings theirs to life again in Profile; the same birthday and time give the same look. On Home the mouth still follows energy (no smile in any tier, Oct 16), so the reveal's smile shows in Forms and the care room, not on Home. The reveal's round aura ring and inner bubble are not drawn on Home (Home already has its bubble). `tests/companion-own-look.test.cjs` (6; 5 failed on the old code). Browser: CMATCH/flow.cjs (fresh user: herb-start, signup, birthday, reveal + shuffle, setup, Home, Forms, reload) and geom.cjs.

## 2026-10-19 Bug hunt BH-008: the daily Day card gives way to anything that opens after it

**Context:** Seen once by the onboarding-companion task (CMATCH/flow.cjs, reload mid-setup): the weekday "Day N" card (daily-ritual.js `#drDay`, top layer z 2147483000) was open above the setup sheet and blocked the birthday step's Next. `tick()` checked `busy()` only before opening; once open, the card closed only for the orb update bubble, the update card, the sign-in gate and flight. Any sheet that opened later (setup after a slow sign-in restore, any R2 sheet, a tour) sat underneath it. Live 20261019-155424, WebKit iPhone 13: `BUGHUNT/playtest/probe-dayover.cjs` showed a tap on setup's Next and on a plain R2 sheet's button hitting the Day card.

**Decision:** an open Day card also closes when `busy()` turns true, unseen (`dayClose(false)`), so it comes back after two quiet checks, same as for the orb bubble. Pattern: "queued overlay checks busy only before opening". Card content, timing and look unchanged.

**Consequences:** `tests/day-card-yields.test.cjs` (5; 2 failed on the old code). Browser: probe-dayover.cjs PASS (iPhone 13 + Chromium 390), probe-dayshow.cjs (quiet Home still shows the card at ~3 s, no flicker, Let's go closes it for the day) PASS on both.

## 2026-10-19 Community: tapping Chat opens a real community room (tactical glass / star chart)

**Context:** E-man on the call: "you can click on chat, and then you can see the chat. But the chat looks so boring ... when they click on chat ... it actually takes them to ... a community chat room." He picked "semi-transparent glass panels and glowing accents, like a tactical display or a star chart rather than just a list of messages." Before: the Chat pill opened `#cgThread` as a dark box inside the galaxy frame (iPhone 13 WebKit: 354 x 354 px, tab bar still below, a bare "Chat" title and an x, no day information, bubbles from yesterday looked like today).

**Decision:** the same thread, same data, now a room. `community-chat.js`: `thread()` flags the pane (`data-room`) and `html.cr-room` while open; the header has a back chevron (44 px, same `close-thread` action, focus returns to the Chat pill; Escape does the same), the title "Community room", a meta line with only real things (distinct real, unblocked, non-demo, non-bot uids in the loaded last 24 h, "voices", never "online"), and a connection pill from the existing transport state (Live / Syncing / Offline / Not loaded / Signed out). A "Recent voices" strip shows up to 8 real speakers, newest first, never you, as companion orbs that open the existing profile card. Day markers (Today / Yesterday / date) go between days. Galaxy bot lines carry the existing "Galaxy bot" tag. New `community-room.css` (after community-composer.css, precached): star-chart sky (stars, grid, chart rings, one scan sweep on open), glass panels lit on the edge in the speaker's colour, own messages blue-mint, glowing header rule. On phones (`html[data-lay=phone]`) the tab bar steps aside while the room is open and the "connected/loading" status line folds into the pill (error, offline and sign-in states still show their row with Retry). iPad keeps its tab bar. Reduced motion: no warp, scan or pulse. Reduced transparency / more contrast: solid panels, no sky.

**Consequences:** no transport, security, composer, photo or voice change; the galaxy map is untouched when the room is closed. Meal-photo sharing (review the AI estimate before posting, three photos a day) belongs to the photo-cap worker, not this room. `tests/community-room.test.cjs` (8). Browser: CHATROOM/probe-room.cjs and probe-check.cjs (WebKit iPhone 13, iPad portrait, Chromium 390, reduced motion): nothing covered, back and Escape return to the galaxy with focus on Chat, profile from the strip opens, no page errors.

## Replayable tutorial from Settings, kept current by the release (2026-10-19)

**Context:** Emmanuel (voice): "there's a lot of updates and then it gets confusing... There should be a tutorial button ... our companion takes you through everything from the beginning, as if you were new. Obviously, you can skip if you already know this. So, with every new update, the tutorial also needs to be updated."

**Decision:** a new spotlight tour, not the old `LowiG1` first-run guide (its steps point at the retired Today screen). `tutorial-steps.js` is the one data file (steps, EN/DE/ES, which features each step covers); `tutorial.js` plays it: a round glow spotlight on the real Home control plus one glass card with the user's own companion (`LowiBirthCompanion.svg`), Back / Skip (the rest of this part) / Next, Skip all on every step. It never opens panels and reads or writes no app data (one key, `lowi.tutorial.v1`). It hides completely while setup, any other dialog, the Day card's sheets, Settings or Misty's flight is up (bug hunt round 8), and the Day card waits for it. First step for accounts with the standard Misty: the own-companion task's claim step. Keep-current rule: news.json `"tutorial"` enforced by bump-build and release-check; ring controls and Settings rows enforced by `tests/tutorial-steps.test.cjs`.

**Consequences:** every later release must name its tutorial step or say why none is needed; the first one or two after this may trip on it and get a clear message.

## 2026-10-19 Bug hunt BH-009: a setup cut off after the birthday step comes back

**Context:** Playtest (playtest/probe-newuser-reload.cjs RELOAD2=1, live 20261019-163105, WebKit iPhone 13 + Chromium 390): a new user who reloads, or whose app iOS drops (for example while picking a photo), after the birthday step never saw setup again. `saveOb(false)` stores the birthday right after step 0, and `R2.authBoot` only reopened setup when there was no birthday, so the photo, health and shopping steps were skipped, `setupDone` stayed false and the starter-plan interview (`LowiHerbStart.afterSetup`) never opened.

**Decision:** `saveOb(false)` marks a setup in progress (`setupMid`), `saveOb(true)` clears it. `setupPending(s)` (no birthday, or marked and not done) decides whether `authBoot` reopens setup, and `R2.onboard` resumes at the step after the birthday when the marker is set, so the companion reveal is not repeated. Older accounts with a birthday and no marker are left alone. Pattern: "progress saved mid-flow, but the resume check looks at a field that is filled early". Setup content and look unchanged.

**Consequences:** `tests/setup-resume.test.cjs` (6; 2 failed on the old code). Browser: probe-newuser-reload.cjs RELOAD2=1 setup comes back after the reload and finishes (iPhone 13 + Chromium 390).

## 2026-10-19 Community shoot-out: bounded per-frame work (community-energy.js)
**Context:** Emmanuel (voice): "We were both playing, shooting each other, and then it crashed ... in the community section." No device details came back. Simulated two-player soaks (WebKit iPhone 13 and Chromium, tools/soak/community-shoot.cjs) showed no JS errors, no DOM, listener, canvas or GL growth, but every flying frame re-ran the full map layout (place(): ~8-10 ms per frame even with 4 companions) on top of the live 3D world, the hit-effects list had no ceiling, and one overloaded soak run dropped to under 1 fps for minutes while shooting continued.
**Decision:** MAX_FX=160 effects (sparks dropped first, capFx), place() at most every PLACE_MS=33 ms while balls fly (always on the last frame), and frames slower than 1/30 s draw balls without shadowBlur and make 4 sparks per hit instead of 12. Physics and sync are unchanged.
**Consequences:** the map follows knocked companions at up to ~30 updates a second instead of every frame. tests/community-shoot-crash.test.cjs guards the ceiling, the throttle and a 3-minute two-player shoot-out.
## 2026-10-19: evolutions escalate every form (EVOLUTION.md)

**Context:** Emmanuel (German voice note): the companion is "mein Investment"; the young one looks small, later "aus diesen kleinen Flossen kriegt er richtig dicke Dinger, kriegt er noch mehr Stein ... es soll immer heftiger werden". The cell frame was tight round the body, so every form looked the same size, and traits barely grew.

**Decision:** `companion-core.js POWER` per form: fins/ears grow up to 1.9x long and 2.2x thick, 0/0/2/4/6/9 armour stones on the rim, shoulder horns on the last two forms, and a per-form frame (young forms sit small, later forms fill it). XP thresholds unchanged (0/100/300/700/1500/3000). The evolution card escalates with tier t = new form: charge, flash, burst, 4+3t rays, card shake from tier 3, power line in EN/DE/ES; it waits while another dialog/sheet/setup/tour/Day card is open. transform/opacity only; cell-world.js (Home face, mouth, no glow ring) untouched.

**Consequences:** each user's own generated companion keeps its body, colours, name and face; only the trait layers and the frame change.
## Oct 19, 2026: Log meal asks Breakfast / Lunch / Dinner / Snacks first (E-man, German voice message)
"Ich habe keine Zeit. Ich habe Pop-up. Zack, Mahlzeit-Eintrag." Log meal now pops four big tiles (the slot for the time of day marked "now"), then the slot's sheet with Write / Scan / Snap and that slot's usual meals first for one tap. This supersedes the Oct 19 meal-names decision that Scan and Snap live only in Scan: they are back in Log meal as two of the three ways to add a meal, as he asked. Photo checks are unchanged (3 a day, Snap is the existing flow). The same food in another slot the same day counts as a new meal.
Shop gets "Snacks to buy" at the top: only snacks still to buy ("nicht die schon bereits drin waren"); ticking moves one off the list into "Again?" for next time.

## Oct 19, 2026: Starter questions survive a reload (bug hunt BH-010)
The few questions after setup were kept only in memory, so a reload or iOS closing the app before "Let’s do it" / "Not now" lost them for good. afterSetup now marks them pending (lowispike.hs-pending.v1) until a plan or "Not now" is saved; the next start reopens them once Home is quiet (no sheet, gate, tour). Accounts that finished setup earlier have no mark and are never asked. No design change.

## Oct 19, 2026: Setup resumes at the birthday step until the companion exists (bug hunt BH-011)
The companion is saved only when Continue is tapped on the reveal, but the birthday and setupMid are saved before the reveal plays. A reload or iOS closing the app during the reveal resumed setup at step 1, so the reveal never came back and the account stayed on the standard Misty. R2.onboard now resumes at step 0 (birthday filled in) while LowiBirthCompanion.has() is false; once the companion exists it resumes at step 1 as before (BH-009). The optional birth time is not stored by setup, so after such a reload it has to be typed again.

## Oct 19, 2026: Simulated community crowd (owner's call)
Emmanuel asked for up to 100 simulated members who sign up, play, post food photos, talk about products and chat with him and his beta testers around the clock, from many countries, ages and writing styles, unlabelled because the testers know, to see how a busy community feels and whether it breaks anything. This reverses the earlier "no invented participants" rule for the room's content (the app code still invents no counts or people). The crowd is real Supabase accounts driven by tools/community-crowd/crowd.cjs from the community-crowd workflow every 10 minutes; replies come from fixed lines, not an AI model. Off switch: disable the workflow or set the repo variable CROWD_OFF=1.

## Oct 19, 2026: Energy bursts play like billiards: whoever gets hit stays where they stop (Emmanuel, playing on his iPhone)
"whenever I shoot them ... they just go back to where they were. That's not fun ... It doesn't feel like a real billiard ... I shoot them away. They shouldn't be coming back. They should be hitting other people." This supersedes the earlier choice to ease everyone back to their own spot after a shot "so the map stays readable". community-energy.js table(): no 'back' phase and no soft wall / 240 px tether around a companion's own spot; a knocked companion keeps rolling (same friction and bounce), knocks into whoever it meets, and only the edge of the map bounces it back in. Where it stops is kept as a map position (land): it stays put when the crowd size band moves its pin, when it drops off the map for a while, when Community is left mid-roll (halt(), no more reset()) and across a reload (localStorage `lowi.energy.land.v1:<uid>`, at most 400 companions, saved once when everything stops, and again when the app is closed or hidden mid-roll: pagehide / visibilitychange). busy() now means "something is moving", not "someone is off their spot", so resting costs nothing. Your own companion stays where a friend knocked it too; your next burst leaves from there and the glow follows (community-chat.js place()).

**Consequences:** each phone keeps its own resting positions (the map is drawn around each viewer anyway): a phone that was not in Community during a shot, or that missed it, shows that companion on its usual spot. Positions don't expire; companions can collect near the edge of the map over a long session.
## Oct 19, 2026: Per-warp canvases are capped and freed (bug hunt run 14)
The Home <-> Community warp made a full-screen 2D streak canvas (#gxWarp) every time and only removed it from the page, leaving 5 MB (iPhone) to 22 MB (iPad) per warp for the garbage collector; iOS caps canvas memory and kills the page (same class as CS-001). warpFx now keeps it within ~1.4 megapixels (normal iPhones unchanged at 2x) and sets width = height = 0 when the warp ends. Rule stays: any canvas made per transition is capped and zeroed on drop. tests/warp-canvas-memory.test.cjs.
## Oct 19, 2026: Community draws the galaxy and the chat piece by piece (crash round 2)
Emmanuel's iPhone closed the app three times in one evening: scrolling the Community chat, and aiming or sending an energy burst in the zoomed-out galaxy, with the simulated crowd (~60 people) in the room. Probe on the live site signed in as a crowd member (writes blocked): ~24k SVG elements on the page, and every paint() rebuilt the whole galaxy and the whole chat list (1.2 MB of HTML) several times a minute, even with nothing new. Cause: herb-tamagotchi plantHTML gives every drawing ids from a global counter ('lh'+(++seq)), so the same companion never produced the same HTML and the `__html` guards never held. mate() now rewrites those ids from the person's id (stableIds), and paint() updates #cgField and #cmList with patchKids(): unchanged pieces keep their elements, only new or changed pieces are parsed. Idle rebuilds went from 11 per minute to 0; garbage DOM nodes during a scroll/zoom/shoot session from ~131k to ~37k (Chromium). Not reproduced as a crash on a real iPhone: a cause measured in simulation, not a confirmed device diagnosis.

## Oct 19, 2026: No "sent you energy" chat line (owner's call)
Emmanuel: "why the it says [Damon] sent you energy? ... That's a useless text message ... Remove that specific line from the app." LowiCgMap.energy() no longer posts "@Name ⚡ X sent you energy"; the burst itself is the message. Lines shaped like it (older app pings, crowd members) are hidden from the chat, bubbles and unread counts by messages() (ENERGY_LINE, EN/DE/ES). The crowd script should stop posting them too (note left for the crowd task).

## Oct 19, 2026: Ten companion forms, evolution stays XP only
Emmanuel reached the last of six forms in testing and asked for more levels and evolutions that become "something majestic".
Four forms follow Legendary at 4500, 7000, 10000 and 14000 XP (Nova, Titan, Monarch, Majesty), each adding a new silhouette
piece; the first six thresholds and every user's own look and earned progress are unchanged. Following his Collection
decision, evolving never requires a specific food, a full Collection or a Catch: XP thresholds only. Details: EVOLUTION.md.


## Oct 19, 2026: Companion card: no "spirit", adventure places you earn, nothing hidden, Collection becomes a Food journal
Emmanuel walked through the companion card (long press on the companion) on a call: "Don't use the word spirit" (a friend: scientists, doctors and schools will use this app); adventure places "should only be unlocked if the person went there themselves ... and also depending on ... at what level their companion is"; "How do you feel? Why is that there?"; Forms and Collection were "hidden"; "I don't even understand what collection is for" (he let Maya decide).

**Decision:** the places are Home world, Cell worlds, Galaxy, Other worlds, Streams (the space outside your world is the galaxy, as the Community title says). The timed adventure reaches a place only when the companion's level is high enough AND you have been there yourself once (your steering or your tap; autopilot and the timed trip never count). Your own flying and autopilot stay ungated, so nothing locks a first visit. Visits live in S.advSeen (account) with a device copy; first cell-world arrivals already in the XP ledger count. The card shows, per place, what is still missing (level, your visit, the place before it) and whether you have been there. Forms, Food journal and Glow come first on the card; the mood check-in comes last and says what it does (the companion mirrors it for 8 hours, no XP, only the look and mood change); the stored mood is untouched. The Collection is now a Food journal: foods you logged or scanned, newest first, how often, first date, and how those meals went (likely blood sugar response), then your scanned products. No "???" tiles, no n / total, nothing in it is needed to evolve.

**Consequences:** existing players at level 4+ see Galaxy / Other worlds / Streams as "Go there yourself" until they fly there once; autopilot still shows them everything. Remaining "spirit" wording was also removed from onboarding, the tutorial's galaxy step, the Community title (now "Community galaxy") and one companion line. Code identifiers (spirit.js, LowiSpirit) stay; users never read them.


## Oct 19, 2026: Care is free, the sparks currency is gone
A code check found sparks were the only thing in the app you could spend: 3 a day plus 1 per logged meal, water or Move (up
to 8, reset at midnight), paying 1 for a Hug, Drink water, Good morning or Sweet dreams and 2 for Gratitude or
Encouragement on the care sheet ("Send energy" on a Community profile, the friends tree, the Adventure log Friends tab).
Galaxy energy bursts were already free. Emmanuel, on a call: "I don't understand the point systems ... It's a bit much ...
It's confusing"; "sending an energy boost is obviously free"; he agreed to make care free too and left to Maya whether care
should stay ("You pick if it should even be a thing").

**Decision:** care stays (a kind, real-friends-only touch) and is free. No balance, counter, cost, "not enough" block,
earning or reset (micro-book-core.js `sparks()`, `SPARK_BASE/MAX`, the CARE `cost` fields and canCare's 'sparks' reason are
removed; micro-book.js drops the counter, prices, the noSpark note and `S.care.spent`, which is deleted from saved data on
read). Kept as anti-spam: one send per friend, kind and day, level unlocks (Gratitude lv 3, Encouragement lv 5), time
windows. XP stays the permanent evolution track and energy today's vitality, both unchanged; caring never takes either.
Caring still earns its small XP (5 XP, up to 3 a day, xp-tap-core.js). The "Spark" companion form is unrelated and stays.

**Consequences:** the app has nothing to spend any more; everything you earn (XP, forms, energy, sunbeams, streaks) only
goes up or reflects today. Tests: tests/free-care.test.cjs. MAYA-HANDOFF item 26.

## 2026-10-19 23:15 - Messages to you arrive on Home as the sender's companion (MAYA-HANDOFF item 23)
Emmanuel (call): "Their companions appear ... on my homepage ... one of those outer bubbles ... we see them flying towards the homepage. And then we see the text bubble." / "Whoever messaged me ... like a hologram ... it should look like they just entered my world."
- Which messages: only ones addressed to you, by the room's own test (an @mention of you or a reply to your message: `LowiCommunityGalaxy.targetOf`, same as the existing "is talking to you" toast). New `LowiCommunity.directed()` in community-chat.js reads them; it never moves `dmSeen`, so a visit marks nothing read. Blocked and hidden accounts never visit; crowd members use the same real path as friends.
- Look: their own companion drawing (`mate()`), in their room colour, inside a small glass bubble, flies in from just past the screen edge (always the same side of the sky for the same person) along a curve, growing as it comes closer; the bubble breaks with a ripple, the companion stays as a light hologram (scanlines, glow, a projection beam) and a glass speech bubble shows the real message as text. Lands in the free band under the Home ring (above it if that is where the room is, beside it in landscape, low over it only on very small screens).
- Timing (left to Maya; changed on 20 Oct by item 30, see the entry "A Home message visitor stays until you answer"): 1.5 s flight, then the reading time of the message (6.5 to 15 s), paused while touched, hovered or focused. Tap = Community opens on that message with the reply set to them; x or Escape = they fly back out. One visitor at a time; more messages from the same person update the visit in place; at most 4 people wait, the rest is a "+N more for you in Community" line. A visit that could not happen within 10 minutes (Home not in front) stays in the room only.
- Never replayed: only messages you have not seen in the room, under 12 hours old, and never twice per account on this device (remembered ids, `lowispike.homeVisit.v1`). After a reload or time away only the two newest unseen come by. Opening Community drops everything waiting (it is in front of you there). The room's toast is skipped only while Home actually takes the visit.
- When it waits: Home must be in front with nothing on top (setup, Day card, tutorial, sheets, dialogs, Settings, galaxy zoom); a sheet opening mid-visit sends them away (back in the queue if you had not really seen it yet). Quiet hours you set yourself in Community hold visits back; the default 22:00 to 08:00 hours do not, because a visit is silent and only happens while you are looking at Home.
- Light on the iPhone: plain DOM, one layer while visiting, transform/opacity animations only, no WebGL, no animation loop, one small timer only while a visit waits or shows; everything removed afterwards. Reduced motion: no flight or flicker, they fade in in place. English, German, Spanish.

## 2026-10-19: The picked aura is visible on the companion; companions can be renamed by hand

**Context:** Emmanuel changed the aura colour and "nothing changed" on Misty; a friend wanted to rename their companion.

**Decision:** an aura you pick replaces Home Misty's star-colour glow (body colours never change) and repaints her card at
once; with no pick the old look stays. The aura is saved per account (`lowispike.aura.v1`). A Rename button under the name
on her card renames her: only the name changes, never the look; empty goes back to the generated name; 1 to 24 characters
with a letter or number. Fixed lines that say "Misty" use her name through `LowiBirthCompanion.withName()`.

**Consequences:** her name is the user's choice and syncs with the account; more fixed "Misty" lines can adopt withName()
later. Tests: tests/aura-rename.test.cjs. MAYA-HANDOFF item 28.

## 2026-10-19 Food paths: one job per entry, Pathfinder counts first finds (MAYA-HANDOFF items 24 and 27)

**Decision:** Fuel > Log meal is for what you ate; Shop is for checking products in the shop (Scan in the shop) and the
Shopping list; Cook is meal ideas. Every "I ate this" shortcut opens the one shared meal logger (Gap > I just ate adds an
optional "Not now"). A shopping scan never logs a meal and never touches the Gap clock. Catch only shows for products the
community database does not have; the first checked one pays +100 XP into the normal XP total (max 3 a day), and the
Pathfinder badge shows how many products you found first.

**Consequences:** the count lives on the phone (D.pf) until it syncs; the e2e lives in /home/sprite/FOODPATHS/e2e.cjs.

## 2026-10-19 23:30 CEST: forms 7-10 reuse the Legendary drawing; an unseen evolution survives a reload (bug hunt BH-012/013)

**Context:** the ten-form release kept six-step drawing tables in herb-tamagotchi.js plant(), so the standard Misty at 4,500 XP and
up drew her face at translate(130 undefined), outside her body (live 20261019-224907, simulated iPhone 13 and Chrome). And refresh()
saved lastSeenStage before the evolution was on screen; it waits while a card is open, so a reload in that wait lost it for good.

**Decision:** plant() reads its tables with the form clamped to Legendary (index 5); halo, sparkles and float apply from index 5 on.
refresh() also saves `evoFrom` with lastSeenStage and replays the evolution on the next refresh while it is set; closing the evolution
clears it.

**Consequences:** a reload during the evolution animation plays it again once (better than never). Tests:
tests/bughunt-high-forms.test.cjs.

## 2026-10-20 02:20 CEST: only the newest product search opens its results; a late catch answer stays on its own card (bug hunt BH-018)

**Context:** the Scan tab's "Or find a product…" search waits on the community database, then opens a results sheet. Pressing Search
twice (double Enter, or tapping again while "Searching…" waits) or fixing a typo and searching again opened one sheet per search,
stacked (live 20261020-011459, Chrome 390 and simulated iPhone 13: double Enter = 2 identical "apfel" sheets). Same class in
"Be the first to add it": the catch waits on the server, and the old code painted its result into whatever card was open by then
(the next product's card got the "caught" stamp; a manual add painted the old product over it while "I ate this" logged the new one).

**Decision:** pattern "async result painted into stale UI": nameSearch keeps a sequence number and only the newest search opens a
sheet, replacing a results sheet that is still open. catchCur remembers the card that asked and paints the burst only into that card
while it is still the open one. The Pathfinder reward itself is unchanged and still paid.

**Consequences:** tests/stale-async-ui.test.cjs (5 of its 6 tests fail on the old code). Playtest probe
BUGHUNT/playtest/probe-search-dbl.cjs.

## 2026-10-20 03:20 CEST: Mirror mode never leaves the camera on after a start you overruled (bug hunt BH-019)

**Context:** Move > Mirror mode waits for the camera (and the first time for the 9 MB tracker) before it starts, and whatever you did
while "Starting the camera…" showed was overruled when the camera answered (live 20261020-020848, Chrome 390 with a slow fake camera,
probe BUGHUNT/playtest/probe-mirror-cam.cjs): tapping "Without camera" left the camera running through the camera-free routine; the
tracker failing (offline) while the iPhone permission prompt was up showed "Camera not available" and then turned the camera on
behind it after Allow; closing and starting again opened two cameras and one stayed on after close (camera light until the app is
closed); "Turn camera back on" after the background, then close while it starts, threw a TypeError and left html.mm-cam on.

**Decision:** pattern "async result painted into stale UI" (camera flavour): every camera start takes a number (camGen) and
stopCamera() moves it on. A start whose number moved on stops its own camera tracks as soon as they arrive and paints nothing;
resumeCam got the same "closed while starting" check goCamera had. Sibling: a double tap on a discovery label photo opened two photo
sheets, now only the newest tap paints (PH_SEQ) and replaces an open one. Other getUserMedia sites (food snap, barcode scanner,
Community voice) already guard their own start: checked.

**Consequences:** tests/mirror-cam-race.test.cjs (6 tests, 5 fail on the old code; the first guards the normal start). Not testable
on a real iPhone from here; the camera light is the thing to watch.

## 2026-10-20 04:30 CEST: A message you type while a Community photo uploads stays in the box (bug hunt BH-020)

**Context:** a Community photo with a caption takes seconds to upload and the text box stays usable while "Sending photo…" shows.
When the upload landed, sendPhoto cleared the whole draft and the input from its snapshot taken before the upload, so whatever you
typed meanwhile (the next message, or more after the caption) was erased (live 20261020-030834, Chrome 390, probe
BUGHUNT/playtest/probe-photo-caption.cjs with the upload answered after 5 s and every write blocked: typed "Is the soup any good?"
during the upload, box empty afterwards).

**Decision:** pattern "async result painted into stale UI" (stale snapshot flavour). LowiChatCore.afterCaption(sent, current) decides
what leaves the composer after the upload: only the caption that went out (also when it is the start of a longer text) and the reply
the photo answered. Text typed or a reply picked during the upload stays; sendPhoto reads the composer again after the await.

**Consequences:** tests/photo-caption-typing.test.cjs (6 tests, all fail on the old code; 5 exercise the new helper, 1 checks sendPhoto
no longer clears blindly). Checked siblings: voice notes never touch the draft; the For You composer photo (index.html trPhotoIn) and
the food snap (f2File) assign after an await without re-checking the open composer: logged in the bug ledger, low (needs closing and
reopening inside ~300 ms).
- 2026-10-20 bug hunt run 21 (BH-021, pattern "async result painted into stale UI"): the For You post photo and the food-flow snap are
  shrunk with an await; each now only goes to the composer/flow it was picked for (trPhotoPick / f2Pick capture C / F first). Fixes
  a TypeError when Post was tapped while the photo was still shrinking, and an old snap landing in a reopened food flow.
  tests/photo-pick-stale.test.cjs (6; 4 fail on the old logic).

## 2026-10-20 09:30 CEST: A Home message visitor stays until you answer (MAYA-HANDOFF item 30)
Emmanuel (call, on the live build 20261020-090200): "The hologram appeared, and then it disappeared way too fast for me to even click on reply ... update that."
- No reading timer any more (`home-visit.js`): the item 23 visitor stays until you tap Reply (the whole bubble, Reply is now drawn as a button) or the x / Escape. No duration was given; a longer timer would still beat a slow reader, so there is none.
- Something covering Home (a sheet, Settings, another tab, the app in the background, quiet hours) sends the visitor out of the way, not away: `requeue()` puts them first in line and they fade back in place when Home is in front again (no second flight). At most 8 comebacks (`TRIES_MAX`), then the message stays in the room only. A visitor you already saw waits as long as the message is under 12 hours old; one never shown keeps the 10-minute limit, and that clock only runs while it is not stuck behind another visitor.
- A rotation or bar resize moves a standing visitor to the new spot (`placeNodes`) instead of sending them off; one still flying in steps out and comes back. The 0.9 s check also moves them if the window size changed without a usable resize event (the live WebKit check after 20261020-092921 once left the card at its landscape spot after rotating back).
- Remembered as done (`lowispike.homeVisit.v1`) only when you tap Reply or the x / Escape, or it ran out of comebacks/time; being shown alone no longer counts, so a reload before you answer brings it back (still only unseen messages under 12 hours, the two newest).
- Others wait their turn; the card says "{k} more waiting" (EN/DE/ES) so you know the x brings the next one.
- Kept light for the open iPhone crash (item 29): no new timer, animation or listener; the existing 0.9 s check runs while a visitor stands there (as before, just longer) and stops when nobody is waiting; text is only rewritten when it changed.
- Checks: `tests/home-visit.test.cjs` (3 new), browser `/tmp/pw/visit-check.cjs` (WebKit iPhone: still there after 28 s, rotate, Reply opens that message, two people one at a time, Settings over Home and back, Escape, nothing left running).

## 2026-10-21 15:30 CEST: One meal path: eating is one event, whichever door it came through

Emmanuel: "I'm eating, and I went to the scanner, and then I went to snap photo. I should have probably went to log meal. That's the confusing part. We have scanner and snap photo. We also have log meal. And then we also have the gap with the fasting... If I click on 'I just ate' it gives me points. And then it says 'log meal'... Find a strategy."

Before, four doors and three rules: Log meal, Snap food and the barcode scanner's "Ate it, log it" saved the meal but a running fast kept running; Gap "I just ate" ended the fast and paid its points but saved no meal unless you also went through Log meal; ticking a planned meal ended the fast only past 8 h; the +10 break-fast bonus only came if you went through "I just ate" first.

After, one rule (`LowiFastStop.mealLogged`, the one `lowi:meal-logged` listener in index.html; every log path already fires that event from `LowiVitalsBridge.logMeal` / `planMeal`, which now carry the meal's `ts`):
- No gap clock yet: the meal starts it (nofake, unchanged).
- A fast is running: the meal ends it at the meal's time through `end()`: the same record, points, once-per-fast guard (`s.awarded`) and reward as "I just ate". The reward says "Your meal ended the fast" and adds the +10 break-fast bonus (`LowiF2.bonusFor`, the same per-fast memory the I-just-ate chain uses, so both can never pay). A high-spike meal still ends the fast and pays the fast points, no bonus (unchanged bonus rule).
- Left alone: food within 30 min of the clock's start (same sitting: a second photo, a drink, or Log meal right after "I just ate"), a catch-up log for an earlier slot (breakfast logged after 11:00, lunch after 16:00), a meal time before the clock's start.
- "I just ate" stays the shortcut for "end it now, details later" and opens the same Log meal. Pressed within 30 min after a meal was logged, it changes nothing and says "Already logged: {meal} at {time}" (no second Log meal, no double log).
- Supersedes the 2026-10-19 "a running clock is never restarted by Log meal": that guard stopped a fake restart with no record; now the meal ends the fast properly with its record and points, which is what Emmanuel asked for.

UI: Scan's bottom bar is Barcode (check a product) and Log meal (I'm eating). Snap food left the bar; it is the Snap button inside Log meal (same camera, same log). While a fast runs, Log meal (slot picker and the Write / Scan / Snap sheet) shows one brand-line note: "Saving this ends your 16 h fast · +N XP" (under 4 h: "restarts your gap clock"). The Gap chain's question now reads "Fast ended and points saved. Want to add what you ate? A photo or a few words, or skip." The photo result screen itself is untouched (another task is redesigning it); it stays the destination of Snap.

Tutorial steps gap-tap, log-meal and snap updated (VERSION 4). Checks: `tests/one-meal-path.test.cjs` (10, runs the real fasting module), updated no-fake-fast / food-paths / orb-scan; browser `tests/one-meal-path-live.cjs` (Chromium 375/390/820, WebKit iPhone SE / 13 / iPad: Scan bar, the note, saving ends the fast once with the reward, "I just ate" after changes nothing).

## 2026-10-21 15:50 CEST: Scanner result redesign merged onto the one meal path (decided by the agent)

Emmanuel: "Stop asking me questions. Create a decision criteria and make the decision and push it."

Decision criteria, written before the merge, applied in this order:
1. Keep build 20261021-151646's single Log meal path exactly: saving any meal ends a running fast once, with its points, the +10 break-fast bonus rule and the no-double-pay guards. It is live and tested, so the redesign may not touch that logic.
2. The redesign owns only the photo result screen layout: spike verdict first and largest, then each detected food as its own editable card (portion, calories), drinks, per-item fixes that move the totals and the XP.
3. Brand: cyan / brand-blue lines and glow, no gold or beige; amber only as the traffic-light colour of a medium spike.
4. One question per screen ("Will this spike me?") and numbers that always add up: the XP and totals shown are the ones the log gives.
5. Where the two overlap, pick whatever keeps one path, fewer taps and consistent totals.

What was decided:
- Merge conflicts in index.html and sw.js were build-id strings only: live main's ids kept, meal-result.js and `mealQuestXp` re-added.
- Overlap: the result screen is where Snap's save happens, but it did not say that saving ends the fast. By 1 and 4 it now repeats the same line Log meal shows (`LowiFastStop.mealNote`, e.g. "Saving this ends your 16 h fast · +77 XP") right under the meal XP, in the same thin cyan rim. It shows the line only; the fast still ends in `mealLogged`, so nothing pays twice and the meal XP and the fast XP stay separate, each true.
- No extra tap and no second save button: Snap inside Log meal ends on the redesigned result screen, "Log as meal" saves, Fast done follows.
- Scan's bar (Barcode + Log meal) and Log meal's slot picker are unchanged.

Checks: `tests/meal-result.test.cjs` (9, one new for the fast line).

## 2026-10-21 16:50 CEST: Scan, Fuel and Gap each do one job (decided by the agent)

Emmanuel: he photographed his food and logged it, but the fasting timer kept running; Scan, Fuel and Gap felt tangled. Standing rule: decide and push.

Decision criteria, in order:
1. One job per control. Scan identifies a product, Fuel logs a meal, Gap only shows the time since the last meal.
2. Every meal logged in Fuel (typed, recent, photo, or the Scan button inside Log meal) ends a running fast once, at the time it was eaten, through `LowiFastStop.mealLogged`. No second door may pay XP.
3. Never a dead button: anything that needs a module or the network falls back (Deep analyze falls back to the GPT link).
4. Gap is not a fasting app: no goal, no end time, markers framed as typical, never as a measurement.

What was decided:
- Scan's bar: Barcode and Deep analyze. Log meal left the scanner. Deep analyze reads a pack photo in the app (`deep-analyze.js`, the same food-photo AI and daily allowance as Fuel's Snap) and never logs a meal. The not-found card leads with it.
- "I ate this" after a barcode scan shows only when the camera was opened from Log meal's own Scan button (`LowiScanIntent`), so shopping scans never log a meal or touch the Gap.
- Gap on Home has no actions any more: a tap opens the passive Gap view (`gap-view.js`): six markers on the hexagon, a lit trail for the hours, "Fix time" and "Log a meal in Fuel". The old "I just ate" / "Ate earlier" bloom actions are gone (the Gap view's button opens Fuel, which ends the fast through rule 2).
- Fuel asks "When did you eat?" (Now, 30 min, 1 h, 2 h, 3 h ago, same day). A picked time backdates the meal (`ateSet`) and is the time the fast ends, and such a meal is not treated as a catch-up guess.
- Wording: "Saving this closes your 16 h meal gap · +77 XP" (was "ends your 16 h fast").

Checks: `tests/scan-fuel-gap.test.cjs` (6 new), `tests/one-meal-path.test.cjs`, `tests/orb-scan.test.cjs` updated.

## 2026-10-21 16:40 CEST: No launch screen, and the first paint is never white (decided by the agent)

Emmanuel on his iPhone (home-screen app, dark mode): "I opened the app and there was still this for a split second. We don't need it. Remove it. And when I open the app it's white for 1 second. Fix that."

Decision criteria, written before the change:
1. No logo, Misty cell or wordmark may appear at launch, in any theme.
2. Keep what the launch screen protected: the app is still assembled in layers, so it must still show finished in one step, never older half-built screens.
3. Every pixel before Home is the dark brand background (#03050a, the theme-color and manifest colour), from the very first paint and before it on iOS.
4. Tight scope: no change to the service worker, the update system or anything below `</head>`.

What was decided:
- The `#lwBoot` cover (Misty cell + LOWiSPIKE wordmark, its CSS, the fade-out) is removed. The boot gate stays (`html.lw-boot` keeps the page at opacity 0, `LowiBoot.loaded()`, window load, 8 s cap, `?noboot=1`), so by 2 the plain background shows until Home is finished.
- White flash, cause: a home-screen web app on iOS shows its startup image until the page first paints, and plain white when it has none. LOWiSPIKE had none, and the first page paint waits for the network (up to 1.5 s, see sw.js) and for a 3.2 MB index.html, so the white lasted about a second. The page's own background was also only set after about 57 KB of inline icons.
- Fix: plain dark `apple-touch-startup-image` PNGs for current iPhones and iPads (`startup/`, made by `tools/brand/make-startup-images.py`, no logo by 1), `<meta name="color-scheme" content="dark">` and `<style id="firstPaint">html,body{background:#03050a}</style>` as the first things in `<head>`. The startup images are not in sw.js STATIC: iOS reads them itself, the service worker never serves them. iOS may keep a home-screen app's old launch picture until the icon is removed and added again.

Checks: `tests/launch-no-splash.test.cjs` (4), `tests/clean-start.test.cjs` and `tests/oct19-old-design-purge.test.cjs` updated. Browser: `node tools/startup/launch-paint-check.cjs` (fresh browser, dark mode, page download held after 1.5 KB, apple-ui.js held 2.5 s) passed 6/6 on WebKit and Chromium at iPhone SE, iPhone 13 and iPad sizes: no launch-screen element was ever added, the body stayed hidden during the gate, the background during the gate was only rgb(3,5,10) / rgb(0,0,0), and Chromium's screenshots during the gate were plain #03050a. Not tested on a physical iPhone; a desktop browser cannot show iOS's own startup image.

## 2026-10-21 19:20 CEST: The Home Settings bubble is Community; a hold opens a slim Settings (decided by the agent)

Emmanuel: Community should hold the profile and everything we built; Settings is only the necessary stuff, opened with a long press; clear out the clutter.

Decision criteria:
1. One tap from Home to Community, the most used social place.
2. Settings holds only switches, language and the account; nothing that is a place.
3. Every place that leaves a menu stays reachable from somewhere (no dead features), and no saved choice is lost.
4. Account deletion starts inside the app (App Store 5.1.1(v)) and never deletes anything on the phone before the server confirms.

What was decided:
- The Home Settings bubble (`.o8-settings`) is the Community bubble: a tap opens Community, a hold (480 ms, under 12 px drift; touch, pen and mouse) opens the slim Settings as a centred sheet. A one-time hint teaches the hold.
- Slim Settings rows: Day & night, Look, World sound, Language (EN / DE / ES in the row), Menu bar, Tutorial, then Account and Delete account.
- In Community, your picture opens the You panel (`community-me.js`): Profile, Weight & BMI, and For You, Care board, Workouts, World map, Gift of the day, Shopping hunt, plus a gear for Settings.
- Clutter out of every menu: VR and Weather (their code and saved choices stay), Today, Daily quest; Cook stays under Fuel.
- Delete account calls the Edge Function `delete-my-account` (`supabase/functions/delete-my-account/index.ts`). It is not deployed yet (no Supabase access token on the agent VM); until it is, the app shows "Nothing was deleted, try again later" and clears nothing.
- Tutorial: the community step points to the bubble; settings-me shortened to fit 230 characters in German.

Checks: `tests/ui-settings-page.test.cjs`, `tests/everything-else-trim.test.cjs`, `tests/home-settings-sleep-v2.test.cjs` and the tutorial tests updated. Browser: `tools/community-settings/probe.cjs` with `tour.js`.

## 2026-10-21 19:45 CEST: Affiliates page is a template plus earnings, nothing else (decided by the agent)

Eman: "confusing, why is it so complicated". The page (`affiliates/`, also the Community → Affiliates tab) now has only:
- One line on top: the personal affiliate link comes from Eman directly on WhatsApp. No link field, no Beacons steps. No WhatsApp button, because no number or link for Eman exists in the repo.
- Two cards, Webdesign (AI Website Client System, keyword "Webdesign") and UGC (AI Sponsoren-Agent, keyword "Sponsor"). A tap shows the baseline script from Burak's series: on-screen title, spoken lines per scene, CTA, a short shot list, "Skript kopieren", and the caption with its copy button. Placeholders like [Branche] or [Marke] stay inline as bracketed text. The pick is kept in the address (#webdesign, #ugc).
- One tip line: it is a template, bring your personality, record yourself or use an AI avatar (HeyGen, Higgsfield), it is free.
- Levels table from the partner dashboard terms (1–10: 10 %, 11–50: 15 %, 51–150: 25 %, 151+: 45 %, at 99 €), € per sale, and totals at 10, 50, 150 and 200 sales (each sale paid at its level's rate).
Removed with their code and tests: niche generator, daily facts forms, checklist and day stepper, posting tracking, "Meine Zahlen" and manual sales, the agent prompt, the monthly-fee line. Nothing is stored on the device any more (the old `lowi.affiliates.v1` key is left alone).

Checks: `tests/affiliates-blueprint.test.cjs` rewritten; browser `tools/blueprint/check.cjs` (LIVE=1 checks the live site).

## 2026-10-21 — The grandma test for every screen and ad

**Status:** Accepted

**Context:** Emmanuel sent a TikTok (Jared Roars reacting to Graydon's Digital Marketing): "Every time you make an edit to your website or an ad, think: would a drunk grandma understand this? If not, simplify it. People need to understand what you're selling and how it benefits them." An audit of the everyday screens at iPhone 13 size found bare numbers and missing words: the Fuel bubble read "1/3" with no unit, an empty Gap bubble was a lone dash with no label for screen readers, the Gap planets carried bare numbers (0, 3, 8, 12, 14, 16) that are hours, the "Today's stats" strip ended in "1/6" with no "of what", the Move note led with a disclaimer instead of the question, the Deep analyze subtitle described the mechanism ("the AI reads it here") instead of the benefit, the first fly hint packed three gestures into one line, and the sleep question could be dropped when it did not fit on one side of the chips.

**Decision:** Copy follows the grandma test written into `AGENTS.md`: what it is and what you get, at a glance; units on numbers; words in empty states; the question beside the choices; benefits in subtitles. Feature names Emmanuel chose (Fuel, Gap, Scan, Move, Epic, Deep analyze) stay and get explained beside the name. The first-visit funnel (install guide, sign-up, companion setup) is covered by the companion decision from the other video the same day.

**Consequences:** `tests/grandma-test.test.cjs` locks the fixed cases in EN, DE and ES. `tools/grandma/audit.cjs` prints every visible line of Home and of each everyday sheet at phone size, so the next edit can be read the way a stranger reads it.

## 2026-10-21 — The tutorial card counts steps with a number, not dots

**Status:** Accepted

**Context:** Emmanuel, on the Home tutorial card "Tutorial · 17 of 41": "Those dotted lines in the tutorial, I feel like they're stupid. I get what the point is, but it just looks bad. Either remove it and just have a number there." With 41 steps the dots wrapped into two rows of tiny marks under the text.

**Decision:** The progress dots are removed from the tutorial card on every step and screen size. "Tutorial · X of N" in the card header is the only progress indicator, a little larger (12 px, semibold, tabular figures). No bar or other replacement. The space the dots used is closed; Back / Skip / Next are unchanged.

**Consequences:** `tests/tutorial-nodots.test.cjs` renders every step and fails if dots or `.lt-dots` styling come back. `tools/interface-audit/p10-tutorial.cjs` reports `dotsBack` instead of measuring the dots row.

## 2026-10-21 20:30 CEST: Deep analyze is a one-tap link to the custom GPT again (decided by the agent)

Eman: "I don't know what you did here, but it needs to be brought back. That deep analyze button is simply a shortcut to my custom GPT. It should be very quick. I open the app, I click on Scan, I click on Deep analyze, and I get to the custom GPT really fast." His screenshot showed the in-app Deep analyze photo sheet with the scanner's "The camera is off" card and the Type-the-number sheet piled on it.

What was decided:
- Deep analyze on the Scan screen and on the not-found product card is a plain `<a href target="_blank" rel="noopener">` to `https://chatgpt.com/g/g-69481a874bf08191b8118f8d88c9c90e-lowispike` (`DEEP_GPT`, the link the Oct 15 scanner bar used, commit 9d517f2; the only chatgpt.com/g/ URL in the whole git history). Built by `deepLink()` in index.html.
- No question is pre-filled (`?q=` would make ChatGPT send a message for him); it opens the GPT, nothing more.
- The link has no `data-b3`, so the scanner's delegated click handler (which calls `preventDefault`) never touches it. In the iPhone home-screen app iOS opens a `_blank` link outside the app, and the app stays on the Scan screen.
- The in-app photo sheet (`deep-analyze.js`, `deep-analyze.css`) is removed, with its service-worker entries; the 2026-10-21 Scan / Fuel / Gap line saying Deep analyze reads a photo in the app is replaced by this. Barcode, Type the number and Fuel's Log meal / Snap are unchanged.
- Subtitles say where the tap goes: "Opens the LOWiSPIKE GPT in ChatGPT" (DE / ES too).

Checks: `tests/deep-gpt-shortcut.test.cjs` (new), `tests/orb-scan`, `tests/scan-fuel-gap`, `tests/grandma-test`, `tests/ui-scanner-close` updated.

## 2026-10-21 · Affiliates page: spacious, one thing per screen (after Eden's Plan screen)

Eman on the simplified page: "No, it looks shit. I wanted to be like this. It shouldn't be cramped", with a screenshot of Eden's Plan screen. Decision criteria (no questions, per Eman): copy that structure and spacing exactly, keep every piece of content and both copy buttons, never show more than one thing per screen, and stay in the LOWiSPIKE dark galaxy look instead of Eden's white.
- Start screen: segmented control top left (Webdesign | UGC, the pick is filled), small pill "Kostenlos · etwa drei Minuten", huge bold condensed headline "Lass uns dein Video bauen.", one muted line, one dark-glass card with three rows (icon tile, bold title, one muted line: Dein Skript, Aufnahme & Caption, Dein Verdienst), one big full-width "Start →" button, the WhatsApp line under it, and a round "€" button bottom right that opens the earnings. The round button sits in the start screen's own bottom space, never over content.
- Then three screens, each with a round back button: 1 Skript (series switch, on-screen text, scenes as rows, "Skript kopieren"), 2 Aufnahme (shot list, caption with "Caption kopieren", the personality/HeyGen/Higgsfield tip), 3 Verdienst (four levels, example totals, terms). The address keeps series and screen (#ugc, #ugc/shots, #webdesign/earn).
- Look: dark blue galaxy with two glowing rings and a faint dot grid; cards and buttons are dark glass with a glowing cyan-to-green gradient edge (no white borders); the Start button is the brand cyan-green glow with dark text.
- `tools/blueprint/check.cjs` walks the new flow and, on every screen (standalone and inside the in-app frame), fails on overlaps, stacked blocks closer than 8 px, icon touching text, text leaving its card, a headline under 30 px, sideways overflow or small tap targets. In the frame it taps the real point and fails if anything covers it.
## 2026-10-21 — "What can I buy here?" has one entry point: Home's Fuel bubble

**Status:** Accepted

**Context:** Eman on the Cook screen: "The What can I buy emergency button already exists in the homepage, right? Does it make sense to also have it in there again? If not, remove it." store-picks.js injected the card under Cook it / Shop it, in the shopping list, the cart and the Meals sheets, on top of the Shop orb in Home's Fuel bubble.

**Decision:** One entry point only: the Shop orb in Home's Fuel bubble (home-blooms-v2.js). It is an in-store feature, so it stays with Home, not Cook. The injected card, its MutationObserver, sosHTML and the .stp-sos styles are removed. tests/what-can-i-buy-once.test.cjs keeps it to exactly one caller of LowiStorePicks.open.

**Consequences:** Cook it / Shop it flow straight into the recipe cards. A new place for the panel needs a new decision entry and an update to that test.


## 2026-10-21 — The tutorial reads itself aloud with recorded natural voices

**Status:** Accepted

**Context:** Emmanuel opened the tutorial after the plain-words update and said: "I have to read through it, that's not what drunk grandma likes. Where is the speaker? So I can just listen to it." The device voices (Web Speech) sound robotic on many phones, differ per device and are missing offline on some.

**Decision:** Every tutorial card's companion picture is a speaker button. One tap turns sound on and reads the card; following cards read themselves until it is turned off; the choice is remembered. The voice is recorded ahead of time with Microsoft neural voices (Ava, Seraphina, Ximena), one MP3 per card and language with word timings, so the spoken word lights up. Clips play only when their words match the card exactly; otherwise, or offline before a clip was heard, the device's best voice reads it. No auto-advance: the user still taps Next, so they can look at what is spotlit. The Add to Home Screen guide and companion setup get no speaker for now: their text is short, sound cannot start before the first tap there, and that funnel is owned by the first-visit work.

**Consequences:** Changing tutorial words means recording again with `python3 tools/tutorial-voice/build.py` (only changed cards); `tests/tutorial-voice.test.cjs` fails until the clips match. About 8.6 MB of clips sit in the repo and are fetched only when played (about 60 KB per card), then kept on the phone.
## 2026-10-21 — First-visit screens: simple, plain, say what it is, show proof

**Status:** Accepted (supersedes the 17 Oct "how you play before the account" step)

**Context:** Emmanuel: "I would also like you to apply everything he said in this video" (Build in Public TikTok, "Simplify conversion pages"). The video's points: a simple create-account screen beats a nice-looking complicated one; use the friendlier unit ("one month" beats "30 days"); the headline must say what the app is plus social proof, not a vague line ("Let's start your fun and easy growth" means nothing); no cute copy on buttons ("Premium" beats "Boss up, go premium"); make it obvious what it is and why the person benefits. Our start had five screens before the account, opened with "Someone is waiting for you.", and used "Say hi", "Got it", "Nice to meet you" and "Save your companion's world: free account" as buttons.

**Decision:** The start is three screens. 1: "Eat smarter and lose weight, as a game.", the five habits, and the founder proof "Made by Eman, who lost 45 kg in 7 months." (from the founder bio already in the app), button "Get started". 2: first name, "Continue". 3: first XP, "Create free account". The how-you-play controls are taught inside the app (hints, tutorial), not before the account. The Add to Home Screen guide, the first screen a phone visitor sees, opens with "Free app: eat smarter and lose weight, as a game." The account form doesn't ask the name again when the start already has it ("Two fields. That's it."). The shopping rhythm is read back in plain words (7 = "Once a week", 30 = "Once a month") and the summary uses them. The page title and link preview say what the app is and carry the proof. Starter-plan buttons say "Start" and "Done". EN, DE, ES. There is no paywall or Premium button in the app, so the "Premium" example has nothing to change.

**Consequences:** `tests/onboarding-current.test.cjs` locks 3 screens, the proof in all three languages and the plain button words. `tools/conversion/shots.cjs` checks the screens in real browsers (fit, nothing covered, no errors) and takes screenshots. `ONBOARDING.md` lists the new flow. The Affiliates page is left to its own simplification task.
## 2026-10-21 20:30 CEST: Community rebuilt in Eden's style, in LOWiSPIKE's galaxy (decided by the agent)

Emmanuel: "Start to rebuild design for the whole community when clicked on it because I don't like how it looks at all. Nothing on there." References: Eden's community room and its Plan screen. Theme: LOWiSPIKE, not white.

Decision criteria:
1. One clear thing per view; spacious; big bold headline, small muted body text.
2. Never white: dark-blue galaxy, dark glass with glowing cyan edges, the cyan-to-blue gradient only on the one primary action. Every text WCAG AA.
3. Nothing that worked before stops working (rooms, galaxy chat, camera/mic, day/night, hold-for-settings, /affiliates/ and /create/ links, overlap fixes).
4. Stay out of the parallel rebuilds: the room thread (chat-tg task) and the Affiliates page body (aff-eden task).

What was decided:
- The unreleased "phase D" flat look (text tabs, no boxes) is dropped: Eman's references are glass pills and one card, not bare text.
- Sections: Eden's segmented pill. One glowing pill slides under the open section (`.rm-tabs::before`, index in `--rm-i`).
- Chat section = the Community landing (Eden's Plan): live pill (people here, room), headline "Your galaxy", one muted line, ONE glass card with Galaxy chat, Replies and Room (icon tiles, thin dividers), one big "Open galaxy chat" button. Faint star dots and two glowing rings on a dark galaxy stage (dark in day mode too). Creation and Affiliates are not repeated in the card; they are in the pill control.
- Galaxy chat: a round floating back button and a centred name pill (the room thread's own top bar belongs to the chat-tg task; if it brings a back button, hide `.rm-crumb`).
- Members (Rooms & people): bottom sheet with a grabber, big title, people as avatar chips in their chat colour, rooms in one card with thin dividers.
- Creation page (`create/index.html`): same Plan layout; the card lists what the studio will do, each marked Soon; the one button opens Affiliates, where ready-made scripts already exist (standalone: Open LOWiSPIKE).
- The Room (galaxy) view stays the view Community opens on: the regression tools and the tutorial expect its composer.

Checks: `tools/community-hub/probe.cjs` (contrast, overlaps with Day/Night and the picture, real centre taps, segment glow under the open tab, landing fit and order, members sheet, Open galaxy chat, Creation button) on iPhone SE, iPhone 13, iPad and iPhone 13 day.

## 2026-10-22 Affiliates: every script read aloud in the tutorial's voice (item 35)

Emmanuel (voice message, 21 Oct evening): "I would like the affiliate texts, their scripts, to also have that voice. The same tutorial voice, so that they don't have to just read. They can just listen to what they can say in the camera."

- Voice: the app's shared recorded voice, `app-voice.js` (LowiVoice), which uses the tutorial's three voices (en Ava, de Seraphina, es Ximena). No second engine: `affiliates/script-voice.js` only queues lines and draws buttons. `tools/app-voice/phrases.cjs` has an `affiliates` source (every scene line of every track in en/de/es, plus every LOWiSPIKE day line 1 to 30) and `build.py` records them like the rest of the app (210 new clips, about 4 MB; app-voice/ is now about 24.7 MB of its 30 MB cap). The robot device voice is only the fallback if a clip cannot load.
- UI on the script screen: one big "Listen to the script" button (tap again = Pause, then "Continue listening", at the end "Listen again"), a round start-over arrow next to it while it is in use, "Scene 2 of 6" under it, a small play button in the corner of each scene and next to the LOWiSPIKE day line. The line being read lights up and scrolls into view.
- Only what is unlocked is read: the free preview reads scene 1 ("Listen to scene 1").
- Sound starts only from a tap. `window.LOWI_VOICE_TAP_ONLY` (set by script-voice.js) stops app-voice.js from its silent first-touch unlock on this page, so an affiliate's own music is not interrupted by a random tap; the app keeps its unlock.
- Stops when the script changes (track, day, language, unlock), when leaving the script screen, when the page is hidden, and when the Community tab hides the Affiliates frame (checked every 0.7 s while playing). Inside the app it tells the parent (`lowi:media`, id `aff-voice`) so world sound pauses, and pauses itself when another voice in the app starts. Pause resumes at the start of the line it stopped in.
- Shared code change, backwards compatible: `app-voice.js` finds `app-voice/` and `app-voice-data.js` next to its own script URL (`LowiVoice.BASE`), so it works from `affiliates/`. In the app that is the same folder as before. Inside the app the frame copies the app's `lowi-build` so the clip list comes from the phone's saved copy.
- Checks: `tests/affiliates-voice.test.cjs`; `tools/blueprint/voice-check.cjs` (WebKit iPhone SE de, iPhone 13 en, Chromium Pixel 7 es, locked preview, in-app frame; audio output stubbed, so it shows which recorded clips are asked for, in order, and that the robot voice is never used).

## 2026-10-22 Misty's sheet: the Food journal is removed

Emmanuel (Seven): "I don't understand the food journal section. Either remove it or make it logical, but I'd say remove it."

- Misty's sheet has two equal doors under the name: Forms ("How it evolves") and Glow ("Aura and finds"). The Food journal door and its screen (herb-quests.js dexHTML / collectionHTML, "Foods you have tried") are gone, with their strings in EN, DE and ES.
- Meal history lives in the Fuel sheet's meal list (today's meals, with photo thumbnails from meal-journal.js). There is no second place for meals.
- Kept for XP and fair play: herb-quests-core.js journal(), discover(), newFoods(), FOODS and the "same meal twice counts once" rules. They feed no screen now except a small toast the first time a food is logged ("First time logged: ...").
- Other links: the Herb path's "Food journal" link is removed, its compact link says "Quests". `data-sp="collection"` (Misty's older Discovered panel "See all") now opens only your scanned products, titled "Your scans". The scan hint "Adds it to your food journal" says "Adds it to your scans". No tutorial card, achievement or deep link pointed at the Food journal.

## 2026-10-23 One board: the companion Ranking in Community (Care board card and Milestones row retired)
- Asked by Eman (voice, 23 Oct 9:49): one leaderboard like the Spazier Club "Rangliste" screenshot, in LOWiSPIKE's bubble look, with people's companions instead of profile pictures ("like Pokemon": who levelled up and cared for their companion best), in the Community bar next to Rooms, Chat, Creation and Affiliates. "We have a care board and some XP human meter board ... nuke them."
- Ranking is the fifth Community tab (community-tab-order.js IDS, ranking.js + ranking-core.js + ranking.css). Week and Month rank the care sunbeams (care-board-core.js scoreOf, capped at 12 a day), All time ranks companion XP. Companions show only from a published look; otherwise a hidden orb.
- Retired surfaces: the Move page's Care board card (nav-moves.js nm-lbcard) and its Milestones row (nm-milescard: people's levels & streaks, the board read as the "XP human" board). Every old way in now opens Community > Ranking: index.html openBoardTab (Profile row "Ranking", "See Ranking", the Top button), nav-moves open('lb'), Settings "Ranking" (id still 'care').
- Kept: all care, sunbeam, XP and level data and code (care-board-core.js, sun meter, levels, the Milestones sheet code reached from the friends tree). Nothing in the database is removed.
- Open: the database still accepts faked ranking rows until Eman runs the anti-cheat SQL in Supabase (see the queue item ranking-1).

## 2026-10-23 Move bubble: three daily step ranges, like Sleep (decided by Eman on a call)

- Eman: "People already have step counting apps. We don't have to be a step counting app ... at the end of the day someone can look at the phone and see how many steps they took, and then just tap a button ... just like with sleep." Then: three bubbles like Sleep, "casual, steady and epic", under 5k, 5k-10k and 10k+.
- The Quick / Medium / Long / Epic minute guesses are replaced in the Home Move bloom (and the older Move bloom) by Casual (under 5,000 steps), Steady (5,000 to 9,999) and Epic (10,000 or more). Epic keeps Emmanuel's name. Mirror stays first in the bloom (its removal is the separate symmetry request).
- One range a day, today's total: another pick replaces it (XP and energy go down too), the same pick again does nothing (no XP, no dance). Casual fills 1/3, Steady 2/3 and Epic all of today's Move part; XP 5 / 11 / 16 (16 was already the daily cap).
- The ranges are draft defaults the agent suggested and Eman accepted; they are not health advice. Steps are the user's word: the app does not count or check them, and the copy says so. No native step sync is part of this.
- Data contract: DATA_CONTRACTS.md (Home Move step range). Onboarding Move card and its voice clip updated in EN / DE / ES.

## 2026-10-23 No flat glint oval on any bubble (the "shadow" disc next to Misty)

**Context:** Emmanuel (iPhone screenshot, Misty flying in the metabolic world; he circled a pale flat oval next to her): "Multiple times I've said that remove the shadow from every bubble ... That round thing's supposed to be their shadow or something, or a bubble reflection, I don't know what that is. Remove it." The oval was Misty's CSS glass glint, `#spBubble::before` (spirit.css `.sp-bubble:before, .sp-fast:before`: white `#ffffff60`, 31% x 9%, `rotate(-28deg)`). When Misty flies out of her bubble the shell stays, so the glint floats in empty space. Oct 17 copied it onto every living bubble (`living-bubbles.css .lb-bub::before`), Oct 18 onto the joystick (`home-orbit-v2.css #whPad.lb-live::before`), and companion.css had it on `.cf-bub`. The Oct 19 "no shadow" release removed the 3D glint lobe and `.lh-reflection` but not these CSS copies, which is why it came back.

**Decision:** No stylesheet draws a flat, hard-edged white oval in a `::before` / `::after` on any bubble. The five rules are deleted. The glass look stays: the 3D membrane's symmetric fresnel rim, the soft radial-gradient sheen inside shells (`.cf-bub`, `.o8-cell`, `#whPad`), the soft fading highlights of the Ranking bubbles (`.lb3-g`) and the start-screen orb, glow rings and floating cells.

**Consequences:** `tests/oct23-no-glint-disc.test.cjs` scans every root stylesheet and the inline styles for a plain-white, round, rotated pseudo-element. `tests/no-bubble-shadow-live.cjs` now also checks computed pseudo-elements and flies Misty out on autopilot (his screenshot's state). `tests/joystick-bubble-style.test.cjs` asserts the joystick has no glint, like the ring bubbles.
## 2026-10-23 Cell worlds speak real biology (feedback from a human-body-science student, via Eman)
- Why: "When we enter a cellular world, it doesn't even say what cellular world we're entering ... Why does he even have a name? He could have been named whatever the cell that they just entered is." Labels should let players learn almost passively.
- Entering a world shows a round living bubble: the organ small, the tissue as the value (Brain / Nerve tissue, Lungs / Alveoli, Heart / Ventricle, Liver / Liver lobule, Pancreas / Islet of Langerhans, Small intestine / Villi, Skeletal muscle / Muscle fibres). About four seconds, no tap, every entry. The bloodstream hub stays home and has no bubble.
- Guides are named after their real cell type: Neuron, Alveolar cell (type I), Cardiomyocyte, Hepatocyte, Beta cell, Enterocyte, Muscle fibre (EN/DE/ES). Misty is unchanged. Gossip rewritten without pronouns and corrected (the beta cell no longer sends glucagon; that is the alpha cells).
- Readings chosen: gut = small intestine (villi), heart = inside a ventricle (red cells + trabeculae carneae), lung guide = type I alveolar cell, muscle = skeletal muscle.
- Labels: the nearest key object in view (world-sci-core.js TAGS, mesh names sci:<kind> in body-world-regions.js) gets one small glass label; tap for one plain sentence. The first meeting per kind per session opens the sentence for ~5 s unless the guide talks. Sources: world-sci-core.js SOURCES.
- Files: world-sci-core.js, world-sci.js, world-sci.css (loaded with the guides in apple-ui.js), tests/world-sci.test.cjs, tools/sim/sci-names-probe.cjs.

## 2026-10-23 Flying out reveals the universe gradually; a place Misty flies into never disappears (Eman, on a call)
- Out of the bubble: the spirit world used to switch on in one frame when the camera passed the World Map distance, already at the galaxy's 72 % (probe on main: stars 0 -> 0.58, a world 0 -> 0.47 in one frame). Now one eased reveal (body-world-3d-scene.js cosmosRv: camera way out over 36 units, ~0.7 s in time, a faint 16 % from the breakout on) multiplies everything out there, so it shows through the thinning bubble and the fading tube. Home itself is unchanged (reveal target 0 there).
- Into a world: the Oct 23 body-place veil (places fade behind Home bubbles) also ran while Misty was flying, against bubbles the clean flight view had already hidden, so the place she flew to faded to 0 (probe on main: 26 of 73 samples near the target). Now no veil while she is out (mf-on / mf-galaxy) or while the camera flies to a place, and a faded-out bubble never veils. At Home idle the veil works as before.
- Probes: tools/cosmos-reveal-probe.cjs, tools/veil-entry-probe.cjs. Test: tests/flight-reveal-veil.test.cjs.

## 2026-10-24 The cycle shows up on Home: a phase ring on Misty's bubble and a section in her hold card (Emmanuel)
- "An information window alone isn't a real benefit." With cycle tracking on (and only then): a thin ring on Misty's Home bubble in the estimated phase colour (Rest rose, Grow mint, Glow gold, Gather violet, the cell world's own colours). Decoration for the eye (aria-hidden); screen readers get "Estimated cycle phase: Grow" as the bubble's description. No pulse; reduced motion drops the fade.
- The way in from Home is a "Your cycle" section in Misty's hold card (misty-hub.js), right under her two doors: day, phase, tap opens My cycle. First planned as a long press on Gap, but that gesture was taken (the last meal time editor, fast-edit.js), and Emmanuel moved it into Misty's card: "a section within the existing long-press menu on Misty, rather than being its own separate trigger". The Gap long press is unchanged.
- Discreet: no push, no Community post, no What's New line for this. Tracking off: no ring, no section, nothing hints at it. The profile opt-in stays.
- Checked: a first day entered 7 days ago is day 8 (also when moved with "started another day", and across the Oct 25 clock change). Test: tests/cycle-home.test.cjs. Probe: tools/probe-gap-hold.cjs. Benefits audit (proposals only, nothing built): /home/sprite/lowispike-cycle-benefits-audit.md on the VM.

## 2026-10-24 Hold Scan opens every bubble; the tutorial teaches it instead of two fingers on Misty (Emmanuel, via his agent)
- Holding the Scan button on Home (about half a second, finger still, under 12 px drift; touch, pen or mouse) opens every bubble at once in one circle round the companion (bloom-ring.js, same toggle as before: hold again closes, a tap on the empty space closes). A quick tap still opens Scan. A recognised hold never also opens Scan: the click after it (and the iOS touchend) is swallowed. If the page is too busy for the timer, the lift still counts as a hold by the events' own timestamps.
- The tutorial card "Two fingers" (misty-two) is replaced by "Hold Scan" (scan-hold, right after the Scan card, tried after the tour so a slip never opens the camera mid-tour), plus new-scan-hold in part 'new'. The two-finger tap on Misty still works as a quiet duplicate but is no longer taught; GESTURES lists scan-hold instead. The older What's New sentences that taught two fingers on Misty now say hold Scan.
- Tests: tests/scan-hold.test.cjs (bloom-ring.js on a fake page driven like a finger: tap, hold, drag, busy page, off Home, other buttons; the tutorial text in EN/DE/ES). Browser check: tools/check-scan-hold.cjs (WebKit needs tools/sim/no-media-init.js in this VM: its headless WebKit crashes when a page creates an <audio>).
