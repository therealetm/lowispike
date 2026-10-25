# COORD: Symmetrical eight-control Home (shell + integration)

Owner: task 4303dee5-5e76-41cd-8092-42c1606edab5 'LOWiSPIKE: ship symmetrical eight-bubble Home' (started 18 Oct 2026 16:23 CEST)
Worktree: /home/sprite/wt-eighthome, branch `eight-home` from origin/main 340455d
Status: RELEASE 1 LIVE 20261018-165646 (shell + fallbacks); integrating siblings next

## Owned (only this task edits these)
- index.html: script/link tags that load the eight-home modules (and the release bump lines touched by scripts/release.sh)
- new home-orbit-v2.js, home-orbit-v2.css (responsive ring shell: positions Misty, six habit bubbles, Scan, joystick)
- new tests/home-orbit-v2.test.cjs, tests/home-orbit-v2-live.cjs
- What's New via scripts/release.sh only

## Sibling tasks
- 6392aee0-1e75-4f80-87aa-bd1b7456ecec: ONLY new home-blooms-v2.js/.css + its tests. Push branch + HANDOFF, reply below.
- 1ed9e29d-03dc-4bc7-9178-86d47313d82f: ONLY new home-settings-sleep-v2.js/.css + its tests. Push branch + HANDOFF, reply below.
- This task (4303dee5) alone owns index.html loading, the shell and every release (one at a time, sequential).

## Sibling modules (API contract)
- home-blooms-v2.js/.css (Fuel/Water/Move/Gap plain-language actions) must expose `window.LowiHomeBloomsV2 = { mount(root) }`.
- home-settings-sleep-v2.js/.css (Sleep + Settings) must expose `window.LowiHomeSettingsSleepV2 = { mount(root) }`.
- `root` is the `#spHome` element. The shell calls mount(root) once after it has laid out the ring and fires
  `document.dispatchEvent(new CustomEvent('lowi:home-orbit', {detail:{layout:'phone'|'wide'}}))` after each relayout.
- Each habit bubble the shell places carries `data-orbit="fuel|water|move|gap|sleep|settings"`; siblings attach to those, never reposition them.
- Siblings: do NOT edit index.html, world-home.*, living-bubbles.*, misty-flight.*, home-orbit-v2.*. Commit your files on your own branch and say the branch name under Replies; this task wires the tags in.

## Not touching
- move-bubble.js, misty-bloom.js, misty-panels.css (mb-dock), tests/bloom-anchor* (task 5ad305f8 iPad bloom anchor, IN PROGRESS)
- /home/sprite/lowispike-feature-audit.md (task e2e4083a, read only as guardrail)
- store-picks*, owner-admin*, scan-engine files, community/care board code

## Safety
Browser tests run on a local static copy, every *.supabase.co request and every non-GET aborted. No backend writes.

## Replies
- 17:40 CEST task 1ed9e29d (Sleep+Settings): DONE on branch `home-settings-sleep-v2` (rebased on 20261018-165646). Handoff /home/sprite/HANDOFF-home-settings-sleep-v2.md, contract in COORD-eight-settings-sleep.md. Uses your setMenuBar()/menuBar(), data-o8-adapter, lowi:home-orbit. Please point sleepToday() at LowiHomeSettingsSleepV2.sleep.today() when loaded.
- 16:30 CEST task 1ed9e29d (Sleep+Settings): ack contract. Branch `home-settings-sleep-v2`, worktree /home/sprite/wt-settingssleep. Will expose window.LowiHomeSettingsSleepV2.mount(root), attach to [data-orbit=sleep|settings], listen to lowi:home-orbit. Menu-bar toggle contract and storage keys will be in COORD-eight-settings-sleep.md.
- 16:45 CEST parent 4303dee5 -> both siblings: GEOMETRY CHANGE from the user: ONE true circle centred on Misty, all eight
  controls the SAME diameter, 45 deg steps (x=cx+R cos t, y=cy+R sin t). Order clockwise from top (superseded 18 Oct 18:20, see COORD-scan-settings-swap.md: settings(-90) ... scan(45)): scan(-90), water(-45),
  move(0), settings(45), joy(90), sleep(135), gap(180), fuel(-135). Shell sets width/height of every ring control to one --o8-d.
  Do not set width/height/left/top on ring controls; style only inside them.
- Shell attributes: every ring control carries data-orbit=<key> AND (for blooms 6392aee0) data-home-bubble=fuel|water|move|gap;
  #spBubble gets data-home-misty. Sleep/Settings/Scan buttons are created by the shell inside #whHud as
  button.wh-cell.o8-sleep[data-orbit=sleep][data-hb=sleep] etc.; the existing Meals/Water/Move/#spFast/#whPad nodes are reused.
- Shell writes on #whHud: --o8-cx, --o8-cy, --o8-r, --o8-d (px, viewport coords) and html.o8 / html.o8-wide. window.LowiHomeOrbitV2
  = { layout() -> {cx,cy,R,d,spots:{key:{x,y,angle}}}, core }. Event lowi:home-orbit fires after each relayout.
- Tap ownership: when a sibling mounts, set el.dataset.o8Adapter='blooms'|'settings-sleep' on each control it owns; the shell's
  fallback tap handler steps aside for those. Without the sibling: Fuel/Water/Move/Gap keep their existing taps, Settings opens a
  shell fallback list of the hidden Home entry points, Sleep opens a minimal fallback.
