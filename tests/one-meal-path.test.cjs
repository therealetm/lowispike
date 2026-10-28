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

/* Oct 28, 2026 (Emmanuel): "Entkopple den Fastentimer komplett vom Essen. Scans, Community-Posts oder Fotos dürfen den Timer nicht
   mehr triggern. Die Steuerung läuft ausschließlich über eine Bubble: 'Letzte Mahlzeit' zum Starten und 'Erste Mahlzeit' zum Beenden.
   Die aktuelle Anzeige während des Laufens bleibt unverändert." The tests below replace the Oct 21 one-meal-path rule (a meal log
   ended the fast) with that decision. Meals still go through one door (wiring test below); they just never touch the timer. */
const decoupled = (startedAt) => ({ lowi_fast_v1: JSON.stringify({ last: startedAt, hist: [], v2: 1 }) });

test('decoupled: a photo, typed, barcode, plan or posted meal during a 16 h fast changes nothing on the timer', () => {
    const start = Date.now() - 16 * H, h = host(decoupled(start));
    const before = h.fast();
    for (const via of ['photo', 'manual', 'barcode', 'plan', 'post', 'community']) h.emit('lowi:meal-logged', { id: 'm-' + via, title: 'Food', via, ts: Date.now() });
    h.win.LowiFastStop.mealTicked();
    assert.deepStrictEqual(h.fast(), before, 'state untouched');
    assert.strictEqual(h.win.LowiFastStop.startOf(), start, 'the timer still runs from the same start');
    assert.strictEqual(fastAwards(h).length, 0, 'no points from a meal');
    assert.strictEqual(h.bonuses.length, 0);
});

test('decoupled: a meal moved or deleted never moves, restores or re-scores the timer', () => {
    const start = Date.now() - 10 * H, h = host(decoupled(start));
    const before = h.fast();
    assert.strictEqual(h.win.LowiFastStop.remeal('m1', Date.now() - 2 * H, Date.now()), null);
    assert.strictEqual(h.win.LowiFastStop.unmeal('m1', Date.now()), false);
    h.emit('lowi:meal-moved', { id: 'm1', ts: Date.now() - 2 * H, oldTs: Date.now() });
    h.emit('lowi:meal-deleted', { id: 'm1', ts: Date.now() });
    assert.deepStrictEqual(h.fast(), before);
    assert.strictEqual(h.win.LowiFastStop.mealList().length, 0, 'Gap > Zeit ändern never moves a meal (fast-edit gets no meals)');
});

test('"Erste Mahlzeit" ends a running fast: one record, points once, and the timer stops until "Letzte Mahlzeit"', () => {
    const start = Date.now() - 16 * H, h = host(decoupled(start));
    const r = h.win.LowiFastStop.end(Date.now() - 5 * MIN, { reward: false });
    assert.ok(r && r.rec, 'the fast is recorded');
    const f = h.fast();
    assert.strictEqual(f.hist.length, 1);
    assert.strictEqual(f.hist[0].s, start);
    assert.strictEqual(f.off, 1, 'stopped');
    assert.strictEqual(h.win.LowiFastStop.startOf(), 0, 'no timer runs after the first meal');
    assert.strictEqual(fastAwards(h).length, 1);
    h.emit('lowi:meal-logged', { id: 'm', title: 'Lunch', via: 'photo', ts: Date.now() });
    assert.strictEqual(h.win.LowiFastStop.startOf(), 0, 'eating afterwards does not start it either');
});

test('"Letzte Mahlzeit" starts the timer at the chosen time, never before the last fast ended, no points', () => {
    const h = host({ lowi_fast_v1: JSON.stringify({ last: Date.now() - 20 * H, hist: [{ s: Date.now() - 20 * H, e: Date.now() - 4 * H, h: 16 }], off: 1, v2: 1 }) });
    assert.strictEqual(h.win.LowiFastStop.startOf(), 0);
    const at = Date.now() - 30 * MIN;
    assert.notStrictEqual(h.win.LowiFastStop.firstMeal(at), false);
    assert.strictEqual(h.win.LowiFastStop.startOf(), at);
    assert.ok(!h.fast().off);
    assert.strictEqual(fastAwards(h).length, 0);
    const h2 = host({ lowi_fast_v1: JSON.stringify({ last: Date.now() - 20 * H, hist: [{ s: Date.now() - 20 * H, e: Date.now() - 1 * H, h: 19 }], off: 1, v2: 1 }) });
    h2.win.LowiFastStop.firstMeal(Date.now() - 3 * H);
    assert.strictEqual(h2.win.LowiFastStop.startOf(), h2.fast().hist[0].e, 'clamped to the end of the last fast');
    assert.strictEqual(h2.win.LowiFastStop.firstMeal(Date.now()), false, 'a running timer is not restarted by a second tap');
});

