# Galaxy, flight and companion audit (20 Oct 2026)

A bounded first pass over LOWiSPIKE's play side: Misty on Home, her card (Forms, Food journal, Glow, Rename), the joystick (drag, hold, back, autopilot), flying out into the galaxy, zooming Home to the World map to the Community galaxy and back, and energy shots in the Community galaxy. It looks for crashes first and then for things that are inconvenient, illogical or wrong. Part of Emmanuel's full-app audit request ("every flying misty to the end of galaxy, every gesture").

Branch `galaxy-audit-20261020`, task 5f516d11. This branch does not release. Central task f26091fa integrates and releases.

## How it was tested

- Local copy of `main` served for the Pages URL in headless Chromium (390 x 844, touch, device scale 3) through `tools/galaxy-audit/lib.cjs` (copied from `agent-harness:probes/BUGHUNT/playtest/lib.cjs`). Supabase and every non-GitHub host blocked. Local fixture account only (onboarded, Level 4, energy 15 %). Nothing real was read, written or sent.
- Touch is real Chromium touch through the DevTools protocol (touch and pointer events with pointerType `touch`, two fingers for pinches). WebKit runs are noted per item; Playwright WebKit has no multi-touch.
- The VM was shared with several other tasks' browsers and a video render. It ran at load 15 to 64 and rebooted out of memory twice (about 09:24 and 09:33). Frame rates and gesture timings measured here are therefore not phone numbers.
- None of this is a physical iPhone. Nothing below proves or disproves the Community/chat crash on Emmanuel's phone.

## Findings

No JavaScript error, unhandled rejection or page crash happened in any run below. The findings are behaviour and UX problems.

### G-1 Holding Misty opens her card, and lifting the finger closes it again (Medium, fixed on this branch)

- Steps: Home, hold Misty for 0.7 s (any hold that opens the card), lift the finger.
- Expected: her card slides up and stays.
- Actual (Chromium, real touch, probe p8): the card opens while the finger is down. The click that follows the lift is hit-tested on whatever is under the finger by then. With the sheet still low, that is the dimmed backdrop (`div.r2-scrim`), whose click closes the sheet 30 ms after the lift: `R2.close` from the scrim's click handler. The card slid in and straight out again; the sheet ended at 873 px top on an 844 px screen. With longer holds the click landed on a `span` inside the card instead.
- Why it is likely on a phone too: the code already swallowed this same click when it landed on Misty (`st.lpOpened`, so a hold does not also pet her), but only there and only for 900 ms after the card opened. It is not checked on a physical iPhone.
- Fix (`world-home.js` `wireMistyHold`): after a hold that opened the card, the one click of that lift is swallowed wherever it lands, for up to 1 s after the lift; a pointer cancel or a lift with no click disarms it. Test `tests/galaxy-audit-hold-click.test.cjs` (fails 2 of 3 on the old code). Re-run of p8 after the fix: the backdrop click arrives and nothing closes; the card settles at 22 to 84 px top for holds of 0.7, 1.2 and 2 s.

### G-2 The tutorial says Misty is "too tired to get into worlds" below half energy; she isn't (Low, copy, not fixed: tutorial is owned by the interface audit)

- `tutorial-steps.js` step `ws-bubbles`: "Below half energy I'm too tired to get into worlds."
- Actual rule (`misty-hunt.js` `tries`): 50 % or more she gets in on the first try; 30 to 50 % she bounces off once; under 30 % twice; then she gets in.
- Proposed wording: "When I'm low on energy I bounce off a bubble once or twice before I get in." (DE/ES to match.)

### G-3 Energy joystick stays lit after a shot or a cancel (Low, not fixed: `community-energy.js` is owned by the chat crash task)

- Steps: Community galaxy, drag the energy joystick far enough that it glows (class `armed`), then release or have the touch cancelled.
- Actual (probe p6): `on` is removed but `armed` stays (`ce-joy armed` after cancel), so the blue "ready" glow (`.ce-joy.armed` box-shadow) stays on the idle joystick until the next drag.
- Proposed patch, `community-energy.js` line 181, inside `end`: after `joy.classList.remove('on');` add `joy.classList.remove('armed');`.

### G-4 Two of three companions start off screen in the Community galaxy (Observation, fixture data)

- With the fixture's three test companions, on arrival they sat at y -185, y -87 and x 687 on a 390 x 844 screen; only Misty was visible. Shots still reached them. Whether real galaxies place people off screen needs real data; noted for the chat crash task, which owns `community-galaxy.js`.

