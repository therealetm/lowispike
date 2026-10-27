// Oct 23, 2026 (E-man, voice): "after I ate something, you can clearly see that even one meal, yet the gap didn't reset
// automatically. That mechanism needs to be in there." Screenshot 12:58: Log meal said Breakfast "1 logged today" and still
// "Saving this closes your 14 h 58 min meal gap". Root cause: the catch-up rule skipped a Breakfast logged after 11:00.
// These tests run the real fasting module (index.html) in a small VM with the meals list beside it.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const spirit = fs.readFileSync(path.join(root, 'spirit.js'), 'utf8');
const bridge = html;
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
    const listeners = {}, toasts = [], awards = [], bonuses = [], paid = new Set(), paidEv = new Set(), unawards = [];
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
        award: (x, label, el, src, ev) => { if (ev && paidEv.has(ev)) return 0; if (ev) paidEv.add(ev); awards.push({ x, label, src, ev }); return x; },
        LowiVitalsBridge: { unaward: ev => { unawards.push(ev); paidEv.delete(ev); const i = awards.findIndex(a => a.ev === ev); if (i >= 0) awards.splice(i, 1); return 1; } },
        /* the F2 bonus memory, as bonusFor keeps it: once per fast start */
        LowiF2: { bonusFor: rec => { bonuses.push(rec.s); if (paid.has(rec.s)) return 0; paid.add(rec.s); return 10; } }
    };
    win.window = win;
    const ctx = vm.createContext(win);
    vm.runInContext(stopSrc(), ctx);
    const fast = () => JSON.parse(store.get('lowi_fast_v1') || '{}');
    return { win, fast, toasts, awards, bonuses, paid, unawards, logs: win.S.logs, emit: (n, d) => win.dispatchEvent(new win.CustomEvent(n, { detail: d })) };
}
const running = (startedAt) => ({ lowi_fast_v1: JSON.stringify({ last: startedAt, hist: [] }) });
const fastAwards = h => h.awards.filter(a => a.src === 'r3a_fast');


