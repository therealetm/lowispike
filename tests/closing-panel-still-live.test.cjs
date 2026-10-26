'use strict';
/* BH-036 (bug hunt run 36, 26 Oct 2026, pattern P-CLOSING-STILL-LIVE): Shop, Give a hand, Shop finds and the Seller Zone fade out
   for 240-260 ms after they close and stayed clickable while fading. Found by playing the live build 20261026-082829
   (BUGHUNT/playtest/probe-stp-dbl.cjs, Chromium 390, mock cloud): a double tap on "Scan in the shop" pressed the same button
   again in the fading Shop 97 ms later, so the shop camera opened twice (closed and restarted); "Shopping list" opened twice at
   47 and 122 ms. When the panel had gone, the 2nd tap pressed the Home bubble under the finger instead (Scan at 200 ms, Sleep).
   Give a hand threw on a tap while fading (ov.contains on null), and Shop finds could open the photo picker for a closed panel.
   Rule: a closing panel ignores every tap (onClick returns unless the panel is still the open one), and a real tap that closes it
   calls LowiFreshScrim.spent(e), so the 2nd tap of a double tap within 44 px and 400 ms presses nothing (as BH-033 for blooms).
   A deliberate tap after 400 ms, a tap elsewhere, keyboard and script clicks work as before. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

/* the real fresh-scrim.js in a small window */
function scrim() {
    let t = 1000; const winL = [];
    const body = { nodeType: 1 };
    const W = { innerWidth: 390, innerHeight: 844, performance: { now: () => t }, addEventListener(type, f, cap) { winL.push({ type, f, cap }); },
        MutationObserver: function () { this.observe = () => {}; } };
    vm.runInNewContext(read('fresh-scrim.js'), { window: W, document: { body, addEventListener() {} }, Date });
    /* a click: through the window capture guard first, then (unless stopped) the panel's own listener */
    const click = (target, x, y, panelClick, o = {}) => {
        const e = { target, isTrusted: o.trusted !== false, detail: o.detail == null ? 1 : o.detail, clientX: x, clientY: y, timeStamp: t,
            prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; } };
        winL.filter(l => l.type === 'click' && l.cap).forEach(l => l.f(e));
        if (!e.stopped && panelClick) panelClick(e);
        return e;
    };
    return { W, body, click, at: ms => { t = 1000 + ms; } };
}
/* a tiny element: attributes, parent, closest() for [data-x] / [data-x="v"] selectors, contains() */
function el(parent, attrs, tag) {
    const n = { nodeType: 1, parentNode: parent || null, tagName: tag || 'BUTTON', attrs: attrs || {}, dataset: {},
        getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }, hasAttribute(k) { return k in this.attrs; },
        contains(m) { for (let c = m; c; c = c.parentNode) if (c === this) return true; return false; },
        closest(sel) {
            const parts = sel.split(',').map(s => s.trim());
            for (let c = this; c && c.attrs; c = c.parentNode) for (const p of parts) {
                const m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(p); if (!m) continue;
                if (m[1] in c.attrs && (m[2] == null || c.attrs[m[1]] === m[2])) return c;
            }
            return null;
        } };
    return n;
}
/* the panel's real onClick (and the spend helper above it), cut out of its file and run against stubs */
function panel(file, k, extra) {
    const src = read(file);
    const j = src.indexOf('\n    function onClick(e) {'), s = src.lastIndexOf('\n    function spend(e)', j), end = src.indexOf('\n    }\n', j);
    assert.ok(j > 0 && end > j, file + ': onClick() found');
    const i = s > 0 && j - s < 200 ? s : j; /* its spend() helper sits right above it */
    const calls = [];
    const ctx = Object.assign({ W: k.W, D: {}, Date, ov: null, calls, setTimeout: (f) => { calls.push('timer'); f(); }, console }, extra(calls));
    const shut = ctx.close; ctx.close = function () { shut.apply(ctx, arguments); ctx.setOv(null); }; /* close() lets go of the panel, as the real ones do */
    vm.runInNewContext(src.slice(i, end + 6) + '\nthis.onClick = onClick; this.setOv = v => { ov = v; };', ctx);
    return ctx;
}
const storePicks = k => panel('store-picks.js', k, calls => ({
    dragAt: 0, qv: null, snackClick: () => false, kitClick: () => false, qaClick: () => false, onSz: () => false, SZ: () => null, view: 'list',
    close() { calls.push('close'); }, setTab() { calls.push('tab'); }, openQuick() { calls.push('quick'); }, paint() { calls.push('paint'); },
    showList() { calls.push('list-view'); }, locate() {}, save() {}
}));
/* the Shop panel at rest, with "Scan in the shop" at (120, 760) */
function shop(k) {
    const P = storePicks(k), ov = el(k.body, {}, 'DIV'), card = el(ov, {}, 'DIV');
    const scan = el(card, { 'data-stp': 'scanshop' }), list = el(card, { 'data-stp': 'mylist' }), x = el(card, { 'data-stp': 'close' }), row = el(card, { 'data-stp-item': '3' });
    P.setOv(ov);
    k.W.LowiShopScan = { open() { P.calls.push('CAMERA'); } };
    k.W.tdShopOpen = () => P.calls.push('LIST');
    const go = e => P.onClick(e);
    return { P, ov, scan, list, x, row, go };
}

