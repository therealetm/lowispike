# LOWiSPIKE bug-hunt ledger

## Run 1: Mon Oct 19 2026, 09:01 to ~09:50 CEST (base 20261019-080527, rebased on 20261019-091732)

### Fixed and live
- **BH-001 Guide speech bubble covered the joystick inside worlds** (2 to 4 s per visit, phone size). Live in **20261019-094129**.
  Cause: 260 px bubble has no clear spot beside the sidekick when it swims under #whPad with Misty below; C.place weighs Misty 4 vs joystick 2
  so it picked the joystick spot. Also: joystick at opacity 0 during swim-in was dropped from the keep-clear list.
  Fix: region-pals-core.js `dockSpot` + `PAD_IDS`; region-pals.js docks any line touching #whPad (16 px hysteresis), keeps faded #whPad clear.
  Tests: tests/guide-bubble-joystick.test.cjs (7), tests/guide-bubble-joystick-live.cjs (live build before: FAIL 4.1 s overlap; after: PASS
  Chromium 390x844 liver+heart, WebKit iPhone 13, iPad landscape; live site iPhone 13 PASS). Suite 1484/1484.

### Played and clean (no bug found)
- Home abuse (tap every bubble, Escape, spam x8, A-then-B races, rotate mid-animation, resize storm, hide tab mid-animation):
  Chromium 390x844 and WebKit iPhone 13. Zero JS errors, zero unhandled rejections, nothing stuck open.
- Corrupt storage (every lowi key = broken JSON / wrong type / setItem throws quota): Home loads, no errors.
- World enter/leave: works; very slow under software GL only because the world clock caps dt at 0.05 (by design).

