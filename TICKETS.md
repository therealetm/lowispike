# LOWiSPIKE ordered work queue

This is a handoff queue, not permission to start every item. An agent takes one ticket at a time unless the user explicitly authorizes parallel work. Before starting, confirm it is still relevant against the current app and remote `main`.

Status values: `proposed`, `ready`, `in progress`, `blocked`, `done`.

## LS-001 — Complete the screen and state inventory

- **Status:** done
- **Order:** 1
- **Depends on:** none
- **Scope:** Document every primary screen and its default, empty, loading, error, sheet, and reduced-motion states. Capture the intended hierarchy at 390x844 and identify the owning source files.
- **Acceptance:** Today, Community, Scan, Cook, Move, profile, herb home, evolution, and update flows are covered; each state has a reference image or precise layout description; no implementation changes are bundled.
- **Evidence:** `SCREEN_MAP.md`, `ARCHITECTURE.md`, `DATA_CONTRACTS.md`, `TESTING.md`, and `RELEASE.md` added on 2026-10-14.

## LS-002 — Run a real iPhone/PWA regression pass

- **Status:** proposed
- **Order:** 2
- **Depends on:** LS-001
- **Scope:** Test the installed PWA and browser experience on physical iPhone hardware, including 390x844, 375x812, and the smallest supported viewport available.
- **Acceptance:** Home, Scan, Cook, and Move show their essential controls without accidental page scroll or bottom-nav collision; safe areas, camera permissions, keyboard, offline launch, update behavior, and reduced motion are recorded with actual results and screenshots.

## LS-003 — Verify companion care end to end while signed in

- **Status:** proposed
- **Order:** 3
- **Depends on:** LS-002
- **Scope:** Exercise all five real care events using production-shaped data and verify the shared XP ledger.
- **Acceptance:** Meal, swap, movement, scan, and recipe completion each play the correct animation and award XP once; replay/navigation awards zero; wilting recovers after one action; 100 XP triggers Sprout evolution; a multi-stage jump produces one combined reveal.

## LS-004 — Validate herb reminders on an installed PWA

- **Status:** proposed
- **Order:** 4
- **Depends on:** LS-002
- **Scope:** Confirm reminder scheduling, copy, limits, quiet hours, permission denial, and tap destination using supported production notification behavior.
- **Acceptance:** At most one reminder is delivered per day, none is delivered at night, copy offers one easy action in the herb's voice, and tapping opens the herb experience. Denied permission produces no repeated prompt.

## LS-005 — Reduce `index.html` risk incrementally

- **Status:** proposed
- **Order:** 5
- **Depends on:** LS-001, LS-003
- **Scope:** Extract one well-tested boundary at a time from the large inline app, beginning with the Scan capture controller, Move pre-paint compaction, or Cook shuffle orchestration. Do not redesign behavior during extraction.
- **Acceptance:** One source of truth remains for each extracted feature; all existing tests pass; new boundary tests cover initialization and duplicate mounting; no visual or storage migration regression; the change is shipped separately from feature work.

## Ticket template

When adding a ticket, include:

- **Status** and **order**
- **Depends on**
- **User-visible outcome**
- **Files or subsystem in scope**
- **Explicitly out of scope**
- **Step-by-step implementation notes** only where order matters
- **Acceptance criteria** that can be observed or tested
- **Evidence required**: automated, visual, browser, simulator, physical device, or live deployment

## 2026-10-14 - Sign-in handoff follow-up

- [ ] Physical iPhone: sign in in Safari, tap "So geht's", add to Home Screen, open it, tap "Anmeldung einfügen" -> signed in as the same account. Note whether it signs in by itself (CacheStorage shared) on this iOS version.

## LS-COM-VERIFY — Community backend, privacy and device acceptance

- **Status:** blocked on project access/verification environment; frontend implementation provided separately.
- **Depends on:** Community branch integration review; current live schema/RLS export, realtime configuration and two dedicated authorized test accounts.
- **Outcome:** Establish actual shared delivery, owner authorization, moderation persistence and consent with screenshots and device evidence.
- **Scope:** Review the unapplied SQL proposal; audit/remediate old public birthdays/type/sign and old-client writes; run the opt-in two-account checker; assign report review/retention/abuse controls; verify block persistence across devices and local quiet controls. Test Community navigation, phone/iPad portrait/landscape, keyboard/safe areas, long history, Home/For You/companion/fasting regression and PWA offline upgrades.
- **Out of scope:** Home redesign, XP/evolution, fasting storage, scanner/cooking, product game, private messages and personality-based access rules.
- **Evidence:** actual backend/account results, browser console plus before/after captures, physical phone/iPad keyboard tests and release-owner build/Pages verification if deployed. `COMMUNITY_CHAT.md` records the implemented boundary and current blockers.

## LS-KITCHEN-DECOR — Kitchen: decorate and upgrade your kitchen with points

- **Status:** proposed (future idea from Emmanuel, Oct 26 2026; do not build until he asks)
- **Order:** after the Kitchen pantry game has been live for a while
- **Depends on:** Cook > Kitchen game (`kitchen-game.js`, `kitchen-game-core.js`), the shared points ledger (`LowiHost.award`)
- **User-visible outcome:** the points earned in the Kitchen (daily look, binning, healthy kitchen) can be spent to decorate and upgrade the fridge and cabinet: colours, magnets on the fridge, a nicer cabinet, extra shelf space.
- **Scope:** a small catalogue of cosmetic upgrades, a spend flow that uses the existing points (no new currency, no real money), saved per account, shown in the existing fridge and cabinet art.
- **Explicitly out of scope:** anything that changes the health bar, the scanner verdicts or nutrition advice; paid items; a second currency (Emmanuel removed confusing currency overlaps).
- **Acceptance:** an upgrade costs points once, shows right away, survives reload and a new device; Reduce Motion gets fades instead of animations; EN/DE/ES text.
- **Evidence:** unit tests for spending and caps, WebKit iPhone 13 (390x844) check with Reduce Motion in EN/DE/ES, live check after a quiet release.
