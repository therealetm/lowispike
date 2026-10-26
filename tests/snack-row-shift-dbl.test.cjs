'use strict';
/* BH-042 (bug hunt run 42, 26 Oct 2026, pattern P-ROW-SHIFT, siblings of BH-041 in Shop > Supermarket): a tap that swaps its own
   row for another control, or takes its row away, put a new control under the finger, and the 2nd tap of a double tap pressed it.
   Found live on build 20261026-145042 (BUGHUNT/playtest/probe-snack-dbl.cjs, WebKit iPhone 13, mock cloud):
   - a double tap on "Buy again · recent" (Add 3) filled the list and the 2nd tap (282-335 ms) hit the Undo that took Add 3's place,
     so nothing was added and the row looked like it ignored the tap;
   - a double tap on that Undo (15-356 ms) undid and the 2nd tap filled the list again;
   - a double tap on the tick of the first snack (25-351 ms) also ticked the next snack (Apples AND Bananas bought).
   Same class in the same file: Kitchen's cart "✓ Bought" (moves the row into the kitchen) and the cart's − at 1 (removes the row).
   Rule (fresh-scrim BH-041): such a control carries data-spend; the 2nd tap within 44 px / 400 ms does nothing. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const SRC = read('store-picks.js');
/* every <button ...> tag in the source that carries attribute a */
const tags = a => SRC.match(new RegExp("<button[^>]*" + a + "=[^>]*>", 'g')) || [];

test('BH-042: Buy again (fill) and its Undo carry data-spend', () => {
    for (const a of ['data-stp-snack-refill', 'data-stp-snack-undo']) {
        const t = tags(a); assert.ok(t.length, a + ' is drawn');
        t.forEach(tg => assert.ok(/data-spend/.test(tg), a + ' carries data-spend: ' + tg.slice(0, 140)));
    }
});

test('BH-042: a snack tick (Bought) and Kitchen cart ✓ Bought carry data-spend; the x already counts as a close control', () => {
    for (const a of ['data-stp-snack-got', 'data-stp-kit-got']) {
        const t = tags(a); assert.ok(t.length, a + ' is drawn');
        t.forEach(tg => assert.ok(/data-spend/.test(tg), a + ' carries data-spend: ' + tg.slice(0, 140)));
    }
    /* the x buttons are spent by class (fresh-scrim BH-040: *-x) */
    for (const a of ['data-stp-snack-drop', 'data-stp-kit-drop', 'data-stp-kit-cdrop']) tags(a).forEach(tg => assert.match(tg, /class="[^"]*\bstp-snack-x\b/, a));
    /* quick-add chips that only add (row stays) are untouched */
    tags('data-stp-snack-qv').forEach(tg => assert.ok(!/data-spend/.test(tg), 'snack quick-add stays ordinary'));
});

test('BH-042: cart − is data-spend only when it removes the row (amount 1); + and − above 1 stay free for quick repeated taps', () => {
    const i = SRC.indexOf('data-stp-cd="-1"'); assert.ok(i > 0, 'cart minus is drawn');
    const line = SRC.slice(SRC.lastIndexOf('\n', i), SRC.indexOf('\n', i));
    assert.match(line, /l\.q\s*<=\s*1\s*\?\s*' data-spend="1"'/, 'minus gets data-spend at amount 1: ' + line.trim().slice(0, 200));
    const j = SRC.indexOf('data-stp-cd="1"'); const plus = SRC.slice(SRC.lastIndexOf('\n', j), SRC.indexOf('\n', j));
    assert.ok(!/data-spend/.test(plus), '+ stays ordinary');
});

test('BH-042: with the real fresh-scrim, the 2nd tap on the Undo that replaced Buy again is swallowed; a deliberate Undo works', () => {
    let t = 1000; const winL = [];
    const body = { nodeType: 1 };
    const W = { innerWidth: 390, innerHeight: 844, performance: { now: () => t }, addEventListener(type, f, cap) { winL.push({ type, f, cap }); }, MutationObserver: function () { this.observe = () => {}; } };
    vm.runInNewContext(read('fresh-scrim.js'), { window: W, document: { body, addEventListener() {} }, Date });
    const node = (parent, attrs) => ({ nodeType: 1, parentNode: parent, tagName: 'BUTTON', className: attrs.class || '', attrs,
        getAttribute(k) { return k in attrs ? attrs[k] : null; }, matches(sel) { return sel.split(',').some(p => { p = p.trim(); const m = /^\[([\w-]+)\]$/.exec(p); return (m && m[1] in attrs) || (p === 'button'); }); },
        closest(sel) { for (let c = this; c && c.attrs; c = c.parentNode) if (c.matches(sel)) return c; return null; } });
    const click = (n, x, y) => { const e = { type: 'click', target: n, isTrusted: true, detail: 1, clientX: x, clientY: y, timeStamp: t, stopped: false, preventDefault() {}, stopImmediatePropagation() { this.stopped = true; } }; winL.filter(l => l.type === 'click' && l.cap).forEach(l => l.f(e)); return e; };
    /* markup as store-picks draws it: take the attributes from the source */
    const has = a => /data-spend/.test(tags(a)[0] || '');
    const refill = node(body, Object.assign({ class: 'stp-again', 'data-stp-snack-refill': '1' }, has('data-stp-snack-refill') ? { 'data-spend': '1' } : {}));
    const undo = node(body, Object.assign({ class: 'stp-again-undo', 'data-stp-snack-undo': '1' }, has('data-stp-snack-undo') ? { 'data-spend': '1' } : {}));
    t = 1000; assert.ok(!click(refill, 340, 600).stopped, 'Buy again fills');
    t = 1282; assert.ok(click(undo, 342, 601).stopped, 'the 2nd tap 282 ms later does not undo it');
    t = 1800; assert.ok(!click(undo, 342, 601).stopped, 'a deliberate Undo later works');
});
