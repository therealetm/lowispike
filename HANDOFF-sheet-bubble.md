# Handoff: sheet-bubble-20261105

**Status (5 Nov 2026, ~13:15 UTC): NOT released, NOT deployed, NOT live.** `main` is unchanged at `b89991b` (Release
20261105-122814); its CI run 42019551489 passed tests, deploy and the "Live on GitHub Pages" check (verify-live) at 11:33 UTC, and
no later main run exists (the live site itself is not reachable from this sandbox). Code complete for the handoff items,
verified by tests and Chromium probes (below). The release was
attempted with `scripts/release.sh` and stopped at its first network step: this sandbox's network policy denies
`therealetm.github.io` (see "Release").

Branch: `sheet-bubble-20261105` (mirror with the same commits: `claude/zen-tesla-wanom8`), from origin/main `b89991b`.
Main had not moved (merge-base = main tip). Fast-forward pushes only; nothing was force-pushed.
Branch tip = the commit that adds this version of the file (a file cannot hold its own hash: `git log -1 origin/sheet-bubble-20261105`);
its parent is `2f107ee3`; the last code commit is `16ba446e`.

## Commits on the branch (oldest first)
- `fa24929`: shared pop-up shell (`sheet-style.css`, linked in index.html before bottom-close.css, precached in sw.js), `tests/sheet-style.test.cjs`.
- `d2a98d0`: round-X gap 76px (was one-sheet.css's 72px).
- `3f0efa1`: WIP increment 2 (joystick hold, Calm joystick, calmKeep, no timed trips, Billiards aim stick); left 2 tests failing.
- `16ba446`: joystick conflict fixed (below); new `tests/ui-joystick-open-all.test.cjs`; ONBOARDING.md controls line.
- `2f107ee`: DECISIONS.md entry + handoff (docs only).
- Branch tip: this handoff with the release result (docs only).

## What the branch does (all verified in Chromium, see "Checks")
- **Joystick (`misty-pad.js`).** A steady press on the MIDDLE of the joystick (inner 70 % of its measured radius = the dashed
  well, 21 of 30 px) held 520 ms (`misty-turn.js` `K.LONG_MS`) within 10 px (`K.TAP_PX`) while the companion rests at home
  opens every bubble (`LowiBloomRing.toggleAll`; a second hold folds them). A press on the RIM (stick tilted, forward or
  sideways) and any press while she is out (flying, inside a world, in the galaxy, `wh-away`) keep the old hold: forward after
  280 ms, faded, gone after 1.5 s. A drag past 10 px cancels the hold and steers as before. Calm (level 1+): any hold opens every
  bubble, dragging is inert. Lift, pointercancel, lost capture, blur, hidden page and pagehide clear the pending hold; a hidden
  page or pagehide also drop a pending forward hold and a pending double-tap back burst; pagehide ends the press. The click that
  ends a hold that opened the bubbles never reaches the bubbles' backdrop (touchend cancelled; mouse/pen: one click within
  450 ms eaten). VoiceOver label: "hold the middle to open all bubbles" (EN/DE/ES).
- **Why the WIP failed:** it armed the hold for every press while the pad mode was `''`, so the old still hold could never start
  at home (2 failing tests: `tests/ui-joystick-fade.test.cjs` "holding it still (forward) fades it ..." AND
  `tests/ui-joystick-vanish.test.cjs` "holding it (forward) also disappears ..."; the previous handoff named only the fade file).
  It also armed the hold inside a world reached by the World map (mode stays `''` there), where a still press used to fly forward.
- **Calm:** the joystick stays visible at every level (`galaxy-still.css`; on main it is `display:none`); its chip and the place
  pins still go. `keeps()` honours `userData.calmKeep`, but the two objects marked with it (living-bubbles group, companion face)
  already carried `lwKeep`, so Calm 3/4 rendering is unchanged (screenshots of main and branch are the same apart from the joystick).
- **No timed trips (`sun-meter.js` `TIMED_TRIPS = false`):** no "Send her exploring"; `depart()` returns false; a trip still out
  comes home on the next open with its find, once (`endTimedTrips` + the normal `collect()`).
- **Shared pop-up shell (`sheet-style.css`, Dark only):** near-black panel #0e0e10, 1px rgba(255,255,255,.12) rim, radius 28px, no
  backdrop blur, no stripes; the round X sits 4px further below tall sheets (`--one-x-gap` 76px instead of 72px).
- **Bubble layout (`bloom-ring.js` `placeShared` / `only`, `home-blooms-v2.js`):** a single Water / Move / Sleep bloom opens exactly
  where its orbs sit when every bubble is open. Gap and Fuel are not part of open-all (by design) and keep their own layout.
- **Billiards (`room-table.js` / `.css`):** the hint sentence under the board is gone; a lower-left aim stick `.rt-stick` drives
  `C.aim` + `fire()`, never shoots by itself; cancel, lost capture, blur, hidden page and pagehide drop the aim. It looks for the
  Freundesbaum button (`#cpRoom > .nm-ctree`) to sit right of it; that button is removed elsewhere in the current app, so the stick
  uses its 12px fallback.

## Checks actually run (5 Nov 2026, this session)
- Baseline on `3f0efa1`: `node --test tests/*.test.cjs` = 4454 tests, 4452 pass, 2 fail (the two named above).
- After the fix (`16ba446`), and again after the docs (`2f107ee`): `node --test tests/*.test.cjs` = 4465 tests, 4465 pass,
  0 fail. `node scripts/release-check.cjs` = OK (5 standing warnings). `git diff --check` clean. GitHub CI "Release check and
  tests" (Node 24) passed on `16ba446` (runs 42030916188, 42030920994) and on `2f107ee` (runs 42033109002, 42033112901).
