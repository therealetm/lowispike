// Oct 16 (E-man): fast, fair world weather. Recovery and relapse are both quick and proportional; the 4-day trend only sets
// where the day starts; duplicates, rapid-fire taps and log/undo loops add nothing. Game world, never a health verdict.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const WH = require('../world-health-core.js'), M = require('../world-mood-core.js'), SUN = require('../sun-meter.js');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const NOW = new Date(2026, 9, 16, 19, 0).getTime(), DAY = WH.dayKey(NOW), MIN = 60e3;
let n = 0;
const at = h => new Date(2026, 9, 16, h, 0).getTime() + (++n) * 1000;
const meal = (r, h, extra) => Object.assign({ day: DAY, ts: at(h), r, t: 'meal ' + (++n), eventId: 'meal:' + n }, extra || {});
const water = (ts) => ({ day: DAY, ts, src: 'water', label: 'Water logged', amt: 2, eventId: 'herb-care:' + DAY + ':water:' + ts });
const move = (ts) => ({ day: DAY, ts, src: 'move:walk', label: 'Move session', amt: 10, eventId: 'move:' + ts });
const macro = (ts, k) => ({ day: DAY, ts, src: 'macro-goal', label: k, amt: 20, eventId: 'macro-goal:' + DAY + ':' + k });
const lv = st => M.read(st, NOW, WH).level;

test('fast relapse: one spiky meal turns the world stormy at once, a second one more, also after a good morning', () => {
    const one = M.read({ logs: [meal('nein', 12)], ledger: [] }, NOW, WH);
    assert.strictEqual(one.tier, 'stormy'); assert.ok(one.level >= 0.4, String(one.level));
    assert.ok(lv({ logs: [meal('nein', 12), meal('nein', 13)], ledger: [] }) > one.level + 0.3, 'a second spike pushes further');
    const morning = { logs: [meal('ja', 8), meal('ja', 9)], ledger: [water(at(8)), water(at(9)), move(at(10))] };
    assert.strictEqual(lv(morning), 0, 'a good morning is clear');
    const relapse = M.read({ logs: morning.logs.concat(meal('nein', 18)), ledger: morning.ledger }, NOW, WH);
    assert.strictEqual(relapse.tier, 'stormy', 'good logs leave a small cushion, never a free pass');
    assert.ok(relapse.level >= 0.25 && relapse.level < one.level, String(relapse.level));
});

test('fast recovery in proportion: every positive log calms it right away, one glass of water never clears a day of spikes', () => {
    const spikes = [meal('nein', 8), meal('nein', 12), meal('nein', 13)];
    const day = lv({ logs: spikes, ledger: [] });
    assert.strictEqual(day, 1);
    const w1 = lv({ logs: spikes, ledger: [water(at(14))] });
    assert.ok(w1 < day && w1 >= 0.9, 'one glass lifts it a little, not away: ' + w1);
    const mv = lv({ logs: spikes, ledger: [move(at(14))] });
    assert.ok(mv < w1 && mv >= 0.6, 'a Move calms more than a glass of water: ' + mv);
    const good = lv({ logs: spikes.concat(meal('ja', 15)), ledger: [] });
    assert.ok(good < day && good > 0.7, 'a low-spike meal calms it in proportion: ' + good);
    // the order of a whole good evening after a spiky lunch: it steps down, never flips like a switch
    const one = [meal('nein', 12)], steps = [];
    const led = [];
    for (let i = 0; i < 4; i++) { led.push(water(at(14) + i * 30 * MIN)); steps.push(lv({ logs: one, ledger: led.slice() })); }
    for (let i = 1; i < steps.length; i++) assert.ok(steps[i] < steps[i - 1], 'each glass shows: ' + steps.join(' > '));
    assert.ok(steps[3] > 0.15, 'four glasses alone do not wipe out a spiky meal: ' + steps[3]);
    assert.strictEqual(lv({ logs: one.concat(meal('ja', 18)), ledger: led.concat(move(at(17))) }), 0, 'water, a Move and a good meal bring order back the same day');
});

test('the look scales with the level: no on/off switch', () => {
    let prev = M.look(0);
    for (let x = 0.05; x <= 1.001; x += 0.05) {
        const l = M.look(x), sat = f => +f.match(/saturate\(([\d.]+)\)/)[1];
        assert.ok(l.veil > prev.veil, 'veil grows at ' + x.toFixed(2));
        assert.ok(sat(l.filter) < sat(prev.filter === 'saturate(1.08) brightness(1.04)' ? 'saturate(1.081)' : prev.filter), 'colour fades at ' + x.toFixed(2));
        assert.ok(l.veil - prev.veil < 0.12, 'small steps make small changes');
        prev = l;
    }
});

