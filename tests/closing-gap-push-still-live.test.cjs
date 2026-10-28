'use strict';
/* BH-037 (bug hunt run 37, 26 Oct 2026, pattern P-CLOSING-STILL-LIVE, siblings of BH-036): Gap (gap-view.js) and the one-time
   notification ask card (lis-push.js) fade out for 260 ms after a tap closes them and stayed clickable while fading. Found by playing
   the live build 20261026-091603 (BUGHUNT/playtest/probe-gap-dbl.cjs, Chromium 390, mock cloud):
   - a double tap on Gap's "Log a meal in Fuel" ran Log meal twice (meal() x2);
   - a double tap on "Not now" on the ask card saved two "not now"s (lowi.pushAsk no=2), and two mean the app never asks again,
     instead of asking once more after 7 days; a double tap on Yes asked the system twice.
   Rule: a closing Gap ignores taps and one card takes one choice; the real tap that closes either is marked spent
   (LowiFreshScrim.spent), so the 2nd tap of a double tap presses nothing under it. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

/* a tiny element with a parent chain, data-gv lookups and contains() */
function node(parent, gv) {
    return { parentNode: parent || null, dataset: gv ? { gv } : {},
        contains(m) { for (let c = m; c; c = c.parentNode) if (c === this) return true; return false; },
        closest(sel) { for (let c = this; c; c = c.parentNode) if (sel === '[data-gv]' && c.dataset && c.dataset.gv) return c; return null; } };
}
/* Gap's real onClick (and the spend() helper above it), cut out of gap-view.js and run against stubs */
function gap() {
    const src = read('gap-view.js');
    const j = src.indexOf('\n    function onClick(e) {'), s = src.lastIndexOf('\n    function spend(e)', j), end = src.indexOf('\n    }\n', j);
    assert.ok(j > 0 && end > j, 'gap-view.js: onClick() found');
    const i = s > 0 && j - s < 200 ? s : j;
    const calls = [], timers = [];
    const W = { LowiSpirit: { meal() { calls.push('MEAL'); } }, lowiOpen(k) { calls.push('OPEN ' + k); }, LowiFastEdit: { open() { calls.push('FIX'); } },
        LowiFreshScrim: { spent(e) { calls.push('spent'); e.spentMark = true; } } };
    const ctx = { W, Date, console, el: null, openedAt: 0, mcSel: -1, calls, setTimeout(f) { timers.push(f); },
        model: () => ({ mcCur: 0 }), mcPick(n) { calls.push('pick ' + n); }, sayToggle(n) { calls.push('say ' + n); }, sayNextRate() { calls.push('rate'); } };
    ctx.edit = () => W.LowiFastEdit.open(); /* Oct 28 batch 3: "Zeit ändern" opens the inline editor through edit() */
    ctx.close = function () { calls.push('close'); ctx.setEl(null); }; /* close() lets go of the element, as the real one does */
    vm.runInNewContext(src.slice(i, end + 6) + '\nthis.onClick = onClick; this.setEl = v => { el = v; };', ctx);
    const ov = node(null), card = node(ov), log = node(card, 'log'), x = node(card, 'close'), move = node(card, 'move'), fix = node(card, 'fix'), say = node(card, 'mcsay');
    ctx.setEl(ov);
    const tap = t => { const e = { target: t, isTrusted: true }; ctx.onClick(e); return e; };
    const flush = () => { while (timers.length) timers.shift()(); };
    return { ctx, calls, tap, flush, ov, log, x, move, fix, say };
}

test('BH-037 Gap: a double tap on "Log a meal" opens Log meal once', () => {
    const g = gap();
    g.tap(g.log); g.tap(g.log); g.flush();
    assert.deepStrictEqual(g.calls.filter(c => c === 'MEAL'), ['MEAL']);
    assert.strictEqual(g.calls.filter(c => c === 'close').length, 1, 'closed once');
});

test('BH-037 Gap: a double tap on Move to walk opens Move once', () => {
    const g = gap();
    g.tap(g.move); g.tap(g.move); g.flush();
    assert.deepStrictEqual(g.calls.filter(c => c.startsWith('OPEN')), ['OPEN move']);
});

