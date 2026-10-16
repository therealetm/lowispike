'use strict';
/* Oct 16, 2026 (handoff task 2): Home top row. Weather pill left, greeting centred, Day/Night + profile right, the Daily Quest
   box centred under the row on phone, iPad upright and iPad landscape; the weather pill and its sheet in the Daily Quest glass. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const block = (css, marker) => { const i = css.indexOf(marker); assert.ok(i >= 0, marker); return css.slice(i); };

test('the top row is one symmetric grid: 92 px weather pill, centred greeting, 92 px for Day/Night + profile', () => {
    const css = block(read('world-home.css'), 'handoff task 2): Home top row');
    assert.match(css, /grid-template-columns: 92px minmax\(0, 1fr\) 92px/);
    assert.match(css, /\.sp-top > \.sp-weather \{ grid-column: 1 !important/);
    assert.match(css, /\.sp-top > \.sp-greeting \{ grid-column: 2 !important[^}]*text-align: center/);
    /* the right column mirrors top-bar.js: 38 px theme button + 10 px gap + 44 px avatar */
    const tb = read('top-bar.js');
    assert.ok(tb.includes('const size = 38;') && tb.includes('left - size - 10'));
    assert.match(css, /left: 14px; right: 14px; top: calc\(var\(--b-top, 0px\) \+ 9px\)/, 'row lines up with the profile picture (beta.css: top --b-top + 9px, right 14px)');
    assert.match(read('beta.css'), /top: calc\(var\(--b-top\) \+ 9px\) !important;\s*right: 14px !important;/);
});

test('the Daily Quest box is centred under the row and never wider than a card on iPad', () => {
    const css = block(read('world-home.css'), 'handoff task 2): Home top row');
    assert.match(css, /#tab-home #f3Board \{ position: absolute !important; top: calc\(var\(--b-top, 0px\) \+ 61px\) !important; left: 0 !important; right: 0 !important;\s*margin: 0 auto !important; width: min\(440px, calc\(100% - 28px\)\) !important;/);
    /* 9 + 44 = 53 < 61: always below the row, so it can never meet the weather pill, the sun/moon or the avatar */
    assert.match(css, /\[data-lay=tablet\] #tab-home#tab-home \{ max-width: none !important;/, 'iPad upright: the page spans the screen so the centre line is the screen centre');
    assert.match(css, /grid-column: auto !important; grid-area: auto !important;/, 'iPad landscape: the row is not boxed into a grid cell');
});

test('weather pill and weather sheet wear the Daily Quest glass, with readable ink', () => {
    const css = block(read('world-home.css'), 'handoff task 2): Home top row');
    assert.match(css, /\.sp-weather\.ask \{\s*box-sizing: border-box; width: 92px; height: 44px;[^}]*var\(--wh-glass-wide\)/);
    const tb = block(read('top-bar.css'), 'handoff task 2): the weather view');
    assert.ok(tb.includes('var(--wh-glass-wide') && tb.includes('backdrop-filter:blur(22px)'));
    assert.ok(!/#0e1430|#070a18/.test(tb), 'no opaque navy sheet in the new block');
    assert.match(tb, /html\[data-ui=light\] #tbWx \.tbw-sheet\{color:#0b1d3f/, 'light glass gets dark text');
});
