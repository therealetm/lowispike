'use strict';
/* BH-057 (P-VIEW-SWAP siblings of BH-056): two more screens swap their step in place, so fresh-scrim saw no new overlay.
   Live WebKit iPhone 13 (probes BUGHUNT/playtest/probe-rmob-dbl.cjs and probe-ck-dbl.cjs):
   - Community welcome (community-rooms-ui.js obPaint): a double tap on Next went two steps, past the community rules step the
     user says "I agree" on; Done on step 4 closed the welcome before its last step; Back went back two (15 of 15, 101-349 ms).
   - Cook along (index.html ckPaint): a double tap on Next skipped a cooking step (159-377 ms) and Back went back two. The done
     view's buttons sit right under Finish too.
   Both now mark the swapped view, so the 2nd tap within 44 px and 400 ms lands on nothing; a deliberate tap stays. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('Community welcome obPaint marks the sheet right after it swaps the step', () => {
    const src = read('community-rooms-ui.js'), i = src.indexOf('function obPaint(){'), j = src.indexOf('\nfunction ', i + 10), r = src.slice(i, j);
    const sw = r.indexOf('ob.innerHTML='), mk = r.indexOf('W.LowiFreshScrim.mark(ob)');
    assert.ok(sw > 0 && mk > sw, 'mark(ob) comes after the step is swapped in');
    assert.ok(mk < r.indexOf("querySelector('.rm-ob-go')"), 'and before Next gets focus');
});

test('Cook along ckPaint marks the box right after it swaps the step', () => {
    const src = read('index.html'), i = src.indexOf('function ckPaint(dir){'), j = src.indexOf('\nfunction ', i + 10), r = src.slice(i, j);
    const sw = r.indexOf('box.innerHTML ='), mk = r.indexOf('LowiFreshScrim.mark(box)');
    assert.ok(sw > 0 && mk > sw, 'mark(box) comes after the step is swapped in');
    assert.ok(mk < r.indexOf('LowiR3G.paint(box, CK)'), 'and before the photo layer adds its own tap areas');
});

test('with the view marked, the 2nd tap of a double tap on Next / Finish lands on nothing (real fresh-scrim)', () => {
    let t = 1000; const winL = []; const body = { nodeType: 1 };
    const W = { innerWidth: 390, innerHeight: 844, performance: { now: () => t }, addEventListener(type, f, cap) { winL.push({ type, f, cap }); }, MutationObserver: function () { this.observe = () => {}; } };
    vm.runInNewContext(read('fresh-scrim.js'), { window: W, document: { body, addEventListener() {} }, Date });
    const tap = (target, x, y, o = {}) => { const e = { target, isTrusted: true, detail: o.detail == null ? 1 : o.detail, clientX: x, clientY: y, timeStamp: t, stopped: false, preventDefault() {}, stopImmediatePropagation() { this.stopped = true; } }; winL.filter(l => l.cap).forEach(l => l.f(e)); return e; };
    /* welcome: the sheet itself (straight under <body>) is what obPaint marks */
    const ob = { nodeType: 1, parentNode: body };
    t = 1000; assert.ok(!tap({ nodeType: 1, parentNode: ob }, 300, 780).stopped, 'Next on step 1');
    t = 1003; W.LowiFreshScrim.mark(ob);
    const agree = { nodeType: 1, parentNode: ob };
    t = 1231; assert.ok(tap(agree, 301, 781).stopped, '231 ms later: swallowed (live: it skipped the rules step)');
    t = 1240; assert.ok(!tap(agree, 301, 781, { detail: 0 }).stopped, 'Enter still works');
    t = 1500; assert.ok(!tap(agree, 301, 781).stopped, 'a deliberate "I agree" after 400 ms works');
    /* cook along: the #p2Ck box inside its sheet */
    const sheet = { nodeType: 1, parentNode: body }, box = { nodeType: 1, parentNode: sheet };
    t = 5000; assert.ok(!tap({ nodeType: 1, parentNode: box }, 250, 790).stopped, 'Finish');
    t = 5002; W.LowiFreshScrim.mark(box);
    const later = { nodeType: 1, parentNode: box };
    t = 5188; assert.ok(tap(later, 252, 788).stopped, '188 ms later: the done view button under Finish is not pressed');
    t = 5190; assert.ok(!tap({ nodeType: 1, parentNode: box }, 120, 400).stopped, 'a tap somewhere else on the step works at once');
    t = 5450; assert.ok(!tap(later, 252, 788).stopped, 'a deliberate tap after 400 ms works');
});