- Focused: ui-joystick-open-all (11), ui-joystick-fade, ui-joystick-vanish, companion-open-all, misty-pad, misty-pad-anchor,
  misty-turn, pad-autopilot-world, guide-bubble-joystick, joystick-bubble-style, zoom-out-hides-pad, galaxy-still-wiring,
  bloom-ring, home-blooms-v2: 115/115 pass. `ui-joystick-fade.test.cjs`, `ui-joystick-vanish.test.cjs` and their fixture are unchanged.
- `tests/companion-open-all.test.cjs`: its two source-regex checks for blur / hidden-page cleanup were replaced by behavioural
  checks on the fake page (with a control press that does open the bubbles).
- Mutation checks (scratch, not committed): making every home press arm the hold (the WIP rule) fails the 2 original tests and
  the new rim test; dropping the middle, the out-of-home rule, the 10px tolerance, pagehide, the touchend guard, the click eater
  or the hidden-page timer cleanup each fails at least one test.
- Browser, Chromium only (this VM has no WebKit), local server, fixture session or the repo's fake cloud, every other request
  blocked, scratch probes (not in the repo):
  - joystick 390x844 + 375x667: middle hold opens every bubble and they stay open after the lift; no flight, no fade; rim hold =
    faded forward hold, no bubbles; drag from the middle steers; Calm 1: hold opens, drag inert; blur cancels; inside the liver
    world a still press is the forward hold (390x844 only). 0 page errors, 0 blocked writes.
  - Calm 1/3/4 at 390x844: joystick shown (main: hidden), chip hidden, companion drawn.
  - single bloom vs open-all at 390x844: Water / Move / Sleep orbs 0px apart (main: up to 156 / 81 / 77 px).
  - Dark shell at 375x667, 390x844, 430x932 (companion card): computed paint as above; sheet bottom to round-X box = 16px (main 12px
    by the same method; the previous handoff's 8 -> 12px used another reference, the +4px matches).
  - aim stick 390x844 + 375x667: under the board, lower left; tap never shoots; pull and release shoots once; cancel and blur drop the aim.
  - a manual trip still out at load: comes home once with its find ("I'm back! ... Morning dew drop"), departures refused.
- The repo's own `tests/ui-joystick-fade-live.cjs` (Chromium) FAILS here on the branch AND on main: this VM's software renderer
  delays Playwright's mouse moves past the hold timers (main starts the forward hold mid-"drag", the branch opens the bubbles).
  Not a regression; the scratch probe above sends the drag synchronously instead.

## Not checked / known limitations
- No WebKit and no real iPhone: the 70 % middle zone may need tuning for real thumbs; the iOS click after a long press is handled
  by cancelling touchend but was not observed on a device; heat/memory not measured.
- EN/DE/ES visual matrix not checked (copy changes: joystick label and chip, Calm level 1 text, aim stick label).
- The Freundesbaum-adjacent placement of the aim stick was not exercised (the button was not present in the probed views).
- `tests/ui-joystick-fade-live.cjs` / `ui-joystick-vanish-live.cjs` cannot pass on this VM (timing), on main either.

## Release (attempted, blocked; nothing deployed)
- Ran once, from a clean tree at `2f107ee`:
  `NODE_OPTIONS=--test-reporter=spec scripts/release.sh "Hold the middle of the Home joystick: every bubble opens (rim still flies forward); joystick stays in Calm; no timed trips; one dark pop-up look; Billiards aim stick" --quiet`
  Output: `lock held 13:09:12` / `could not read live build (fetch failed); pass --no-live to bump without it`, exit 3.
  It stopped at `scripts/bump-build.cjs` (which must read the live version.json so the new build id is later than live), before
  any bump, commit or push. Afterwards: HEAD `2f107ee`, origin/main `b89991b`, clean tree. No `ci/` branch, no Pages deploy.
- Not worked around on purpose: `--no-live`, editing release.sh or a hand push to main would skip the live-build safeguard or go
  around the guarded workflow.
- Exact cause in this cloud sandbox: (1) its network policy denies `therealetm.github.io` (proxy log: "gateway answered 403 to
  CONNECT"); (2) Node 22's built-in fetch does not use the sandbox proxy unless `NODE_USE_ENV_PROXY=1`; without it github.io does
  not resolve (ENOTFOUND) and api.github.com answers 403 "API rate limit exceeded" for the shared egress IP, which would also stall
  `scripts/wait-ci.cjs`. With `NODE_USE_ENV_PROXY=1`: api.github.com 200, github.io still denied.
- Next step (owner or next developer): allow `therealetm.github.io` in this environment's network settings (or release from a
  machine that can reach it), then from this branch, clean tree:
  `NODE_OPTIONS="--use-openssl-ca --test-reporter=spec" NODE_USE_ENV_PROXY=1 scripts/release.sh "<summary>" --quiet`
  (`--test-reporter=spec`: Node 22 writes TAP when redirected, but release.sh and scripts/test-floor.cjs read spec's "ℹ pass N"
  lines, as CI's Node 24 writes by default; `--use-openssl-ca` is this sandbox's own NODE_OPTIONS.) release.sh then waits for CI on
  a `ci/` branch, fast-forwards main and runs `scripts/verify-live.cjs <build> --at-least --compare`; also read the CI "Live on GitHub
  Pages" job (same script) and check the changed files on the live site (misty-pad.js, sheet-style.css, room-table.js/.css,
  sun-meter.js, bloom-ring.js, home-blooms-v2.js, galaxy-still.css, galaxy-still-core.js) and an upgrade from an installed service
  worker (sw.js precaches the new sheet-style.css). Only then is it live.
- Coordination: issue #2's newest comment is from 29 Oct (no open CLAIM / RELEASING); nothing was posted there from this session.
