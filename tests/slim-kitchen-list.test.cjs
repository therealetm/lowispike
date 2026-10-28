'use strict';
/* Oct 28 2026 slim structure batch 8 (Emmanuel: "Ich möchte, dass du jetzt alles umsetzt"): kitchen and shopping list are one workspace.
   X-03 into F-05: what you bought today (the scan bucket) shows right under the kitchen's Einkaufsliste,
   and the full sheet with recipe ideas opens from there. The bucket, the scan card and the meal flows stay as they are. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const js = fs.readFileSync(path.join(__dirname, '..', 'kitchen-game.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'kitchen-game.css'), 'utf8');

test('the shopping list view carries Heute gekauft', () => {
    const b = js.slice(js.indexOf('function buyView()'), js.indexOf('function noteHTML()'));
    assert.match(b, /\+ todayBought\(\) \+ '<\/div>'/);
    assert.match(b, /function todayBought\(\)[\s\S]*W\.LowiBucket[\s\S]*B\.today\(\)/);
    assert.match(b, /Heute gekauft/);
    assert.match(b, /if \(!items\.length\) return ''/, 'no empty block when nothing was bought today');
    assert.match(b, /data-kg="today"/);
});

test('Was koche ich daraus opens the same bucket sheet, and the list repaints when the bucket changes', () => {
    assert.match(js, /k === 'today'\) \{ try \{ W\.LowiBucket && W\.LowiBucket\.openToday && W\.LowiBucket\.openToday\(\)/);
    assert.match(js, /addEventListener\('lowi:bucket', \(\) => \{ try \{ if \(open === 'buy'/);
});

test('the block wraps long names and uses the bucket verdict colours', () => {
    assert.match(css, /\.kg-tdl li \{[^}]*overflow-wrap: anywhere/);
    assert.match(css, /\.kg-tdd\.v-spike/);
    assert.match(css, /\.kg-tdgo \{[^}]*min-height: 44px/);
});
