/* Oct 24 2026 (Emmanuel's cycle scope): the My cycle sheet says plainly that its estimate is not for birth control,
   in every language. The old round sheet had this in its disclaimer, but the cell-world sheet that replaced it did not. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'cycle-world.js'), 'utf8');

test('My cycle hedge says not for birth control in en, de and es', () => {
    const hedges = [...src.matchAll(/hedge: '([^']*)'/g)].map(m => m[1]);
    assert.strictEqual(hedges.length, 3);
    assert.ok(/Not for birth control/.test(hedges[0]), hedges[0]);
    assert.ok(/Nicht zur Verhütung/.test(hedges[1]), hedges[1]);
    assert.ok(/anticonceptivo/.test(hedges[2]), hedges[2]);
});

test('the hedge is still drawn in the sheet body', () => {
    assert.ok(src.includes("'<p class=\"cw-hedge\">' + esc(s('hedge'))"));
});
