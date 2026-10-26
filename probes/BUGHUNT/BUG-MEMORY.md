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

- **P-PINCH-HOLD: a hold is one finger (BH-023 run 24, BH-024 run 25).** Every long-press timer must (1) never arm for a non-primary
  finger (`e.isPrimary === false`) and (2) die when any second finger lands anywhere, not only on the same element. Do not rely on a
  drift/slop cancel: Chromium (and likely iOS) stops delivering pointermoves once a two-finger gesture starts. Probe with one finger
  RESTING still (probe-pinch-rest.cjs) and the second finger starting on another control. Holds fixed: living-bubbles, world-home water +
  Misty, home-blooms-v2, settings-sleep, move-bubble, misty-turn (also skips while the controller is held), community-tab-order, bloom-ring
  Scan. Clean: community-chat galaxy person hold, body-world-3d onLong. Unchecked: misty-pad holdT, spike-catch, chat message hold.

## Run 7 lessons
- A probe flag is a question, not a bug: "PINNED hook" merged rows by leg, she was swimming 63 units at ~1 u/s. Read the distance.
- Harness taps on rects inside scroll boxes must check the rect is inside the box (newuser "Close sits on World map" was a hidden row).
- Live user reports during a run usually get their own task within minutes: check list_tasks before touching that area.
- **P-FRESH-SCRIM: the backdrop arrives under the finger (BH-025).** A sheet whose opener sits where its backdrop lands (top of the
  screen) closes on the 2nd tap of a double tap. fresh-scrim.js now guards full-screen body-child overlays and *-scrim layers for 350 ms.
  New overlays that are NOT a body child or not full screen are not covered: give them the same guard. Test with real input (mouse/touch),
  never el.click() (script clicks pass by design).

- **P-ORB-UNDER-FINGER: what the 1st tap opens lands a BUTTON under the finger (BH-026).** Home blooms put their middle orb on the
  bubble you tapped (pointer-events on at opacity 0), so a double tap / quick "tap again" pressed it: Move logged Steady steps, Sleep
  logged 6-7 h. Rule: a freshly opened chooser ignores pointer taps (e.detail > 0) made in its first ~400 ms, timed by e.timeStamp
  (not handler time). Same family as BH-025 (fresh backdrop) and gap-view's 450 ms mc guard. Find: RM=1 probe-orb-stack.cjs
  (Reduce Motion puts orbs at rest from frame 0). Still to check: any other chooser that opens around its opener (Misty's care card
  buttons vs her body, Community galaxy person card, Scan hold "all" view from the Scan bubble).
- **BH-028 (P-ORB-UNDER-FINGER, global):** fresh-scrim.js now also eats a real tap within 44 px of the opening tap for a new overlay's
  first 400 ms. So any body-child overlay is covered; NOT covered: in-place content swaps inside an existing sheet and page/tab swaps
  (Profile tile -> lvCard). Find more with probe-under-finger.cjs (RM=1; MOCK=1 for Community). Reduce Motion is the proof tool.
- **P-CLOCK-TEST:** a test that runs app code in vm.runInNewContext gets the REAL Date even when its fixtures are pinned: pass
  Date: FixedDate into the context. Week rollover (Monday 00:00) and month end are the trip points. A NODE_OPTIONS Date shim only
  shifts the outer clock, so offsets > 1 day give false fails in vm-based tests.


