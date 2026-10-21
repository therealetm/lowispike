// Oct 21 design audit: fasting times across clock changes. Run in Berlin time (the user's zone) whatever the machine says.
// Spring forward (28 Mar 2027, 02:00 -> 03:00) and fall back (25 Oct 2026, 03:00 -> 02:00).
process.env.TZ = 'Europe/Berlin';
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const C = require('../fast-edit-core.js');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const H = 36e5;

test('a start time the clock skipped is refused, not moved an hour in silence', () => {
    assert.strictEqual(C.readParts('2027-03-28', '02:30').err, 'gap');
    assert.ok(Number.isNaN(C.fromParts('2027-03-28', '02:30')), 'used to come back as 03:30');
    assert.ok(Number.isNaN(C.fromParts('2027-03-28', '02:00')));
    assert.strictEqual(C.readParts('2027-03-28', '01:59').err, '');
    assert.strictEqual(C.readParts('2027-03-28', '03:00').err, '');
    assert.strictEqual(new Date(C.fromParts('2027-03-28', '03:00')).toISOString(), '2027-03-28T01:00:00.000Z');
    assert.strictEqual(C.readParts('2026-02-30', '10:00').err, 'invalid');
});

test('the repeated hour at fall back is read as the first one (summer time) and flagged as twice', () => {
    const t = C.fromParts('2026-10-25', '02:30');
    assert.strictEqual(new Date(t).toISOString(), '2026-10-25T00:30:00.000Z');
    assert.ok(C.twice(t));
    assert.ok(C.twice(t + H), 'the second 02:30 (winter time) is flagged too');
    assert.ok(!C.twice(C.fromParts('2026-10-25', '03:30')));
    assert.ok(!C.twice(C.fromParts('2026-10-24', '02:30')));
    assert.ok(!C.twice(NaN));
});

test('offset label follows the picked time, not the current one', () => {
    assert.strictEqual(C.offsetLabel(Date.UTC(2026, 9, 24, 18)), 'UTC+2');
    assert.strictEqual(C.offsetLabel(Date.UTC(2026, 9, 26, 18)), 'UTC+1');
});

test('a fast across the fall back counts real hours: 20:00 to 12:00 is 17 h, not 16', () => {
    const s = C.fromParts('2026-10-24', '20:00'), e = C.fromParts('2026-10-25', '12:00');
    assert.strictEqual((e - s) / H, 17);
    const s2 = C.fromParts('2027-03-27', '20:00'), e2 = C.fromParts('2027-03-28', '12:00');
    assert.strictEqual((e2 - s2) / H, 15, 'and across spring forward 15 h');
    // validate/apply work on instants, so the edit stores the real start
    const now = C.fromParts('2026-10-25', '12:00');
    const r = C.apply({ last: now - 2 * H, hist: [] }, s, now);
    assert.ok(r.ok); assert.strictEqual(r.state.last, s);
});

test('the edit card names the skipped and repeated hour in EN, DE and ES and shows the picked time\'s offset', () => {
    const js = read('fast-edit.js');
    assert.strictEqual((js.match(/ gap: '/g) || []).length, 3);
    assert.strictEqual((js.match(/ twice: '/g) || []).length, 3);
    assert.ok(/rp\.err === 'gap'\) m = w\('gap'\)/.test(js));
    assert.ok(/tzLabel\(pre\)/.test(js) && /tzLabel\(isFinite\(t\) \? t : now\)/.test(js));
    assert.ok(!/new Date\(\)\.getTimezoneOffset\(\)/.test(js), 'no offset from now in the card');
});

test('fasting sheet: the end button stays on screen while the sheet scrolls; Edit start has a 44 px tap area', () => {
    const html = read('index.html'), css = read('fast-edit.css');
    assert.ok(/\.fst-sh \.fst-go\{position:sticky;bottom:72px;z-index:3\}/.test(html));
    assert.ok(/#sheet:has\(> \.fst-sh\) \{[^}]*padding-bottom: calc\(var\(--sab, 0px\) \+ 84px\) !important;/.test(read('misty-panels.css')), 'room for the close X under the last row');
    assert.ok(/\.fe-chip::after \{ content: ''; position: absolute; inset: -6px -4px; \}/.test(css));
});
