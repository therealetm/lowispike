# LOWiSPIKE data and event contracts

## Canonical app state

`lowispike.v2` is the canonical local state. Its current shape is initialized by `fresh()` in `index.html`:

```js
{
  v: 2,
  onboarded: false,
  user: {name: "", bday: "", avatar: "", tags: []},
  xp: 0,
  ledger: [],
  streak: {count: 0, best: 0, last: "", days: {}, shields: 1},
  quests: {day: "", done: {}},
  logs: [],
  saved: [],
  trig: [],
  glow: [],
  health: {cycleOn: false, irregular: false, lastPeriod: "", cycleLen: 28, manualPhase: "", weight: ""},
  posts: [],
  reacts: {},
  hidden: [],
  blocked: []
}
```

Runtime modules may add compatible fields such as `herb`, `health.body`, `health.cyc`, daily plan state, or profile preferences. Always default missing fields on read. Never clear unknown fields during a migration.

## XP contract

- `S.xp` is the single total.
- `S.ledger` is the single reward history.
- Any repeatable or asynchronous completion must supply a stable `eventId`.
- `award()` returns `0` if an event ID is already in the ledger.
- The herb derives its stage from `S.xp`; it does not maintain or deduct a second XP total.
- Welcome energy (2026-10-19, `sun-meter.js` `WELCOME`): a new account's energy starts at 100% and eases out over its first 24 h (12 h full, 12 h fade). It is derived only from the ledger entry `eventId: 'herb-first:planted'` (written once by `herb-start.js`), never stored separately; an account with any ledger entry or meal log older than that planting (minus 1 h) never gets it. Do not rename, re-date or delete that entry.
- Only canonical `award(amt, label, el, src, eventId, opts?)` writes XP; `opts.quiet` (2026-10-15) skips only its own toast.
- Mounting, animation replay, notification display, restoring a view, taps (trusted or not), tab switches, opening sheets and navigation award zero. Since 2026-10-15 15:00 (user decision) `xp-tap.js` pays only completed actions that had no reward yet, via `award()` with eventIds: `discover:region-<id>` (5 XP, once ever), `care-sent:<day>:<n>` (5 XP, max 3/day), `fast-edit:<day>:0` (3 XP, max 1/day), and the streak bonus `combo:<day>:<n>`. `LowiTapXPCore.category(entry)` names the category of any ledger entry (src first; Move srcs are always `move`). Old src `tap` entries remain in the ledger and stay minor. Since 2026-10-16 the microbe buddies and the microbe collection are gone: `load()` in index.html removes ledger entries with src `buddy-add` / `buddy-bond:*`, subtracts their XP from S.xp (herb stage never regresses), and deletes S.buddies and S.microbes.

An XP ledger entry is:

```js
{ts, day, amt, label, src, eventId?}
```

Do not change the meaning of an existing `src` or `eventId` prefix without migration and replay tests.

## Local storage inventory

