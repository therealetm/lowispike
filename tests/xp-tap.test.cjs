'use strict';
/* Universal interaction XP, healthy streak bonus, tiered feedback (xp-tap-core.js, xp-tap.js, xp-tap.css). */
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

test('tap tier: first tap on a control earns 1 XP, explore tier earns 3', () => {
    let s = K.fresh(DAY);
    let r = K.decide(s, { key: 'home:btn-a', tier: 'tap', now: NOW }); assert.equal(r.outcome, 'earn'); assert.equal(r.amt, 1); s = r.store;
    r = K.decide(s, { key: 'tab:move', tier: 'explore', now: NOW + 1000 }); assert.equal(r.outcome, 'earn'); assert.equal(r.amt, 3); s = r.store;
    assert.equal(s.xp, 4); assert.equal(s.pend, 4); assert.equal(s.pendN, 2);
});

test('broad coverage: navigation, exploration, companion, customization, scan, cook, community, Move, fasting and learning keys all earn once', () => {
    const keys = ['tab:home', 'tab:scan', 'tab:cook', 'tab:move', 'tab:foryou', 'tab:profile', 'region:liver', 'learn:liver', 'room:cellroom', 'room:buddies',
        K.keyFor('home', 'herb-touch'), K.keyFor('profile/r2-ov', 'set-atmos'), K.keyFor('scan', 'act-scanbarcode'), K.keyFor('cook', 'recipe-open-avocado toast'),
        K.keyFor('foryou', 'Like'), K.keyFor('move', 'Start session'), K.keyFor('home', 'fast-edit-start')];
    let s = K.fresh(DAY), t = NOW;
    for (const k of keys) { const r = K.decide(s, { key: k, tier: /^(tab|region|learn|room):/.test(k) ? 'explore' : 'tap', now: (t += 1000) }); assert.equal(r.outcome, 'earn', k); s = r.store; }
    assert.equal(new Set(keys).size, keys.length);
});

test('repeats of the same control earn nothing the same day and are reported as repeat, not points', () => {
    let s = K.decide(K.fresh(DAY), { key: 'k', tier: 'tap', now: NOW }).store;
    const r = K.decide(s, { key: 'k', tier: 'tap', now: NOW + 5000 });
    assert.equal(r.outcome, 'repeat'); assert.equal(r.amt, 0); assert.equal(r.store.xp, 1);
});

test('rapid-fire taps on different controls are rate limited (no farming by mashing)', () => {
    let s = K.decide(K.fresh(DAY), { key: 'a', tier: 'tap', now: NOW }).store;
    const r = K.decide(s, { key: 'b', tier: 'tap', now: NOW + 100 });
    assert.equal(r.outcome, 'spam'); assert.equal(r.store.xp, 1); assert.ok(!r.store.keys.b);
    assert.equal(K.decide(r.store, { key: 'b', tier: 'tap', now: NOW + K.MIN_GAP_MS + 1 }).outcome, 'earn');
});

test('daily cap: taps and visits stop at DAY_CAP XP; the last award is trimmed, never exceeded', () => {
    let s = K.fresh(DAY), t = NOW, total = 0;
    for (let i = 0; i < 200; i++) { const r = K.decide(s, { key: 'k' + i, tier: i % 3 ? 'tap' : 'explore', now: (t += 1000) }); s = r.store; total += r.amt; }
    assert.equal(total, K.DAY_CAP); assert.equal(s.xp, K.DAY_CAP);
    assert.equal(K.decide(s, { key: 'new', tier: 'tap', now: t + 1000 }).outcome, 'cap');
});

test('close, cancel, back, delete, sign out and similar never earn (en/de/es + glyphs)', () => {
    for (const w of ['Close', 'Cancel', 'Back', 'Delete meal', 'Remove', 'Sign out', 'Log out', 'Reset', 'Undo', 'Skip', 'Not now', 'Schlie\u00dfen', 'Abbrechen', 'Zur\u00fcck', 'L\u00f6schen', 'Abmelden', 'Cerrar', 'Cancelar', 'Volver', 'Borrar', 'Eliminar', '\u00d7', '\u2715', '\u2190'])
        assert.ok(K.negative(w), w);
    for (const w of ['Start session', 'Open map', 'Liver', 'Send a hug', 'Scan', 'Kochen', 'Recetas', 'Backofen-Rezept', 'Feedback'])
        assert.ok(!K.negative(w), w);
});

test('keys are stable: digits fold, accents fold, empty ident gives no key', () => {
    assert.equal(K.keyFor('cook', 'Recipe 12'), K.keyFor('cook', 'Recipe 7'));
    assert.equal(K.keyFor('Home', 'K\u00fcche'), 'home:kuche');
    assert.equal(K.keyFor('home', ''), '');
});

