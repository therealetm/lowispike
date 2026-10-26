// Oct 24, 2026 (Emmanuel, voice ~18:58): "I try to change the time here and it didn't change the time. It just reset it back. So I had
// to long press Fuel and then also press on the what I ate, and then I could change the time there. [...] Just have both ways working."
// Repro: Gap > Letzte Mahlzeit > Zeit ändern showed "Gespeichert: 18:55"; -1 h to 17:55, "Start speichern", back to 18:55.
// Root cause: the Gap starts at max(own start, newest logged meal) (LowiFastStop.startOf), and the edit wrote only `last`.
// Fix: when a logged meal is what the Gap counts from, Zeit ändern moves THAT meal through Fuel's own path
// (LowiVitalsBridge.editMeal -> lowi:meal-moved -> LowiFastStop.remeal). These tests run the real fasting module (index.html),
// the real fast-edit core and fast-edit.js in a small VM, with the meals list beside them.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html'), coreSrc = read('fast-edit-core.js'), editSrc = read('fast-edit.js'), css = read('fast-edit.css');
const C = require('../fast-edit-core.js');
const H = 36e5, MIN = 6e4;

function stopSrc() {
    const a = html.indexOf('/* LOWiSPIKE fasting stop (Oct 10, 2026): "I just ate"');
    assert.ok(a > 0, 'found the fasting stop module');
    const end = html.indexOf('\n})();', html.indexOf('window.LowiFastStop = {'));
    return html.slice(a, end) + '\n})();';
}
const dayOf = ts => { const d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

function host(init) {
    const store = new Map(Object.entries(init || {}));
    const listeners = {}, toasts = [], awards = [], paidEv = new Set(), edits = [];
    const localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
    const el = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, appendChild() {}, setAttribute() {}, removeAttribute() {}, querySelector: () => null, addEventListener() {}, remove() {} });
    const document = {
        hidden: false, head: { appendChild() {} }, body: { appendChild() {} }, documentElement: { appendChild() {}, classList: { add() {}, remove() {} } }, activeElement: null,
        addEventListener() {}, getElementById: () => null, querySelectorAll: () => [], querySelector: () => null, createElement: el
    };
    const win = {
        localStorage, document, Date, Math, JSON, console, Intl, CustomEvent: class { constructor(type, o) { this.type = type; this.detail = o && o.detail; } },
        setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, requestAnimationFrame: () => 0, matchMedia: () => ({ matches: false }),
        addEventListener: (n, f) => { (listeners[n] = listeners[n] || []).push(f); },
        dispatchEvent: e => { (listeners[e.type] || []).forEach(f => f(e)); return true; },
        toast: t => toasts.push(t), closeSheet() {}, S: { td: { meals: 0 }, logs: [] },
        award: (x, label, elx, src, ev) => { if (ev && paidEv.has(ev)) return 0; if (ev) paidEv.add(ev); awards.push({ x, label, src, ev }); return x; },
        LowiF2: { bonusFor: () => 0 }
    };
    /* LowiVitalsBridge.editMeal as index.html has it (time part): same day, or any day up to 7 days back with anyDay */
    win.LowiVitalsBridge = {
        unaward: ev => { paidEv.delete(ev); const i = awards.findIndex(a => a.ev === ev); if (i >= 0) awards.splice(i, 1); return 1; },
        editMeal(data) {
            edits.push(data);
            const log = win.S.logs.find(l => l.id === data.id || l.eventId === data.id); if (!log) return false;
            const old = +log.ts, nts = +data.ts || 0; let moved = 0;
            if (nts && Math.abs(nts - old) >= 60000) {
                const d0 = new Date(old), d1 = new Date(nts);
                if ((d1.toDateString() === d0.toDateString() || (data.anyDay && nts >= Date.now() - 7 * 864e5 - 60000)) && nts <= Date.now() + 60000) {
                    log.ts = Math.min(Date.now(), nts); log.ateSet = 1; moved = 1; if (log.day && d1.toDateString() !== d0.toDateString()) log.day = dayOf(log.ts);
                }
            }
            if (moved) win.dispatchEvent(new win.CustomEvent('lowi:meal-moved', { detail: { id: log.eventId || log.id, ts: log.ts, oldTs: old } }));
            return { log, xp: 0, moved: !!moved };
        }
    };
    win.window = win;
    const ctx = vm.createContext(win);
    vm.runInContext(stopSrc(), ctx);
    vm.runInContext(coreSrc, ctx);
    vm.runInContext(editSrc, ctx);
    const fast = () => JSON.parse(store.get('lowi_fast_v1') || '{}');
    const h = { win, fast, toasts, awards, edits, logs: win.S.logs, emit: (n, d) => win.dispatchEvent(new win.CustomEvent(n, { detail: d })) };
    h.logMeal = (id, ts, t) => { h.logs.push({ id, eventId: 'meal:' + id, t: t || 'Food ' + id, ts, day: dayOf(ts), slot: 'meal' }); h.emit('lowi:meal-logged', { id: 'meal:' + id, ts, slot: 'meal' }); };
    h.start = () => win.LowiFastStop.startOf(h.fast());
    h.save = t => win.LowiFastEdit.save(t);
    return h;
}
const running = s => ({ lowi_fast_v1: JSON.stringify({ last: s, hist: [] }) });
const fastAwards = h => h.awards.filter(a => a.src === 'r3a_fast');
const min = t => Math.floor(t / MIN) * MIN;

