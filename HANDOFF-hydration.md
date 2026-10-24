# Hand-off: simpler water logging (10 sips / glass / bottle with size)

Emmanuel, 24 Oct 2026 (two messages, the second one wins):
- Three separate choices on the Water bloom, each the user's own method: **10 sips**, **a finished glass**, **a finished bottle** with a size they pick.
- Sip counting is optional: whoever counts taps "10 sips" after every ten sips. Nobody has to count or measure.
- Never equate ten sips with a glass. Sip size varies, so the 10-sips amount is shown as a rough estimate ("about"), never as exact. No automatic sip detection is implied anywhere.
- Publish after testing. Keep at most two tasks running.

## What exists now (main, build 20261024-085600)
- spirit-core.js line ~49: `WATER={goal:6, ml:250, xpCap:6, amounts:{sips:0.25, cup:1, bottle:3}}`, `waterAmount(k)` (numbers allowed, quarter cups), `waterSum`, `waterFmt`, `waterXpDue`.
- home-blooms-v2.js ~233-243: the Water bloom pushes three orbs: Sips (a few sips, 1/4 cup), Cup/Glas, Bottle (3 cups), each with "≈ N ml".
- spirit.js ~1181: `water(id, kind)` accepts 'sips' | 'cup' | 'bottle'; remembers `waterAmt[id]` for undo; feedback strings drinkSips/drink/drinkBottle (line ~52).
- world-home.js ~1149-1158: long press Water = undo last entry; names the amount by value (0.25 = a few sips, 3 = a bottle).
- tutorial-steps.js 213-223 (VERSION 19) and tutorial-voice-data.js: cards say "a few sips, a cup or a whole bottle".
- tests/water-sips.test.cjs pins 0.25 / 1 / 3; tests/bloom-labels-live.cjs and tools/check-water-sips.cjs use the orbs.

## Proposed change
1. spirit-core: amounts `{sips:0.5 /* ten sips, rough; sip size varies */, cup:1, bottle:<size>}`. `waterAmount('bottle', ml)` = round(ml/250 to quarters). Bottle sizes 330, 500, 750 (default), 1000, 1500 ml, saved per device (synced key under lowispike.*). Keep the 'sips' kind id so old entries still undo correctly (stored amounts are numbers, so old 0.25 entries keep working).
2. Water bloom: orbs **10 sips** ("about 120 ml, sips vary"), **Glass** (≈ 250 ml), **Bottle** (shows the chosen size, e.g. 0.75 l), and a **Bottle size** orb that steps through the sizes on tap (no sheet). EN/DE/ES: "10 sips / 10 Schlucke / 10 sorbos", "Glass / Glas / Vaso".
3. spirit.js: feedback for sips says "Ten sips, roughly"; bottle uses the chosen size; XP rule unchanged (2 XP per whole cup, cap 6 cups).
4. world-home.js undo naming: 0.5 = "ten sips", bottle by stored amount.
5. Tutorial cards + voice: "tap 10 sips after every ten sips if you like counting, or Glass, or Bottle at the size you picked". Bump VERSION, re-record voice (tools/app-voice).
6. Tests first: change water-sips assertions to the new amounts (requirement change), add: 10 sips != glass, bottle size changes the amount, size persists, labels say rough estimate, no wording implies detection. Keep the test count >= current (2892).
7. Browser check 390x844 Chromium + WebKit iPhone 13 (tools/check-water-sips.cjs), release with scripts/release.sh only (its own lock), confirm CI on the released commit and live version.json.

Not started in code: nothing on this branch changes water behaviour.
