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

## Run 48 (Mon 26 Oct 2026, 20:02 CET, base live 20261026-191635), worktree see .wt, branch bughunt-48
- From HANDOFF lead: dictation overwriting typed words. New probe playtest/probe-mic-typed.cjs (fake SpeechRecognition, Kitchen #kgQ, real keyboard typing). LIVE 191635 Chromium 390: 3 FAIL.
- **BH-048 FIXED (new pattern P-STALE-BASE):** mic-dictate.js startNative captured base = field text at tap time; every onresult wrote merge(base.value, words) and onend reset el.value = base.value. (A) words typed while listening vanished ("milk" + typed " and butter" + spoken "two eggs" -> "milk two eggs"); (B) words typed before the first result vanished at end; (C) text the app cleared meanwhile (chat Send) came back with the final words.
  Fix: wrote = last value written; changed() -> rebase(): base = caret(el), finalText = '', skip results already shown (seen). onresult and onend rebase first. tests/bh048-dictation-keeps-typed-words.test.cjs 5 (4 fail on old; real startNative/insert/caret + real core merge/tidy in a vm sandbox). Suite 3867/3867.
  Sibling sweep: grep for value restored from a saved/base/draft copy: only mic-dictate.js:320; community-chat caption already uses K.afterCaption (BH-020). Clean.
- LIVE 20261026-200906 (quiet, main 02d83cf5, CI https://github.com/therealetm/lowispike/actions/runs/40384243979/job/121788174641). Live probe-mic-typed PASS Chromium 390 + WebKit iPhone 13, 0 errors. Local probe-mic-sweep sessions PASS.
- Next leads: generic probe: every full-screen aria-modal layer + history.back() must not leave the app; tutorial-demo audio after leaving; bottom Undo bars; cycle delete in a browser; VoiceOver focus loss; level-up/badge moments. Not on a real iPhone (Safari dictation is the real engine there).

## Runs 49-51 (Mon 26 Oct 2026, 21:01-23:30 CET), worktree /home/sprite/wt-bughunt-202610262119, branch bughunt-50
- Run 49 built the generic probe playtest/probe-back-layers.cjs (every window.Lowi*.open/show on Home, guard, history.back(), app must stay). LIVE 20261026-200906 Chromium 390: 4 LEFT_APP (bl-live.txt): LowiBirthCompanion.openCreator, LowiHerbStart.openInterview, LowiWorldRegions.openMap, LowiWorldAudio.open.
- Run 50 added probe-back-world.cjs (inside the body world: map / Sound panel + back) and probe-back-user.cjs (Profile > companion card > creator > back x2): map + sound = WORLD_CLOSED_TOO, creator stayed on top of Home then LEFT_APP. Wrote fixes for 3 of 4 and the test, then the run stopped (no ledger, lock left).
- **BH-050 FIXED (new pattern P-BACK-ONE-LAYER: a layer that does not own its Escape, so back goes past it):**
  companion-birth.js creator: capture Escape -> closeOv(). body-world-regions.js World map: capture Escape removes #bwrMap only, focus to #bwrMapBtn. world-audio.js Sound panel: Escape moved to capture + stopPropagation (it closed the body world with it). back-swipe.js sig: + count of [role=dialog]:not([aria-hidden=true]) (fade-out ghost) + data-back-step values.
  Run 51: herb-start.js starter interview (full sheet, noClose, no Escape): capture Escape = one question back, plan/thinking -> last question, first screen = Not now (pendClear inline, starter-resume guard); hs-iv carries data-back-step; plan timer only advances if the step is still "thinking" (back during thinking no longer jumps to the plan).
  tests/bh050-back-closes-one-layer.test.cjs 7 (all 7 fail on old code). Suite 3889/3889.
- LIVE 20261026-230840 (quiet, main e80a731a, CI https://github.com/therealetm/lowispike/actions/runs/40410235299/job/121878794322). Live: probe-back-layers (the 4) ok Chromium 390 + WebKit iPhone 13; probe-back-world map+sound ok iPhone 13 + Chromium; probe-back-user creator ok iPhone 13; 0 errors.
- Flake note: probe-back-user B once reported "creator stayed open" locally while 3 heavy jobs ran in parallel; re-run alone PASS twice. Not a bug.
- Full sweep after release (bl51-live-full-i.txt, live 230840, WebKit iPhone 13): 63 openers ok (incl. the new Quick tour), 0 LEFT_APP, 0 STAYED_OPEN, 0 errors.
- Next leads: openers that opened "nothing" on Home need their own entry path (Move player/finish, meal journal, cart, people); tutorial-demo audio after leaving; bottom Undo bars; cycle delete in a browser; VoiceOver focus loss; level-up/badge moments.

## Run 55 (Tue 27 Oct 2026, 03:01 CET; live at start 20261027-020733), worktree /home/sprite/wt-bughunt-202610270202, branch bughunt-55
- Started from HANDOFF (P-SAVE-SHAPE siblings). probe-corrupt.cjs num,str on live 020733 (cr55-live.txt): BH-053 fixed the main-save crashes (micro-book, body-trips, spirit, misty-hunt, herb-identity, index.html 9136/11349/13227 were all the main save) and Home now boots with 8 bubbles, but still 7 boot errors: index.html fasting store st() (lowi_fast_v1, ~2025, via LOWI_FAST.startOf), the Gap card st() (~5936, known()), lis-push.js days() (lowi.pushAsk) "Cannot create property ... on number 42". Opener sweep (cr55-local.txt) added LowiEveningCatchup.open: evening-catchup.js get(C.STORE, {}) returned 42 -> stt.seen threw (open and Save).
- **BH-055 FIXED (P-SAVE-SHAPE, second class: `JSON.parse(localStorage.getItem(k)) || {}` keeps a saved number/text, the first write throws in strict code):** every such loader (43 sites in 28 files: index.html x11, fast-bubble, store-picks, home-blooms-v2, herb-quests, tutorial, tutorial-auto, tutorial-resume, cell-world, day-recap, lis-push, ranking, nutri-stats, adventure-tiers, community-chat x2, community-energy, sun-meter, misty-scale, misty-peak, body-trips x2, fast-edit, world-home x2, micro-book, gap-view, beta, gift-basket x2, tiktok-open, herb-start x2) now reads through `(o => o && typeof o === "object" ? o : {})(JSON.parse(...))` (lists and good objects kept as before; mechanical rewrite fix55/tx.py). evening-catchup.js get(k, d): an object default wins over a non-object saved value.
  Tests tests/bh055-save-shape-siblings.test.cjs 5 (5/5 fail on old: source guard for every JSON.parse(...getItem...) || {} + vm runs of the fasting st(), Gap st(), lis-push days(), catch-up get). news-once / update-news cut anchors updated to the new mem() text (same code cut, nothing loosened). Suite 3930/3930.
  Local after fix: probe-corrupt num+str Chromium 390: boot 0 errors, only corruption-only opener error left was the catch-up (then fixed); WebKit iPhone 13 num: boot 0 errors.
- **LIVE 20261027-032456** (quiet, loud 20000101-000000, main e1f1a3e9, CI https://github.com/therealetm/lowispike/actions/runs/40438370500/job/121972470107). Live after: probe-corrupt num+str, openers catch-up / day recap / fast / Gap: Chromium 390 boot 0 errors + 0 opener errors; WebKit iPhone 13 same (before: 7 boot errors). Not on Emmanuel's iPhone.
- Still unchecked (P-SAVE-SHAPE lists): `JSON.parse(...) || []` loaders followed by .push/.filter would throw on a number/text key ("not a function"); none showed in the opener sweep, so queued. Low real-world odds.

## Runs 56 to 60: double-tap sweep (Tue 27 Oct 2026, 03:17 to 09:40 CET), pattern P-DOUBLE-TAP
Pattern: the first tap of a fast double tap (2nd tap within ~400 ms on the same spot) changes or closes the view; the 2nd tap lands on whatever
the new view put under the finger and presses it (picks an answer, skips a step, opens a page). Fix family: the tap that changed the view is
"spent" (fresh-scrim.js guard, 400 ms same-spot window, by event timestamps); taps elsewhere, slower 2nd taps, keyboard, Escape and tap-outside
are untouched. Probes: playtest/dt-lib.cjs (two real CDP taps with controlled event timestamps, so a slow machine cannot stretch the gap),
dt-sweep.cjs + dt-screens.cjs (groups a to e), dt-ec.cjs, dt-cycle.cjs, dt-normal.cjs; outputs /home/sprite/dt-out/.
- **Run 56, BH-056 FIXED, LIVE 20261027-041738** (main 189073ad): a double tap in the evening catch-up (2nd tap picked a food in the next
  bubble), the starter questions or the tutorial picked or skipped something by itself. Test tests/bh056-catchup-view-same-spot.test.cjs.
- **Run 57, BH-057 FIXED, LIVE 20261027-055006** (main 28d7acbb): a double tap skipped a step in the Community welcome and the cook-along.
  Test tests/bh057-welcome-cook-view-same-spot.test.cjs.
- **Run 58, BH-058 FIXED, LIVE 20261027-061235** (main b21fc0c4): double taps in the Community profile pressed what the next view put under
  the finger. Test tests/bh058-profile-view-same-spot.test.cjs.
- **Run 59, BH-059 FIXED, LIVE 20261027-072307** (main 82e4f83c): buttons that close a sheet through the shared close (X, Done, rows) let the
  2nd tap press what was under the sheet. Test tests/bh059-close-spent.test.cjs.
- **Run 60, BH-060 FIXED, LIVE 20261027-094002** (quiet, loud 20000101-000000, news id unchanged, main 0c179ae4, suite 3957/3957, CI
  https://github.com/therealetm/lowispike/actions/runs/40475331586): screens that close through their OWN close path (not the shared close)
  still let the 2nd tap through: Move finish Continue, install guide X / Got it / Maybe later, settings ring rows (Look & sound, World sound,
  Language) hitting Home under them, quick tour Skip, My cycle Turn on (2nd tap landed on what the redraw put there; one run saw the Cramps chip
  logged). Fix: `closed(el, e)` helper in fresh-scrim.js, called by ~25 screens' close functions; My cycle Turn on / Turn off spend their tap.
  Also fixed: My cycle reopened while the old sheet was still sliding out showed an EMPTY sheet (paint() took the first #cwSheet in the page;
  the old sheet's late onClose also forgot the new one). Test tests/bh060-own-close-spent.test.cjs (fails on old code; site checks + a
  simulated Turn on -> Cramps double tap). Branch history kept on wip/bh060-own-close.
  Checked (simulated Chromium 390 only, local fixed tree then live 094002): group e sweep (install guide, settings ring, Move finish, quick tour)
  0 leaks; group d sweep (Today shop, week basket, herb shop, People, Community welcome, evening catch-up, e1 fast/day) 0 leaks, 0 errors;
  dt-cycle live: fast 2nd tap swallowed, 600 ms 2nd tap and a quick tap elsewhere go through, Enter turns on, Escape closes, reopen 250 ms
  after close shows the sheet; dt-ec live: catch-up 2nd tap swallowed (lag ~380 ms; the earlier "Yogurt with berries" pick was the test
  machine handling taps ~1.3 s late). dt-normal: tap / Escape / tap outside / Enter / slow 2nd tap behave exactly as on the old build.
  NOT checked in WebKit (simulated Safari) or on Emmanuel's iPhone/iPad.
- Open (P-DOUBLE-TAP, separate class, not fixed): same-button toggles flip twice on a fast double tap: Today shopping list item, People mic,
  Day/Night theme switch. Openers the sweep could not reach: cart, lcShop, deck (no global opener). Quick tour "Tap for sound" -> 2nd tap on the
  tour video (inside the tour, harmless).

## Clean streak
0 (run 60, Tue 27 Oct 2026: BH-060 found and fixed)

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
- **BH-009 FIXED, LIVE 20261019-184058 (main 64614c2).** CI green, live index/sw/version/apple-ui bytes match. Suite 1690/1690 at release.
  Release trap learned: killing release.sh during its CI wait freed the lock, another release jumped in, the commit no longer fast-forwarded:
  re-ran release.sh from the fix commit. Never do that again; just let wait-ci time out and re-run.
- #lhEvolution auto-open sibling: taken and fixed by the evolution-escalate task (EVO_BUSY in herb-tamagotchi.js). Mark checked.
- Run 10 end 19:00 CEST: live iPhone 13 probe still running (out/run10-live-i13.txt), next run reads it.

## Run 11 (Oct 19 2026, 19:01 CEST, base origin/main 3b5ae66 = 20261019-185352), worktree see .wt
- BH-009 live WebKit iPhone 13 probe (out/run10-live-i13.txt) PASS: reload2:setupVisible=true, ob:null, companion same, errs []. CLOSED.
- **BH-010 starter-plan questions lost for good after a reload** (sibling of BH-009, pattern "progress saved mid-flow, resume check
  looks at a field filled early"). herb-start.js afterSetup() opened the interview (IV) only in memory; setupDone already saved, starter
  null, nothing ever reopened it (only Profile > About you). Live 20261019-185352 Chromium 390, probe-newuser-reload.cjs RELOAD3=1:
  "iv:open=true -> reload3:ivVisible=false, starter=false" (FAIL). Window: the whole interview + 2.15 s after setup closes.
  Fix: afterSetup sets lowispike.hs-pending.v1 (in account backup); 'later' / 'done' clear it; resumeTick (400 ms poll, max 10 min)
  reopens when setupDone && !starter && Home active && no gate/.r2-ov/#ltTour/tour live/busyBy, after 800 ms quiet. Old accounts:
  no mark, never asked. tests/starter-resume.test.cjs (5, 4 fail on old code). herb-start.test.cjs exact-string assert kept intact.
  Suite 1734/1734 (main 1729). Local fix Chromium 390 RELOAD3: PASS (reopens once, Not now clears mark, closes).
- Local fix WebKit iPhone 13 RELOAD3: PASS. **BH-010 FIXED, LIVE 20261019-191500 (main e8c0b2c).** CI green (46 s), live sw/version/
  apple-ui bytes match, live herb-start.js has hs-pending. Live Chromium 390 RELOAD3 PASS (out/run11-live2-c390.txt).
  What's New "Your starter questions come back after a reload" EN/DE/ES. DECISIONS.md line added.
- Pattern sweep "in-memory flow after a saved milestone" (status): setup (BH-009 fixed), starter questions (BH-010 fixed), tutorial
  auto (own 'running' resume state: OK, tutorial-auto.js), companion-birth claim mid-way: UNCHECKED (next run).
- Clean streak: 0 (bug found).
Next run: start here
  1. (done) live iPhone 13 RELOAD3 PASS (out/run11-live2-i13.txt): reopens once, Not now clears, no errors. BH-010 CLOSED.
  2. companion-birth.js: reload in the middle of "bring to life" (claim) -> companion lost or doubled? Probe like RELOAD3.
  3. Home pinch -> Community warp at widest camera; Gap bubble aria-label (suspected); "Your herb's world" names (old-design purge, not ours).

## Run 12 (Oct 19 2026, 20:01 CEST, base origin/main adf0a67 = 20261019-191500), worktree /home/sprite/wt-bughunt-202610191801
- **BH-011 companion lost for good after a reload during the reveal** (sibling of BH-009/BH-010, pattern "progress saved mid-flow,
  resume check looks at a field filled early"). saveOb(false) stores bday + setupMid BEFORE the reveal; LowiBirthCompanion.save runs only
  on the reveal's Continue. A reload during the reveal -> R2.onboard resumed at step 1, reveal never came back, account stayed on the
  standard Misty (rec "Misty", Home not own cell, herb name "Lumi Leaf"). Live 20261019-191500 Chromium 390 probe-newuser-reload.cjs
  RELOAD4=1: "reload4:setup=true,reveal=false,has=false,step=1" -> home.has=false (FAIL, out/run12-live-c390.txt).
  Likely one more way friends ended up with the same Misty (alongside the companion.v1 overwrite the own-companion task found).
  Fix: index.html R2.onboard resumes at step 0 (birthday filled in) while LowiBirthCompanion.has() is false; step 1 once it exists.
  tests/reveal-resume.test.cjs (6, 1 fails on old code). Suite 1740/1740 (main 1734). Local Chromium 390 (bday+btime) and WebKit
  iPhone 13 RELOAD4: PASS (step=0, bday kept, reveal again, companion same on Home/Forms/reload, no errors).
  Known limit: setup never stores the optional birth time, so after such a reload it is empty and must be retyped (companion then from
  bday only). Product call; logged as Suspected.
  **LIVE 20261019-201827 (main 4e8beda).** CI green 31 s, live index/sw/version/apple-ui bytes match. What's New EN/DE/ES, DECISIONS.md,
  MAYA-HANDOFF Log line.
- Pattern sweep "milestone saved before the step that makes it real": Profile openCreator sets user.bday then reveal; closing before
  Continue leaves no companion but Profile card still offers "Bring it to life" -> OK. Tutorial claim step: own-companion branch, not
  released (not ours). Setup / starter / reveal now all covered.
- Clean streak: 0 (bug found).
- Harness traps: `pkill -f <pattern>` kills the exec shell itself (its own command line matches): kill by PID. WebKit run once hung
  with no network for 10 min; a plain restart passed in ~2 min.
Next run: start here
  1. (done) live 201827 RELOAD4 PASS: Chromium 390 (out/run12-live2-c390.txt) and WebKit iPhone 13 (out/run12-live3-i13.txt; first try hung, restart passed). BH-011 CLOSED. Emmanuel told (voice note + checklist).
  2. Home pinch -> Community warp at widest camera; Gap bubble aria-label (suspected).
  3. Abuse rotation not played on today's later builds: lang switch mid-session + Log meal 4-tile pop-up (new in 185352), Weight & BMI
     sheet spam/Escape (185115), world churn 30x.

## Run 13 (Oct 19 2026, 21:01 CEST, base origin/main 4e8beda = live 20261019-201827), worktree /home/sprite/wt-bughunt-202610191901 (no changes)
- Played the Log meal 4-slot picker (new in 185352) and the Weight & BMI sheet (185115) hard on live Chromium 390 + WebKit iPhone 13.
  New probes: playtest/probe-fuel-abuse.cjs, probe-slot-dbl.cjs, probe-slot-dbl-mouse.cjs, probe-slot-dbl-timed.cjs (CDP, Chromium).
- Weight & BMI: 12x open/close spam -> 0 sheets left, then 1; lang switch with it open -> title "Gewicht & BMI", typed 82 kg / 180 cm kept;
  5 rapid submits -> 1 weight row (deduped). No errors. OK.
- Slot picker: change <-> slot churn 10x, Escape: OK, no errors, no stacked sheets.
- **Suspected, NOT shipped: double tap on a slot tile pokes the next sheet** (meal box focus / Log meal / "Add your own numbers" /
  Misty's pick on Chromium). Every repro had the second tap land 400-1100 ms after the new sheet (this VM renders slowly), i.e. two
  separate taps, not a human double tap. With fast dblclick (second click 20-70 ms after the sheet) and CDP taps it only hits
  non-interactive text (sp-note / sp-quick-log). Not proven at human speed, so a global R2.sheet 350 ms tap guard was written,
  passed 1745/1745, then REVERTED (speculative change to shared code). Parked: BUGHUNT/parked/sheet-double-tap.test.cjs + the patch idea
  (capture click/mousedown/touchstart on ov, isTrusted && <R2.TAP_GUARD_MS). Only revisit with a real-phone report.
- Low, unreachable from the UI: LowiLang.set() while the Log meal sheet is open leaves sheet chrome English (Log a meal, Today's stats,
  Which meal is it?, NOW, Write, Snap, MANUAL, Log meal, MISTY SUGGESTS...). A fresh open in DE is fully German. The language picker is
  not reachable while the modal sheet is up, so no user path. Logged only.
- Keyboard-only: Escape with focus on <body> does not close an open Stats sheet (R2 Escape listener is on the overlay). Desktop only, low.
- Harness traps: port 8833 is used by another task's server (served build 154834): use a random high port. playtest/run.cjs world-churn,
  home-abuse produced no output in 40 min on live and was killed (by pattern; the exec survived this time).
- Clean streak: 1 (nothing shipped). Emmanuel not contacted (nothing shipped, nothing needs him).
Next run: start here
  1. Home pinch -> Community warp at widest camera; Gap bubble aria-label (suspected).
  2. World churn 30x on 201827+ (run.cjs hangs: run probe-style instead, or debug run.cjs first).
  3. Intuition playtest task (98f0954e) owns new-user/UX friction; stay on crashes/state bugs.

## Community crashes round 2 (forked task 9472a9a4, Oct 19 2026 21:57 CEST, see /home/sprite/COORD-community-crash-2.md)
- OPEN CC-2a: Emmanuel (iPhone, voice): reading the Community chat, scrolling up then down -> app kicked him out. Reloaded fine.
- OPEN CC-2b: in the Community galaxy, zoomed out "to see how many people are in", sending an energy burst -> kicked out.
- OPEN CC-2c: "It crashed again. It's almost sending energy" (while aiming). No device logs; not reproduced yet.
- Context: crowd simulation (~30 real members since 21:15 CEST) now fills the galaxy. Round 1 fix (20261019-184741) only bounded a 2-person shoot-out.

## Run 14 (Oct 19 2026, 22:01 CEST, base origin/main 6a18ff6 = live 20261019-213146), worktree /home/sprite/wt-bughunt-202610192001
- **BH-012 Home<->Community warp left a full-screen canvas for the GC on every warp** (CS-001 sibling, pattern "temporary canvas left
  to GC"). galaxy-zoom.js warpFx() made a new #gxWarp 2D canvas at w*h*dpr (780x1688 = 5.3 MB iPhone 13, ~22 MB iPad) per warp and
  stop() only did c.remove(). Zooming in/out between Home and Community piles them up; iOS caps canvas memory -> page killed.
  Possible contributor to Emmanuel's Community/zoom crashes, NOT proven as the cause (crash task 9472a9a4 still owns those).
  Fix: WARP_PX = 1.4e6 cap (normal iPhones unchanged at 2x, iPad landscape 1419x986) + width = height = 0 on stop.
  tests/warp-canvas-memory.test.cjs (3, all failed on old code). Suite 1766/1766 (main 1763).
  Probe playtest/probe-warp-canvas.cjs: live 213146 Chromium 390 FAIL (6 warps -> 6 canvases still holding 780x1688);
  local + LIVE 221918 PASS on Chromium 390 and WebKit iPhone 13; local WebKit iPad landscape PASS. probe-pinch.cjs local PASS.
  **LIVE 20261019-221918 (main a5d5338).** CI green 46 s, live bytes match. What's New EN/DE/ES, DECISIONS.md, MAYA-HANDOFF Log.
- World churn (new playtest/probe-churn.cjs, live 213146 Chromium 390, 15 of 30 cycles, routes hub / map hop / X): no growth.
  DOM 2043-2080, canvases 2, WebGL contexts 2 made, intervals 77-78, window+document listeners 763-765, no errors. performance.memory
  is bucketed (23.1 MB flat) so heap reading is coarse. The X route selector did not match in a world (cur stayed): check selector next.
- Canvas sweep (rest of the pattern): spirit.js shutter() makes 640 px + 1600 px canvases per food photo and never zeroes them (low
  frequency, 3/day): queued. community-chat.js:522-523 photo upload canvases: same, told crash task (their file). community-energy.js fx
  canvas: billiard task's file. Others (textures, 64-260 px sprites, fast-bubble attached once) fine.
- Clean streak: 0 (bug found and shipped).
- Exec trap: when a command runs longer than ~60 s the exec output file goes missing: write probe output to a file, read it in a 2nd call.
Next run: start here
  1. spirit.js shutter(): zero both canvases after toDataURL/toBlob (check snap-fix / snap-food-ai claims first).
  2. probe-churn.cjs: fix the X exit selector, run all 30 cycles on WebKit iPhone 13.
  3. Home pinch -> Community warp at widest camera on WebKit iPad (warp canvas now capped).
- FIXED (build 20261019-222537, release in progress 22:26) CC-2a/b/c likely shared cause, measured on the live site signed in as crowd member 029 with writes blocked (BUGHUNT/crowdshoot/probe*.cjs): 58-66 people, ~24k SVG elements, every paint rebuilt the whole galaxy and the whole chat list (1.2 MB HTML) ~11x/min idle, because plantHTML ids come from a global counter. Fix: community-chat.js stableIds() in mate() + patchKids() for #cgField/#cmList. After: 0 idle rebuilds/min, garbage nodes in a scroll/zoom/shoot session 131k -> 37k, layouts 1685 -> 371 (Chromium). WebKit iPhone 13 run: no errors, but the VM renders WebKit at ~0.2 fps, so not a device-level proof.
- Owner call: "sent you energy" line removed (LowiCgMap.energy) + hidden via messages() ENERGY_LINE. Crowd task asked (COORD-crowd-note-from-crash-task.md) to stop posting it.
- Measured, NOT changed: 65 infinite cgBob orb animations cost ~2.7 s style per 10 s idle on the VM (Chromium). Pausing all Community animations did not lower total main-thread time, so left alone. Candidate if crashes continue: stop the bob in crowds > 24.
- Bots sending real energy + crowd on Home: crowd task (item 20) and task "incoming-message companion visits on Home" (item 23) own those.
- LIVE 20261019-222537 verified 22:31: live probe (crowd member 029, writes blocked) 66 people, 0 rebuilds in 45 s idle.

## Run 15 (Mon 19 Oct 2026, 23:00 CEST)
- New probe playtest/probe-newfeat.cjs abused tonight's features on live 20261019-224907 (rename spam / 40 chars / "!!!" / lang switch with
  form open / emoji+HTML name, every aura tapped fast, XP 900 -> 14500 with card open, Forms, reload). Rename, aura, Forms "10 of 10": OK.
- **BH-012 FIXED, LIVE 20261019-231247 (main 0f3ffeb).** herb-tamagotchi.js plant() had six-step tables ([..][i]) after the ten-form release:
  index 6-9 -> face at translate(130 undefined) OUTSIDE the body, stem/body ellipse undefined/NaN, halo+sparkles only at i===5.
  Hit every standard-Misty user at >= 4,500 XP on Home, card and Forms (Forms nodes 7-10 for everyone on the standard art).
  Fix: g=clamp(i,0,5) for tables, i>=5 for halo/particles, CSS float for lh-stage-6..9. probe-highform.cjs: 0 bad attrs, 0 faces outside.
  Sibling sweep: cell-world cellParts/ownParts already clamp to 5; companion-core uses st>=5/6 (fine). No other [6 values][i] tables.
- **BH-013 FIXED, same release.** refresh() saved lastSeenStage BEFORE the evolution showed; evolve() waits while a card/sheet is open;
  reload in the wait = evolution lost forever. Repro live (probe-evo-reload.cjs: card open, XP 5000, refresh, reload -> never shown).
  Fix: prefs.evoFrom saved with lastSeenStage, replayed on refresh, cleared in finishEvolution. Local Chromium + WebKit iPhone 13 pass,
  closes cleanly, no replay after a second reload. SAME FAMILY as BH-009/010/011 (progress saved early, resume reads the early field).
- Noted, not a bug: Escape x4 did not close the card after the Glow sheet (keyboard-only, iPad w/ keyboard); check next run with probe-esc.
- Known (aura-rename task said so): a few aria labels still say "Misty" after rename ("Misty's gift of the day" aria on iPhone 13).
- VERIFIED LIVE 231247: probe-highform iPhone 13 (0 bad, 0 faces outside, 0 SVG console errors); probe-evo-reload Chromium + iPhone 13 pass.
  (iPhone pageerrors = harness-blocked Supabase fetches for the fixture user, expected.) Suite 1838/1838, CI green 46s.
- Next run: 1) Escape after Glow sheet; 3) spirit.js shutter()
  canvas zeroing (still open); 4) hunt the "saved early" family in level-up / badge / Pathfinder celebration code (food-paths just shipped).

## Run 16 (Tue 20 Oct 2026, 00:01 CEST)
- **BH-014 FIXED, LIVE 20261020-001606 (main 6f2c616).** Pattern "temporary canvas left to GC" (CS-001 / run-14 warp sibling sweep) in
  the camera + photo paths: spirit.js shutter() 640 preview + 1600 upload canvas (~8.5 MB per snap on a 1920 camera); index.html
  closeScanner() dropped CAM.cv (ZXing frame canvas, iPhones have no BarcodeDetector); decodeFile() cv + up to 3 rotated rc canvases
  (~31 MB per failed barcode photo); community-chat.js shrinkPhoto() 1600 + 240 canvases (~7.5 MB per photo); resizeImage(900),
  label photo (480), video poster (360). Fix: width=height=0 right after toDataURL / inside the toBlob callback; freeCv() helper.
  tests/photo-canvas-memory.test.cjs (5 tests, all 5 fail on old code). Browser probe playtest/probe-photo-canvas.cjs
  (lib.open now takes opts.args; Chromium fake camera): live 001606-before = snap 3.81 MB + 3 scanner sessions 3.03 MB held off-page;
  local fix = 0 / 0. WebKit iPhone 13 local: 0 held, no page errors. (Its barcode-photo step never got a file chooser: selector, fix later.)
- **BH-015 FIXED, same release (test harness).** tests/home-visit.test.cjs "toast stays away" read the machine clock and failed every
  night 22:00-08:00 (standard quiet hours), which would block every night release. Pinned prefs quietEnabled:false in that test.
  Passes under UTC / Los_Angeles / Tokyo. Lesson: any test touching community toasts/visits must pin quiet hours.
- Suite 1843/1843, CI green 46s.
- Next run: 1) Escape after Glow sheet (probe-esc); 2) "saved early" family in level-up / badge / Pathfinder celebration
  (pfAward saves D.pf before the celebration; low risk, check); 3) probe-photo-canvas barcode-photo selector; 4) sweep other tests for
  wall-clock dependence (run suite under TZ=Asia/Tokyo and TZ=America/Los_Angeles).
- VERIFIED LIVE 20261020-001606: probe-photo-canvas Chromium on live: snap 0 MB, scanner 0 MB held, no errors.

## Run 17 (Tue 20 Oct 2026, 01:01 CEST)
- **BH-016 FIXED (release 20261020-011459).** Pattern NEW "focus dropped to <body>". apple-ui.js motionClose gave focus back only when
  NO sheet was left (`!R2.top()`), so closing a sheet opened from a sheet (Glow over the companion card) left focus on the closing sheet,
  then <body>. From <body> the card's own keydown handler never fires: Escape did nothing, Tab walked the page behind (iPad keyboard,
  VoiceOver lost its place). Same for repaint-by-replaceWith inside a sheet (misty-hub mood tap, Glow aura pick).
  Fix: refocusTop() at close start and at removal (trigger if still connected inside the top sheet, else its .r2-sh);
  R2.keepFocus(old,new) swaps and refocuses the same control by data-* keys (misty-hub repaint, world-home repaintMisty);
  document keydown safety net bodyKey(): Escape/Tab with focus on <body> act on the top closable sheet only if elementFromPoint at the
  sheet hits it (nothing covering it) and nobody preventDefault'ed.
