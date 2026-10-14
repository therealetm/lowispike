// Living Home tiles: every number comes from real state; unknown stays unknown; loader + cache hooks present.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const K = require('../spirit-core.js');
global.LowiSpiritCore = K;
const LV = require('../living-home.js');
const now = new Date(2026, 9, 14, 19, 30).getTime(), day = K.day(now), y = now - 26 * 36e5;

test('tiles read XP, meals, macros, water and movement from state only', () => {
    const state = {
        user: { macroGoals: { protein: 80, fiber: 25, sugar: 30 } },
        logs: [{ day, ts: now - 3e6, macros: { protein: 50, fiber: 12, sugar: 8 } }, { day, ts: now - 2e6 }, { day: K.day(y), ts: y, macros: { protein: 99 } }],
        ledger: [{ ts: now - 3e6, amt: 15, src: 'meal:spirit' }, { ts: now - 1e6, amt: 10, src: 'move', label: 'Walk' }, { ts: y, amt: 99, src: 'meal' }]
    };
    const v = LV.model({ now, state, herb: { xp: 140, progress: 0.4, left: 60, current: ['Sprout', 'Spross', 'Brote'], next: ['Bud', 'Knospe', 'Brote'] }, water: 3 });
    assert.equal(v.xp, 140);
    assert.equal(v.xpToday, 25, 'only today\'s ledger counts');
    assert.equal(v.meals, 2, 'yesterday\'s meal is not today\'s');
    assert.equal(v.unknown, 1, 'the meal without values is reported, not guessed');
    assert.deepEqual(v.macros.map(m => [m.k, m.value, m.known]), [['protein', 50, 1], ['fiber', 12, 1], ['sugar', 8, 1]]);
    assert.equal(v.moved, true);
    assert.equal(v.water, 3);
    assert.equal(v.period, 'evening');
    assert.equal(v.left, 60);
});

test('empty day stays empty: no goals, no meals, no invented values', () => {
    const v = LV.model({ now, state: { logs: [], ledger: [], user: {} }, herb: { xp: 0, progress: 0 }, water: 0 });
    assert.equal(v.hasGoals, false);
    assert.equal(v.meals, 0);
    assert.equal(v.unknown, 0);
    assert.equal(v.xpToday, 0);
    assert.equal(v.moved, false);
    assert.equal(v.dayDone, 0);
});

test('an earned macro bonus shows as earned, sugar over the goal shows as over', () => {
    const state = { user: { macroGoals: { protein: 40, sugar: 10 } }, logs: [{ day, ts: now, macros: { protein: 45, sugar: 12 } }], ledger: [{ ts: now, amt: 20, eventId: 'macro-goal:' + day + ':protein' }] };
    const v = LV.model({ now, state, herb: {}, water: 0 });
    const p = v.macros.find(m => m.k === 'protein'), s = v.macros.find(m => m.k === 'sugar');
    assert.equal(p.earned, true);
    assert.equal(p.ratio, 1);
    assert.equal(s.over, true);
    assert.equal(s.earned, false);
});

test('weather only counts when the cached reading is fresh', () => {
    const base = { now, state: { logs: [], ledger: [] }, herb: {}, water: 0 };
    assert.equal(LV.model({ ...base, weather: { temp: 27, ts: Date.now() } }).warm, true);
    assert.equal(LV.model({ ...base, weather: { temp: 27, ts: Date.now() - 7 * 36e5 } }).temp, null);
    assert.equal(LV.model({ ...base, weather: { temp: 12, ts: Date.now() } }).warm, false);
});

test('loader, cache list and one-tap scan hook are wired', () => {
    const root = path.join(__dirname, '..');
    const loader = fs.readFileSync(path.join(root, 'apple-ui.js'), 'utf8'), sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), js = fs.readFileSync(path.join(root, 'living-home.js'), 'utf8');
    assert(loader.indexOf("'spirit.js'") < loader.indexOf("'living-home.js'"), 'living-home loads after spirit');
    assert.match(sw, /"living-home\.js", "living-home\.css"/);
    assert.match(js, /S\.scannerHost = function/);
    assert.match(js, /o\.capture && !o\.embedded/);
    assert.doesNotMatch(js, /Math\.random/, 'no made-up numbers');
});