test('anti-cheat: caps per kind per day, duplicates, twins, rapid-fire taps and log/undo loops add nothing', () => {
    const spikes = [meal('nein', 8), meal('nein', 12), meal('nein', 13)];
    // caps: 20 glasses calm as much as 4, 5 Moves as much as the cap, 6 good meals as much as the cap
    const g = k => Array.from({ length: k }, (_, i) => water(at(14) + i * 10 * MIN));
    assert.strictEqual(lv({ logs: spikes, ledger: g(20) }), lv({ logs: spikes, ledger: g(4) }), 'water caps at 4 glasses of calm');
    assert.ok(1 - lv({ logs: spikes, ledger: g(20) }) <= M.CAP.water + 1e-9);
    const mv = k => Array.from({ length: k }, (_, i) => move(at(14) + i * 20 * MIN));
    assert.strictEqual(lv({ logs: spikes, ledger: mv(5) }), lv({ logs: spikes, ledger: mv(2) }), 'Move caps after two');
    const goods = k => Array.from({ length: k }, () => meal('ja', 15));
    assert.strictEqual(lv({ logs: spikes.concat(goods(6)), ledger: [] }), lv({ logs: spikes.concat(goods(3)), ledger: [] }), 'good meals cap');
    assert.ok(lv({ logs: spikes.concat(goods(6)), ledger: [macro(at(16), 'protein'), macro(at(16) + MIN, 'fiber'), macro(at(16) + 2 * MIN, 'carbs')] }) > 0, 'the caps together cannot be farmed into a free day');
    // rapid-fire: 10 water taps within a few seconds count once
    const t = at(14), burst = Array.from({ length: 10 }, (_, i) => water(t + i * 500));
    assert.strictEqual(lv({ logs: spikes, ledger: burst }), lv({ logs: spikes, ledger: [water(t)] }), 'rapid taps = one glass');
    // duplicates: the same eventId twice, and the same meal name logged again (twin), count once
    const sp = meal('nein', 12), dupId = Object.assign({}, sp), twin = Object.assign({}, sp, { eventId: 'meal:other', id: 'other', ts: sp.ts + 3600e3 });
    assert.strictEqual(lv({ logs: [sp, dupId, twin], ledger: [] }), lv({ logs: [sp], ledger: [] }));
    const gm = meal('ja', 14), gmTwin = Object.assign({}, gm, { eventId: 'meal:again', id: 'again' }), gmCase = Object.assign({}, gm, { eventId: 'meal:x2', t: gm.t.toUpperCase() + '!' });
    assert.strictEqual(lv({ logs: [sp, gm, gmTwin, gmCase], ledger: [] }), lv({ logs: [sp, gm], ledger: [] }), 'a good meal twin adds no extra calm');
    const bc = meal('nein', 12, { via: 'barcode', code: '4001', eventId: 'meal:bc:4001:1' }), bc2 = meal('nein', 13, { via: 'barcode', code: '4001', eventId: 'meal:bc:4001:2' });
    assert.strictEqual(M.read({ logs: [bc, bc2], ledger: [] }, NOW, WH).products, 1, 'the same product scanned twice counts once');
    // log / undo / log again: the reading comes only from what is saved, so the loop ends where one honest log ends
    const base = { logs: [sp], ledger: [] }, logged = { logs: [sp, gm], ledger: [] };
    const loop = [base, logged, base, logged, base, logged].map(lv);
    assert.deepStrictEqual(loop, [lv(base), lv(logged), lv(base), lv(logged), lv(base), lv(logged)]);
    assert.strictEqual(loop[5], lv(logged), 'no extra recovery from the loop');
});