test('BH-037 Gap: the tap that closes Gap is marked spent (X, Log a meal, Move, backdrop)', () => {
    for (const k of ['x', 'log', 'move', 'ov']) {
        const g = gap(); const e = g.tap(g[k]);
        assert.strictEqual(e.spentMark, true, k + ' marks its tap spent');
    }
});

test('BH-037 Gap: a tap on the fading Gap does nothing (no speaker, no Fix time)', () => {
    const g = gap();
    g.tap(g.x); g.tap(g.say); g.tap(g.fix); g.tap(g.ov); g.flush();
    assert.deepStrictEqual(g.calls, ['spent', 'close']);
});

test('BH-037 Gap: buttons that keep Gap open still work and are not spent', () => {
    const g = gap();
    const e1 = g.tap(g.say), e2 = g.tap(g.fix);
    assert.deepStrictEqual(g.calls, ['say 0', 'FIX']);
    assert.ok(!e1.spentMark && !e2.spentMark);
});

/* lis-push.js ask(), cut out of its file, with a fake card */
function push() {
    const src = read('lis-push.js');
    const j = src.indexOf('\nfunction ask(force){'), end = src.indexOf('D.body.appendChild(c); return true; }', j);
    assert.ok(j > 0 && end > j, 'lis-push.js: ask() found');
    const store = {}, calls = [], timers = [];
    const btn = () => ({ h: [], textContent: '', addEventListener(t, f) { if (t === 'click') this.h.push(f); }, remove() { calls.push('btns-removed'); } });
    const parts = { '.lisp-q': btn(), '.lisp-yes': btn(), '.lisp-no': btn(), '.lisp-b': btn() };
    const card = { classList: { add(k) { calls.push('card ' + k); } }, setAttribute() {}, set innerHTML(v) {}, querySelector: s => parts[s], remove() { calls.push('card gone'); } };
    let enableRes = 'on';
    const window = { LowiFreshScrim: { spent(e) { calls.push('spent'); e.spentMark = true; } } };
    const ctx = { window, AKEY: 'lowi.pushAsk', Date, Promise, calls,
        js: k => JSON.parse(store[k] || '{}'), put: (k, o) => { store[k] = JSON.stringify(o); return o; },
        w: k => k, cname: () => '', askable: () => true, setTimeout(f) { timers.push(f); },
        P: () => ({ enable() { calls.push('ENABLE'); return Promise.resolve(enableRes); } }),
        D: { createElement: () => card, body: { appendChild() {} } } };
    vm.runInNewContext(src.slice(j, end + 37) + '\nthis.ask = ask;', ctx);
    ctx.ask(true);
    const click = k => { const e = { isTrusted: true }; parts[k].h.forEach(f => f(e)); return e; };
    return { store, calls, click, saved: () => JSON.parse(store['lowi.pushAsk'] || '{}'), setEnable: v => { enableRes = v; }, flush: () => { while (timers.length) timers.shift()(); } };
}

test('BH-037 ask card: a double tap on "Not now" counts one "not now" (so it asks again in 7 days)', () => {
    const p = push();
    p.click('.lisp-no'); p.click('.lisp-no'); p.flush();
    assert.strictEqual(p.saved().no, 1);
});

test('BH-037 ask card: a double tap on Yes asks the system once, and Yes then Not now does not add a "not now"', async () => {
    const p = push();
    p.click('.lisp-yes'); p.click('.lisp-yes'); p.click('.lisp-no');
    await new Promise(r => setImmediate(r));
    assert.strictEqual(p.calls.filter(c => c === 'ENABLE').length, 1);
    assert.strictEqual(p.saved().done, 1);
    assert.ok(!p.saved().no, 'no "not now" after Yes');
});

test('BH-037 ask card: the choosing tap is marked spent', () => {
    const p = push();
    const e = p.click('.lisp-no');
    assert.strictEqual(e.spentMark, true);
    const q = push();
    const e2 = q.click('.lisp-yes');
    assert.strictEqual(e2.spentMark, true);
});
