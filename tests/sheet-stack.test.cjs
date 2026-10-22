/* Oct 22 2026 (Emmanuel's iPhone, 14:22): opening Glow (Aura / Growth / Discovered) or Forms from Misty's sheet drew it over
   Misty's sheet and her rows showed through ("Misty" twice, Food journal, Misty's energy, Star cell XP). Only the top sheet shows
   now, and the sub-sheets of Misty's sheet sit on a solid glass. Checked in the browser by tools/one-ui/stack.js. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('a sheet with an open sheet or the Forms view after it hides its panel (its scrim stays); full pages stay', () => {
    const css = R('one-sheet.css');
    assert.match(css, /html body \.r2-ov:not\(\.full\):not\(\.off\):has\(~ \.r2-ov:not\(\.off\), ~ \.cf-ov\) > \.r2-sh \{ visibility: hidden !important; \}/);
    assert.doesNotMatch(css, /:has\([^)]*\) > \.r2-scrim \{ visibility: hidden/, 'the scrim under the top sheet stays');
    const n = (css.match(/\{/g) || []).length, m = (css.match(/\}/g) || []).length; assert.strictEqual(n, m, 'braces balance');
});

test('Glow and Forms sit on the shared glass over a solid base, light text in Day and Night', () => {
    const css = R('one-sheet.css');
    assert.match(css, /--one-solid: linear-gradient\(180deg, rgba\(58, 112, 205, \.62\), rgba\(16, 42, 102, \.74\)\), linear-gradient\(180deg, #13295c, #0a1738\)/);
    assert.match(css, /\.r2-ov\.wh-ms-ov:not\(\.mh-ov\):not\(\.full\) \.r2-sh \{\s*background: var\(--one-solid\) !important;[^}]*color: #fff !important;/);
    assert.match(css, /\.cf-ov \.cf-panel\.cf-misty \{ background: [^}]*var\(--one-solid\) !important; \}/);
});

test('the sheets involved are siblings in <body>, so the stacking rule reaches them', () => {
    assert.match(R('index.html'), /R2\.sheet = function\(html, opts\)\{[\s\S]{0,600}document\.body\.appendChild\(ov\);/);
    assert.match(R('companion.js'), /V\.ov\.className = 'cf-ov';\s*D\.body\.appendChild\(V\.ov\);/);
    assert.match(R('misty-hub.js'), /R2\.sheet\(html\(sayOverride\), \{ cls: 'wh-ms-ov mh-ov' \}\);/);
    assert.match(R('world-home.js'), /R2\.sheet\(mistyHTML\(st\.sheetTab\), \{ cls: 'wh-ms-ov' \}\);/);
});