/* the app's own order: the meal goes into S.logs, then lowi:meal-logged fires */
const day = ts => { const d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
function logMeal(h, id, ts, slot) { h.logs.push({ id, eventId: 'meal:' + id, t: 'Food ' + id, ts, day: day(ts), slot: slot || 'meal' }); h.emit('lowi:meal-logged', { id: 'meal:' + id, ts, slot: slot || 'meal' }); }
function removeMeal(h, id) { const i = h.logs.findIndex(l => l.id === id), l = h.logs[i]; h.logs.splice(i, 1); h.emit('lowi:meal-removed', { id: l.eventId, ts: l.ts }); }
function moveMeal(h, id, ts) { const l = h.logs.find(l => l.id === id), old = l.ts; l.ts = ts; h.emit('lowi:meal-moved', { id: l.eventId, ts, oldTs: old }); }
const start = h => h.win.LowiFastStop.startOf(h.fast());
const today = (hh, mm) => { const d = new Date(); d.setHours(hh, mm || 0, 0, 0); return d.getTime(); };

/* E-man, Oct 23, 12:58: Log meal said Breakfast "1 logged today" and still "Saving this closes your 14 h 58 min meal gap" */
test('the Oct 23 bug: a meal picked as Breakfast after 11:00 closes the gap at once (no catch-up rule)', () => {
    const now = Date.now(), s0 = now - (14 * H + 58 * MIN), h = host(running(s0));
    logMeal(h, 'a', now, 'breakfast');
    assert.strictEqual(start(h), now, 'the Gap restarts at 0 from the meal');
    assert.strictEqual(h.fast().hist.length, 1);
    assert.strictEqual(fastAwards(h).length, 1, 'fast points once');
    assert.strictEqual(h.win.LowiFastStop.mealNote(), '', 'Log meal no longer offers to close a gap that just closed');
});

test('a snack closes the gap too (the app has no rule that keeps a fast going for a snack)', () => {
    const now = Date.now(), h = host(running(now - 6 * H));
    logMeal(h, 's', now - 2 * MIN, 'snack');
    assert.strictEqual(start(h), now - 2 * MIN);
});

test('a meal that reached this device without the event (another device, an old direct log) still moves the Gap, without paying points', () => {
    const now = Date.now(), s0 = now - 15 * H, h = host(running(s0));
    h.logs.push({ id: 'x', eventId: 'meal:x', t: 'Rice', ts: now - 30 * MIN, day: day(now - 30 * MIN), slot: 'meal' });
    assert.strictEqual(start(h), now - 30 * MIN, 'the Gap reads the newest meal');
    assert.strictEqual(fastAwards(h).length, 0, 'no points from just looking');
    assert.ok(!/15 h/.test(h.win.LowiFastStop.mealNote()), 'Log meal no longer offers to close the 15 h gap');
});

test('the Gap shows the newest meal, also a second plate in the same sitting, and pays only once', () => {
    const now = Date.now(), s0 = now - 16 * H, h = host(running(s0));
    logMeal(h, 'a', now - 20 * MIN); logMeal(h, 'b', now - 5 * MIN);
    assert.strictEqual(start(h), now - 5 * MIN);
    assert.strictEqual(h.fast().hist.length, 1);
    assert.strictEqual(fastAwards(h).length, 1);
});

test('removing the latest meal (long-press undo, Log meal list) puts the Gap back on the meal before it and takes its fast points back', () => {
    const now = Date.now(), s0 = now - 18 * H, h = host(running(s0));
    logMeal(h, 'a', now - 6 * H);            /* ends the 12 h fast */
    logMeal(h, 'b', now - 10 * MIN);         /* ends a 5 h 50 gap */
    assert.strictEqual(start(h), now - 10 * MIN);
    assert.strictEqual(h.fast().hist.length, 2);
    removeMeal(h, 'b');
    assert.strictEqual(start(h), now - 6 * H, 'back to the meal before');
    assert.strictEqual(h.fast().hist.length, 1, 'the record that meal made is gone');
    assert.ok(h.unawards.includes('fast:' + (now - 6 * H)), 'its fast points are taken back');
    removeMeal(h, 'a');
    assert.strictEqual(start(h), s0, 'and back to the start before that');
    assert.strictEqual(h.fast().hist.length, 0);
    assert.strictEqual(fastAwards(h).length, 0, 'nothing left paid');
    logMeal(h, 'c', now);
    assert.strictEqual(fastAwards(h).length, 1, 'eating again pays that fast once, not twice');
    assert.strictEqual(h.fast().hist.length, 1);
});

test('removing a meal in the same sitting keeps the fast ended at the other plate, paid once', () => {
    const now = Date.now(), s0 = now - 16 * H, h = host(running(s0));
    logMeal(h, 'a', now - 20 * MIN); logMeal(h, 'b', now - 5 * MIN);
    removeMeal(h, 'a');
    assert.strictEqual(start(h), now - 5 * MIN);
    assert.strictEqual(h.fast().hist.length, 1);
    assert.strictEqual(fastAwards(h).length, 1, 'one payment, now for the fast that ended at the remaining plate');
});

test('editing the time of the latest meal moves the Gap and re-scores that fast once', () => {
    const now = Date.now(), s0 = now - 16 * H, h = host(running(s0));
    logMeal(h, 'a', now - 5 * MIN);
    moveMeal(h, 'a', now - 2 * H);
    assert.strictEqual(start(h), now - 2 * H, 'the Gap follows the edited time');
    assert.strictEqual(h.fast().hist.length, 1);
    assert.strictEqual(h.fast().hist[0].e, now - 2 * H);
    assert.strictEqual(fastAwards(h).length, 1, 'still paid once');
});

test('restart: the Gap comes from what is saved (the fast state and the meals), nothing cached', () => {
    const now = Date.now(), init = running(now - 15 * H), h = host(init);
    logMeal(h, 'a', now - MIN);
    const saved = h.fast(), h2 = host({ lowi_fast_v1: JSON.stringify(saved) }, { logs: h.logs.slice() });
    assert.strictEqual(start(h2), now - MIN);
});

test('wiring: delete and edit in the meal store tell the Gap, editing never pays XP again', () => {
    assert.match(bridge, /new CustomEvent\("lowi:meal-removed",\{detail:\{id:log\.eventId\|\|log\.id,ts:\+log\.ts\|\|0\}\}\)/);
    assert.match(bridge, /new CustomEvent\("lowi:meal-moved",\{detail:\{id:log\.eventId\|\|log\.id,ts:log\.ts,oldTs:\+previous\.ts\|\|0\}\}\)/);
    assert.match(bridge, /return\{log,xp:0,moved:!!moved\};/);
    assert.match(bridge, /award\(p\.x, w\("label", \{h:Math\.floor\(hours\)\}\), null, "r3a_fast", "fast:" \+ start\)/);
    assert.match(bridge, /award\(BONUS, w\("xpBreak"\), null, "f2_break", "f2_break:" \+ F\.fast\.s\)/);
});

test('Log meal: Meal / Snack tiles, today\'s entries with time and photo, tap to edit (add more, time, remove), three languages', () => {
    /* Oct 27 calm Log meal sheet: today's entries sit in one quiet "Heute · n" fold, opened again after an edit */
    assert.match(spirit, /'<details class="lm-today"' \+ \(back \? ' open' : ''\) \+ '><summary>' \+ esc\(tr\('lmToday'\)\.replace\('\{n\}', logs\.length\)\) \+ '<\/summary>' \+ todayList\(logs\) \+ '<\/details>'/);
    assert.match(spirit, /data-sp="todayEdit"/);
    assert.match(spirit, /else if \(a === 'todayEdit'\) editToday\(b\.dataset\.id\);/);
    assert.match(spirit, /e\.target\.id === 'spEdit'/);
    assert.match(spirit, /const r = V\.editMeal\(data\);/, 'an edit updates the same meal');
    assert.ok(!/editToday[\s\S]{0,4000}V\.logMeal\(/.test(spirit.slice(spirit.indexOf('function editToday'), spirit.indexOf('async function delToday'))), 'editing never logs a new meal');
    for (const k of ['kMeal', 'kSnack', 'todayH', 'editH', 'editAdd', 'editAddPh', 'editTime', 'editSave', 'editDel', 'editDelSure', 'editDone', 'editGone', 'editFuture'])
        assert.match(spirit, new RegExp(k + ": \\['[^']+', '[^']+', '[^']+'\\]"), k + ' in English, German, Spanish');
    /* the Today list styles live in meal-journal.css (already linked and precached), so no extra <link> or precache line */
    const css = fs.readFileSync(path.join(root, 'meal-journal.css'), 'utf8');
    assert.match(css, /\.sp-td \{[^}]*border-radius: 999px;/);
    assert.match(html, /<link rel="stylesheet" href="meal-journal\.css\?v=/);
});
