'use strict';
/* BH-041 (bug hunt run 41, 26 Oct 2026, pattern P-ROW-SHIFT): a row action that takes its own row away lets the NEXT row slide up
   under the finger, so the 2nd tap of a double tap acted on that row too. Found live on build 20261026-135248
   (BUGHUNT/playtest/probe-kitchen-dbl.cjs): WebKit iPhone 13, a double tap (82 ms) on Bought for Apples in Cook > Kitchen > To buy
   also put Butter in the kitchen; Chromium, a double tap on x took Apples AND Butter off the shopping list.
   Rule: a control marked data-spend is spent like a close control (fresh-scrim): the 2nd tap within 44 px / 400 ms does nothing.
   BH-041b (same run, sibling): a two-step delete ("Tap again to delete", class armed / sure) was armed AND confirmed by one double
   tap, so its safety step did nothing: Delete all cycle data (Cycle sheet + Cycle world), delete a chat message, remove today's meal.
   Rule: a tap on an armed button on the spot of the tap just before it, within ARM_MS (500 ms), is swallowed. */
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
    return { W, body, click: (n, x, y, o) => fire('click', n, x, y, o), at: ms => { t = 1000 + ms; } };
}
/* a tiny element: closest()/matches() for tag, tag.class, .class, #id, [attr] and [attr="v"] selector lists */
function el(parent, tag, attrs) {
    attrs = attrs || {};
    const cls = c => (c.className || '').split(/\s+/);
    const one = (c, p) => { p = p.trim(); let m;
        if ((m = /^#([\w-]+)$/.exec(p))) return c.id === m[1];
        if ((m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(p))) return m[1] in c.attrs && (m[2] == null || c.attrs[m[1]] === m[2]);
        if ((m = /^([a-z]*)\.([\w-]+)$/.exec(p))) return (!m[1] || c.tagName === m[1].toUpperCase()) && cls(c).includes(m[2]);
        if (/^[a-z]+$/.test(p)) return c.tagName === p.toUpperCase();
        return false; };
    const n = { nodeType: 1, parentNode: parent || null, tagName: tag.toUpperCase(), id: attrs.id || '', className: attrs.class || '', attrs,
        getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
        matches(sel) { return sel.split(',').some(p => one(this, p)); },
        closest(sel) { for (let c = this; c && c.nodeType === 1 && c.attrs; c = c.parentNode) if (c.matches(sel)) return c; return null; } };
    return n;
}

test('BH-041: Kitchen To buy, double tap on Bought: the next row that slid up is not bought too', () => {
    const s = scrim(); const list = el(s.body, 'div', { class: 'kg-buyv' });
    const apples = el(el(list, 'div', { class: 'kg-card' }), 'button', { class: 'kg-got', 'data-spend': '', 'data-kg-got': 'a1' });
    s.at(0); assert.ok(!s.click(apples, 300, 260).stopped, 'the first Bought works');
    /* Apples is gone; Butter's row (a new element) now sits under the finger */
    const butter = el(el(list, 'div', { class: 'kg-card' }), 'button', { class: 'kg-got', 'data-spend': '', 'data-kg-got': 'b2' });
    s.at(82); const b = s.click(butter, 301, 262); assert.ok(b.stopped && b.prevented, 'the 2nd tap of the double tap is swallowed');
    s.at(500); assert.ok(!s.click(butter, 301, 262).stopped, 'a deliberate tap after 400 ms buys Butter');
});

test('BH-041: x (take off the list) double tapped: the next row stays; a deliberate tap on another row works at once', () => {
    const s = scrim(); const list = el(s.body, 'div', { class: 'kg-buyv' });
    const x1 = el(list, 'button', { class: 'kg-bx', 'data-spend': '', 'data-kg-bdrop': 'a1' }), x2 = el(list, 'button', { class: 'kg-bx', 'data-spend': '', 'data-kg-bdrop': 'b2' });
    s.at(0); s.click(x1, 350, 300); s.at(293); assert.ok(s.click(x2, 350, 300).stopped, 'same spot, 293 ms: swallowed');
    const s2 = scrim(); const l2 = el(s2.body, 'div', {});
    const y1 = el(l2, 'button', { 'data-spend': '', 'data-kg-bdrop': 'a1' }), y2 = el(l2, 'button', { 'data-spend': '', 'data-kg-bdrop': 'c3' });
    s2.at(0); s2.click(y1, 350, 300); s2.at(150); assert.ok(!s2.click(y2, 350, 380).stopped, 'a row 80 px lower works at once');
    /* keyboard and script clicks have no finger to protect */
    const s3 = scrim(); const z = el(s3.body, 'button', { 'data-spend': '' });
    s3.at(0); s3.click(z, 10, 10); s3.at(50); assert.ok(!s3.click(z, 10, 10, { detail: 0 }).stopped, 'keyboard press works');
    s3.at(60); assert.ok(!s3.click(z, 10, 10, { trusted: false }).stopped, 'script click works');
});

test('Oct 28 2026: the Kitchen is gone, so recipe rows carry no Add to kitchen pill; Open / Cook / Save stay ordinary buttons', () => {
    const C = require('../bot-recipe-core.js');
    C.kitchenOn(false);
    const row = C.rowHTML({ key: 'c1', id: '5', count: 5 }, 0);
    assert.doesNotMatch(row, /data-crb="kitchen"/, 'no Add to kitchen');
    for (const a of ['open', 'cook', 'save']) assert.match(row, new RegExp('data-crb="' + a + '"'), a + ' is still there');
    assert.ok(!/<button[^>]*data-spend[^>]*data-crb="(open|cook|save)"/.test(row), 'Open / Cook / Save are untouched');
    assert.strictEqual(C.rowHTML({ key: 'c2', foods: [{ n: 'Eier' }] }, 0), '', 'a row that was only the kitchen pill is gone');
});

test('BH-041b: a two-step delete is not armed and confirmed by one double tap', () => {
    for (const cls of ['r2-btn danger big cy-del armed', 'cw-del armed', 'cm-mini r2-del armed', 'sp-del sure']) {
        const s = scrim(); const host = el(s.body, 'div', {});
        const plain = el(host, 'button', { class: cls.replace(/ (armed|sure)$/, '') });
        s.at(0); assert.ok(!s.click(plain, 200, 600).stopped, cls + ': the arming tap works');
        const armed = el(host, 'button', { class: cls }); /* repainted, now "Tap again to delete" */
        s.at(140); const b = s.click(armed, 202, 603); assert.ok(b.stopped && b.prevented, cls + ': the 2nd tap of the double tap does not confirm');
        s.at(700); assert.ok(!s.click(armed, 202, 603).stopped, cls + ': a deliberate confirm tap works');
    }
    /* the 3rd tap of a triple tap is still inside ARM_MS from the arming tap */
    { const s = scrim(); const a = el(s.body, 'button', { class: 'cw-del' }), b = el(s.body, 'button', { class: 'cw-del armed' });
      s.at(0); s.click(a, 50, 50); s.at(120); s.click(b, 50, 50); s.at(260); assert.ok(s.click(b, 50, 50).stopped, 'triple tap does not confirm'); }
    /* an armed button tapped where the last tap was not, a keyboard confirm, and ordinary double taps are untouched */
    { const s = scrim(); const other = el(s.body, 'button', { class: 'thing' }), b = el(s.body, 'button', { class: 'cy-del armed' });
      s.at(0); s.click(other, 50, 50); s.at(150); assert.ok(!s.click(b, 200, 600).stopped, 'armed button far from the last tap works'); }
    { const s = scrim(); const b = el(s.body, 'button', { class: 'cy-del armed' });
      s.at(0); s.click(b, 200, 600, { detail: 0 }); s.at(100); assert.ok(!s.click(b, 200, 600, { detail: 0 }).stopped, 'keyboard confirm works'); }
    { const s = scrim(); const b = el(s.body, 'button', { class: 'next' }), d = el(s.body, 'div', { class: 'joy armed' });
      s.at(0); s.click(b, 100, 100); s.at(120); assert.ok(!s.click(b, 100, 100).stopped, 'ordinary button double tap untouched');
      s.at(2000); s.click(d, 300, 700); s.at(2100); assert.ok(!s.click(d, 300, 700).stopped, 'only armed BUTTONS count'); }
});

test('BH-041b: the armed / sure classes it relies on are still what the two-step deletes draw', () => {
    const h = read('index.html'), cw = read('cycle-world.js'), sp = read('spirit.js');
    assert.match(h, /cy-del' \+ \(delArm \? " armed" : ""\)/, 'Cycle sheet delete');
    assert.match(h, /closest\("\[data-r2del\]"\)[\s\S]{0,400}classList\.add\("armed"\)/, 'chat message delete');
    assert.match(h, /<button class="cm-mini r2-del" data-r2del=/, 'chat delete is a button');
    assert.match(cw, /<button type="button" class="cw-del' \+ \(delArm \? ' armed' : ''\)/, 'Cycle world delete');
    assert.match(sp, /classList\.contains\('sure'\)\) \{ b\.classList\.add\('sure'\)/, "remove today's meal");
});
