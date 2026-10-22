'use strict';
/* Oct 22 2026, account UI step 1 (Emmanuel: "It's way too difficult to change your personal data ... I'm looking for where to
   update my weight and I can't find it."). Pins: weight is editable in at most two taps from the profile overview (one from the
   header weight, two via the Your details tile), every piece of personal data has a row and every row opens the editor that owns
   it, About you / Health / Account panels stay reachable, the hero and tile wiring, three languages, includes and offline cache. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SRC = read('your-details.js'), HTML = read('index.html');

/* a tiny DOM, enough for the module's wiring */
function boot(state, extra) {
    const calls = [], listeners = {};
    const el = () => ({ style: {}, classList: { add() { }, remove() { }, contains: () => false }, setAttribute() { }, getAttribute: () => null, appendChild() { }, remove() { },
        addEventListener() { }, querySelector: () => el(), click() { calls.push(['click', this.attrs]); }, focus() { }, attrs: {} });
    const D = { readyState: 'complete', activeElement: null, body: { appendChild(x) { if (x.attrs) calls.push(['fake', Object.assign({}, x.attrs)]); } },
        documentElement: { lang: 'en', classList: { add() { }, remove() { }, contains: () => false }, getAttribute: () => null },
        addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); }, querySelector: () => null,
        createElement: () => { const e = el(); e.setAttribute = (k, v) => { e.attrs[k] = v; }; e.click = () => calls.push(['fake', Object.assign({}, e.attrs)]); return e; } };
    const W = { document: D, MutationObserver: function () { this.observe = () => { }; }, setTimeout: f => f(), setInterval: () => 1, clearInterval() { },
        LowiR2: { S: () => state, email: () => (extra && extra.email) || '' },
        LowiTags: { goals: [['Energy', 'More energy'], ['Weight', 'Lose weight']], conds: [['PCOS', 'PCOS']], isCond: k => k === 'PCOS' },
        LowiFood: { meP: () => ({ t: 'INTJ' }) },
        LowiWeightJourney: { open: o => { calls.push(['wj', o || null]); return true; }, core: { journey: () => ({ unit: (extra && extra.unit) || 'kg' }) } },
        LowiBodyStats: { open: () => calls.push(['bs']) },
        LowiG2E: { open: k => calls.push(['g2e', k]) },
        LowiHost: { tab: () => 'profile' } };
    W.window = W;
    vm.runInNewContext(SRC, Object.assign(W, { Date, Math, String, Number, Object, Array, JSON, parseFloat, isNaN, setTimeout: W.setTimeout, setInterval: W.setInterval, clearInterval: W.clearInterval }));
    return { Y: W.LowiYourDetails, calls, listeners, W };
}
const J = x => JSON.parse(JSON.stringify(x));
const ME = () => ({ user: { name: 'Emmanuel', bday: '1994-03-10', tags: ['Energy', 'PCOS'], gender: 'm', avatar: 'data:image/png;base64,x' }, health: { weight: '107.6', heightCm: 182 } });

test('weight: one tap from the header weight, two from the Your details tile, and it opens Add weight with the value in', () => {
    /* tap 1 (header): the "107 kg" chip is a [data-yd=weight] button */
    assert.match(HTML, /class="yd-chip yd-w" data-yd="weight"/, 'the header weight is a button');
    const { calls, listeners } = boot(ME());
    const click = attrs => listeners.click.forEach(f => f({ target: { closest: s => s === '[data-yd]' && attrs['data-yd'] ? { getAttribute: k => attrs[k] } : null }, preventDefault() { }, stopPropagation() { } }));
    click({ 'data-yd': 'weight' });
    assert.deepStrictEqual(J(calls.pop()), ['wj', { add: true }], 'one tap: Weight journey on Add weight');
    /* tap 1 (tile) + tap 2 (row) */
    assert.match(HTML, /k === "details" \? 'data-yd="open"'/, 'the Your details tile opens the screen');
    const r = boot(ME());
    const body = r.Y.rows().find(g => g[0] === 'body')[1];
    assert.strictEqual(body[0].id, 'weight', 'weight is the first row');
    assert.strictEqual(body[0].val, '107.6 kg');
    r.Y.go('weight');
    assert.deepStrictEqual(J(r.calls.pop()), ['wj', { add: true }], 'second tap: Add weight');
    /* the merged sheet: Add weight is the one weight field of Weight & BMI, filled with today's value and focused */
    assert.match(read('weight-journey.js'), /opts && opts\.add \? \{ weigh: true \}/);
    assert.match(read('body-stats.js'), /opts\.weigh\) \{ const k = ov\.querySelector\('#bsKg'\)/);
});

