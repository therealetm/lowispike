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

/* Oct 28, 2026 (Emmanuel): "Entkopple den Fastentimer komplett vom Essen." The Oct 24 fix (Zeit ändern moves the meal the Gap
   counted from) is retired with it: the Gap no longer counts from a meal, so Zeit ändern moves only the timer's own start and
   never a logged meal (LowiFastStop.mealList is empty). The fast-edit core keeps its meal logic for old callers; these tests pin the
   app's behaviour. */
const runningV2 = s => ({ lowi_fast_v1: JSON.stringify({ last: s, hist: [], v2: 1 }) });

test('decoupled: Gap from 18:55, Zeit ändern to 17:55 sticks, and the meal eaten at 18:55 stays where it is', () => {
    const now = Date.now(), s0 = min(now - 2 * H), h = host(runningV2(s0));
    h.logMeal('a', s0, 'Spiegeleier');
    const r = h.save(s0 - H);
    assert.ok(r.ok, JSON.stringify(r)); assert.ok(!r.moved, 'no meal moved');
    assert.strictEqual(h.start(), s0 - H, 'the new start sticks');
    assert.strictEqual(h.logs[0].ts, s0, 'the meal keeps its time');
    assert.strictEqual(h.edits.length, 0, 'Fuel\'s meal edit is never called');
    assert.strictEqual(fastAwards(h).length, 0, 'no points from editing');
});

test('decoupled: logging a meal after a start edit does not win over it', () => {
    const now = Date.now(), s0 = min(now - 5 * H), h = host(runningV2(s0));
    h.save(s0 - 2 * H);
    h.logMeal('b', min(now - 10 * MIN));
    assert.strictEqual(h.start(), s0 - 2 * H);
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

test('decoupled: Zeit ändern can set the start back to last night (up to 7 days); a meal logged this morning is untouched', () => {
    const now = Date.now(), s0 = min(now - 40 * H), meal = min(now - H), h = host(runningV2(s0));
    h.logMeal('a', meal);
    const to = min(now - 26 * H);
    const r = h.save(to);
    assert.ok(r.ok && !r.moved, JSON.stringify(r));
    assert.strictEqual(h.start(), to);
    assert.strictEqual(h.logs[0].ts, meal);
    assert.strictEqual(h.win.LowiFastStop.mealList().length, 0);
    assert.strictEqual(C.plan(h.fast(), [], now - 8 * 24 * H, now).err, 'old');
    assert.strictEqual(C.plan(h.fast(), [], now + H, now).err, 'future');
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