test('flush: pending taps become one ledger award with a unique id per day; nothing pending, nothing awarded', () => {
    let s = K.fresh(DAY);
    for (let i = 0; i < 4; i++) s = K.decide(s, { key: 'k' + i, tier: 'tap', now: NOW + i * 1000 }).store;
    let f = K.flush(s); assert.deepEqual(f.award, { amt: 4, n: 4, eventId: 'tap:' + DAY + ':0' }); s = f.store;
    assert.equal(s.pend, 0); assert.equal(s.seq, 1); assert.equal(K.flush(s).award, null);
    s = K.decide(s, { key: 'x', tier: 'explore', now: NOW + 9000 }).store;
    assert.equal(K.flush(s).award.eventId, 'tap:' + DAY + ':1');
});

test('persistence: same day keeps keys; a new day starts clean; seq skips ids already in the ledger (reload / crash safe)', () => {
    let s = K.decide(K.fresh(DAY), { key: 'k', tier: 'tap', now: NOW }).store;
    const raw = JSON.parse(JSON.stringify(s));
    assert.equal(K.norm(raw, DAY, []).keys.k, 1);
    assert.deepEqual(K.norm(raw, '2026-10-16', []).keys, {});
    const ledger = [{ eventId: 'tap:' + DAY + ':0' }, { eventId: 'tap:' + DAY + ':3' }, { eventId: 'tap:2026-10-14:9' }];
    assert.equal(K.norm(raw, DAY, ledger).seq, 4);
    assert.equal(K.norm(null, DAY, []).seq, 0);
    assert.equal(K.norm({ v: 9, day: DAY, keys: { a: 1 } }, DAY, []).keys.a, undefined);
});

/* the canonical award(), run from index.html itself */
function awardSandbox(S) {
    const src = read('index.html');
    const a = src.indexOf('function award(amt, label, el, src, eventId){');
    const b = src.indexOf('\n}\n', a);
    const lv = src.match(/function levelOf\(xp\)\{[^\n]*\}/)[0];
    const toasts = [], events = [];
    const ctx = { S, toasts, events, Number, Date, setTimeout: () => 0, titleOf: () => 'Sprout', window: { dispatchEvent: e => events.push(e) }, CustomEvent: function (n, o) { this.type = n; this.detail = o.detail; },
        toast: m => toasts.push(m), save: () => {}, today: () => DAY, $$: () => [] };
    vm.createContext(ctx);
    vm.runInContext('const HERB_XP = [0,100,300,700,1500,3000];\n' + lv + '\n' + src.slice(a, b + 2) + '\nthis.award = award;', ctx);
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

test('xp-tap.js: trusted gestures only, drags and long presses ignored, bigger reward replaces the tap, quiet awards, batched flush', () => {
    const js = read('xp-tap.js');
    assert.ok(js.includes('if (!e.isTrusted) return;'));
    assert.ok(js.includes('moved > 12 || held > 1200'));
    assert.ok(js.includes("if (exploredIn === g) return; grant(key, 'tap', x, y);"));
    assert.ok(js.includes("W.award(r.award.amt, label, null, 'tap', r.award.eventId, { quiet: true })"));
    assert.ok(js.includes("W.award(m.xp, label, null, 'combo', m.eventId, { quiet: true })"));
    assert.ok(js.includes('if (!id || Date.now() - lastUser > 2500) return;'), 'events from code on boot never pay');
    assert.ok(js.includes("D.addEventListener('visibilitychange', () => { if (D.hidden) flush(true); });"));
    assert.ok(js.includes('store = r.store; persist(); /* the id is spent before the award'));
    assert.ok(!/getContext|WebGLRenderer|three\./i.test(js + read('xp-tap-core.js')), 'no WebGL');
    assert.ok(!/LowiSpeak|speak\(|say\(/.test(js), 'the companion never talks on taps');
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

test('editing a fast start gives no XP, and fasting never feeds tap or streak rewards twice', () => {
    for (const f of ['fast-edit.js', 'fast-edit-core.js']) assert.ok(!/\baward\s*\(/.test(read(f)), f);
    let s = K.decide(K.fresh(DAY), { key: K.keyFor('home/fst-ov', 'Edit start'), tier: 'tap', now: NOW }).store;
    assert.equal(K.decide(s, { key: K.keyFor('home/fst-ov', 'Edit start'), tier: 'tap', now: NOW + 60000 }).outcome, 'repeat');
});
