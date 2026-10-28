/* World glow: Misty's bar to her peak (Supernova) and what is missing (Oct 22, 2026).
   E-man's iPhone at 14:45: "Misty · 100%", Fuel 3/3, Water 7/6, Move 4/4, yet a flat face, a dull world and "bright and awake"
   over a tiny "Sugar rush". The cause: energy % is the whole day, her mood and the cell world only the last 4 hours. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
global.LowiWorldHealth = require('../world-health-core.js');
const S = require('../sun-meter.js');
const C = require('../cell-world.js');
const M = require('../world-mood-core.js');
const P = require('../misty-peak.js');
const at = (h, m) => new Date(2026, 9, 22, h, m || 0).getTime();
const NOW = at(14, 45);
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

function reading(o) {
    const now = o.now || NOW, logs = o.logs || [], ledger = o.ledger || [], water = o.water != null ? o.water : 0;
    const en = S.energy({ now, logs, ledger, water, welcome: 0 });
    const cellIn = { now, logs, ledger, water, hour: new Date(now).getHours() };
    const cell = C.model(cellIn);
    const wm = M.read({ logs, ledger }, now, global.LowiWorldHealth);
    return { en, cell, wm, p: P.read({ now, cell, cellIn, model: C.model, en, wm, water, nutri: o.nutri }) };
}
const row = (p, k) => p.rows.find(r => r.k === k);
const move = (h, m) => ({ ts: at(h, m), src: 'move-walk', label: 'Move', amt: 5 });
/* the user's day: two low-spike meals, a hand-typed pudding at 14:04, four Moves in the morning, 7 glasses */
const USER = {
    logs: [{ ts: at(8, 30), t: 'Eier mit Spinat', lvl: 'low' }, { ts: at(11, 30), t: 'Lachs Salat', lvl: 'low' }, { ts: at(14, 4), t: 'Protein Pudding' }],
    ledger: [move(7), move(8), move(9), move(10)], water: 7
};

test('the user\'s state: energy full, but a sugar rush holds Misty back and World glow says so', () => {
    const { en, cell, p } = reading(USER);
    assert.strictEqual(en.tier, 'thriving', 'energy (the whole day) reads full');
    assert.ok(en.value >= 0.95);
    assert.strictEqual(cell.state, 'spiked', 'the cell (last 4 h) has the sugar rush');
    assert.strictEqual(p.peak, false);
    assert.ok(p.pct < 100 && p.pct <= 95, 'World glow never reads maxed while held back: ' + p.pct);
    assert.deepStrictEqual(p.held, ['sugar']);
    const s = row(p, 'sugar');
    assert.strictEqual(s.done, false);
    assert.strictEqual(s.act, 'move');
    assert.ok(s.left > 90 * 60000 && s.left <= 130 * 60000, 'clears in about 2 h: ' + s.left / 60000);
    assert.deepStrictEqual(P.rowText(s, 'en'), ['Sugar rush \u00b7 clears in about 2 h', 'A short Move clears it now']);
    for (const k of ['world', 'fuel', 'water', 'move']) assert.strictEqual(row(p, k).done, true, k + ' is done');
    assert.strictEqual(row(p, 'glow').done, false, 'the sugar dims the glow');
    assert.deepStrictEqual(P.rowText(row(p, 'glow'), 'en'), ['Spark dimmed by the sugar', 'It comes back as the rush clears']);
    /* the status line: no "bright and awake" during a sugar rush */
    const st = P.statusFor(p, 'Misty', 'en');
    assert.strictEqual(st.mood, 'spiked');
    assert.strictEqual(st.title, 'Misty has a sugar rush');
    assert.match(st.sub, /Fades in about 2 h/);
    assert.strictEqual(st.action, 'move');
    assert.strictEqual(P.statusFor(p, 'Misty', 'de').title, 'Misty hat eine Zuckerflut');
    assert.strictEqual(P.statusFor(p, 'Misty', 'es').title, 'Misty tiene un subid\u00f3n de az\u00facar');
    /* the energy card says why full energy is not her peak */
    assert.match(P.heldText(p, 'en'), /Her energy is full, but a sugar rush holds her back/);
    /* the sheet card */
    const h = P.cardHTML(p, { lang: 'en', name: 'Misty' });
    assert.match(h, /id="mistyPeak" data-peak="0"/);
    assert.match(h, /World glow<\/h3><b class="mp-pct num">\d+%/);
    assert.match(h, /What\u2019s missing/);
    /* 29 Oct 2026: a checklist only, no row taps anywhere (no button, no arrow) */
    assert.doesNotMatch(h, /data-mp=/);
    assert.doesNotMatch(h, /<button/);
    assert.doesNotMatch(h, /class="mp-go"/);
    assert.match(h, /<li data-k="sugar" data-done="0"><div class="mp-row">/);
    assert.ok(h.indexOf('data-k="sugar"') < h.indexOf('data-k="water"'), 'missing rows come first');
});

