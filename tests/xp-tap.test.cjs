'use strict';
/* XP for completed actions only (taps and navigation pay nothing), healthy streak bonus, tiered feedback (xp-tap-core.js, xp-tap.js, xp-tap.css). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const K = require('../xp-tap-core.js');

const NOW = new Date(2026, 9, 15, 12, 0, 0).getTime();
const DAY = K.dayKey(NOW);
const H = 3600e3;

test('no tap, tab or navigation XP exists: the old tap and explore tiers are gone from the rules', () => {
    for (const k of ['decide', 'flush', 'keyFor', 'norm', 'fresh', 'TAP_XP', 'EXPLORE_XP', 'DAY_CAP']) assert.equal(K[k], undefined, k);
    const js = read('xp-tap.js');
    assert.ok(!/\b(W|D|window|document)\.addEventListener\(\s*'(click|pointerdown|pointerup|touchstart|touchend|change|keydown)'/.test(js), 'no tap, key or change listener');
    for (const ev of ['lowi:world3d-place', 'lowi:ride-arrive', 'lowi:arrival', 'lowi:cellroom', 'lowi:buddies', 'lowi:shop', 'lowi:tab'])
        assert.ok(!js.includes("'" + ev + "'"), 'never pays for ' + ev);
    assert.ok(!/'explore'/.test(js), 'nothing is labelled explore');
    assert.ok(js.includes("function grant() { return 'none'; }"), 'old callers get nothing');
    assert.ok(js.includes('localStorage.removeItem(KEY)'), 'pending tap points from the old build are dropped, never paid');
});

test('completed actions: amounts, own category, once ever or capped per day', () => {
    const NOWT = NOW, led = [];
    const take = a => { led.push({ ts: NOWT, day: DAY, amt: a.amt, src: a.src, eventId: a.eventId, label: a.kind }); return a; };
    let a = take(K.action('discover', 'region-liver', led, NOWT));
    assert.deepEqual([a.amt, a.src, a.eventId], [5, 'discover', 'discover:region-liver']);
    assert.equal(K.action('discover', 'region-liver', led, NOWT + 864e5 * 3), null, 'a region is discovered once, ever');
    assert.ok(K.action('discover', 'region-heart', led, NOWT));
    assert.equal(K.action('buddy', 'bifido', led, NOWT), null, 'the microbe buddies are gone: no buddy XP');
    for (let i = 0; i < 3; i++) { a = take(K.action('care', 'care', led, NOWT + i)); assert.equal(a.eventId, 'care-sent:' + DAY + ':' + i); }
    assert.equal(K.action('care', 'care', led, NOWT + 10), null, 'care: max 3 a day');
    assert.ok(K.action('care', 'care', led, NOWT + 864e5), 'next day counts again');
    take(K.action('fastedit', 'fast', led, NOWT));
    assert.equal(K.action('fastedit', 'fast', led, NOWT + 60000), null, 'fast edit: max 1 a day');
    assert.equal(K.action('tap', 'x', led, NOWT), null); assert.equal(K.action('explore', 'tab-move', led, NOWT), null); assert.equal(K.action('discover', '', led, NOWT), null);
    for (const e of led) assert.equal(K.healthyKind(e), '', 'bonus actions never feed the healthy streak: ' + e.src);
});

test('categories: every action gets its own label; Move is always move, never explore', () => {
    const C = (src, label) => K.category({ src, label, amt: 5 });
    assert.equal(C('move:session', 'Move session \u00b7 12 min'), 'move');
    assert.equal(C('move:meal', 'Moved after a meal'), 'move');
    assert.equal(C('move:steps', 'Steps \u00b7 4,000'), 'move');
    assert.equal(C('r3a_move', 'Lazy morning session'), 'move');
    assert.equal(C('meal:spirit', 'Meal logged'), 'meal');
    assert.equal(C('meal:abc', 'Meal checked'), 'meal');
    assert.equal(C('r3a_fast', 'Fast done: 16 h'), 'fast');
    assert.equal(C('fast-edit', 'Fasting start updated'), 'fast');
    assert.equal(C('body-trip', 'Body trip \u00b7 Liver'), 'journey');
    assert.equal(C('care-sent', 'Care sent to a friend'), 'care');
    assert.equal(C('discover', 'First discovery \u00b7 Liver'), 'discover');
    assert.equal(C('combo', 'Healthy streak \u00d73'), 'streak');
    assert.equal(C('', 'Day 4 check-in'), 'checkin');
    assert.equal(C('herb-care:water', 'Water'), 'water');
    assert.equal(C('tap', 'Curiosity \u00b7 3 taps'), 'legacy-tap');
    for (const src of ['move:session', 'move:meal', 'move:steps', 'r3a_move']) assert.notEqual(C(src, 'Explore'), 'explore');
});

test('no reward pushes longer fasts or more exercise than is healthy', () => {
    const src = read('index.html');
    assert.ok(/const PER_H = 2, CAP_H = 16,/.test(src), 'hourly fast points stop at 16 h');
    /* MAYA-HANDOFF 0.37: a finished Move session is now the biggest reward in the app (Emmanuel asked for it), so the old
       30 XP cap moved to move-finish-core.js. The health limits stay: 3 paid sessions a day, nothing extra past 60 minutes. */
    const MF = require('../move-finish-core.js');
    assert.ok(src.includes('perDay:MF ? MF.PER_DAY : 3, label:"Move session'), 'Move sessions capped at 3 a day');
    assert.equal(MF.PER_DAY, 3);
    assert.equal(MF.xpFor(60), MF.xpFor(240), 'one session stops paying more after 60 minutes');
    assert.ok(src.includes('if (sosN < 3) award(20, "Craving handled", null, "", "sos:" + today() + ":" + sosN);'), 'craving handled max 3 a day');
    assert.ok(src.includes('award(50, "Weekly glow check-in", null, "", "glow:" + e.week);'), 'weekly glow once a week');
    assert.equal(K.ACTIONS.fastedit.perDay, 1);
});

