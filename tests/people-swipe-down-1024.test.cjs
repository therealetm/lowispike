'use strict';
// Oct 24 2026 back and close sweep (16:40): on a phone the People directory (Community menu > People) is a bottom sheet, but a
// swipe down did nothing (back, X, Escape and a tap outside closed it), unlike the app's other sheets. Its header is now the
// handle: a drag down follows the finger and closes it past a quarter of the card or on a flick, a short drag springs back,
// the X is never taken over by the drag, and on a wide screen (centred card on iPad) nothing drags.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '..', 'people-directory.js'), 'utf8');

function el(tag) {
    const h = {};
    return { tag, style: {}, h, addEventListener: (t, f) => { (h[t] = h[t] || []).push(f); }, fire(t, e) { (h[t] || []).forEach(f => f(e)); },
        setPointerCapture() { }, releasePointerCapture() { }, getBoundingClientRect: () => ({ height: 700 }) };
}
function rig(wide) {
    const i = src.indexOf('function dragDown('), j = src.indexOf('function close(');
    assert.ok(i > 0 && j > i, 'dragDown exists before close()');
    const card = el('card'), top = el('head'), o = { querySelector: s => s === '.pd-card' ? card : s === '.pd-head' ? top : null };
    const W = { PointerEvent: function () { }, matchMedia: () => ({ matches: !!wide }) };
    const st = { closed: 0 };
    const make = new Function('W', 'st', 'let ov = null; function close(){ st.closed++; ov = null; }\n' + src.slice(i, j) + '\nreturn o => { ov = o; dragDown(o); };');
    make(W, st)(o);
    const btn = { closest: s => s === 'button' ? {} : null }, plain = { closest: () => null };
    const drag = (dy, ms, target) => {
        top.fire('pointerdown', { pointerId: 1, button: 0, clientY: 100, timeStamp: 0, target: target || plain });
        const n = 6; for (let k = 1; k <= n; k++) top.fire('pointermove', { pointerId: 1, clientY: 100 + dy * k / n, timeStamp: ms * k / n });
        top.fire('pointerup', { pointerId: 1, clientY: 100 + dy, timeStamp: ms + 5 });
    };
    return { card, top, st, drag, btn };
}

test('open() wires the drag on the header of the People sheet', () => {
    const open = src.slice(src.indexOf('function open('), src.indexOf('function dragDown('));
    assert.match(open, /dragDown\(ov\)/);
    const r = rig(false);
    assert.strictEqual(r.top.style.touchAction, 'none', 'the browser does not scroll the header');
});

test('a long drag down closes it, a short slow one springs back', () => {
    const a = rig(false); a.drag(260, 600); assert.strictEqual(a.st.closed, 1, 'long drag closes');
    const b = rig(false); b.drag(40, 900); assert.strictEqual(b.st.closed, 0, 'short slow drag stays open');
    assert.strictEqual(b.card.style.transform, '', 'and springs back');
});

test('a quick flick closes it', () => {
    const r = rig(false); r.drag(60, 50); assert.strictEqual(r.st.closed, 1);
});

test('the X is left alone, and an iPad (centred card) does not drag', () => {
    const a = rig(false); a.drag(300, 500, a.btn); assert.strictEqual(a.st.closed, 0, 'press on a button is not a drag');
    const b = rig(true); b.drag(300, 500); assert.strictEqual(b.st.closed, 0, 'wide screen: no drag');
});
