'use strict';
/* BH-039 (bug hunt run 39, 26 Oct 2026): a double tap on a Scan button that opens the camera inside Misty's world (#spWorld: the
   Products empty-state "Scan" in Cook, herb care) pressed the camera with its 2nd tap. Found by playing the live build 20261026-111102
   (BUGHUNT/playtest/probe-spworld-dbl.cjs, mock cloud, WebKit iPhone 13): while the world springs open it sits shrunk over the middle
   of the screen, so a 2nd tap 100-300 ms later focused the barcode field or the name field (keyboard up) or opened Deep analyze,
   which leaves the app for ChatGPT. #spWorld is made once at boot and shown again by `hidden = false`, so fresh-scrim (BH-025/028)
   never saw it as new (P-REUSED-OVERLAY, like #whX in BH-035 and the Community menu in BH-038).
   Rule: spirit.js open() marks the world on every show (LowiFreshScrim.mark): a real tap within 44 px of the opening tap is swallowed
   for 400 ms. A tap elsewhere, a deliberate later tap, keyboard and script clicks still work. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

/* the real fresh-scrim.js plus spirit.js's own open() (cut out of the file) against small stubs */
function setup() {
    let t = 1000; const winL = [], obs = [];
    const body = { nodeType: 1, kids: [], append(n) { n.parentNode = body; this.kids.push(n); obs.forEach(f => f([{ addedNodes: [n] }])); } };
    const W = { innerWidth: 390, innerHeight: 664, performance: { now: () => t }, addEventListener(type, f, cap) { winL.push({ type, f, cap }); },
        MutationObserver: function (f) { this.observe = () => obs.push(f); } };
    vm.runInNewContext(read('fresh-scrim.js'), { window: W, document: { body, addEventListener() {} }, Date });
    const node = (parent, id) => ({ nodeType: 1, parentNode: parent, id: id || '', className: '', hidden: false, listeners: {},
        addEventListener(type, f) { this.listeners[type] = f; }, querySelector() { return node(this); }, append() {}, focus() {},
        getBoundingClientRect: () => ({ width: 390, height: 664, left: 0, top: 0 }) });
    /* the world was made once at boot, long ago, and is hidden now; the camera field lives inside it */
    const world = node(null, 'spWorld'); world.hidden = true; body.append(world);
    const field = node(node(world), 'b3Bc'); const elsewhere = node(null, 'other');
    t = 60000;
    const src = read('spirit.js'), i = src.indexOf('    function open(opts) {'), j = src.indexOf('    function stopPhoto()', i);
    assert.ok(i > 0 && j > i, 'open() found in spirit.js');
    const ctx = { window: { LowiFreshScrim: W.LowiFreshScrim }, D: { getElementById: () => null, documentElement: { classList: { add() {} } } }, innerWidth: 390, innerHeight: 664,
        world, creature: {}, opened: false, motion: {}, ensure() {}, paint() {}, expansion() {}, physics() {}, scan() {} };
    vm.runInNewContext(src.slice(i, j) + '\nthis.open=open;this.reset=()=>{opened=false;world.hidden=true;};', ctx);
    const fire = (type, target, x, y, o = {}) => { const e = { type, target, isTrusted: o.trusted !== false, detail: o.detail == null ? 1 : o.detail, clientX: x, clientY: y, timeStamp: t,
        prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; } };
        winL.filter(l => l.type === type && l.cap).forEach(l => l.f(e));
        return e; };
    const tap = (target, x, y, o) => fire('click', target, x, y, o);
    const down = (target, x, y, o) => fire('mousedown', target, x, y, o);
    /* fields answer closest('input,...'); the opener and plain nodes do not */
    field.tagName = 'INPUT'; field.closest = () => field; elsewhere.closest = () => null;
    const button = node(node(world), 'b3CamAct'); button.closest = () => null;
    return { ctx, world, field, button, elsewhere, tap, down, at: ms => { t = 60000 + ms; } };
}
/* a real tap on the Scan button (outside the world) that opens the camera inside the world */
function openByTap(k, x, y) { const e = k.tap(k.elsewhere, x, y); assert.ok(!e.stopped, 'the opening tap itself passes'); k.ctx.open({ embedded: true }); return e; }

test('a 2nd tap on the same spot right after the world opens is swallowed (it used to focus the camera field)', () => {
    for (const gap of [30, 120, 250, 380]) {
        const k = setup(); k.at(0); openByTap(k, 195, 280);
        assert.strictEqual(k.world.hidden, false, 'world shown');
        k.at(gap); const e = k.tap(k.field, 197, 284);
        assert.ok(e.stopped && e.prevented, 'gap ' + gap + ' ms: 2nd tap swallowed');
    }
});

test('every show is protected, not only the first one (the world is reused)', () => {
    const k = setup();
    for (let n = 0; n < 3; n++) {
        k.at(n * 5000); openByTap(k, 195, 280);
        k.at(n * 5000 + 150); assert.ok(k.tap(k.field, 195, 280).stopped, 'show ' + (n + 1) + ': 2nd tap swallowed');
        k.ctx.reset();
    }
});

test('a tap elsewhere, a deliberate later tap, a keyboard press and a script click still work', () => {
    let k = setup(); k.at(0); openByTap(k, 195, 280);
    k.at(150); assert.ok(!k.tap(k.field, 195, 400).stopped, 'tap 120 px away passes');
    k = setup(); k.at(0); openByTap(k, 195, 280);
    k.at(520); assert.ok(!k.tap(k.field, 195, 280).stopped, 'deliberate tap after 400 ms passes');
    k = setup(); k.at(0); openByTap(k, 195, 280);
    k.at(100); assert.ok(!k.tap(k.field, 195, 280, { detail: 0 }).stopped, 'keyboard press passes');
    k.at(110); assert.ok(!k.tap(k.field, 195, 280, { trusted: false }).stopped, 'script click passes');
});

test('the swallowed 2nd tap does not focus the field either (focus comes on mousedown: keyboard up on iPhone)', () => {
    const k = setup(); k.at(0); openByTap(k, 195, 280);
    k.at(140); const d = k.down(k.field, 196, 282);
    assert.ok(d.prevented, 'mousedown on the field: default (focus) prevented');
    assert.ok(!d.stopped, 'mousedown still reaches other listeners');
    k.at(150); assert.ok(k.tap(k.field, 196, 282).stopped, 'and its click is swallowed');
    /* only fields: a mousedown on a button keeps its default */
    k.at(160); assert.ok(!k.down(k.button, 196, 282).prevented, 'mousedown on a button untouched');
    /* a deliberate later tap, a tap elsewhere and a script event still focus the field */
    k.at(600); assert.ok(!k.down(k.field, 196, 282).prevented, 'later mousedown focuses');
    const k2 = setup(); k2.at(0); openByTap(k2, 195, 280);
    k2.at(100); assert.ok(!k2.down(k2.field, 195, 420).prevented, 'mousedown 140 px away focuses');
    k2.at(110); assert.ok(!k2.down(k2.field, 195, 280, { trusted: false }).prevented, 'script mousedown untouched');
});

test('a world opened without a tap (script, autopilot) has no spot to guard', () => {
    const k = setup(); k.at(0); k.ctx.open({ embedded: true });
    k.at(100); assert.ok(!k.tap(k.field, 195, 280).stopped, 'first real tap passes');
});
