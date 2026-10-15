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

## 2026-10-15 — Community spirit-square identity and honest delivery

**Status:** Implementation of the assigned Community brief on an isolated branch; integration and acceptance pending.

**Decision:** Keep the existing `all` room as a shared gathering place, present the spirit-town direction inside Community, retain the existing profile bubbles, and show existing personality privately with explicit optional sharing. Remove fabricated chat activity. A stable-ID outbox makes uncertain delivery recoverable; reports require acknowledgement, blocking persists, and device quiet hours silence chat notices. Birthday/health are excluded from chat profiles; room membership never infers health. No XP for navigation or chat taps.

**Consequences:** Room taxonomy, discovery/routing and matching remain unresolved; none is implemented as a settled rule. Home/Scan are unchanged. New optional backend tables/policies and old-public-profile remediation require live review, and browser/device/two-account evidence is still outstanding. See `COMMUNITY_CHAT.md`.
