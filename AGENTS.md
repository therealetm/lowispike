# LOWiSPIKE agent guide

This is the operational source of truth for any AI or engineer changing LOWiSPIKE. It governs the entire application, not only the latest feature.

## Required startup sequence

Before inspecting implementation details or proposing a change, read:

1. `CONTEXT.md`
2. `ARCHITECTURE.md`
3. `SCREEN_MAP.md`
4. `DATA_CONTRACTS.md`
5. `TESTING.md`
6. `RELEASE.md`
7. `DECISIONS.md`
8. The relevant approved item in `TICKETS.md`, if one exists

For gesture-driven UI, spring animation, swipe/sheet behavior, translucency, or motion, also read `.agents/skills/apple-design/SKILL.md` in full before acting.

Then inspect the current remote `main` SHA, working-tree status, owning source module, its bridge/event/storage contracts, and its tests. Do not start from a screenshot alone or from assumptions about a framework; this app is a plain-JavaScript PWA with a large ordered `index.html`.

## Non-negotiable product rules

- The herb is **the** companion. Never render a second companion. The floating bubble above Scan is the herb's compact form; tapping it opens the herb room.
- Companion speech is event-driven. It may speak after a deliberate herb tap, care action, evolution, or permitted reminder. It must not speak on navigation, every click, or page load.
- Copy is short, clear, playful, warm, and non-repetitive within a session. No guilt, alarm, medical claims, vague poetry, or unexplained phrases.
- XP has one source of truth. Care actions use stable event IDs and award XP once. Since 2026-10-15 15:00 (user decision, see DECISIONS.md) taps, tab switches, opening sheets or menus and plain navigation earn 0 XP; XP comes only from completed actions, each with an eventId or a per-day cap. xp-tap.js has no tap listener: it pays only first-ever region discovery (src `discover`, once per region), a microbe joining the crew (src `buddy-add`, once per microbe), care sent (src `care-sent`, 3 a day), a corrected fasting start (src `fast-edit`, 1 a day), plus the healthy streak bonus (src `combo`). Old `tap` ledger entries stay (XP kept) and stay minor. Never reward longer fasts: hourly fast XP stops at 16 h (CAP_H).
- Preserve all six evolution stages and thresholds: Seed 0, Sprout 100, Young Herb 300, Flourishing Herb 700, Radiant Herb 1500, Legendary Bloom 3000. Stages never regress.
- Wilting is gentle and reversible with one real healthy action. It is never punishment.
- The star sign must visibly influence color, constellation, and personality, while clarity remains more important than decoration.
- Home and primary tabs are mobile-first game screens. At common iPhone sizes, essential actions must fit without page scrolling. Put secondary detail in sheets or dedicated screens.
- Keep accessibility: safe areas, useful labels, adequate contrast, touch targets, keyboard behavior, and `prefers-reduced-motion` support.

## Repository map

| Area | Files | Notes |
|---|---|---|
| App shell and major screens | `index.html` | Large legacy single-file app containing state and substantial inline Home, Scan, Cook, and Move code. Search before editing and make narrow changes. |
| Shared UI layer | `apple-ui.css`, `apple-ui.js`, `appearance.js` | Visual/accessibility layer, app chrome, and dynamic feature loading. Herb asset versions are loaded from `apple-ui.js`. |
| Herb companion | `herb-config.js`, `herb-core.js`, `herb-tamagotchi-core.js`, `herb-tamagotchi.js`, `herb-tamagotchi.css`, `herb-tamagotchi-mount-fix.js`, `herb-tamagotchi-polish.js` | Companion rules, state, rendering, animation, reactions, room, evolution, cosmetics, and mounting. Preserve the single XP ledger. |
| Older body companion code | `body-companion.js`, `body-companion.css` | Legacy/support code. Do not expose it as another creature or parallel companion. |
| Food shuffle and swaps | `swaflo-config.js`, `swaflo-core.js`, `swaflo.js`, `swaflo.css` | Cook/Buy/Sweet snacks behavior. Shuffle must visibly cycle through multiple candidates before settling. |
| Discovery | `discovery-config.js`, `discovery-core.js`, `discovery.js`, `discovery.css` | Community/product discovery surfaces. |
| Recipes | `recipe-book.js` | Recipe book behavior. |
| PWA/release | `manifest.webmanifest`, `sw.js`, `version.json` | Install, cache, and update lifecycle. Release identifiers must stay synchronized. |
| Tests and fixtures | `tests/*.test.cjs`, `tests/herb-visual-qa.html`, `tests/mobile-layout-qa.html` | Node regression suite and mobile visual fixtures. |
| Third-party code | `vendor/` | Do not hand-edit. |
| User/project assets | `assets/` | Do not delete or overwrite unrelated assets. |