test('Emmanuel\'s repro: Gap from a meal at 18:55, Zeit ändern to 17:55 sticks and moves that meal (no second meal)', () => {
    const now = Date.now(), meal = min(now - H), h = host(running(min(now - 3 * H)));
    h.logMeal('a', meal, 'Pasta');
    assert.strictEqual(h.start(), meal, 'Gap counts from the meal ("Gespeichert: 18:55")');
    const r = h.save(meal - H);
    assert.ok(r.ok, JSON.stringify(r)); assert.ok(r.moved, 'the meal moved');
    assert.strictEqual(h.start(), meal - H, 'no snap back: the Gap counts from 17:55');
    assert.strictEqual(h.logs.length, 1, 'still one meal');
    assert.strictEqual(h.logs[0].ts, meal - H, 'Fuel shows the new time');
    assert.strictEqual(h.win.LowiFastStop.lastMeal().ts, meal - H, 'After your meal reads the same meal and time');
    assert.strictEqual(h.fast().last, meal - H);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(h.edits[0])), { id: 'a', ts: meal - H, anyDay: true }, 'goes through Fuel\'s own editMeal');
});

test('the bug before the fix: writing only `last` loses to the newest meal (what Emmanuel saw)', () => {
    const now = Date.now(), meal = min(now - H), h = host(running(min(now - 3 * H)));
    h.logMeal('a', meal);
    const s = h.fast(); s.last = meal - H; h.win.localStorage.setItem('lowi_fast_v1', JSON.stringify(s));
    assert.strictEqual(h.start(), meal, 'old path: back to 18:55');
});

test('a long fast before the meal is paid once, at its corrected end, and never twice', () => {
    const now = Date.now(), s0 = min(now - 20 * H), meal = min(now - 2 * H), h = host(running(s0));
    h.logMeal('a', meal);
    assert.strictEqual(fastAwards(h).length, 1, 'the 18 h fast paid when the meal was logged');
    const r = h.save(meal - 3 * H);
    assert.ok(r.ok && r.moved);
    assert.strictEqual(fastAwards(h).length, 1, 'still once');
    const hist = h.fast().hist; assert.strictEqual(hist.length, 1); assert.strictEqual(hist[0].s, s0); assert.strictEqual(hist[0].e, meal - 3 * H, 'the fast now ends at the corrected meal time');
    assert.strictEqual(h.start(), meal - 3 * H);
    // moving it back later again works too, still one record and one payment
    const r2 = h.save(meal - H);
    assert.ok(r2.ok && r2.moved, JSON.stringify(r2));
    assert.strictEqual(h.start(), meal - H); assert.strictEqual(h.fast().hist.length, 1); assert.strictEqual(fastAwards(h).length, 1);
});

test('the -1 h nudge is not clamped to the meal\'s own fast (planBounds), and the earliest time is the gap before that meal', () => {
    const now = Date.now(), s0 = min(now - 20 * H), meal = min(now - 2 * H), h = host(running(s0));
    h.logMeal('a', meal);
    const s = h.fast(), ml = h.win.LowiFastStop.mealList();
    assert.strictEqual(C.bounds(s, now).min, meal, 'the old bounds stopped at the meal itself');
    const b = C.planBounds(s, ml, now);
    assert.strictEqual(b.min, s0, 'with the meal lifted out, the earliest time is where that gap started');
    assert.strictEqual(b.cur, meal);
    assert.ok(C.plan(s, ml, meal - H, now).ok);
    assert.strictEqual(C.plan(s, ml, s0 - H, now).err, 'overlap');
});

test('the last meal cannot move before the meal logged ahead of it (that one would win again)', () => {
    const now = Date.now(), h = host(running(min(now - 10 * H))), m1 = min(now - 5 * H), m2 = min(now - H);
    h.logMeal('a', m1, 'Toast'); h.logMeal('b', m2, 'Salad');
    const p = C.plan(h.fast(), h.win.LowiFastStop.mealList(), m1 - H, now);
    assert.strictEqual(p.err, 'mealBefore'); assert.strictEqual(p.meal.t, 'Toast');
    const r = h.save(m1 - H);
    assert.ok(!r.ok); assert.strictEqual(h.start(), m2, 'nothing changed'); assert.strictEqual(h.logs[1].ts, m2);
    assert.ok(h.save(m1 + H).ok); assert.strictEqual(h.start(), m1 + H); assert.strictEqual(h.logs.length, 2);
});

