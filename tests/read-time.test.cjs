/* Reading time (Oct 18, 2026). E-man: "the bubbles are too fast, actually all bubbles are too fast. I can barely read what it says."
   Every text bubble now stays up for its reading time: about 200 words a minute plus a lead, never under the minimum, never forever.
   A line is never replaced automatically before that minimum. Only how long text stays up changed, not animation speed. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const RT = require('../read-time-core.js');
const C = require('../region-pals-core.js');

test('reading time: about 200 words a minute plus a lead, with a minimum and a cap', () => {
    assert.strictEqual(RT.WPM, 200);
    assert.ok(RT.ms('Hi') >= 4500, 'short speech still gets the minimum');
    assert.ok(RT.ms('Saved', { kind: 'toast' }) >= 3000 && RT.ms('Saved', { kind: 'toast' }) < RT.ms('Saved'));
    const twenty = Array(20).fill('word').join(' ');
    assert.ok(RT.ms(twenty) >= 20 * 300, '20 words need at least 6 s at 200 wpm');
    assert.ok(RT.ms(twenty) > RT.ms(Array(10).fill('word').join(' ')), 'longer text stays longer');
    assert.ok(RT.ms('x'.repeat(5000)) <= 24000, 'never forever');
    const de = 'Bauchspeicheldrüsenentzündungen und Blutzuckerspitzenvermeidungsstrategien sind wichtig.';
    assert.ok(RT.ms(de) >= de.length * 55, 'long German words count by characters');
    assert.strictEqual(RT.atLeast('Hi', 30000), 30000, 'a longer duration a caller asked for is kept');
    assert.strictEqual(RT.atLeast('Hi', 1000), RT.ms('Hi'), 'a shorter one is raised to the reading time');
    assert.ok(RT.holdMs('a line here', 1, 3) >= RT.FLOOR, 'a more important line still waits the floor');
    assert.strictEqual(RT.holdMs('a line here', 1, 1), RT.ms('a line here'), 'same priority waits the full reading time');
});

test('cell guides: every line stays up at least its reading time, in all three languages', () => {
    const A = require('../arrival-core.js');
    let n = 0;
    for (const id of C.IDS) for (const li of [0, 1, 2]) {
        for (const line of C.lines(id, li, A, 'Today: one glass of water before lunch.')) {
            n++;
            assert.ok(C.showMs(line, 'fact') >= RT.ms(line), id + ': ' + line);
            assert.ok(C.minRead(line, 0, 0) >= RT.ms(line), 'not replaced before it is read: ' + line);
            assert.ok(C.minRead(line, 0, 2) >= RT.ms(line), 'a hunt line waits until the lesson is read');
            assert.ok(C.minRead(line, 0, 3) >= RT.FLOOR, 'even a level-up waits the floor');
        }
    }
    assert.ok(n > 60, 'checked every companion line');
    for (const key of Object.keys(C.HUNT)) for (const li of [0, 1, 2]) {
        const L = C.huntLine(key, li, { n: 'Misty', left: 3, L: 4, k: 5, d: [0.5, 0.5] });
        assert.ok(C.showMs(L.text, "hunt") >= RT.ms(L.text), L.key);
    }
});

test('cell guides: no line cuts in before the current one has been up its hold time (no instant interrupt)', () => {
    const js = read('region-pals.js');
    assert.ok(/if \(now < until\) \{/.test(js), 'every automatic line respects the hold time');
    assert.ok(!/line\.prio <= c\.prio \+ 1/.test(js), 'the old instant cut-in for higher priority is gone');
    assert.ok(/'\.rp-say'[\s\S]{0,200}quiet|rp-say[\s\S]{0,400}quiet\(\)/.test(js), 'tapping the bubble still dismisses it');
});

test('Misty\'s praise and hint bubble stays up its reading time', () => {
    const P = require('../praise.js');
    assert.strictEqual(typeof P.showMs, 'function');
    for (const t of ['Nice!', 'That made my bubble glow.', 'Tap the joystick and steer me into a cell world, we will find sugar crumbs together.'])
        assert.ok(P.showMs(t) >= RT.ms(t), t);
    assert.ok(/showMs\(text\)/.test(read('praise.js')), 'the timer uses the text');
});

test('every other text bubble uses the shared reading time', () => {
    assert.ok(/LowiReadTime/.test(read('misty-hub.js')), 'Misty hub nudges');
    assert.ok(/LowiReadTime/.test(read('arrival-cards.js')), 'arrival lines');
    assert.ok(/LowiReadTime/.test(read('cell-world.js')), 'cell world speech');
    assert.ok(/LowiReadTime/.test(read('micro-book.js')), 'micro book toasts');
    const html = read('index.html');
    assert.ok(/function toast\(msg, ms\)\{[^\n]*LowiReadTime/.test(html), 'the app toast');
    assert.ok(/function toast\(t\)\{[^\n]*LowiReadTime/.test(html), 'the install gate toast');
});

test('read-time-core.js loads before anything that speaks, and works offline', () => {
    const html = read('index.html'), sw = read('sw.js');
    const at = html.indexOf('<script src="read-time-core.js'), hub = html.indexOf('<script src="misty-hub.js');
    assert.ok(at > 0 && at < hub, 'loaded early in index.html');
    assert.ok(/const STATIC = \[[^\]]*"read-time-core\.js"/.test(sw), 'cached for offline');
    new Function(read('read-time-core.js'));
});
