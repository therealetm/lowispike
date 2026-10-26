'use strict';
/* BH-033 (bug hunt run 33, 26 Oct 2026): a double tap on a bloom choice reopened the bloom you had just answered.
   Found by playing the live build 20261026-055906 (BUGHUNT/playtest/probe-orb-under.cjs, probe-choice-dbl.cjs, WebKit iPhone 13):
   Move's "Steady" orb rests on top of the Move bubble. The first tap logs Steady and folds the bloom; a folding bloom lets taps
   through at once (.hb2-bloom.off = pointer-events none), so the second tap of the double tap landed on the Move bubble and opened
   the Move bloom again (live: "close move" then "OPEN move" 239 ms later), with its choices ready to be pressed by a third tap.
   This is the mirror of BH-026 / BH-028 (a quick second tap pressing what just appeared under the finger): here it presses what
   was uncovered under the finger. Rule: a tap that makes a choice and closes what it was on calls LowiFreshScrim.spent(e); for
   SPOT_MS after it, a real tap within SPOT_PX of that tap is swallowed (by the tap's own time stamp). A tap elsewhere, a tap after
   the window, a keyboard press (detail 0) and a script's click all work as before. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

function mk() {
    let t = 1000; const winL = [];
    const body = { nodeType: 1 };
    const node = (parent, cls, w = 0, h = 0) => ({ nodeType: 1, parentNode: parent, className: cls || '', getBoundingClientRect: () => ({ width: w, height: h }) });
    const W = { innerWidth: 390, innerHeight: 844, performance: { now: () => t }, addEventListener(type, f, cap) { winL.push({ type, f, cap }); },
        MutationObserver: function () { this.observe = () => {}; } };
    vm.runInNewContext(read('fresh-scrim.js'), { window: W, document: { body, addEventListener() {} }, Date });
    const ev = (target, x, y, o = {}) => ({ target, isTrusted: o.trusted !== false, detail: o.detail == null ? 1 : o.detail, clientX: x, clientY: y, timeStamp: o.ts == null ? t : o.ts,
        prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; } });
    const tap = (target, x, y, o) => { const e = ev(target, x, y, o); winL.filter(l => l.type === 'click' && l.cap).forEach(l => l.f(e)); return e; };
    return { W, body, node, tap, ev, at: ms => { t = 1000 + ms; } };
}
/* Home on a WebKit iPhone 13: Move's bloom is open, its Steady orb at (349, 279) rests on the Move bubble */
function pickSteady(k) {
    const bloom = k.node(k.body, 'hb2-bloom on'), steady = k.node(bloom, 'hb2-orb hb2-steady');
    const home = k.node(k.body, 'tab'), move = k.node(home, 'wh-cell');
    k.at(0); const first = k.tap(steady, 349, 279);
    k.W.LowiFreshScrim.spent(first); /* inside the orb's click handler: the choice runs and the bloom folds */
    return { first, move, steady };
}

test('BH-033: fresh-scrim exposes spent() and quiet()', () => {
    const k = mk(); assert.strictEqual(typeof k.W.LowiFreshScrim.spent, 'function'); assert.strictEqual(typeof k.W.LowiFreshScrim.quiet, 'function');
});

test('BH-033: the second tap of a double tap on Steady does not reopen Move through the bubble it uncovered', () => {
    for (const gap of [40, 120, 250, 380]) {
        const k = mk(); const { move } = pickSteady(k);
        k.at(gap); const e = k.tap(move, 351, 283);
        assert.ok(e.prevented && e.stopped, 'gap ' + gap + ' ms: swallowed in capture');
    }
});

test('BH-033: the tap that made the choice is never swallowed by its own mark', () => {
    const k = mk(); const { first } = pickSteady(k);
    assert.ok(!first.stopped, 'the first tap went through');
    assert.strictEqual(k.W.LowiFreshScrim.quiet(first), false, 'quiet() is false for the same tap');
});

test('BH-033: a busy main thread does not let the second tap through: it counts by its own time stamp', () => {
    const k = mk(); const { move } = pickSteady(k);
    k.at(1400); assert.ok(k.tap(move, 349, 279, { ts: 1000 + 170 }).stopped, 'touched at 170 ms, handled at 1.4 s');
    k.at(1500); assert.ok(!k.tap(move, 349, 279, { ts: 1000 + 700 }).stopped, 'touched at 700 ms runs, however late');
});

test('BH-033: a tap elsewhere, a tap after the window, keyboard and script clicks all work at once', () => {
    const k = mk(); const { move } = pickSteady(k);
    k.at(100); assert.ok(!k.tap(move, 200, 600).stopped, 'a quick tap far away (another bubble)');
    k.at(450); assert.ok(!k.tap(move, 349, 279).stopped, 'same spot after 400 ms: a real tap on Move opens it');
    const k2 = mk(); const r2 = pickSteady(k2);
    k2.at(60); assert.ok(!k2.tap(r2.move, 349, 279, { detail: 0 }).stopped, 'Enter / Space');
    k2.at(70); assert.ok(!k2.tap(r2.move, 349, 279, { trusted: false }).stopped, 'element.click()');
});

test('BH-033: spent() ignores keyboard and script clicks (nothing under a finger to protect)', () => {
    const k = mk(); const b = k.node(k.body, 'x');
    k.at(0); k.W.LowiFreshScrim.spent(k.ev(b, 349, 279, { detail: 0 }));
    k.at(100); assert.ok(!k.tap(b, 349, 279).stopped, 'after a keyboard choice');
    k.W.LowiFreshScrim.spent(k.ev(b, 349, 279, { trusted: false }));
    k.at(150); assert.ok(!k.tap(b, 349, 279).stopped, 'after a scripted choice');
});

test('BH-033: a bloom choice that folds the bloom marks the tap, and the bubble tap handler honours quiet()', () => {
    const src = read('home-blooms-v2.js');
    const i = src.indexOf('function onBloomClick('), j = src.indexOf('/* taps and holds on the four bubbles');
    const click = src.slice(i, j);
    const keepAt = click.indexOf('if (a.keep)'), spentAt = click.search(/LowiFreshScrim[^;]{0,40};[^;]*\.spent\(e\)|freshSpent\(e\)/);
    assert.ok(spentAt > keepAt && keepAt > 0, 'spent(e) runs for a choice that folds the bloom, after the keep orbs returned');
    const k = src.indexOf('function onClick('), body = src.slice(k, src.indexOf('function onKey(', k));
    assert.match(body, /[qQ]uiet\(e\)/, 'onClick (a bubble tap, window capture) checks quiet(e) itself, whatever the listener order');
});