| Key | Owner | Contents/lifetime |
|---|---|---|
| `lowispike.v2` | Core | Canonical profile, XP, ledger, streak, quests, logs, saved items, health container, and local social state. |
| `lowi.auth` | Supabase client | Persisted authentication session. Never parse it as app state except for boot gating/migration. |
| `lowi_fast_v1` | Fast modules | Fast start/end/goal and history-related state. |
| `lowispike.foryou.v1` | For You | Local feed posts, likes, saved, hidden/reported/blocked, filter, and seed. |
| `lowispike.move.v1` | Move | Sessions, steps, step rewards, goal, equipment, format, duration, audio/safety settings. |
| `lowispike.chat.v1` | Chat | Local/fallback chat state. |
| `lowispike.shelf.v1` | Shelf/Cook | Products, votes, shopping/list state, swipes, shelf XP metadata, reports, and name. |
| `lowispike.r5.v1` | Food swipe | Liked/skipped/never/today state, last result, audio/notification preferences, MBTI. |
| `lowispike.swipe.shared.v1` | Shared food | Community-fed food swipe records cached on the device. |
| `lowi.xptap.v1` | xp-tap.js (retired) | Old per-day tap XP state. Removed on boot since build 20261015-150000; pending tap points are dropped, never paid. |
| `lowi.dex.v1` | Scan/Pokédex | Scan/catch view state and local scan data. |
| `lowi.camok` | Scan | Whether camera access previously succeeded; not permission authority. |
| `lowi.swaflo.prefs` | Swaflo | `{mode: "cook"|"buy", snack: boolean}`. |
| `lowi.swaflo.last-buy` | Swaflo | Last selected Buy product ID. |
| `lowi.recipe-book.<account>` | Recipe Book | Up to 250 normalized saved recipes, scoped to cloud UID or `local`. |
| `lowi.discovery.v1:<scope>` | Discovery | Records, contributions, flags, events, and discovery ledger per UID/phone. |
| `lowi.herb.tamagotchi.v2:<scope>` | Herb UI | Name, star sign/personality overrides, care history, highest/last-seen stage, equipment, and last action. |
| `lowi.health.<uid>` | Health migration/private state | Account-scoped health state on this device. Excluded from general cloud backup. |
| `lowi.appearance` | Appearance | Selected hour, weather look, and mood look. |
| `lowi.weather.v1` | `spirit.js` weather chip | Last Open-Meteo reading `{temp, code, ts, isDay?, sunrise?, sunset?}`; sunrise/sunset are epoch ms for the reading's location. Reused for 30 minutes; the weather sky ignores the condition after 6 hours. Only written when location permission is already granted or the user tapped the chip. |
| `lowi.sky.off` | Weather sky | `'1'` when the user switched the live weather sky off in Appearance; absent means on. |
| `lowi.theme` | UI | `dark`, `light`, or `sunrise`. |
| `lowispike.lang` | i18n | `en`, `de`, or `es`. |
| `lowi_sfx` | Audio | `{on, vol}` shared by reward and swipe sound systems. |
| `lowi.g1`, `lowi.g1.go`, `lowi.g1.bn`, `lowi.g1.auto` | Legacy guide/news | Guide progress, destination, seen release news, and automatic behavior. Do not use it for routine companion speech. |
| `lowi.gate`, `lowi.a1.skip`, `lowi.a2hs` | Onboarding/install | Account gate, skipped intro, and dismissed install prompt. |
| `lowi.f2.v1` | Meal continuation | Seen/completed post-fast meal continuation state. |
| `lowi.guides.v1` | Cell guides (`region-pals.js`) | `{v:1, met:{<world id>: firstMeetingMs}, lastBack:<index>, told:{<world id>: [lesson numbers]}, ok:{<world id>: [lesson numbers]}, since:{<world id>: visits}}`: which cell guides you have met on this device (each says hello only the first time), the last welcome-back line (never said twice in a row), which lessons each guide told you, which ones you answered Yes to in its "Remember?" check (never asked again), and later visits since its last question. Device only, not backed up. |
| `lowi-misty-held-bag` | Weak Misty pulled back in at a world's rings (`misty-hunt.js` `heldSay`) | `{left:[<line index>...], last:<index>}`: the shuffle bag of her held-back lines (every line once before any comes back, never the same twice in a row). Device only, not backed up. |
| `lowi.f3.open`, `lowi.f3.paid`, `lowi.f3.morn` | Daily Quest | Expansion, awarded quest IDs/bonus, and compact check-in section state. |
| `lowi.e1` | End of day | Daily close ritual and once-per-day reward state. |
| `lowi.n1`, `lowi.n1.log`, `lowi.n1p` | Reminders/push | In-app reminder settings/log and push subscription/settings snapshot. |
| `lowi.build`, `lowi.upd.failed` | Update system | Seen build and failed-refresh cooldown. |
| `lowi.demobots.t0`, `lowi.demobots.off` | Demo community | Local timing/control for demo members. Never cloud-sync as users. |

Session-only keys include `lowi.herb.voice.v3:<scope>` for non-repeating herb lines, `lowi.upd`/`lowi.updn` for update state, and `r2.welcome` for sign-in welcome behavior. Session keys must not become durable health or reward state.

## IndexedDB inventory

| Database/store | Owner | Purpose |
|---|---|---|
| `lowispike-media` / `videos` | For You media | Local video blobs, capped by the media subsystem. |
| `lowi-discovery-images` / `images` | Discovery | Account-scoped label/draft photos; keys are prefixed by the current scope. |
| `lowi-herb-reminders` / `state` | Herb + service worker | Current reminder configuration and last delivered local day. |

Do not move large media into `localStorage`. Do not expose one account scope's image under another scope.

