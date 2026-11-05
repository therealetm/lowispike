'use strict';
/* Nov 5 2026 (sheet-bubble handoff): holding the Home joystick opens every bubble, side by side with the old still hold
   (forward after HOLD_MS, faded while it runs, gone after VANISH_MS: tests/ui-joystick-fade.test.cjs and
   tests/ui-joystick-vanish.test.cjs stay exactly as they are). Where the thumb lands and where the companion is tell them apart:
   - a steady press on the MIDDLE of the stick while the companion rests at home: after LONG_MS (the app's long press,
     misty-turn.js K.LONG_MS) every bubble opens (LowiBloomRing.toggleAll); no forward hold, no fade, she stays home;
   - a press on the RIM (the stick tilted: forward, or to a side) keeps the old hold, its fade and its vanish, and never opens them;
   - while she is out (flying, inside a world, out in the galaxy) a still press is the old forward hold, as before;
   - Calm mode (html.cm-nav): any steady press opens every bubble and dragging is inert;
   - a drift past DRIFT px cancels the long press (a drag then steers as before); lift, pointercancel, lost capture, window blur,
     a hidden page and pagehide clear it, so it never fires afterwards;
   - the click that ends a hold that opened the bubbles is eaten once (iOS sends a click after touchend; by then the bubbles'
     backdrop is on top and would fold them straight away).
   Real pointer events on the misty-pad.js fake page (tests/fixtures/misty-pad-page.cjs), with the joystick given a real
   60 x 60 px box (the fixture's own box is the whole screen, where its default press point lands far off the middle). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { fakePage } = require('./fixtures/misty-pad-page.cjs');
const A = require('../misty-pad.js');
const MT = require('../misty-turn.js');

const VANISH = (() => { const m = /const VANISH_MS = (\d+)/.exec(fs.readFileSync(path.join(__dirname, '..', 'misty-pad.js'), 'utf8')); return m ? +m[1] : NaN; })();
const HOLD = MT.K.HOLD_MS;
const BOX = { left: 165, top: 680, width: 60, height: 60, right: 225, bottom: 740 };
const MID = { x: 195, y: 710 };              /* the middle of the stick */
const RIM_UP = { x: 195, y: 710 - 26 };      /* the upper rim: the stick tilted forward */
const RIM_SIDE = { x: 195 + 25, y: 710 + 6 }; /* the right rim */
const at = p => ({ clientX: p.x, clientY: p.y });

function page(o) {
    o = o || {};
    const p = fakePage();
    p.pad().getBoundingClientRect = () => Object.assign({}, BOX);
    const calls = [], thr = [];
    p.W.LowiBloomRing = { toggleAll() { calls.push(p.W.performance.now()); return o.ok !== false; } };
    p.W.LowiMistyTurn.thrust = v => thr.push(v);
    if (o.calm) p.D.documentElement.classList.add('cm-nav');
    (o.cls || []).forEach(c => p.D.documentElement.classList.add(c));
    const has = c => p.pad().classList.contains(c);
    const steered = () => p.sent.some(c => (c.vx || c.vy) && !('mode' in c));
    const chipOn = () => p.D.byId.whPadChip.classList.contains('on');
    return Object.assign(p, { calls, thr, has, steered, chipOn, gone: () => has('mp-gone') });
}
const evt = () => ({ cancelable: true, prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; }, stopImmediatePropagation() { this.stopped = true; } });

