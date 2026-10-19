# COORD: Fuel bloom = Shop, Cook, Log meal (FUEL worker)

Parent: /home/sprite/COORD-ui-rollout.md
Task: LOWiSPIKE Fuel: Shop, Cook and visible meal log (forked task, started 2026-10-18 21:23 CEST)
Branch: fuel-shop-cook-log  Worktree: /home/sprite/wt-fuel  Base: origin/main badebb0 (build 20261018-195906, 1378 tests)

## Owns
- home-blooms-v2.js, home-blooms-v2.css
- tests/ui-fuel-*.cjs (new), plus the Fuel-label lines of tests/home-blooms-v2.test.cjs and the Fuel case of tests/home-blooms-v2-live.cjs (tests of the module this worker owns; contract update documented below)

## Will not touch
index.html, apple-ui.js, sw.js, version.json, loaders, docs (DECISIONS/SCREEN_MAP/ONBOARDING), Water/Move/Gap behaviour, any other worker's files.

## Brief
- Goal: tapping Fuel blooms exactly Shop, Cook and Log meal. Swap and Today's step leave the Fuel bloom.
- User saw: Fuel bloom with Today's step / Snack / Swap / Cook; meal logging only behind a hold.
- Done when: unit test + Chromium/WebKit live check show 3 Fuel orbs shop,cook,log; each opens its existing screen; hold still logs.
- Out of scope: Cook right-side panel, craving title/tiles, food scoring, Craving SOS feature itself (stays in app, only leaves Fuel).

## Status
RELEASED: live as build 20261018-222121 (main 9d55107). Ownership of home-blooms-v2.js/.css released.
- Branch fuel-shop-cook-log, commit f98a22a75185ed6a48321bfb6d30d43e361dead0, pushed. The first commit was 6fb630a. Base origin/main badebb0, which hadn't moved at push time.
- Branch CI run 39160579081: success. The earlier run, 39159323966, also passed.
- Unit tests: 1388 pass / 0 fail / 0 skipped (floor 1378). release-check OK with 3 warnings already on main. diff --check clean.
- Live:
  - tests/ui-fuel-live.cjs: PASS, 185 checks, in en/de/es and default plus reduced motion, on Chromium 390x844 / 375x812 / 375x667, WebKit iPhone 13 and WebKit iPad.
  - tests/home-blooms-v2-live.cjs: PASS on WebKit iPhone 13 and WebKit iPad. Chromium 390x844 passed 2 of 3 runs; the one failure was in the Move bloom (not touched), so it's probably a flaky existing check.
  - Emulation only.
- Loader requests: none.

## Startup material read
- In full: .agents/skills/apple-design/SKILL.md, TESTING.md, RELEASE.md (second pass)
- First pass: AGENTS.md, lowispike-change skill, SUCCESSOR_HANDOFF.md, DECISIONS.md, COORD-ui-rollout.md

## Apple-design check
- **Broken by this change, fixed in f98a22a:** some sublines were cut with an ellipsis (German Shop and Log meal, and English Shop at 375 wide), and the German/Spanish Log meal text spilled outside the circle. The fix shortens the sublines and drops the Log meal subline.
- **Already on main and shared by all four blooms, so not changed here. Queue as a separate small task:**
  - no reduced-transparency or increased-contrast fallback on .hb2-orb and .hb2-note
  - reduced motion appears instantly instead of with a short cross-fade
  - the open animation overshoots (cubic-bezier 1.6) after a plain tap, and the CSS transitions can't be interrupted

## Contract conflict in the old tests
tests/home-blooms-v2.test.cjs and tests/home-blooms-v2-live.cjs asserted the removed Fuel navigation: the "Today's step" / Snack / Swap words, the showPick and data-act=sos calls, and the step,snack,swap,cook orb order. Those assertions were replaced with new, stronger ones (exact list in HANDOFF.md and in the 6fb630a commit message). Nothing was deleted or skipped.

## Integrator to-do
- Add a DECISIONS.md entry (text is in HANDOFF.md).
- Check SCREEN_MAP for the Fuel bloom.
- Write What's New in en/de/es.
- Release via scripts/release.sh.
- HANDOFF.md sits at the repo root on this branch: drop it or keep it, and watch for conflicts with other workers' HANDOFF.md.

## iPhone check for E-man after release
Tap Fuel and confirm you see Shop, Cook and Log meal. Tap Log meal and the meal log sheet should open.

## Replies
- INTEGRATOR (2026-10-18 ~22:25 CEST): live as build 20261018-222121, main 9d55107358ff73f3b97882f6ad52988aeac14ba4. See COORD-ui-rollout.md Replies.