test('a Move now clears the sugar rush (the cell\'s own rule), and it fades by itself after about 2 h', () => {
    const now = reading(Object.assign({}, USER, { ledger: USER.ledger.concat(move(14, 44)) })).p;
    assert.strictEqual(row(now, 'sugar').done, true);
    const later = reading(Object.assign({}, USER, { now: at(16, 50) })).p;
    assert.strictEqual(row(later, 'sugar').done, true);
});

test('peak: everything done reads Supernova, 100%, with the peak status line and no missing list', () => {
    const { p } = reading({ logs: [{ ts: at(8, 30), t: 'Eier', lvl: 'low' }, { ts: at(13, 0), t: 'Lachs', lvl: 'low' }], ledger: [move(9), move(14, 30)], water: 6 });
    assert.strictEqual(p.missing, 0, p.rows.filter(r => !r.done).map(r => r.k).join());
    assert.strictEqual(p.peak, true);
    assert.strictEqual(p.pct, 100);
    const st = P.statusFor(p, 'Misty', 'en');
    assert.deepStrictEqual([st.mood, st.title], ['peak', 'Misty is in Supernova mode']);
    const h = P.cardHTML(p, { lang: 'en', name: 'Misty' });
    assert.match(h, /data-peak="1"/);
    assert.match(h, /Supernova<\/h3>/);
    assert.match(h, /Everything done\. Misty shines at full power\./);
    assert.doesNotMatch(h, /What\u2019s missing/);
    assert.doesNotMatch(h, /data-mp=/, 'nothing left to tap');
});

test('each missing factor has its own row, words and place to go', () => {
    /* no meal, no water, no move */
    let p = reading({ now: at(9, 0) }).p;
    assert.deepStrictEqual([row(p, 'fuel').done, row(p, 'fuel').act], [false, 'fuel']);
    assert.deepStrictEqual(P.rowText(row(p, 'fuel'), 'en'), ['No meal logged yet', 'Log a low-spike meal in Fuel']);
    assert.deepStrictEqual([row(p, 'water').act, P.rowText(row(p, 'water'), 'en')[0]], ['water', 'Water: 6 more glasses']);
    assert.deepStrictEqual([row(p, 'move').act, P.rowText(row(p, 'move'), 'en')[0]], ['move', 'No Move yet today']);
    assert.strictEqual(P.rowText(Object.assign({}, row(p, 'water'), { need: 1 }), 'en')[0], 'Water: 1 more glass');
    /* a stormy world: a high-spike meal this morning (the sugar wave is over), nothing to calm it */
    p = reading({ logs: [{ ts: at(8, 0), t: 'Croissant', lvl: 'high' }], water: 2 }).p;
    assert.strictEqual(row(p, 'sugar').done, true, 'the 4-hour wave is over');
    assert.strictEqual(row(p, 'world').done, false);
    assert.strictEqual(row(p, 'world').act, 'move');
    assert.deepStrictEqual(P.rowText(row(p, 'world'), 'en'), ['Stormy world \u00b7 spiky food today', 'A Move calms it']);
    assert.strictEqual(row(p, 'fuel').done, false, 'a spiky meal average is not done');
    assert.deepStrictEqual(P.rowText(row(p, 'fuel'), 'en'), ['Meals today: some spiky ones', 'Make the next meal low-spike']);
    assert.strictEqual(P.statusFor(p, 'Misty', 'en').title, 'Misty is in a stormy world');
    /* glow fading: low meal long ago, nothing since */
    p = reading({ logs: [{ ts: at(7, 0), t: 'Eier', lvl: 'low' }], ledger: [move(8)], water: 2 }).p;
    assert.strictEqual(row(p, 'glow').done, false);
    assert.deepStrictEqual([row(p, 'glow').act].concat(P.rowText(row(p, 'glow'), 'en')), ['fuel', 'Spark is fading', 'A low-spike meal lights her up for 4 h']);
    /* nutrients, only when meals carry numbers */
    const nutri = { meals: 2, known: { protein: 2, fiber: 2, sugar: 2 }, rows: [
        { k: 'protein', value: 52, target: 70, fill: 0.74, left: 18, over: 0, state: 'low' },
        { k: 'fiber', value: 22, target: 30, fill: 0.73, left: 8, over: 0, state: 'low' },
        { k: 'sugar', value: 42, target: 30, fill: 1, left: 0, over: 12, state: 'over' }] };
    p = reading(Object.assign({}, USER, { nutri })).p;
    assert.deepStrictEqual(P.rowText(row(p, 'protein'), 'en'), ['Protein: 18 g more', 'Try eggs, yogurt, fish or tofu']);
    assert.deepStrictEqual(P.rowText(row(p, 'fiber'), 'en'), ['Fiber: 8 g more', 'Try veggies, seeds or beans']);
    assert.deepStrictEqual(P.rowText(row(p, 'sweet'), 'en'), ['Sugar: 12 g over your limit', 'Scan before you buy the next snack']);
    assert.deepStrictEqual(['protein', 'fiber', 'sweet'].map(k => row(p, k).act), ['fuel', 'fuel', 'scan']);
    const blank = reading(Object.assign({}, USER, { nutri: Object.assign({}, nutri, { known: { protein: 0, fiber: 0, sugar: 0 } }) })).p;
    assert.strictEqual(row(blank, 'protein'), undefined, 'unknown macros are never counted against her');
    /* at night she can not peak */
    p = reading({ now: at(23, 30), logs: [{ ts: at(20, 0), t: 'Eier', lvl: 'low' }], ledger: [move(23, 0)], water: 6 }).p;
    assert.strictEqual(row(p, 'night').done, false);
    assert.strictEqual(p.peak, false);
});

