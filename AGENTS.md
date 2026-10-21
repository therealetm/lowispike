# LOWiSPIKE agent guide

> New agent with no memory of this project? Read `MAYA-HANDOFF.md` first: accounts and access, how to work, lessons, the owner's preferences, the status board and an append-only Log. When something ships, breaks or is cancelled, append one line to its Log.

This is the operational source of truth for any AI or engineer changing LOWiSPIKE. It governs the entire application, not only the latest feature.

## Required startup sequence

Before inspecting implementation details or proposing a change, read:

0. `SUCCESSOR_HANDOFF.md` first: boot sequence, truth hierarchy, who is working on what (a dated snapshot, re-check it), current vocabulary and open decisions.
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

Vocabulary note (18 Oct 2026): these rules were written when the companion was a potted herb. Read *herb* as *the companion*: the one glass bubble creature (Misty for the owner and as the fallback; other names come from the star sign). Code still says `herb` in many places. The rules themselves still hold unless a later `DECISIONS.md` entry overrides them; the specific places they changed are marked below and in `SUCCESSOR_HANDOFF.md` section 5.

- The herb is **the** companion. Never render a second companion. The floating bubble above Scan is the herb's compact form; tapping it opens the herb room.
- Companion speech is event-driven. It may speak after a deliberate herb tap, care action, evolution, or permitted reminder. It must not speak on navigation, every click, or page load.
- Copy is short, clear, playful, warm, and non-repetitive within a session. No guilt, alarm, medical claims, vague poetry, or unexplained phrases.
- XP has one source of truth. Care actions use stable event IDs and award XP once. Since 2026-10-15 15:00 (user decision, see DECISIONS.md) taps, tab switches, opening sheets or menus and plain navigation earn 0 XP; XP comes only from completed actions, each with an eventId or a per-day cap. xp-tap.js has no tap listener: it pays only first-ever region discovery (src `discover`, once per region), care sent (src `care-sent`, 3 a day), a corrected fasting start (src `fast-edit`, 1 a day), plus the healthy streak bonus (src `combo`). Old `tap` ledger entries stay (XP kept) and stay minor. The microbe buddies were removed 2026-10-16 (user decision): their XP (src `buddy-add`, `buddy-bond:*`) is purged from the ledger and S.xp on load; never bring buddies or the microbe collection back without a new user decision. Never reward longer fasts: hourly fast XP stops at 16 h (CAP_H).
- Preserve all six evolution stages and thresholds: 0, 100, 300, 700, 1500, 3000 XP. Stages never regress. They are shown today as Level 1 to 6 with the names in `world-home-core.js` `STAGES` (Spark to Legend); the herb names (Seed, Sprout, Young Herb, Flourishing Herb, Radiant Herb, Legendary Bloom) are legacy.
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
| Older body companion code | (deleted Oct 19) | `body-companion.js/.css` were never loaded and were removed in the old-design purge. Do not bring back a second creature or parallel companion. |
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

- Home (legacy wording, superseded by the world-first Home: see `SCREEN_MAP.md` "Spirit surfaces" and "World-first Home" and the newest `DECISIONS.md`): a compact living herb strip is the hero, with stage progress and a contextual line. It must not collide with Daily Quest, fasting, utilities, or bottom navigation.
- Scan: one capture surface offers Barcode and Meal photo modes. Barcode photo and manual number entry stay reachable inside that surface.
- Cook: choosing or shuffling must show real motion through multiple images and then settle on a result.
- Move: the compact layout is prepared before first paint; the old layout must not flash first.
- Navigation: changing tabs never summons companion chatter.
- Care mapping (herb-era wording; the Care board now ranks sunbeams from meals, water, Moves and scans, so check the code before relying on the reactions listed here): meal logging waters; a swap gives sunlight; movement makes the herb dance; a scan gives a vitamin sparkle; finishing a recipe makes it bloom. Each completed app event is consumed once.
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