### Suspected, not reproduced (watch)
- S-1: WebKit iPhone 13, once, under 3 parallel browsers: after a race ending on Scan, Misty (#spBubble) stayed invisible and taps opened
  nothing for the rest of the run (bw3-canvas on top, Misty size swinging 131..295). Same seed replayed alone: clean. Harness now records
  `why` (which ancestor hides Misty), html classes and world/flight state, so next time it shows the cause.
- S-2: after closing the scanner Home stays in wh-cosmos/wh-mapview for a while (dive back in) and the ring is smaller meanwhile; taps at the
  old ring positions miss. Probably just slow frames in emulation. Check on a timed real-speed run.
- Misty's bubble shrinks 182 -> 150 px over the first ~8 s after load (ring follows). Looks like an intro settle; not filed.

## Run 2: Mon Oct 19 2026, 10:01 to ~10:25 CEST (base 20261019-095111)

### Shipped
- **BH-002 Misty's Home nudge covered Settings, Water and Fuel and stole their taps** (sibling of BH-001). `#mhNudge` ("My sun is full!
  Peek in Today.", up to 4x/day) sat right above Misty with no keep-clear check; on the ring that spot is on Settings/Water/Fuel. Before:
  9-10 of 25 tap points stolen on each; tap on upper third of Water opened Today. Fix: `LowiMistyHub.nudgeSpot` docks top/bottom (no tail,
  `.mh-dock`) when the head spot touches any `[data-orbit]` or `#whPad`. Tests 1499 (4 new, all failed on old code). Live in
  **20261019-101824**, CI green, live bytes match, live WebKit iPhone 13 probe: no overlap, Water tap opens Water bloom.
  Proof also: Chromium 390, WebKit iPad portrait + landscape (local). Probe: playtest/probe-nudge.cjs (forces full sun).

### Checked, clean
- Generic cover sampler (playtest/probe-cover.cjs, every 250 ms, every floating text box vs ring bubbles, joystick, Misty): home idle,
  each bubble opened, liver visit. Inside the world: nothing covers the joystick (BH-001 holds).
- Blooms (hb2-orb, Fuel/Water/Sleep/Gap choices) overlap neighbouring ring bubbles while open: by design (bloom is the open state). Not filed.
- First-timer hint #whHint ("Drag to look around"): always hidden ("blk") on the ring because the spot above Misty touches Water, on phone
  and iPad. So new users never see it. Design question, not a bug; one 0.5 s flash seen under emulation (stale blk while the ring settles).

### Queued siblings (same class, not fixed yet)
- Q-1 Praise toast (praise.js place(), lp-praise) sits above Misty and only avoids the Daily Quest: covers Settings/Water/Fuel for its
  reading time (4.5 s+) after every logged action. pointer-events none, so visual only. Fix like BH-002: pass ring bubbles + #whPad as
  obstacles (place() takes one `quest` rect today; make it a list) and dock when blocked.
- Q-2 Move bloom note (p.hb2-note "Estimate, not steps", move-bubble.js fan avoid list '#whHud [data-hb], #spFast') sat 64% over the Move
  bubble itself while the bloom is open. Check whether the avoid list still matches the ring bubbles ([data-orbit]).
- Q-3 #whHint keep-clear list (world-home.js paintHint blk) lists old Home elements; ring bubbles other than Water and #whPad are missing.
  Latent while Water always blocks it.

### Next run: start here
1. Q-1 praise toast over the ring (fix like BH-002), then Q-2 Move bloom note. probe-cover.cjs already finds both; for praise, log water
   via the Water bloom and sample. Still to sample: Daily Quest, Community hologram, Settings side panel vs joystick, X buttons.
2. Re-run home-abuse on WebKit iPhone 13 alone, 3 seeds, to chase S-1.
3. Long autopilot soak (tools/autopilot-probe.cjs exists in repo now) for heat/memory signs: DOM node and heap growth.
4. Language switch EN/DE/ES mid-session; text overflow in DE in bubbles and panels.

## Run 3: Mon Oct 19 2026, 11:01 to ~11:25 CEST (base 20261019-101824)

### Shipped
- **BH-003 Praise line covered Settings, Water and Fuel after every logged action** (Q-1, sibling of BH-001/BH-002). `#lpPraise`
  ("I'm so proud of you!", 4.5 s+) sat right above Misty; praise.js place() only avoided the Daily Quest. Live 20261019-101824,
  Chromium 390x844: Settings 42-44%, Water/Fuel 10-15% hidden (visual only, pointer-events none). Fix: `place(a, b, quest, view, gap, obs)`
  takes controls ([data-orbit] visible + #whPad even faded, 4 px pad); clear spot kept; else other side of Misty; else dock top (56) or
  bottom, least cost incl. Daily Quest, `.lp-dock` no tail. No obs = exactly old behaviour. Tests: tests/praise-ring-clear.test.cjs (4, all
  failed on old code). Suite 1503/1503. Live in **20261019-110810** (main 43498d1, CI green, praise.js + sun-meter.css live bytes match).
  Probe playtest/probe-praise.cjs: before FAIL (live); after PASS Chromium 390, WebKit iPhone 13 (docks bottom), iPad P + L (docks top),
  liver world still a tailed bubble beside Misty; live WebKit iPhone 13 PASS.

### Found, open (next run)
- **BH-004 (Fixed, live 20261019-121209) Switching language mid-session leaves Home half in the old language until reload.** Repro: playtest/probe-lang.cjs or
  playtest/probe-lang-stale.cjs: start EN, LowiLang.set('de') (same as tapping the Language picker, index.html setLang ~l.7931, no reload).
  After 6 s in DE/ES the ring still shows "Move 0/4", "Scan", "Settings", "Sleep <Eintragen>", Gap "of 16 h Ends"; aria-labels of
  water/move/joy/scan/settings stay English, sleep/fuel aria lag (EN after ES shows "Sueño, sin anotar"). After a reload everything is
  correct in ES. Root cause (likely): setLang() only re-runs the DOM text translator (doNode) and dispatches no event, so modules that
  build their own strings with T()/lang() at render time (home-orbit-v2 ring labels, sleep, gap, move) never repaint. Fix idea: dispatch
  `lowi:lang` from setLang and repaint the ring/blooms on it (check who already listens for a lang event: grep "lowi:lang|langchange").
  Pattern: "text computed once at render in the current language". Siblings to check: Settings panel, Misty hub nudges, guides.
  Not a crash; probe found no JS errors, no overflow, nothing left open after Escape in EN/DE/ES.

### Played and clean (this run)
- probe-lang.cjs, live 20261019-101824, Chromium 390x844: 2 rounds DE/ES/EN, each bloom + Settings opened and Escaped per language: no JS
  errors, no rejections, no text off screen, nothing stuck open. (Only the stale-language issue above.)

### Still queued
- Q-2 Move bloom note over the Move bubble (home-blooms-v2.js moveNote: placed beyond the orb centroid, no keep-clear). Q-3 #whHint keep-clear list.
- S-1 (invisible Misty after tap race) still unreproduced; S-2 unchanged.

### Next run: start here
1. BH-004 language switch: find root cause, failing test, fix (index.html setLang event + ring repaint), release.
2. Q-2 Move bloom note, then Q-3.
3. home-abuse on WebKit iPhone 13 alone, 3 seeds (S-1). Long autopilot soak (tools/autopilot-probe.cjs) for heap/DOM growth.

## Run 4 (Oct 19 2026 12:01 CEST)
- **BH-004 fixed, LIVE 20261019-121209.** Root cause confirmed: ~20 modules listen for `lowi:lang` but nothing ever dispatched it; and the
  [data-lang] picker click handler called the inner setLang(), skipping every LowiLang.set wrapper. Fix: index.html setLang dispatches
  `lowi:lang` on document (bubbles to window, detail.lang); picker tap goes through LowiLang.set; home-orbit-v2 relabels Scan/Sleep/Settings
  (own words only, on the event + whenever lang differs from last written); misty-pad repaints joystick aria + autopilot chip; spirit.js
  refresh on lowi:lang + Misty aria head; cell-world repaints on lowi:lang. New probe playtest/probe-lang-match.cjs (mid-session vs reload,
  text + aria, digits normalised): live before FAIL 20 mismatches; after PASS Chromium 390 (api + click), WebKit iPhone 13, and LIVE iPhone 13.
  playtest/probe-lang-world.cjs (switch inside liver, then Home with water/fuel/settings open): no errors, nothing stuck, Chromium + iPhone 13.
  Tests 1,507 (4 new in tests/lang-switch-repaint.test.cjs, all 4 failed on old code), repo browser check tests/lang-switch-live.cjs.
- home-abuse live iPhone 13 seeds 11, 12: seed 12 "two panels open after race settings>move" was a harness false positive (the
  `.hb2-open` selector matched <html>); scenarios.cjs now skips html/body. No real bug.
- Watch (not filed): region-pals repaints the guide on lowi:lang by hide/show, so it shows its next line; a user who switches languages
  in a world may skip a lesson line. Settings side panel (home-settings-sleep-v2) has no lowi:lang repaint; the picker is not in it, so
  it is not open during a switch today.

### Next run: start here
1. Q-2 Move bloom note over the Move bubble (home-blooms-v2.js moveNote), then Q-3 #whHint keep-clear.
2. home-abuse on WebKit iPhone 13, more seeds (S-1 invisible Misty). Long autopilot soak (tools/autopilot-probe.cjs) for heap/DOM growth.
3. Lesson skip on language switch inside a world (check region-pals lowi:lang hide/show vs lesson index).

## Run 5 (Oct 19 2026 13:01 CEST, base 20261019-121209)
- **BH-005 fixed, LIVE 20261019-130951.** (Q-2) Move bloom note (p.hb2-note "Estimate, not steps · 0/4 today") sat on the Move bubble.
  Live 20261019-121209: Chromium 390 Move 67% + Medium/Long orbs 11%; iPad P orbs 28%, iPad L orbs 5%. Cause: moveNote() puts it beyond the
  orb centroid away from Misty; on a phone Move is at the right edge so that spot is off screen and the clamp (vw-110) put it back on the
  bubble; also shrink-to-fit squeezed the absolute box to 110 px / 3 lines near the right edge. Pattern: "floating line on the ring"
  (4th sibling) + "absolute box shrink-to-fit near the edge". Fix: core `noteSpot(s, first, obs, view, orbs)` + page `placeNote(ov)` after
  the bloom is attached (open + refreshOpen): first spot if clear, else above/below/beside the orbs, else dock top (56) / bottom; obstacles
  [data-orbit] visible, #whPad even faded, #f3Board, resting orbs from __layout, Misty circle; `.hb2-note{width:max-content}`.
  Tests: tests/move-note-clear.test.cjs (7, 6 failed on old code, 1 guards the data). Suite 1514/1514. CI green, live bytes match.
  Probe playtest/probe-movenote.cjs: live before FAIL (chromium390, ipadP, ipadL); after PASS chromium390 + iPhone 13 (dock top), ipadP
  (dock top), ipadL (beside orbs), iPhone 13 DE + real tap; refresh x15 + lowi:home-orbit + log a move and reopen: one note, still clear.
  LIVE WebKit iPhone 13 tap PASS. tests/home-blooms-v2-live.cjs PASS (Chromium 390).
- Sibling sweep: home-settings-sleep-v2 (Sleep/Settings blooms) has no floating note. Fuel/Water/Gap blooms have none.
- home-abuse live 20261019-130951 WebKit iPhone 13 seed 13: 34 steps, 0 findings (S-1 still not reproduced).

### Next run: start here
1. Q-3 #whHint keep-clear list (world-home.js paintHint blk): latent, and showing it at all is a design question for Emmanuel.
2. Lesson skip on language switch inside a world (region-pals lowi:lang hide/show vs lesson index).
3. Long autopilot soak (tools/autopilot-probe.cjs) for heap/DOM growth; more home-abuse seeds on iPhone 13 (S-1).
4. Still unplayed this build: offline mid-action, clock past midnight / Gap timer, Reduce Motion toggle mid-session, pinch storm.

## Clean streak
0 (run 8 shipped BH-008; run 7 was clean)

## Worlds playtest (separate task, Oct 19 2026 13:23 CEST, base 20261019-130951) - see /home/sprite/COORD-worlds-playtest.md
- **W-001 fixed (release in progress, see COORD).** Run 5 next-run item 2 "lesson skip on language switch inside a world" is DONE by the
  worlds task: region-pals `lowi:lang` did hide()+show(id) -> arrival ran again: second welcome back + NEXT lesson; lesson 4 stored as told.
  Live 20261019-130951 reproduced (tests/worlds-lang-lesson-live.cjs FAIL). Fix: lines carry src, core relang(), in-place re-say.
- **W-002 fixed (same release).** teach() used nextFact (session only): returning visitor got an earlier-visit lesson re-told after the
  "Remember?" question (liver: asked about lesson 1, 70 s later lesson 1 again). Now nextNew.
- **W-003 fixed in the guide (same release).** Guide hunt lines used the herb identity name ("Steer Moss Leaf toward the glowing dots").
  Now LowiBirthCompanion name (Misty fallback). **Siblings NOT fixed (other tasks' files): world-home.js Misty card title + mistyName(),
  misty-scale.js, misty-hub.js still use LowiHerbTamagotchi.name (adventure.js: fixed by the worlds task, 2nd release) -> "Moss Leaf" for users whose star sign gives that name.**
- Pattern: "rebuild-on-event replays the arrival" (any hide()/show() of a stateful guide re-runs opening: double greeting, skipped line).

- 2026-10-19 (old-design purge): census fixture "main" throws in renderProfile (index.html ~6111, `.map` of undefined) when S.user has no tags. Real users get tags from fresh(); likely fixture-only, worth a guard `(S.user.tags||[])`. Not fixed by purge.

## Crash squad (separate task, Oct 19 2026, see /home/sprite/COORD-crash-squad.md, /home/sprite/HANDOFF-crash-squad.md)
- **CS-001 fixed, LIVE 20261019-142709 (main 08585b5).** iOS tab crash/reload after a few world exits or weak pull-backs (Emmanuel:
  "pulled into the outer world bubble twice, then it crashed and restarted"). Cause: body-world-regions.js snapNow() made a new 2D canvas
  the FULL size of the 3D drawing buffer on every way out (twice on a weak pull-back; up to ~22 MB each on iPad) and snapDrop() only
  removed it from the DOM, leaving the bitmap to GC. iOS Safari caps total canvas memory -> WebContent killed (blank, reload, no JS error).
  Fix: copy capped at 500,000 px (drawImage scaled, only on screen for the 0.38 s fade) and every drop path sets width=height=0 (Safari
  frees at once), incl. the failed-draw path. tests/crash-snap-memory.test.cjs (4, all failed on old code). Soak: tools/soak/crash-soak.cjs.
- Pattern: "temporary canvas left to GC". Any canvas made per transition/frame must be capped in size and zeroed (w=h=0) when dropped.
  Sibling sweep for other per-event `createElement('canvas')` not done yet (next crash-squad / bug-hunt item).

## Run 6 (Oct 19 2026, 14:01-14:40 CEST), worktree /home/sprite/wt-bughunt-202610191202
- BH-006 FIXED (20261019-143513): Home called Misty "Moss Leaf" (herb auto name) in the Misty hub title, energy card ("Moss Leaf's
  energy"), Misty card, name under her bubble, and the friends-tree spot (sent to friends too). companionName() in world-home,
  misty-hub, misty-scale, spirit, cell-room. Probe probe-name.cjs failed on live 135912, passes on live 143513 (iPhone 13).
- BH-007 FIXED (same release): companion.js stored Community prefs in 'lowispike.companion.v1' = companion-birth.js's own-companion
  record; seed() overwrote it ~2 s after "bring to life". Prefs moved to 'lowispike.companionprefs.v1' (old prefs carried over).
  probe-companion-key.cjs failed on live, passes on live 143513 (iPhone 13) and locally in Chromium.
- Tests: +29 (25 + 4, all failed on old code). Suite 1586/1586 at release, CI green, live serves 143513.
- Release raced 3x on DECISIONS.md append conflicts; /tmp/bh6-rel.sh holds the shared lock across rebase + release (inner lock file).
- Key-collision sweep: no other key written by two modules with different shapes (weather/lang/menubar/theme are shared on purpose).

### Next run:
1. Old herb wording in spirit.js aria-labels ("Your herb's world") -> tell old-design purge or fix if unclaimed.
2. region-pals.js (worlds task) ignores typed names (onboarding Name step) while Home now uses them: ask/flag to worlds task.
3. spirit.js profile rename writes herb prefs name, but an own companion's name wins on display: check if that sheet is reachable.
4. Unplayed: offline mid-action, clock past midnight / Gap timer, Reduce Motion toggle, pinch storm. Autopilot soak = crash squad.
5. Q-3 hint = done by new-user walkthrough (142009). Misty-invisible glitch still unreproduced.

## Run 7 (Oct 19 2026, 15:01 CEST, base live 20261019-144057), worktree see .wt
- Live context: Emmanuel (live, onboarding as new user "Koji", Libra) said Home's light being does not look like the one onboarding gave
  him. Measured (playtest/probe-look.cjs, Chromium 390): onboarding birth companion svg is pink/magenta (hue bin 10, palette from
  companion-birth-core sign Libra); Home Misty is the blue glass cell (hue bin 7), herb identity palette only as small accents. Two look
  systems, Home never reads LowiBirthCompanion palette/look. OWNED by task "keep the onboarding companion on Home and Forms" (running,
  started ~15:20 CEST). Not touched by the hunt.
- Settings panel Close vs 'World map' row (newuser note): NOT a bug. probe-settings-x.cjs live iPhone 13: World map row is scrolled
  out of the list body (clip at 587, x at 595), every visible row centre hits its row, x hits x, x closes. The earlier report tapped the
  hidden row's rect. Harness lesson: never tap a rect without checking it is inside its scroll box.
- Clock past midnight / overnight hidden tab / skipped day (probe-clock.cjs, page.clock, Europe/Berlin): water 2/6 -> 0/6 at 00:00,
  Gap counts on (3h57 -> 4h00 -> 11h00 -> 37h "Goal reached"), no NaN/negative/undefined text, no errors. PASS.
- Reduce Motion toggled mid-session + mid-animation, offline mid-session, back online (scenario rm-offline, Chromium 390 + iPhone 13):
  no stuck panel, no errors. 3D goes to 2D fallback when Reduce Motion turns on (by design, body-world-3d.js L563) and stays 2D for
  the session after it turns off (fail() is permanent; watch, not filed). Harness: OPEN now includes .ss2-page and .mb-on.
- Autopilot soak 2x (tools/autopilot-probe.cjs, live, 420 s + 360 s with --json out/soak2.json): no crash, no reload, heap flat
  (31->25 MB), DOM flat, GL buffers grow 68->181 in the first ~2 min (galaxy strings/bubbles built) then plateau and are freed/reused
  (geo 49-51). Not a leak.
  The probe's "PINNED hook string 1 point 6 for 64-92 s" is NOT a stuck Misty: per-row log shows she is swimming the whole time,
  d 62.9 -> 6 over 64 s (0.35-1.1 units/s; slowest 0.5 u/s for the first ~15 s while wide() drops the inward part of her course
  around her own world). The planner's first string is ~63 units away. Hook guard (pin on -d, eps 0.5) correctly does not fire.
  Filed as SUSPECTED (tuning, product feel, Emmanuel's call): on autopilot she can swim ~1 minute toward the first string with no
  string visibly pulling her; also string 34 for 49-63 s. Probe lesson: "PINNED" for phase hook = same leg, not no movement; read d.
- Gap ring bubble: heading "Fasting" and no aria-label (others have aria). Naming = product (Gap vs Fasting), SUSPECTED, not touched.
- Pinch storm (probe-pinch.cjs, CDP two-finger touch, Chromium 390, live, seed 11): 8 Home bursts (fast/slow, cancelled mid-way,
  third finger, rapid 6x), pinch during the warp to Community, 4 galaxy bursts, back Home: PASS, no page left dimmed/scaled, one tab,
  Misty visible, no errors. Caveat: the Home pinches never warped to Community in the harness (camera not at widest), so the
  overPull->warp edge is not covered; next run: wheel-zoom Home out first, then pinch.
- Harness: other tasks' exec cleanup deletes /tmp/exec output of long exec calls; run long probes with nohup to out/ and poll with
  <60 s calls. Load average ~50 on 8 cores this run: CDP probes are ~5x slower, print progress per step.
- Shipped: nothing. No bug confirmed this run. Worktree removed (no changes). User not contacted (rule: nothing shipped).
Next run: start here
  1. If the onboarding-companion task has shipped, re-run probe-look.cjs (pink birth companion vs blue Home) on live to confirm.
  2. Home pinch -> Community warp edge with camera at widest (see caveat). 3. Gap bubble missing aria-label: check whether intended.
  4. Still open from earlier runs: region-pals typed names (worlds task), spirit.js aria "Your herb's world" (old-design purge).

## Run 8 (Oct 19 2026, 16:01 CEST, base live 20261019-155424), worktree /home/sprite/wt-bughunt-202610191402
- **BH-008 fixed, LIVE 20261019-160738 (main 53c27a8).** CI green, live bytes match; LIVE iPhone 13 probe-dayover + probe-dayshow PASS. The SUSPECTED Day-card-over-setup note below is confirmed as a class bug: daily-ritual.js
  tick() checked busy() only BEFORE opening #drDay (z 2147483000); once open it yielded only to #g1Ob/#lcUpd/gate-up/mf-on. Anything opened
  after it sat underneath: probe-dayover.cjs (openDay, then LowiR2.onboard() / a plain R2.sheet) on live iPhone 13: tap on setup's Next and on
  the sheet's button hit the DAY CARD. Natural path: setup opens late after a slow sign-in restore / reload mid-setup (seen once in CMATCH).
  Fix: open card also closes (unseen) when busy() turns true. tests/day-card-yields.test.cjs (5, 2 failed on old code). Suite 1639/1639.
  probe-dayover PASS iPhone 13 + Chromium 390 (local); probe-dayshow (quiet Home: card at ~3 s, no flicker, Let's go closes for the day) PASS both.
- Pattern "queued overlay checks busy only before opening": swept. arrival-cards (not modal), #drA2 (only on tap), lc-ov reveal (inside the setup
  sheet). Unchecked: herb-tamagotchi #lhEvolution (z 2147483500) and mirror-move .mm-ov: check whether they can auto-open over a later sheet.
- probe-look (birth companion vs Home) not re-run: companion task shipped 155424 with its own live check.
Next run: start here
  1. (done live) -> next: new-user flow end to end on live 160738 with a reload mid-setup.
  2. #lhEvolution / .mm-ov auto-open sibling check. 3. Home pinch -> Community warp at widest camera. 4. Gap bubble aria-label.
  5. Still open: region-pals typed names, spirit.js aria "Your herb's world" (old-design purge round 2 NOT released; its task ran out of budget).

## Note from onboarding-companion task (Oct 19 2026 16:00 CEST)
- Onboarding companion SHIPPED in 20261019-155424 (main f93f687): Home/Forms/care room/3D Misty draw the reveal's companion. Run-7 next-step 1 can run now.
- SUSPECTED (not fixed, seen once in CMATCH/flow.cjs round 1 on a base before 20261019-155424): after a reload during setup, the weekday "Day N" card (daily-ritual.js #drDay) was already open and sat above the setup sheet, blocking the birthday step's Next. tick() only closes #drDay for #g1Ob / #lcUpd / gate-up / mf-on, not when the setup sheet (.r2-ov.r2-obov) opens after it. Did not reproduce in 3 later runs. Check whether a real new user can see it.

## Run 9 (Oct 19 2026, 17:01 CEST, base live 20261019-163105), worktree /home/sprite/wt-bughunt-202610191502
- Found **BH-009 setup lost for good after a reload past the birthday step** (playtest/probe-newuser-reload.cjs RELOAD2=1, live,
  WebKit iPhone 13 + Chromium 390: "reload2:setupVisible=false,day=true"). Cause: saveOb(false) stores the birthday right after step 0;
  R2.authBoot reopened setup only when there was NO birthday. Photo/health/shopping steps skipped, setupDone stayed false, starter-plan
  interview (LowiHerbStart.afterSetup) never opened. Fix written + tests/setup-resume.test.cjs + probe on fix PASS (out/nur-*-fix.txt),
  but the run stopped before commit/release (no ledger/handoff written). Also wrote playtest/probe-tutorial-flicker.cjs (tutorial task fixed flicker itself, 172632).
- New-user flow with reload mid-setup (Run 8 next-step 1): Day card no longer over setup (BH-008 holds: "noDay,nextHit").

## Run 10 (Oct 19 2026, 18:01 CEST): finishing BH-009
- Rebased onto origin/main 30479ae (20261019-172632), clean. setupMid marker set by saveOb(false), cleared by saveOb(true); setupPending(s)
  decides authBoot reopen; R2.onboard resumes at step 1 when marked (reveal not repeated). Older accounts with bday and no marker untouched.
- tests/setup-resume.test.cjs 6 (2 fail on old code). Suite 1675/1675 (main 1669).
- Live 172632 Chromium 390 RELOAD2: still FAIL (setupVisible=false) -> bug confirmed on current live.
- Local fix Chromium 390 RELOAD2: PASS (setup back, next, shop later, closes, companion same on Home/Forms/reload, no errors).
- Pattern "progress saved mid-flow, but the resume check looks at a field filled early": swept setupDone readers: herb-start.js:91
  (starter plan, gated on setupDone: now reachable since setup finishes), index.html 10245 doSignup (setupDone && bday: ok), localData/
  hasLocalStuff (ok). Unchecked siblings: herb-start resume (hs interview interrupted mid-way?), companion-birth claim mid-way, tutorial-auto resume (AUTO worker owns).
- Run 8 sibling check (static): mirror-move .mm-ov opens only on a tap (k==='open'), not auto -> clean. herb-tamagotchi evolve() auto-opens
  #lhEvolution from refresh() whenever the stage rises (XP after a log), so it CAN open over a sheet (e.g. Log meal). Not probed yet: next run.
