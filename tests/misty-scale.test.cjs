/* Misty's energy scale and her way back (Oct 17, 2026). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const S = require('../sun-meter.js');
global.LowiWorldHealth = require('../world-health-core.js');
const M = require('../world-mood-core.js');
const X = require('../misty-scale.js');
const pad = n => String(n).padStart(2, '0');
const NOW = new Date(2026, 9, 17, 12, 0, 0).getTime();
const KEY = '2026-10-17';
const deps = () => ({ energy: S.energy, ENERGY: S.ENERGY, mood: M, wh: global.LowiWorldHealth, state: {} });
const pudding = { day: KEY, ts: NOW - 7200e3, t: 'Pudding', r: 'nein', eventId: 'meal:p1' };

test('the scale uses the one energy formula: same value and tier as LowiSun.energy()', () => {
    const inp = { now: NOW, logs: [pudding], ledger: [], water: 1 };
    const p = X.plan(inp, deps()), en = S.energy(inp);
    assert.strictEqual(p.value, en.value);
    assert.strictEqual(p.tier, en.tier);
    assert.strictEqual(p.tier, 'weak');
    const src = fs.readFileSync(path.join(root, 'misty-scale.js'), 'utf8');
    assert.ok(!/0\.15\s*\+|ENERGY\.food\s*\*/.test(src), 'no second energy formula in misty-scale.js');
});

test('the way back is true: applying the suggested steps really reaches the promised level', () => {
    const cases = [
        { now: NOW, logs: [pudding], ledger: [], water: 0 },
        { now: NOW, logs: [], ledger: [], water: 0 },
        { now: NOW, logs: [pudding, { day: KEY, ts: NOW - 3600e3, t: 'Donut', r: 'nein', eventId: 'meal:d1' }], ledger: [], water: 2 },
        { now: NOW, logs: [{ day: KEY, ts: NOW - 3600e3, t: 'Salad', r: 'ja', lvl: 'low', eventId: 'meal:s1' }], ledger: [], water: 1 }
    ];
    for (const inp of cases) {
        const p = X.plan(inp, deps());
        assert.ok(p.next, 'has a next level');
        assert.ok(p.steps.length >= 1 && p.steps.length <= 3, '1 to 3 steps');
        const add = {}; p.steps.forEach(s => { add[s.k] = s.n; });
        const after = S.energy(X.withAdds(inp, add));
        assert.ok(Math.abs(after.value - p.reach) < 1e-9, 'promised value = real value');
        if (p.reached) assert.ok(after.value >= p.target - 1e-9, 'reaches the target tier');
        const sum = p.steps.reduce((a, s) => a + s.gain, 0);
        assert.ok(Math.abs(p.value + sum - p.reach) < 1e-9, 'step gains add up');
    }
});

test('fair rules: no plan leans on more than 4 glasses, a second Move, or twin meals', () => {
    const inp = { now: NOW, logs: [pudding], ledger: [{ day: KEY, ts: NOW - 1800e3, amt: 5, src: 'move:walk', label: 'Move' }], water: 4 };
    const p = X.plan(inp, deps());
    assert.ok(!p.steps.some(s => s.k === 'water'), 'water already at 4: more glasses add nothing, so none are suggested');
    assert.ok(!p.steps.some(s => s.k === 'move'), 'a second Move adds no energy, so none is suggested');
    const m = p.steps.find(s => s.k === 'meal');
    assert.ok(!m || m.n <= X.MAX.meal);
    /* the same meal twice counts once (LowiWorldHealth.fairDay) */
    const twin = S.energy({ now: NOW, logs: [pudding, Object.assign({}, pudding, { ts: NOW - 7000e3, eventId: 'meal:p2' })], ledger: [], water: 0 });
    assert.strictEqual(twin.value, S.energy({ now: NOW, logs: [pudding], ledger: [], water: 0 }).value);
});

test('the weather line comes from the real fast, fair weather (build 232510)', () => {
    const inp = { now: NOW, logs: [pudding], ledger: [], water: 0 };
    const p = X.plan(inp, deps());
    const add = {}; p.steps.forEach(s => { add[s.k] = s.n; });
    const x = X.withAdds(inp, add);
    const real = M.read({ logs: x.logs, ledger: x.ledger }, x.now, global.LowiWorldHealth);
    assert.ok(p.wx);
    assert.strictEqual(p.wx.to, real.level);
    assert.ok(p.wx.to < p.wx.from, 'her way back calms the storm');
});