test('thresholds: the app\'s own long press and tap drift; the middle is the inner 70 % of the stick', () => {
    assert.equal(A.LONG_MS, MT.K.LONG_MS, 'the same long press as holding the companion (misty-turn.js K.LONG_MS)');
    assert.equal(A.DRIFT, MT.K.TAP_PX, 'the same drift that still counts as a tap or hold (misty-turn.js K.TAP_PX)');
    assert.ok(A.LONG_MS > HOLD, 'the forward hold (HOLD_MS) would always win if it were armed on the middle at home');
    assert.equal(A.centred(MID, BOX), true);
    assert.equal(A.centred({ x: MID.x + 20, y: MID.y }, BOX), true, '20 px of a 30 px radius: still the middle (the dashed well is 21 px)');
    assert.equal(A.centred(RIM_UP, BOX), false, 'upper rim');
    assert.equal(A.centred(RIM_SIDE, BOX), false, 'side rim');
    assert.equal(A.centred(MID, null), true, 'no box to measure: the middle');
    assert.equal(A.centred(MID, { left: 0, top: 0, width: 0, height: 0 }), true, 'an unmeasured box: the middle');
    assert.equal(A.longArmed('', false, true, false), true, 'home, middle');
    assert.equal(A.longArmed('', false, false, false), false, 'home, rim: the old hold');
    assert.equal(A.longArmed('drive', false, true, false), false, 'flying: the old hold');
    assert.equal(A.longArmed('', false, true, true), false, 'she is out (in a world, the galaxy, away): the old hold');
    assert.equal(A.longArmed('drive', true, false, true), true, 'Calm: any press');
});

test('a steady press on the middle at home opens every bubble at LONG_MS: no forward hold, no fade, she stays home', () => {
    const p = page();
    p.down(at(MID));
    p.advance(HOLD + 60);
    assert.ok(!p.has('mp-fwd'), 'the old forward hold does not start on the middle at home');
    assert.equal(p.faded(), false);
    p.advance(A.LONG_MS - HOLD - 80);
    assert.equal(p.calls.length, 0, 'nothing before LONG_MS');
    p.advance(40);
    assert.equal(p.calls.length, 1, 'every bubble opens at LONG_MS');
    assert.equal(p.faded(), false, 'opening the bubbles is not steering');
    assert.ok(!p.has('mp-fwd') && !p.thr.some(v => v), 'no thrust at any point');
    assert.equal(p.W.LowiPad.state().pad, '', 'the companion stays home');
    p.move(at({ x: MID.x + 40, y: MID.y - 25 }));
    assert.ok(!p.steered() && !p.faded(), 'once the bubbles opened, the rest of the press does nothing');
    p.up(at({ x: MID.x + 40, y: MID.y - 25 }));
    p.advance(1500);
    assert.equal(p.calls.length, 1, 'opened once');
    assert.ok(!p.chipOn(), 'the lift is not a tap (no how-to chip)');
    assert.ok(!p.has('mp-back') && !p.has('mp-down') && !p.has('mp-longing'), 'nothing left on');
    assert.equal(p.W.LowiPad.state().held, false);
});

test('a press on the rim (the stick tilted forward or sideways) keeps the forward hold, its fade and vanish, never the bubbles', () => {
    for (const pt of [RIM_UP, RIM_SIDE]) {
        const p = page();
        p.down(at(pt));
        p.advance(350);
        assert.ok(p.has('mp-fwd'), 'forward hold running ' + JSON.stringify(pt));
        assert.equal(p.faded(), true, 'faded while it runs');
        assert.equal(p.gone(), false);
        p.advance(VANISH + 50);
        assert.equal(p.gone(), true, 'gone after VANISH_MS');
        assert.equal(p.calls.length, 0, 'well past LONG_MS: no bubbles');
        p.up(at(pt));
        assert.equal(p.faded(), false);
        assert.equal(p.gone(), false);
        assert.ok(!p.has('mp-fwd'));
    }
});

test('while she is out (flying, inside a world, out in the galaxy) a still press on the middle is the forward hold, as before', () => {
    const cases = [{ name: 'flying', mode: 'drive' }, { name: 'inside a world', cls: ['mf-on', 'mf-in', 'wh-away'] }, { name: 'galaxy', cls: ['mf-galaxy'] }, { name: 'away', cls: ['wh-away'] }];
    for (const c of cases) {
        const p = page({ cls: c.cls });
        if (c.mode) p.W.LowiPad.mode(c.mode);
        p.down(at(MID));
        p.advance(350);
        assert.ok(p.has('mp-fwd'), c.name + ': forward hold');
        assert.equal(p.faded(), true, c.name + ': faded');
        p.advance(A.LONG_MS);
        assert.equal(p.calls.length, 0, c.name + ': no bubbles');
        p.up(at(MID));
        assert.equal(p.faded(), false, c.name);
    }
});

