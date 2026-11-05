# Handoff: sheet-bubble-20261105 (WIP, NOT deployed)

Branch: `sheet-bubble-20261105`, from origin/main `b89991b` (live build 20261105-122814).

## Pushed commits
- `fa24929`: shared pop-up shell (`sheet-style.css`, linked in index.html before bottom-close.css, cached in sw.js), plus `tests/sheet-style.test.cjs`.
- `d2a98d0`: round-X gap set to 76px (measured 12px clearance in Chromium at 375x667, 390x844 and 430x932).
- The WIP increment-2 commit is listed in `git log` (labelled "WIP").

## Increment 2 (WIP commit)
- `misty-pad.js`: holding the Home joystick (520ms, cancelled by 10px drift, release, blur or hidden page) calls `LowiBloomRing.toggleAll()`. In Calm, steering is inert but the long press still works.
- `galaxy-still.css`: the joystick is no longer hidden in Calm levels. Only the chip and pins are hidden.
- `galaxy-still-core.js`: `keeps()` honours `userData.calmKeep`. The `living-bubbles` group and `misty-face` are marked with it.
- `bloom-ring.js` / `home-blooms-v2.js`: a single group is now taken from the shared all-groups layout (`placeShared` / `only`). Not checked in a browser.
- `sun-meter.js`: `TIMED_TRIPS = false`. `depart()` is a no-op and the send block/copy are hidden. `endTimedTrips()` brings trips that are still out home now, idempotently; collection goes through the existing `collect()`.
- `room-table.js`/`.css`: the hint sentence under the board is removed. A lower-left aim stick `.rt-stick` sits right of the Freundesbaum button and uses `C.aim` + `fire()`. It never fires by itself; cancel, lost capture, blur, hidden page and pagehide drop the aim.
- Tests: new `tests/companion-open-all.test.cjs`. `tests/galaxy-still-wiring.test.cjs` was changed on purpose: the joystick now stays visible in Calm, where the old test asserted it was hidden.

## Tests
- Focused suites pass.
- Full suite: 4454 tests, 4452 pass, 2 FAIL in `tests/ui-joystick-fade.test.cjs` (lines ~130 and ~165: "holding it (forward) fades / disappears after VANISH_MS").
- Cause: a press at home now arms the long press instead of the forward hold, so the joystick-fade-on-forward-hold behaviour conflicts with the new open-all long press.

## Remaining work and blockers
1. Choose how the two holds coexist. For example: arm the long press only while the knob is near the centre (no forward tilt), and keep the forward hold once the knob is tilted. Then make ui-joystick-fade pass without weakening it.
2. Re-run the full suite and `node scripts/release-check.cjs`, then `scripts/release.sh "..." --quiet` and `node scripts/verify-live.cjs <build> --at-least`.
3. Not checked: WebKit and a real iPhone, the EN/DE/ES visual matrix, bubble geometry in a browser, and the Billiards stick in a browser.
