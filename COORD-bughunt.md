# Bug hunt coordination

No lock.

Last run: 2026-10-22 21:02 Berlin, Scan / Deep analyze / spike rating. Fixed: back (Android back / Safari swipe) on Home with a scanned product or any r2 sheet open left the app instead of closing the sheet. back-swipe.js sig() counted .r2-ov elements, and a closing sheet loses .on at once but stays in the page for its slide-out, so the count did not change within 80 ms and onPop treated it as back on bare Home. sig() now also counts .r2-ov.on. Test added in tests/back-swipe.test.cjs. LIVE as build 20261022-213142 (350fb11, tests 2256/2256, CI green, verify-live OK). Live check tools/hunt-scan-back-probe.cjs: iPhone 15 and Pixel 7, back closes the product sheet and stays in the app; a second back on bare Home leaves as before. Clean: Scan sheet controls (tools/hunt-scan-monkey.cjs, iPhone 13), typed barcodes real/unknown/short/letters/empty and every result control (tools/hunt-scan-barcode.cjs, iPhone 13 dark EN, iPhone SE light DE, Pixel 7 dark ES), fast open/close x8, reload on a result. Not bugs / for later: the barcode placeholder example 4006040000000 fails its own check digit (4006040000006 would pass); maxlength 14 + pattern [0-9]* make a pasted number with spaces do nothing (numeric keypad has no space, low impact); clearing the portion field and leaving it sets 1 g. Previous: 19:03 Berlin, Shuffle / Shop it / Cook it, "I just ate this" names, live 20261022-195226.

Next area: Fuel and Gap + weight tracker

Rotation: onboarding + tutorial -> Shuffle / Shop it / Cook it -> Scan / Deep analyze / spike rating -> Fuel and Gap + weight tracker -> companion / XP / forms -> Community tabs + galaxy chat -> Affiliates + read-aloud -> Settings, What's New, language switch, day/night.