### G-5 In the Community galaxy the first spread does not take you Home; the second does (Observation)

- 3 of 3 cycles in p3: spread once, still in the galaxy; spread again, Home. Probably the first spread is used by the galaxy map's own zoom. A user who spreads once and sees nothing happen may think it does not work. Owned by `galaxy-zoom.js` and `community-galaxy.js`; not changed.

### G-6 Misty's VoiceOver name still says "Your herb's world" (Low, accessibility copy)

- `#spBubble` `aria-label` is "Your herb's world · Calm flow" (`spirit.js` `copy.world`). The companion is no longer a herb, and the bubble is Misty herself (tap pets, hold opens her card). Other user-facing "herb" lines: `daily-ritual.js` ("Your herb noticed", "Your herb can now remind you"). Proposed: "Your companion" / "Dein Begleiter" / existing ES. Not changed here.

### G-7 Joystick taps are timed when the handler runs, not when the finger touched (Low, seen only under heavy load)

- `misty-pad.js` counts double and triple taps with `performance.now()` inside the handlers. On the overloaded test machine, three taps sent 60 ms apart reached the handlers 380 ms (down to up) and 600 ms (tap to tap) apart, so the triple tap never started autopilot in three attempts; Enter on the focused joystick did. A phone would only see this during very long frames. `event.timeStamp` would measure the finger, not the handler. Not changed: not reproduced as a phone problem.

### Checked and fine

- Pinch out on the world: 3 pinches from Home to the World map to the Community galaxy, 3 of 3 cycles; zoom button out and in 3 times; canvases 2 to 4 and stable, heap 26 MB, DOM 3,675 nodes, no growth across cycles.
- About 74 % of the Home screen is world (a pinch there works); Misty 8 %, the bubbles 14 %, the joystick and fast button 2 % each.
- Energy shots: aiming toward a companion and pulling back both fire (the ball goes where you point), Enter fires at the nearest, a cancelled aim fires nothing, 8 rapid drags give one ball at a time, knocked companions stay where they stopped after a reload.
- Misty's card via its own call settles fully on screen (17 px top after 5 s on the loaded machine); doors Forms, Food journal, Glow at 221 px.
- Joystick drags in 8 directions, drag to the far corner, touch cancel mid-drag: no errors, knob returns, no stuck thrust.

## Ledger

| When | Scenario | Engine | Result |
|---|---|---|---|
| 09:40 | p1: tap Misty x1 and x12, hold for her card, each door (Forms, Food journal, Glow, a mood), card open/close x8, joystick: one tap, 8-direction drags, drag to the corner, hold forward, tap+hold back, double tap, triple tap, touch cancel mid-drag and mid-hold, 25 s idle | Chromium touch, load ~60 | No errors. Card closing after a hold found here (G-1). Triple tap did not start autopilot (G-7, harness timing). Misty stayed inside her bubble ('exit' state = inside her cell, normal) |
| 09:47 | p2: joystick event timing; triple tap with 60, 30, 0 ms gaps; Enter; 40 s of flight samples | Chromium touch | Taps reached the page 380 ms / 600 ms apart: no triple tap. Enter started autopilot; she flew out after ~8 s ('exit' to 'free') |
| 09:52 | p3: pinch out Home to Community x3, spread back x3, zoom button x3, energy drag, tiny drag, drag+cancel, 8 rapid, 15 s settle | Chromium touch | No errors, no growth. First run pinched over the bubble ring and did not zoom; on the world 3 pinches each time. First spread in the galaxy does nothing (G-5) |
| 09:55 | p4: hit-test grid of Home; card geometry over time | Chromium | 74 % of the screen is world. Card (opened by hold) slid off screen: lead to G-1 |
| 09:56 | p7: card blocks top to bottom, hold vs. its own call | Chromium | By call: sheet settles at 17 px. By hold: sheet ends at 873 px on an 844 px screen |
| 09:57 | p8: who closes the card after a hold (event log, stack) | Chromium touch | `R2.close` from the `r2-scrim` click 30 ms after the lift. After the fix: click arrives, nothing closes, sheet 22 to 84 px |
| 10:00 | p6: energy shots toward/pull-back, Enter, cancel, 8 rapid, reload persistence | Chromium touch | Shots fire both ways, cancel fires nothing, positions persist. Joystick keeps `armed` glow (G-3). Companions start off screen (G-4) |
