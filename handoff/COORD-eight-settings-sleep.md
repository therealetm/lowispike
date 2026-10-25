# COORD: Eight-bubble Home, Sleep + Settings blooms (sibling module)

Owner: task 1ed9e29d-03dc-4bc7-9178-86d47313d82f 'LOWiSPIKE: functional Sleep and Settings bubbles' (started 18 Oct 2026 16:23 CEST)
Worktree: /home/sprite/wt-settingssleep, branch `home-settings-sleep-v2` from origin/main 340455d
Status: DONE, branch pushed, waiting for integration (handoff /home/sprite/HANDOFF-home-settings-sleep-v2.md)

## Owned (only this task edits these)
- new home-settings-sleep-v2.js, home-settings-sleep-v2.css
- new tests/home-settings-sleep-v2.test.cjs, tests/home-settings-sleep-v2-live.cjs

## Not touching
- index.html, version.json, sw.js, scripts/release.sh (integration owner 4303dee5 wires the tags and releases)
- world-home.*, living-bubbles.*, misty-flight.*, home-orbit-v2.* (parent), home-blooms-v2.* (sibling 6392aee0)
- move-bubble.js, misty-bloom.js, misty-panels.css, tests/bloom-anchor* (task 5ad305f8)

## API contract (follows COORD-eight-home.md)
- `window.LowiHomeSettingsSleepV2 = { mount(root), unmount(), sleep: {...pure helpers} }`; mount is idempotent.
- Attaches to `[data-orbit="sleep"]` and `[data-orbit="settings"]` inside root (root = #spHome; document also accepted). Never repositions them.
- Re-reads geometry on `lowi:home-orbit` to fan the bloom outward away from Misty.
- Claims both buttons by setting `data-o8-adapter="settings-sleep"` (the shell's tap() and paintSleep() step aside on that). Sleep is only claimed when `LowiVitalsBridge` exists, so the shell fallback still works without it.
- Sleep face: writes `.o8-val` ("Log" empty, "<6 h" / "6–7 h" / "7 h+"), aria-label, class `done`, `--wh-fill` 0 / .333 / .667 / 1 on the button (CSS rule `.o8-sleep[data-o8-adapter=settings-sleep] .wh-cell-fill` follows it). Never transforms the control box (only `.wh-cell-tx` gets a short nod).
- Sleep storage: `S.health.sleepDays = { 'YYYY-MM-DD': { band: 'under6'|'6to7'|'7plus', ts } }` via `LowiVitalsBridge.state()/save()`: private, account-scoped (lowi.health.<uid>), excluded from cloud backup like the rest of health. Keeps 120 days. No XP, no sun energy.
- The shell's fallback key `lowi.sleep.v1` (Good/Okay/Short) is NOT imported: quality words cannot honestly be turned into hours. Integrator: when this module is loaded, `LowiHomeOrbitV2.sleepToday()` should read `LowiHomeSettingsSleepV2.sleep.today()` (returns `{day, band, done, fill, value, aria}`).
- Event on every change: document `lowi:sleep` `{ day, band|null, value: 'short'|'ok'|'good'|'' , source: 'settings-sleep' }` (value uses the shell's words for its listeners).
- Menu bar switch: calls `LowiHomeOrbitV2.setMenuBar(on)` when present (it writes `lowi.home.menubar` '1'|'0' and fires window `lowi:home-menubar`); without the shell it does both itself. Reads `LowiHomeOrbitV2.menuBar()` if present, else the key.
- One bloom at a time: fires document `lowi:bloom-v2 {kind:'sleep'|'settings'|'more', open, owner:'settings-sleep'}`; closes itself on any `lowi:bloom-v2` open from another owner; calls `LowiHomeBloomsV2.close()` if `isOpen()` before opening. Sibling: please close yours on `lowi:bloom-v2` with `owner:'settings-sleep'`.
- Layer: `#ss2Bloom` (fixed, z-index 8990, never dims). html class `ss2-open` while open. Closes on Escape, outside pointerdown, resize, `lowi:tab`, Home leaving (`wh-home` off or `wh-away`). Follows the bubble on `lowi:home-orbit`.
- Settings bloom: Me (goTab profile), Look & sound (profile + LowiG2E.open('look')), Account (LowiG2E.open('acct')), Menu bar (switch), More. More panel (sits in the free band above/below Misty): Today & history (.wh-todaybtn), Community (goTab foryou), Care board (LowiR3F.openBoardTab), Cook, Workouts, World map (.wh-zoom), VR (.wh-vr), World sound (.wa-btn, switch), Day/night (LowiTopBar.toggleTheme), Gift (.hs-gift), Weather (LowiTopBar.openWeather), Daily quest (html.o8-quest, switch). Each shows only if its route exists at that moment.
- API: `mount(root)`, `unmount()`, `open(kind)`, `close()`, `isOpen()`, `sleep.today()/set(band)/clear()`, `menuBar()`, `setMenuBar(on)`, `available()`, plus pure helpers.
- Loading: `<link rel=stylesheet href=home-settings-sleep-v2.css>` + `<script defer src=home-settings-sleep-v2.js>` after home-orbit-v2.js; add both to sw.js precache. The shell's mountSiblings() mounts it.

## Safety
Tests run on a local static copy; every *.supabase.co request and every non-GET aborted. No backend writes.

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
- 17:05 CEST parent 4303dee5 CORRECTIONS (as shipped in the shell): (1) mount(root) is called with root = document (the Water/Meals/Move
  nodes live in #whHud, outside #spHome), so query from root, never assume #spHome. (2) --o8-cx/--o8-cy/--o8-r/--o8-d/--o8-joy-y are on
  <html> (documentElement), per-control --o8-x/--o8-y on each control. (3) The ring holds the controls still (translate:none !important)
  so the circle stays exact; do not add transforms/translate/scale animations to the control box itself, animate inner content only.
  (4) Shell is verified in Chromium 390x844, WebKit iPhone 13 and WebKit iPad 1180x820 with exact geometry; first release coming now.
- 17:55 CEST task d4344833 (integration of Sleep+Settings): LIVE as build 20261018-174004 (main 9068120). index.html loads home-settings-sleep-v2.css/js right after home-orbit-v2.js; sw.js precaches both; LowiHomeOrbitV2.sleepToday() returns LowiHomeSettingsSleepV2.sleep.today() once the module owns Sleep. Blooms integrator: put home-blooms-v2 tags AFTER the ss2 tags. Details + live proof: /home/sprite/COORD-ss2-integrate.md
