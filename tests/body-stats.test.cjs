'use strict';
/* Oct 19 2026 (Emmanuel: "Wenn ich mich da wiege ... gibt dir einen BMI und er sagt dir, wie viel Fett du hast ... das ist der
   wichtigste Faktor" + "you'd really see how fat you were and now you're thin").
   Pins: BMI maths and WHO bands, the body-fat ESTIMATE (Deurenberg, a range, none under 18), one weigh-in per day, history and
   removal, the level-up track toward the healthy band, three languages, and the wiring (Settings row, tutorial step, includes,
   offline cache, the Day card giving way). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const C = require('../body-stats-core.js');
const NOW = new Date('2026-10-19T18:00:00').getTime(), DAY = 864e5;
const state = o => Object.assign({ user: { bday: '1997-10-12', gender: 'm' }, health: {} }, o || {});

test('BMI and WHO adult bands', () => {
    assert.strictEqual(C.bmi(80, 180), 24.7);
    assert.strictEqual(C.bmi('92,5', '180'), 28.5, 'comma decimals work');
    assert.strictEqual(C.bmi(80, null), null);
    assert.strictEqual(C.category(18.4, 30), 'under');
    assert.strictEqual(C.category(18.5, 30), 'healthy');
    assert.strictEqual(C.category(24.9, 30), 'healthy');
    assert.strictEqual(C.category(25, 30), 'over');
    assert.strictEqual(C.category(30, 30), 'obese');
    assert.strictEqual(C.category(22, 15), 'young', 'no adult band under 18');
    assert.deepStrictEqual(C.healthyRange(180), { lo: 59.9, hi: 80.7 });
});

test('body fat is an estimate range, sex-aware, never under 18', () => {
    const m = C.bodyFat(24.7, 29, 'm'), f = C.bodyFat(24.7, 29, 'f'), x = C.bodyFat(24.7, 29, 'x');
    assert.strictEqual(m.mid, Math.round(1.2 * 24.7 + 0.23 * 29 - 10.8 - 5.4));
    assert.strictEqual(m.hi - m.lo, 8);
    assert.ok(f.mid > m.mid + 9, 'women carry more essential fat');
    assert.ok(x.lo <= m.lo && x.hi >= f.hi && x.sexKnown === false, 'unknown sex spans both');
    assert.strictEqual(C.bodyFat(24.7, 16, 'm'), null);
    assert.strictEqual(C.bodyFat(24.7, null, 'm'), null, 'needs a birthday');
    assert.strictEqual(C.age('1997-10-19', NOW), 29);
    assert.strictEqual(C.age('1997-10-20', NOW), 28);
});

test('weigh-in: validates, one per day, keeps S.health.weight and height', () => {
    const s = state();
    assert.throws(() => C.weighIn(s, { kg: 'abc' }, NOW), /weight/);
    assert.throws(() => C.weighIn(s, { kg: 80, cm: 20 }, NOW), /height/);
    C.weighIn(s, { kg: '95,4', cm: 180 }, NOW - 2 * 3600e3);
    C.weighIn(s, { kg: 95 }, NOW);
    assert.strictEqual(s.health.body.weights.length, 1, 'same day replaces');
    assert.strictEqual(s.health.weight, '95');
    assert.strictEqual(s.health.heightCm, 180);
    assert.strictEqual(s.health.body.lastWeight, 95, 'body-core trackWeight will not log it twice');
    const sm = C.summary(s, NOW);
    assert.strictEqual(sm.bmi, 29.3);
    assert.strictEqual(sm.category, 'over');
    assert.ok(sm.fat && sm.fat.mid > 20);
    assert.strictEqual(sm.weighedToday, true);
    C.weighIn(s, { kg: 80, gender: 'f' }, NOW);
    assert.strictEqual(s.user.gender, 'f');
});

test('level-up track: progress toward the healthy band, removal rolls back', () => {
    const s = state({ health: { heightCm: 180 } });
    C.weighIn(s, { kg: 95 }, NOW - 30 * DAY);
    let p = C.progress(s, NOW);
    assert.strictEqual(p.level, 1); assert.strictEqual(p.goal, 'down'); assert.strictEqual(p.count, 1);
    C.weighIn(s, { kg: 93.6 }, NOW - 15 * DAY);
    C.weighIn(s, { kg: 91.8 }, NOW);
    p = C.progress(s, NOW);
    assert.strictEqual(p.delta, -3.2);
    assert.strictEqual(p.level, 4, 'every full kg toward the band is a level');
    assert.strictEqual(p.nextLevelKg, 0.8);
    assert.strictEqual(p.days, 30);
    assert.strictEqual(p.toBand, 11.1);
    assert.ok(C.figureWidth(p.firstBmi) > C.figureWidth(p.lastBmi), 'Now figure is slimmer');
    C.remove(s, NOW);
    assert.strictEqual(s.health.weight, '93.6');
    assert.strictEqual(C.history(s, NOW).length, 2);
    const u = state({ health: { heightCm: 180 } });
    C.weighIn(u, { kg: 55 }, NOW - DAY); C.weighIn(u, { kg: 57.2 }, NOW);
    assert.strictEqual(C.progress(u, NOW).goal, 'up');
    assert.strictEqual(C.progress(u, NOW).level, 3, 'underweight: gaining is progress');
    const k = state({ health: { heightCm: 180 } });
    for (let i = 0; i < 8; i++) C.weighIn(k, { kg: 75 + (i % 2) * 0.4 }, NOW - (8 - i) * DAY);
    assert.strictEqual(C.progress(k, NOW).goal, 'steady');
    assert.strictEqual(C.progress(k, NOW).level, 3, 'in the band: every 4 weigh-ins');
});

test('history ignores junk and the legacy profile weight log still counts', () => {
    const s = state({ health: { body: { weights: [{ ts: NOW - DAY, kg: 88, source: 'profile-save' }, { ts: NOW, kg: 'x' }, { ts: NOW + 9 * DAY, kg: 80 }, null] } } });
    assert.deepStrictEqual(C.history(s, NOW).map(w => w.kg), [88]);
});

test('three languages with the same keys', () => {
    global.window = global; global.document = { addEventListener() {}, documentElement: {} }; global.addEventListener = () => {};
    global.LowiBodyStatsCore = C;
    delete require.cache[require.resolve('../body-stats.js')];
    require('../body-stats.js');
    const T = global.LowiBodyStats._t, keys = Object.keys(T.en).sort();
    for (const l of ['de', 'es']) assert.deepStrictEqual(Object.keys(T[l]).sort(), keys, l);
    for (const l of ['en', 'de', 'es']) for (const k of keys) assert.ok(String(T[l][k]).trim(), l + '.' + k);
    assert.match(T.en.fatNote, /Not a measurement/);
    delete global.LowiBodyStats; delete global.LowiBodyStatsCore;
});

test('wiring: Settings row, tutorial step, includes in order, offline cache, Day card gives way', () => {
    const SS = require('../home-settings-sleep-v2.js');
    const rows = [].concat(...SS.pageGroups({ has: () => true }).map(g => g.ids));
    assert.ok(rows.includes('body'), 'Settings lists Weight & BMI');
    assert.strictEqual(SS.rowAction('body'), 'go', 'Settings closes, the sheet opens in front');
    const hs = read('home-settings-sleep-v2.js');
    assert.match(hs, /body: 'Weight & BMI'/); assert.match(hs, /body: 'Gewicht & BMI'/); assert.match(hs, /body: 'Peso e IMC'/);
    const TS = require('../tutorial-steps.js');
    assert.strictEqual(TS.covered().body, 'body');
    const html = read('index.html'), core = html.indexOf('body-stats-core.js?v='), ui = html.indexOf('body-stats.js?v=');
    assert.ok(core > 0 && ui > core && html.indexOf('body-stats.css?v=') > 0, 'core before UI');
    assert.ok(ui < html.indexOf('home-settings-sleep-v2.js') || /LowiBodyStats/.test(hs), 'route checks at tap time');
    const sw = read('sw.js');
    for (const f of ['body-stats.css', 'body-stats-core.js', 'body-stats.js']) assert.ok(sw.includes('"' + f + '"'), f + ' cached');
    assert.ok(read('daily-ritual.js').includes("'#bsOv'"), 'Day card waits while the sheet is open');
    const js = read('body-stats.js');
    assert.match(js, /aria-modal', 'true'/, 'tutorial hides while the sheet is open');
    assert.match(js, /lowi:body-weighin/);
    assert.match(js, /cardHTML/);
});

test('a sex pick or height edit redraw keeps the typed weight AND height (probe found height wiped)', () => {
    const js = read('body-stats.js');
    assert.match(js, /\['#bsKg', '#bsCm'\]\.forEach/);
});

test('Weight & BMI shows as a section in the Stats sheet (LowiStatsPlugins, COORD-stats.md)', () => {
    global.window = global; global.document = { addEventListener() {}, documentElement: {} }; global.addEventListener = () => {};
    global.LowiBodyStatsCore = C; global.LowiStatsPlugins = [];
    delete require.cache[require.resolve('../body-stats.js')];
    require('../body-stats.js');
    const p = global.LowiStatsPlugins.find(x => x.id === 'body');
    assert.ok(p && p.order > 10, 'below nutrition');
    assert.match(p.render(0), /data-body-open/);
    delete global.LowiBodyStats; delete global.LowiBodyStatsCore; delete global.LowiStatsPlugins;
});