test('the shared fair rule also guards the inside (4-day score) and Misty\'s energy', () => {
    const fair = WH.fairDay({ logs: [meal('ja', 9), meal('ja', 9)], ledger: [water(at(10)), water(at(10) + 1000), water(at(10) + 2000)] }, DAY);
    assert.deepStrictEqual([fair.logs.length, fair.ledger.length], [2, 1]);
    const sp = meal('nein', 12), gm = meal('ja', 13), dup = k => Array.from({ length: k }, (_, i) => Object.assign({}, gm, { eventId: 'meal:d' + i, id: 'd' + i }));
    const honest = SUN.energy({ now: NOW, logs: [sp, gm] }), farmed = SUN.energy({ now: NOW, logs: [sp, gm].concat(dup(6)) });
    assert.strictEqual(farmed.value, honest.value, 'logging the same salad 6 more times does not lift Misty');
    assert.strictEqual(farmed.meals, 2);
    const p1 = WH.dayParts({ logs: [sp, gm], ledger: [] }, DAY), p2 = WH.dayParts({ logs: [sp, gm].concat(dup(6)), ledger: [] }, DAY);
    assert.strictEqual(p2.total, p1.total, 'the 4-day inside score is not farmed either');
    const taps = Array.from({ length: 8 }, (_, i) => water(at(11) + i * 300));
    assert.strictEqual(SUN.energy({ now: NOW, ledger: taps }).water, 1, 'rapid water taps = one glass for Misty');
    assert.strictEqual(SUN.energy({ now: NOW, ledger: taps, water: 8 }).water, 1, 'also when the glass counter was tapped 8 times in a row');
    const spread = Array.from({ length: 8 }, (_, i) => water(at(8) + i * 40 * MIN));
    assert.strictEqual(SUN.energy({ now: NOW, ledger: spread, water: 10 }).water, 10, 'real glasses past the water XP limit still count');
});

test('the 4-day trend only sets where the day starts, gently', () => {
    const dk = i => { const d = new Date(NOW); d.setHours(12); d.setDate(d.getDate() - i); return WH.dayKey(d.getTime()); };
    const old = (i, r) => ({ day: dk(i), ts: NOW - i * 864e5, r, t: 'old ' + i + r + Math.random() });
    const hazy = [1, 2, 3].flatMap(i => [old(i, 'nein'), old(i, 'nein')]), bright = [1, 2, 3].flatMap(i => [old(i, 'ja'), old(i, 'ja')]);
    const quietHazy = M.read({ logs: hazy, ledger: [] }, NOW, WH);
    assert.strictEqual(quietHazy.tier, 'clear', 'old days alone never make a storm');
    assert.ok(quietHazy.level > 0 && quietHazy.level <= M.TREND.haze, 'only a faint haze: ' + quietHazy.level);
    const today = meal('nein', 12);
    const a = lv({ logs: hazy.concat(today), ledger: [] }), b = lv({ logs: [today], ledger: [] }), c = lv({ logs: bright.concat(today), ledger: [] });
    assert.ok(a > b && b > c, 'hazy days start a bit stormier, a bright streak gives a small cushion: ' + [a, b, c].join(' / '));
    assert.ok(a - c <= 0.26, 'gently');
    assert.ok(c >= 0.3, 'a bright streak still shows today\'s spike');
});

test('copy stays a kind game-world line, wired for fast reactions without a new frame loop', () => {
    const all = JSON.stringify(M.STR).toLowerCase();
    for (const w of ['unhealthy', 'ungesund', 'sick', 'krank', 'disease', 'diagnos', 'insulin resist', 'diabet', 'bad', 'schlecht', 'fail', 'shame', 'cheat'])
        assert.ok(!all.includes(w), w);
    for (const k of ['trend', 'clearing']) assert.strictEqual(M.STR[k].length, 3, k);
    const spike = meal('nein', 12);
    assert.strictEqual(M.line(M.read({ logs: [spike], ledger: [water(at(14))] }, NOW, WH), 'en'), 'Stormy world \u00b7 spiky food logged today \u00b7 it is clearing up');
    assert.strictEqual(M.line(M.read({ logs: [spike], ledger: [move(at(14))] }, NOW, WH), 'de'), 'St\u00fcrmische Welt \u00b7 heute Spike-Essen eingetragen \u00b7 deine Bewegung beruhigt sie');
    const js = read('world-mood.js'), ins = read('inside-row.js'), core = read('world-mood-core.js');
    assert.ok(js.includes("'lowi:meal-logged', 'lowi:reward', 'lowi:care'"), 'reacts the moment something is logged');
    for (const src of [js, core]) assert.ok(!/requestAnimationFrame|onFrame\(/.test(src), 'no new per-frame loop');
    assert.ok(ins.includes('LowiWorldMood') && ins.includes("addEventListener('lowi:world-mood'"), 'the inside fog follows today\'s weather fast');
    assert.strictEqual((ins.match(/onFrame\(/g) || []).length, 1, 'still the one existing world hook');
    assert.ok(!/award\(|addXp|save\(\)/.test(js + core), 'reads only, never pays XP');
});
