/* Oct 18, 2026 crash fix: the Move card's "This week · ☀ n" line must not compare against the text the page shows.
   spirit.js swaps the sun emoji for an icon, so a textContent comparison never matched again and rewrote the line on
   every frame (endless DOM loop, heat and Safari crashes after opening the Care board). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'nav-moves.js'), 'utf8');

test('Move card line is written only when its own value changes', () => {
    assert.ok(!/querySelector\('\.tiny'\)\.textContent\s*!==/.test(src), 'must not compare the shown text of .tiny');
    assert.ok(/tiny\.__tg !== tg/.test(src), 'compares with the last value it wrote');
});

test('the written value is remembered before the text is set', () => {
    const m = /if \(tiny\.__tg !== tg\) \{([^}]*)\}/.exec(src);
    assert.ok(m, 'guard present');
    assert.ok(/tiny\.__tg = tg/.test(m[1]) && /tiny\.textContent = tg/.test(m[1]));
});