test('BH-036: a double tap on "Scan in the shop" opens the shop camera once (2nd tap 50-350 ms later on the fading Shop)', () => {
    for (const gap of [50, 97, 200, 350]) {
        const k = scrim(), s = shop(k);
        k.at(0); k.click(s.scan, 120, 760, s.go);
        k.at(gap); const e = k.click(s.scan, 121, 762, s.go);
        assert.deepStrictEqual(s.P.calls.filter(c => c === 'CAMERA').length, 1, 'gap ' + gap + ' ms: camera opened once');
        assert.ok(e.stopped, 'gap ' + gap + ' ms: the 2nd tap is swallowed before anything under it acts');
    }
});

test('BH-036: a double tap on "Shopping list" opens the list once', () => {
    for (const gap of [47, 122, 250]) {
        const k = scrim(), s = shop(k);
        k.at(0); k.click(s.list, 260, 760, s.go);
        k.at(gap); k.click(s.list, 260, 760, s.go);
        assert.strictEqual(s.P.calls.filter(c => c === 'LIST').length, 1, 'gap ' + gap + ' ms');
    }
});

test('BH-036: the 2nd tap does not press the Home bubble the closed Shop uncovered under the finger', () => {
    const k = scrim(), s = shop(k);
    k.at(0); k.click(s.list, 260, 760, s.go);
    const bubble = el(k.body, { 'data-orbit': 'scan' }); let opened = 0;
    k.at(200); k.click(bubble, 262, 758, () => { opened++; });
    assert.strictEqual(opened, 0, 'Scan bubble under the finger stays shut');
    k.at(460); k.click(bubble, 262, 758, () => { opened++; });
    assert.strictEqual(opened, 1, 'a deliberate tap after 400 ms opens it');
});

test('BH-036: a fading Shop ignores a tap anywhere on it (X, then a product row 120 ms later)', () => {
    const k = scrim(), s = shop(k);
    k.at(0); k.click(s.x, 340, 790, s.go);
    assert.ok(s.P.calls.includes('close'));
    k.at(120); k.click(s.row, 195, 300, s.go);
    assert.ok(!s.P.calls.includes('quick'), 'no product card opens for a closed Shop');
});

