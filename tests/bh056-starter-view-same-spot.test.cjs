'use strict';
/* BH-056 sibling (P-VIEW-SWAP): the starter questions (herb-start.js) swap their steps in place inside one sheet. Live WebKit
   iPhone 13 (probe BUGHUNT/playtest/probe-hs-dbl.cjs): a double tap on Skip skipped two questions (273 / 319 ms apart), and a
   double tap on an answer skipped the next question (162 ms: the 2nd tap hit the old answer again and queued a 2nd ivNext; 323 ms:
   it pressed what question 2 put under the finger). ivPaint now marks the new step for fresh-scrim's same-spot rule, and an
   answer only moves on from the question it was given on. These tests run the real ivPaint / ivNext / onIvClick. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'herb-start.js'), 'utf8');
const grab = name => { const i = src.indexOf('function ' + name + '('); assert.ok(i >= 0, name); const j = src.indexOf('\nfunction ', i + 9); const k = src.indexOf('\n/*', i + 9); return src.slice(i, Math.min(j < 0 ? 1e9 : j, k < 0 ? 1e9 : k)); };

function mk() {
    const timers = []; const marks = [];
    const mkBtn = (a, v) => ({ a, v, parentNode: null, classList: { toggle() {} }, setAttribute() {}, getAttribute: k => (k === 'data-hsi' ? a : k === 'data-v' ? v : null), closest() { return this; } });
    const el = { attrs: {}, html: '', setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; }, querySelector: () => null, set innerHTML(v) { this.html = v; }, get innerHTML() { return this.html; } };
    const Q = [{ id: 'q1', opts: [{ v: 'morning', t: 'Morning' }] }, { id: 'q2', opts: [{ v: 'a', t: 'A' }] }, { id: 'q3', opts: [{ v: 'b', t: 'B' }] }, { id: 'q4', opts: [{ v: 'c', t: 'C' }] }];
    const ctx = {
        D: { getElementById: id => (id === 'hsIv' ? el : null) }, window: { LowiFreshScrim: { mark: n => marks.push(n) } },
        C: { QUESTIONS: Q, questionText: q => ({ id: q.id, over: '', q: q.id, opts: q.opts }), newPlan: () => ({ actions: [] }) },
        herbName: () => 'Herb', herbArt: () => '', esc: s => String(s), t: k => k, lang: () => 'en', facts: () => ({}), ico: () => '', AV: () => ({}), wnm: s => s,
        fillArt() {}, matchMedia: () => ({ matches: false }), reduce: () => false, setTimeout: (f, ms) => timers.push(f), pendClear() {}, ivLater() {}, ivClose() {}
    };
    ctx.LowiFreshScrim = ctx.window.LowiFreshScrim;   /* in the page window.X is the global X */
    vm.runInNewContext('let IV=null;' + grab('ivPaint') + grab('ivNext') + grab('onIvClick') + ';this.go=()=>{IV={step:0,answers:{},ov:{isConnected:true}};ivPaint();};this.iv=()=>IV;this.click=b=>onIvClick({target:b,preventDefault(){}});', ctx);
    const opt = v => { const b = mkBtn('opt', v); b.parentNode = { querySelectorAll: () => [b] }; return b; };
    return { ctx, el, marks, timers, opt, skip: () => mkBtn('skip'), run: () => { while (timers.length) timers.shift()(); } };
}

test('a double tap on an answer (2nd tap on the same old answer) moves on one question, not two', () => {
    const k = mk(); k.ctx.go(); const b = k.opt('morning');
    k.ctx.click(b); k.ctx.click(b);   /* 162 ms apart: both land on question 1's answer before it moves on */
    k.run();
    assert.strictEqual(k.ctx.iv().step, 1, 'question 2 is waiting (it was skipped before the fix)');
    assert.strictEqual(k.ctx.iv().answers.q1, 'morning');
});

test('every step painted in place is marked for the same-spot rule, right after the swap', () => {
    const k = mk(); k.ctx.go(); assert.strictEqual(k.marks.length, 1); assert.strictEqual(k.marks[0], k.el);
    k.ctx.click(k.skip()); assert.strictEqual(k.marks.length, 2, 'Skip -> the next question is marked');
    assert.match(grab('ivPaint'), /el\.innerHTML=h;try\{window\.LowiFreshScrim&&LowiFreshScrim\.mark&&LowiFreshScrim\.mark\(el\);\}catch\(e\)\{\}/);
});

test('the same-spot rule swallows the 2nd tap on Skip in the next question (real fresh-scrim)', () => {
    let t = 1000; const winL = []; const body = { nodeType: 1 };
    const W = { innerWidth: 390, innerHeight: 844, performance: { now: () => t }, addEventListener(type, f, cap) { winL.push({ type, f, cap }); }, MutationObserver: function () { this.observe = () => {}; } };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'fresh-scrim.js'), 'utf8'), { window: W, document: { body, addEventListener() {} }, Date });
    const tap = (target, x, y) => { const e = { target, isTrusted: true, detail: 1, clientX: x, clientY: y, timeStamp: t, stopped: false, preventDefault() {}, stopImmediatePropagation() { this.stopped = true; } }; winL.filter(l => l.cap).forEach(l => l.f(e)); return e; };
    const sheet = { nodeType: 1, parentNode: body }, iv = { nodeType: 1, parentNode: sheet };
    const skip1 = { nodeType: 1, parentNode: iv };
    t = 1000; assert.ok(!tap(skip1, 350, 60).stopped);
    t = 1002; W.LowiFreshScrim.mark(iv);   /* ivNext -> ivPaint */
    const skip2 = { nodeType: 1, parentNode: iv };
    t = 1273; assert.ok(tap(skip2, 350, 60).stopped, '273 ms later on the same spot: swallowed');
    t = 1600; assert.ok(!tap(skip2, 350, 60).stopped, 'a deliberate Skip after 400 ms works');
});
