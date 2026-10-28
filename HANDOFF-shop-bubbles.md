# Einkaufen bubbles (Oct 28 2026, 23:00)

Emmanuel, call: "Whilst we edit, when I click on shopping, I want supermarket, Home, Seller Zone and Hilf mit to also be bubbles. And then when you click on those bubbles, it takes you to those pages. Don't you think that it's more aligned to our design?"

- Tap on the Einkaufen bubble (Home ring, `fuel`) opens a bloom, the same bloom Water / Move / Sleep use (`home-blooms-v2.js`, `RING.fuel = 'bloom'`). Second tap or Escape folds it.
- Its orbs are Einkaufen's own doors, from `LowiStorePicks.doors()` in tab-bar order: Supermarkt, Zu Hause (only with week-basket.js), Seller Zone, Küche (only on a build that still has that tab), Hilf mit (only once the server table answers; `lowi:gift-ready` refreshes an open bloom).
- A tap on an orb calls `LowiStorePicks.openAt(id)`: Einkaufen opens right on that page (`openPanel(from, start)`); Hilf mit opens in Einkaufen's frame, so X / back / Escape close Einkaufen and you are on Home. The tab bar inside Einkaufen still works.
- Without `doors()` (old module) the bubble still opens Einkaufen directly (`shop()` fallback). The hold-Scan overview leaves the Einkaufen orbs out (they open pages).
- Tour card `fuel` shows `fuel-bloom`.
- Tests: `tests/shop-bubbles.test.cjs` (+ updated ring-same-everywhere, slim-structure, sleep-ring, cook-frame-shop-bubble). Browser probe: `/home/sprite/shopb-probe.cjs <root|url> [chromium|webkit]` (orbs on screen and tappable, each route, Escape back to Home, Water and Gap unchanged).
