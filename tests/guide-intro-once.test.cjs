/* Cell guides introduce themselves once (Oct 18, 2026). Emmanuel: "they shouldn't be repeating themselves the whole time, that's
   annoying. They introduce themselves once, obviously, the first time seeing them. But the rest of the time it's 'Oh, you're back,'
   or 'Glad you're back,' or 'Nice being back,' or 'Oh, we're back to business.'"
   Each guide's first meeting is remembered on the device (localStorage lowi.guides.v1). Later visits open with a short welcome-back
   line from a pool, never the same line twice in a row, and the hello never comes back when you tap through the lines. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const C = require('../region-pals-core.js');

test('welcome-back pool: several short lines in English, German and Spanish', () => {
    assert.ok(Array.isArray(C.BACK) && C.BACK.length === 3);
    const n = C.BACK[0].length;
    assert.ok(n >= 6, 'enough lines to vary');
    for (const L of C.BACK) {
        assert.strictEqual(L.length, n, 'same lines in every language');
        for (const s of L) { assert.ok(s && s.length <= 70, 'short: ' + s); assert.ok(!/\{|\}/.test(s)); }
        assert.strictEqual(new Set(L).size, n, 'no duplicates');
    }
    assert.ok(C.BACK[0].some(s => /you’re back|you're back/i.test(s)) && C.BACK[0].some(s => /business/i.test(s)), 'his examples are in');
});

test('welcome-back line: never the same one twice in a row, and it varies', () => {
    let last = -1; const used = new Set();
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let k = 0; k < 300; k++) {
        const b = C.backLine(k % 3, last, rnd);
        assert.ok(b && typeof b.text === 'string' && b.text.length > 0);
        assert.notStrictEqual(b.i, last, 'repeated line ' + b.i);
        assert.strictEqual(b.text, C.BACK[k % 3][b.i]);
        used.add(b.i); last = b.i;
    }
    assert.ok(used.size >= C.BACK[0].length - 1, 'uses the whole pool');
    assert.notStrictEqual(C.backLine('en', 0, () => 0).i, 0, 'even a stuck random never repeats');
});

test('memory: each guide is met once, remembered per guide, survives a bad saved value', () => {
    const m = C.memory(null);
    assert.strictEqual(C.met(m, 'liver'), false);
    C.meet(m, 'liver', 123);
    assert.strictEqual(C.met(m, 'liver'), true);
    assert.strictEqual(C.met(m, 'gut'), false, 'per guide');
    const again = C.memory(JSON.parse(JSON.stringify(m)));
    assert.strictEqual(C.met(again, 'liver'), true, 'survives a save and load');
    for (const bad of ['x', 5, [], { met: 'no' }, { met: null }]) { const b = C.memory(bad); assert.strictEqual(C.met(b, 'liver'), false); }
});

test('opening line: the hello on the first meeting, a welcome-back line afterwards', () => {
    const A = require('../arrival-core.js');
    const lines = C.lines('liver', 'en', A, '');
    const m = C.memory(null);
    const first = C.opening(m, 'liver', 'en', lines, null, () => 0.4);
    assert.strictEqual(first.i, 0); assert.strictEqual(first.text, lines[0]); assert.ok(/^Hi, I’m/.test(first.text));
    assert.ok(C.met(m, 'liver'), 'meeting is remembered');
    const seen = new Set([0]);
    const second = C.opening(m, 'liver', 'en', lines, seen, () => 0.4);
    assert.ok(!/Hi, I’m/.test(second.text), 'no second hello');
    assert.ok(C.BACK[0].some(b => second.text.indexOf(b) === 0), 'starts with a welcome-back line: ' + second.text);
    assert.strictEqual(second.i, 1, 'then something it has not told you yet');
    const third = C.opening(m, 'liver', 'en', lines, new Set(lines.map((_, i) => i)), () => 0.4);
    assert.ok(C.BACK[0].indexOf(third.text) >= 0, 'all told: just the welcome back');
    assert.notStrictEqual(third.back, second.back, 'never the same welcome twice in a row');
});

test('tapping through the lines skips the hello once you have met', () => {
    assert.strictEqual(C.cycle(0, 5, false), 0);
    assert.strictEqual(C.cycle(5, 5, false), 0);
    assert.strictEqual(C.cycle(5, 5, true), 1);
    assert.strictEqual(C.cycle(0, 5, true), 1);
    assert.strictEqual(C.cycle(3, 5, true), 3);
    assert.strictEqual(C.cycle(0, 1, true), 0, 'a guide with only its hello still has something to say');
});

test('wired: the guide remembers meetings on the device and the old fixed back line is gone', () => {
    const js = read('region-pals.js');
    assert.ok(/'lowi\.guides\.v1'/.test(js), 'stored under lowi.guides.v1');
    assert.ok(/C\.opening\(/.test(js), 'opening line comes from the core');
    assert.ok(/C\.cycle\(/.test(js), 'tap cycle skips the hello');
    assert.ok(!/C\.guide\('back'/.test(js), 'no more fixed back line');
    assert.ok(/lowi\.guides\.v1/.test(read('DATA_CONTRACTS.md')), 'storage key documented');
});
