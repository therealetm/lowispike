'use strict';
/* BH-058 (P-VIEW-SWAP siblings of BH-056/057): the Community profile sheet re-renders the OPEN #sheet in place when you tap a
   sign / type tag, Back, or "Add your personality type", so fresh-scrim saw no new overlay.
   Live WebKit iPhone 13 (probe BUGHUNT/playtest/probe-r5-dbl.cjs):
   - a double tap on a profile's sign tag opened the first member of that sign's list (2nd tap 103-294 ms later);
   - a double tap on "Add your personality type" pressed the outside personality test link under the finger (82-349 ms).
   openProfile / openGroup / mbtiSheet now go through swapSheet, which marks #sheetwrap when the sheet was already open. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const body = src => { const i = src.indexOf('{', src.indexOf('(')); let d = 0; for (let k = i; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) return src.slice(i, k + 1); } return ''; };

test('profile, sign/type group and personality type views render through swapSheet', () => {
    const src = read('index.html');
    for (const head of ['function openProfile(name, me, push){', 'function openGroup(kind, v, push){', 'function mbtiSheet(){']) {
        const i = src.indexOf(head); assert.ok(i > 0, head + ' exists');
        const r = body(src.slice(i));
        assert.ok(/\bswapSheet\('/.test(r), head + ' renders with swapSheet');
        assert.ok(!/(^|[^A-Za-z.])sheet\('/.test(r), head + ' does not call the bare sheet()');
    }
});

test('swapSheet marks #sheetwrap only when the sheet was already open', () => {
    const src = read('index.html'), i = src.indexOf('function swapSheet(html){'); assert.ok(i > 0);
    const fn = src.slice(i, src.indexOf('\nfunction openProfile', i));
    const marks = [], calls = [];
    const w = { classList: { open: false, contains(c) { return c === 'open' && this.open; } } };
    const ctx = { document: { getElementById: id => id === 'sheetwrap' ? w : null }, window: { LowiFreshScrim: { mark: el => marks.push(el) } }, sheet: h => { calls.push(h); w.classList.open = true; } };
    ctx.LowiFreshScrim = ctx.window.LowiFreshScrim;
    vm.runInNewContext(fn + '\nthis.swapSheet = swapSheet;', ctx);
    ctx.swapSheet('<a>'); assert.deepStrictEqual(calls, ['<a>']); assert.strictEqual(marks.length, 0, 'a fresh open is left to sheet() itself');
    ctx.swapSheet('<b>'); assert.strictEqual(marks.length, 1, 'a swap of the open sheet is marked'); assert.strictEqual(marks[0], w);
    delete ctx.window.LowiFreshScrim; ctx.LowiFreshScrim = undefined;
    assert.doesNotThrow(() => ctx.swapSheet('<c>'), 'no fresh-scrim: still renders');
});

test('with #sheetwrap marked, the 2nd tap on the sign tag lands on nothing; a deliberate tap works (real fresh-scrim)', () => {
    let t = 1000; const winL = []; const bodyEl = { nodeType: 1 };
    const W = { innerWidth: 390, innerHeight: 844, performance: { now: () => t }, addEventListener(type, f, cap) { winL.push({ type, f, cap }); }, MutationObserver: function () { this.observe = () => {}; } };
    vm.runInNewContext(read('fresh-scrim.js'), { window: W, document: { body: bodyEl, addEventListener() {} }, Date });
    const tap = (target, x, y, o = {}) => { const e = { target, isTrusted: true, detail: o.detail == null ? 1 : o.detail, clientX: x, clientY: y, timeStamp: t, stopped: false, preventDefault() {}, stopImmediatePropagation() { this.stopped = true; } }; winL.filter(l => l.cap).forEach(l => l.f(e)); return e; };
    const app = { nodeType: 1, parentNode: bodyEl }, wrap = { nodeType: 1, parentNode: app }, sh = { nodeType: 1, parentNode: wrap };
    t = 1000; assert.ok(!tap({ nodeType: 1, parentNode: sh }, 195, 330).stopped, 'sign tag');
    t = 1004; W.LowiFreshScrim.mark(wrap);
    const row = { nodeType: 1, parentNode: sh };
    t = 1103; assert.ok(tap(row, 196, 331).stopped, '103 ms later: the first member row is not pressed');
    t = 1110; assert.ok(!tap(row, 196, 331, { detail: 0 }).stopped, 'keyboard Enter still works');
    t = 1120; assert.ok(!tap({ nodeType: 1, parentNode: sh }, 40, 90).stopped, 'Back somewhere else works at once');
    t = 1600; assert.ok(!tap(row, 196, 331).stopped, 'a deliberate tap on the row after 400 ms works');
});
