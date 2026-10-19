# Handoff: worlds playtest (Oct 19, 2026)

Branch `worlds-playtest`, worktree /home/sprite/wt-worlds-playtest. Coordination: /home/sprite/COORD-worlds-playtest.md (all claims released).

## Releases from this playtest
- 20261019-133916: guides keep the lesson on a language switch, never re-tell old lessons, call her Misty (W-001..003)
- 20261019-140135: guides gossip about each other; autopilot finds say Misty (W-004)
- **20261019-142930** (this run, main 794be53, 1557/1557 tests, CI passed, live files match): **Misty comes into the lung world (W-005)**

## This run: iPhone 13 in Safari's engine (Playwright WebKit `iphone13`), against the live site
- `node /home/sprite/WORLDS/play.cjs --url <live> --view iphone13 --worlds lung,brain,pancreas,gut,muscle` on 20261019-140135 (logs f6-play.log, f6b-play.log)
  - lung: Misty never came in (240 s timeout, twice; same in r4.log earlier). Bug W-005, fixed.
  - brain, pancreas, gut: entered, guide lines correct, names right (Spark, Isla, Villo; Misty, never Moss Leaf), gossip seen (Villo on Spark), no bubble on the joystick, on Misty or off screen, no small font, guide gone after leaving, no page errors.
  - muscle: not reached in that run; done afterwards on live 20261019-143513 (mus-play.log): entered in about 90 s on the loaded box, guide Flex intro + lessons, no bubble on the joystick or Misty, nothing off screen, no Moss Leaf, guide gone after leaving, no page errors.
  - Only flag on every world: the "Drag to look around · two fingers to zoom" tip is up inside worlds (harness reports any other text). Not covering anything measured; left alone (bug-hunt queue has the tip as a product question).
- `tests/oct19-exit-launch-live.cjs --views iphone13_webkit --weak 1` (live): problems [] , weak Misty pulled back in once ("My little engine sputtered. One more push?"), back inside liver as designed. f6-weak.log.
- Spirit world, autopilot (`/home/sprite/WORLDS/spirit.cjs` = tools/autopilot-probe.cjs + Ant-Man POV state), WebKit iPhone 13, live. Short runs (200 s, 240 s, 600 s) only got as far as `edge` / `atmos`: headless WebKit on this shared box (load 13 to 28 on 8 cores) renders at about 1.6 frames a second.
  **Long run, 1700 s on live 20261019-143513 (f6-spirit4.log, json out6/f6-spirit4*): everything seen.**
  - Explore log: edge, atmos, plan, hook, ride, visit, plan, hook, ride. Galaxy log: scan 40 worlds 46 currents, current 1 +, off current, current 18 +.
  - Ride: hooked string 1 (riding 1), rode it to the end, visited bubble world 10.
  - Ant-Man camera: POV k 0 to 0.835 while closing on string 1, 0.99 by the hook, 1.0 on the ride (tube 0.83); held at 1 near string 1 after the ride (holdOn, by design), eased down to about 0.08 as she left for the next string, then back up to 1.0 on string 18. Old tube faded (povOld 0).
  - Autopilot string transfer: plan, hook string 18, riding 18, POV switched to string 18, ride on string 18 (hops 2) when the run ended.
  - No crash, 1 load, page errors none. GL growth over 28 min: geometries 17 to 49, buffers 63 to 178, programs 20 to 26 (new strings and bubbles seen; not runaway, but worth a Chromium soak).
  - PINNED > 8 s flags (hook string 1 for 509 s, string 18 for 205 s, ride points about 10 s each) are the slow frame rate: about 1.6 fps means 509 s is about 14 s at 60 fps. Not a bug.

## W-005 detail
- Symptom: open the lung world (World map, or `LowiWorldRegions.travel('lung')`): flight state stays `idle`, no `join lung`, the guide Puff talks to an empty world. Brain got `join brain` + `inside` in about 20 s on the same box.
- Cause: misty-flight.js misty-roam join gate required a 3D hub beacon (`a.regions` from body-world-3d.js places: gut, liver, pancreas, muscles, heart, brain). The lung world exists only in body-world-regions.js REGIONS.
- Fix: pure `placeOk(id, regs, known)` in the misty-flight core (beacon OR a world LowiWorldRegions.byId knows; Home/unknown never). enterInside, recall and every exit path already fall back when a world has no beacon.
- Tests: tests/worlds-lung-join.test.cjs (3, all failed on the old code). Browser: lungprobe.cjs (Chromium 390, local: `join lung`, `inside`), play.cjs lung (WebKit iPhone 13, local 21 s, live 34 s, no errors), exit-launch `--world lung` (WebKit iPhone 13, local: problems []).
- DECISIONS entry + What's New (EN/DE/ES, slug lung-join).

## Left to do
- iPad (ipadL) and Chromium (chromium390) runs of play.cjs (all seven worlds) and exit-launch --weak: next task, one device per task.
- Spirit world on Chromium (`spirit.cjs --engine chromium --secs 600`) as a quicker soak of the GL growth above.
- Follow-up worth a decision: the lung still has **no hub beacon**, so the autopilot tour and flying in by steering never visit it; only the World map gets there. Giving it a beacon means body-world-3d.js places (+ hue/pos), a bigger change.
- Known, not ours: world-home.js / misty-scale.js / misty-hub.js still use the herb name 'Moss Leaf' (bug-hunt LEDGER).
- Harness notes: play.cjs waits for st 'inside' up to 240 s per world; on a loaded box WebKit entries take about 100 s, so give it time. Never run more than one WebKit browser at once here. A spirit-world WebKit run needs about 25 minutes to reach a string here (`--secs 1700`); run it in the background and poll with short calls (something on the box clears /tmp/exec, so long-sleeping exec calls lose their output).
