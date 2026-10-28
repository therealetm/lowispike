// Oct 19, 2026 (E-man, fresh account): "I've been fasting for nineteen hours. It doesn't make sense."
// A new account must not show a fast it never did. No last meal known = no gap, until the first real meal.
// Runs the two real fasting modules from index.html (LowiFastStop and the old Today card LOWI_FAST) in a small VM.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const spirit = fs.readFileSync(path.join(root, 'spirit.js'), 'utf8');
const H = 36e5;

function block(startMark, endMark) {
    const a = html.indexOf(startMark);
    assert.ok(a > 0, 'found ' + startMark);
    const b = html.indexOf(endMark, a);
    assert.ok(b > a, 'found the end of ' + startMark);
    return html.slice(a, b + endMark.length);
}
const STOP = block('/* LOWiSPIKE fasting stop (Oct 10, 2026): "I just ate" ends the fast.', 'window.LowiFastStop = {');
const CARD = block('/* ===== Fasting body status (Oct 8, 2026).', 'window.LOWI_FAST = {cardHTML, shows, stages:STAGES, refresh, hours:hrs};\n})();');

function stopSrc() {
    /* the module up to its export line, then the export closed the way the file closes it */
    const end = html.indexOf('\n})();', html.indexOf('window.LowiFastStop = {'));
    return html.slice(html.indexOf('/* LOWiSPIKE fasting stop (Oct 10, 2026): "I just ate"'), end) + '\nwindow.__body = body;\n})();';
}

function host(init) {
    const store = new Map(Object.entries(init || {}));
    const listeners = {}, docListeners = {}, toasts = [], sheets = [];
    const localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
    const document = {
        hidden: false, head: null, documentElement: { appendChild() {} }, activeElement: null,
        addEventListener: (n, f) => { (docListeners[n] = docListeners[n] || []).push(f); },
        getElementById: () => null, querySelectorAll: () => [], querySelector: () => null,
        createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, appendChild() {}, setAttribute() {} })
    };
    const win = {
        localStorage, document, Date, Math, JSON, console, CustomEvent: class { constructor(type, o) { this.type = type; this.detail = o && o.detail; } },
        setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, matchMedia: () => ({ matches: false }),
        addEventListener: (n, f) => { (listeners[n] = listeners[n] || []).push(f); },
        dispatchEvent: e => { (listeners[e.type] || []).forEach(f => f(e)); return true; },
        toast: t => toasts.push(t), sheet: h => sheets.push(h), closeSheet() {}, S: { td: { meals: 0 } }
    };
    win.window = win;
    const ctx = vm.createContext(win);
    vm.runInContext(stopSrc(), ctx);
    vm.runInContext(CARD, ctx);
    const fast = () => JSON.parse(store.get('lowi_fast_v1') || '{}');
    return { win, store, fast, toasts, sheets, emit: (n, d) => win.dispatchEvent(new win.CustomEvent(n, { detail: d })) };
}

/* the exact value the old code wrote: 8 PM yesterday (or today after 8 PM) */
function oldGuess(now) {
    const d = new Date(now || Date.now());
    if (d.getHours() < 20) d.setDate(d.getDate() - 1);
    d.setHours(20, 0, 0, 0);
    return d.getTime();
}

test('a new device with no meal: nothing is invented, every reader sees no fast', () => {
    const h = host();
    const F = h.win.LowiFastStop, C = h.win.LOWI_FAST;
    assert.strictEqual(F.startOf(), 0, 'no gap start');
    assert.strictEqual(C.hours(), 0, 'old card hours are 0, not 19');
    assert.strictEqual(C.shows({ meals: 0 }, []), false, 'the old Today fasting card stays hidden');
    assert.strictEqual(C.cardHTML({ meals: 0 }, []), '');
    C.refresh();
    assert.ok(!(+h.fast().last > 0), 'no last meal was written by reading or refreshing');
    assert.strictEqual(h.fast().noGuess, 1, 'the one-time cleanup is marked done');
});

test('the old code path is gone: no 8 PM default anywhere in the fasting modules', () => {
    assert.doesNotMatch(STOP + CARD, /setHours\(20,\s*0,\s*0,\s*0\);\s*s\.last\s*=/);
    assert.doesNotMatch(CARD, /if \(!s\.last \|\| s\.last > Date\.now\(\)\)/);
});

test('the Gap "Ate earlier" sheet with no meal known: no fake duration, no points, a plain question', () => {
    const h = host();
    const body = h.win.__body();
    assert.match(body, /When was your last meal\?/); /* Oct 28 decoupled: the bubble's start control */
    assert.match(body, /Last meal: now/);
    assert.doesNotMatch(body, /You fasted|end fast|XP/, 'nothing to end, nothing earned');
    h.win.LowiFastStop.open();
    assert.match(h.sheets.pop(), /Last meal/);
});

test('first meal via the Gap bubble starts the clock at that meal, with no points and an honest toast', () => {
    const h = host();
    const t0 = Date.now();
    const r = h.win.LowiFastStop.end(t0 - 30 * 60000, { quiet: false });
    assert.strictEqual(r.rec, null, 'no fast recorded');
    assert.strictEqual(r.x, 0, 'no XP');
    const f = h.fast();
    assert.strictEqual(f.last, t0 - 30 * 60000, 'the clock starts at the meal');
    assert.deepStrictEqual(f.hist, []);
    assert.match(h.toasts.pop(), /Eating break started at/);
    assert.ok(Math.abs(h.win.LOWI_FAST.hours() - 0.5) < 0.01, 'half an hour since that meal');
});