## Browser event contracts

| Event | Detail | Producer | Consumers/invariant |
|---|---|---|---|
| `lowi:reward` | `{entry, beforeXP, afterXP}` | Canonical `award()` | Herb care mapping/evolution and UI refresh. It fires after state persistence. |
| `lowi:care` | `{kind, id}` | Completion bridges when no XP is awarded | Herb visual care only. `id` must be stable and deduplicated. |
| `lowi:state` | Feature-defined refresh signal | Host/state modules | Herb/body refresh. It must not itself award XP. |
| `lowi:meal-logged` | `{lvl, via, photo, xp, title}` | Meal continuation/logging | Quest/follow-up surfaces. No raw photo bytes in the event. |
| `lowi:layout` | `{lay}` | `LowiLayout` | Responsive modules. It communicates layout state only. |
| `lowi:weather` | The painted reading (`lowi.weather.v1` shape) | `spirit.js` `paintWeather()` | Weather sky repaints at once. Read-only; no XP. |
| `lowi:sky` | `LowiSkyCore.sky()` result `{src, cond, temp, day, phase, lightSrc, wet, stars}` | `weather-sky.js` when the look changes | Optional listeners. Read-only; no XP. |

If a new cross-module event is necessary, document its exact payload here and add a replay/idempotence test.

## Supported global bridges

Many older globals exist, but new external modules should prefer these bounded bridges:

| Global | Contract |
|---|---|
| `LowiR2` | DOM helpers, toast, theme, sheet/open/close, cloud accessor. |
| `LowiHost` | Navigation, canonical reward access, image resize, and app integration. |
| `LowiVitalsBridge` | Read canonical state/profile, initialize herb state, route meal care, and complete deduplicated care actions. |
| `LowiSwafloBridge` | Read the existing recipe catalogue, register adapted recipes, access saved swaps, and save once into core state. |
| `LOWI_CLOUD_X` | Supabase client and normalized auth/live state. |
| `LowiLang` | Current language, translation lookup, and registration. |
| `LowiSFX` | Shared sound preference and event sounds. |
| `LowiHerbTamagotchi` | Open/close/refresh companion, derive current model, render plant, tap/care/evolution controls. |

Do not introduce another global state store when one of these bridges can carry the behavior. Do not call internal renderer functions from a feature when a bridge exists.

## Cloud data used by the client

The client currently references these Supabase resources:

| Resource | Use |
|---|---|
| `profiles` | Public/member profile and care board fields (see below). |
| `user_state` | General per-user backup/restore after private keys are removed. |
| `posts`, `post_likes` | Community posts and likes. |
| `messages`, `reactions` | Community chat and reactions. |
| `swipe_foods` | Shared food swipe submissions. |
| `products`, `product_catches`, `product_reports` | Product catalogue, Pokédex catches, and reports. |
| `app_admins` | Checks administrative access for gated management UI. |
| `vip_messages`, `course_modules`, `mentoring_requests` | No longer used by the client: the Level 7/8/9 unlocks were removed on Oct 17, 2026. Data left in place. |
| `cycle_sync` | Explicit opt-in cycle synchronization, separate from general state. |
| Storage bucket `media` | Community photo/video uploads. |
| Edge function `n1-push` | Saves/removes push subscriptions and reminder snapshots. |

Server authorization depends on Supabase Row Level Security and edge-function validation. Client-side hiding is not authorization. Schema/RLS changes are not present in this repository; confirm the live backend before changing a payload.

### Care board fields on `profiles` (since Oct 17, 2026)

The XP leaderboard and the Bronze / Silver / Gold unlocks (VIP channel, courses and video modules, 1:1 mentoring at Levels 7 to 9, which nobody could reach because levels stop at 6) were removed. The board in Move ranks care instead: the sunbeams Misty got from you, the same daily points as her sun on Today (`sun-meter.js` `model()`, at most 12 a day). `care-board-core.js` (`LowiCareBoard`) holds the math.

No column was added. `xp_week` / `xp_month` carry this week's / this month's sunbeams, and `wk` / `mo` carry `care1:<period>:<full-sun days>` (period `YYYY-MM-DD` for the Monday, `YYYY-MM` for the month). A row whose key is not tagged for the current period counts 0, so builds before the care board (bare-date keys, weekly XP) and new builds never mix numbers. `xp` (all-time XP) and `lv` are unchanged and still drive levels. The client stops writing these four fields until the sun meter has loaded, so an early push never blanks a good row.