The complete inline-module, screen, persistence, backend, asset, and test inventories live in the dedicated root documents. Update the relevant document whenever a change alters ownership or a contract.

## Whole-app engineering constraints

- `index.html` script order is an API. Never broadly reformat, reorder, minify, or replace it during a feature fix.
- Initialization must be idempotent. Tabs re-render, DOM nodes move into sheets, and external modules may load after the core.
- Preserve node identity when existing listeners depend on it; do not copy interactive markup into a second active surface.
- Internal names such as `shelf`, `R5`, `G2`, or `Swaflo` are implementation vocabulary, not automatically user-facing copy.
- Health state is private by default. General cloud backup removes `health`; optional cycle sync stays explicit and separate.
- Client-side visibility is not authorization. Supabase policies/edge validation protect cloud writes.
- Do not edit vendored Supabase/ZXing bundles, generated recipe images, icons, or unrelated assets as part of ordinary feature work.
- Do not add secrets. The existing browser publishable key and VAPID public key are public client identifiers; service-role credentials never belong here.
- The supported languages are English, German, and Spanish. New persistent UI copy needs all three or an explicit, documented temporary fallback.
- Keep medical boundaries: qualitative education only; no invented glucose numbers, diagnosis, treatment promises, fertility claims, or causal conclusions from self-reported data.

## Current interaction contracts

- Home: a compact living herb strip is the hero, with stage progress and a contextual line. It must not collide with Daily Quest, fasting, utilities, or bottom navigation.
- Scan: one capture surface offers Barcode and Meal photo modes. Barcode photo and manual number entry stay reachable inside that surface.
- Cook: choosing or shuffling must show real motion through multiple images and then settle on a result.
- Move: the compact layout is prepared before first paint; the old layout must not flash first.
- Navigation: changing tabs never summons companion chatter.
- Care mapping: meal logging waters; a swap gives sunlight; movement makes the herb dance; a scan gives a vitamin sparkle; finishing a recipe makes it bloom. Each completed app event is consumed once.
- Reminders: at most one per day, never at night, in the herb's voice, and pointing to one easy action.

## Safe change workflow

1. Read the three root documents and locate the smallest relevant module.
2. Inspect the current branch, status, and live `main` SHA. Never overwrite unrelated or uncommitted work.
3. State the exact behavior being changed. Do not expand the task while implementing it.
4. Make the smallest reversible patch. Do not add heavy libraries for animation; prefer existing CSS/SVG/DOM patterns.
5. Run `node --test tests/*.test.cjs` and `git diff --check`.
6. Exercise the relevant visual fixture at 390x844 and at least one smaller iPhone viewport. Verify reduced motion when animation changes.
7. Report actual results. Never claim physical-device testing, deployment, or success that was not observed.

## Release workflow

- `main` is the live branch. Use a branch/PR for non-trivial work unless the user explicitly authorizes a live deployment.
- Before release, set the same build identifier in the build metadata in `index.html`, `version.json`, and `sw.js`. Update cache-busting versions in `apple-ui.js` when its dynamically loaded assets change.
- Update the remote ref with the previously observed SHA as a lease. If `main` moved, stop and reconcile; never force over unknown work.
- Wait for the GitHub Pages workflow to succeed, then verify the build metadata served by `https://therealetm.github.io/lowispike/`.
- An update notice must be a state transition, not a loop. Do not show “new version” when the active version already matches.

## Definition of done

- Requested behavior works in the relevant signed-in and empty states.
- No duplicate companion, XP, notification, modal, or event listener is introduced.
- Primary mobile actions remain visible above the bottom navigation and safe area.
- Automated tests pass and the changed screen has been visually checked.
- Any new durable product decision is appended to `DECISIONS.md`; architecture/context changes update `CONTEXT.md`; remaining work becomes a scoped entry in `TICKETS.md`.
- The final handoff names the exact commit/build and distinguishes automated, browser, simulator, and physical-device results.
- `ARCHITECTURE.md`, `SCREEN_MAP.md`, `DATA_CONTRACTS.md`, `TESTING.md`, and `RELEASE.md` still describe reality after the change.

## Release lessons

- Screenshots are evidence. Fix the visible collision or confusion before adding features.
- Preserve recognizable product anchors; the Scan bubble is essential and must not silently disappear.
- Freeze scope before release. Ship the smallest complete slice, verify it, then start another.
- Conserve user time and credits: batch inspection, avoid repeated polling, reuse existing evidence, and surface blockers immediately.
- Never use a dirty local checkout as proof of what is live. Compare with the remote SHA and deployed build.

