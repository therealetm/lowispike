'use strict';
/* Oct 19 2026, Emmanuel (call, 07:10): "I can still see that the joystick is the old design ... And also with it disappearing."
   His Home handoff [HIS CALL]: the joystick is "the same simple white-icon bubble, with no silver inner ring", it "fades while
   you steer but keeps working" and "comes back afterwards". Earlier he had said it should not just go see-through but be gone
   after a few seconds of steering.
   1. Disappearing: the steering fade (.mp-steer, 40 %) stays for the first moment, so you still see where your thumb landed.
      After VANISH_MS of steering without a break (a drag or the forward / back hold) the joystick is fully gone (.mp-gone,
      opacity 0), still under the finger and still steering. Lifting, a cancelled or lost pointer, the app hidden or the window
      blurred bring it back at once. A tap and the back burst never fade or hide it. Inside a world the same.
   2. Design: on the ring Home (o8, which stays on inside worlds) the knob is no longer a small glass bubble with a white rim
      inside the big one (the "silver inner ring"): no rim, no fill, no inner glow; only the white icon, like Scan, Sleep and
      Settings. Its states (forward, back, autopilot) tint the icon, not a ring.
   Runs misty-pad.js on the fake page from tests/fixtures/misty-pad-page.cjs. Browser proof: tests/ui-joystick-vanish-live.cjs. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { fakePage } = require('./fixtures/misty-pad-page.cjs');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

const gone = p => p.pad().classList.contains('mp-gone');
const VANISH = (() => { const m = /const VANISH_MS = (\d+)/.exec(read('misty-pad.js')); return m ? +m[1] : NaN; })();

test('misty-pad.js names how long steering lasts before the joystick is gone: a couple of seconds', () => {
    assert.ok(VANISH >= 1000 && VANISH <= 3000, 'VANISH_MS between 1 and 3 s, got ' + VANISH);
});

test('a drag: see-through first, fully gone after VANISH_MS, still steering, back the moment the finger lifts', () => {
    const p = fakePage();
    p.down({ clientX: 100, clientY: 700 });
    p.move({ clientX: 120, clientY: 690 });
    assert.equal(p.faded(), true, 'steering: see-through');
    assert.equal(gone(p), false, 'not gone straight away: you still see where your thumb landed');
    p.advance(VANISH - 200);
    p.move({ clientX: 125, clientY: 688 });
    assert.equal(gone(p), false, 'still only see-through just before VANISH_MS');
    p.advance(300);
    assert.equal(gone(p), true, 'after VANISH_MS of steering: gone');
    assert.equal(p.W.LowiPad.state().gone, true, 'LowiPad.state() tells it');
    const n = p.sent.length;
    p.move({ clientX: 80, clientY: 720 });
    assert.ok(p.sent.length > n && p.sent.slice(n).some(c => c.vx < 0 && c.vy < 0), 'keeps steering while gone');
    assert.equal(gone(p), true, 'moving the finger does not bring it back');
    p.up({ clientX: 80, clientY: 720 });
    assert.equal(gone(p), false, 'lifted: back at once');
    assert.equal(p.faded(), false);
    assert.equal(p.W.LowiPad.state().gone, false);
});

test('holding it (forward) also disappears after VANISH_MS; lifting brings it back', () => {
    const p = fakePage();
    p.down();
    p.advance(350);
    assert.ok(p.pad().classList.contains('mp-fwd'), 'forward hold running');
    assert.equal(p.faded(), true);
    assert.equal(gone(p), false);
    p.advance(VANISH + 50);
    assert.equal(gone(p), true, 'held forward for VANISH_MS: gone');
    p.up();
    assert.equal(gone(p), false);
    assert.equal(p.faded(), false);
});

test('a short steer, lift, then a new steer: the clock starts again (no instant vanish on the second touch)', () => {
    const p = fakePage();
    p.down(); p.move({ clientX: 120, clientY: 690 });
    p.advance(VANISH - 300);
    p.up({ clientX: 120, clientY: 690 });
    p.advance(600);
    assert.equal(gone(p), false, 'not gone with no finger on it, even after the old timer would have run out');
    p.down({ clientX: 100, clientY: 700 }); p.move({ clientX: 120, clientY: 690 });
    p.advance(VANISH - 200);
    assert.equal(gone(p), false, 'new steer: only see-through until its own VANISH_MS');
    p.advance(300);
    assert.equal(gone(p), true);
    p.up({ clientX: 120, clientY: 690 });
});

test('pointer cancel, lost capture, the app hidden and the window blur bring a gone joystick back', () => {
    const steerLong = p => { p.down(); p.move({ clientX: 120, clientY: 690 }); p.advance(VANISH + 50); assert.equal(gone(p), true, 'gone first'); };
    let p = fakePage(); steerLong(p); p.cancel(); assert.equal(gone(p), false, 'pointercancel');
    p = fakePage(); steerLong(p); p.lost(); assert.equal(gone(p), false, 'lostpointercapture');
    p = fakePage(); steerLong(p); p.D.hidden = true; p.D.fire('visibilitychange'); assert.equal(gone(p), false, 'app hidden');
    p = fakePage(); steerLong(p); p.W.fire('blur'); assert.equal(gone(p), false, 'window blur');
});

test('a tap, a double-tap back burst and the keyboard never hide it', () => {
    const p = fakePage();
    p.down(); p.advance(60); p.up(); p.advance(VANISH + 100);
    assert.equal(gone(p), false, 'single tap');
    p.down(); p.advance(60); p.up(); p.advance(60); p.down(); p.advance(60); p.up();
    p.advance(VANISH + 500);
    assert.equal(gone(p), false, 'back burst without a finger on it');
    p.key('keydown', 'ArrowUp'); p.advance(VANISH + 100); p.key('keyup', 'ArrowUp');
    assert.equal(gone(p), false, 'keyboard');
});

/* ---------- CSS ---------- */
function rules(css) {
    css = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const out = [];
    (function block(str, media) {
        let j = 0;
        while (j < str.length) {
            const open = str.indexOf('{', j); if (open < 0) break;
            const sel = str.slice(j, open).trim();
            let depth = 1, k = open + 1; while (k < str.length && depth) { if (str[k] === '{') depth++; else if (str[k] === '}') depth--; k++; }
            const body = str.slice(open + 1, k - 1);
            if (sel.startsWith('@')) block(body, sel); else out.push({ sel, body, media });
            j = k;
        }
    })(css, '');
    return out;
}
const decl = (body, prop) => { const m = new RegExp('(?:^|;|\\s)' + prop.replace(/[-]/g, '\\-') + '\\s*:\\s*([^;]+)').exec(body); return m ? m[1].trim() : null; };

