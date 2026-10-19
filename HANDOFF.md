# HANDOFF: Joystick fades while you steer (JOYSTICK worker)

Status: DONE on the branch, READY FOR INTEGRATION. Not released, not live.
Branch: ui-joystick-fade @ b4704259b7d40c4e1a0743a7678bc476160d5d7f (pushed), base origin/main badebb0 (build 20261018-195906).
Branch CI run 39160445503: success.
This file is not committed on purpose (every worker writes a HANDOFF.md; committing them would collide at merge).

## What changed (one behavior, look only)
- misty-pad.js: `.mp-steer` goes on #whPad only while a finger actively steers: a drag past the dead zone, or the forward/back hold (startHold while a pointer is down). It comes off on pointerup, pointercancel, lostpointercapture, the page going hidden, window blur, and from the tick if no finger is down. A tap, keyboard steering (focus stays visible) and the back burst after the finger is gone never fade it. The class is written only when the value changes. `LowiPad.state().faded` added.
- misty-pad.css: `--mp-steer-o: .4` (lighter `.7` under prefers-contrast: more and prefers-reduced-transparency: reduce). Home rule `.wh-hud .wh-pad.mp-steer` is NOT !important, so every existing hide rule (Today, sheets, places, autopilot clean view) still wins. The in-world rule copies the keep-steering selector plus `.mp-steer`, with !important and the same `:not(.lw-clean-auto)` scope, so it outweighs the keep rule but autopilot still hides the joystick. The soft cross-fade is the existing base transition (opacity .25s). The 3D membrane follows because living-bubbles.js reads computed opacity (no change to that file).
- Untouched: glass style, white icon, no silver ring, size, place, forward/back/autopilot, world exit fixes, the chip, hide rules.

## Proof
- Unit: tests/ui-joystick-fade.test.cjs, 11 tests. On main before the change: 8 fail, 3 pass. Full suite after: 1389 pass / 0 fail (floor 1378).
- Browser (emulation only, never a real device): tests/ui-joystick-fade-live.cjs PASS on Chromium 390x844, WebKit iPhone 13, WebKit iPad landscape 1180x820, Chromium iPad. Each view: at rest opacity 1; drag 0.4 and still the element under the finger, mode drive; lift 1; forward hold 0.4, lift 1; tap never fades; pointercancel and window blur mid-drag bring it back; inside the liver world a drag fades it to 0.4 while Misty moves, lift 1. 3D membrane at rest 1, while dragging 0.4 (Chromium) / 0.65 to 0.73 (WebKit, it eases). First view also: reduced motion still fades (0.4) and comes back; more contrast fades only to 0.7.
- Regression: tests/joystick-bubble-style-live.cjs PASS on WebKit iPhone 13 (size 88/88, membrane opacity 1 at rest).
- Screenshots: /tmp/joy-fade-shots/after-<view>-{rest,steer,world-steer}.png
- Limit: in the software-rendered test browsers the fade back took 0.25 to 1.4 s to land because frames run slowly; the CSS transition is 0.25 s. Real-phone feel still needs Emmanuel's iPhone.

## Integrator to-do
- Cache busting: index.html loads misty-pad.js and misty-pad.css with ?v=; bump them per the release script (I did not touch index.html, sw.js, version.json).
- What's New en/de/es line, e.g. "The joystick goes see-through while you steer, so you can see Misty and the world under your thumb. It comes back when you let go."
- Optional DECISIONS.md line: joystick fades to 40% only while a finger steers; 70% with more contrast / reduced transparency; keyboard never fades it.
- Release via scripts/release.sh, then check Actions and the live version.json.

## iPhone check for Emmanuel after release
On Home, put your thumb on the joystick and drag: it should go see-through but keep steering Misty. Let go and it comes straight back. Try it inside a world too.

## Not done (queued separately)
Replayable forward/back tutorial.