test('every piece of personal data has one row, grouped Body / About you / Goals / Health / Account, each opening its owner', () => {
    const { Y, calls } = boot(ME(), { email: 'e@x.de' });
    const g = Y.rows();
    assert.deepStrictEqual(J(g.map(x => x[0])), ['body', 'about', 'goals', 'health', 'account']);
    const ids = g.flatMap(x => x[1].map(r => r.id));
    for (const id of ['weight', 'height', 'bmi', 'journey', 'photo', 'name', 'bday', 'mbti', 'gender', 'goals', 'conds', 'bp', 'private', 'email', 'password', 'order'])
        assert.ok(ids.includes(id), 'row ' + id);
    assert.strictEqual(new Set(ids).size, ids.length, 'no duplicate rows');
    const val = id => g.flatMap(x => x[1]).find(r => r.id === id).val;
    assert.strictEqual(val('height'), '182 cm');
    assert.strictEqual(val('bmi'), '32.5');
    assert.strictEqual(val('mbti'), 'INTJ');
    assert.strictEqual(val('goals'), 'More energy', 'goals without conditions');
    assert.strictEqual(val('conds'), 'PCOS');
    assert.strictEqual(val('email'), 'e@x.de');
    assert.match(val('bday'), /1994 · \d+ years/);
    const expect = { weight: ['wj', { add: true }], journey: ['wj', null], height: ['bs'], bmi: ['bs'], photo: ['fake', { type: 'button', 'data-r2p': 'photo' }],
        name: ['fake', { type: 'button', 'data-r2p': 'edit' }], bday: ['fake', { type: 'button', 'data-r2p': 'edit' }], goals: ['fake', { type: 'button', 'data-r2p': 'edit' }],
        conds: ['fake', { type: 'button', 'data-r2p': 'edit' }], mbti: ['fake', { type: 'button', 'data-r5': 'mbti-pick' }], gender: ['g2e', 'about'], bp: ['g2e', 'about'],
        order: ['g2e', 'about'], private: ['g2e', 'health'], email: ['g2e', 'acct'], password: ['g2e', 'acct'] };
    for (const id of ids) { calls.length = 0; Y.go(id); assert.ok(calls.length, id + ' does something');
        const c = calls.find(x => x[0] === expect[id][0]); assert.ok(c, id + ' -> ' + JSON.stringify(calls)); if (expect[id][0] === 'fake') { assert.strictEqual(c[1]['data-r2p'], expect[id][1]['data-r2p']); assert.strictEqual(c[1]['data-r5'], expect[id][1]['data-r5']); } else assert.deepStrictEqual(J(c), expect[id], id); }
    /* the owners exist where the rows send you */
    assert.match(HTML, /if \(v === "edit"\) \{ R2\.sheet\(editHTML\(\)\)/);
    assert.match(HTML, /if \(v === "photo"\) return pickPhoto/);
    assert.match(HTML, /case "mbti-pick": mbtiSheet\(\)/);
    assert.doesNotMatch(HTML, /data-r5="mbti"><span|"data-r5", "mbti"\)/, 'no opener uses data-r5=mbti without data-v (that clears the type)');
    for (const k of ['about', 'health', 'acct']) assert.match(HTML, new RegExp('const ORDER = \\[[^\\]]*"' + k + '"'), 'panel ' + k + ' still opens');
});

test('empty profile: rows say Add, no account hides Password, pounds follow the journey unit', () => {
    const { Y } = boot({ user: {}, health: {} });
    const all = Y.rows().flatMap(x => x[1]);
    assert.strictEqual(all.find(r => r.id === 'weight').val, '');
    assert.ok(all.find(r => r.id === 'password').hide);
    assert.match(all.find(r => r.id === 'email').val, /Not saved/);
    const lb = boot(ME(), { unit: 'lb' }).Y.rows()[0][1][0].val;
    assert.strictEqual(lb, '237.2 lb');
});

test('tiles: Your details first, About you / Health / Account folded into it, nothing else lost', () => {
    const m = HTML.match(/const GRID = (\[[^\]]*\])/); assert.ok(m);
    const grid = JSON.parse(m[1]);
    assert.strictEqual(grid[0], 'details');
    for (const k of ['app', 'todo', 'comm', 'swaps', 'glow', 'look']) assert.ok(grid.includes(k), k);
    for (const k of ['about', 'health', 'acct']) assert.ok(!grid.includes(k), k + ' lives in Your details now');
    assert.match(HTML, /data-yd="open">Your details<\/button><button class="r2-btn ghost"' \+ who\(m\) \+ '>How others see you/);
});

test('three languages, one fixed header with one Back, and loaded', () => {
    const { Y } = boot(ME());
    const T = Y._t;
    for (const l of ['de', 'es']) for (const k of Object.keys(T.en)) assert.ok(T[l][k], l + ':' + k);
    assert.strictEqual(T.de.title, 'Deine Daten'); assert.strictEqual(T.es.title, 'Tus datos');
    assert.strictEqual((SRC.match(/class="yd-back"/g) || []).length, 1, 'one Back button');
    assert.match(read('your-details.css'), /\.yd-head \{[^}]*flex: none/);
    assert.match(read('your-details.css'), /html\[data-theme="light"\] \.yd-ov/);
    assert.match(HTML, /sc\.src = 'your-details\.js' \+ q/); assert.match(HTML, /l\.href = 'your-details\.css' \+ q/);
    assert.match(HTML, /\["Your details", "Deine Daten", "Tus datos"\]/);
});
