'use strict';
/* Nov 7 2026 (Emmanuel, screenshot: "why is the billiard getting smaller when the thing opens? Also, scrolling up the chat room ...
   the scroll isn't really fluid").
   - Billiards: the evening "Deine Blase" card lifts the round back button above it (bottom-close.js --bx-lift); the table was laid
     out against the lifted button and shrank. It now uses the button's resting place. Browser check with the real card
     (LowiE1.invite): old code 290 x 358 -> 140 x 170, new code stays 290 x 358.
   - Chat: photos load lazily and grew from 96 px to their own height while you scrolled up; iPhone Safari does not hold the scroll
     position for that, so the list jumped. Every chat photo has its 4:5 box before it loads. Browser check: portrait and landscape
     photos both 246 x 308 before and after loading. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('the billiard table is laid out against the round button\'s resting place, not where a card lifted it', () => {
    const js = read('room-table.js');
    assert.match(js, /const lift=parseFloat\(getComputedStyle\(x\)\.getPropertyValue\('--bx-lift'\)\)\|\|0,top=b\.top\+Math\.max\(0,lift\);/);
    assert.match(read('bottom-close.css'), /bottom:calc\(env\(safe-area-inset-bottom, 0px\) \+ 14px \+ var\(--bx-lift, 0px\)\)/, 'why: the lift moves the button up by exactly --bx-lift');
});
test('a chat photo keeps its box while it loads, so scrolling up never jumps', () => {
    assert.ok(read('community-tg.css').includes('.cr-room .cm-bub.cm-pbub .cs-photo img{aspect-ratio:4/5;min-height:0;max-height:none}'));
    assert.ok(read('community-chat.css').includes('#cmPaneChat .cm-bub .cs-photo img { aspect-ratio: 4 / 5; object-fit: cover; }'));
});
