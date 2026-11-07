'use strict';
/* Nov 7 2026 design pass (Emmanuel: "Mach erstmal Design-Durchgang über die ganze App"). Every main screen walked in Chromium at
   393 x 852 (de) and 375 x 667 (es) with the iPhone's safe areas: controls under the round back button with every list scrolled to
   its end, tiny scrolls, sideways scroll, clipped words, small taps. Found and fixed:
   - Deine Daten: the last row stayed under the round back button even scrolled to the end (his screenshot: "Deine Ziele")
   - Meine Woche planen: every question scrolled 16 px (its full height plus a section margin)
   - New post: a 19 px scroll left over
   - Rangliste: the small "how it works" chip was a 24 px tap
   After: no control left under the button at the end of any list, no tiny scroll on these screens (Mischen / Swipen / Kochen on the
   iPhone SE excepted, see no-wobble-fit.test.cjs). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('Deine Daten: the last row scrolls up above the round back button', () => {
    assert.ok(read('your-details.css').includes('html.lw-bx-on .yd-body { padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 96px); }'));
});
test('Meine Woche planen: one screen per question, no 16 px scroll', () => {
    assert.ok(read('week-basket.css').includes('.wb-scroll .wb-q { margin-bottom: 0; }'));
    assert.match(read('week-basket.css'), /\.wb-q \{ display: flex; flex-direction: column; gap: 14px; min-height: 100%; \}/, 'why: the question fills the box');
});
test('New post fits without a leftover scroll', () => {
    const html = read('index.html');
    assert.ok(html.includes('.r3f-post .r3f-head{margin-bottom:4px;padding-top:2px;padding-bottom:4px}'));
    assert.ok(html.includes('.r3f-post #trCompose.card{background:none;border:0;box-shadow:none;padding:0;margin-top:6px}'));
});
test('Rangliste: the small chip takes a finger-sized tap', () => {
    assert.ok(read('ranking.css').includes('.rm-rank .rk-how::after{content:"";position:absolute;inset:-10px -4px}'));
});
