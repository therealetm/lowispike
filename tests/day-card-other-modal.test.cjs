'use strict';
/* BH-031 (Oct 26 2026): the Day card (daily-ritual.js #drDay) only waited for the dialogs on its named BUSY list. The fasting
   reward (#fstRw) is not on it, and it opens when the first meal of the day ends the fast, right when the Day card is due: live
   20261026-031541 the Day card opened 1.5 s later on top of it and one Escape closed both (playtest/probe-dayover.cjs).
   busy() now also counts any other visible [aria-modal="true"] dialog, never the Day card itself, never a hidden one. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'daily-ritual.js'), 'utf8');

function pick(name) {
    const i = src.indexOf('function ' + name + '(');
    if (i < 0) return '';
    let d = 0, j = src.indexOf('{', i);
    for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } }
    return '';
}

/* el: { id, fixed, rects, style, inDay } */
function mk(o) {
    return { id: o.id || '', rects: o.rects === undefined ? 1 : o.rects, style: Object.assign({ display: 'block', visibility: 'visible', opacity: '1', position: o.fixed ? 'fixed' : 'static' }, o.style || {}),
        offsetParent: o.offsetParent || null, getClientRects() { return { length: this.rects }; }, closest(s) { return s === '#drDay' && o.inDay ? {} : null; } };
}

function harness(modals, named) {
    named = named || {};
    const code = [pick('busy'), pick('shown'), pick('otherModal')].join('\n');
    assert.ok(/function busy\(/.test(code), 'busy() found');
    const ctx = vm.createContext({
        W: {}, BUSY: ['#sheetwrap.open', '#ltTour:not(.lt-held)'],
        D: { documentElement: { classList: { contains: () => false } }, querySelectorAll: s => (s === '[aria-modal="true"]' ? modals : []) },
        $: s => named[s] || null,
        getComputedStyle: e => e.style
    });
    vm.runInContext(code, ctx);
    return () => vm.runInContext('busy()', ctx);
}

test('the fasting reward (not on the named list) makes the Day card wait', () => {
    const busy = harness([mk({ id: 'fstRw', fixed: true })]);
    assert.strictEqual(busy(), true);
});

test('any other visible modal dialog counts too (a Community person card, a tamagotchi screen)', () => {
    for (const id of ['pdCard', 'tmgScreen', '']) assert.strictEqual(harness([mk({ id, fixed: true })])(), true, id || 'no id');
});

test('the Day card itself, and anything inside it, never counts (or it would close itself every tick)', () => {
    const busy = harness([mk({ id: 'drDay', fixed: true }), mk({ id: 'x', inDay: true })]);
    assert.strictEqual(busy(), false);
});

test('a closed modal that is still in the page does not count (no rects, display none, hidden, faded out)', () => {
    const busy = harness([
        mk({ id: 'spWorld', fixed: true, rects: 0 }),
        mk({ id: 'a', fixed: true, style: { display: 'none' } }),
        mk({ id: 'b', fixed: true, style: { visibility: 'hidden' } }),
        mk({ id: 'c', fixed: true, style: { opacity: '0' } })
    ]);
    assert.strictEqual(busy(), false);
});

test('the named BUSY list still works as before', () => {
    assert.strictEqual(harness([], { '#sheetwrap.open': mk({ fixed: true }) })(), true);
    assert.strictEqual(harness([], {})(), false);
});

test('the tick closes an open Day card when busy() turns true (so a reward opening over it wins)', () => {
    assert.match(src, /if \(\$\('#drDay'\)\) \{[^\n]*busy\(\)\) \{ dayClose\(false\)/);
});