The server tables `vip_messages`, `course_modules` and `mentoring_requests` were left untouched; no screen reads or writes them any more.

## Privacy boundaries

- `health` is removed from `lowispike.v2` before general `user_state` backup.
- Body diary data lives under `S.health.body` and remains local through that exclusion.
- Sleep log (Home ring Sleep bubble, home-settings-sleep-v2.js): `S.health.sleepDays = { 'YYYY-MM-DD': { band: 'under6'|'6to7'|'7plus', ts } }`, written only through `LowiVitalsBridge.state()/save()`, 120 days kept, local through the same exclusion. It pays no XP and no sun energy. The shell's earlier fallback key `lowi.sleep.v1` (`good`/`ok`/`short`) is left as it was and is never converted into hours. Document event `lowi:sleep` `{day, band|null, value, source}` on every change.
- Cycle sync is off by default and isolated in `cycle_sync`; enabling it must be explicit.
- Camera and notification permissions are requested in context, never on every launch.
- Photos/videos can be large or identifying. Upload only after the user explicitly posts or contributes them.
- Never infer a diagnosis, glucose value, fertility state, or causal health conclusion from these records.

## Migration rules

1. Read old data defensively and add defaults without deleting unknown keys.
2. Never reset `xp`, `ledger`, `streak`, or herb `highestStage` during a UI migration.
3. Preserve stable IDs and event IDs across refresh, retry, offline restore, and cloud replay.
4. Migrate account-scoped keys explicitly when a local user signs in; never merge one UID's private records into another.
5. Test a missing-field state, current state, malformed JSON, blocked storage, and duplicate-event replay.


## Spirit contracts

`LowiVitalsBridge.logMeal({id,t,macros,photo,via})` adds one canonical log with `eventId=meal:<id>`, awards existing 15-XP meal care at most five times daily and returns `{log,xp}`. Retrying returns the original log and zero XP. Editing macros awards zero meal XP. Missing macro values are `null`, never zero. `user.macroGoals` stores optional protein/fiber/sugar goals. Bonus IDs are `macro-goal:<local-day>:<field>` and award 20 XP once; sugar needs explicit day completion and sugar values for every logged meal.

Water retains `lowi_fast_v1.water` and adds stable `waterEvents`; the existing ledger awards 2 XP at most eight times daily. A replay does not increment glasses. Photos and unknown state fields are retained if storage fails; saves report failure instead of clearing images. Meal events add `{id,title,macros,xp,via,photo}`; `photo` is a boolean in events, not bytes. Spirit core merges remote and local feed IDs without discarding fallback media. No backend post deletion or storage migration is performed.

## Sign-in handoff (Safari -> Home Screen app), since 20261014-232000

- Table `public.auth_handoff(code_hash text pk, user_id uuid -> auth.users on delete cascade, created_at, expires_at, used_at)`. RLS on, no policies, no grants to anon/authenticated: only the `auth-handoff` edge function (service role) touches it. Rows older than a day are deleted on issue.
- Edge function `auth-handoff` (verify_jwt off, checks the bearer itself; CORS: therealetm.github.io + localhost): `issue` (account bearer) -> `{code, expires_in:1800}`, retires that user's older open codes, max 30/hour; `redeem {code}` -> `{token_hash}` (atomic single use, expiry checked) for `auth.verifyOtp({token_hash, type:"magiclink"})`; `revoke` (bearer) retires open codes.
- Client: `window.LowiHandoff` (script `#hofjs`). Clipboard text `... LOWI-XXXX-XXXX-XXXX`. CacheStorage `lowi-handoff` / `./__lowi_handoff__` holds `{c, exp}`; sw.js keeps that cache across updates. Nothing goes into URLs, the manifest or logs.


## World-first Home
Home reads canonical XP, companion and fasting state through the existing bridges. `lowi.aura` stores the selected XP-unlocked aura; invalid or locked values fall back to the default. Opening sheets, zooming and navigating do not award XP. Existing fasting-start editing and persistence are unchanged.
## Community chat (pending integration, 2026-10-15)