/* the canonical award(), run from index.html itself */
function awardSandbox(S) {
    const src = read('index.html');
    const a = src.indexOf('function award(amt, label, el, src, eventId){');
    const b = src.indexOf('\n}\n', a);
    const lv = src.match(/function levelOf\(xp(?:, mine)?\)\{[^\n]*\}/)[0];
    const max = 'const MAX_LEVEL = ' + require('../world-home-core.js').STAGES.length + ';\n'; // Oct 22: levelOf reads the one level table
    const toasts = [], events = [];
    const ctx = { S, toasts, events, Number, Date, setTimeout: () => 0, titleOf: () => 'Little cell', window: { dispatchEvent: e => events.push(e) }, CustomEvent: function (n, o) { this.type = n; this.detail = o.detail; },
        toast: m => toasts.push(m), save: () => {}, today: () => DAY, $$: () => [] };
    vm.createContext(ctx);
    vm.runInContext('const HERB_XP = ' + JSON.stringify(require('../world-home-core.js').STAGES.map(s => s.xp)) + ';\n' + max + lv + '\n' + src.slice(a, b + 2) + '\nthis.award = award;', ctx);
    return ctx;
}

test('award(): old calls unchanged (toast, balance, history); the quiet 6th arg only skips its toast; ids never double', () => {
    const S = { xp: 250, ledger: [{ ts: 1, day: '2026-10-01', amt: 250, label: 'Old', src: '' }] };
    const c = awardSandbox(S);
    assert.equal(c.award(15, 'Meal checked', null, 'meal:1', 'meal:1'), 15);
    assert.equal(c.toasts.length, 1); assert.equal(S.xp, 265); assert.equal(S.ledger.length, 2); assert.equal(S.ledger[0].label, 'Old');
    assert.equal(c.award(3, 'Curiosity \u00b7 3 taps', null, 'tap', 'tap:' + DAY + ':0', { quiet: true }), 3);
    assert.equal(c.toasts.length, 1, 'quiet award shows no toast');
    assert.equal(c.award(3, 'Curiosity \u00b7 3 taps', null, 'tap', 'tap:' + DAY + ':0', { quiet: true }), 0, 'retry with the same id adds nothing');
    assert.equal(S.xp, 268); assert.equal(S.ledger.filter(e => e.src === 'tap').length, 1);
    assert.equal(c.events.filter(e => e.type === 'lowi:reward').length, 2);
});

