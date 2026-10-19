# HANDOFF: scanner close X at the bottom right (not committed; for the integrator)

Branch: scanner-close-bottom-right, commit 2e4e825b19e7ac5a1e40ba7d34ff3531707957c2 (one commit on top of origin/main badebb0, build 20261018-195906). Pushed; branch CI run 39160092332 passed. NOT released, NOT live.

## Done
- Before: the scanner's X sat at the top left of the camera screen (14,10 to 58,54 at 390x844).
- scan-glass.js `dockX(cam)` (called from the existing `sync()`): moves the same `.b3-cx[data-b3="camclose"]` node out of `.b3-ctop` into a new `.sg-xrow` at the end of `.b3-cbot`, with Deep analyze on its left. Once per scanner. Skipped inside `#spWorld` (that X is hidden there; the world has its own close). Exposed as `LowiScanGlass.dockX`.
- scan-glass.css: `.sg-xrow` flex row, Deep analyze flexes, X 46px round (42px in the short docked layout); top bar left padding 68px so the title keeps its old place. Shopping mode (`.b3-shop` with `.ss-row` present, via `:has`): X sits at the right end of the name/cart row. Typing a code (`.kb`): X stays on its own row under Go.
- 390x844 result: X 321,769 to 367,815; Deep analyze 23 to 313 on the same row; Go 317 to 367 two rows up. With the bottom menu bar on (docked), X ends at 721, above the menu bar at 744.

## Proof
- `node --test tests/*.test.cjs`: 1384/1384 pass, `scripts/test-floor.cjs` OK (floor 1378). 6 new in tests/ui-scanner-close.test.cjs; 4 of them fail on badebb0 (the 2 that pass there are preservation checks). No test edited or removed. `git diff --check` clean.
- `node tests/ui-scanner-close-live.cjs` (Playwright, local server, network blocked): ALL PASS on Chromium 390x844, 375x667, 820x1180, 390x844 reduced motion; WebKit iPhone 13, iPhone SE (320 wide), iPad gen 7. Checks: X inside the panel at its bottom right, nothing lower or further right, at least 42px, hit-test lands on it, no overlap with any control; torch top right and tappable; field, Go, Scan, Photo, Meal, Deep analyze tappable; typing keeps X clear of field and Go; barcode types and Go submits; shopping mode X clear of chips; tapping X closes the scanner; no page errors. Against badebb0 the placement checks fail (X at the top left).
- Emulation only. Not tested on a real iPhone or iPad.

## Integration needs (files I don't own)
- None required: no index.html, loader, sw.js or version.json change is needed for the code to work. scan-glass.js/.css are already loaded; release.sh's cache bump covers them.
- Optional docs (integrator's files): a line in TESTING.md for tests/ui-scanner-close.test.cjs and the live script, and a DECISIONS.md / SCREEN_MAP.md note "Scanner X bottom right of the capture panel".

## Traps
- While a shopping result card is open (`.ss-open`), shop-scan.css hides the whole bottom panel, so this X hides too; the card's own X shows. Tap that, then this X. Intentional, so it never sits over the card.
- The live script's Home Scan-bubble tap is occasionally eaten (one run on badebb0 never opened the scanner); it now retries up to three taps.
- Torch only shows with a camera that reports a torch. The fake cameras have none, so the live script un-hides it the way the app does.

## Next step
Integrator: rebase/merge onto current origin/main, re-run the suite and the live script, release alone with scripts/release.sh, then check Actions and the live version.json. One iPhone check for Emmanuel: open Scan from Home; the X should be at the bottom right next to Deep analyze, and the flash button still at the top right.