- `lowi.community.draft.v1:<auth uid>`: `{draft:{text,reply,retryId?},outbox:[{id,uid,by,t,ts,re,status,rx}]}`. Stable IDs survive reload/ambiguous responses; pending records reopen as unconfirmed. No automatic resends or general cloud backup. Newer text is not overwritten by a failed older send.
- `lowi.community.prefs.v1:<auth uid>`: quiet-hour controls (default 22–08, device clock), `readAt`, and `blocks` keyed by blocked UID (`blocked,name,dirty`). Dirty block/unblock operations override a stale account snapshot and retry on reconnect. Device-only persistence is named if sync is unavailable.
- `lowi.community.cache.v1:<auth uid>`: recent shared messages only, no birthday/health/profile fields. Signed-out/other-account drafts are never merged. Existing `lowispike.chat.v1` remains a legacy bridge/cache; it is not the draft/outbox store and never seeds a real room.
- `window.LowiCommunityHost`: bounded read/write adapter for the existing cloud arrays/client, own safe identity, existing bubble rendering, sheets and activation. `window.LowiCommunity`: idempotent UI/messaging entrypoints; owns no XP or health state.
- Document event `lowi:chat`: `{type,id}` where type is `auth`, `ready`, `reconnect`, `status`, `message`, `reaction` or `delete`; ID is a message ID where relevant. No health, birthday or credentials in events. Replays reconcile by ID, without another channel/listener.
- Unapplied optional tables: `community_identities` (explicitly shared personality/sign, never birthday/health), `community_blocks` (private account list), `community_reports` (reason/message ID, own acknowledged reports). Existing `messages`/`reactions` use the original shared-room contracts. Actual RLS/realtime/schema remain unverified. `supabase/proposals/community_chat_20261015.sql` is a review proposal, not a completed backend deployment.
- Future legacy public profile writes clear birthday/type/sign; the private local profile is unchanged. Older published records and old clients require server-side privacy remediation before acceptance. See `COMMUNITY_CHAT.md`.

## Shopping rhythm (`lowispike.shopplan.v1`, Oct 17 2026)

`{v:1, every: int 1..60 | null, days: int[0..6] (0 = Sunday), store: string <= 60, updated: ms, skipped: bool}`. Written only by `LowiShopPlan.set` (shop-plan.js) after normalisation by `LowiShopPlanCore.normalize`. `every` is only what the person typed; `null` means not set. Event `lowi:shopplan` fires after each save. `LowiShopPlanCore.dueState(plan, lastCheckInMs, nowMs)` returns `unset | fresh | due | grace | lapsed`; it never records check-ins itself. Included in the cloud backup through the `lowispike.` prefix.

## Store ranges (`data/shop/<range>.json`, Oct 17-18 2026)

`{chain, name, country, source, sourceUrl, scope, note, built, count, cols:[n,b,k,c,s,f,p,fat,kcal,u,q,g,im], rows:[[...]], images:{source, base, withPhoto, built, note?}}`. Built by `tools/shop-data/build.py`, then `tools/shop-data/add-images.py` fills `im`: the Open Food Facts front photo for barcode `g`, stored without `https://images.openfoodfacts.org/images/products/` and `.200.jpg` (only the file part when the folder is the usual 3/3/3 barcode split). `LowiStorePicksCore.photo(p, 200|400)` turns it back into the exact URL OFF returned and accepts nothing else; `link(p, data)` gives the OFF product page; `explain(r)` gives the numbers behind Best/Good. Ranges are chain-wide catalogue tags, never one shop's stock. Store-picks state `lowi.storePicks.v1` is unchanged.

## Meal slot (Oct 19, 2026, Log meal: Breakfast / Lunch / Dinner / Snacks)
- `S.logs[i].slot`: optional, one of `"breakfast" | "lunch" | "dinner" | "snack"`. Missing = unknown (older logs, plan meals, other entry points).
- Set by `LowiVitalsBridge.logMeal()` from `data.slot`, else from `window.LowiMealSlot` (`{slot, at}`, set when the user picks a slot in Log meal; valid for 10 minutes so the Scan and Snap flows log into it).
- `mealDup()`: the same food in a different slot today is not a duplicate; a log without a slot matches any slot.
- `lowi:meal-logged` event detail carries `slot` ("" when none).
- Snacks to buy: `localStorage["lowi.snackBuy.v1"]` = `[{id, n, at, got}]` (got = 0 while still to buy, else the time it was ticked). Device only.