test('no meal logged: Zeit ändern still only moves the start, as before', () => {
    const now = Date.now(), h = host(running(min(now - 3 * H)));
    const r = h.save(min(now - 5 * H));
    assert.ok(r.ok); assert.ok(!r.moved); assert.strictEqual(h.start(), min(now - 5 * H)); assert.strictEqual(h.edits.length, 0);
});

test('own start later than the newest meal: an earlier time that would hide behind that meal is refused, not lost', () => {
    const NOW = new Date(2026, 9, 24, 20, 0).getTime();
    const s = { last: NOW - 2 * H, hist: [] }, meals = [{ id: 'a', ev: 'meal:a', ts: NOW - 4 * H, t: 'Rice' }];
    assert.strictEqual(C.gapMeal(s, meals, NOW), null);
    const p = C.plan(s, meals, NOW - 6 * H, NOW);
    assert.strictEqual(p.err, 'mealAfter'); assert.strictEqual(p.meal.ts, NOW - 4 * H);
    assert.ok(C.plan(s, meals, NOW - 3 * H, NOW).ok);
    assert.strictEqual(C.plan(s, meals, NOW - 3 * H, NOW).move, null);
});

test('a meal logged this morning can go back to last night (other day, up to 7 days): its day goes with it', () => {
    const now = Date.now(), s0 = min(now - 40 * H), meal = min(now - H), h = host(running(s0));
    h.logMeal('a', meal);
    const to = meal - 26 * H;
    const r = h.save(to);
    assert.ok(r.ok && r.moved, JSON.stringify(r));
    assert.strictEqual(h.logs[0].ts, to); assert.strictEqual(h.logs[0].day, dayOf(to));
    assert.strictEqual(h.start(), to);
    assert.strictEqual(C.plan(h.fast(), h.win.LowiFastStop.mealList(), now - 8 * 24 * H, now).err, 'old');
    assert.strictEqual(C.plan(h.fast(), h.win.LowiFastStop.mealList(), now + H, now).err, 'future');
    assert.strictEqual(C.plan(h.fast(), h.win.LowiFastStop.mealList(), to + 20000, now).err, 'same');
});

test('Fuel\'s own path (meal > Bearbeiten > Uhrzeit) keeps working beside it', () => {
    const now = Date.now(), meal = min(now - H), h = host(running(min(now - 3 * H)));
    /* Fuel's path only moves a meal within its own day: between 00:00 and 01:30 "30 min earlier" is yesterday, so move it later then
       (bug hunt round 29: this test failed every night in that window and blocked releases) */
    const to = dayOf(meal - 30 * MIN) === dayOf(meal) ? meal - 30 * MIN : meal + 30 * MIN;
    h.logMeal('a', meal);
    h.win.LowiVitalsBridge.editMeal({ id: 'a', ts: to });
    assert.strictEqual(h.start(), to);
    assert.strictEqual(h.logs.length, 1);
});

test('wiring: index.html editMeal takes anyDay and moves the day; LowiFastStop exposes mealList; the sheet uses plan + planBounds', () => {
    assert.ok(/data\.anyDay&&nts>=Date\.now\(\)-7\*864e5-60000/.test(html), 'editMeal: anyDay, at most 7 days back');
    assert.ok(html.includes('log.day=q.getFullYear()'), 'editMeal moves log.day with an other-day move');
    assert.ok(html.includes('remeal, lastMeal, mealList, SITTING'), 'LowiFastStop.mealList exported');
    assert.ok(editSrc.includes('C().plan(s, ml, t, now)'), 'check() validates with the meals in');
    assert.ok(/nudge[\s\S]{0,300}planBounds/.test(editSrc), 'the quick -1 h uses planBounds');
    assert.ok(editSrc.includes("editMeal({ id: mv.id, ts: mv.to, anyDay: true })"), 'moves through Fuel\'s editMeal');
    assert.ok(editSrc.includes("'lowi:fast-start'"), 'Gap repaints on lowi:fast-start');
});

test('the date field reads in the app language, not the phone language ("24 Oct 2026" in the German sheet)', () => {
    assert.ok(editSrc.includes('id="feDateShow"') && editSrc.includes('id="feTimeShow"'));
    assert.ok(/toLocaleDateString\(loc\(\), \{ day: 'numeric', month: 'short', year: 'numeric' \}\)/.test(editSrc));
    assert.ok(/\.fe-in input \{ color: transparent; -webkit-text-fill-color: transparent;/.test(css));
    assert.ok(css.includes('.fe-f > span {'), 'field captions only, not the shown value');
    const de = new Date(2026, 9, 24, 12).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });
    assert.ok(/Okt/.test(de), de);
    for (const k of ['mealNote', 'mealAfter', 'mealBefore', 'early', 'moved', 'storage']) {
        const n = (editSrc.match(new RegExp('\\b' + k + ": '", 'g')) || []).length;
        assert.strictEqual(n, 3, k + ' in EN, DE and ES');
    }
});