- **BH-017 FIXED, same release.** Pattern NEW "dying overlay counted as open": misty-hub sheet() and world-home openDetails/repaintMisty
  found the closing (.r2-ov.off) #mistyHub / #whMs by id and just repainted it, so holding Misty again (or tapping Glow again) while the
  old one slid away opened NOTHING. Fix: sheet()/liveMs() skip elements inside .r2-ov.off; rename helpers scoped to the live card (q()).
- tests/sheet-focus.test.cjs (7; the 6 focus/keepFocus tests all fail on old code, the dying-overlay test fails on old code).
  Probe playtest/probe-stack-focus.cjs: live 001606 = after closing Glow focus BODY + Escape leaves card open; mood tap -> BODY, Escape
  dead; close+reopen card -> nothing open; close+retap Glow -> nothing open. Local fix Chromium 390: all pass. WebKit iPhone 13 local:
  A/C/D/E all pass (only my too-strict "no .off left" check failed because the suite was loading the VM; slow VM keeps .off sheets ~5 s).
  playtest/probe-off-linger.cjs: closed sheets do leave the DOM (5-6 s on this slow VM = spring under throttled rAF), not a leak.
- Suite 1850/1850.
- Pattern sweep TODO (same "focus dropped" family, now covered by the bodyKey safety net for keyboard, but VoiceOver still jumps):
  other replaceWith repaints inside sheets: community-chat.js (6 sites), daily-ritual.js 3x, care-actions.js, care-board.js, hydration.js,
  meal-flow.js, quests.js, region-pals.js, xp-history.js, companion.js 2x, home-move.js, cyclelog.js, region-friends.js, voice-input.js.
  Switch them to LowiR2.keepFocus where they live inside an R2 sheet. "Dying overlay" family: grep other `getElementById(..)` "already
  open -> repaint" checks for R2 sheets (companion.js V.ov, care sheets, quests).
