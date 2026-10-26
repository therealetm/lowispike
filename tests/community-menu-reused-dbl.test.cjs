'use strict';
/* BH-038 (bug hunt run 38, 26 Oct 2026): a double tap on Community's menu button opened the menu and shut it again at once.
   Found by playing the live build 20261026-101115 (BUGHUNT/playtest/probe-menu-dbl.cjs, mock cloud): after the menu had been open
   once, every double tap on the menu button logged the button, then "BACKDROP" 17-250 ms later, and the menu was gone (Chromium 390
   and WebKit iPhone 13 alike). The menu (.rm-menu) is a full-screen body element made once and shown again by toggling `hidden`,
   so fresh-scrim (BH-025/028) only protected its very first open (P-REUSED-OVERLAY, like #whX in BH-035).
   Rule: toggleMenu marks the menu on every hidden->shown edge (fresh-scrim's same-spot rule: a real tap within 44 px of the opening
   tap is swallowed for 400 ms), and a tap that closes it (a row or the backdrop) is spent (BH-033), so the 2nd tap of that double
   tap does not press what the closing menu uncovers. A deliberate later tap, a tap elsewhere, keyboard and script clicks work. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

/* the real fresh-scrim.js plus community-rooms-ui.js's own toggleMenu (cut out of the file) against small stubs */
function setup() {
    let t = 1000; const winL = [];
    const body = { nodeType: 1, kids: [], appendChild(n) { n.parentNode = body; n.isConnected = true; this.kids.push(n); } };
    const W = { innerWidth: 390, innerHeight: 844, performance: { now: () => t }, addEventListener(type, f, cap) { winL.push({ type, f, cap }); },
        MutationObserver: function () { this.observe = () => {}; } };
    vm.runInNewContext(read('fresh-scrim.js'), { window: W, document: { body, addEventListener() {} }, Date });
    const node = (parent, cls, full) => ({ nodeType: 1, parentNode: parent, className: cls || '', hidden: false, style: { setProperty() {} }, dataset: {},
        listeners: {}, addEventListener(type, f) { this.listeners[type] = f; }, setAttribute() {}, contains() { return false; }, querySelector() { return null; }, querySelectorAll() { return []; },
        closest() { return null; }, focus() {}, getBoundingClientRect: () => (full ? { width: 390, height: 844, left: 0, top: 0, bottom: 844 } : { width: 44, height: 44, left: 20, top: 60, bottom: 104 }) });
    const D = { body, activeElement: null, createElement: () => node(null, '', true), getElementById: () => null, addEventListener() {} };
    const src = read('community-rooms-ui.js');
    const i0 = src.indexOf('function fresh(el)'), i = i0 > 0 ? i0 : src.indexOf('function toggleMenu('), j = src.indexOf("D.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu", i);
    assert.ok(i > 0 && j > i, 'toggleMenu() (with its fresh() and spend() helpers) found in community-rooms-ui.js');
    const btn = node(null, 'rm-id rm-menu-btn'); const bar = { querySelector: () => btn };
    const copied = [];
    const ctx = { W, D, bar, menu: null, paintMenu() {}, setTimeout() {}, lastDirected: () => null, copyText: (u) => copied.push(u), inviteUrl: () => 'invite', tr: k => k,
        copyView() {}, cur: () => '', paint() {}, view: '', from: '' };
    vm.runInNewContext('var menu=null;\n' + src.slice(i, j) + '\nthis.toggleMenu=toggleMenu;this.getMenu=()=>menu;', ctx);
    const tap = (target, x, y, o = {}) => { const e = { target, isTrusted: o.trusted !== false, detail: o.detail == null ? 1 : o.detail, clientX: x, clientY: y, timeStamp: t,
        prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; } };
        winL.filter(l => l.type === 'click' && l.cap).forEach(l => l.f(e));
        if (!e.stopped) { for (let n = target; n; n = n.parentNode) if (n.listeners && n.listeners.click) { n.listeners.click(e); break; } }
        return e; };
    return { ctx, body, node, tap, btn, copied, at: ms => { t = 1000 + ms; } };
}
/* the menu was opened and closed long ago (made once), then the menu button gets a real tap that opens it again */
function reopen(k) {
    k.at(-12000); k.ctx.toggleMenu(true); k.ctx.toggleMenu(false);
    const m = k.ctx.getMenu(); assert.ok(m && m.hidden, 'menu exists and is hidden');
    k.at(0); const first = k.tap(k.btn, 42, 82); assert.ok(!first.stopped, 'the first tap reaches the button'); k.ctx.toggleMenu();
    assert.strictEqual(m.hidden, false, 'the first tap opens the menu');
    return m;
}

test('BH-038: the 2nd tap of a double tap on the menu button does not shut the menu it just opened', () => {
    for (const gap of [17, 120, 250, 350]) {
        const k = setup(); const m = reopen(k);
        k.at(gap); const e = k.tap(m, 43, 84);
        assert.ok(e.prevented && e.stopped, 'gap ' + gap + ' ms: the backdrop ignores it');
        assert.strictEqual(m.hidden, false, 'gap ' + gap + ' ms: the menu stays open');
    }
});

test('BH-038: the backdrop still closes: a deliberate tap after 400 ms, a tap off the spot, keyboard and script clicks', () => {
    let k = setup(), m = reopen(k);
    k.at(460); k.tap(m, 42, 82); assert.strictEqual(m.hidden, true, 'same spot after the window');
    k = setup(); m = reopen(k);
    k.at(150); k.tap(m, 200, 700); assert.strictEqual(m.hidden, true, 'a tap far from the button');
    k = setup(); m = reopen(k);
    k.at(150); k.tap(m, 42, 82, { detail: 0 }); assert.strictEqual(m.hidden, true, 'keyboard');
    k = setup(); m = reopen(k);
    k.at(150); k.tap(m, 42, 82, { trusted: false }); assert.strictEqual(m.hidden, true, 'element.click()');
});

test('BH-038: a row that closes the menu spends its tap, so the 2nd tap does not press what the menu uncovered', () => {
    const k = setup(); const m = reopen(k);
    const row = k.node(m, ''); row.dataset.rmm = 'invite'; row.closest = s => (s === '[data-rmm]' ? row : null);
    k.at(800); const e1 = k.tap(row, 120, 160); assert.ok(!e1.stopped, 'the row tap works');
    assert.strictEqual(m.hidden, true, 'the row closes the menu'); assert.deepStrictEqual(k.copied, ['invite']);
    const under = k.node(k.body, 'cm-msg');
    k.at(950); assert.ok(k.tap(under, 122, 158).stopped, '2nd tap 150 ms later on the same spot is swallowed');
    k.at(1300); assert.ok(!k.tap(under, 122, 158).stopped, 'a later tap works');
});

test('BH-038: a backdrop tap that closes is spent too; a menu opened by a script is never guarded', () => {
    let k = setup(), m = reopen(k);
    k.at(700); k.tap(m, 300, 500); assert.strictEqual(m.hidden, true);
    const under = k.node(k.body, 'cg-field');
    k.at(850); assert.ok(k.tap(under, 301, 502).stopped, 'the 2nd tap of a double tap on the backdrop presses nothing under it');
    k = setup(); k.at(-12000); k.ctx.toggleMenu(true); k.ctx.toggleMenu(false); m = k.ctx.getMenu();
    k.at(0); k.ctx.toggleMenu(true); /* opened by code, no real tap just before */
    k.at(100); k.tap(m, 42, 82); assert.strictEqual(m.hidden, true, 'nothing to protect');
});
