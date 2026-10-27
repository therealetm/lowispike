'use strict';
/* BH-056 sibling (P-VIEW-SWAP): the tutorial swaps its card in place per step. Live WebKit iPhone 13 (probe
   BUGHUNT/playtest/probe-lt-dbl.cjs): a double tap on Next went hello -> fuel, skipping a step (169 ms apart), and a double tap
   on Back went back two steps (179 ms). render() now marks the card it swaps in, so fresh-scrim's same-spot rule swallows the
   2nd tap within 44 px and 400 ms; a deliberate tap stays. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('tutorial render() marks the swapped card right after the swap', () => {
    const src = read('tutorial.js'), i = src.indexOf('    function render() {'), j = src.indexOf('\n    function ', i + 10), r = src.slice(i, j);
    const sw = r.indexOf('card.innerHTML ='), mk = r.indexOf('W.LowiFreshScrim.mark(card)');
    assert.ok(sw > 0 && mk > sw, 'mark(card) comes after the card is swapped');
    assert.ok(mk < r.indexOf('demoStart(s)'), 'and before the step starts its demo');
});

test('with the card marked, the 2nd tap of a double tap on Next lands on nothing; a later Next works (real fresh-scrim)', () => {
    let t = 1000; const winL = []; const body = { nodeType: 1 };
    const W = { innerWidth: 390, innerHeight: 844, performance: { now: () => t }, addEventListener(type, f, cap) { winL.push({ type, f, cap }); }, MutationObserver: function () { this.observe = () => {}; } };
    vm.runInNewContext(read('fresh-scrim.js'), { window: W, document: { body, addEventListener() {} }, Date });
    const tap = (target, x, y, o = {}) => { const e = { target, isTrusted: true, detail: o.detail == null ? 1 : o.detail, clientX: x, clientY: y, timeStamp: t, stopped: false, preventDefault() {}, stopImmediatePropagation() { this.stopped = true; } }; winL.filter(l => l.cap).forEach(l => l.f(e)); return e; };
    const root = { nodeType: 1, parentNode: body }, card = { nodeType: 1, parentNode: root };
    const next1 = { nodeType: 1, parentNode: card };
    t = 1000; assert.ok(!tap(next1, 320, 760).stopped, 'Next on hello');
    t = 1004; W.LowiFreshScrim.mark(card);
    const next2 = { nodeType: 1, parentNode: card };
    t = 1169; assert.ok(tap(next2, 322, 758).stopped, '169 ms later: swallowed (live: it skipped the Gap step)');
    t = 1180; assert.ok(!tap(next2, 322, 758, { detail: 0 }).stopped, 'Enter still works');
    t = 1450; assert.ok(!tap(next2, 322, 758).stopped, 'a deliberate Next after 400 ms works');
});