- Suspect (not a bug yet): version.json is 280 KB because every release prepends What's New text; every update check downloads it.
- **LIVE 20261020-011459 (main be1cb22), CI green 61s.** Verified on live with probe-stack-focus.cjs, Chromium 390 AND WebKit iPhone 13:
  Escape after Glow closes Glow then the card; mood tap keeps focus on the button and Escape closes the card; close+reopen card opens a
  card; close+retap Glow opens Glow; 0 page errors. (Probe's "pass" flag false only from the strict no-.off-left check: slow VM, 2 browsers.)
- Next run: 1) VoiceOver "focus dropped" sweep: move the replaceWith repaints listed above to LowiR2.keepFocus (start with
  community-chat.js and daily-ritual.js); 2) "dying overlay" sweep; 3) "saved early" in level-up / badge / Pathfinder celebrations;
  4) probe-photo-canvas barcode-photo selector; 5) TZ sweep of the suite (TZ=Asia/Tokyo, America/Los_Angeles); relax probe-stack-focus
  "no .off" check.

## Run 18 (Tue 20 Oct 2026, 02:01 CEST), worktree /home/sprite/wt-bughunt-202610200001
- "Dying overlay" sweep (run-17 item 2): R2 sheets found by class/id: only misty-hub/world-home had it (fixed run 17). beta.js #bSheet,
  home-blooms-v2 st.ov, top-bar #tbWx, companion.js V.ov all null/replace their reference at close start. CHECKED, clean.
- TZ sweep (run-17 item 5): suite 1850/1850 under TZ=Asia/Tokyo and America/Los_Angeles. Under Pacific/Kiritimati (UTC+14) 4 fail:
  person-card-dates (3, test expects 16 Oct for a noon-UTC stamp, it is 17 Oct there: test-only) and companion-birth 20k looks
  (1994-12-31 does not exist in Kiribati, validDate rejects it: real-world edge, not worth a change). Logged, not fixed.
- **BH-018 FIXED, LIVE 20261020-020848 (main 1498fa7), CI green 46s.** Pattern NEW "async result painted into stale UI". Found by playing: Scan tab "Or find a
  product…" nameSearch awaited searchName then always opened an R2 sheet: double Enter = 2 identical sheets, typo fix = 2 stacked
  (live 20261020-011459, probe-search-dbl.cjs Chromium 390: doubleEnter ["apfel","apfel"], twoSearches ["apfl","apfelsaft"]).
  Fix: NS_SEQ token (only newest search paints) + NS_OV replaced if still open. Sibling in catchCur (Pathfinder catch awaits
  doCatch/server): after the await it used the module REV, i.e. whatever card was open by then: next product's card got "caught"
  class; manual add replaced the new card's .b3-rev with the old product (CUR stayed the new one, so "I ate this" logged the new
  one under the old card). Fix: remember rev, paint only if REV===rev, connected, not .off, contains btn. Reward unchanged.
  tests/stale-async-ui.test.cjs (6; 5 fail on old code, the 6th guards the normal burst). Local fix: probe-search-dbl Chromium 390
  + WebKit iPhone 13 pass (1 sheet each, newest search, 0 page errors). Suite 1856/1856.
- Pattern sites still unchecked ("async result painted into stale UI"): discovery.js showPhoto (double tap -> 2 photo sheets,
  IndexedDB is fast, low), mirror-move.js goCamera/328 (await camera then sheet), owner-admin.js 187/192/203 (owner only),
  community-chat.js / meal-flow.js awaits that repaint (not swept).
- Next run: 1) finish this pattern's sweep (list above); 2) VoiceOver keepFocus sweep (run-17 list); 3) "saved early" in level-up /
  badge celebrations (pfAward: saves D.pf with the award, celebration only cosmetic, low); 4) barcode-photo selector in
  probe-photo-canvas; 5) Kiritimati: make person-card-dates tests TZ-proof (optional).
- VERIFIED LIVE 20261020-020848: probe-search-dbl Chromium 390 + WebKit iPhone 13: double Enter = 1 sheet, typo fix = only "apfelsaft",
  single search OK, 0 page errors. Catch race covered by unit tests only (needs a slow server answer to play).

## Run 19 (Tue 20 Oct 2026, 03:01 CEST), worktree /home/sprite/wt-bughunt-202610200101
- **BH-019 FIXED.** Pattern "async result painted into stale UI", camera flavour ("stale start owns the camera"). Found by playing
  Move > Mirror mode on live 20261020-020848 with a slow fake getUserMedia (playtest/probe-mirror-cam.cjs, Chromium 390):
  A "Without camera" during "Starting the camera…" -> 1 camera track live in free mode; B tracker import fails (offline) while the
  permission is pending -> "Camera not available" + 1 live track behind it; C close (Escape) while starting, reopen, start again ->
  2 live tracks, 1 left live after close; D resumecam then Escape while starting -> TypeError flow null (resumeCam:333) + html.mm-cam left.
  Root cause: startCamera assigned the module `stream` after its await with no ownership check; Promise.all rejection left the pending
  getUserMedia running; resumeCam had no closed-while-starting check. Fix: camGen token (stopCamera bumps it), startCamera(gen) stops its
  own tracks if gen moved on, goCamera/resumeCam bail on gen mismatch, resumeCam gets the ov/flow check, tr.onended from the local stream.
- Sibling fixed: discovery.js showPhoto double tap -> 2 photo sheets (PH_SEQ + PH_OV replace). Other getUserMedia sites checked clean:
  spirit.js food cam (foodCam!==h guard), index.html startCam1 (CAM!==mine guard + CAM.starting), community-chat recStart (rec!==r).
- tests/mirror-cam-race.test.cjs (6; 5 fail on old code, test 1 guards the normal start). Runs all of mirror-move.js in a vm with a tiny
  DOM and hand-answered camera/tracker (tracker import swapped for W.__import in the test only). Suite 1862/1862.
- Local fix: probe-mirror-cam Chromium 390 + WebKit iPhone 13 pass (A/B/D; C locally hits "tracker could not load" because the local
  static server can't serve the mediapipe import, dual start covered by unit test 4). 0 page errors, 0 rejections.
- Pattern sites still unchecked ("async result painted into stale UI"): owner-admin.js 187/192/203 (owner only), community-chat.js /
  meal-flow.js awaits that repaint (not swept).
- Next run: 1) community-chat.js / meal-flow.js await-then-repaint sweep; 2) VoiceOver keepFocus sweep (run-17 list); 3) "saved early"
  in level-up / badge celebrations; 4) barcode-photo selector in probe-photo-canvas; 5) unplayed abuse: clock past midnight / Gap timer,
  Reduce Motion toggle mid-session, pinch storm, 20+ min soak.
- **LIVE 20261020-030834 (main 8d89e5a), CI green 46s, suite 1862/1862.** VERIFIED LIVE probe-mirror-cam Chromium 390 + WebKit iPhone 13:
  A 0 live tracks in free mode, B 0 behind "Camera not available", C 1 camera while starting (was 2) and 0 after close (was 1),
  D no TypeError, 0 tracks, no mm-cam; 0 page errors, 0 rejections.

## Run 20 (Tue 20 Oct 2026, 04:01 CEST), worktree /home/sprite/wt-bughunt-202610200201
- **BH-020 FIXED.** Pattern "async result painted into stale UI", stale-snapshot flavour. Run-19 item 1 sweep of community-chat.js
  awaits. sendPhoto took ds=draftState() before `await mediaUpload` and afterwards ran `if(ds.draft.text)draft('',null)` +
  `inp.value=''`: anything typed while "Sending photo…" showed was erased (input stays enabled during the upload). Reproduced on live
  20261020-030834 with playtest/probe-photo-caption.cjs (crowd member 29 signed in, upload fulfilled by the probe after 5 s, every
  other Supabase write aborted incl. POST /rest/v1/messages, ws broadcast/presence dropped: NOTHING posted): A typed "Is the soup any
  good?" during upload -> box "" after. Fix: LowiChatCore.afterCaption(sent,cur) (caption, also as prefix, and answered reply leave;
  anything newer stays), sendPhoto re-reads draftState() after the await. tests/photo-caption-typing.test.cjs (6; all fail on old code,
  5 via the new helper). Suite 1868/1868. Local fix Chromium 390 + WebKit iPhone 13: A keeps "Is the soup any good?", B (kept typing
  after caption) keeps "and a question about the soup", 0 page errors/rejections.
  Probe notes: page.fill on #cmInput doesn't stick (refresh rewrites value from the store draft): set value + dispatch input instead;
  #cmSend is 0x0 until there is text/photo (mic swap): click via evaluate; reset #cmPhotoFile.value before a 2nd setInputFiles.
