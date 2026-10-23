// Oct 21, 2026 (E-man): "I'm eating, and I went to the scanner, and then I went to snap photo. I should have probably went to log meal.
// That's the confusing part. We have scanner and snap photo. We also have log meal. And then we also have the gap with the fasting...
// If I click on 'I just ate' it gives me points. And then it says 'log meal'... Find a strategy."
// The strategy: eating is one event. Every meal log (Log meal typed / recent / Snap photo, barcode "Ate it, log it", a planned meal
// ticked) goes through one rule in LowiFastStop.mealLogged: a running fast ends at the meal's time with its points once, and the
// +10 break-fast bonus once. "I just ate" is the same thing from the Gap side. These tests run the real fasting module in a small VM.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const spirit = fs.readFileSync(path.join(root, 'spirit.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'scan-screens.css'), 'utf8');
const H = 36e5, MIN = 6e4;

function stopSrc() {
    const a = html.indexOf('/* LOWiSPIKE fasting stop (Oct 10, 2026): "I just ate"');
    assert.ok(a > 0, 'found the fasting stop module');
    const end = html.indexOf('\n})();', html.indexOf('window.LowiFastStop = {'));
    return html.slice(a, end) + '\n})();';
}

function host(init, opts) {
    opts = opts || {};
    const store = new Map(Object.entries(init || {}));
    const listeners = {}, toasts = [], awards = [], bonuses = [], paid = new Set();
    const localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
    const document = {
        hidden: false, head: null, body: { appendChild() {} }, documentElement: { appendChild() {} }, activeElement: null,
        addEventListener() {}, getElementById: () => null, querySelectorAll: () => [], querySelector: () => null,
        createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, appendChild() {}, setAttribute() {}, querySelector: () => null, addEventListener() {} })
    };
    const win = {
        localStorage, document, Date, Math, JSON, console, CustomEvent: class { constructor(type, o) { this.type = type; this.detail = o && o.detail; } },
        setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, matchMedia: () => ({ matches: false }),
        addEventListener: (n, f) => { (listeners[n] = listeners[n] || []).push(f); },
        dispatchEvent: e => { (listeners[e.type] || []).forEach(f => f(e)); return true; },
        toast: t => toasts.push(t), closeSheet() {}, S: { td: { meals: 0 }, logs: opts.logs || [] },
        award: (x, label, ev, src) => awards.push({ x, label, src }),
        /* the F2 bonus memory, as bonusFor keeps it: once per fast start */
        LowiF2: { bonusFor: rec => { bonuses.push(rec.s); if (paid.has(rec.s)) return 0; paid.add(rec.s); return 10; } }
    };
    win.window = win;
    const ctx = vm.createContext(win);
    vm.runInContext(stopSrc(), ctx);
    const fast = () => JSON.parse(store.get('lowi_fast_v1') || '{}');
    return { win, fast, toasts, awards, bonuses, paid, emit: (n, d) => win.dispatchEvent(new win.CustomEvent(n, { detail: d })) };
}
const running = (startedAt) => ({ lowi_fast_v1: JSON.stringify({ last: startedAt, hist: [] }) });
const fastAwards = h => h.awards.filter(a => a.src === 'r3a_fast');

test('a photo meal logged during a 16 h fast ends it at the meal time: one record, fast points once, break-fast bonus once', () => {
    const start = Date.now() - 16 * H, h = host(running(start));
    h.emit('lowi:meal-logged', { id: 'm1', title: 'Chicken salad', via: 'photo', slot: '', ts: Date.now() });
    const f = h.fast();
    assert.strictEqual(f.hist.length, 1, 'the fast is recorded');
    assert.strictEqual(f.hist[0].s, start);
    assert.strictEqual(f.awarded, start, 'the once-per-fast guard is the same one "I just ate" sets');
    assert.ok(f.last >= Date.now() - MIN, 'the gap clock now runs from the meal');
    assert.strictEqual(fastAwards(h).length, 1, 'fast points paid once');
    assert.ok(fastAwards(h)[0].x > 0);
    assert.deepStrictEqual(h.bonuses, [start], 'break-fast bonus asked once, for that fast');
});

