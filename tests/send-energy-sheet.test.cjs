'use strict';
/* Oct 23 2026 (Emmanuel, screenshots of Community > person card > Send energy to Antje: "was ist denn das"): the care sheet
   showed a giant black disc per cell and an unstyled text list because micro-book.css never loaded: micro-book.js only added its
   stylesheet when no element had id="mbCss", and index.html's move-bubble.css link carries exactly that id. Now the sheet has its
   own id, the header says what it is and who gets it, the choices are round glass bubbles and the Send button names the choice. */
const test = require('node:test');
const assert = require('assert'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const mb = read('micro-book.js'), css = read('micro-book.css'), html = read('index.html');

test('micro-book.css loads under its own id, never shadowed by another stylesheet', () => {
    assert.ok(/getElementById\('mbookCss'\)/.test(mb) && /l\.id = 'mbookCss'/.test(mb), 'own link id');
    assert.ok(!/getElementById\('mbCss'\)/.test(mb), 'the move-bubble id is not used as the loaded check');
    assert.ok(/link\[href\*="micro-book\.css"\]/.test(mb), 'an existing micro-book.css link counts as loaded');
    const ids = [...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
    assert.ok(!ids.includes('mbookCss'), 'no other element in index.html takes the id');
});

test('header names the action and the recipient in all three languages', () => {
    assert.ok(/energyOver: T\('SEND ENERGY', 'ENERGIE SENDEN', 'ENVIAR ENERGÍA'\)/.test(mb));
    assert.ok(/energyTo: T\('to \{n\}', 'an \{n\}', 'a \{n\}'\)/.test(mb));
    assert.ok(/tr\('energyOver'\)/.test(mb) && /tr\('energyTo'\)\.replace\('\{n\}', f\.n\)/.test(mb));
    assert.ok(!/esc\(tr\('tFr'\)\.toUpperCase\(\)\)/.test(mb), 'no FRIENDS overline on the care sheet');
});

test('the Send button names what goes out and keeps the send action', () => {
    assert.ok(/sendK: T\('Send · \{k\}', 'Senden · \{k\}', 'Enviar · \{k\}'\)/.test(mb));
    assert.ok(/class="mb-cta" data-mb="send">' \+ esc\(tr\('sendK'\)/.test(mb), 'plain words, no price');
    assert.ok(/else if \(a === 'send'\) \{ sendCare\(\); \}/.test(mb), 'send handler unchanged');
});

test('choices are round glass bubbles with a light-mode look, thumb sized, no flat glint oval', () => {
    assert.ok(/\.mb-care \.mb-kind\{[^}]*border-radius:50%/.test(css) && /aspect-ratio:1\/1/.test(css));
    assert.ok(/html\[data-ui=light\]:not\(\.lg\) \.mb-care \.mb-kind\{color:#13303a/.test(css) && /html\[data-ui=light\]:not\(\.lg\) \.mb-care \.mb-kind\.act\{color:/.test(css), 'light bubbles carry dark text; the always-dark glass shell keeps white ink');
    assert.ok(/\.mb-cell \.hl\{display:none\}/.test(css));
    assert.ok(/prefers-reduced-motion: no-preference\)\{\s*\.mb-care \.mb-kind\.act\{animation:mbBreath/.test(css), 'breathing only without reduced motion');
    assert.ok(/\.mb-care \.mb-cta\{[^}]*min-height:54px/.test(css));
});