test('existing unlocks still fire: a quiet tap award that crosses a level still raises the level (level-up toast follows)', () => {
    const S = { xp: 99, ledger: [] };
    const c = awardSandbox(S);
    let later = 0; c.setTimeout = () => { later++; return 0; };
    c.award(1, 'Curiosity \u00b7 1 tap', null, 'tap', 'tap:' + DAY + ':0', { quiet: true });
    assert.equal(S.xp, 100); assert.equal(later, 1, 'level-up message scheduled');
});

test('award() wrappers pass every argument through, so quiet reaches the original', () => {
    const src = read('index.html');
    assert.ok(src.includes('const r = _a.apply(this, arguments);'));
    assert.ok(src.includes('const w = function(){ const r = _a.apply(this, arguments); pushSoon(); return r; }'));
    assert.ok(src.includes('if (!(arguments[5] && arguments[5].quiet)) toast('));
});

const at = (h, m) => new Date(2026, 9, 15, h, m || 0).getTime();
const L = (ts, amt, label, src, eventId) => ({ ts, day: DAY, amt, label, src: src || '', eventId });

test('healthy kinds: real actions count; fasting, quests, badges, taps and the bonus itself never do', () => {
    assert.equal(K.healthyKind(L(1, 5, 'Water', 'herb-care:water', 'herb-care:x')), 'water');
    assert.equal(K.healthyKind(L(1, 20, 'Move session', 'move:session')), 'move');
    assert.equal(K.healthyKind(L(1, 15, 'Moved after a meal', 'move:meal')), 'move');
    assert.equal(K.healthyKind(L(1, 5, 'Product scanned', 'herb-care:vitamin')), 'scan');
    assert.equal(K.healthyKind(L(1, 10, 'Swap saved', '')), 'swap');
    assert.equal(K.healthyKind(L(1, 10, 'Day 4 check-in', '')), 'checkin');
    assert.equal(K.healthyKind(L(1, 25, 'Lazy morning session', 'r3a_move')), 'move');
    for (const e of [L(1, 5, 'Logged your fast', 'r3a_fastlog'), L(1, 30, 'Fast done: 16 h', 'r3a_fast'), L(1, 15, 'Ten-minute walk after a meal', ''), L(1, 30, '3-day streak badge', ''),
        L(1, 2, 'Curiosity \u00b7 2 taps', 'tap'), L(1, 10, 'Healthy streak \u00d73', 'combo'), L(1, 15, 'Meal logged', 'meal:spirit'), L(1, 15, 'Meal checked', 'meal:abc', 'meal:abc'), L(1, 12, 'Body trip', 'body-trip')])
        assert.equal(K.healthyKind(e), '', e.label);
});

test('streak chain: low-spike meals and actions in a row; a high-spike meal breaks it; water counts at most 3; future/other days ignored', () => {
    const logs = [{ ts: at(8), day: DAY, t: 'Eggs', lvl: 'low' }, { ts: at(13), day: DAY, t: 'Cake', lvl: 'high' }, { ts: at(14), day: DAY, t: 'Salad', lvl: 'low' }, { ts: at(9), day: '2026-10-14', t: 'old', lvl: 'low' }];
    const ledger = [L(at(9), 5, 'Water', 'herb-care:water'), L(at(14, 10), 5, 'Water', 'herb-care:water'), L(at(14, 20), 5, 'Water', 'herb-care:water'), L(at(14, 30), 5, 'Water', 'herb-care:water'), L(at(14, 40), 5, 'Water', 'herb-care:water'), L(at(15), 20, 'Move session', 'move:session')];
    const c = K.chain({ logs, ledger, now: at(16) });
    assert.equal(c.brokeAt, at(13));
    assert.deepEqual(c.events.map(e => e.kind), ['meal', 'water', 'water', 'water', 'move']);
    assert.equal(c.count, 5);
});