- Menu bar toggle (1ed9e29d): please store localStorage 'lowi.home.menubar' = '1'|'0' and dispatch window event 'lowi:home-menubar'.
  The shell shows the bottom tab bar on Home when it is '1'. Please tell me your sleep storage key; my fallback uses 'lowi.sleep.v1'
  {YYYY-MM-DD: 'good'|'ok'|'short'} and I will switch to yours.
- 16:45 CEST task 6392aee0 (Fuel/Water/Move/Gap blooms): ack contract. Branch `home-blooms-v2`, worktree /home/sprite/wt-blooms-v2.
  `window.LowiHomeBloomsV2.mount(root)` (root = #spHome or document; idempotent). Binds taps on `[data-orbit="fuel|water|move|gap"]`
  inside root with ONE window-level capture click listener (preventDefault + stopImmediatePropagation only for those four, so old
  world-home/living-bubbles handlers on the same node never double-fire). Misty centre for the outward direction: `[data-orbit="misty"]`
  if you tag it, else `#spBubble`, else viewport centre. Hold ~0.55 s: Fuel = meal log sheet (photo/scan/recent), Move = today's moves editor.
  While a bloom is open: `html.hb2-open` + `#hb2Bloom` (fixed overlay). If your ring animates, pause it on `html.hb2-open`.
  Also `LowiHomeBloomsV2.open(kind)/close()/isOpen()/unmount()`, `mount(root,{bindTaps:false})` if you prefer to route taps yourself.
  Event `lowi:bloom-v2` {kind, open} on document. Re-measures on `lowi:home-orbit`. Details: COORD-eight-blooms.md.
- 17:05 CEST parent 4303dee5 CORRECTIONS (as shipped in the shell): (1) mount(root) is called with root = document (the Water/Meals/Move
  nodes live in #whHud, outside #spHome), so query from root, never assume #spHome. (2) --o8-cx/--o8-cy/--o8-r/--o8-d/--o8-joy-y are on
  <html> (documentElement), per-control --o8-x/--o8-y on each control. (3) The ring holds the controls still (translate:none !important)
  so the circle stays exact; do not add transforms/translate/scale animations to the control box itself, animate inner content only.
  (4) Shell is verified in Chromium 390x844, WebKit iPhone 13 and WebKit iPad 1180x820 with exact geometry; first release coming now.

## Completion update 17:15 CEST (task 4303dee5)
- RELEASE 1 LIVE: build 20261018-165646 (main f01f684), CI 'Release check and tests' + Pages deploy green, live version.json matches.
- Shipped: home-orbit-v2.js/.css shell, index.html tags (before gnCss), sw.js STATIC, one-line yield in sym-home.js orbFrame, DECISIONS entry,
  tests/home-orbit-v2.test.cjs (numeric geometry, 5 sizes) and tests/home-orbit-v2-live.cjs (browser; backend blocked).
- Live proof (tests/home-orbit-v2-live.cjs --url live): Chromium 390x844 d=88 R=135.6; WebKit iPhone 13 d=89 R=143.6; WebKit iPad 1180x820
  d=124 R=217.4. All eight radii equal within 0.1 px, steps 45.0 deg, one diameter, no overlap/clip, all eight on top by hit test. Scan opened
  the real camera scanner (#b3Cam, rw-scanworld), joystick drag sent steering to LowiWorldHome.pad, Water +1 cup, Move bloom opened,
  Settings listed 13 entries incl. menu bar switch (on/off verified), Sleep fallback logged locally. No backend writes (non-GETs aborted).
- Fallbacks live until siblings land: Settings = shell list (LowiHomeOrbitV2.entries()), Sleep = shell 3-choice log in lowi.sleep.v1.

## HANDOFF: integrating the siblings (next small releases, one at a time)
1. Fresh worktree from origin/main. Fetch the sibling branch named in its COORD reply; take ONLY its home-blooms-v2.* or
   home-settings-sleep-v2.* files + its tests (git checkout <branch> -- <files>).
2. index.html: add its <link>/<script> next to the o8Css tags (after home-orbit-v2.js is fine; the shell mounts any adapter it finds on its
   1.5 s check, with root = document). Add both files to sw.js STATIC next to home-orbit-v2.*.
3. The adapter must set data-o8-adapter on controls it takes over; the shell's fallback tap then steps aside. If Sleep uses another storage
   key than lowi.sleep.v1, migrate today's value in the adapter.
4. node --test tests/*.test.cjs, then node tests/home-orbit-v2-live.cjs (local), then scripts/release.sh "<note>" --news <json>, then rerun the
   live check with --url https://therealetm.github.io/lowispike/. Geometry assertions must stay green (adapters style inside controls only).
- 17:20 CEST task 6392aee0 DONE: branch `home-blooms-v2` @ 4033a98 pushed (4 new files, nothing loaded/released). Integration steps,
  API and test results in /home/sprite/HANDOFF-home-blooms-v2.md. Note: the bloom is a fixed overlay (#hb2Bloom) on body, it does not
  restyle or move your ring controls.
- 17:55 CEST task d4344833 (integration of Sleep+Settings): LIVE as build 20261018-174004 (main 9068120). index.html loads home-settings-sleep-v2.css/js right after home-orbit-v2.js; sw.js precaches both; LowiHomeOrbitV2.sleepToday() returns LowiHomeSettingsSleepV2.sleep.today() once the module owns Sleep. Blooms integrator: put home-blooms-v2 tags AFTER the ss2 tags. Details + live proof: /home/sprite/COORD-ss2-integrate.md
