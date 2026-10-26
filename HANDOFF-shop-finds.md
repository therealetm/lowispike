# Shop finds made simple (MAYA-HANDOFF 0.32, Mon 26 Oct 2026)
- grocery-hunt.js homeHTML: one purpose line (companion), Scan + Photo, Power combos hero (.gh-combos), Caught today with the scanner card's
  verdict words (lvlWord reads LowiShopScanCore.tx v_none/v_mild/v_spike), one "Your shop" row, then a "More" fold (rhythm, sharing, how XP works, small print).
- The shop is picked once: adoptShop() reuses LowiStorePicks.state().store (Supermarket) while Shop finds has no shop of its own, or its shop
  came from Supermarket (localStorage lowi.gh.spshop). Picking a shop in Shop finds stops following Supermarket.
- Scanner card note: oneLine(res), only when a scan earned XP or moved a Power combo on; otherwise nothing.
- Rewards unchanged (grocery-hunt-core.js untouched). XP log label "Shopping check-in" is now "Shopping bonus".
- Tests: tests/shop-finds-simple.test.cjs. Browser: node tools/shop-finds/probe.cjs --views i13 (--url LIVE).
