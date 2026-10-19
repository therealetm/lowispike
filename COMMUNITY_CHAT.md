# Community chat integration handoff

This branch implements the Community chat workstream. It is **not deployed or fully accepted**: browser screenshots, real-device checks, live schema/RLS inspection and two-account verification remain blocked.

Base: `dcfe82cd19f085ce230cba1e7b40c30791c80a60`, fetched from GitHub `main` on October 15, 2026. The supplied ZIP records `55fc90a80b9ccb0a66ee0330ad780a8713419491`; it was used only to read its manifest and historical SQL reference. No source was copied from it. Branch: `codex/community-spirit-20261015`.

## Implemented scope

- The existing Community → Chat destination opens **Spirit square**, one shared gathering place, with a small luminous town/lantern/constellation scene and the existing water-bubble avatar renderer. No Home/Scan creature is added or moved.
- The current personality from the existing profile is visible to its owner, including the existing identity module's localized type name when loaded. Its first letter changes the local scene's light intensity. A member's type badge and star-sign avatar treatment appear to others only after explicit sharing through `community_identities`. This is identity presentation, not health inference, matching or access control.
- Room ID stays `all`. Additional room names, type-based discovery or routing remain undecided. **No routing proposal has been implemented.** A possible later proposal is optional topic discovery within a shared space; it needs a separate product decision before implementation.
- Authored seed messages and demo bots are excluded from chat, profiles and mention suggestions. The app itself invents no online counts or participants. Since Oct 19 the owner runs a simulated crowd of real test accounts (tools/community-crowd, up to 100 members) that chat like ordinary members; the beta testers know. For You and Leaderboard keep their owners and current behavior.
- Messages use the existing Supabase client and shared realtime channel. Reload is room-scoped, closes the subscribe/reconnect gap and reconciles inserts, deletes and reactions received while a snapshot is in flight. Recent history remains bounded to the existing 300-message window; older-history pagination is not implemented.
- Drafts, reply targets and an outbox live under the authenticated account's own device key. Pending delivery is visible. Unconfirmed delivery keeps a recoverable draft and the same client message ID. Check & retry first checks whether that ID already committed. There is no automatic resend on reconnect.
- Replies, Unicode mention suggestions, positive preset reactions, sender/profile bubbles and own-message deletion are preserved in the new module. Message text is escaped. Deletion requires an explicit owner ID and a matching deleted-row response; zero-row responses do not claim success. Reactions roll back after an unconfirmed write.
- Blocking is durable on the device and filters history, replies, reaction counts and mention suggestions. Account sync is attempted; failed sync is named honestly and a durable pending block/unblock is retried later. Blocking is directional hiding, not a mutual ban or database access restriction. Reports show server receipt only after an acknowledged insert; unavailable reporting does not display success.
- Quiet hours default to 22:00–08:00 using the device clock. Controls can change/disable them. They silence chat announcements and unread badges on that device; incoming messages and deliberate reading remain available. This adds no push, sound or contact-sync system and does not change global reminders.
- Chat profile rendering discards legacy birthdays, age, weight and unconsented type/sign. A narrow `pushProfile()` patch stops future public legacy birthday/type/sign writes; the private local profile and companion rules remain intact. Previously published fields and older installed clients need server-side remediation before privacy acceptance is complete. The existing companion `profiles.look` sharing system is not read or changed by this chat module; its consent/defaults remain with that workstream and need inclusion in the privacy audit.
- Layout uses an internally scrolling history, safe-area/nav clearance and a visual-viewport height limit when the keyboard reduces available space. Desktop focus alone does not enable keyboard mode. New controls have useful labels, minimum 44px targets, keyboard/IME behavior and reduced-motion/contrast styles. These are implemented behaviors, not a claim of real-device usability verification.
- New UI copy is supplied in English, German and Spanish. Dates/times use the selected language and device clock.

## Files and ownership

| Files | Purpose |
|---|---|
| `community-chat-core.js` | Consent filtering, positive reactions, quiet windows, scoped drafts/outbox, safe content normalization and deduplication. |
| `community-chat-cloud.js` | Bounded authenticated requests, stable-ID send reconciliation, snapshot/realtime reconciliation, reactions and owner deletion. Uses the existing shared channel; creates none. |
| `community-chat.js`, `community-chat.css` | Spirit-square UI, consent/profile settings, moderation controls, connection/draft states, responsive/keyboard layout. |
| `index.html` | Narrow chat integration, fail-closed loading placeholder, cloud bridge/events, removal of chat seed/fallback success, account-switch cleanup and public-profile privacy guard. Script order is preserved. |
| `sw.js` | Adds only the four new assets to existing static/network-first lists. Build/cache IDs stay unchanged for the release owner. |
| `tests/community-chat.test.cjs`, `tests/community-chat-ui.test.cjs` | Pure rules, mocked transport and VM/DOM integration checks. |
| `tests/community-chat-qa.html`, `tests/community-chat-stage.html` | Isolated interactive fixture; all accounts, messages and backend responses are clearly labeled simulations. No network calls or credentials. |
| `tests/community-chat-live.cjs` | Opt-in two-account backend checker; no privileged/service key is used. Requires the secure test environment and explicit test-write configuration. |
| `supabase/proposals/community_chat_20261015.sql` | Unapplied schema/policy proposal for review in staging after live schema inspection. |
| `ARCHITECTURE.md`, `CONTEXT.md`, `DATA_CONTRACTS.md`, `DECISIONS.md`, `RELEASE.md`, `SCREEN_MAP.md`, `TESTING.md`, `TICKETS.md` | Small append-only descriptions of the new module/contracts and remaining verification. |