test('streak bonus: 3 -> +10, 5 -> +20, 8 -> +40 (fanfare), each once per day, retries add nothing', () => {
    const ledger = [];
    const logs = [];
    const add = (h, e) => ledger.push(Object.assign({ ts: at(h), day: DAY }, e));
    add(8, { amt: 10, label: 'Day 3 check-in', src: '' });
    add(9, { amt: 5, label: 'Water', src: 'herb-care:water' });
    assert.deepEqual(K.comboDue({ logs, ledger, now: at(10) }), []);
    logs.push({ ts: at(10), day: DAY, lvl: 'low', t: 'Oats' });
    let due = K.comboDue({ logs, ledger, now: at(11) });
    assert.deepEqual(due.map(d => [d.n, d.xp, d.tier, d.eventId]), [[3, 10, 'pop', 'combo:' + DAY + ':3']]);
    ledger.push({ ts: at(11), day: DAY, amt: 10, label: 'Healthy streak \u00d73', src: 'combo', eventId: due[0].eventId });
    assert.deepEqual(K.comboDue({ logs, ledger, now: at(11) }), [], 'once per day');
    add(12, { amt: 20, label: 'Move session', src: 'move:session' });
    add(13, { amt: 10, label: 'Swap saved', src: '' });
    due = K.comboDue({ logs, ledger, now: at(13, 30) });
    assert.deepEqual(due.map(d => d.n), [5]);
    ledger.push({ ts: at(13, 31), day: DAY, amt: 20, src: 'combo', label: 'x', eventId: due[0].eventId });
    add(14, { amt: 5, label: 'Product scanned', src: 'herb-care:vitamin' });
    add(15, { amt: 10, label: 'Recipe cooked', src: 'cook:1' });
    logs.push({ ts: at(16), day: DAY, lvl: 'low', t: 'Soup' });
    due = K.comboDue({ logs, ledger, now: at(17) });
    assert.deepEqual(due.map(d => [d.n, d.tier]), [[8, 'fanfare']]);
});

test('fasting never builds the streak, so the bonus never rewards longer fasts', () => {
    const ledger = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(h => L(at(h), 10, 'Fast done: ' + h + ' h', 'r3a_fast'));
    assert.equal(K.chain({ logs: [], ledger, now: at(12) }).count, 0);
    assert.deepEqual(K.comboDue({ logs: [], ledger, now: at(12) }), []);
});

test('verdict fallback reads lvl, r and sugar', () => {
    assert.equal(K.verdict({ lvl: 'high' }), 'spike'); assert.equal(K.verdict({ r: 'ja' }), 'low');
    assert.equal(K.verdict({ macros: { sugar: 40 } }), 'spike'); assert.equal(K.verdict({}), '');
});

test('animations: never the same variant twice in a row', () => {
    const list = ['a', 'b', 'c', 'd']; let last = null;
    for (let i = 0; i < 400; i++) { const v = K.pick(list, last); assert.notEqual(v, last); assert.ok(list.includes(v)); last = v; }
    assert.equal(K.pick(['solo'], 'solo'), 'solo');
});

test('tap XP and the streak bonus are minor everywhere: no sunbeams, no herb praise, no care, no active day, no evolution card', () => {
    const Sun = require('../sun-meter.js');
    assert.equal(Sun.classify({ src: 'tap', label: 'Curiosity \u00b7 4 taps', amt: 4 }), 'quest');
    assert.equal(Sun.classify({ src: 'combo', label: 'Healthy streak \u00d73', amt: 10 }), 'quest');
    const T = require('../herb-tamagotchi-core.js');
    assert.equal(T.careKind({ src: 'tap', label: 'Curiosity \u00b7 4 taps' }), null);
    assert.equal(T.careKind({ src: 'combo', label: 'Healthy streak \u00d73' }), null);
    assert.equal(T.careKind({ src: 'move:session', label: 'Move' }), 'dance', 'real actions still care');
    const Herb = require('../herb-core.js');
    for (const lab of ['Curiosity \u00b7 4 taps', 'Neugier \u00b7 4 Taps', 'Curiosidad \u00b7 4 toques', 'Healthy streak \u00d73', 'Gesunde Serie \u00d75', 'Racha sana \u00d78'])
        assert.equal(Herb.meaningful({ amt: 4, ts: 1, src: 'tap', label: lab }), false, lab);
    assert.ok(read('daily-ritual.js').includes("if (e && /^(tap|combo)$/.test(String(e.src || ''))) return; /* xtp"));
    assert.ok(read('herb-quests.js').includes("const minor = d.entry && d.entry.src === 'tap';"));
    assert.ok(/type === 'sun' \|\| type === 'quest'\) return;/.test(read('praise.js')), 'praise skips quest-class rewards');
});

