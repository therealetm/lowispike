'use strict';
/* Oct 16, 2026 (handoff task 2, iPad follow-up). User: on iPad the Daily Quest must be centred and the weather pill goes right
   under "Hey <name> / Friday 16 October". iPad upright and sideways share one centre column with the world's own buttons. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const block = (css, marker) => { const i = css.indexOf(marker); assert.ok(i >= 0, marker); return css.slice(i); };
const IPAD = ':is([data-lay=tablet],[data-lay=desktop])';

test('iPad: the weather pill sits under the greeting, in the centre column', () => {
    const css = block(read('world-home.css'), 'handoff task 2, iPad follow-up');
    assert.ok(css.includes(IPAD + ' #tab-home #spHome .sp-top { left: calc(14px - var(--wh-l, 0px)); height: auto;'));
    assert.match(css, /grid-template-rows: 44px 44px; row-gap: 6px;/);
    assert.ok(css.includes(IPAD + ' #tab-home #spHome .sp-top > .sp-weather { grid-column: 2 !important; grid-row: 2 !important; justify-self: center; }'));
});

test('iPad: the Daily Quest box comes after the pill and centres on the screen, also beside the side rail', () => {
    const css = block(read('world-home.css'), 'handoff task 2, iPad follow-up');
    /* row 9 + 44 + 6 + 44 = 103 < 113: the box never meets the pill, the sun/moon or the profile picture */
    assert.ok(css.includes(IPAD + ' #tab-home #f3Board { top: calc(var(--b-top, 0px) + 113px) !important; left: calc(-1 * var(--wh-l, 0px)) !important; }'));
    assert.match(css, /bwr-label \{ top: calc\(var\(--b-top, 0px\) \+ 208px\); \}/, 'the world-map place name stays under the box');
    /* --wh-l is the rail width, set by world-home.js layout(); 0 px when the tab bar is at the bottom */
    assert.ok(read('world-home.js').includes("H.style.setProperty('--wh-l', lv)"));
});

test('phones keep the one-row layout: the iPad rules never apply to data-lay=phone', () => {
    const css = block(read('world-home.css'), 'handoff task 2, iPad follow-up');
    assert.ok(!/data-lay=phone/.test(css));
    const base = block(read('world-home.css'), 'handoff task 2): Home top row');
    assert.match(base, /#tab-home #f3Board \{ position: absolute !important; top: calc\(var\(--b-top, 0px\) \+ 61px\) !important;/);
});

test("Misty's hint bubble treats the Daily Quest box as taken space (it lives outside #spHome)", () => {
    const js = read('world-home.js');
    assert.equal((js.match(/#spHome \.sp-top, #spHome \.f3-board, #f3Board/g) || []).length, 2);
});