test('drift: a wobble up to DRIFT px still opens the bubbles; past DRIFT the long press is off and the drag steers as before', () => {
    let p = page();
    p.down(at(MID));
    p.move(at({ x: MID.x + 6, y: MID.y + 5 }));
    p.move(at({ x: MID.x + 7, y: MID.y - 7 }));
    assert.ok(!p.steered() && !p.faded(), 'a wobble inside DRIFT neither steers nor fades');
    p.advance(A.LONG_MS + 10);
    assert.equal(p.calls.length, 1, 'still a hold');
    p.up(at(MID));

    p = page();
    p.down(at(MID));
    p.advance(200);
    p.move(at({ x: MID.x + 20, y: MID.y - 12 }));
    assert.ok(!p.has('mp-longing'), 'the long press is cancelled');
    assert.equal(p.faded(), true, 'past DRIFT: a drag, steering, faded');
    assert.ok(p.sent.some(c => c.vx > 0 && c.vy > 0), 'it steers right / up');
    assert.equal(p.W.LowiPad.state().pad, 'drive');
    p.advance(A.LONG_MS + 200);
    assert.equal(p.calls.length, 0, 'the cancelled long press never fires');
    p.move(at({ x: MID.x + 22, y: MID.y - 13 }));
    assert.equal(p.faded(), true, 'keeps steering');
    p.up(at({ x: MID.x + 22, y: MID.y - 13 }));
    assert.equal(p.faded(), false);
});

test('lifting before LONG_MS is still a tap (the how-to chip), never a hold', () => {
    const p = page();
    p.down(at(MID));
    p.advance(200);
    p.up(at(MID));
    p.advance(A.LONG_MS + 400);
    assert.equal(p.calls.length, 0);
    assert.ok(p.chipOn() && /hold/.test(p.D.byId.whPadChip.textContent), 'one tap on a resting joystick shows the how-to');
    assert.equal(p.faded(), false);
    assert.ok(!p.has('mp-fwd') && !p.has('mp-longing'));
});

test('every way a press ends early clears the pending long press: cancel, lost capture, blur, hidden page, pagehide', () => {
    const ends = {
        pointercancel: p => p.cancel(at(MID)),
        lostpointercapture: p => p.lost(at(MID)),
        blur: p => p.W.fire('blur'),
        hidden: p => { p.D.hidden = true; p.D.fire('visibilitychange'); },
        pagehide: p => p.W.fire('pagehide')
    };
    for (const [name, end] of Object.entries(ends)) {
        const p = page();
        p.down(at(MID));
        p.advance(200);
        assert.ok(p.has('mp-longing'), name + ': armed first');
        end(p);
        assert.ok(!p.has('mp-longing'), name + ': cue off');
        p.advance(A.LONG_MS + 300);
        assert.equal(p.calls.length, 0, name + ': never fires afterwards');
        assert.ok(!p.has('mp-fwd'), name + ': no forward hold either');
        if (name !== 'blur' && name !== 'hidden') {
            assert.equal(p.W.LowiPad.state().held, false, name + ': the press is over');
            assert.ok(!p.has('mp-down'), name);
        }
        if (name === 'blur') {
            p.move(at({ x: MID.x + 30, y: MID.y }));
            assert.equal(p.faded(), true, 'blur: the same finger still steers afterwards (ordinary steering)');
            p.up(at({ x: MID.x + 30, y: MID.y }));
            assert.equal(p.faded(), false);
        }
    }
});

test('a hidden page or pagehide also stops a rim press before its forward hold starts (nothing runs in the background)', () => {
    for (const end of [p => { p.D.hidden = true; p.D.fire('visibilitychange'); }, p => p.W.fire('pagehide')]) {
        const p = page();
        p.down(at(RIM_UP));
        p.advance(HOLD - 120);
        end(p);
        p.advance(HOLD + VANISH);
        assert.ok(!p.has('mp-fwd') && !p.thr.some(v => v), 'no forward hold after the page left');
        assert.equal(p.faded(), false);
    }
    const p = page();
    p.down(at(RIM_UP)); p.advance(60); p.up(at(RIM_UP));
    p.down(at(RIM_UP)); p.advance(60); p.up(at(RIM_UP));
    p.W.fire('pagehide');
    p.advance(1600);
    assert.ok(!p.has('mp-back') && !p.thr.some(v => v), 'a pending double-tap back burst does not start after pagehide');
});