test('a running gap from before the update keeps showing the same time (one-time move, no meal read after it)', () => {
    const mealAt = Date.now() - 3 * H - 12 * MIN;
    const h = host({ lowi_fast_v1: JSON.stringify({ last: Date.now() - 30 * H, hist: [] }) }, { logs: [{ id: 'd', t: 'Dinner', ts: mealAt }] });
    assert.strictEqual(h.win.LowiFastStop.startOf(), mealAt, 'the display the user saw (from the last meal) stays');
    assert.strictEqual(h.fast().v2, 1);
    h.win.S.logs.push({ id: 'n', t: 'Snack', ts: Date.now() - 10 * MIN });
    assert.strictEqual(h.win.LowiFastStop.startOf(), mealAt, 'a later meal does not move it any more');
    const old = host({ lowi_fast_v1: JSON.stringify({ last: Date.now() - 9 * 24 * H, hist: [] }) });
    assert.strictEqual(old.win.LowiFastStop.startOf(), 0, 'a clock untouched for over a week is stopped, not a 216 h fast');
});

test('the bubble sheet: stopped = "Letzte Mahlzeit", running = "Erste Mahlzeit", no meal logging chained to it', () => {
    const run = host(decoupled(Date.now() - 14 * H)).win.LowiFastStop, stop = host({ lowi_fast_v1: JSON.stringify({ last: 1, hist: [], off: 1, v2: 1 }) }).win.LowiFastStop;
    assert.ok(run.w('btnNow') === 'First meal: now' && stop.w('btn0Now') === 'Last meal: now');
    assert.match(html, /btnNow:"Erste Mahlzeit: jetzt", btnAt:"Erste Mahlzeit um \{t\}", title:"Erste Mahlzeit"/);
    assert.match(html, /title0:"Letzte Mahlzeit", none:"Wann war deine letzte Mahlzeit\?/);
    assert.match(html, /title0:"Última comida"/);
    assert.match(html, /if \(!startOf\(\)\) \{ const at = SEL \|\| Date\.now\(\); if \(firstMeal\(at\) !== false\)/);
    assert.match(html, /else \{ const r = end\(SEL \|\| Date\.now\(\), inGap \? \{keep:true\} : \{\}\);/, 'no {chain:true}: ending opens no Log meal (on the Essenspause screen it keeps that screen open)');
    assert.strictEqual(run.mealNote(), '', 'Log meal no longer says saving ends the fast');
});

test('wiring: every meal log carries its time, one listener applies the rule, the bonus memory is shared, the scanner has one meal door', () => {
    assert.match(html, /slot:log\.slot\|\|"",ts:log\.ts,ateSet:!!log\.ateSet\}\}\)\);return\{log,xp,why/, 'logMeal tells the rule when the meal was eaten');
    assert.match(html, /via:"plan",photo:false,spike,ts:log\.ts\}/, 'planned meals too');
    assert.match(html, /window\.addEventListener\("lowi:meal-logged", ev => \{ try \{ mealLogged\(ev && ev\.detail\); \}/);
    assert.ok(!/addEventListener\("lowi:meal-logged", \(\) => \{ try \{ firstMeal\(/.test(html), 'the old start-only listener is gone');
    assert.match(html, /function bonusFor\(rec\)\{ if \(!rec \|\| !rec\.s \|\| bonusDone\(rec\.s\)\) return 0;/);
    assert.match(html, /if \(fast && !d\.spike && !d\.dup\) bonusFor\(fast\); \};/, 'the I-just-ate chain pays through the same memory');
    assert.match(html, /window\.LowiF2 = \{start, finish, bonusFor,/);
    assert.match(html, /act\("scan", IC\.bc, true\) \+ act\("photo", IC\.cam, false\) \+ '<\/div>'/, 'scanner (Oct 28 call): Barcode | Essen-Foto on one camera; a meal is logged only by "Als gegessen eintragen"');
    assert.ok(!/act\("meal", IC\.plate\)/.test(html), 'Log meal left the scanner');
    assert.match(html, /\(bx \? '<br>' \+ esc\(w\("brk"\)\)/, 'the reward shows the break-fast bonus when a meal ended the fast');
    for (const k of ['byMeal:"Your meal ended the fast"', 'byMeal:"Deine Mahlzeit hat das Fasten beendet"', 'byMeal:"Tu comida terminó el ayuno"']) assert.ok(html.includes(k), k);
    // Oct 27 calm Log meal sheet: one screen; the fast line is small grey text under Save, for the time on the clock
    assert.match(spirit, /tr\(mealSlot === 'snack' \? 'lmSnackSave' : 'save'\)\) \+ '<\/button>' \+ \(gc \? '' : fastNote\(at\)\)/, 'the sheet shows the fast line under Save (not in the Gap chain, the fast already ended there)');
    assert.match(spirit, /LowiFastStop\.mealNote\(at \|\| 0\)[\s\S]{0,80}note\.textContent = n; note\.hidden = !n;/, 'a time picked on the clock updates the fast line');
    assert.match(css, /\.sp-fast-note \{[^}]*border: 1px solid var\(--ms-line-soft/, 'brand-line border, not white');
});
