// Game-world mood: one shared reading for the 3D world's look and its sound (spiky food, spiky scanned products, no Move logged).
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const M = require('../world-mood-core.js'), WH = require('../world-health-core.js');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const NOW = new Date(2026, 9, 15, 15, 0).getTime(), DAY = WH.dayKey(NOW), YDAY = WH.dayKey(NOW - 864e5);
const meal = (r, extra) => Object.assign({ day: DAY, r, t: 'x', eventId: 'meal:' + Math.random() }, extra || {});
const move = (day) => ({ day: day || DAY, src: 'move', label: 'Move session', amt: 10 });

test('nothing logged is missing data, not a stormy world', () => {
    assert.strictEqual(M.read({ logs: [], ledger: [] }, NOW, WH).level, 0);
    assert.strictEqual(M.read({}, NOW, WH).tier, 'clear');
    assert.strictEqual(M.read(null, NOW, WH).level, 0);
    assert.strictEqual(M.read({ logs: [meal('ja')], ledger: [] }, NOW, WH).level, 0, 'good food without a Move logged stays clear');
});

test('triggers combine: spiky food, spiky scanned products, no Move logged', () => {
    const f = M.read({ logs: [meal('nein')], ledger: [] }, NOW, WH);
    assert.deepStrictEqual([f.level, f.tier, f.why], [0.75, 'stormy', ['food', 'nomove']]);
    const fm = M.read({ logs: [meal('nein')], ledger: [move()] }, NOW, WH);
    assert.deepStrictEqual([fm.level, fm.why], [0.5, ['food']], 'a logged Move softens it');
    const p = M.read({ logs: [meal('nein', { via: 'barcode', eventId: 'meal:bc:123:1' })], ledger: [move()] }, NOW, WH);
    assert.deepStrictEqual([p.level, p.products, p.food], [0.5, 1, 0]);
    const all = M.read({ logs: [meal('nein'), meal('nein', { via: 'barcode' })], ledger: [] }, NOW, WH);
    assert.strictEqual(all.level, 1);
    const both = M.read({ logs: [meal('nein'), meal('nein', { via: 'barcode' })], ledger: [move()] }, NOW, WH);
    assert.strictEqual(both.level, 0.75);
});

test('only today counts', () => {
    assert.strictEqual(M.read({ logs: [meal('nein', { day: YDAY })], ledger: [] }, NOW, WH).level, 0);
    assert.strictEqual(M.read({ logs: [meal('nein')], ledger: [move(YDAY)] }, NOW, WH).level, 0.75, "yesterday's Move does not count today");
    assert.strictEqual(M.read({ logs: [meal('jein')], ledger: [] }, NOW, WH).level, 0, 'a medium meal is not a spike');
});

test('look: clear and stormy are clearly different, stormy scales with the level', () => {
    const c = M.look(0), s1 = M.look(0.5), s2 = M.look(1);
    assert.strictEqual(c.veil, 0); assert.ok(/brightness\(1\.04\)/.test(c.filter));
    assert.ok(s1.veil > 0.6 && s2.veil === 1);
    const sat = f => +f.match(/saturate\(([\d.]+)\)/)[1], br = f => +f.match(/brightness\(([\d.]+)\)/)[1];
    assert.ok(sat(s2.filter) <= 0.5 && br(s2.filter) <= 0.75, 'murky and dim');
    assert.ok(sat(s1.filter) > sat(s2.filter));
});

test('copy speaks about the game world, never a diagnosis', () => {
    const all = JSON.stringify(M.STR).toLowerCase();
    for (const w of ['unhealthy', 'ungesund', 'sick', 'krank', 'disease', 'diagnos', 'insulin resist', 'diabet', 'bad', 'schlecht', 'fail', 'shame'])
        assert.ok(!all.includes(w), w);
    for (const k of Object.keys(M.STR)) assert.strictEqual(M.STR[k].length, 3, k);
    assert.strictEqual(M.line({ level: 0 }, 'de'), 'Klare Welt');
    assert.strictEqual(M.line(M.read({ logs: [meal('nein')], ledger: [] }, NOW, WH), 'en'), 'Stormy world \u00b7 spiky food logged today \u00b7 a Move calms it');
});

test('applied to the world: canvas filter, veil on the pulse beat, line in the top bar, event for the sound', () => {
    const js = read('world-mood.js'), css = read('world-mood.css');
    assert.ok(css.includes('.bw3-canvas { filter: var(--wm-filter'));
    assert.ok(css.includes('animation: wmBreathe var(--wm-beat'));
    assert.ok(js.includes('UNEASY.pulse.every'), 'veil breathes on the same beat as the low pulse');
    assert.ok(/prefers-reduced-motion[^}]*animation: none/.test(css));
    assert.ok(css.includes('pointer-events: none'));
    assert.ok(js.includes("new CustomEvent('lowi:world-mood'"));
    assert.ok(!/award\(|addXp|LowiXp|save\(\)/.test(js), 'reads only, no XP, no writes');
});
