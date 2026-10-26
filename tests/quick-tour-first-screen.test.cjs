'use strict';
/* Oct 26 2026 (MAYA-HANDOFF 0.38, Emmanuel: "the same video as a quick tour on the onboarding page").
   A browser visitor's very first screen is the Add to Home Screen guide (index.html, #r2gate .r2-start.a1-first), not herb-start
   step 0, so the Quick tour pill must sit there too, under the "Free app" line, compact so the install steps keep their room.
   And the start gate hides everything else in <body>, so the sheet must open inside the gate as a modal <dialog> (top layer),
   or the tap opens nothing visible. Browser proof: tests/quick-tour-live.cjs part A. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('first screen: the Add to Home Screen guide gets the Quick tour pill under its "Free app" line, in the page language', () => {
    const js = read('quick-tour.js');
    const Q = require('../quick-tour.js');
    assert.ok(js.includes("#r2gate .r2-start.a1-first .a1-what"), 'mounts on the guide\'s first screen, under .a1-what');
    assert.match(js, /className = 'hs-qt a1-qt'/, 'the same pill look as step 0, plus its compact a1 variant');
    assert.match(js, /insertAdjacentElement\('afterend', b\)/, 'right after the Free app line');
    assert.match(js, /new MutationObserver\(\(\) => mountPills\(\)\)[^\n]*attributeFilter: \['lang'\]/, 'relabels when the language changes');
    assert.match(js, /new MutationObserver\(\(\) => mountPills\(\)\)\.observe\(D\.getElementById\('r2gate'\)/, 'remounts when the guide redraws');
    assert.strictEqual(typeof Q.mountPills, 'undefined', 'mountPills is browser-only (not on the node export)');
});

test('first screen pill: compact (32 pt drawn, 44 pt to tap), centred, never pushing the install steps off small phones', () => {
    const css = read('quick-tour.css');
    assert.match(css, /\.r2-start\.a1 \.a1-qt \{[^}]*min-height: 32px/, '32 pt drawn');
    assert.match(css, /\.r2-start\.a1 \.a1-qt::before \{ content: ""; position: absolute; inset: -6px -4px; \}/, '44 pt tap area');
    assert.match(css, /@media \(max-height: 740px\) \{ \.r2-start\.a1 \.a1-qt/, 'tighter on short screens');
});

test('the sheet opens as a modal dialog inside the start gate while the gate is up, and closes cleanly', () => {
    const js = read('quick-tour.js'), css = read('quick-tour.css');
    assert.match(js, /HTMLDialogElement === 'function' \? 'dialog' : 'div'/, 'a <dialog> where the browser has one');
    assert.match(js, /\(gateUp \? gate : D\.body\)\.appendChild\(ov\)/, 'inside the gate while it is up');
    assert.match(js, /ov\.showModal\(\)/, 'showModal: top layer, rest inert');
    assert.match(js, /addEventListener\('cancel', e => \{ e\.preventDefault\(\); close\(\); \}\)/, 'Escape on the dialog runs our close (frees the video)');
    assert.match(js, /if \(el\.close && el\.open\) try \{ el\.close\(\); \}/, 'the dialog is closed on close');
    assert.match(js, /ov\.isConnected && ov\.classList\.contains\('on'\)/, 'a sheet removed with the gate does not count as open');
    assert.match(css, /dialog\.qt-ov \{[^}]*max-width: none; max-height: none; margin: 0/, 'the dialog fills the screen');
    assert.match(css, /dialog\.qt-ov::backdrop \{ background: transparent; \}/, 'no second dim layer');
});
