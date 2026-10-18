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

## 2026-10-18 Sleep grows Misty by tier

**Context:** Emmanuel logged under 6 hours on the new Sleep bubble and asked what it does. He wants sleep, like the other habits, to grow Misty: 7 hours or more grows her the most, 6 to 7 hours a little, under 6 hours nothing.

**Decision:** New `sleep-growth.js` listens to the Sleep bloom's `lowi:sleep` event and keeps exactly one ledger entry per local day (`eventId 'sleep:<day>'`, src `sleep`) equal to `XP[band]`, through `LowiVitalsBridge.awardWith/unaward`, so it moves S.xp, the level and the herb stage like water or Moves. Provisional values chosen by the coding task for Emmanuel to tune, in one frozen table `LowiSleepGrowth.XP`: 7 h or more 10 XP, 6 to 7 h 5 XP, under 6 h 0. Nothing above 7 h, never minus points, no shaming words. Correcting pays or takes back only the difference; Clear and Under 6 h take it back; repeats and reloads pay nothing. On start it settles today only if this device has today's log (health is device-only while the ledger syncs, so another phone never takes XP back). Feedback: a plain toast (`+5 XP for Misty · 6–7 h (7 h or more gives 10)`, `Sleep cleared · 10 XP taken back`, ...) and a small `+XP` that rises off the Sleep bubble (fades in place with reduced motion). No sunbeam: sleep stays off the Care board.

**Consequences:** Checks: `tests/sleep-growth.test.cjs` (runs the real `award()`, `levelOf()` and bridge `awardWith/unaward` cut out of index.html with the real LowiHerbCore: tiers, repeats, upgrade/downgrade/clear, reload, day rollover, account switching, level-up, words, no sunbeam, wiring) and `tests/sleep-growth-live.cjs` (real taps at 390x844 Chromium, WebKit iPhone 13, iPad portrait WebKit and iPad landscape Chromium; Supabase and every write blocked). Tune the values in `sleep-growth.js` XP only.
