'use strict';
/* Oct 16, 2026 (Emmanuel, iPad): the profile picture and the sun/moon button sit next to the weather pill, one centred row
   under "Hey <name> / date": [weather 92][6][sun/moon 44][6][picture 44] = 192 px. Phones and other tabs keep them top right. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'world-home.css'), 'utf8');
const IPAD = 'html.spirit-app.wh-home:is([data-lay=tablet],[data-lay=desktop])';
const i = css.indexOf('next to where the weather is');

test('iPad Today: weather pill shifts 50 px left so the row of three is centred', () => {
    assert.ok(i > 0);
    const b = css.slice(i);
    assert.ok(b.includes(IPAD + ' #tab-home #spHome .sp-top > .sp-weather { transform: translateX(-50px); }'));
    assert.ok(b.includes('transform: translateX(-50px) scale(.96)'), 'press feedback keeps the shift');
});

test('iPad Today: the profile picture sits in row 2, right of the sun/moon (which follows it)', () => {
    const b = css.slice(i);
    assert.ok(b.includes(IPAD + ' #main #pfBtn#pfBtn { top: calc(var(--b-top, 0px) + 59px) !important; right: auto !important; left: calc(50% + 52px) !important;'));
    /* row 2 ends at 59 + 44 = 103 < 113, where the Daily Quest box starts */
    assert.ok(59 + 44 < 113);
    assert.ok(!/data-lay=phone/.test(b), 'phones untouched');
});