test('xp-tap.js: pays only completed actions through award() with eventIds; quiet streak awards; no WebGL, no companion speech', () => {
    const js = read('xp-tap.js');
    assert.ok(js.includes("W.award(a.amt, LAB[kind](name || a.id), null, a.src, a.eventId)"));
    assert.ok(js.includes("W.award(m.xp, label, null, 'combo', m.eventId, { quiet: true })"));
    for (const ev of ['lowi:world-region', 'lowi:care-sent', 'lowi:fast-start']) assert.ok(js.includes("'" + ev + "'"), ev);
    assert.ok(!js.includes("'lowi:buddy-added'") && !/buddy/i.test(read('xp-tap-core.js').replace(/\/\*[\s\S]*?\*\//g, '')), 'no buddy XP');
    assert.ok(js.includes("if (REG[id]) act('discover'"), 'only the 7 real regions, never the hub');
    assert.ok(!/getContext|WebGLRenderer|three\./i.test(js + read('xp-tap-core.js')), 'no WebGL');
    assert.ok(!/LowiSpeak|speak\(|say\(/.test(js), 'the companion never talks for XP');
});

test('feedback tiers exist and respect reduced motion; only transform and opacity animate', () => {
    const css = read('xp-tap.css');
    for (const c of ['.xtp-pop.v-rise', '.xtp-pop.v-drift-l', '.xtp-pop.v-twirl', '.xtp-pop.v-bubble', '.xtp-pop.explore', '.xtp-pop.dim', '.xtp-banner.v-slide', '.xtp-banner.v-drop', '.xtp-fan.on.v-confetti', '.xtp-fan.on.v-burst', '.xtp-fan.on.v-rings', '.xtp-fan.on.v-comet'])
        assert.ok(css.includes(c), c);
    assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'));
    assert.ok(/\.xtp-layer\{[^}]*pointer-events:none/.test(css)); assert.ok(/\.xtp-fan\{[^}]*pointer-events:none/.test(css));
    const frames = [];
    for (let i = css.indexOf('@keyframes'); i >= 0; i = css.indexOf('@keyframes', i + 1)) { let d = 0, j = css.indexOf('{', i); const s0 = j; for (; j < css.length; j++) { if (css[j] === '{') d++; else if (css[j] === '}' && --d === 0) break; } frames.push(css.slice(s0, j)); }
    assert.ok(frames.length >= 15);
    for (const f of frames) assert.ok(!/(width|height|top|left|margin)\s*:/.test(f), f.slice(0, 40));
});

test('wiring: loader after fast edit, both service-worker lists, stylesheet next to the script', () => {
    const ui = read('apple-ui.js');
    assert.ok(ui.includes("'fast-edit.js','xp-tap-core.js','xp-tap.js'"));
    const sw = read('sw.js');
    for (const f of ['xp-tap-core.js', 'xp-tap.js', 'xp-tap.css']) assert.equal(sw.split('"' + f + '"').length - 1, 2, f);
    assert.ok(read('xp-tap.js').includes("replace('xp-tap.js', 'xp-tap.css')"));
});

test('the fast-edit module itself still awards nothing; the one small fast-edit XP comes from xp-tap.js, once a day', () => {
    for (const f of ['fast-edit.js', 'fast-edit-core.js']) assert.ok(!/\baward\s*\(/.test(read(f)), f);
    const led = [];
    const a = K.action('fastedit', 'fast', led, NOW); led.push({ ts: NOW, day: DAY, amt: a.amt, src: a.src, eventId: a.eventId });
    assert.equal(K.action('fastedit', 'fast', led, NOW + 3600e3), null);
});
