'use strict';
/* Oct 28 2026 slim structure batch 6 (Emmanuel: "Ich möchte, dass du jetzt alles umsetzt"): Move as one progress view.
   M-03 ("Schritte heute bearbeiten", its own sheet) is merged into M-01: today's step range is picked on the Move bubble only.
   The Move page (M-02) shows today's pick as one quiet line with Entfernen in place, next to its week and history tiles.
   The Care board stays in Community > Rangliste (Oct 23, Emmanuel: one board). Mirror mode (M-04) stays its own job. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const js = read('move-bubble.js'), css = read('move-bubble.css');

test('no second steps sheet: the Move page line is not a button that opens one', () => {
    const g = js.slice(js.indexOf('function guessRow()'), js.indexOf('function removeToday()'));
    assert.ok(g.length > 100, 'guessRow found');
    assert.doesNotMatch(g, /editSheet\(\)/, 'the line opens no sheet');
    assert.doesNotMatch(g, /createElement\('button'\); r\.type/, 'the line itself is no button');
    assert.match(g, /data-wm-rmday/, 'Entfernen sits right in the line when today has a pick');
    assert.match(g, /auf der Bewegungs-Bubble wählen/, 'an empty day points to the Move bubble, the one place to pick');
});

test('edit() is kept for old callers and lands on the Move page, never a sheet', () => {
    const e = js.slice(js.indexOf('function editSheet()'), js.indexOf('/* ---------- life cycle'));
    assert.match(e, /openPage\(\)/);
    assert.doesNotMatch(e, /R\.sheet\(/, 'the old sheet is gone');
    assert.match(js, /edit: editSheet, page: openPage/);
});

test('Entfernen takes back every estimate of today through the one unaward path', () => {
    const r = js.slice(js.indexOf('function removeToday()'), js.indexOf('let pageObs'));
    assert.match(r, /C\.estimates\(ledger\(\), dayKey\(\)\)/);
    assert.match(r, /br\.unaward\(e\.eventId\)/);
    assert.match(r, /paint\(\); guessRow\(\);/, 'bubble fill and line repaint right away');
});

test('the line wraps instead of cutting text off', () => {
    assert.match(css, /#tab-move \.wm-guess-row b\{[^}]*overflow-wrap:anywhere/);
    assert.doesNotMatch(css, /#tab-move \.wm-guess-row span\{[^}]*text-overflow:ellipsis/);
});