test('more food in the same sitting (a second photo, a drink) does not end anything again or pay again', () => {
    const start = Date.now() - 16 * H, h = host(running(start));
    h.emit('lowi:meal-logged', { id: 'm1', title: 'Pasta', via: 'manual', ts: Date.now() - 10 * MIN });
    const after = h.fast();
    h.emit('lowi:meal-logged', { id: 'm2', title: 'Juice', via: 'photo', ts: Date.now() });
    h.emit('lowi:meal-logged', { id: 'm3', title: 'Bar', via: 'barcode', ts: Date.now() });
    assert.deepStrictEqual(h.fast(), after, 'nothing changed after the first meal');
    assert.strictEqual(fastAwards(h).length, 1);
    assert.strictEqual(h.bonuses.length, 1);
});

test('"I just ate" right after a meal already ended the fast: nothing changes, no second Log meal, says it is already logged', () => {
    const start = Date.now() - 16 * H, mealAt = Date.now() - 5 * MIN;
    const h = host(running(start), { logs: [{ id: 'm1', t: 'Omelette', ts: mealAt }] });
    h.emit('lowi:meal-logged', { id: 'm1', title: 'Omelette', via: 'manual', ts: mealAt });
    const before = h.fast();
    const r = h.win.LowiFastStop.end(Date.now(), { chain: true });
    assert.ok(r && r.already, 'recognised as the meal just logged');
    assert.deepStrictEqual(h.fast(), before, 'clock and history untouched');
    assert.strictEqual(fastAwards(h).length, 1, 'no second fast points');
    assert.ok(h.toasts.some(t => /Already logged: Omelette/.test(t)), 'tells the user');
});

test('"I just ate" first, then Log meal: the meal belongs to that sitting, the fast is not ended or paid twice', () => {
    const start = Date.now() - 14 * H, h = host(running(start));
    const r = h.win.LowiFastStop.end(Date.now() - 2 * MIN, { chain: true, reward: false });
    assert.ok(r && r.rec, 'I just ate ended the fast');
    h.emit('lowi:meal-logged', { id: 'm1', title: 'Soup', via: 'manual', ts: Date.now() });
    assert.strictEqual(h.fast().hist.length, 1);
    assert.strictEqual(fastAwards(h).length, 1);
    assert.strictEqual(h.bonuses.length, 0, 'the bonus here is the chain\'s own (LowiF2.start), keyed on the same fast start');
});

test('gapfix (Oct 23): breakfast logged at 12:58 closes the gap like any meal (no catch-up rule any more)', () => {
    const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(12, 58, 0, 0);
    const at = d.getTime(), start = at - (14 * H + 58 * MIN), h = host(running(start));
    h.emit('lowi:meal-logged', { id: 'meal:b', title: 'Oats', slot: 'breakfast', ts: at });
    assert.strictEqual(h.fast().last, at, 'the gap restarts from the breakfast');
    assert.strictEqual(h.fast().hist.length, 1, 'the 14 h 58 min fast is recorded');
    assert.strictEqual(fastAwards(h).length, 1);
    assert.ok(h.win.LowiFastStop.catchUp('breakfast', at) === false);
});

test('a high-spike meal still ends the fast (you ate) and pays the fast points, but no break-fast bonus', () => {
    const start = Date.now() - 18 * H, h = host(running(start));
    h.emit('lowi:meal-logged', { id: 'm', title: 'Donuts', via: 'photo', spike: 'high', ts: Date.now() });
    assert.strictEqual(h.fast().hist.length, 1);
    assert.strictEqual(fastAwards(h).length, 1);
    assert.strictEqual(h.bonuses.length, 0);
});

