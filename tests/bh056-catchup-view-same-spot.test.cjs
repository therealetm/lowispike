'use strict';
/* BH-056 (P-VIEW-SWAP): the evening catch-up swaps its views in place inside one screen (bubble -> choices, Something else -> Back
   -> choices, review -> finish). fresh-scrim.js only knew new overlays and tabs, so the 2nd tap of a double tap pressed what the
   new view put under the finger. Live WebKit iPhone 13 (probe BUGHUNT/playtest/probe-ec-dbl.cjs): a double tap on the big
   Breakfast bubble logged "Eggs" 165 ms later without her choosing it; a double tap on Back in Something else picked "Meat and
   vegetables". stage() now marks the view it swaps in (LowiFreshScrim.mark), so the same-spot rule applies: for 400 ms a real
   tap within 44 px of the tap that swapped the view is swallowed; a tap elsewhere, a keyboard press and a script click pass.
   These tests run the real stage() from evening-catchup.js against the real fresh-scrim.js. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

function stageSrc() {
    const src = read('evening-catchup.js'), i = src.indexOf('    function stage(html, step) {'); assert.ok(i > 0, 'stage() found');
    const j = src.indexOf('\n    }\n', i); assert.ok(j > i); return src.slice(i, j + 6);
}
function mk() {
    let t = 1000; const winL = [];
    const body = { nodeType: 1 };
    const node = (parent, cls) => ({ nodeType: 1, parentNode: parent, className: cls || '', getBoundingClientRect: () => ({ width: 300, height: 60 }) });
    const W = { innerWidth: 390, innerHeight: 844, performance: { now: () => t }, addEventListener(type, f, cap) { winL.push({ type, f, cap }); },
        MutationObserver: function () { this.observe = () => {}; } };
    vm.runInNewContext(read('fresh-scrim.js'), { window: W, document: { body, addEventListener() {} }, Date });
    const tap = (target, x, y, o = {}) => { const e = { target, isTrusted: o.trusted !== false, detail: o.detail == null ? 1 : o.detail, clientX: x, clientY: y, timeStamp: o.ts == null ? t : o.ts,
        prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; } };
        winL.filter(l => l.type === 'click' && l.cap).forEach(l => l.f(e)); return e; };
    /* the catch-up screen (opened long ago) with its stage, and the real stage() bound to it */
    const ov = node(body, 'ec-ov on'), st = node(ov, 'ec-stage');
    st.classList = { add() {}, remove() {} }; st.offsetWidth = 1; st.querySelector = () => null;
    let html = ''; Object.defineProperty(st, 'innerHTML', { set(v) { html = v; }, get() { return html; } });
    ov.querySelector = s => (s === '.ec-stage' ? st : null); ov.setAttribute = () => {};
    const ctx = { W, ov, paintTop() {} };
    vm.runInNewContext(stageSrc() + '\nthis.stage = stage;', ctx);
    return { W, node, tap, st, stage: ctx.stage, at: ms => { t = 1000 + ms; } };
}
/* the big Breakfast bubble at (195, 420); its tap opens the choices, whose first one ("Eggs") lands right under the finger */
function bubbleToChoices(k) {
    const bubble = k.node(k.st, 'ec-bubble');
    k.at(0); assert.ok(!k.tap(bubble, 195, 420).stopped, 'the first tap opens the bubble');
    k.at(3); k.stage('<choices>', 'choices-0');   /* onClick -> viewChoices() -> stage() */
    return { eggs: k.node(k.st, 'ec-opt'), skip: k.node(k.st, 'ec-soft') };
}

test('a double tap on the catch-up bubble does not pick the choice the next view put under the finger', () => {
    const k = mk(); const { eggs } = bubbleToChoices(k);
    k.at(165); const e = k.tap(eggs, 198, 428);
    assert.ok(e.prevented && e.stopped, '2nd tap 165 ms later on the same spot is swallowed (live: "Eggs" was logged)');
    k.at(351); assert.ok(k.tap(eggs, 190, 415).stopped, 'a slower double tap (351 ms, live) too');
});

test('a double tap on Back in "Something else" does not pick a meal on the choices it goes back to', () => {
    const k = mk(); const back = k.node(k.st, 'ec-soft ec-wide');
    k.at(0); k.tap(back, 195, 610); k.at(2); k.stage('<choices>', 'choices-0');
    const meat = k.node(k.st, 'ec-opt');
    k.at(116); assert.ok(k.tap(meat, 195, 612).stopped, '2nd tap 116 ms later (live: "Meat and vegetables" was picked)');
});

test('a deliberate tap still works: elsewhere at once, on the same spot after 400 ms, by keyboard or script', () => {
    const k = mk(); const { eggs, skip } = bubbleToChoices(k);
    k.at(120); assert.ok(!k.tap(skip, 195, 700).stopped, 'a quick tap on Skip far below');
    const k2 = mk(); const b = bubbleToChoices(k2);
    k2.at(450); assert.ok(!k2.tap(b.eggs, 195, 420).stopped, 'same spot after 400 ms');
    const k3 = mk(); const c = bubbleToChoices(k3);
    k3.at(60); assert.ok(!k3.tap(c.eggs, 195, 420, { detail: 0 }).stopped, 'Enter / Space');
    k3.at(70); assert.ok(!k3.tap(c.eggs, 195, 420, { trusted: false }).stopped, 'element.click()');
    void eggs;
});

test('a view swapped in by the timer (the next bubble after the pop) gets no guard', () => {
    const k = mk(); const opt = k.node(k.st, 'ec-opt');
    k.at(0); k.tap(opt, 195, 420);
    k.at(1500); k.stage('<bubble 2>', 'bubble-1');   /* pop timer, 1.5 s after the pick */
    const next = k.node(k.st, 'ec-bubble');
    k.at(1560); assert.ok(!k.tap(next, 195, 420).stopped, 'her tap on the new bubble works');
});

test('stage() marks the view it swaps in, right after the swap', () => {
    assert.match(stageSrc(), /innerHTML = html;[^\n]*\n\s*try \{ if \(W\.LowiFreshScrim && W\.LowiFreshScrim\.mark\) W\.LowiFreshScrim\.mark\(s\); \}/);
});
