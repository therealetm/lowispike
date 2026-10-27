/* Oct 27, 2026: "Du & [companion]" stats. Emmanuel: "be even better than Yazio ... show the stats of the person also in an
   easy place next to the companion stats ... motivating while tracking them ... linked together in some way." */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const C = require('../you-stats-core.js');

global.window = global.window || global;
const mem = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear(), key: i => [...m.keys()][i], get length() { return m.size; } }; };
global.localStorage = global.localStorage || mem();

test('"So gibst du [name] Energie" reads the live energy meter and uses its own formula', () => {
    const SUN = require('../sun-meter.js');
    assert.ok(SUN && SUN.ENERGY && typeof SUN.energy === 'function', 'the meter exposes ENERGY and energy()');
    const now = new Date(2026, 9, 27, 13, 0).getTime();
    const logs = [{ ts: now - 3 * 3600e3, r: 'ja', t: 'Salad' }, { ts: now - 3600e3, r: 'nein', t: 'Pizza' }];
    const en = SUN.energy({ now, logs, ledger: [], water: 2, boost: 0, moveGoal: 1, rest: false });
    const lk = C.link(en, SUN.ENERGY);
    assert.ok(lk, 'the stats sheet can read the companion\'s energy');
    assert.deepStrictEqual(lk.rows.map(r => r.k), ['food', 'water', 'move']);
    assert.deepStrictEqual(lk.rows.map(r => r.max), [34, 26, 26], 'what each part can give at most (85% split 40/30/30 above the 15% base)');
    for (const r of lk.rows) assert.ok(r.pct >= 0 && r.pct <= r.max, r.k + ' within its max');
    assert.strictEqual(lk.rows[1].glasses, 2);
    assert.strictEqual(lk.rows[0].meals, 2);
    const sum = lk.base + lk.rows.reduce((a, r) => a + r.pct, 0);
    assert.ok(Math.abs(sum - Math.round(en.real * 100)) <= 2, 'base + parts = the real energy (' + sum + ' vs ' + Math.round(en.real * 100) + ')');
    assert.strictEqual(C.link(null, SUN.ENERGY), null, 'no meter: the block hides instead of guessing');
});

test('you: calories and protein against goals, net carbs, streak, likely spike count, and what a meal moved', () => {
    const now = new Date(2026, 9, 27, 13, 0).getTime(), D = 864e5;
    const logs = [{ ts: now - 3600e3, r: 'nein' }, { ts: now - 2 * 3600e3, r: 'ja' }, { ts: now - D }, { ts: now - 2 * D }];
    const rows = [{ k: 'kcal', value: 1140, target: 2000 }, { k: 'protein', value: 52, target: 90 }, { k: 'carbs', value: 130, target: 220 }, { k: 'fiber', value: 18, target: 30 }];
    const y = C.you({ rows, logs, now, sum: { water: 4, moveMin: 20 } });
    assert.deepStrictEqual([y.kcal.v, y.kcal.goal, y.protein.v, y.net], [1140, 2000, 52, 112]);
    assert.strictEqual(y.streak, 3);
    assert.deepStrictEqual([y.meals, y.calm, y.spiky], [2, 1, 1]);
    const before = C.snap(C.you({ rows: [{ k: 'kcal', value: 600, target: 2000 }], logs: [], now }), { energy: 40 });
    const m = C.moved(before, y, { energy: 52 });
    assert.deepStrictEqual([m.kcal.from, m.kcal.to, m.kcal.d, m.energy.d], [600, 1140, 540, 12]);
    const empty = C.you({});
    assert.strictEqual(empty.kcal, null, 'no goals yet: nothing invented');
    assert.strictEqual(empty.streak, 0);
});

test('the stats sheet opens as "Du & [name]" with you and your companion side by side', () => {
    const Y = read('you-stats.js');
    assert.match(Y, /push\(\{ id: 'you', order: 1, render: sheetHTML \}\)/, 'first section of the existing stats sheet');
    assert.match(Y, /LowiSun/, 'reads the companion\'s energy from the live meter');
    assert.doesNotMatch(Y, /'Misty'|"Misty"|>Misty</, 'never a hard-coded companion name');
    assert.doesNotMatch(Y + read('you-stats-core.js'), /insulin/i);
});

test('linked from the companion hold menu, the quiet stats line, and after saving a meal', () => {
    const hub = read('misty-hub.js');
    assert.match(hub, /LowiYouStats|data-hub="you"|you-row|ys-/, 'the hold menu has the Du row');
    const sp = read('spirit.js');
    assert.match(sp, /LowiYouStats/, 'Log meal shows progress and links the stats');
    const idx = read('index.html');
    assert.match(idx, /you-stats-core\.js/);
    assert.match(idx, /you-stats\.js/);
    const sw = read('sw.js');
    assert.match(sw, /you-stats\.js/, 'cached for offline');
});
