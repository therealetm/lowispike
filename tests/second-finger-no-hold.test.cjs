/* BH-024 (bug hunt run 25): a hold is one finger. On Home a pinch whose SECOND finger landed on Misty opened her card (world-home.js
   wireMistyHold armed a hold for any finger that touched her, and only a second finger ON her cancelled one). Siblings of the same
   rule: Misty's hold in flight (misty-turn.js) kept counting while another finger dragged the world or held the controller, and a
   Community tab hold (community-tab-order.js) lifted the tab while another finger pinched the galaxy. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

/* world-home.js wireMistyHold, run for real with a fake document and a hand-driven clock */
function harness() {
    const src = read('world-home.js');
    const a = src.indexOf('    function wireMistyHold() {'), b = src.indexOf('    /* a tap = a pet', a);
    assert.ok(a > 0 && b > a, 'wireMistyHold found');
    const L = {}, timers = new Map(); let tid = 0, opened = 0;
    const D = { addEventListener: (n, f) => { (L[n] = L[n] || []).push(f); }, removeEventListener: (n, f) => { L[n] = (L[n] || []).filter(x => x !== f); } };
    const H = { classList: { contains: c => c === 'wh-on' } };
    const st = { lpOpened: false };
    const env = { D, H, st, openMisty: () => { opened++; }, navigator: {},
        setTimeout: (f, ms) => { timers.set(++tid, { f, at: ms }); return tid; }, clearTimeout: id => { timers.delete(id); } };
    const fn = new Function(...Object.keys(env), src.slice(a, b) + '\nreturn wireMistyHold;')(...Object.values(env));
    fn();
    const misty = { closest: s => (s === '#spBubble' ? misty : null) }, other = { closest: () => null };
    const fire = (n, o) => (L[n] || []).forEach(f => f(Object.assign({ preventDefault() {}, stopPropagation() {} }, o)));
    const elapse = () => { const all = [...timers.entries()]; timers.clear(); all.forEach(([, t]) => t.f()); };
    return { fire, elapse, misty, other, opened: () => opened };
}

test('one finger held still on Misty still opens her card', () => {
    const h = harness();
    h.fire('pointerdown', { pointerId: 1, isPrimary: true, target: h.misty, clientX: 195, clientY: 390 });
    h.elapse();
    assert.strictEqual(h.opened(), 1);
});

test('a pinch whose second finger lands on Misty does not open her card', () => {
    const h = harness();
    h.fire('pointerdown', { pointerId: 1, isPrimary: true, target: h.other, clientX: 324, clientY: 388 });   /* thumb on the Move bubble */
    h.fire('pointerdown', { pointerId: 2, isPrimary: false, target: h.misty, clientX: 190, clientY: 400 }); /* second finger on Misty */
    h.elapse();
    assert.strictEqual(h.opened(), 0);
});

test('a second finger anywhere drops a hold already counting on Misty', () => {
    const h = harness();
    h.fire('pointerdown', { pointerId: 1, isPrimary: true, target: h.misty, clientX: 195, clientY: 390 });
    h.fire('pointerdown', { pointerId: 2, isPrimary: false, target: h.other, clientX: 330, clientY: 500 });
    h.elapse();
    assert.strictEqual(h.opened(), 0);
});

test('a mouse press (always primary) still opens it, and the old two-finger-on-Misty cancel still works', () => {
    const h = harness();
    h.fire('pointerdown', { pointerId: 1, target: h.misty, clientX: 195, clientY: 390 });
    h.elapse();
    assert.strictEqual(h.opened(), 1);
    const k = harness();
    k.fire('pointerdown', { pointerId: 1, isPrimary: true, target: k.misty, clientX: 195, clientY: 390 });
    k.fire('pointerdown', { pointerId: 2, target: k.misty, clientX: 200, clientY: 395 });
    k.elapse();
    assert.strictEqual(k.opened(), 0);
});

test('in flight: another finger cancels her hold, and no hold is armed while the controller is held or by a second finger', () => {
    const js = read('misty-turn.js');
    assert.ok(/if \(S\.own && e\.pointerId !== S\.own\.id && !S\.own\.long\) \{ clearTimeout\(S\.own\.lp\)/.test(js), 'a second pointer clears the pending hold');
    assert.ok(/if \(e\.isPrimary !== false && !padHeld\(\)\) o\.lp = setTimeout\(\(\) => \{ if \(S\.own !== o \|\| o\.turned \|\| padHeld\(\)\) return;/.test(js), 'hold armed only for one free finger');
    /* the cancel runs before the early return for an existing gesture, or it would never be reached */
    assert.ok(js.indexOf('clearTimeout(S.own.lp); S.own.lp = 0;') < js.indexOf("if (S.own || (e.button != null && e.button !== 0)) return;"));
});

test('Community tabs: a second finger before the tab lifts ends the press without arranging', () => {
    const js = read('community-tab-order.js');
    assert.ok(/function onOther\(e\) \{ if \(g && e\.pointerId !== g\.id && !g\.lifted\) end\(false\); \}/.test(js));
    assert.ok(/W\[f\]\('pointerdown', onOther, true\)/.test(js), 'listened to only while a press is live (same add/remove switch)');
});

test('Scan hold: a second finger anywhere cancels it outright (not only when that finger happens to move)', () => {
    const js = read('bloom-ring.js');
    assert.ok(/if \(e\.isPrimary === false\) \{ scanCancel\(\); return; \}\n\s*const el = scanEl\(e\.target\);/.test(js));
});