- Sweep results (community-chat.js): send/react/delete/blockPerson/sharing/report awaits checked clean (actor/scope guards or
  harmless detached writes). sendVoice never touches the draft (reply stays: design). takePhoto: last shrink wins, low.
  meal flows: food-photo-ai.js mount (box.isConnected + typed flag) and index.html readMeal (C!==c0 guard) clean.
  Unfixed low siblings: index.html trPhotoIn change handler (For You composer) `C.photo = await resizeImage` with no C re-check
  (TypeError if C nulled mid-resize, photo into a newer composer); index.html f2File snap `F.photo = src` after await without F.on
  re-check. Both need close+reopen within ~300 ms.
- Next run: 1) the two low siblings above (cheap: capture C/F token, bail if changed); 2) VoiceOver keepFocus sweep (run-17 list);
  3) "saved early" in level-up / badge celebrations; 4) barcode-photo selector in probe-photo-caption-style probe-photo-canvas;
  5) unplayed abuse: clock past midnight / Gap timer, Reduce Motion toggle mid-session, pinch storm, 20+ min soak.
- **LIVE 20261020-041521 (main ab03ebc), CI green 46s, suite 1868/1868.** VERIFIED LIVE probe-photo-caption Chromium 390 + WebKit
  iPhone 13: A keeps "Is the soup any good?", B keeps "and a question about the soup", 0 page errors, 0 rejections, nothing posted
  (POST /rest/v1/messages aborted by the probe). Not tested on a real iPhone.

## Run 21 (Tue 20 Oct 2026, 05:01 CEST), worktree /home/sprite/wt-bughunt-202610200301
- **BH-021 FIXED.** Pattern "async result painted into stale UI", run-20 item 1 (the two low siblings). Reproduced by PLAYING live
  20261020-041521 (playtest/probe-photo-pick.cjs, FileReader slowed to 1.5 s by the probe, Chromium 390): For You "+ Post", "Only you"
  (private, stays on the phone, nothing online), caption, Add a photo, Post right away -> pageerror + unhandled rejection
  "TypeError: Cannot set properties of null (setting 'meal')" at index.html:4506. Note: `C.photo = await x` evaluates C BEFORE the
  await, so the photo itself went into the old object; the visible damage was the TypeError and a repaint/meal reset of the newer
  composer (the close+reopen case did NOT show the old photo live). Food snap f2File: `F.photo = src` after the await DID write into
  a reopened flow (F replaced by open) and called stepPhoto: unit test only (needs close+reopen inside the shrink).
  Fix: trPhotoPick(x,h) captures c0=C, bails if C!==c0; f2Pick(f) captures f0=F, bails if F!==f0 or !F.on. tests/photo-pick-stale.test.cjs
  (6; 4 fail on the old logic, 2 guard the normal pick). Suite 1874/1874. Local fix probe-photo-pick Chromium 390 + WebKit iPhone 13:
  normal pick shows 1 thumb, reopen stays empty, private post during shrink: 0 page errors, 0 rejections.
- Still open (low, design-ish -> Suspected): tapping Post while the photo is still shrinking sends the post WITHOUT the photo the user
  picked (silently). Could make Post wait for the shrink (C.busy + post after). Not changed: behaviour choice.
- Unfixed low sibling: index.html onPhoto (legacy Scan, #camInput/#shFile): setTimeout 1800 sets SCAN.stage="confirm" + focus with no
  tab/SCAN check; two picks inside 1.8 s = two timers. Probably legacy (renderScan2 replaces renderScan). Unchecked whether reachable.
- Pattern "async result painted into stale UI": all known index.html / community-chat.js / meal flow sites now checked. Remaining:
  owner-admin.js 187/192/203 (owner only), legacy onPhoto above.
- Next run: 1) VoiceOver keepFocus sweep (run-17 list); 2) "saved early" in level-up / badge celebrations; 3) barcode-photo selector in
  probe-photo-canvas; 4) unplayed abuse: clock past midnight / Gap timer, Reduce Motion toggle mid-session, pinch storm, 20+ min soak;
  5) legacy onPhoto reachability.
- **LIVE 20261020-051313 (main 09a95ba), CI green 46s, suite 1874/1874.** VERIFIED LIVE probe-photo-pick Chromium 390 + WebKit iPhone 13:
  normal pick 1 thumb, close+reopen during shrink stays empty, private post during shrink 0 page errors / 0 rejections (was the
  TypeError). Food-snap case unit tests only. Not tested on a real iPhone.

## Run 22 (Sun 25 Oct 2026, 19:01 CET, first run after the 5-day credit pause), worktree /home/sprite/wt-bughunt-202610251802
- Context: main moved ~990 commits since run 21 (Maya 6 works from her own computer, her own odd-hour "Simulated user bug hunt" and
  even-hour "Code error sweep" are logged in MAYA-HANDOFF.md Log). This ledger is stale for anything after 20 Oct: read that Log first.
  Live 20261025-173238 (main 8bea1cd3), heat pass (power-saver.js) released 20261025-160619.
- Suite on 8bea1cd3: 3382/3382 (`node --test tests/*.test.cjs`, not `tests/`).
- tools/sweep-live-errors.cjs live, WebKit iPhone 13 + Pixel 7: 0 errors, 0 failed requests, no crash.
- NEW playtest/probe-bgfg-loops.cjs (Chromium 390, live): 30x hidden/visible storm, 15x pagehide/pageshow, Reduce Motion on/off x6
  with taps, tabs with hide/show each, idle 95 s to deep, deep + 10x hide/show, tap wakes (35 rAF in the first second). rAF/s
  stays flat (15-16), live setIntervals 90 before and after (no leak, no lost timer), 0 errors, no reload. PASS.
- NEW playtest/probe-who-loops.cjs: idle Home has 90 live setIntervals from ~40 modules (500-700 ms pollers: misty-pad 500,
  install-guide 600, finch-extras 700, index.html 700 x2...). Not a bug; heat note for Maya 6 if she trims pollers. World loop draws
  ~5.5/s in rest+saver as designed.
- probe-clock.cjs FIXED (tool only): start used a fixed +02:00, so in winter time "00:01" was really 23:00 and midnight was never
  crossed. Now DST-safe. Rerun live: water 2/6 at 23:57 resets to 0/6 at 00:00:51, hidden night + next-next day fine, 0 bad texts.
  The probe's meal-log step no longer logs a meal on the new UI (gap stays "no meal logged"): Gap across midnight not covered.
- Not touched: Community/chat (task e829cc44 "Community + chat crash on real iPhone" still open, paused on credits).
- Clean streak 1. Nothing shipped, Emmanuel not contacted.
- Next run: 1) fix probe-clock meal step for the new Fuel UI and play Gap across midnight; 2) pinch storm + 20-min soak on
  20261025-173238 (Home only, Community belongs to e829cc44); 3) before any fix, check MAYA-HANDOFF Log for Maya 6's hunt of the
  same hour so the two hunts don't fix the same thing.

## Run 23 (Sun 25 Oct 2026, 20:01 CET), worktree /home/sprite/wt-bughunt-202610251901, branch bughunt-23
- Base origin/main e896a808 = 20261025-195920. Fresh target: the iOS-feel spring work released 194711 (spring.js, rubberband.js,
  misty-bloom.js spring path, apple-ui sheet settle, Room camera, pills).
### Fixed (shipped quietly, build in rel23.log / below)
- **BH-022 Fasting panel opened invisible after Reduce Motion was switched on mid-session.** Live 20261025-195920, Chromium 390 and
  WebKit iPhone 13: open Fasting (LowiFastStop.open), close, Reduce Motion on, open -> #sheetwrap open (screen dimmed), #sheet
  opacity 0 / scale .14. Cause: #sheet is reused; the spring's last fold-back frame stays inline + mb-sp (keyframes off); the
  reduced-motion open/close path never cleared them. Fix: misty-bloom.js drop(el) (stop spring, clear paint + mb-sp, __mbFin) on
  every non-spring open and close. Test tests/bloom-reduce-motion-switch.test.cjs (3; 2 fail on old). Probe
  playtest/probe-rm-bloom.cjs [url] [engine] (WAIT=4 for WebKit: its rAF is very slow under emulation, a 900 ms wait is not enough).
  Local PASS Chromium 390 + WebKit iPhone 13. Suite 3465 local, 3472 after rebase.
### Pattern P-RM "dual path (spring vs reduced) leaves the other path's state behind"
- misty-bloom open/close: FIXED (BH-022). Only reused bloom panels hit it: #sheet (Fasting). r2 sheets, Weather, Sound panel are
  fresh elements each time; #whToday is prep-only (CSS keyframes).
- apple-ui settle(): checked clean (stop(s) cancels the old loop before the reduced jump).
- spring.js create().to(): checked clean (reduced -> rest at target).
- community-chat camTo()/camRelease() reduced branches: UNCHECKED, low (a camRun spring in flight when Reduce Motion flips; camera
  left past the rubber edge after a drag under Reduce Motion). Community, play it next.
- liquid-glass.js page-edge springBack when calm(): UNCHECKED, low.
### Noted, not filed
- WebKit (Playwright, iPhone 13) under emulation: the bloom spring advances ~3 frames per second (dt capped 0.064) -> panels look
  half-open for seconds. Emulation only (Chromium is fine, no rAF wrapper in power-saver.js). Real iPhone: unknown, low.
- Clean streak 0.
- **LIVE 20261025-200749** (main 76781689, quiet, tests 3472/3472, CI green, verify-live same; misty-bloom.js live has BH-022).
  Live probe-rm-bloom PASS Chromium 390 and WebKit iPhone 13 (WAIT=4), no errors. MAYA-HANDOFF Log line pushed (main e336befc,
  release.sh --quiet --no-bump --no-verify: main is protected, a plain push is refused).
- probe-bloom-spam.cjs (Sound + Fasting open/close 24x, gaps 0/30/80/150 ms) PASS on live 20261025-200419. Note: 1.5 s after the
  last open at gaps 0/30, html.sp-moving was still on (clears after close). Not a bug yet; check whether some spring keeps running.
- Not on Emmanuel's iPhone.

## Run 24 (25 Oct 2026, 20:01 UTC) - pinch fires a bubble's long press
- **BH-023 FIXED, LIVE 20261025-213603** (main b31a4828, quiet, tests 3498/3498, CI green, verify-live same).
  Found by playing: probe-pinch.cjs seed 24 on live 20261025-202023 ended on tab-move after pinch bursts on Home.
  probe-pinch-move2.cjs: a slow pinch with one finger resting on the Move bubble -> living-bubbles.js long press (540 ms) -> Move page.
  Cause: living-bubbles.js followed only the pressing finger's pointerId, so a second finger never cancelled the long press; a second
  finger landing on a bubble re-armed the press there (meals -> meal details, running fast -> start-time editor).
  Fix: living-bubbles.js counts touch fingers (cleared on each isPrimary pointerdown, so a lost lift cannot jam it); a 2nd finger ends
  the press. Siblings guarded with `e.isPrimary === false` -> cancel: world-home.js water hold (water reset!), home-blooms-v2.js
  Fuel/Move hold, home-settings-sleep-v2.js Settings/Sleep hold, move-bubble.js fallback hold.
  tests/pinch-no-long-press.test.cjs: 6 tests, 3 fail on old code. probe-pinch-hold.cjs (every [data-orbit] + stage, pinch in/out,
  finger on the bubble): old live BAD move in/out (Move page) + water in/out (Fuel sheet opened: second finger on Fuel); fixed live all ok.
  probe-hold-still-works.cjs: one-finger hold Move -> page, tap Water/Move -> bloom, hold Fuel -> meal log: same before/after.
  probe-pinch.cjs seed 24 on fixed: stays on Home, warp out/back PASS. smoke-webkit-home.cjs (WebKit iPhone 13): taps open, no errors.
  WebKit multi-touch cannot be driven in Playwright: the pinch itself was only played in Chromium (CDP touch).
