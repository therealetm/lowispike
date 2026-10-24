'use strict';
// Oct 24 2026 back and close sweep (18:40): on a phone Shop (store-picks.js, Supermarket / Seller Zone / Kitchen) fills the
// screen like the app's other sheets, but a swipe down did nothing (back, X, Escape and a tap outside closed it). Its top bar
// (tabs, title block) is now the handle: a drag down follows the finger and closes it past a quarter of the card or on a
// flick, a short drag springs back, buttons / fields / the list never start a drag, nothing drags on a wide screen (centred
// card on iPad) or while a product card is open, and the click a drag leaves behind does not press anything.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '..', 'store-picks.js'), 'utf8');

function node(name, parent, match) {
    return { name, parent, style: {}, match: match || [],
        closest(sel) { let n = this; while (n) { if (sel.split(',').some(s => n.match.includes(s.trim()))) return n; n = n.parent; } return null; },
        contains(x) { while (x) { if (x === this) return true; x = x.parent; } return false; },
        setPointerCapture() { }, releasePointerCapture() { }, getBoundingClientRect: () => ({ height: 800 }) };
}
function rig(opts) {
    opts = opts || {};
    const i = src.indexOf('let dragAt = 0;'), j = src.indexOf('function close() {');
    assert.ok(i > 0 && j > i, 'dragDown exists before close()');
    const h = {}, o = { addEventListener: (t, f) => { (h[t] = h[t] || []).push(f); } };
    const card = node('card', null, ['.stp-card']);
    const tabs = node('tabs', card, ['.stp-tabs']), head = node('head', card, ['.stp-head']), h3 = node('h3', head);
    const tabBtn = node('tab', tabs, ['button', '.stp-tab']), input = node('input', head, ['input']), headBtn = node('hbtn', head, ['button']);
    const scroll = node('scroll', card, ['.stp-scroll']), row = node('row', scroll);
    const W = { PointerEvent: function () { }, matchMedia: () => ({ matches: !!opts.wide }) };
    const st = { closed: 0 };
    const make = new Function('W', 'st', 'qvOpen', 'let ov = null; let qv = qvOpen ? {} : null; function close(){ st.closed++; ov = null; }\n' +
        src.slice(i, j) + '\nreturn { wire: o => { ov = o; dragDown(o); }, at: () => dragAt };');
    const api = make(W, st, !!opts.qv); api.wire(o);
    const fire = (t, e) => (h[t] || []).forEach(f => f(e));
    const drag = (dy, ms, target) => {
        fire('pointerdown', { pointerId: 1, button: 0, clientY: 100, timeStamp: 0, target: target || h3 });
        const n = 6; for (let k = 1; k <= n; k++) fire('pointermove', { pointerId: 1, clientY: 100 + dy * k / n, timeStamp: ms * k / n });
        fire('pointerup', { pointerId: 1, clientY: 100 + dy, timeStamp: ms + 5 });
    };
    return { card, tabs, head, h3, tabBtn, headBtn, input, row, st, drag, api };
}

test('openPanel() wires the drag on the Shop panel', () => {
    const open = src.slice(src.indexOf('function openPanel('), src.indexOf('let dragAt = 0;'));
    assert.match(open, /dragDown\(ov\)/);
});

test('a long drag down on the title closes Shop, a short slow one springs back', () => {
    const a = rig(); a.drag(300, 600); assert.strictEqual(a.st.closed, 1, 'long drag closes');
    const b = rig(); b.drag(40, 900); assert.strictEqual(b.st.closed, 0, 'short slow drag stays open');
    assert.strictEqual(b.card.style.transform, '', 'and springs back');
    const c = rig(); c.drag(300, 600, c.tabs); assert.strictEqual(c.st.closed, 1, 'the tab bar (between the tabs) is a handle too');
    const d = rig(); d.drag(300, 600, d.tabBtn); assert.strictEqual(d.st.closed, 1, 'a drag that starts on a tab closes it too');
});

test('a quick flick closes it', () => {
    const r = rig(); r.drag(70, 50); assert.strictEqual(r.st.closed, 1);
});

test('other buttons, the search field and the list never start a drag', () => {
    for (const k of ['headBtn', 'input', 'row']) { const r = rig(); r.drag(320, 500, r[k]); assert.strictEqual(r.st.closed, 0, k + ' is not a handle'); }
});

test('no drag on a wide screen or while a product card is open', () => {
    const a = rig({ wide: true }); a.drag(320, 500); assert.strictEqual(a.st.closed, 0, 'wide screen');
    const b = rig({ qv: true }); b.drag(320, 500); assert.strictEqual(b.st.closed, 0, 'product card open');
});

test('the click a drag leaves behind is eaten, a plain tap is not', () => {
    const r = rig(); r.drag(40, 900); assert.ok(Date.now() - r.api.at() < 450, 'a drag marks the next click');
    const onClick = src.slice(src.indexOf('function onClick('), src.indexOf('function onClick(') + 200);
    assert.match(onClick, /Date\.now\(\) - dragAt < 450\) return/);
    const t = rig(); t.drag(0, 80); assert.strictEqual(t.api.at(), 0, 'a tap leaves no mark');
});

test('the top bar does not scroll the page on a phone, and the tour teaches the swipe', () => {
    const css = fs.readFileSync(path.join(__dirname, '..', 'store-picks.css'), 'utf8');
    assert.match(css, /@media \(max-width: 699\.98px\) \{[^}]*\.stp-card > \.stp-tabs[^}]*touch-action: none/);
    assert.ok(require('../tutorial-steps.js').GESTURES.find(g => g.id === 'sheet-drag').src.includes('store-picks.js'));
});