- `main` is the live branch. **Standing approval (Emmanuel, 21 Oct 2026): agents release and deploy live on their own, without asking first, once `node --test tests/*.test.cjs` and `node scripts/release-check.cjs` pass.** His words: "you do not need my go to push ... I want you to always push, push, push. I need you to work autonomously in the background." Work on a branch/worktree, then ship it through `scripts/release.sh`; do not stop to wait for his go-ahead. This replaces the old "only with explicit authorization" rule and the "preview for his OK before release" notes in older handoff entries.
- Release with `scripts/release.sh "summary" --news news.json` (see `RELEASE.md`). Do not write another one-off release script: it bumps every build id (`index.html`, `version.json`, `sw.js` x2, `apple-ui.js`), runs the gate and the tests, pushes without force under the shared lock and waits until the build is live.
- If you must release by hand: same build id everywhere (`node scripts/release-check.cjs` proves it), plain `git push origin HEAD:main` (refused unless it fast-forwards), never `--force`.
- Wait for the GitHub Pages workflow to succeed, then verify the build metadata served by `https://therealetm.github.io/lowispike/` (`node scripts/verify-live.cjs BUILD --compare`). The CI run on `main` also checks this.
- An update notice must be a state transition, not a loop. Do not show “new version” when the active version already matches.

## Definition of done

- Requested behavior works in the relevant signed-in and empty states.
- No duplicate companion, XP, notification, modal, or event listener is introduced.
- Primary mobile actions remain visible above the bottom navigation and safe area.
- Automated tests pass and the changed screen has been visually checked.
- Any new durable product decision is appended to `DECISIONS.md`; architecture/context changes update `CONTEXT.md`; remaining work becomes a scoped entry in `TICKETS.md`.
- The final handoff names the exact commit/build and distinguishes automated, browser, simulator, and physical-device results.
- `ARCHITECTURE.md`, `SCREEN_MAP.md`, `DATA_CONTRACTS.md`, `TESTING.md`, and `RELEASE.md` still describe reality after the change.
- Onboarding is still true: if the release changes anything a new person sees or is told (controls, bubbles, worlds, shopping, scanner), update the onboarding copy (EN/DE/ES) and `ONBOARDING.md` in the same commit. `tests/onboarding-current.test.cjs` checks it.

## Release lessons

- Screenshots are evidence. Fix the visible collision or confusion before adding features.
- Preserve recognizable product anchors; the Scan bubble is essential and must not silently disappear.
- Freeze scope before release. Ship the smallest complete slice, verify it, then start another.
- Conserve user time and credits: batch inspection, avoid repeated polling, reuse existing evidence, and surface blockers immediately.
- Never use a dirty local checkout as proof of what is live. Compare with the remote SHA and deployed build.
- Evidence before "done": a passing command, a live build id, a matching file. A confident summary is not evidence.
- How to work with AI agents here (task sizing, worktrees, reviews, reporting): `AI_PLAYBOOK.md` and `.agents/skills/lowispike-change/SKILL.md`. `scripts/worktrees-report.sh` shows which old worktrees are merged or still hold work (read-only).
- The test count only goes up: `scripts/test-floor.cjs` (in CI and `scripts/release.sh`) fails when fewer tests pass than the last release recorded. Never delete or skip a test to get green.
- Parallel agents: one task, one worktree, one branch (`git worktree add ../wt-<topic> -b <topic> origin/main`). Two tasks never edit the same files; split by file before starting. Write who owns what in `/home/sprite/COORD-<topic>.md` when tasks overlap.
- Keep releases small and one at a time: each one is one user-visible change, its What's New and its tests.

## The tutorial stays current (rule since 19 Oct 2026, Emmanuel)

Settings > Tutorial replays a guided tour where the user's own companion walks them through every main feature (`tutorial.js`). Its content lives ONLY in `tutorial-steps.js`. Every release keeps it current:
- `news.json` carries `"tutorial": "<step id>"` (the step that explains the change; update its text in EN/DE/ES when the feature changed, add a new step for a new feature) or `"tutorial": {"none": "why no step is needed"}`. `scripts/bump-build.cjs` refuses the release without it, and `scripts/release-check.cjs` fails a published What's New that lacks it.
- A new Home ring control (`home-orbit-v2.js` ORDER) or Settings row (`home-settings-sleep-v2.js` pageGroups / MORE) needs a step in `tutorial-steps.js` (its `covers`) or a `NO_TUTORIAL` reason. `tests/tutorial-steps.test.cjs` fails otherwise.
- Bump `VERSION` in `tutorial-steps.js` when you change steps. Never make the tour open panels or sit over setup; it hides while anything else is up. Details: `TUTORIAL.md`.
