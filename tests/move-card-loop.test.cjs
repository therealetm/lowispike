/* Oct 18, 2026 crash fix: the Move card's "This week · ☀ n" line must not compare against the text the page shows.
   spirit.js swaps the sun emoji for an icon, so a textContent comparison never matched again and rewrote the line on
   every frame (endless DOM loop, heat and Safari crashes after opening the Care board).
   23 Oct 2026: the Care board card left Move (the companion Ranking in Community replaced it), so the line is gone. moveCard()
   still runs on every DOM change, so it must only remove leftovers, never write text. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'nav-moves.js'), 'utf8');

function moveCardBody() {
    const i = src.indexOf('function moveCard() {'), j = src.indexOf('\n    }\n', i);
    assert.ok(i > 0 && j > i, 'moveCard present');
    return src.slice(i, j);
}

test('Move card line is gone and nothing compares the shown text of .tiny', () => {
    assert.ok(!/querySelector\('\.tiny'\)\.textContent\s*!==/.test(src), 'must not compare the shown text of .tiny');
    assert.ok(!/careLine\(/.test(src), 'the sunbeam line writer is gone with the card');
});

test('moveCard only removes the old board cards; it never rewrites them on each DOM change', () => {
    const b = moveCardBody();
    assert.match(b, /querySelectorAll\(':scope > \.nm-lbcard, :scope > \.nm-milescard'\)\.forEach\(o => o\.remove\(\)\)/);
    assert.ok(!/nm-lbcard'; c\.dataset|textContent = tg/.test(b));
    /* the safety line is written once and only when missing */
    assert.match(b, /if \(tl && !\(tl\.nextElementSibling && tl\.nextElementSibling\.classList\.contains\('nm-safeline'\)\)\)/);
});