test('full energy: no steps, top line; tiers follow LowiSun.ENERGY thresholds', () => {
    const logs = [{ day: KEY, ts: NOW - 3600e3, t: 'Salad', r: 'ja', lvl: 'low', eventId: 'meal:s1' }];
    const ledger = [{ day: KEY, ts: NOW - 1800e3, amt: 5, src: 'move:walk', label: 'Move' }];
    const p = X.plan({ now: NOW, logs, ledger, water: 4 }, deps());
    assert.strictEqual(p.full, true);
    assert.strictEqual(p.steps.length, 0);
    const h = X.cardHTML(p, null, { lang: 'en', name: 'Misty', E: S.ENERGY });
    assert.ok(h.includes('at the top'));
    assert.strictEqual(X.tierOf(0.39, 1, S.ENERGY), 'weak');
    assert.strictEqual(X.tierOf(0.39, 0, S.ENERGY), 'tired');
    assert.strictEqual(X.tierOf(0.4, 0, S.ENERGY), 'ok');
    assert.strictEqual(X.tierOf(0.75, 0, S.ENERGY), 'thriving');
});

test('hunt power-ups (window.LowiMistyPower) count in the one formula, capped, and show on the scale', () => {
    const inp = { now: NOW, logs: [pudding], ledger: [], water: 0 };
    const base = S.energy(inp).value;
    assert.ok(Math.abs(S.energy(Object.assign({}, inp, { boost: 0.1 })).value - (base + 0.1)) < 1e-9);
    assert.ok(Math.abs(S.energy(Object.assign({}, inp, { boost: 5 })).value - (base + S.ENERGY.boostMax)) < 1e-9, 'boost capped');
    assert.strictEqual(X.power({}), null);
    assert.strictEqual(X.power({ LowiMistyPower: { read() { throw new Error('x'); } } }), null);
    const pw = X.power({ LowiMistyPower: { read: () => ({ level: 2, xp: 30, next: 100, boost: 0.9, label: 'Glow shield' }) } });
    assert.deepStrictEqual(pw, { level: 2, xp: 30, next: 100, boost: 0.2, label: 'Glow shield' });
    const p = X.plan(Object.assign({}, inp, { boost: pw.boost }), deps());
    const h = X.cardHTML(p, pw, { lang: 'en', name: 'Misty', E: S.ENERGY });
    assert.ok(h.includes('Hunt power') && h.includes('30/100') && h.includes('ms-boost'));
});

test('kind copy in EN/DE/ES: every line filled, no banned words, no health claims', () => {
    const BAN = /\b(bad|failed?|failure|lazy|shame|guilt|fault|punish\w*|disease|diabet\w*|insulin|glucose|blood|sick|ill|cure|diagnos\w*|medical|medicine|doctor|calorie\w*|weight|fat|obes\w*|kill|die|dead|dying|poison\w*|toxic|danger\w*|harm\w*|unhealthy|healthy|health)\b|krank|zucker|blut|schuld|faul|gift|enferm|az[uú]car|sangre|culpa|t[oó]xic/i;
    for (const k in X.STR) {
        assert.strictEqual(X.STR[k].length, 3, k + ' has EN/DE/ES');
        X.STR[k].forEach(s => { assert.ok(s && s.length, k); assert.ok(!BAN.test(s), k + ': ' + s); });
    }
});

test('design + speed: no new buttons, no timers or frame loops, loaded and cached', () => {
    const src = fs.readFileSync(path.join(root, 'misty-scale.js'), 'utf8');
    assert.ok(!/requestAnimationFrame|setInterval/.test(src), 'no per-frame loop or polling');
    assert.ok(!/createElement\(['"]button/.test(src) && !/<button/.test(src), 'no new buttons');
    const css = fs.readFileSync(path.join(root, 'misty-scale.css'), 'utf8');
    assert.ok(!/\.ms-ring/.test(css) && !/ms-ring/.test(src), 'no ring drawn over Misty\'s 3D glass (removed Oct 18, tests/today-bubbles-no-legacy.test.cjs)');
    assert.ok(/#spBubble \.sp-bubble-name::after \{ content: var\(--ms-tag/.test(css), 'her % stays on the name tag');
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    assert.ok(html.includes('misty-scale.js?v=') && html.includes('misty-scale.css?v='));
    const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
    assert.ok(sw.includes('"misty-scale.js"') && sw.includes('"misty-scale.css"'));
    const hub = fs.readFileSync(path.join(root, 'misty-hub.js'), 'utf8');
    assert.ok(/scaleHtml\(\)/.test(hub), 'scale sits in Misty\'s card');
});