- Pattern P-PINCH-HOLD (new): a hold/long-press timer must die when a second finger lands. Checked: living-bubbles, world-home water,
  home-blooms-v2, settings-sleep, move-bubble fallback (all fixed); body-world-3d map (already pts.size !== 1). UNCHECKED: misty-turn.js
  (Misty's long press -> card, only while she is out flying; it owns the first finger with stopPropagation), spike-catch, any
  long-press outside Home (chat message hold? community galaxy person hold?).
- Checked clean this run: community-chat.js camTo/camRelease reduced branches (P-RM: reduced release snaps via place()/mapClamp, which
  clamps z too); liquid-glass.js springBack under calm (spring.js rests at target); html.sp-moving 1.5 s after spam = headless emulation
  slowness (springs at 0.56 after 500 ms, rest by 3 s; nothing never-resting). Home keyboard focus sweep (probe-focus-drop.cjs, every
  Home bloom, Enter on each button): no focus dropped to <body>.
- Noted, not filed: Meal details (new, 202023): two JS clicks open two stacked sheets (R2.sheet has no dedupe); a real pointer/touch
  double tap gives 1 sheet (Chromium) or opens-then-closes on a <=90 ms double tap (WebKit: 2nd tap lands on the scrim). Same as the
  parked "double tap pokes the next sheet". Low. Also: md jsonb CHECK is octet_length <= 4096; worst-case multibyte names could exceed
  it and the share would fail; realistic meals are < 1 KB. Low.
- Clean streak 0.
- Not on Emmanuel's iPhone.

## Run 26 (25 Oct 2026, 22:01 UTC) - P-FRESH-SCRIM: a double tap flashes a sheet open and shut
- Base live 20261025-221414, worktree /home/sprite/wt-bughunt-202610252201. Shipped quietly: LIVE 20261025-231656 (main a5d7336a), tests 3514/3514, CI green.
- P-PINCH-HOLD leftovers checked, none: misty-pad joystick tracks pointerId (a 2nd finger just takes over, no hold opens anything);
  spike-catch.js has no hold; no chat-message hold exists; clean-view padP.hold only shows the controller. Pattern closed.
- "Saved too early" sweep: level-up = evolution (BH-013 fixed). Only other one-shot: after-meal-checklist finish() saves P.fin and the
  achievement before paintFinal 450 ms later. Low, logged in HANDOFF.
- New probe playtest/probe-people-abuse.cjs (mock cloud, stable phx_ref seat/leave; tools/sim/mock-cloud.cjs unseatAll sends leaves
  WITHOUT phx_ref, so the client never drops anyone: harness trap). Modes: default abuse run, GAPS=-1,40,.. double-tap timing, R2CHECK=1.
- **BH-025:** live Chromium: every double tap on Community "N here now" (2nd tap 40-400 ms later) left 0 sheets: People opened and the
  2nd tap landed on its backdrop (ov itself), closing it. WebKit <=90 ms did the same on Meal details (run 24 note). Fix: fresh-scrim.js,
  window capture click: a TRUSTED click whose target is a full-screen (>=90% viewport) direct body child, or a *-scrim child of one,
  added < 350 ms ago (MutationObserver on body childList) is swallowed. tests/fresh-scrim.test.cjs (9; all fail on old: no file).
  sw.js: own STATIC.push line (tests/community-room.test.cjs pins the STATIC line start: first release attempt failed on that).
- Live after release: Chromium + WebKit iPhone 13 double tap 40/90/150 ms -> 1 sheet; R2CHECK: R2 scrim tap at 60 ms ignored, at 700 ms
  closes, a button in a sheet 120 ms old works; presence churn / lang de-en / hidden tab with People: header count == rows, 0 errors.
- Not covered: overlays not under body or not full screen (see HANDOFF 1). Not tried on Emmanuel's iPhone.
- Clean streak: 0 (shipped). Emmanuel contacted (shipped).

## Run 25 (25 Oct 2026, 21:01 UTC) - P-PINCH-HOLD siblings: a second finger arms Misty's hold
- **BH-024 FIXED, LIVE 20261025-221414** (main e0c0fafd, quiet, tests 3505/3505, CI green, verify-live same). Live checks: probe-pinch-rest
  all 18 ok (every bubble in/out), probe-one-finger-hold PASS, smoke-webkit-home (WebKit iPhone 13) no errors. Found by playing:
  probe-pinch-rest.cjs (finger A RESTING still on each Home bubble, finger B slides in/out 1.2 s) on live 20261025-213603:
  BAD gap in/out + move in/out -> Misty's card (mh-ov) opened. Finger B started near Misty. probe-pinch-rest-who.cjs stack:
  world-home.js wireMistyHold armed its 520 ms hold for ANY finger on #spBubble (the 2nd finger, isPrimary false); its only cancel was
  "a second finger ON Misty". Chromium stops delivering pointermoves once a 2-finger gesture starts, so the drift cancel never ran.
  Fix: world-home.js `if (e.isPrimary === false) { if (t) { stop(); pid = null; } return; }` first in pointerdown. Siblings, same rule:
  misty-turn.js (in flight: a 2nd pointer clears S.own.lp; lp armed only when isPrimary !== false && !padHeld(), rechecked at fire;
  before: holding the controller and resting a thumb on Misty opened her card mid-flight), community-tab-order.js (onOther: a 2nd
  pointerdown before the tab lifts -> end(false)), bloom-ring.js Scan hold (isPrimary false -> scanCancel, no longer relies on drift).
  tests/second-finger-no-hold.test.cjs: 7 tests, 4 fail on old code (wireMistyHold run for real via new Function extract).
  Suite 3505/3505. Local fix: probe-pinch-rest gap/move/spBubble all ok; probe-one-finger-hold.cjs: one-finger hold on Misty -> card,
  quick tap -> no card, hold Scan -> all blooms: PASS.
- P-PINCH-HOLD now checked: + world-home wireMistyHold, misty-turn, community-tab-order, bloom-ring scan (fixed); community-chat galaxy
  person lpT (clean: lpStop on every pointerdown + pts.size===1 at fire); body-world-3d onLong (clean, padHeld + pts.size).
  UNCHECKED: misty-pad holdT (id-based, probably fine), spike-catch, chat message hold.
- Main moved during the run: Maya 9 -> Maya 10 handover docs (0.13). First release.sh attempt timed out in my foreground exec, the
  second hit a MAYA-HANDOFF rebase conflict: re-applied the log line on new main. Lesson: run release.sh with nohup in background.
- Clean streak 0. Not on Emmanuel's iPhone.

## Run 27 (25 Oct 2026, 23:01 UTC) - P-FRESH-SCRIM sibling: the 2nd tap presses the orb that just landed on the bubble
- Base live 20261025-231656, worktree /home/sprite/wt-bughunt-202610252302. **BH-026 FIXED, LIVE 20261026-003948** (quiet, tests 3567/3567, CI green). Live after: probe-orb-stack RM=1 acted 0/4, bloom stays open; a deliberate 700 ms tap still logs; smoke-webkit-home (WebKit iPhone 13) water and move open, no errors.
- Found by playing: probe-bloom-dbl.cjs (double tap every ring bubble at 20-150 ms, Chromium 390, live): Move gap 40/60 ms -> ledger
  "Move · Steady (5k–10k)", +11 XP. probe-orb-stack.cjs: home-blooms-v2 puts the middle orb ON the tapped bubble (final spot:
  Move Steady 25 px from centre, orb r 33; Sleep 6-7 h and Fuel Cook 34 px; Water Cup/Bottle 42 px = part of the bubble). Orbs have
  pointer-events at opacity 0 and the scrim sits over the bubble, so "tap again" or a double tap presses an orb you cannot see yet.
  With Reduce Motion (RM=1) the orbs are at rest from frame 0: live Move logged Steady (@11 ms), Sleep pressed 6-7 h and closed.
- Fix: home-blooms-v2.js ORB_ARM_MS = 400; onBloomClick returns (after preventDefault/stopPropagation) when e.isTrusted && e.detail > 0
  && tapTime(e) - st.openedAt < 400. tapTime = e.timeStamp when it is on the performance.now clock, else now(). st.openedAt set in
  open() and openAll(). Keyboard (detail 0) and script clicks untouched; tests/bloom-orb-double-tap.test.cjs 7 (3 fail on old code).
- Local: probe-orb-stack RM=1 old acted 2 (Move, Sleep) -> new 0, bloom stays open; probe-orb-dbl-ts gap 700 deliberate tap still
  logs Steady. Harness note: CDP concurrent taps with explicit timestamps do NOT reproduce a fast double tap (2nd click never fires,
  old and new alike); Playwright taps are serialized behind swiftshader frames (~1 s), so use RM=1 to get the at-rest geometry.
- Also checked, nothing to fix: #appearancePanel (persistent body child, but #appearanceBtn is not visible in the current Home);
  ss2 settings chips (Settings opens the profile hub now, ss2 'more' is a fallback only); #fstRw (full-screen body child, fresh-scrim covers).
- Soak: probe-soak.cjs 13 min on live (restless Home play, hide/show, language switch, pinch): heap 28-30 MB flat, nodes 2102->2462
  then flat, intervals 91-92, no errors/rejections. Cut short at min 13 by a VM exec restart (start it with setsid next time).
- Clean streak 0. Not on Emmanuel's iPhone.

## Run 28 - Mon 26 Oct 2026 00:02-00:50 UTC (live 20261026-003948 -> 20261026-012600)
Area: P-ORB-UNDER-FINGER siblings outside Home. New tools: playtest/probe-under-finger.cjs (seeded monkey taps visible controls;
in-page detector logs when a tap's new UI puts a DIFFERENT control under the same finger at 0/60/150/300 ms; RM=1, MOCK=1 for
Community via mock-cloud, TABS=... picks reset tabs incl. 'misty'; lib.open gained opts.ctxHook) and playtest/probe-slot-under.cjs.
- **BH-028 FIXED (quiet, LIVE 20261026-012600, main 7f6f7a6a):** with Reduce Motion, Log meal -> double tap "Snack" pressed the Snack
  sheet's "Snap" (live WebKit iPhone 13, 27 ms after the sheet existed): sheet gone, photo picker open. Chromium: the 2nd tap focused
  the meal box (keyboard). Run 13 parked the R2-wide guard for lack of human-speed proof; RM=1 is that proof.
  Fix: fresh-scrim.js remembers the last real tap; an overlay born (body child, even if moved later, e.g. spirit world) within 600 ms
  of a tap links to it, and for its first 400 ms ignores a real tap (detail > 0, by e.timeStamp) within 44 px of that spot. Taps
  elsewhere, keyboard, script clicks pass. tests/fresh-overlay-same-spot.test.cjs 8 (4 fail on old).
  Live after: iPhone 13 RM double tap Snack/Meal -> 1 click, sheet stays, no picker; Chromium -> no focus; SLOW=700 2nd tap passes.
- **Release blocker fixed (P-CLOCK-TEST):** Mon 26 Oct 00:00 = new week; ranking.test.cjs page() (2) and ranking-compare page() (1)
  ran ranking.js on the real clock against fixtures pinned to Fri 23 Oct -> every release blocked. Both pass Date pinned to NOW now.
  Fake-clock sweep (/tmp/shim.js via NODE_OPTIONS, outer clock only): 3 other fails appear at any offset > 1 day (chat day markers,
  Pathfinder bonus, room header): shim artifact (vm contexts keep the real Date), not bugs.
- Seen, left alone: Profile tile -> #lvCard (Misty's level card) under the finger on the profile PAGE (page swap, not an overlay;
  double tap opens her card - harmless); Community bubble -> For You tab; Rename -> Save (saves the same name); For You "New post" ->
  "Upload a video" (now covered if it is a body overlay); voice mic double tap (recDone's 0.8 s minimum already drops it).
- Tests 3575/3575, CI green. Clean streak 0. Not on Emmanuel's iPhone.



## Run 29 — 2026-10-26 01:01 UTC (live start 20261026-012600 -> LIVE 20261026-022513, main 5216a007)
- Area: clock past midnight with Gap open (owed since run 7), after-meal closing card, 20-min soak (seed 291).
- Midnight with Gap open: CLEAN (probe-gap-midnight.cjs): Today->Yesterday flips on repaint, ring keeps counting, end-fast sheet 'since 18:57 yesterday', 0 errors. Leftover (not changed): Gap 'Last meal · 06:57 PM' has no day word after midnight.
- BH-029 FIXED + LIVE: after-meal closing card (achievement 9 s / Done 4.5 s) stayed on top of Gap / For You (z 2147480800) because finish() stops the loop that hid it. paintFinal watcher hides while blocked(), back after. tests/after-meal-final-card.test.cjs (2/2 fail on old). Live before: Chromium Gap + WebKit Gap + Chromium For You covered 5.5 s in; live after: hidden in Chromium Gap + WebKit For You.
- P-CLOCK-TEST again: tests/gap-time-sync.test.cjs 'Fuel's own path' failed 00:00-01:30 local (30 min earlier = yesterday). Fixed; green under 6 TZs.
- Tests 3577/3577 + CI green. Not on Emmanuel's iPhone.
- Next: other transient cards that outlive their loop (z-index near max: ate-this, body-stats, companion, living-home, mirror-move, scan-glass, tutorial*) — do any stay over sheets? Gap 'Last meal' day word (small). Midnight with the after-meal timers running.
- Soak seed 291, full 20 min on live (344 actions, en/de/es): heap 29.8-31.1 MB flat, nodes 2472 flat, 0 errors, 0 stalls. The owed 20-min session is DONE.

## Run 30 — 2026-10-26 02:02 UTC (live start 20261026-022513 -> LIVE 20261026-030809, main cb5dce79)
- P-LOOP-STOPPED-OVERLAY siblings (near-max z-index cards), checked statically: .ate-bar (8 s Undo toast, kept above .fst-rw on purpose), .hq-snack (6 s undo), .hq-pop (3 s XP chip) are short status toasts = by design; .ltr-fab already watches sheets (MutationObserver + blocked check); .cf-ov, .bs-ov, .dr-ov, .mm-ov, scan-glass, living-home .b3-cam.lv-solo are full-screen modals/screens. Nothing to fix. Pattern closed for now.
- BH-030 FIXED + LIVE (quiet): Gap 'Last meal · Pasta · 06:57 PM' had no day word after midnight (end-fast sheet said 'since 18:57 yesterday'). gap-view.js when() = fast-edit at() rule (today time only, yesterday + ago1 'yesterday/gestern/ayer', older + short date). tests/gap-last-meal-day.test.cjs 4 (all fail on old). Local probe-gap-midnight Chromium EN/DE/ES + WebKit iPhone 13 EN; live after WebKit iPhone 13 + Chromium: 00:00:30 '06:57 PM yesterday', 0 errors. probe-gap-midnight now records .gv-last (copied to tools/bughunt).
- Sibling (P-CLOCK-NO-DAY) fixed + LIVE 20261026-031541 (main 5603eba6): Gap bubble VoiceOver label (spirit.js gapAria) said 'at 06:57 PM' after midnight -> gapWhen() via LowiGapView._when. Test in gap-last-meal-day (fails on old). Live after WebKit iPhone 13 + Chromium: '...at 06:57 PM yesterday', 0 errors. toLocaleTimeString sweep: herb-shop-core when() already day-aware (future), community-chat has day markers. Still unswept: hm()-style helpers on stored timestamps (Fuel rows, Sleep, Move).
- Tests 3582/3582, CI green. Clean streak 0. Not on Emmanuel's iPhone.
- Next: midnight with the after-meal timers running; double-tap spots inside existing sheets (in-place swaps, not covered by fresh-scrim); Misty's care card buttons vs her body and Community person card (choosers opening on their opener).

## Run 31 — 2026-10-26 03:01 UTC (live start 20261026-031541, main 5603eba6)
- P-CLOCK-NO-DAY sweep: CLEAN for visible UI (probe-bare-time.cjs, 00:10 Berlin, meal 18:57 yesterday; all Home bubbles, legacy tabs, end-fast sheet). #fsCard lastTxt 'Last meal 18:57' has no day word but #fsCard is display:none in the current app -> left.
- Midnight with after-meal timers running: CLEAN (probe-pmc-midnight.cjs): 23:52 meal, muscle 23:53, walk+stairs 00:03, upright 00:24 each pay once (+3 / +23 with Spike Tamer), ledger days follow the claim time, state survives reload. Card hidden behind #fstRw / #drDay the whole time = by design (blocker).
- BH-031 FIXED (quiet): Day card (daily-ritual busy(), named BUSY list) opened 1.5 s after #fstRw fasting reward ON TOP of it (z 2147483000 > 2147482000), one Escape closed both. Live Chromium 390 probe-dayover.cjs repro. busy() += otherModal(): any visible [aria-modal=true] except #drDay. Local Chromium + WebKit iPhone 13 (de): reward stays on top, Day card ~5 s after reward closes; NOMEAL Day card still opens at 4.5 s. tests/day-card-other-modal.test.cjs 6 (2 fail on old).
- Odd: my new test file vanished from the worktree once mid-run (after a VM exec PONG timeout); recreated. Watch for it.
- LIVE 20261026-041554 (quiet, tests 3588/3588, CI green). Live after: Chromium 390 EN + WebKit iPhone 13 EN: reward stays on top, Day card 5 s after it closes, 0 errors; NOMEAL Day card still opens. Clean streak 0. Not on Emmanuel's iPhone.
- Next: other auto-openers with named busy lists (misty-hub nudge, companion visits, A2HS, What's New) vs #fstRw / level-up; double taps inside open sheets (in-place swaps), Misty's card buttons, Community person card.

## Run 32 — 2026-10-26 04:01 UTC (live start 20261026-041554)
- Auto-openers vs #fstRw: CLEAN statically. #fstRw is aria-modal=true, so home-visit (T.busyBy), tutorial busy(), evolution (EVO_BUSY/aria-modal) and the Day card (BH-031) all wait. Misty nudge is z 6 inside the world (under the reward). hs-giftpop is user-opened.
- probe-under-finger RM=1 (seeds 3201 misty/foryou MOCK, 3202 fuel/scan/home): new spots: mh-rk ranking row -> galaxy person 'Talk to Lina directly'; Home Community cell -> galaxy person; cme 'My day' tile -> Home Fuel cell; Sleep orb -> Sleep cell (bloom closing).
- BH-032 FIXED (quiet): P-TAB-SWITCH-UNDER-FINGER. Tabs are old <section>s that goTab shows again, not new overlays, so fresh-scrim (BH-028) did not cover them. Live Chromium 390 probe-rank-dbl.cjs (MOCK, RM): double tap 'Misty is number 25 worldwide' -> goTab('foryou') shows the galaxy ~200 ms-3 s before showView('rank'); 2nd tap at 250 ms picked 'Talking to Lina', chat box then 'Write to Lina' (next message goes to Lina alone). 2nd tap at 175 ms hit rk-segb. WebKit iPhone 13 same (Marco). Fix: fresh-scrim.js mark(el) (separate 'shown' map, spot rule only, links the last real tap if <600 ms); goTab marks #tab-<t> when the tab changes; community-rooms-ui showView marks #tab-foryou when the view changes. tests/fresh-tab-same-spot.test.cjs 6 (all fail on old). Local Chromium 390: gaps 0/120/250 PASS (2nd tap swallowed). WebKit probe cannot verify: its taps arrive ~1 s apart (serialized), beyond the 400 ms window.
- Tests 3594/3594.
- **LIVE 20261026-051305** (main 1a83455a, quiet, tests 3594/3594, CI green). Live after: Chromium 390 probe-rank-dbl gaps 0/120/250/250 PASS (2nd tap swallowed, chat still 'Write to the galaxy'), 0 errors. WebKit iPhone 13: gap0 PASS; gap200 2nd tap arrived 1.23 s later (serialized taps) and still picked Marco = outside the 400 ms window by design.
- Noted (next): Community shows the galaxy ~0.2-3 s before Ranking when opened from Misty's ranking row (go() retries until cmPaneChat + showView). A slow deliberate tap in that window picks a person. Better: open Community straight into the requested view (set view before goTab / hide galaxy while a view is pending). Also the Home Community cell spot (galaxy person under the finger) is covered by goTab mark; 'My day' -> Home Fuel cell covered too; Sleep orb -> Sleep cell (bloom closing then reopen) UNCHECKED.
- Clean streak 0. Not on Emmanuel's iPhone.
- Next: Community opening straight into Ranking (no galaxy flash); Sleep orb close->reopen double tap; double taps inside open sheets.
- MAYA-HANDOFF run 32 line pushed (main adc94854). Voice note 8ec24d4e42a75ecb5b620631d08153b1.

## Run 33 — 2026-10-26 05:01 UTC (live start 20261026-055906 per probes; main had moved past 051305)
- Box heavily loaded (load 10-14, many tasks): Playwright taps 0.3-2.6 s apart; probes now log in-page click timeStamps (preInit) to know the real gap.
- ranking.js owned by weekly-ranking task (COORD) -> "Community straight into Ranking" left for later.
- probe-orb-under.cjs (WebKit iPhone 13): after a bloom folds, Move 'Steady' orb rests on BUBBLE move, Sleep '6-7 h' on BUBBLE sleep (water orbs are keep). Chromium 390 layout: nothing under.
- BH-033 FIXED (quiet): P-CLOSE-UNDER-FINGER (mirror of BH-026/028). Live WebKit iPhone 13 probe-choice-dbl.cjs: double tap Steady (real gap 347 ms) -> 'close move' then 'OPEN move' 290 ms later, bloom open again with choices armed. Sleep did not reopen (logged sleep -> no bloom).
  Fix: fresh-scrim.js spent(e)/quiet(e): a choice that folds its bloom marks the tap; for SPOT_MS 400 a real tap within SPOT_PX 44 is swallowed by its own timeStamp (guard + home-blooms-v2 onClick checks freshQuiet itself, listener order unknown). Keyboard/script clicks untouched. tests/fresh-choice-same-spot.test.cjs 7 tests, all fail on old.
  Local after (iPhone 13): real gaps 84/135/212 ms -> no reopen; 752 ms deliberate tap reopens Move. Tests 3607/3607.
- **LIVE 20261026-061839** (main 89124531, quiet: version.json loud unchanged, tests 3607/3607, CI green). Live after: WebKit iPhone 13 real gap 177 ms -> no reopen; Chromium 390 268 ms -> no reopen, 1034 ms deliberate tap reopens Move; 0 errors.
- MAYA-HANDOFF run 33 line pushed (main b7daf163, now live as 20261026-062201 with another task's change). Clean streak 0. Not on Emmanuel's iPhone.
- Next: other choosers that close on a choice (sheet option rows, Misty card actions, Community person card) for P-CLOSE-UNDER-FINGER; Community straight into Ranking once weekly-ranking task frees ranking.js; double taps inside open sheets.

## Run 34 (Mon 26 Oct 2026, 06:01-06:35 UTC) - worktree wt-bughunt-202610260603, live 20261026-062950 at start
- Picked Run 33's open item now that the weekly-ranking task is done: Community straight into Ranking.
- Repro LIVE (WebKit iPhone 13, mock cloud, probe-rank-flash.cjs): one tap on Misty's "number N worldwide" row: Community active at ~260 ms showing the galaxy (view '', cgField under the finger) until ~1240 ms (first visit 2.4 s, For You art); a 2nd tap 450 ms later => "Talking to Yuki" (first visit "Talking to Jonas"). Cause: ranking.js open() did goTab then setTimeout(go, 60), run late while Community builds; the first-tab rule set Room meanwhile (setTab(false)) and the warp zoomed into the galaxy. Same timer in community-rooms-ui openOn() (For You).
- **BH-034 fixed + LIVE 20261026-071738 (quiet, loud 20000101-000000):** ranking.js open() calls LowiCommunityTabs.want() then goTab and go() synchronously; openOn() runs t() in the same task; community-tab-order.js wanted() exported and the For You stay rule skips an asked tab (it overrode the now-early Ranking to 'fy' in a first local try); galaxy-zoom firstIsRoom() false while wanted(). tests/community-opens-on-view.test.cjs 8 (7 fail on old). Suite 3643/3643, CI green.
- Live after: probe-rank-flash iPhone 13 (450/250/450/single) and Chromium 390 (450/250/600) PASS: first Community frame is Ranking, 0 errors. probe-open-views: plain Community still warps to Room, openOn('fy') and Ranking land with no warp.
- Not on Emmanuel's iPhone. Next: P-CLOSE-UNDER-FINGER siblings (sheet option rows, Misty card actions, person card in Community); grep other goTab+setTimeout view switches (P-VIEW-AFTER-TAB).

## Run 35 (Mon 26 Oct 2026, 07:01-07:40 UTC)
<!-- run 36 below --> - worktree wt-bughunt-202610260701, live 20261026-071738 at start
- P-VIEW-AFTER-TAB grep: remaining goTab+setTimeout spots are deep links (lis-push, rooms hash), your-details 60 ms, gap-view 60 ms, cme HOME_FIRST 700 ms (goTab mark covers the double tap). Nothing new worth fixing.
- probe-under-finger RM=1 seeds 3501 (misty, iPhone 13 mock), 3502 (foryou+misty, Chromium mock), 3503 (fuel/scan/home). New spot in 3501 AND 3502: "rk-pf Open Amira's profile" -> #whX Close at 150 ms.
- Repro LIVE (probe-pf-dbl.cjs, mock cloud, Misty card -> mh-rk -> row -> compare -> double tap Profile): Chromium 390 normal 200/300 ms and RM 250/350 ms -> 2nd click "#whX Close", profile gone. WebKit iPhone 13 RM: same at a 490 ms real gap. AND taps 0-120 ms apart: 2nd click hits the closing compare card's Profile again -> 2 profile sheets stacked.
- **BH-035 (P-REUSED-OVERLAY, new pattern):** #whX is a body element made once and shown again (hidden toggled) for every sheet, so fresh-scrim (born = new body child) never protected it. Fix: world-home.js syncX marks the X with LowiFreshScrim.mark(x) on the hidden->shown edge only; index.html sheet() marks the reused #sheetwrap on a fresh open. Sibling (P-CLOSING-STILL-LIVE): ranking.js compare click handler returns when el !== cmpEl (card closing for 220 ms).
- Tests tests/reused-x-same-spot.test.cjs (6; 3 fail on old code: syncX cut out of world-home.js and run against the real fresh-scrim.js, compare guard, sheetwrap). game-perf-observer-loops regex kept intact (kept the one-line hidden write). Suite 3649/3649.
- **LIVE 20261026-082829** (main c3fa0f6e, quiet, loud 20000101-000000, CI green, live bytes match). Live after: Chromium 390 gaps 0/120/200/300 PASS (1 profile, stays open, X closes it on a later tap), WebKit iPhone 13 RM PASS (emulator taps were slow: 46/1505/700 ms), 0 errors. Not on Emmanuel's iPhone.
- Leads: closing panels still clickable for 240-260 ms (gift-basket 440, grocery-hunt 435, seller-zone 154, store-picks 721): check whether a row there opens something on the 2nd tap. Other reused overlays shown by class toggling (search: elements created once + classList 'open'/'on' + backdrop click closes). Lesson: never pkill -f with a pattern that is also in the same exec command line (kills the shell).

## Run 36 (Mon 26 Oct 2026, 08:01 UTC) - worktree wt-bughunt-202610260801, live 20261026-082829 at start
- Took Run 35's lead P-CLOSING-STILL-LIVE. probe-stp-dbl.cjs (mock cloud): double tap on Shop's "Scan in the shop" / "Shopping list" (both close Shop, open the target 200 ms later), plus X then a quick tap elsewhere.
- Repro LIVE: Chromium 390: scanshop 2nd click 97 ms later hit the same row in the fading Shop -> shop camera x2 (openScanner closes+restarts); mylist x2 at 47/122 ms; with the panel gone/shrunk the 2nd tap hit Home bubbles (Sleep at 121 ms, Scan at 200 ms). WebKit iPhone 13: all 6 cases opened x2 (real gaps up to 412 ms), RM too.
- Static: gift-basket onClick threw on a tap while fading (`!ov.contains` with ov null); grocery-hunt 'scan' double tap -> camera x2, 'photo' on fading panel -> picker; seller-zone repaint of a closed zone.
- **BH-036 FIXED (P-CLOSING-STILL-LIVE):** store-picks/gift-basket/grocery-hunt/seller-zone onClick returns unless `ov && ov.contains(e.target)`; a real tap that closes (X, backdrop, scanshop, mylist, gh scan) calls LowiFreshScrim.spent(e) (44 px / 400 ms swallow, as BH-033). food-paths regex kept intact (spend on its own line before the scanshop/mylist ifs).
- Tests tests/closing-panel-still-live.test.cjs (8; 7 fail on old code: real fresh-scrim + each panel's onClick cut out of its file). Suite 3657/3657.
- Local after: probe-stp-dbl Chromium 390 0/120/200 PASS, iPhone 13 PASS, iPhone 13 RM PASS (all x1, 0 errors); probe-panels-sanity (Give a hand, Shop finds, Seller Zone open/tap/X/reopen x2) PASS.
- **LIVE 20261026-091603** (main c45fdea3, quiet: loud 20000101-000000, news id unchanged, CI green, live bytes match). Live after: probe-stp-dbl WebKit iPhone 13 0/120/200 PASS, 0 errors. Not on Emmanuel's iPhone.
- Next: other overlays that fade out but stay clickable (grep `classList.add('out')` + setTimeout remove, `.remove('show')` + setTimeout) for the same class; P-REUSED-OVERLAY (elements made once, shown by class toggle); P-CLOSE-UNDER-FINGER sheet option rows / person card.
- Sibling sites (unchecked, P-CLOSING-STILL-LIVE): fast-edit.js 152, lis-push.js 103, xp-tap.js 87, arrival-cards.js 56, install-guide.js 354 (welcomeClose), home-settings-sleep-v2.js 673 hint.

## Run 37 (Mon 26 Oct 2026, 09:02 UTC) - worktree wt-bughunt-202610260904, live 20261026-091603 at start (VM had just rebooted)
- Swept Run 36's P-CLOSING-STILL-LIVE sibling list: fast-edit .fe-ov.out, arrival-cards .out, your-details .yd-out, body-stats .bs-out all have pointer-events:none = fine; ss2-hint and ig-welcome are pointer-events:none / harmless repeat close; xp-tap fan card 2nd tap only re-closes itself = fine. Real ones: gap-view.js (.gv-ov fades 260 ms, no pointer-events:none, onClick unguarded) and lis-push.js (.lisp-card.out no pointer-events:none, handlers unguarded).
- Repro LIVE (probe-gap-dbl.cjs, mock cloud, Chromium 390): Gap 'Log a meal in Fuel' double tap -> LowiSpirit.meal() x2 (in-page gap 767 ms on a slow box); push ask 'Not now' double tap -> lowi.pushAsk no=2 at gaps 0/120/200 (=> askable() false forever instead of once more after 7 days).
- **BH-037 FIXED:** gap-view onClick returns unless el && el.contains(target); close/log/move/backdrop call LowiFreshScrim.spent(e). lis-push ask(): one choice per card (picked flag), choosing tap spent. tests/closing-gap-push-still-live.test.cjs 8 (7 fail on old). Suite 3665/3665.
- Local after: probe-gap-dbl Chromium 390 + WebKit iPhone 13 0/120/200 PASS (meal x1, no=1), 0 errors.
- **LIVE 20261026-101115** (main dd2e8850, quiet: loud 20000101-000000, news id unchanged, CI green, live bytes match). Live after: probe-gap-dbl WebKit iPhone 13 + Chromium 390 0/120/200 PASS (meal x1, no=1), 0 errors. Not on Emmanuel's iPhone.
- P-CLOSING-STILL-LIVE: every `classList.add('out')` + timed remove site now checked (10 sites). Pattern closed unless new panels appear. Unchecked broader form: `.remove('on'|'show')` + setTimeout remove without pointer-events:none (grep found gap-view only among 5 timed-remove sites).
- Next: P-REUSED-OVERLAY (made once, shown by class toggle); P-CLOSE-UNDER-FINGER sheet option rows / Community person card; still open VoiceOver focus loss, level-up/badge saved too early; long-session/offline/language-switch soak on current build.

## Run 38 (Mon 26 Oct 2026, 10:02 UTC) - worktree wt-bughunt-202610261002, live 20261026-101115 at start
- Took Run 37's lead P-REUSED-OVERLAY. Grep: body elements made once + shown by hidden/class toggle + backdrop (`e.target === el`) closes: .rm-menu (community-rooms-ui.js toggleMenu), #appearancePanel (appearance.js; #appearanceBtn is display:none on home/profile/foryou live = unreachable, skipped), #spWorld (spirit.js; full-screen world, no backdrop close; unchecked for same-spot), #sheetwrap and #whX (done BH-035). people-directory, companion .cf-ov, lcOv, rm-ob, fstRw, hofSheet are made fresh each open = born-protected.
- Repro LIVE (probe-menu-dbl.cjs, mock cloud): after one warm-up open/close, double tap .rm-menu-btn: Chromium 390 gaps 0/120/250 and WebKit iPhone 13 (real 17/127/258 ms): clicks "rm-menu-btn" then "BACKDROP", menu shut. First-ever open was fine (born).
- **BH-038 FIXED (P-REUSED-OVERLAY):** toggleMenu: `const was=menu.hidden; menu.hidden=!on; if(on&&was) fresh(menu)` (LowiFreshScrim.mark); menu click: row choice and backdrop close call spend(e) (LowiFreshScrim.spent). tests/community-menu-reused-dbl.test.cjs 4 (3 fail on old: real fresh-scrim + toggleMenu cut out of the file). Suite 3669/3669.
- Local after: probe-menu-dbl Chromium 390, iPhone 13, iPhone 13 RM 0/120/250 PASS (menu stays open, a later backdrop tap closes, People row opens People). Probe note: iPhone 13 viewport is 390x664, tap relative to innerHeight.
- **LIVE 20261026-111102** (main 55c3ccf2, quiet: loud 20000101-000000, news id unchanged, CI green, live bytes match). Live after: probe-menu-dbl Chromium 390 + WebKit iPhone 13 0/120/250 PASS, row PASS, 0 errors. Not on Emmanuel's iPhone.
- P-REUSED-OVERLAY sites: #whX done (BH-035), #sheetwrap done (BH-035), .rm-menu done (BH-038), #appearancePanel unreachable, #spWorld unchecked (no backdrop close; a double tap that opens it could press a world button under the finger).
- Next: #spWorld same-spot check; P-CLOSE-UNDER-FINGER sheet option rows / Community person card; VoiceOver focus loss; level-up/badge saved too early; long-session/offline/language-switch soak on current build.

## Run 39 (Mon 26 Oct 2026, 11:02 UTC) - worktree wt-bughunt-202610261102, live 20261026-111102 at start
- Took Run 38's lead: #spWorld same-spot (last P-REUSED-OVERLAY site). #spWorld is made once, shown again by hidden=false for every camera opened NOT direct: Products empty-state [data-cktoss=scan] (index.html), herb-tamagotchi care vitamin, swaflo scan. (f2 'bc' is dead: LowiF2.start always goes startShared.) Home Scan is direct (body > .b3-cam, born = already guarded).
- Repro LIVE (probe-spworld-dbl.cjs, mock cloud, WebKit iPhone 13, opener under the world at z 1): while the world springs open it sits shrunk over the middle (over Misty's bubble rect), so a 2nd tap 100-300 ms later at x.5 y.42/.47 focused #b3Bc / #b3Nm (keyboard up) and at x.62 y.5 clicked Deep analyze (#b3Deep -> ChatGPT, leaves the app). At rest the camera's fields sit at y 334-530 of 664.
- **BH-039 FIXED:** spirit.js open(): LowiFreshScrim.mark(world) on every show. Sibling found by the probe: the click was swallowed but the FIELD STILL FOCUSED, because focus comes on mousedown before click. fresh-scrim.js guardDown (mousedown capture): trusted, same-spot or quiet tap on input/textarea/select/contenteditable -> preventDefault (no focus); never stops propagation, never touches buttons. Covers every guarded overlay with a field (BH-028/032/033/035/038 sites).
- tests/spworld-reused-dbl.test.cjs 5 (3 fail on old: real fresh-scrim + open() cut out of spirit.js). Suite 3674/3674.
- **LIVE 20261026-122440** (main 014353e1, quiet: loud 20000101-000000, news id unchanged, CI green, live bytes match). Live after: probe 2 gaps x 3 spots PASS (no click, no field focus); the one "FAIL" had a real gap of 568 ms (deliberate tap, outside 400 ms). Later X closes the world. 0 errors. Not on Emmanuel's iPhone.
- P-REUSED-OVERLAY: all known sites done (#whX, #sheetwrap, .rm-menu, #spWorld; #appearancePanel unreachable).
- Next: P-CLOSE-UNDER-FINGER sheet option rows / Community person card; other overlays with fields opened by a tap (now protected from focus, verify one live: chat composer sheet, Log a meal type field); VoiceOver focus loss; level-up/badge saved too early; long-session/offline/language-switch soak.

## Run 40 (Mon 26 Oct 2026, 12:02 UTC) - worktree wt-bughunt-202610261202, live 20261026-122440 at start
- Lead: P-CLOSE-UNDER-FINGER. New seeded double-tap monkey playtest/probe-close-under.cjs (taps controls inside overlays twice, logs which trusted clicks pass the guard and what they hit). VM unstable this run (several reboots, /tmp wiped, load 8-17 from other tasks); Chromium gaps too slow to count, WebKit iPhone 13 valid.
- Repro LIVE (iPhone 13, mock cloud, seed 4002): #whX (bottom X) closed its sheet and the 2nd tap 173 ms later focused Community's #cmInput ("Write to Paul", keyboard); Move bloom .hb2-scrim closed the bloom and the 2nd tap 222 ms later pressed #spBubble. probe-dismiss-dbl.cjs A (recorder at document capture = after fresh-scrim): live 3/3 gaps the 2nd tap pressed spBubble (45-344 ms).
- Root cause: only a few modules called LowiFreshScrim.spent() on their own close (BH-033 blooms choices, BH-036 store panels); every other X / scrim uncovered what was under the finger.
- **BH-040 FIXED (generic):** fresh-scrim.js guard(): a passing real tap on a dismiss control is spent there, once for the whole app. dismissing(t): closest button/[role=button]/a matching data-r2=close, data-act=close-sheet, data-sp=close, data-hb2=close, data-chat=close-thread, #whX, or a class token xbtn / *-x / *-cx / *-close; or a *-scrim element. guardDown already blocks field focus for quiet taps. Trade-off: a fast double tap on X no longer closes two stacked sheets (2nd tap within 400 ms / 44 px swallowed, iOS-like).
- tests/dismiss-tap-spent.test.cjs 5 (4 fail on old). Suite 3688/3688.
- **LIVE 20261026-132627** (main 990b1483, quiet: loud 20000101-000000; news id is kitchen-pantry-20261026-132254 from the kitchen task's release just before, not ours). Live bytes have the fix. Live after: probe A gaps 0/120 swallowed, 445 ms real gap passes (deliberate). Monkey on fixed build seed 4002: 0 CLOSEUNDER. 0 errors. Not on Emmanuel's iPhone.
- Monkey leftovers (TWICE, same control twice in < 250 ms, not yet judged): water bloom keep orbs (double tap = two bottles / two glasses, by keep design?), Community .cg-body "Talk to X directly" double tap (select then deselect?), Meal gap .mc-ph phase (harmless).
- Next: judge .cg-body double tap and water keep-orb double tap; VoiceOver focus loss; level-up/badge saved too early; long-session/offline/language-switch soak.


## Run 41 — 2026-10-26 14:02–14:45 CET — LIVE 20261026-141936 (quiet)
- Judged run-40 leads: water keep-orb double tap = two glasses BY DESIGN (keep orbs stay open for repeated taps, Undo exists). .cg-body double tap = connect() twice, idempotent (no toggle-off) -> harmless.
- BH-041 FIXED (new pattern P-ROW-SHIFT): a row action that removes its own row lets the next row slide under the finger. Live WebKit iPhone 13 build 20261026-135248: double tap 82 ms on Bought (Cook > Kitchen > To buy) bought Apples AND Butter; Chromium x took two off the list. Fix: fresh-scrim `removing()` -> any real tap on [data-spend] is spent (44 px / 400 ms). Marked: kitchen-game got, bdrop, del, bin, hit; bot-recipe-core Add to kitchen + Undo (Undo overlaps right third of Add: probe-crb-undo-spot.cjs).
- BH-041b FIXED (sibling class P-ARM-SKIP): "Tap again to delete" two-step deletes armed+confirmed by one double tap (no time guard): cycle-world cw-del, index cy-del, index r2-del chat delete, spirit todayDel 'sure'. Fix: fresh-scrim armTwice(): tap on button.armed/button.sure on the spot of the previous real tap within ARM_MS 500 is swallowed. Not live-probed (cw-del not rendered for a fresh profile: needs cycle set up) — unit tests only.
- Tests: tests/row-shift-armed-dbl.test.cjs, 4/5 fail on old code; suite 3728/3728; CI green. Live probe after release PASS (one warm-up run lost the first tap at load, rerun clean).
- Next leads: other lists that drop rows without data-spend (index.html shopping list data-sh tick = toggle; store-picks cart − to 0 is owned by Cart/Supermarket tasks — tell them); live-probe cw-del with a seeded cycle; VoiceOver focus loss; level-up/badge save timing.

## Run 42 — 2026-10-26 15:01–15:25 CET — LIVE 20261026-151258 (quiet)
- Lead from run 41 (other lists that drop rows without data-spend) + today's new Supermarket code (Buy again row, 14:47).
- BH-042 FIXED (P-ROW-SHIFT siblings, store-picks.js, Shop > Supermarket > Snacks to buy). Live WebKit iPhone 13 build 20261026-145042, probe-snack-dbl.cjs (mock cloud): double tap "Buy again · recent" (Add N) -> 2nd tap 282-335 ms hit the Undo that replaced Add N (list filled then undone: looks like the row ignores you); double tap Undo -> 2nd tap (15-356 ms) refilled; double tap a snack tick -> next snack ticked too (Apples AND Bananas). 8/9 FAIL.
- Fix: data-spend on [data-stp-snack-refill], [data-stp-snack-undo], .stp-snack-tick, .stp-kit-got (Kitchen cart ✓ Bought), and cart − only when l.q <= 1 (removes row; − above 1 and + stay free for deliberate quick taps). x buttons (.stp-snack-x) were already spent by class (BH-040).
- tests/snack-row-shift-dbl.test.cjs 4 (4/4 fail on old). Suite 3752/3752. CI green (runs/40337659175). Local probe iPhone 13 9/9 PASS; Chromium 390 5/5 PASS + deliberate 650 ms Undo still works. Live bytes have the fix (6 data-spend), loud 20000101-000000, news id unchanged.
- Live after release (iPhone 13): 9/9 PASS, 0 errors (one tick 2nd tap had a real gap of 404 ms = past the 400 ms window, deliberate by rule). Kitchen cart ✓ Bought and cart − at 1: unit tests only.
- Unprotected candidates still to judge (P-ROW-SHIFT/undo-under-finger): herb-quests [data-hq=undo] toast, kitchen-game toast undo, ate-this undo, shop-scan-core undo, owner-admin undo, gift-basket Skip (Skip stays at same spot -> double tap skips two baskets? Undo sits in the middle, not under Skip), week-basket swap/tick rows.
- Clean streak: 0.

## Run 43 — 2026-10-26 16:03–16:45 CET — quiet release (build in the result line below)
- Lead from run 42 (gift-basket Skip double tap). Undo toasts in herb-quests / kitchen-game / ate-this are position:fixed at the bottom (92-100 px above safe area), not where the tapped control was: lower risk, not probed yet.
- BH-043 FIXED (P-ROW-SHIFT / SWAP-UNDER-FINGER, gift-basket.js, Shop > Give a hand deck). Live build 20261026-151258, probe-gb-skip-dbl.cjs (made-up baskets via LowiGiftBasket._api; pay_url host must be allowed, e.g. ko-fi.com, or the deck hides the basket; network blocked): double tap Skip -> 2 baskets skipped at every gap (WebKit iPhone 13 real 31-383 ms, Chromium 390 too); Undo only restores the last -> first basket hidden 24 h. Double tap Pay -> Chromium 2nd tap hit the pay link (.gb-pay) that slides under the finger. Pay link -> "I helped" in place (help() = server + XP, basket gone for everyone): emulation unreliable (popups), unit test only.
- Fix: data-spend on .gb-skip, .gb-yes, both [data-gb-pay] links, .gb-helped. tests/give-hand-double-tap.test.cjs 3 (3/3 fail on old). Suite 3755/3755. Local probe: Chromium 6/6 ok + deliberate 700 ms 2nd Skip still skips; WebKit swallowed at real gaps < 400 ms (one 528 ms real gap skipped = deliberate by rule).
- VM rebooted twice mid-run (Sprites 500); probes re-run. Release waited on a release lock held by another task (nohup).
- User voice note seen in this run's frame: "auto fly ... if they want to manually auto tap let them, but not automatically, it's annoying and the UI breaks" = autopilot starting by itself (misty-flight.js ~477 trip / ~480 ADV / ~524 idle -> padMode auto). The running task "remove companion 'Out exploring' feature" owns that area; not touched here. NEXT RUN: once that lands, verify no autopilot starts without a tap (idle on Home, after a trip, after ADV) and that the UI does not break.
- Next leads: gift-basket "I helped" in a real WebKit popup-free probe (stub anchor click), bottom Undo toasts when the tapped control sits in the bottom 120 px, week-basket swap/tick rows.
- Clean streak: 0.

## Run 44 (Mon 26 Oct 2026, 16:42 CET; live at start 20261026-163708, main 37ba9c60) - worktree wt-bughunt-202610261642, branch bughunt-44
- Started from HANDOFF: verify Emmanuel's "auto fly only when the user taps it" after the manual-explore task landed (20261026-163708: sun trip no longer auto starts / no autopilot from a trip).
- Idle Home 40 s, no tap (probe-journey-auto.cjs, live Chromium 390 + WebKit iPhone 13): CLEAN (pad '', no lw-clean-auto, no adventure).
- Sweep for every path into autopilot: misty-pad userMode (three taps / Enter) = user; adventure.js start/resume = only while the user's adventure is on; misty-flight 483 = ADV() only; **body-trips startNext -> setTimeout(LowiPad.mode('auto'), 480)** = not the user's choice.
- **BH-044 FIXED:** "Start next journey" (Today journey row, body-trips startNext) switched the controller to autopilot 480 ms later -> clean flight view (html.lw-clean-auto) hid every Home control (visible 7 -> 0) for the whole 30 min journey, camera flew off. Repro LIVE 20261026-163708 Chromium 390 + WebKit iPhone 13 (energy stubbed to canTravel in the probe; the journey needs energy). Pattern P-AUTO-SIDE-EFFECT (something other than the controller's own three taps sets pad mode 'auto'); all sites checked, only this one.
  Fix: removed the LowiPad.mode('auto') timer from startNext (journey still starts, sheets close). tests/journey-no-autopilot.test.cjs 3 (2 fail on old: behaviour in a vm sandbox + source guard). oct16-today-functional asserted the old call; now asserts it is gone (reason in commit). Suite 3768 (community-rooms-runtime flaked once under load, passes alone). Local WebKit iPhone 13 + Chromium 390: after the journey pad '', no clean view, 7 controls visible, trips 1, 0 errors.
- Queued (naming rule, P-HARDCODED-NAME): misty-pad.js:278 chip 'Misty is flying home' / 'Misty fliegt nach Hause' / 'Misty vuelve a casa' is not wrapped in nm() (LowiBirthCompanion.withName), so a renamed companion still reads "Misty" on the controller chip when you tap her empty cell. ~49 quoted strings with 'Misty' in JS outside tests: sweep which are user-visible and not passed through withName.
- BH-044 LIVE 20261026-165435 (main 01d4985c); live WebKit iPhone 13 + Chromium 390 probe PASS. Run 44 done.

## Run 45 (Mon 26 Oct 2026, 17:01 CET; live at start 20261026-165435) - worktree wt-bughunt-202610261602, branch bughunt-45
- Started from the queued P-HARDCODED-NAME lead (run 44).
- New probe playtest/probe-name-sweep.cjs: own companion named "Zorbo", walks Home, companion card, controller auto + call home, Today, Move, Shelf, Scan, Profile, Community, Ranking; scans visible text + aria-label/title/placeholder/alt for \bMisty. LIVE 20261026-165435 Chromium 390: FAIL 1 = VoiceOver clean-flight line (#lwCleanSr) "Controls hidden while Misty flies".
- Static sweep (comment-stripped quoted strings with \bMisty\b, BUGHUNT/misty-strings.txt): 13 user-facing sites not passed through withName.
- **BH-045 FIXED** (pattern P-HARDCODED-NAME, every sibling swept): clean-view.js sr line; misty-pad.js:278 call-home chip (nm); atmosphere.js speedNote (W); community-me.js "Misty's daily gift" label (3 sites); food-photo-ai.js "Misty is looking…" (t); herb-quests.js level-25 line (t); install-guide.js w_t title; misty-hunt.js praise (say); spirit.js herbTip; sym-home.js T; move-bubble.js T (steps line); herb-start.js starter whyText (2); herb-shop.js facts line (nmL). Left on purpose: world-home withNm, herb-shop nmL, body-trips wrapped at draw, ranking/companion.js fallbacks with no companion, herb-tamagotchi legacy room (open() hands over to LowiSpirit), tutorial-steps GESTURES dev metadata.
  tests/bh045-own-name-everywhere.test.cjs 3 (1 fails on old: 13 site guards; plus withName behaviour; plus a net: any NEW file with a user-facing "Misty" string fails until wrapped and listed). Suite 3807/3807. Local probe PASS (0 hits), 0 errors.
- Next leads: German possessive in other users' companion names (withName handles s/x/z), pronouns "she/her" for companions the user may see differently (not a bug, note only); bottom Undo toasts; cycle delete in a browser.
- BH-045 LIVE 20261026-172133 (main 279f0a72, CI https://github.com/therealetm/lowispike/actions/runs/40358521713/job/121697368776). Live probe-name-sweep PASS: Chromium 390 en + de, WebKit iPhone 13 en, 0 hits, 0 errors. MAYA-HANDOFF run-45 line pushing in background (release queue busy). Run 45 done. Clean streak: 0.

## Run 46 (Mon 26 Oct 2026, 18:01 CET; live at start 20261026-174856) - worktree wt-bughunt-202610261703, branch bughunt-46
- Playtested today's new features (mic dictation 173248, quick add 174232, Cook tab order 171531). New probes: playtest/probe-mic-sweep.cjs (fake SpeechRecognition; mic placement/cover/overlap sweep + sessions: start, close screen, background, double tap) and playtest/probe-voice-leave.cjs (Chromium fake mic; Community chat voice message in tap mode, leave the chat, push Date.now 125 s).
- Mic placement sweep: no covered/outside/text-under-mic issues on Scan, Supermarket snacks, Kitchen, chat. Store-picks "overlaps spBubble/wh-cell" = home bubbles BEHIND the sheet (no z-order in that check), not a bug.
- **BH-046 FIXED (new pattern P-SESSION-OUTLIVES-SCREEN):** LIVE 174856: one tap on the chat mic (tap mode), then Home or room back -> mic track stayed live with no bar on screen, and at VOICE_MAX the recording was sent (recTick -> recStop(true) -> sendVoice). Sibling: dictation (mic-dictate.js) only stopped on field disconnect, so closing Kitchen (#kgQ) or the chat (#cmInput) kept recognition listening into a hidden field. Scan and Supermarket fields are removed on close, so they were fine.
  Fix: community-chat.js onShow leave -> recStop(false); recTick: recShown('#csRec .cs-rec') false 3 ticks -> recStop(false), and a hidden tick never reaches the cap send. mic-dictate.js: 200 ms watch while a session runs; shownField false twice -> stop('gone') (finals kept, interim dropped); cleared in onend.
  tests/bh046-session-outlives-screen.test.cjs 4 (3 fail on old: real recShown/recTick/onShow and shownField/startNative cut into a vm sandbox). Suite 3848/3848. CI green.
- BH-046 LIVE 20261026-182027 (main 9e628e48, CI https://github.com/therealetm/lowispike/actions/runs/40367894147/job/121730457047). Live: probe-voice-leave home + back PASS (mic track 0 after leaving, no voice upload at the cap; the one POST after the clock push is user_state sync, probe regex tightened); probe-mic-sweep sessions: Kitchen + chat stop listening on close, 0 errors.
- Next leads: other things started for a screen and stopped only on removal (spirit.js photoStream stops on hide/cancelCapture: check swipe-back/goTab paths; tutorial-demo getUserMedia; audio players in chat when leaving); typing while dictating overwrites typed text (onend resets to base.value); bottom Undo toasts; cycle delete in a browser. Not yet on a real iPhone.

## Run 47 (Mon 26 Oct 2026, 19:01 CET, base live 20261026-182027), worktree /home/sprite/wt-bughunt-202610261801, branch bughunt-47
- **BH-047 FIXED (P-SESSION-OUTLIVES-SCREEN, 2nd hit):** the food camera (Snap food, spirit.js photo(), #ssFood, z 2147483002).
  (a) Escape / Safari swipe back did nothing: spirit's keydown returns `if (!opened)` and the herb world is always closed under the camera. back-swipe.js signature unchanged -> back went to step 3 and LEFT THE APP (live, Chromium 390 and WebKit iPhone 13, probe-foodcam.cjs back). Fix: window capture keydown Escape -> cancelCapture() + stopImmediatePropagation.
  (b) visibilitychange hidden -> stopPhoto(), but no restart: the layer kept class live on a dead stream; shutter snapped the frozen frame (videoWidth stays). Fix: stream start moved into startFood(h); hidden sets 'starting' + dataset.resume; visible restarts after 250 ms (like index.html camResume for the barcode camera); shutter needs a live track; play() rejected while hidden -> resume, not 'nocam'.
  Sibling: Community chat voice message PLAYBACK kept playing after leaving the chat (live 20261026-190121, probe-voiceplay-leave.cjs: still playing on tab-home). Fix: voiceStop() in onShow leaving; voiceGone() in voiceSync pauses after 3 timeupdates with no connected+sized bubble (scrolled out of view still counts as present).
  Tests: tests/bh047-food-camera.test.cjs (5, 4 fail on old code); updated bh046 (voiceStop stub), scan-screens (startFood), photo-canvas-memory (live photoStream). Full suite 3853/3853.
- Checked fine: barcode camera (index.html) already has Escape + camResume.
- Next leads: dictation overwriting words typed while it listens (mic-dictate.js); tutorial-demo audio after leaving; other layers that are aria-modal but ignore Escape (back leaves the app) -> a generic probe: open each full-screen layer, history.back(), app must stay.
- LIVE 20261026-191635 (quiet). Live checks: back/Escape Chromium + WebKit iPhone 13, background restart Chromium + WebKit, voice playback leave Chromium: all PASS, no errors.

## Runs 52-54 (Tue 27 Oct 2026, 00:02-02:25 CET; live at start 20261027-004442), worktree /home/sprite/wt-bughunt-202610270002, branch bughunt-53
- Run 52: probe-corrupt.cjs (every key the app writes overwritten with broken JSON / number / text / list / null / {} / quota, reload, every opener): broken JSON, lists, null, {} and quota boot fine; whole key = number or text throws in many modules (cr52-live-c.txt). Run 52 and 53 stopped without a ledger entry (lock left); run 54 finished 53's fix.
- **BH-053 FIXED (new pattern P-SAVE-SHAPE: a loader fills only MISSING fields, so a field saved as null or the wrong kind survives and crashes later):** live 20261027-004442, probe-shape.cjs: main save lowispike.v2 with health or streak = null -> load() threw (no tab shown); user / logs / quests / glow = null -> Home threw while drawing; whole save 42 or "hello" -> boot broke (21 errors). Fix index.html load(): a non-object save loads fresh(); a field whose fresh default is a list/object but is saved as another kind gets the default; good values and extra fields kept. Same in r5load() (lowispike.r5.v1).
  Tests tests/bh053-old-save-shape.test.cjs (5, 4 fail on old code: real fresh()/load()/r5fresh()/r5load() cut into a vm sandbox). Suite 3925/3925.
  Local: probe-shape null/whole Chromium 390 24/24 + WebKit iPhone 13 21/21, num Chromium 22/22. **LIVE 20261027-020733** (main 8c8c3a73, quiet, CI https://github.com/therealetm/lowispike/actions/runs/40430753899/job/121947534563). Live after: Chromium 390 24/24 PASS; WebKit iPhone 13 21/21 Home OK (2 flags were only WebKit "Fetch API cannot load supabase ... access control" from the probe's route block, not app errors). Not on Emmanuel's iPhone.
- P-SAVE-SHAPE siblings (unchecked, from cr52 with a whole key = number/text): micro-book.js obj()/adv (374 errors), body-trips.js (221), spirit.js paint, misty-hunt.js, lis-push.js:88 (last on a number), herb-identity.js syncType, index.html st() r3a (~13227) and ~11349. Fix rule: a loader checks the parsed value is a plain object (and list fields are lists) before use, else fresh. Low real-world odds (needs a hand-edited or half-written key), so queued, not urgent.
- Clean streak: 0.