test('misty-pad.css: gone drops the fade level to 0, so Home and inside a world both reach 0; still touchable', () => {
    const css = read('misty-pad.css'), R = rules(css);
    const g = R.filter(r => /mp-gone/.test(r.sel));
    assert.equal(g.length, 1, 'one gone rule');
    assert.equal(g[0].sel, '.wh-hud .wh-pad.mp-steer.mp-gone', 'only while steering');
    assert.equal(g[0].media, '', 'not inside a media query: it beats the lighter accessibility fade too');
    assert.match(g[0].body, /^\s*--mp-steer-o:\s*0\s*;?\s*$/, 'sets only the fade level');
    /* the two steering rules it feeds: Home (not !important, hide rules still win) and inside a world (!important, beats keep-steering) */
    const home = R.find(r => !r.media && r.sel === '.wh-hud .wh-pad.mp-steer');
    assert.match(home.body, /opacity:\s*var\(--mp-steer-o/);
    const world = R.find(r => !r.media && /html\.mf-in\.wh-away:not\(\.lw-clean-auto\) \.wh-hud \.wh-pad\.mp-steer/.test(r.sel));
    assert.match(world.body, /opacity:\s*var\(--mp-steer-o[^;]*!important/);
    /* it outweighs the accessibility media rules that set a lighter fade on .wh-hud .wh-pad */
    for (const r of R.filter(r => r.media && /--mp-steer-o/.test(r.body))) assert.equal(r.sel, '.wh-hud .wh-pad', 'media fade rule stays on the bare pad: ' + r.sel);
});

test('ring Home: the knob is just the white icon, no inner glass bubble or rim (the "silver inner ring")', () => {
    const R = rules(read('home-orbit-v2.css'));
    const knob = R.find(r => !r.media && r.sel === 'html.o8.wh-home #whHud #whPad .mp-knob');
    assert.ok(knob, 'knob rule');
    assert.match(decl(knob.body, 'border') || '', /^(0|none)\b/, 'no rim around the icon');
    assert.match(decl(knob.body, 'background') || '', /^(none|transparent)\b/, 'no glass fill behind the icon');
    assert.match(decl(knob.body, 'color') || '', /#fff\b|white/, 'white icon');
    /* nothing paints a knob fill, rim or ring back in any state */
    for (const r of R.filter(r => /#whPad/.test(r.sel) && /\.mp-knob(?![\w-])(?!\s*svg)/.test(r.sel) && r.sel.split(',').every(s => !/svg/.test(s)))) {
        assert.ok(!/background-image|background-color/.test(r.body), 'no knob fill in ' + r.sel);
        const bs = decl(r.body, 'box-shadow');
        assert.ok(bs == null || /^none\b/.test(bs), 'no ring / glow round the knob in ' + r.sel + ': ' + bs);
        const bc = decl(r.body, 'border-color'); assert.ok(bc == null || /transparent/.test(bc), 'no rim colour in ' + r.sel);
    }
    /* the icon: the same white, the same soft shade as the ring bubbles' icons, and the states tint it */
    const ico = R.find(r => !r.media && r.sel === 'html.o8.wh-home #whHud #whPad .mp-knob svg');
    assert.ok(ico && /drop-shadow\(0 1px 4px rgba\(0,\s*30,\s*80,\s*\.6\)\)/.test(ico.body), 'icon shade like .o8-ico');
    for (const st of ['\\[data-mode="auto"\\]', '\\.mp-fwd', '\\.mp-back']) {
        const r = R.find(r => new RegExp('#whPad' + st + ' \\.mp-knob').test(r.sel) && decl(r.body, 'color'));
        assert.ok(r, 'state ' + st + ' tints the icon');
    }
});
