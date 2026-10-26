'use strict';
/* BH-040 (bug hunt run 40, 26 Oct 2026, pattern P-CLOSE-UNDER-FINGER): a double tap on a control that only CLOSES something
   (an X, a close button, a *-scrim backdrop) closed it and the 2nd tap pressed what had been under it. Only a few modules called
   LowiFreshScrim.spent() on their own X. Found by a seeded double-tap monkey on the live build 20261026-122440
   (BUGHUNT/playtest/probe-close-under.cjs, WebKit iPhone 13, mock cloud, seed 4002): the bottom X (#whX) closed its sheet and the
   2nd tap 173 ms later focused Community's chat box ("Write to Paul", keyboard up); Move's backdrop (.hb2-scrim) closed the bloom
   and the 2nd tap 222 ms later pressed the companion's world bubble. Rule: fresh-scrim's own click guard spends every real tap on
   a dismiss control, once for the whole app, so the 2nd tap within 44 px and 400 ms presses nothing and focuses nothing.
   Keyboard presses (detail 0), script clicks, taps elsewhere and taps after 400 ms work as before; ordinary buttons are untouched. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

function scrim() {
    let t = 1000; const winL = [];
    const body = { nodeType: 1 };
    const W = { innerWidth: 390, innerHeight: 844, performance: { now: () => t }, addEventListener(type, f, cap) { winL.push({ type, f, cap }); },
        MutationObserver: function () { this.observe = () => {}; } };
    vm.runInNewContext(read('fresh-scrim.js'), { window: W, document: { body, addEventListener() {} }, Date });
    const fire = (type, target, x, y, o = {}) => {
        const e = { type, target, isTrusted: o.trusted !== false, detail: o.detail == null ? 1 : o.detail, clientX: x, clientY: y, timeStamp: t,
            prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; } };
        winL.filter(l => l.type === type && l.cap).forEach(l => l.f(e));
        return e;
    };
    return { W, body, click: (n, x, y, o) => fire('click', n, x, y, o), down: (n, x, y, o) => fire('mousedown', n, x, y, o), at: ms => { t = 1000 + ms; } };
}
/* a tiny element: tag, id, class, attributes; closest()/matches() for tag, #id, [attr] and [attr="v"] selector lists */
function el(parent, tag, attrs) {
    attrs = attrs || {};
    const one = (c, p) => { p = p.trim(); let m;
        if ((m = /^#([\w-]+)$/.exec(p))) return c.id === m[1];
        if ((m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(p))) return m[1] in c.attrs && (m[2] == null || c.attrs[m[1]] === m[2]);
        if (/^[a-z]+$/.test(p)) return c.tagName === p.toUpperCase();
        return false; };
    const n = { nodeType: 1, parentNode: parent || null, tagName: tag.toUpperCase(), id: attrs.id || '', className: attrs.class || '', attrs,
        getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
        matches(sel) { return sel.split(',').some(p => one(this, p)); },
        closest(sel) { for (let c = this; c && c.nodeType === 1 && c.attrs; c = c.parentNode) if (c.matches(sel)) return c; return null; } };
    return n;
}

test('BH-040: the bottom X (#whX) double tapped: the 2nd tap does not press or focus the chat box under it', () => {
    const s = scrim();
    const app = el(s.body, 'div', { id: 'app' }), x = el(s.body, 'button', { id: 'whX', class: 'wh-x' }), box = el(app, 'textarea', { id: 'cmInput' });
    s.at(0); const a = s.click(x, 195, 790); assert.ok(!a.stopped, 'the X itself still closes');
    s.at(173); const d = s.down(box, 197, 788), b = s.click(box, 197, 788);
    assert.ok(d.prevented, 'the chat box does not take focus (no keyboard) from the 2nd tap');
    assert.ok(b.stopped && b.prevented, 'the 2nd tap is swallowed');
});

test('BH-040: a bloom backdrop (*-scrim) double tapped: the bubble under it is not pressed', () => {
    const s = scrim();
    const bloom = el(s.body, 'div', { id: 'hb2Bloom', class: 'hb2-bloom hb2-move' }), bd = el(bloom, 'button', { class: 'hb2-scrim', 'data-hb2': 'close' });
    const bubble = el(el(s.body, 'div', { id: 'app' }), 'button', { id: 'spBubble', class: 'sp-bubble', 'data-sp': 'open' });
    s.at(0); assert.ok(!s.click(bd, 200, 420).stopped);
    s.at(222); assert.ok(s.click(bubble, 204, 418).stopped, 'the companion world bubble is not pressed');
});

test('BH-040: every kind of dismiss control counts, by data-* or class name', () => {
    const cases = [['button', { class: 'r2-x', 'data-r2': 'close' }], ['button', { 'data-act': 'close-sheet' }], ['button', { class: 'xbtn' }],
        ['button', { class: 'b3-cx' }], ['button', { class: 'tmg-close' }], ['button', { class: 'cg-x cr-back', 'data-chat': 'close-thread' }],
        ['div', { class: 'r2-scrim' }], ['button', { class: 'ss2-page-x' }], ['button', { 'data-sp': 'close' }]];
    for (const [tag, attrs] of cases) {
        const s = scrim(); const host = el(s.body, 'div', { class: 'ov' });
        const c = el(host, tag, attrs), under = el(el(s.body, 'div', { id: 'app' }), 'button', { class: 'thing' });
        s.at(0); s.click(c, 100, 500); s.at(150);
        assert.ok(s.click(under, 110, 505).stopped, JSON.stringify(attrs) + ' spends its tap');
    }
    /* a tap on an icon inside the X counts too */
    const s = scrim(); const x = el(s.body, 'button', { class: 'gv-x' }), svg = el(x, 'svg', {}), under = el(s.body, 'button', { class: 'thing' });
    s.at(0); s.click(svg, 100, 500); s.at(150); assert.ok(s.click(under, 100, 500).stopped, 'icon inside the X');
});

test('BH-040: ordinary buttons, taps elsewhere, late taps, keyboard and script clicks work as before', () => {
    const mk = () => { const s = scrim(); const x = el(s.body, 'button', { id: 'whX', class: 'wh-x' }), under = el(s.body, 'button', { class: 'thing' }); return { s, x, under }; };
    /* ordinary buttons are not dismiss controls: a fast double tap on one passes both taps (other rules decide) */
    { const s = scrim(); const plain = [['button', { class: 'next' }], ['button', { class: 'box-extra' }], ['button', { class: 'xx-pad' }], ['button', { class: 'mix' }], ['div', { class: 'card' }]];
      plain.forEach(([tag, a], i) => { const b = el(s.body, tag, a); s.at(i * 1000); s.click(b, 100, 500); s.at(i * 1000 + 150); assert.ok(!s.click(b, 100, 500).stopped, JSON.stringify(a) + ' is not a dismiss control'); }); }
    { const { s, x, under } = mk(); s.at(0); s.click(x, 195, 790); s.at(450); assert.ok(!s.click(under, 195, 790).stopped, 'a deliberate tap after 400 ms works'); }
    { const { s, x, under } = mk(); s.at(0); s.click(x, 195, 790); s.at(150); assert.ok(!s.click(under, 120, 600).stopped, 'a tap elsewhere works at once'); }
    { const { s, x, under } = mk(); s.at(0); s.click(x, 195, 790, { detail: 0 }); s.at(150); assert.ok(!s.click(under, 195, 790).stopped, 'a keyboard press on the X protects nothing'); }
    { const { s, x, under } = mk(); s.at(0); s.click(x, 195, 790, { trusted: false }); s.at(150); assert.ok(!s.click(under, 195, 790).stopped, 'a script click on the X protects nothing'); }
    { const { s, x, under } = mk(); s.at(0); s.click(x, 195, 790); s.at(150); assert.ok(!s.click(under, 195, 790, { detail: 0 }).stopped, 'a keyboard press after it works'); }
});

test('BH-040: the guard sits in fresh-scrim (loaded on every page), not in each module', () => {
    const src = read('fresh-scrim.js');
    assert.match(src, /if \(dismissing\(e\.target\)( \|\| removing\(e\.target\))?\) spent\(e\)/); /* BH-041 adds data-spend rows */
    assert.ok(read('index.html').includes('fresh-scrim.js'), 'index.html loads fresh-scrim.js');
});
