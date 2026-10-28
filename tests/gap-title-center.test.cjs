// Oct 28 2026 (Emmanuel: "Essenspause" is not centred, in every language). The close moved to the bottom center
// (bottom-close.js), but the old top-left X stayed in the title row invisible (.lw-bx-src) and pushed the title 20-60 px left
// of the card's center (measured EN/DE/ES at 320-430 px wide). The fix is CSS only in gap-view.css: the hidden X leaves the
// row, the title is centred over the card and wraps centred; a visible X gets a mirrored 44 px slot. The row keeps its height.
// The real layout is measured in a browser by /home/sprite/gapcenter-probe.cjs (not part of the suite).
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '..', 'gap-view.css'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '..', 'gap-view.js'), 'utf8');
const bx = fs.readFileSync(path.join(__dirname, '..', 'bottom-close.js'), 'utf8');
const tail = css.slice(css.lastIndexOf('Essenspause is not centred'));

test('the Essenspause title is centred in its row', () => {
    assert.ok(tail.length > 100, 'the centering block sits at the end of gap-view.css, after every older .gv-top rule');
    assert.ok(/\.gv-top h2 \{[^}]*flex: 1 1 auto;[^}]*min-width: 0;[^}]*text-align: center;/.test(tail), 'the title fills the row and centres its text');
    assert.ok(/\.gv-top h2 \{[^}]*overflow-wrap: break-word;/.test(tail), 'a long translation (Pausa entre comidas) wraps instead of running out');
});

test('the hidden top X no longer pushes the title off center', () => {
    assert.ok(/\.gv-x,/.test(bx) || /,\.gv-x,/.test(bx), 'bottom-close still takes over the Gap X');
    assert.ok(/\.gv-top > \.gv-x\.lw-bx-src \{[^}]*position: absolute;/.test(tail), 'while hidden, the X is out of the row');
    assert.ok(/\.gv-top:has\(> \.gv-x:not\(\.lw-bx-src\)\)::after \{[^}]*flex: 0 0 44px;/.test(tail), 'a visible X is mirrored on the right, so the title stays centred');
    assert.ok(/\.gv-top \{[^}]*position: relative;[^}]*min-height: 64px;/.test(tail), 'the row keeps the height it had with the X in it, so nothing below moves');
});

test('the title is the same element and text in all three languages (no copy change)', () => {
    assert.ok(/<h2 id="gvTitle">' \+ esc\(s\('title'\)\) \+ '<\/h2>/.test(js), 'the title markup is unchanged');
    for (const t of ["title: 'Meal gap'", "title: 'Essenspause'", "title: 'Pausa entre comidas'"]) assert.ok(js.includes(t), t);
});
