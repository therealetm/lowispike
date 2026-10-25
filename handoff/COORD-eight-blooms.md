# Home blooms v2: Fuel / Water / Move / Gap bloom adapters (task 6392aee0, Oct 18 2026 16:25 CEST)

To: parent integrator 4303dee5 (eight-bubble Home, owns shell/index/release) and iPad anchor task 5ad305f8.

- Branch `home-blooms-v2`, worktree `/home/sprite/wt-blooms-v2` (from origin/main 340455d).
- NO release, NO build bump, NO loader edits. Parent integrates and releases via scripts/release.sh.

## Owned (new files only)
- `home-blooms-v2.js`, `home-blooms-v2.css`
- `tests/home-blooms-v2*.test.cjs`, `tests/home-blooms-v2*-live.cjs`, `tests/home-blooms-v2-fixture.html`

## Will NOT touch
index.html, world-home.*, living-bubbles.*, misty-flight.*, move-bubble.js, misty-bloom.js, misty-panels.css,
sym-home.js, wide-layout.css, sw.js, version.json, scripts/, .github/, any existing runtime file.

## Proposed API (parent: reply under Replies if you want different selectors)
- `window.LowiHomeBloomsV2.mount(root)` -> idempotent; root = document or an element. Returns controller.
- Bubble selectors it binds (first match wins, inside root):
  - `[data-orbit="fuel|water|move|gap"]` (parent contract in COORD-eight-home.md; root = #spHome)
  - Misty centre (outward direction): `[data-orbit="misty"]`, fallback `#spBubble`, fallback viewport centre. Sleep, Settings, Scan, joystick are NOT handled here.
- `LowiHomeBloomsV2.open(kind)`, `.close()`, `.isOpen()`, `.unmount()`; event `lowi:bloom-v2` on document with detail {kind, open}.
- Bubble tap: one window capture click listener, preventDefault + stopImmediatePropagation only for those four bubbles,
  so old handlers on the same node do not double-fire. Parent may instead call `open(kind)` from its own tap handler and pass
  `mount(root, {bindTaps:false})`.

## Replies
- 16:45 CEST parent 4303dee5 -> both siblings: GEOMETRY CHANGE from the user: ONE true circle centred on Misty, all eight
  controls the SAME diameter, 45 deg steps (x=cx+R cos t, y=cy+R sin t). Order clockwise from top: scan(-90), water(-45),
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
- DONE: branch home-blooms-v2 @ 4033a98 pushed. Handoff: /home/sprite/HANDOFF-home-blooms-v2.md. Unit 14/14, full suite 1292/1292,
  release-check ok, live 153 checks PASS on iPhone chromium / iPhone 13 webkit / iPad webkit. Not loaded, not released.
- 16:45 adopted parent contract (data-orbit, root #spHome, lowi:home-orbit). Reply posted in COORD-eight-home.md.
- 17:05 CEST parent 4303dee5 CORRECTIONS (as shipped in the shell): (1) mount(root) is called with root = document (the Water/Meals/Move
  nodes live in #whHud, outside #spHome), so query from root, never assume #spHome. (2) --o8-cx/--o8-cy/--o8-r/--o8-d/--o8-joy-y are on
  <html> (documentElement), per-control --o8-x/--o8-y on each control. (3) The ring holds the controls still (translate:none !important)
  so the circle stays exact; do not add transforms/translate/scale animations to the control box itself, animate inner content only.
  (4) Shell is verified in Chromium 390x844, WebKit iPhone 13 and WebKit iPad 1180x820 with exact geometry; first release coming now.
- 17:55 CEST task d4344833 (integration of Sleep+Settings): LIVE as build 20261018-174004 (main 9068120). index.html loads home-settings-sleep-v2.css/js right after home-orbit-v2.js; sw.js precaches both; LowiHomeOrbitV2.sleepToday() returns LowiHomeSettingsSleepV2.sleep.today() once the module owns Sleep. Blooms integrator: put home-blooms-v2 tags AFTER the ss2 tags. Details + live proof: /home/sprite/COORD-ss2-integrate.md
