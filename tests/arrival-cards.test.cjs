// Arrival cards: one gold card per arrival in a body place (name, real fact, how today's entries show there).
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const A = require('../arrival-core.js');
const WH = require('../world-health-core.js');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const NOON = new Date(2026, 9, 15, 12, 0, 0).getTime();

test('the eight world places, each with a name and two facts in en/de/es', () => {
    assert.deepEqual(A.IDS.sort(), ['blood', 'brain', 'gut', 'heart', 'liver', 'lung', 'muscle', 'pancreas']);
    for (const id of A.IDS) {
        const p = A.PLACES[id];
        assert.equal(p.n.length, 3); p.n.forEach(n => assert.ok(n.length > 2));
        assert.ok(/^#[0-9a-f]{6}$/i.test(p.hue));
        assert.equal(p.f.length, 2);
        p.f.forEach(f => { assert.equal(f.length, 3); f.forEach(x => { assert.ok(x.length > 20 && x.length < 140, id + ': ' + x); }); });
    }
});
test('ids and names from other builds map to a place', () => {
    assert.equal(A.pid('hub'), 'blood'); assert.equal(A.pid('muscles'), 'muscle'); assert.equal(A.pid('lungs'), 'lung');
    assert.equal(A.pid('Leber'), 'liver'); assert.equal(A.pid('Gut & microbiome'), 'gut'); assert.equal(A.pid('Darm & Mikrobiom'), 'gut');
    assert.equal(A.pid('Bauchspeicheldrüse'), 'pancreas'); assert.equal(A.pid({ place: 'heart' }), 'heart');
    assert.equal(A.pid('nope'), null); assert.equal(A.pid(''), null);
});
test('the day picks the fact: same all day, the other one tomorrow', () => {
    const a = A.fact('heart', NOON, 'en'), b = A.fact('heart', NOON + 3600e3 * 5, 'en'), c = A.fact('heart', NOON + 864e5, 'en');
    assert.equal(a, b); assert.notEqual(a, c);
    assert.ok(A.PLACES.heart.f.some(f => f[1] === A.fact('heart', NOON, 'de')));
});
test('nothing logged today gives a kind, honest line for every place', () => {
    for (const id of A.IDS) for (const li of [0, 1, 2]) {
        const c = A.card(id, {}, NOON, li, WH);
        assert.equal(c.counts.any, false);
        assert.ok(c.today.length > 15, id + ' ' + li);
        assert.ok(!/undefined|NaN/.test(c.today + c.fact + c.name));
    }
    assert.match(A.card('muscle', {}, NOON, 'en', WH).today, /No Move logged yet/);
});
test('today line follows the shared world-health reading of today\'s entries', () => {
    const t = NOON - 3600e3;
    const st = {
        logs: [{ r: 'nein', ts: t }, { r: 'ja', ts: t }, { r: 'ja', ts: t }, { r: 'nein', ts: NOON - 864e5 }],
        ledger: [{ src: 'move', label: 'Move walk', amt: 10, ts: t }, { src: 'water', label: 'Water', amt: 2, ts: t }, { src: 'water', label: 'Water', amt: 2, ts: t + 60e3 }]
    };
    const c = A.today(st, NOON, WH);
    assert.deepEqual([c.meals, c.spikes, c.good, c.water, c.move], [3, 1, 2, 2, true]);
    assert.match(A.todayLine('pancreas', c, 'en'), /^1 spiky meal today/);
    assert.match(A.todayLine('blood', c, 'de'), /^1 Spike-Mahlzeit heute/);
    assert.match(A.todayLine('gut', c, 'en'), /^2 low-spike meals today/);
    assert.match(A.todayLine('muscle', c, 'es'), /Tu movimiento de hoy/);
    assert.match(A.todayLine('brain', c, 'en'), /sugar spike/);
    const calm = A.today({ logs: [{ r: 'ja', ts: t }], ledger: [] }, NOON, WH);
    assert.match(A.todayLine('blood', calm, 'en'), /Your 1 low-spike meal kept/);
    assert.match(A.todayLine('liver', calm, 'en'), /today's 1 meal\./);
    assert.match(A.todayLine('brain', { any: true, water: 4 }, 'en'), /4 or more glasses/);
});
test('a card has everything it shows', () => {
    const c = A.card('Leber', {}, NOON, 'de', WH);
    assert.equal(c.id, 'liver'); assert.equal(c.name, 'Leber'); assert.equal(c.over, 'Angekommen'); assert.equal(c.todayLabel, 'Heute hier');
    assert.ok(c.fact && c.today && c.close && c.hue);
    assert.equal(A.card('nowhere', {}, NOON, 'de', WH), null);
    assert.equal(A.card('heart', {}, NOON, 'es', null).counts.any, false, 'works without world health');
});
test('wired into the app: loader, both service worker lists, self-loaded CSS', () => {
    const ui = read('apple-ui.js');
    assert.ok(ui.includes("'arrival-core.js','arrival-cards.js'"));
    assert.ok(ui.indexOf("'arrival-cards.js'") > ui.indexOf("'inside-row.js'"));
    const sw = read('sw.js');
    for (const f of ['arrival-core.js', 'arrival-cards.js', 'arrival-cards.css']) assert.equal(sw.split('"' + f + '"').length - 1, 2, f + ' in both sw lists');
    assert.ok(read('arrival-cards.js').includes("replace('arrival-cards.js', 'arrival-cards.css')"));
    assert.ok(fs.existsSync(path.join(root, 'arrival-cards.css')));
});
test('hooks every arrival and never opens a WebGL context', () => {
    const js = read('arrival-cards.js');
    for (const ev of ['lowi:world-region', 'lowi:world3d-place', 'lowi:ride-arrive', 'lowi:body-trip-done']) assert.ok(js.includes("'" + ev + "'"), ev);
    for (const f of ['arrival-cards.js', 'arrival-core.js']) assert.ok(!/getContext|WebGLRenderer|three\./i.test(read(f)), f);
    assert.ok(js.includes('data-arr-x'), 'closable');
    const css = read('arrival-cards.css');
    assert.match(css, /\.bw3-full\.arr-on \.bwr-label/, 'one label card at a time');
    assert.match(css, /#caa15a/); assert.match(css, /prefers-reduced-motion/);
    assert.ok(!/position:\s*fixed;\s*inset:\s*0/.test(css), 'no full-screen blocker');
});