- BH-029 (run 29) P-LOOP-STOPPED-OVERLAY: a docked card whose visibility is driven by a loop keeps showing after the loop stops (closing/celebration state) and sits over sheets/tabs. Check: after a 'final' state, is anything still checking blockers? Siblings to check: other near-max z-index cards (ate-this, body-stats, companion, living-home, mirror-move, scan-glass, tutorial).
- P-CLOCK-TEST (again, run 29): tests built on Date.now() +/- offsets break near midnight (gap-time-sync). Run suspicious tests under TZ=Etc/GMT+1 etc. to shift local time.
- P-CLOCK-NO-DAY (BH-030, run 30): a clock time shown for an event that can be yesterday needs a day word (fast-edit.js at() is the house rule). Run 31 sweep: CLEAN for visible UI (probe-bare-time.cjs); meal-journal, slot picker, move bubble, sym-home only list today's items (logMeal keeps day == day(ts)). Only #fsCard lastTxt (index.html) lacks it and is display:none.
- P-OVERLAY-STACK (BH-031, run 31): an auto-opening overlay that waits on a NAMED busy list misses every dialog not on it (Day card opened over #fstRw fasting reward). Rule: auto-openers count any visible [aria-modal=true] (real visibility: rects+display+visibility+opacity, never position:fixed alone) minus their own. Already generic: tutorial.js busyBy, herb-tamagotchi EVO_BUSY, after-meal blocker, section-nav. Siblings to check: misty-hub nudge (named list), auto toasts/visits.
- P-LIVE-WRITE (26 Oct, weekly-ranking task): run 31's quick /tmp scripts (fsvis.cjs, amod.cjs) opened the LIVE app with NO route block, so the app signed in as a guest and pushed the Fixture state; amod logged a meal after midnight and fake "F" (Moss Drifter) took 1st on the new week's board (Emmanuel 05:33: "added a bot in there"). Run 26's /tmp/bh26-r2.cjs left five "E" guests the same way. All 7 deleted. RULE: every script, even a 20-line /tmp one, goes through lib.cjs L.open with the route block or mock-cloud; never pw.launch() + goto(live) bare. Safety net since 20261026-055906: automated browsers sign up with lowi_test:true (index.html lowiAnonOpts), so a slip is a hidden test account, but still a slip.
- P-CLOSE-UNDER-FINGER (BH-033, run 33): a choice that closes its chooser uncovers what was under the finger AT ONCE (.off = pointer-events none during the fade), so a double tap's 2nd tap presses the opener (Move Steady -> Move bubble reopened). Fix house rule: LowiFreshScrim.spent(e) at the closing choice; quiet(e) swallows same-spot taps < 400 ms. Check other choosers that close on a choice (sheets with option rows, Misty card actions) for the same.
- P-VIEW-AFTER-TAB (BH-034, run 34): opening a tab and switching its sub-view on a TIMER (setTimeout 60 ms, late by 0.3-2.5 s while Community builds / the warp runs) draws the default view first (galaxy with tappable people) and a deliberate tap there (450 ms, past BH-032's 400 ms guard) picks a person. House rule: say which tab you want (LowiCommunityTabs.want()) BEFORE goTab, then set the view in the same task (LowiRoomsUI.openOn(v) does both); want() keeps the first-tab rule, the For You stay rule and the galaxy warp off it. Probe: playtest/probe-rank-flash.cjs (rAF timeline of what is under the finger). Check other "goTab then setTimeout(showX)" callers (grep "goTab(" + setTimeout) for the same.
- P-REUSED-OVERLAY (BH-035/038/039, runs 35-39): an overlay made once and shown again by hidden/class toggle is not "born", so fresh-scrim's same-spot rule never covered its later shows. Rule: LowiFreshScrim.mark(el) on every show. All known sites done (#whX, #sheetwrap, .rm-menu, #spWorld). Watch for new ones: grep "hidden = false" / classList.add('open') on body-level nodes.
- P-FOCUS-BEFORE-CLICK (BH-039, run 39): swallowing a click is not enough when the 2nd tap lands on a FIELD: focus (and the iPhone keyboard) comes on mousedown, before click. fresh-scrim guardDown now prevents mousedown's default on fields for the same-spot / quiet taps. Any new tap guard must cover mousedown for fields too. Probes: record focusin, not only clicks.
- PROBE NOTE (run 39): in emulation the 2nd tap's real gap can stretch past 400 ms under load (568/881 ms); read the in-page timeStamps before calling a FAIL. A spring-open overlay is shrunk over the screen middle while it opens: test spots in the middle, not only where its controls sit at rest.

- P-CLOSE-UNDER-FINGER is now covered app-wide for DISMISS controls (BH-040, run 40): fresh-scrim guard spends every real tap on an X / close button (data-r2/act/sp/hb2/chat close, #whX, class xbtn / *-x / *-cx / *-close) or a *-scrim. New close buttons must follow that naming or they are unprotected. Choices that close (option rows) still need spent(e) at the call site. Probe recorders must listen at DOCUMENT capture: a window-capture recorder added in preInit runs before fresh-scrim and counts swallowed taps.
- P-ROW-SHIFT includes SWAP-UNDER-FINGER (BH-042, run 42): a control that turns into its own Undo (Buy again -> "N back" + Undo in the same row) is the same bug class: the 2nd tap presses the Undo. Mark both the action and its Undo data-spend. Steppers: only the step that removes the row (− at 1), never + or − above 1. Probe: playtest/probe-snack-dbl.cjs.
