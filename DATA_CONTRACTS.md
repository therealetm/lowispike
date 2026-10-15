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
- Only canonical `award(amt, label, el, src, eventId, opts?)` writes XP; `opts.quiet` (2026-10-15) skips only its own toast.
- Mounting, animation replay, notification display, restoring a view, taps (trusted or not), tab switches, opening sheets and navigation award zero. Since 2026-10-15 15:00 (user decision) `xp-tap.js` pays only completed actions that had no reward yet, via `award()` with eventIds: `discover:region-<id>` (5 XP, once ever), `buddy-add:<id>` (5 XP, once ever, from window event `lowi:buddy-added` {id, name} in microbe-buddies.js), `care-sent:<day>:<n>` (5 XP, max 3/day), `fast-edit:<day>:0` (3 XP, max 1/day), and the streak bonus `combo:<day>:<n>`. `LowiTapXPCore.category(entry)` names the category of any ledger entry (src first; Move srcs are always `move`). Old src `tap` entries remain in the ledger and stay minor.

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
| `profiles` | Public/member profile and leaderboard fields. |
| `user_state` | General per-user backup/restore after private keys are removed. |
| `posts`, `post_likes` | Community posts and likes. |
| `messages`, `reactions` | Community chat and reactions. |
| `swipe_foods` | Shared food swipe submissions. |
| `products`, `product_catches`, `product_reports` | Product catalogue, Pokédex catches, and reports. |
| `app_admins` | Checks administrative access for gated management UI. |
| `vip_messages`, `course_modules`, `mentoring_requests` | Level 7/8/9 unlock features. |
| `cycle_sync` | Explicit opt-in cycle synchronization, separate from general state. |
| Storage bucket `media` | Community photo/video uploads. |
| Edge function `n1-push` | Saves/removes push subscriptions and reminder snapshots. |

Server authorization depends on Supabase Row Level Security and edge-function validation. Client-side hiding is not authorization. Schema/RLS changes are not present in this repository; confirm the live backend before changing a payload.

## Privacy boundaries

- `health` is removed from `lowispike.v2` before general `user_state` backup.
- Body diary data lives under `S.health.body` and remains local through that exclusion.
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
