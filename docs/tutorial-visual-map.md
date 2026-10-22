# Tutorial visual map (item 42)

Emmanuel, 22 Oct 2026: "Show everything visually. So ppl don't just read boringly. If you can't take them to the page."

Every card of the tour (71 with the claim card) and how it shows what it talks about. Mechanism: `tutorial-show.js` + `tutorial-show.css`
(SHOW map keyed by step id). On the page: tutorial.js already spotlights the real control; tutorial-show adds an animated finger
doing the gesture and lit spots for several controls. On the card: a small brand-style look-alike of what opens (`vis`), for things the
tour can't open (camera, mic, sheets, data the user doesn't have yet, Plus, chat rooms). Never opens anything, never asks for a
permission, takes no touch, so hands-free auto-advance is unchanged. Cards with item 38's practice pad / after-the-tour hand or a Scan
peek get no second picture.

Batches: 1 = companion + bubbles (done, 19 cards); 2 = food / scan; 3 = play / worlds; 4 = companion forms; 5 = Community; 6 = settings + extras + end.

| # | Card | Area | Screen | Reachable | Visual | Batch |
|---|---|---|---|---|---|---|
| 1 | claim | you | home | no | card picture: the companion picker (built by the own-companion task) | later |
| 2 | hello | you | home | yes, on Home: [data-home-misty] | spotlight on Misty (already) | 1 (done) |
| 3 | touch | you | home | yes, on Home: [data-home-misty] | finger tap on the real control | 1 (done) |
| 4 | misty-hold | you | home | yes, on Home: [data-home-misty] | finger hold on the real control | 1 (done) |
| 5 | misty-turn | you | home | yes, on Home: [data-home-misty] | finger drag on the real control | 1 (done) |
| 6 | energy | you | home | yes, on Home: [data-home-misty] | card picture: energy | 1 (done) |
| 7 | mood | you | home | yes, on Home: [data-home-misty] | card picture: mood | 1 (done) |
| 8 | energy-peak | you | home | yes, on Home: [data-home-misty] | card picture: peak | 1 (done) |
| 9 | bubbles | home | home | yes, on Home: the bubbles | finger tap on the real control + lit bubbles one by one (8) + card picture: ring | 1 (done) |
| 10 | gap | home | home | yes, on Home: #spFast | card picture: gap | 1 (done) |
| 11 | ring-still | home | home | yes, on Home: #whHud .wh-water | finger hold on the real control + card picture: still | 1 (done) |
| 12 | gap-tap | home | home | yes, on Home: #spFast | finger tap on the real control + card picture: planets | 1 (done) |
| 13 | fuel | home | home | yes, on Home: #whHud .wh-meals | finger tap on the real control + card picture: fuel | 1 (done) |
| 14 | fuel-hold | home | home | yes, on Home: #whHud .wh-meals | finger hold on the real control + card picture: logmeal | 1 (done) |
| 15 | log-meal | home | home | yes, on Home: #whHud .wh-meals | card picture: logmeal | 1 (done) |
| 16 | water | home | home | yes, on Home: #whHud .wh-water | finger tap on the real control + card picture: water | 1 (done) |
| 17 | water-hold | home | home | yes, on Home: #whHud .wh-water | finger hold on the real control + card picture: water0 | 1 (done) |
| 18 | move | home | home | yes, on Home: #whHud .wh-move | finger tap on the real control + card picture: move | 1 (done) |
| 19 | move-hold | home | home | yes, on Home: #whHud .wh-move | finger hold on the real control + card picture: movepage | 1 (done) |
| 20 | sleep | home | home | yes, on Home: #whHud .o8-sleep | finger tap on the real control + card picture: sleep | 1 (done) |
| 21 | scan | food | home | yes (Home bubble only; never open Scan) | finger tap on the Scan bubble (spotlight only) | 2 |
| 22 | scan-in | food | home | no: camera | has the Scan peek already; add the moving laser + barcode pill press | 2 |
| 23 | deep | food | home | no: camera | has the Scan peek already | 2 |
| 24 | fix-food | food | home | no: needs a scanned product | card picture: product card with a field being corrected | 2 |
| 25 | snap | food | home | no: camera | card picture: plate photo, then the spike rating appears | 2 |
| 26 | photo-checks | food | home | no: needs a photo | card picture: photo with the check marks lighting up | 2 |
| 27 | look | play | home | yes (world view) | finger drag across the world (on the page, anywhere) | 3 |
| 28 | joystick | play | home | yes #whPad | finger drag on the pad | 3 |
| 29 | joystick-hold | play | home | yes #whPad | finger hold on the pad | 3 |
| 30 | energy-shot | play | home | yes #whPad | finger flick + small energy burst picture | 3 |
| 31 | autopilot | play | home | yes #whPad | finger triple tap on the pad | 3 |
| 32 | clean-view | play | home | partly | card picture: Home with and without the bubbles | 3 |
| 33 | zoom | play | home | yes | two-finger pinch animation on the page | 3 |
| 34 | fly-out | play | home | yes Misty | card picture: Misty flying out of the ring | 3 |
| 35 | worlds | play | home | yes zoom button | finger tap + card picture of the galaxy bubbles | 3 |
| 36 | in-world | play | home | no: needs a world opened | card picture: a place being tapped inside a world | 3 |
| 37 | world-extras | play | home | no | card picture: region pal, X, tilt phone | 3 |
| 38 | world-energy | play | home | yes Misty | card picture: energy halving on travel | 3 |
| 39 | spirit | play | home | no | card picture: spirit world look-alike | 3 |
| 40 | world-sound | play | home | yes Settings bubble | card picture: sound strings toggle | 3 |
| 41 | secret | play | home | no | card picture: pushing against the edge | 3 |
| 42 | forms | companion | home | yes Misty | card picture: the forms ladder (Plus forms marked) | 4 |
| 43 | care-room | companion | home | no: opens a room | card picture: the care room look-alike | 4 |
| 44 | rename | companion | home | no: opens a sheet | card picture: name field + aura colours | 4 |
| 45 | community | together | home | yes Settings bubble | finger tap | 5 |
| 46 | cm-tabs | together | community / room | yes Community | lit spots on each top tab in turn | 5 |
| 47 | cm-name | together | community / room | yes Community | finger tap on the name / menu | 5 |
| 48 | cm-galaxy | together | community / room | yes Community | finger drag + pinch on the galaxy | 5 |
| 49 | cm-people | together | community / room | needs other people on screen | card picture: person card from a long-press | 5 |
| 50 | post | together | community / chat | no: chat room (crash area) | card picture: chat composer with a message being sent | 5 |
| 51 | chat | together | community / chat | partly | card picture: the galaxy chat (item 36: opens directly) | 5 |
| 52 | voice | together | community / chat | no: mic | card picture: hold-to-record mic + photo button (never ask for the mic) | 5 |
| 53 | community-order | together | community / room | yes tabs | finger hold, then drag a tab | 5 |
| 54 | send-energy | together | community / room | yes .ce-joy | finger flick on the energy joystick | 5 |
| 55 | creation | together | community / create | yes tab | spotlight tab + card picture of a creation | 5 |
| 56 | affiliates | together | community / aff | yes tab | spotlight tab + card picture of the script card with Listen | 5 |
| 57 | swipe-pages | together | community | yes Community | finger swipe left/right (anywhere) | 5 |
| 58 | pinch-galaxy | together | home | yes Home | two-finger pinch animation | 5 |
| 59 | settings | settings | home | yes Settings bubble | finger hold | 6 |
| 60 | theme | settings | home | yes #tbTheme | finger tap, then triple tap | 6 |
| 61 | settings-me | settings | home | no: opens Settings | card picture: Me page look-alike | 6 |
| 62 | body | settings | home | no: needs weight data | card picture: weight / BMI look-alike with sample numbers | 6 |
| 63 | settings-more | settings | home | no: opens Settings | card picture: Care / Workouts / For you / Hunt rows | 6 |
| 64 | tutorial | settings | home | no: opens Settings | card picture: the Tutorial row | 6 |
| 65 | sheets | extras | home | no: needs a sheet open | card picture: a sheet dragged down + back swipe from the edge | 6 |
| 66 | back-x | extras | home | no | card picture: the X in the corner being tapped | 6 |
| 67 | cook-swipe | extras | home | no: opens Cook | card picture: recipe cards swiped sideways (Plus recipes marked) | 6 |
| 68 | visits | extras | home | no: needs a visitor | card picture: a visit bubble with a reply | 6 |
| 69 | day-card | extras | home | no: shows once a day | card picture: the Day card look-alike | 6 |
| 70 | whats-new | extras | home | no | card picture: the What's New sheet | 6 |
| 71 | done | end | home | n/a | companion waving / confetti picture | 6 |

Left after batch 1: 52 cards (including the claim card, which the own-companion task owns).