test('a meal under 4 h after the last one restarts the gap clock without fast points; a meal time before the clock start changes nothing', () => {
    const start = Date.now() - 2 * H, h = host(running(start));
    h.emit('lowi:meal-logged', { id: 's', title: 'Apple', ts: Date.now() });
    assert.ok(h.fast().last >= Date.now() - MIN, 'clock restarts from the snack');
    assert.strictEqual(h.fast().hist.length, 0);
    assert.strictEqual(fastAwards(h).length, 0);
    const h2 = host(running(Date.now() - 3 * H));
    h2.emit('lowi:meal-logged', { id: 'x', title: 'Old', ts: Date.now() - 5 * H });
    assert.strictEqual(h2.fast().hist.length, 0);
});

test('ticking a planned meal follows the same rule and never doubles with its own meal-logged event', () => {
    const start = Date.now() - 12 * H, h = host(running(start));
    h.emit('lowi:meal-logged', { id: 'p', title: 'Plan meal', via: 'plan', ts: Date.now() });
    h.win.LowiFastStop.mealTicked();
    assert.strictEqual(h.fast().hist.length, 1);
    assert.strictEqual(fastAwards(h).length, 1);
});

test('Log meal says what saving does while a fast runs', () => {
    const L = host(running(Date.now() - 16 * H)).win.LowiFastStop;
    assert.match(L.mealNote(), /^Saving this closes your 16 h.* meal gap · \+\d+ XP$/);
    assert.match(host(running(Date.now() - 2 * H)).win.LowiFastStop.mealNote(), /restarts your gap clock/);
    assert.strictEqual(host({}).win.LowiFastStop.mealNote(), '', 'no fast, no line');
    assert.strictEqual(host(running(Date.now() - 5 * MIN)).win.LowiFastStop.mealNote(), '', 'same sitting, no line');
});

test('wiring: every meal log carries its time, one listener applies the rule, the bonus memory is shared, the scanner has one meal door', () => {
    assert.match(html, /slot:log\.slot\|\|"",ts:log\.ts,ateSet:!!log\.ateSet\}\}\)\);return\{log,xp,why/, 'logMeal tells the rule when the meal was eaten');
    assert.match(html, /via:"plan",photo:false,spike,ts:log\.ts\}/, 'planned meals too');
    assert.match(html, /window\.addEventListener\("lowi:meal-logged", ev => \{ try \{ mealLogged\(ev && ev\.detail\); \}/);
    assert.ok(!/addEventListener\("lowi:meal-logged", \(\) => \{ try \{ firstMeal\(/.test(html), 'the old start-only listener is gone');
    assert.match(html, /function bonusFor\(rec\)\{ if \(!rec \|\| !rec\.s \|\| bonusDone\(rec\.s\)\) return 0;/);
    assert.match(html, /if \(fast && !d\.spike && !d\.dup\) bonusFor\(fast\); \};/, 'the I-just-ate chain pays through the same memory');
    assert.match(html, /window\.LowiF2 = \{start, finish, bonusFor,/);
    assert.match(html, /act\("scan", IC\.bc, true\) \+ '<\/div>'/, 'scanner (Oct 21 Scan / Fuel / Gap): Barcode only, meals are logged in Fuel');
    assert.ok(!/act\("meal", IC\.plate\)/.test(html), 'Log meal left the scanner');
    assert.match(html, /\(bx \? '<br>' \+ esc\(w\("brk"\)\)/, 'the reward shows the break-fast bonus when a meal ended the fast');
    for (const k of ['byMeal:"Your meal ended the fast"', 'byMeal:"Deine Mahlzeit hat das Fasten beendet"', 'byMeal:"Tu comida terminó el ayuno"']) assert.ok(html.includes(k), k);
    assert.match(spirit, /\(gc \? '' : fastNote\(\)\)/, 'slot picker shows the fast line (not in the Gap chain, the fast already ended there)');
    assert.match(spirit, /tr\('slotSnap'\)\) \+ '<\/span><\/button><\/div>' \+ whenRow\(\) \+ fastNote\(whenAt\(\)\)/, 'the Write / Scan / Snap sheet too, after "When did you eat?" (Oct 21)');
    assert.match(css, /\.sp-fast-note \{[^}]*border: 1px solid var\(--ms-line-soft/, 'brand-line border, not white');
});