test('World glow never reads 100% while one thing is missing', () => {
    const p = P.read({ cell: { state: 'clear', clear: 0.9, spike: 0 }, en: { value: 1, meals: 3, moves: 2, parts: { food: 1, water: 1, move: 1 } }, wm: { level: 0, tier: 'clear' }, water: 5 });
    assert.strictEqual(p.missing, 1);
    assert.ok(p.pct <= 95, String(p.pct));
});

test('every line in English, German and Spanish', () => {
    for (const [k, v] of Object.entries(P.STR)) {
        assert.strictEqual(v.length, 3, k);
        v.forEach((s, i) => assert.ok(s && s.trim(), k + ' ' + i));
    }
    assert.deepStrictEqual(P.STR.bar, ['World glow', 'Weltleuchten', 'Brillo del mundo']);
});

test('wiring: loaded, cached offline, at the top of Misty\'s sheet, in the status line, energy card and name tag', () => {
    assert.match(read('index.html'), /<script src="misty-peak\.js\?v=[^"]+"><\/script>/);
    assert.match(read('sw.js'), /"misty-peak\.js"/);
    const hub = read('misty-hub.js');
    assert.ok(hub.indexOf('peakHtml() +') > hub.indexOf("'</header>' +"), 'right under her name');
    assert.ok(hub.indexOf('peakHtml() +') < hub.indexOf('doorsHtml()') || hub.indexOf('doorsHtml()') < 0 || hub.indexOf('peakHtml() +') < hub.lastIndexOf('mh-doors'));
    const sp = read('spirit.js');
    assert.match(sp, /const M = window\.LowiMistyPeak; if \(M && M.now && M.statusFor\) pk = M\.statusFor\(M\.now\(\), n, lang\(\)\)/);
    assert.match(sp, /addEventListener\('lowi:peak', refresh\)/);
    const sc = read('misty-scale.js');
    assert.match(sc, /pk \? pk\.score : p\.value/, 'the name tag shows World glow');
    assert.match(sc, /opts\.held/);
    assert.match(read('cell-world.js'), /input: readInput/);
});

test('styling: theme tokens, no hard-coded teal or green in the World glow card; the peak look on Home', () => {
    const css = read('misty-hub.css'), part = css.slice(css.indexOf('.mp-card {'));
    assert.match(part, /var\(--one-acc/);
    assert.doesNotMatch(part, /#6ee7c8|#2dd4bf|#14b8a6|#8ff0c4|#a6f5d2|teal|green/i);
    const wh = read('world-home.css');
    assert.match(wh, /html\[data-peak="1"\] #spHome #spBubble \.lh-smile/);
    assert.match(wh, /html\[data-peak="1"\] \.bw3-canvas/);
});
