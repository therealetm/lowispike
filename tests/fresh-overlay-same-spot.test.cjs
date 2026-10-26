'use strict';
/* BH-028: with Reduce Motion a new sheet is at rest from its first frame, so the second tap of a double tap pressed whatever button
   the sheet put right under the finger. Live WebKit iPhone 13: a double tap on Log meal's "Snack" tile hit the Snack sheet's "Snap"
   27 ms later and opened the photo picker. fresh-scrim.js: for its first 400 ms a new overlay ignores a real tap within 44 px of the
   tap that opened it. Live probe: BUGHUNT/playtest/probe-slot-under.cjs (RECENT=1 DBL=1, RM on). */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

function mk() {
    let t = 1000, mo = null; const winL = [];
    const body = { nodeType: 1 };
    const node = (parent, cls, w = 0, h = 0) => ({ nodeType: 1, parentNode: parent, className: cls || '', getBoundingClientRect: () => ({ width: w, height: h }) });
    const W = { innerWidth: 390, innerHeight: 844, performance: { now: () => t }, addEventListener(type, f, cap) { winL.push({ type, f, cap }); },
        MutationObserver: function (cb) { mo = cb; this.observe = () => {}; } };
    vm.runInNewContext(read('fresh-scrim.js'), { window: W, document: { body, addEventListener() {} }, Date });
    const add = n => mo([{ addedNodes: [n] }]);
    /* a real tap: detail 1, a spot, and its own time stamp (= now unless given) */
    const tap = (target, x, y, o = {}) => { const e = { target, isTrusted: o.trusted !== false, detail: o.detail == null ? 1 : o.detail, clientX: x, clientY: y, timeStamp: o.ts == null ? t : o.ts,
        prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; } };
        winL.filter(l => l.type === 'click' && l.cap).forEach(l => l.f(e)); return e; };
    return { body, node, add, tap, at: ms => { t = 1000 + ms; } };
}
/* the Snack tile at (195, 505) opens the Snack sheet; its "Snap" button lands under the finger */
function openFromTile(k) {
    const tile = k.node(k.body, 'sp-slot');
    k.at(0); k.tap(tile, 195, 505);
    const ov = k.node(k.body, 'r2-ov'); k.at(5); k.add(ov);
    const sh = k.node(ov, 'r2-sh', 390, 600), snap = k.node(sh, 'sp-how'), other = k.node(sh, 'r2-btn');
    return { ov, snap, other };
}

test('a double tap on a tile does not press the button the new sheet put under the finger (Snack -> Snap)', () => {
    const k = mk(); const { snap } = openFromTile(k);
    k.at(32); const e = k.tap(snap, 197, 503);
    assert.ok(e.prevented && e.stopped, 'second tap of the double tap is swallowed in capture');
    k.at(160); assert.ok(k.tap(snap, 190, 520).stopped, 'a slower double tap (160 ms) on the same spot too');
});

test('a tap that waited in the queue while the main thread was busy still counts by its own time stamp', () => {
    const k = mk(); const { snap } = openFromTile(k);
    k.at(900); assert.ok(k.tap(snap, 195, 505, { ts: 1000 + 150 }).stopped, 'touched at 150 ms, handled at 900 ms');
});

test('the same spot works normally once the sheet has been there 400 ms', () => {
    const k = mk(); const { snap } = openFromTile(k);
    k.at(420); const e = k.tap(snap, 195, 505);
    assert.ok(!e.prevented && !e.stopped);
});

test('a quick tap somewhere else on the new sheet is never blocked', () => {
    const k = mk(); const { other } = openFromTile(k);
    k.at(60); assert.ok(!k.tap(other, 195, 300).stopped, '200 px away');
    k.at(80); assert.ok(!k.tap(other, 260, 505).stopped, '65 px to the side');
});

test('keyboard presses (detail 0) and script clicks pass at once', () => {
    const k = mk(); const { snap } = openFromTile(k);
    k.at(30); assert.ok(!k.tap(snap, 195, 505, { detail: 0 }).stopped, 'Enter / Space');
    k.at(40); assert.ok(!k.tap(snap, 195, 505, { trusted: false }).stopped, 'element.click()');
});

test('an overlay that was not opened by a tap (a timer, a server answer) gets no same-spot guard', () => {
    const k = mk();
    const tile = k.node(k.body, 'x'); k.at(0); k.tap(tile, 100, 100);
    k.at(2000); const ov = k.node(k.body, 'r2-ov'); k.add(ov); const b = k.node(ov, 'btn');
    k.at(2050); assert.ok(!k.tap(b, 100, 100).stopped, 'opened 2 s after the last tap: a tap on it is a real choice');
});

test('the guard follows the sheet when its module moves it out of <body> (Log meal in Misty\'s world)', () => {
    const k = mk(); const { ov, snap } = openFromTile(k);
    const world = k.node(k.body, 'sp-world'); ov.parentNode = world;
    k.at(50); assert.ok(k.tap(snap, 195, 505).stopped);
});

test('the tap that was swallowed does not become the opener of the next overlay', () => {
    const k = mk(); const { snap } = openFromTile(k);
    k.at(40); k.tap(snap, 195, 505);
    const ov2 = k.node(k.body, 'r2-ov'); k.at(45); k.add(ov2); const b = k.node(ov2, 'btn');
    k.at(70); assert.ok(k.tap(b, 195, 505).stopped, 'ov2 still links to the first tap (the tile) and is fresh: still a double tap');
    k.at(700); assert.ok(!k.tap(b, 195, 505).stopped);
});
