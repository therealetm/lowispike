// Praise pool: >= 8 lines per language, never the same twice in a row, "First time!" only once per action type, short non-blocking toast.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const P = require('../praise.js');
const SUN = require('../sun-meter.js');
const root = path.join(__dirname, '..');

test('at least 8 distinct first-person lines in de, en and es', () => {
    for (const l of ['de', 'en', 'es']) {
        assert.ok(P.POOL[l].length >= 8, l);
        assert.equal(new Set(P.POOL[l]).size, P.POOL[l].length, l + ' lines are distinct');
        assert.ok(P.FIRST[l]);
    }
    assert.equal(P.POOL.de.length, P.POOL.en.length);
    assert.equal(P.POOL.es.length, P.POOL.en.length);
    assert.ok(P.POOL.de.some(t => /\b(ich|mein|meine)\b/i.test(t)), 'the herb speaks for itself');
});

test('never the same line twice in a row, over many draws and edge randoms', () => {
    let last = -1;
    for (let k = 0; k < 5000; k++) {
        const i = P.pick(12, last);
        assert.notEqual(i, last);
        assert.ok(i >= 0 && i < 12);
        last = i;
    }
    for (const r of [0, 0.5, 0.999999]) for (let lastIdx = 0; lastIdx < 12; lastIdx++) {
        const i = P.pick(12, lastIdx, () => r);
        assert.notEqual(i, lastIdx);
        assert.ok(i >= 0 && i < 12);
    }
    // every line is reachable
    const seen = new Set();
    last = -1;
    for (let k = 0; k < 3000; k++) { last = P.pick(12, last); seen.add(last); }
    assert.equal(seen.size, 12);
});

test('"First time!" only on the first-ever action of a type', () => {
    const a = { ts: 1, amt: 15, src: 'meal:spirit' }, b = { ts: 2, amt: 15, src: 'meal:spirit' }, w = { ts: 3, amt: 2, src: 'water' };
    assert.equal(P.isFirst('meal', a, [a], {}, SUN.classify), true);
    assert.equal(P.isFirst('meal', b, [a, b], {}, SUN.classify), false, 'second meal');
    assert.equal(P.isFirst('water', w, [a, b, w], {}, SUN.classify), true, 'first water even after meals');
    assert.equal(P.isFirst('meal', a, [a], { meal: 1 }, SUN.classify), false, 'recorded before (e.g. ledger trimmed)');
    assert.equal(P.isFirst('other', a, [a], {}, SUN.classify), false, 'no tag for unknown types');
    const zero = { ts: 0, amt: 0, src: 'meal:spirit' };
    assert.equal(P.isFirst('meal', a, [zero, a], {}, SUN.classify), true, 'an uncounted entry is not a first');
});

/* Oct 18, 2026: E-man said the bubbles were too fast to read. The line used to vanish under 2 s; now it stays its reading
   time (at least 4.5 s, about 200 words a minute, read-time-core.js) and is still capped so it never stays forever. */
test('toast stays up its reading time (never forever), never takes taps, skips the sun bonus and is loaded', () => {
    assert.ok(P.SHOW_MS >= 4500 && P.showMs('Nice!') >= 4500 && P.showMs('x '.repeat(500)) <= 24000);
    const css = fs.readFileSync(path.join(root, 'sun-meter.css'), 'utf8');
    assert.match(css, /\.lp-praise \{[^}]*pointer-events: none/);
    const src = fs.readFileSync(path.join(root, 'praise.js'), 'utf8');
    assert.match(src, /if \(type === 'sun' \|\| type === 'quest'\) return;/);
    assert.match(src, /aria-live/);
    new Function(src);
});
