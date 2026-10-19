# Bug memory (patterns that bit, and where to look for siblings)

- **Weighted placement picks the cheapest overlap, even on a control.** region-pals C.place minimises weighted overlap; when every spot
  overlaps something, it can land on a control. Rule now: controls (joystick) are never covered; dock instead. Sibling suspects: any other
  cost-based placement (hints, praise, tips, hologram), and any obstacle list that drops elements at opacity 0 while they fade in.
- **"Right above Misty's head" is on the ring.** Since the 8-bubble ring, Settings sits straight above Misty with Water and Fuel at
  her shoulders. Anything placed above her head (nudge BH-002, praise Q-1, first-timer hint) lands on them. Keep-clear lists written for
  the old Home (#whHud .wh-water, #spFast, [data-hb]) miss the ring: always use `[data-orbit], #whPad`.
- **Third sibling of "above Misty" (BH-003 praise).** Every floating line anchored to Misty needs the ring + joystick as obstacles and a dock.
  Left unchecked: Move bloom note (Q-2), #whHint (Q-3).
- **Fourth sibling: Move bloom note (BH-005).** A spot computed "beyond X, away from Misty" and then clamped to the screen lands back on X
  when X is at the edge. Never clamp blindly: test the clamped spot against the obstacles and dock. Also: an absolute box with
  translate(-50%) near the right edge shrinks to the space left of its `left` (110 px column); give floating notes `width: max-content`.
- **Dead event: listeners with no dispatcher (BH-004, fixed).** ~20 modules listened for `lowi:lang`; nothing fired it, and the picker
  bypassed LowiLang.set wrappers. When a repaint "never happens", grep for the dispatch, not only the listener. Strings a module builds
  once with its own T() need a repaint hook. Test language switches against a reload (probe-lang-match.cjs) and read aria-labels too.
  Enabling a dead event wakes every listener: re-run world + bloom switches for errors (probe-lang-world.cjs).
- **Obstacles read once and cached** (600 ms): elements that fade in after the read are invisible to placement. Keep controls clear while
  faded.
- **Emulation timing:** world clocks cap dt at 0.05 s; under software GL a 4.8 s exit takes 30 s+. Do not file slowness from emulation.
  Harness waits must poll state, not sleep fixed times. Run browsers one at a time when timing matters (parallel runs caused S-1 noise).
- **Escape works on blooms**; earlier "Escape did not close" was harness timing under stalls. Verify with LowiHomeBloomsV2.isOpen().
- **Two identity systems fighting (BH-006/007, fixed in 20261019-143513).** The old herb identity (LowiHerbTamagotchi.name ->
  auto name from the star sign, "Moss Leaf") and the newer own-companion record (LowiBirthCompanion, 'lowispike.companion.v1').
  (a) Display: anything showing Misty's name must use the companion name (own companion > typed name > "Misty"), never T.name().
      Fixed in world-home, misty-hub, misty-scale, spirit, cell-room; region-pals (worlds task) has its own rule. grep
      `LowiHerbTamagotchi.name(` / `T.name(` after every release; adventure.js was the worlds task's.
  (b) STORAGE KEY COLLISION: companion.js used the same localStorage key for Community prefs {share,traits,born} and its seed()
      overwrote the birth record within ~2 s, so "bring your companion to life" never survived. Pattern: two modules, one key,
      different shapes. Sweep: list every `lowispike.*` key literal per file and look for a key owned by two files
      (probe-companion-key.cjs reloads twice). Wiped records were also pushed to the cloud backup; they can't be recovered.
  Old wording "Your herb's world" still in spirit.js aria-labels (old-design purge territory, not changed).
- Harness: /home/sprite/BUGHUNT/playtest (lib.cjs, scenarios.cjs: home-abuse, world-churn, storage-corrupt; probes: probe-guide-joy.cjs,
  probe-ring.cjs, probe-race.cjs, probe-world.cjs, probe-cover.cjs (generic cover sampler), probe-nudge.cjs, probe-hint.cjs, probe-praise.cjs, probe-lang.cjs, probe-lang-match.cjs, probe-lang-world.cjs, probe-movenote.cjs, probe-name.cjs, probe-companion-key.cjs). Open-panel check skips <html> (it carries .hb2-open). Playwright at /tmp/pw/node_modules/playwright. Fixture init skips onboarding.

## Run 7 lessons
- A probe flag is a question, not a bug: "PINNED hook" merged rows by leg, she was swimming 63 units at ~1 u/s. Read the distance.
- Harness taps on rects inside scroll boxes must check the rect is inside the box (newuser "Close sits on World map" was a hidden row).
- Live user reports during a run usually get their own task within minutes: check list_tasks before touching that area.
