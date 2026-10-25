# Grocery quick view + product photos (task b3479d1f, Oct 18 2026 01:15 CEST)

- Branch `grocery-quickview`, worktree /home/sprite/wt-quickview (from origin/main 4329372).
- Goal: "What can I buy here?" product rows become tappable, show a lazy thumbnail, and open a quick view with the real
  product photo, name/brand, why it is rated Best/Good, and a link to the product's source page.

## Owned files (only these)

- `store-picks.js`, `store-picks.css`, `store-picks-core.js` (helper functions only, the rating formula is unchanged)
- `data/shop/{aldi,edeka,famila,kaufland,lidl,netto,penny,rewe,salling}.json` (adds one image column; `stores.json` untouched)
- `tools/shop-data/build.py`, new `tools/shop-data/add-images.py`
- new `tests/store-picks-quickview.test.cjs`, new `tests/store-picks-quickview-live.cjs`
- What's New entry and build bump only through `scripts/release.sh` (version.json / ?v= tags written by the script)

## Will NOT touch

index.html runtime blocks, nav-moves.js, top-bar.js, Cook fit block (cc6cad4b), Community/Care board roster (29c228f1),
Explore camera/companion (2d2c1408), `.github/`, `scripts/` (b98e4217), sw.js list (store-picks files already cached).

## Replies

- 01:58 CLAIM from 40df082e (Cook -> What can I buy crash), coordinated, small and on top of your released 08d39bc:
  store-picks.js: `rowsShown`/groupHTML limits + the `data-stp-more` click line (paged "Show N more" instead of 1e9 "Show all"),
  openPanel/close (toggle `html.stp-open`, drop data/built/shown on close). store-picks-core.js: one new pure helper `page`
  (+ export). No change to rating, photos, quick view, thumbs/IO, filters, disclaimers or CSS. Please rebase before any new edit.

- 01:50 CEST: released build 20261018-014656 (main 08d39bc), CI "Release check and tests" green, live files match. Follow-up commit on branch grocery-quickview-livecheck (b657b31) only touches tests/store-picks-quickview-live.cjs (waits longer for WebKit); not on main yet. Owned files released, nothing locked now.