No `world-home*.js/css`, `spirit.js`, companion/evolution, XP, fasting, body-world, scanner, cooking, theme, `apple-ui.js` or `version.json` was changed. Shared `index.html` was patched by anchors, not replaced with the archive. No extra herb tab, tap rewards, private messages or new multiplayer backend.

## Verification performed

Commands are run from the checkout root; final result: **465 tests passed, 0 failed**, including **28 Community tests**. The separate backend checker skipped.

- `node --test tests/community-chat*.test.cjs`: pure rules, mocked Supabase operations, draft recovery, duplicate sends/events, account switching, deletion authorization at the client, reaction rollback, stale-snapshot races, UI privacy, stable mounting, IME behavior and synthetic visual-viewport calculations.
- `node --test tests/*.test.cjs`: required whole-app regression suite (baseline was 437 passing tests).
- `node --check community-chat-core.js`, `node --check community-chat-cloud.js`, `node --check community-chat.js`, `node --check tests/community-chat-live.cjs`; all inline application scripts are also parsed by the suite.
- `git diff --check`.
- `node tests/community-chat-live.cjs`: **SKIP**, no authorized tokens/configuration; no backend requests or writes made.
- Managed preview: both `sites-preview start <checkout>` and `sites-preview status` failed with `sites-previewd mailbox is unavailable at /tmp/sites-previewd/requests: No such file or directory`. No preview server, browser/simulator test or screenshot capture succeeded. The managed Sites guidance prohibits replacing unavailable preview infrastructure. No fabricated before/after images are provided.

## Acceptance status

| Criterion | Status and remaining evidence |
|---|---|
| 1: scope/navigation/spirit/personality | Implemented and VM-tested; real browser navigation and before/after screenshots pending. |
| 2: real messages/profiles/no demos | Rendering and exclusion tested with fixtures; signed-in production rendering pending. |
| 3: send/reply/reactions/failure/reconnect | Rules and transport tested with mocked responses; live verification pending. |
| 4: two-account realtime and server authorization | **Blocked** on authorized accounts, current schema/RLS and realtime configuration. Client guards are not proof of RLS. |
| 5: report/block/quiet | Local persistence/quiet behavior implemented; report and cross-device block persistence depend on unapplied schema and actual moderation operations. |
| 6: consent/privacy | Chat renderer and future frontend writes guarded; old public records/old-client writes require backend audit and remediation. |
| 7: small/standard phone and iPad orientations | Fixture presets: 375×667, 390×844, 768×1024, 1024×768. Not browser-verified or physical-device-tested. Include 375×812 and actual keyboard/safe-area testing in integration. |
| 8: errors/listeners/regressions | Node, syntax and VM checks performed; real browser console, actual nav and keyboard behavior pending. |
| 9: reviewable branch/patch/backend/deployment | Isolated source, tests, fixture, SQL proposal and handoff included; no deployment. |

## Backend dependencies and proposal

The checkout contains no verified current database definition for chat. The attachment's historical `round1_schema.sql` describes `messages`/`reactions` with text IDs, `room='all'`, `auth.uid()` ownership and a composite reaction primary key. That is **reference evidence only**, not proof of the deployed schema.

Before using the proposal, export actual table columns/defaults/constraints, grants, `pg_policies`, publication membership and replica identities from the existing secure project environment. Reconcile the SQL with that export. New tables are `community_identities` (only explicit type/sign sharing), `community_blocks` (private owner-scoped list), and `community_reports` (owner-inserted reason plus message ID). The proposal supplies owner-scoped grants/policies, restrictive guards on existing message/reaction writes, positive presets, no message editing, indexes and realtime prerequisites. It is in `proposals/`, not an automatically applied migrations directory.

An acknowledged report is stored for review; a human moderation owner, review workflow, retention policy and abuse/rate controls still need to be supplied. No report notification or moderator message was sent by this task. The proposal does not pretend a database block prevents public-message access. Privacy review must also prevent older clients from republishing legacy birthday/type/sign fields and remediate existing public records without deleting private local profile data.

Supabase's [RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security) and [Postgres Changes guide](https://supabase.com/docs/guides/realtime/postgres-changes) informed the proposal. Treat DELETE events as ID invalidations, then reconcile authorized history; do not depend on non-key old-row fields under RLS.

For live checks, securely configure `LOWI_CHAT_TEST_URL`, `LOWI_CHAT_TEST_PUBLIC_KEY`, `LOWI_CHAT_TEST_A_TOKEN`, `LOWI_CHAT_TEST_B_TOKEN`, and `LOWI_CHAT_TEST_ALLOW_WRITES=1` for **two dedicated, authorized test accounts**, then run `node tests/community-chat-live.cjs`. The checker creates clearly labeled temporary room messages and removes them in cleanup; review it before running in a shared environment. It checks realtime insert/deletion, reply/reaction persistence, owner deletion, denial of another account's edit/delete and user-ID spoofing. It has not been executed against a backend here. Do not paste passwords, tokens or service keys in chat.

## Integration and release

Re-fetch `main` and inspect Home's latest committed and uncommitted work before cherry-pick/merge. This conversation cannot inspect the other chat's filesystem or uncommitted changes. The final handoff records the last remote SHA observed. Keep all Home files as theirs; reconcile only the narrow `index.html`/`sw.js` hunks and contract-document appends.

The release owner must complete browser screenshots, physical phone/iPad keyboard/safe-area checks, live account/RLS/moderation verification and legacy privacy remediation. Then assign one release build, advance `index.html`/`sw.js`/`version.json` together and cache-bust new assets consistently. This branch deliberately does not race Home's build metadata or deploy to Pages. Before/after reference is the base commit versus this branch; the isolated fixture is supplementary, not a substitute for the actual app.
