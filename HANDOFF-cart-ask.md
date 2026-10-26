# HANDOFF: Cart sheet look + "Someone else pays" (whole Cart as a Give a hand basket)

Emmanuel, Mon 26 Oct 2026 about 4:50 PM CET (2 German voice messages + 2 iPad screenshots), full words in MAYA-HANDOFF.md 0.34:
"This isn't right. Look at the UI, it looks weird. Also, when you put things in your cart, I want you to be able to choose the
option that someone else pays for it. Then you land on this Tinder swipe, because Hilf mit (Give a hand) does it automatically.
So the whole shopping list, without having to type anything in manually."

Branch `cart-ask-pay`, worktree /home/sprite/wt-cart-ask, COORD /home/sprite/COORD-cart-ask.md. Started by task cbbafa65 (ran out of
room before release), finished and released by the continue task.

## What shipped
- Cart sheet (store-picks.js / store-picks.css, `.stp-cartv`): covers the whole Shop card, solid glass, the page behind is blurred;
  sticky title, the list scrolls under it; "Go shopping" plus two matching compact buttons with one 18 px icon each (the scan icon had
  no size and grew to about 212 px on iPad, which made both buttons huge circles).
- "Someone else pays / Jemand anderes zahlt / Que pague otra persona" (`data-stp="giftcart"` -> `LowiGiftBasket.fromCart('shop')`,
  fallback `open('shop','mine')`): the whole Cart (items + quantities) becomes a Give a hand basket. Only rough total + pay link are
  typed (prefilled when saved). One Share (round 43 double-tap guard) lands in the Hilf mit swipe feed. Only low-spike foods go in;
  one short line names what was left out and why.
- Cart names in the app language: food-names-core.js (DE/ES names for the Cart's English ingredient names).
- food-policy-core.js: herbs, spices, salt/pepper and plain (no-sugar) salsa count as low-spike; sweet look-alikes (barbecue salsa,
  After Eight) stay not low-spike (strictest rule wins). An unknown food now says the app can't rate it yet instead of "kein Low-Spike".
- What's New / tour step `new-cart-ask` (part 'new', VERSION 30) with recorded EN/DE/ES voices. Silent release (no update card).

## Tests and checks
- tests/cart-ask-pay.test.cjs: 6 tests, 5 fail on the old code. tests/supermarket-cart.test.cjs updated: the cart's third way on is now
  `giftcart` -> `fromCart('shop')` (the old `open('shop','mine')` stays as fallback).
- tools/cart-ask/check.cjs (local root or live URL): WebKit iPhone 13, iPhone SE, iPad upright + sideways in EN/DE/ES, Chromium iPhone +
  iPad, Reduce Motion. Check 1 waits out the 0.26 s entry slide (a loaded test machine measured the sheet 24 px low mid-transition).

## Open
- The cart look has not been tried on Emmanuel's own iPhone/iPad.