test('Oct 28 decoupled: a meal log or a ticked planned meal never starts the clock on a new device', () => {
    const h = host();
    h.emit('lowi:meal-logged', { id: 'm1', title: 'Eggs' });
    assert.strictEqual(h.win.LowiFastStop.mealTicked(), null);
    assert.ok(!(+h.fast().last > 0), 'no clock from eating');
    assert.strictEqual(h.win.LowiFastStop.startOf(), 0);
    assert.deepStrictEqual(h.fast().hist || [], []);
});

test('reload: the started clock survives, and nothing re-guesses it', () => {
    const h = host();
    h.win.LowiFastStop.end(Date.now() - 2 * H);
    const saved = h.store.get('lowi_fast_v1');
    const h2 = host({ lowi_fast_v1: saved });
    assert.strictEqual(h2.win.LowiFastStop.startOf(), JSON.parse(saved).last);
    assert.ok(Math.abs(h2.win.LOWI_FAST.hours() - 2) < 0.01);
});

test('cleanup: the untouched old 8 PM guess is set aside once (kept as guess), so the account shows no fast', () => {
    const g = oldGuess();
    const h = host({ lowi_fast_v1: JSON.stringify({ last: g, water: { x: 2 }, target: 16 }) });
    const f = h.fast();
    assert.ok(!(+f.last > 0), 'no fake start');
    assert.strictEqual(f.guess, g, 'the old value is kept, not destroyed');
    assert.strictEqual(f.target, 16, 'the goal stays');
    assert.deepStrictEqual(f.water, { x: 2 }, 'water stays');
    assert.strictEqual(h.win.LowiFastStop.startOf(), 0);
    assert.strictEqual(h.win.LOWI_FAST.hours(), 0);
});

test('cleanup runs once per device: a real 8 PM meal set later is never taken away', () => {
    const g = oldGuess();
    const h = host({ lowi_fast_v1: JSON.stringify({ last: g }) });
    h.win.LowiFastStop.end(g + 0); /* the person now says they ate at exactly 20:00 */
    const saved = h.store.get('lowi_fast_v1');
    assert.strictEqual(JSON.parse(saved).last, g);
    const h2 = host({ lowi_fast_v1: saved });
    assert.strictEqual(h2.win.LowiFastStop.startOf(), g, 'kept after reload');
});

test('genuine data is never touched: logged fasts, start edits, paid points, or any other time', () => {
    const now = Date.now(), g = oldGuess(now);
    const cases = [
        { last: g, hist: [{ s: g - 20 * H, e: g - 4 * H, h: 16, xp: 52 }] },
        { last: g, startEdit: { from: g - H, to: g, at: now - H } },
        { last: g, awarded: g - 24 * H },
        { last: now - 3 * H - 17 * 60000 },
        { last: new Date(g).setHours(19, 0, 0, 0) },
        { last: g + 1 }
    ];
    for (const c of cases) {
        const h = host({ lowi_fast_v1: JSON.stringify(c) });
        assert.strictEqual(h.fast().last, c.last, 'kept: ' + JSON.stringify(c));
        assert.strictEqual(h.fast().guess, undefined);
    }
});

test('an existing real fast still ends with its points (rules unchanged)', () => {
    const now = Date.now();
    const h = host({ lowi_fast_v1: JSON.stringify({ last: now - 13 * H - 5 * 60000, target: 16 }) });
    const r = h.win.LowiFastStop.end(now, { reward: false, quiet: true });
    assert.ok(r.rec, 'recorded');
    assert.ok(r.x > 0, 'points for the real fast');
    assert.strictEqual(h.fast().last, now);
    assert.strictEqual(h.fast().hist.length, 1);
});

test('a future last meal (clock moved) is not treated as a running fast by the old card', () => {
    const h = host({ lowi_fast_v1: JSON.stringify({ last: Date.now() + 5 * H, noGuess: 1 }) });
    assert.strictEqual(h.win.LOWI_FAST.hours(), 0);
    assert.strictEqual(h.win.LOWI_FAST.shows({ meals: 0 }, []), false);
});

test('Gap bubble empty state on Home: no number and no "start a fast" push, short enough for the 70 px ring bubble', () => {
    const m = spirit.match(/noFast: \[([^\]]+)\]/);
    assert.ok(m, 'noFast copy present');
    const words = m[1].split(',').map(x => x.trim().replace(/^'|'$/g, ''));
    assert.strictEqual(words.length, 3, 'EN, DE, ES');
    for (const x of words) {
        assert.doesNotMatch(x, /Start a fast|Fasten starten|Empezar ayuno|\d/);
        assert.ok(x.length <= 3, 'fits the bubble: ' + x);
    }
});

test('the sheet copy for no known meal exists in EN, DE and ES', () => {
    for (const k of ['title0', 'none', 'first', 'btn0Now', 'btn0At', 'started']) {
        assert.strictEqual((STOP.match(new RegExp('\\b' + k + ':"', 'g')) || []).length, 3, k + ' in 3 languages');
    }
});
