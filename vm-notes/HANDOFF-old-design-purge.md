# HANDOFF: old-design purge (Oct 19)
Round 1 LIVE in build 20261019-134704 (1,525/1,525 tests, verify-live OK): Misty app icons + inline favicon/apple icon (tools/brand/make-icons.cjs), blue glass launch cell (no gold), old #onboard photo sign-up screen deleted (openOnboarding/setupprofile -> Profile), Community own orb + own chat avatar = real Misty, companion-forms entry = real Misty, daily ritual never falls back to the potted herb, body-companion.js/.css deleted. DECISIONS entry added.
Round 2 LIVE in build 20261019-135912 (1,529/1,529, verify-live OK, main d43d2f4): friends tree "me" spot = real Misty (cell-room.js mineSVG, companion.js no mini swap), herb room/dock use curArt. Tests tests/oct19-old-design-purge-2.test.cjs (3 of 4 fail on old code). DECISIONS entry added. (News slug must match [a-z-]+ : no digits.)
Open: first-run mystery bubble seedling (walkthrough task), small-screen ring-off Home fallback, friends' mini forms. Census probe: playtest/probe-old-design.cjs.


## Round 3 LIVE 20261019-141244 (1,539/1,539, main 7a79b20)
Friends (tree spot, picked card, More friends, invite card, Community chat) = current cell-world cell via companion.js friendSVG(g|null,id) + cell-room.js friendCell (hue-tinted); room shows mineSVG. Probe: playtest/probe-friend-forms.cjs (--url, --view). Tests: tests/oct19-old-design-purge-3.test.cjs.
Census on live 20261019-135912 (chromium390): Home clean; only old-design leftovers seen were friends (now fixed). Note: probe 'main' fixture throws renderProfile ".map of undefined" (S.user.tags missing in fixture; real users get tags from fresh()), logged for bug hunt.
Next: small-screen ring-off Home fallback (round 4). Seedling: claimed by the running new-user walkthrough task, leave it.
Flaky under machine load: whole-file failures in herb-tamagotchi / ui-joystick-fade / ui-settings-panel tests; they pass alone and on retry.

## Round 4 LIVE 20261019-142359 (1,550/1,550, main 55615f5)
Short landscape (568x320, 480x320) no longer drops to the old Home: home-orbit-v2.css shrinks Misty (--wh-bs clamp(116px,42vh,190px), --wh-cy 50%) under max-height 420 landscape; fit() retries tight (gap 6, d>=44) before ok:false. Probe playtest/probe-ring-short.cjs passes on live (Chromium 568x320/480x320/640x360/390x844, WebKit 568x320).
Census rerun on live 20261019-142359 (chromium390): every companion drawing is the current cell (tmg-plant cf-form); only first-run mystery seedling remains (walkthrough task). Possible leftovers to judge: Move screen 'card goldline' style; sub-screens (Community/Cook/Move) still show #tabbar in the census fixture.
Still open: delete the ring-off old Home code itself (world-home.* owned by others today); it is now only reachable on impossible sizes.
All purge files released.
