'use strict';
/* Bug hunt Oct 23 19:03 (onboarding): on the setup step "What do you want most?", every tap on A woman / A man /
   Prefer not to say repainted the step and ran its entrance animation again (r2Swap: opacity 0 -> 1, slide up 14px),
   so the whole screen blinked on each tap (measured on the live build: pane opacity 0.15 at +40 ms). Moving to the
   next step still animates; a gender tap on the same step must not. */
const {test} = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('gender chip repaint switches the pane entrance animation off', () => {
    const line = (html.match(/const gg = e\.target\.closest\("\[data-r2g\]"\);\s*\n\s*if \(gg && ob\) \{[^\n]*/) || [])[0];
    assert.ok(line, 'gender handler found');
    const after = line.slice(line.indexOf('paintOb();'));
    assert.match(after, /pn\.style\.animation = "none"/, 'animation turned off right after the repaint');
    assert.match(after, /pn\.scrollTop = sc/, 'scroll position still kept');
});

test('stepping to the next setup step still slides the pane in', () => {
    assert.match(html, /\.r2-obpane\{[^}]*animation:r2Swap \.4s/);
    assert.match(html, /@keyframes r2Swap\{from\{opacity:0;transform:translateY\(14px\)\}/);
});