test('Calm mode: any steady press opens every bubble, dragging is inert, a drag past DRIFT cancels it', () => {
    let p = page({ calm: true });
    p.down(at(RIM_UP));
    p.advance(A.LONG_MS + 10);
    assert.equal(p.calls.length, 1, 'a rim press opens them too: there is no hold to fly in Calm');
    assert.ok(!p.has('mp-fwd') && !p.faded());
    p.up(at(RIM_UP));
    p.advance(800);
    assert.ok(!p.chipOn(), 'no tap actions in Calm');

    p = page({ calm: true });
    p.W.LowiPad.mode('drive');
    p.down(at(MID));
    p.advance(A.LONG_MS + 10);
    assert.equal(p.calls.length, 1, 'Calm: also while a flight was left on');
    p.up(at(MID));

    p = page({ calm: true });
    p.down(at(MID));
    p.move(at({ x: MID.x + 30, y: MID.y - 10 }));
    assert.ok(!p.steered() && !p.faded(), 'dragging is inert');
    assert.equal(p.W.LowiPad.state().pad, '', 'nothing flies');
    p.advance(A.LONG_MS + 10);
    assert.equal(p.calls.length, 0, 'past DRIFT: no hold');
    p.up(at({ x: MID.x + 30, y: MID.y - 10 }));
});

test('the click that ends a hold that opened the bubbles never reaches them; taps and later clicks pass', () => {
    /* touch, pointerup first, then touchend: cancelling touchend means no click is made at all, so no click is waited for */
    let p = page();
    p.down(at(MID)); p.advance(A.LONG_MS + 10);
    assert.equal(p.calls.length, 1);
    p.up(at(MID));
    const te = evt(); p.pad().dispatch('touchend', te);
    assert.equal(te.prevented, true, 'touchend after pointerup is cancelled: no click from this touch');
    const quick = evt(); p.W.fire('click', quick);
    assert.ok(!quick.prevented && !quick.stopped, 'so a quick tap on a bubble right after is not eaten');

    /* touch, touchend first, then pointerup */
    p = page();
    p.down(at(MID)); p.advance(A.LONG_MS + 10);
    const early = evt(); p.pad().dispatch('touchend', early);
    assert.equal(early.prevented, true, 'touchend before pointerup is cancelled too');
    p.up(at(MID));
    const quick2 = evt(); p.W.fire('click', quick2);
    assert.ok(!quick2.prevented, 'and nothing is eaten after it');

    /* mouse or pen (no touchend): the one click the lift makes is eaten, once */
    p = page();
    p.down(at(MID)); p.advance(A.LONG_MS + 10); p.up(at(MID));
    const c1 = evt(); p.W.fire('click', c1);
    assert.ok(c1.prevented && c1.stopped, 'the click that ends the hold is eaten');
    const c2 = evt(); p.W.fire('click', c2);
    assert.ok(!c2.prevented && !c2.stopped, 'only once');

    p = page();
    p.down(at(MID)); p.advance(A.LONG_MS + 10); p.up(at(MID));
    p.advance(600);
    const late = evt(); p.W.fire('click', late);
    assert.ok(!late.prevented, 'a click long after the lift is a normal click');

    p = page();
    p.down(at(MID)); p.advance(100); p.up(at(MID));
    const tap = evt(); p.pad().dispatch('touchend', tap); const tc = evt(); p.W.fire('click', tc);
    assert.ok(!tap.prevented && !tc.prevented, 'a plain tap is never eaten');
});

test('if the bubbles cannot open, the press is not stuck: a drag afterwards still steers', () => {
    const p = page({ ok: false });
    p.down(at(MID));
    p.advance(A.LONG_MS + 10);
    assert.equal(p.calls.length, 1, 'tried');
    p.move(at({ x: MID.x - 24, y: MID.y + 10 }));
    assert.equal(p.faded(), true, 'steers');
    assert.ok(p.sent.some(c => c.vx < 0 && c.vy < 0));
    p.up(at({ x: MID.x - 24, y: MID.y + 10 }));
    assert.equal(p.faded(), false);
});