test('BH-036: keyboard and script clicks are never swallowed, and the open Shop still works', () => {
    const k = scrim(), s = shop(k);
    k.at(0); k.click(s.row, 195, 300, s.go);
    assert.ok(s.P.calls.includes('quick'), 'a product row opens its card');
    const k2 = scrim(), s2 = shop(k2);
    k2.at(0); k2.click(s2.scan, 120, 760, s2.go, { detail: 0 });
    const b = el(k2.body, {}); let n = 0; k2.at(100); k2.click(b, 120, 760, () => { n++; });
    assert.strictEqual(n, 1, 'Enter on the button marks nothing');
    const k3 = scrim(), s3 = shop(k3);
    k3.at(0); k3.click(s3.scan, 120, 760, s3.go, { trusted: false });
    const b3 = el(k3.body, {}); let m = 0; k3.at(100); k3.click(b3, 120, 760, () => { m++; });
    assert.strictEqual(m, 1, 'element.click() marks nothing');
});

test('BH-036: Give a hand ignores taps while it fades (it threw on ov.contains(null)) and marks its closing tap', () => {
    const k = scrim();
    const P = panel('gift-basket.js', k, calls => ({ close() { calls.push('close'); }, paint() { calls.push('paint'); }, tab: 'open', msg: '', dragAt: 0, pick() {}, skip() {}, undoSkip() {},
        addItem() { calls.push('add'); }, help() { calls.push('help'); } }));
    const ov = el(k.body, {}, 'DIV'), x = el(ov, { 'data-gb': 'close' }), help = el(ov, { 'data-gb-help': 'a1' });
    P.setOv(ov);
    k.at(0); k.click(x, 195, 800, e => P.onClick(e));
    assert.ok(P.calls.includes('close'));
    k.at(90); assert.doesNotThrow(() => k.click(help, 195, 400, e => P.onClick(e)), 'no TypeError for a tap on the fading panel');
    assert.ok(!P.calls.includes('help'), 'nothing is offered on a closed panel');
    const under = el(k.body, {}); let n = 0; k.at(150); k.click(under, 196, 801, () => { n++; });
    assert.strictEqual(n, 0, 'the 2nd tap on the X spot does not press Shop under it');
});

test('BH-036: Shop finds: a double tap on Scan opens the camera once, Photo does nothing on a fading panel', () => {
    const k = scrim();
    const P = panel('grocery-hunt.js', k, calls => ({ close() { calls.push('close'); }, askPhoto() { calls.push('PICKER'); }, paint() {}, S: {}, save() {}, refresh() {} }));
    const ov = el(k.body, {}, 'DIV'), scan = el(ov, { 'data-gh': 'scan' }), photo = el(ov, { 'data-gh': 'photo' });
    k.W.LowiShopScan = { open() { P.calls.push('CAMERA'); } };
    P.setOv(ov);
    k.at(0); k.click(scan, 120, 700, e => P.onClick(e));
    k.at(110); k.click(scan, 120, 700, e => P.onClick(e));
    assert.strictEqual(P.calls.filter(c => c === 'CAMERA').length, 1);
    k.at(150); k.click(photo, 260, 500, e => P.onClick(e));
    assert.ok(!P.calls.includes('PICKER'), 'no photo picker for a closed panel');
});

test('BH-036: Seller Zone ignores taps while it fades and marks its closing tap', () => {
    const k = scrim();
    const P = panel('seller-zone.js', k, calls => ({ close() { calls.push('close'); }, paint() { calls.push('paint'); }, cat: 'all', region: 'eu', RKEY: 'k', localStorage: { setItem() {} } }));
    const ov = el(k.body, {}, 'DIV'), x = el(ov, { 'data-sz': 'close' }), chip = el(ov, { 'data-sz-cat': 'chips' });
    P.setOv(ov);
    k.at(0); k.click(x, 340, 60, e => P.onClick(e));
    k.at(100); k.click(chip, 100, 120, e => P.onClick(e));
    assert.ok(!P.calls.includes('paint'), 'no repaint of a closed zone');
    const under = el(k.body, {}); let n = 0; k.at(160); k.click(under, 341, 61, () => { n++; });
    assert.strictEqual(n, 0, 'the 2nd tap on the X spot presses nothing under it');
});
