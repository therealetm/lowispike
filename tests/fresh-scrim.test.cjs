'use strict';
/* BH-025: the second tap of a double tap landed on the backdrop that had just slid in and closed the sheet again (People from
   "N here now" on Chromium at 40-400 ms, Meal details on WebKit under 90 ms). fresh-scrim.js: a backdrop ignores real taps for
   its first 350 ms. Live probe: BUGHUNT/playtest/probe-people-abuse.cjs (GAPS=40,90,150). */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

function mk(vw = 390, vh = 844) {
    let t = 1000, mo = null; const winL = [];
    const body = { nodeType: 1 };
    const node = (parent, cls, w, h) => ({ nodeType: 1, parentNode: parent, className: cls || '', getBoundingClientRect: () => ({ width: w, height: h }) });
    const W = { innerWidth: vw, innerHeight: vh, performance: { now: () => t }, addEventListener(type, f, cap) { winL.push({ type, f, cap }); },
        MutationObserver: function (cb) { mo = cb; this.observe = () => {}; } };
    const D = { body, addEventListener() {} };
    vm.runInNewContext(read('fresh-scrim.js'), { window: W, document: D, Date });
    const add = n => mo([{ addedNodes: [n] }]);
    const click = (target, trusted = true) => { const e = { target, isTrusted: trusted, prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; } };
        winL.filter(l => l.type === 'click' && l.cap).forEach(l => l.f(e)); return e; };
    return { W, body, node, add, click, at: ms => { t = 1000 + ms; }, winL };
}

test('listens for clicks on window in the capture phase, before any overlay handler', () => {
    const { winL } = mk();
    assert.ok(winL.some(l => l.type === 'click' && l.cap === true));
});

test('a real tap on a full-screen overlay right after it appears is swallowed (People, ranking, gap, store sheets)', () => {
    const { body, node, add, click, at } = mk();
    const ov = node(body, 'pd-ov', 390, 844); add(ov);
    at(120); const e = click(ov);
    assert.ok(e.prevented && e.stopped, 'the second tap of the double tap must not reach the close handler');
});

test('a real tap on an .r2-scrim / .o8-scrim layer right after its sheet appears is swallowed (every R2 sheet, orbit sheet)', () => {
    const { body, node, add, click, at } = mk();
    const ov = node(body, 'r2-ov', 0, 0); add(ov);
    const scrim = node(ov, 'r2-scrim', 390, 844);
    at(60); assert.ok(click(scrim).stopped);
    const w = node(body, 'o8-wrap', 0, 0); add(w); const s2 = node(w, 'o8-scrim', 390, 844);
    at(200); assert.ok(click(s2).stopped);
});

test('after 350 ms a tap on the backdrop closes the sheet as before', () => {
    const { body, node, add, click, at } = mk();
    const ov = node(body, 'pd-ov', 390, 844); add(ov);
    at(360); const e = click(ov);
    assert.ok(!e.prevented && !e.stopped);
});

test('script clicks always pass, even right after the sheet appears', () => {
    const { body, node, add, click, at } = mk();
    const ov = node(body, 'pd-ov', 390, 844); add(ov);
    at(10); assert.ok(!click(ov, false).stopped);
});

test('buttons and content inside a fresh sheet are never blocked', () => {
    const { body, node, add, click, at } = mk();
    const ov = node(body, 'pd-ov', 390, 844); add(ov);
    const card = node(ov, 'pd-card', 390, 600), btn = node(card, 'pd-x', 40, 40);
    at(30); assert.ok(!click(card).stopped); assert.ok(!click(btn).stopped);
    const r2 = node(body, 'r2-ov', 0, 0); add(r2); const sh = node(r2, 'r2-sh', 390, 500);
    at(40); assert.ok(!click(sh).stopped, 'the sheet itself is not a scrim');
});

test('a small element added under <body> (a toast, a floating button) is not treated as a backdrop', () => {
    const { body, node, add, click, at } = mk();
    const toast = node(body, 'toast', 300, 60); add(toast);
    at(20); assert.ok(!click(toast).stopped);
});

test('an overlay that was already there (not just added) is not blocked', () => {
    const { body, node, click, at } = mk();
    const ov = node(body, 'pd-ov', 390, 844);
    at(5); assert.ok(!click(ov).stopped);
});

test('index.html loads fresh-scrim.js early and the service worker caches it', () => {
    const html = read('index.html'), sw = read('sw.js');
    assert.match(html, /<script src="fresh-scrim\.js\?v=/);
    assert.ok(html.indexOf('fresh-scrim.js?v=') < html.indexOf('people-directory.js?v='), 'before any sheet module');
    assert.ok(sw.includes('"fresh-scrim.js"'));
});
