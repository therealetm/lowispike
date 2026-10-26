// Bug hunt run 30 (Oct 26, 2026): after midnight Gap said "Last meal · Dinner · 06:57 PM" with no day word, while the end-fast
// sheet for the same meal said "since 18:57 yesterday". Read at 00:30 that looks like a meal later today. The Last meal line now
// carries the same day words as the fasting sheet: nothing today, "yesterday" for yesterday, the date further back.
const test = require('node:test'), assert = require('node:assert'), path = require('node:path');
const G = require(path.join(__dirname, '..', 'gap-view.js'));

const at = (dayOff, hh, mm) => { const d = new Date(); d.setHours(hh, mm || 0, 0, 0); d.setDate(d.getDate() + dayOff); return d.getTime(); };

test('a meal eaten today shows just the time', () => {
    const t = at(0, 0, 0) + 1000; /* 00:00:01 today: always in the past or now */
    assert.strictEqual(typeof G._when, 'function', 'gap-view exposes _when');
    const s = G._when(t, 'en');
    assert.ok(!/yesterday/i.test(s), s);
    assert.ok(/\d{1,2}:\d{2}/.test(s), s);
});

test('a meal from yesterday evening says yesterday (EN / DE / ES)', () => {
    const t = at(-1, 18, 57);
    assert.match(G._when(t, 'en'), /yesterday/);
    assert.match(G._when(t, 'de'), /gestern/);
    assert.match(G._when(t, 'es'), /ayer/);
});

test('a meal two days back shows its date, never "yesterday"', () => {
    const t = at(-2, 12, 0), s = G._when(t, 'en');
    assert.ok(!/yesterday/i.test(s), s);
    assert.ok(s.length > 6, s);
    assert.notStrictEqual(s, G._when(at(0, 12, 0), 'en'), 'differs from the same time today');
});

test('every language has the yesterday word', () => {
    for (const l of ['en', 'de', 'es']) assert.ok(G.strings[l].ago1, l);
});
