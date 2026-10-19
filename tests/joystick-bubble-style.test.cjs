'use strict';
/* Oct 18 2026, Emmanuel (19:28, ring Home): "The steering wheel doesn't have the same water style, I mean bubble style, as the other
   bubbles. That's also wrong." The joystick (#whPad) was a dark blurred disc (radial-gradient ... rgba(28,74,150,.36) + blur(10px)),
   with a blue energy arc (.mp-ring), a dashed well (.mp-well) and a flat knob. It must read as one of the eight ring bubbles:
   - the same glass shell declarations as the ring bubbles (.o8-cell: background, rim, inner glow), no blur, no dark bottom shadow
   - with the 3D world: Misty's membrane drawn around it (registered with LowiBubbles as a control, kind 'joy') and its shell clear,
     plus the same glint as the ring bubbles' .lb-bub::before
   - no radar arc / dashed well; a glass knob
   - look only: no size / position / visibility rule for the joystick in the new block, misty-pad.* untouched.
   tests/joystick-bubble-style-live.cjs asserts the same on computed styles in Chromium and WebKit at iPhone and iPad sizes. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const { shadowLayers, dropShadowsBelow } = require('./fixtures/shadow-layers.cjs');

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
const decl = (body, prop) => { const m = new RegExp('(?:^|;|\\s)' + prop.replace(/[-]/g, '\\-') + '\\s*:\\s*([^;]+)').exec(body); return m ? m[1].replace(/!important/, '').trim() : null; };
const norm = v => String(v).replace(/\s+/g, ' ').trim();
const css = read('home-orbit-v2.css'), R = rules(css);
const cell = R.find(r => !r.media && r.sel === 'html.o8.wh-home #whHud .o8-cell');
const pad = R.find(r => !r.media && r.sel === 'html.o8.wh-home #whHud #whPad' && /background:/.test(r.body));
const padLive = R.find(r => !r.media && r.sel === 'html.o8.wh-home.lb3d #whHud #whPad.lb-live');
const padGlint = R.find(r => !r.media && r.sel === 'html.o8.wh-home.lb3d #whHud #whPad.lb-live::before');

test('the joystick shell uses the ring bubble glass (background, rim, inner glow)', () => {
    assert.ok(cell, 'ring bubble rule html.o8.wh-home #whHud .o8-cell not found');
    assert.ok(pad, 'joystick rule html.o8.wh-home #whHud #whPad not found in home-orbit-v2.css');
    for (const p of ['background', 'border', 'box-shadow']) assert.strictEqual(norm(decl(pad.body, p)), norm(decl(cell.body, p)), p + ' differs from the ring bubble');
    assert.strictEqual(decl(pad.body, 'backdrop-filter'), 'none', 'no blurred disc behind the joystick');
    assert.ok(!/28,\s*74,\s*150/.test(pad.body), 'no dark navy fill');
    for (const L of shadowLayers(decl(pad.body, 'box-shadow'))) assert.ok(L.inset && L.y === 0, 'no bottom shadow: ' + L.raw);
});

test('with the 3D world the joystick gets Misty\'s membrane and the ring bubbles\' clear shell + glint', () => {
    assert.ok(padLive, 'no html.o8.wh-home.lb3d #whHud #whPad.lb-live rule');
    assert.match(padLive.body, /background:\s*transparent/); assert.match(padLive.body, /border-color:\s*transparent/); assert.match(padLive.body, /box-shadow:\s*none/);
    const lb = rules(read('living-bubbles.css')).find(r => /\.lb-bub::before/.test(r.sel) && !/light/.test(r.sel));
    assert.ok(lb && padGlint, 'glint rules missing');
    for (const p of ['left', 'top', 'width', 'height', 'background', 'transform']) assert.strictEqual(norm(decl(padGlint.body, p)), norm(decl(lb.body, p)), 'glint ' + p + ' differs from .lb-bub::before');
    const js = read('home-orbit-v2.js');
    assert.match(js, /LB\.add\(j,\s*\{\s*kind:\s*'joy',\s*ctl:\s*true\s*\}\)/, 'home-orbit-v2.js must register #whPad with LowiBubbles as a control');
    assert.match(js, /joyBubble\(\);/, 'joyBubble() must run from ensure()');
});

/* Oct 19 2026: the knob was "a small glass bubble" (radial highlight, white rim). Emmanuel's spec is "the same simple white-icon
   bubble, with no silver inner ring", so the knob now has no fill and no rim at all, only the white icon (stricter than before;
   tests/ui-joystick-vanish.test.cjs checks every state). */
test('no radar look: arc and dashed well hidden, no inner glass knob or rim, no deep icon shadow', () => {
    const hide = R.find(r => /#whPad \.mp-ring/.test(r.sel) && /#whPad \.mp-well/.test(r.sel));
    assert.ok(hide && /display:\s*none/.test(hide.body), '.mp-ring / .mp-well must be hidden');
    const knob = R.find(r => r.sel === 'html.o8.wh-home #whHud #whPad .mp-knob');
    assert.ok(knob, 'knob rule missing');
    assert.match(decl(knob.body, 'background'), /^none\b/, 'no fill behind the icon');
    assert.match(decl(knob.body, 'border'), /^0\b/, 'no rim round the icon');
    assert.ok(!/dashed|background-image/.test(knob.body));
    for (const r of R.filter(r => /#whPad/.test(r.sel))) {
        assert.deepStrictEqual(dropShadowsBelow(r.body, 1), [], 'deep drop shadow in ' + r.sel);
        for (const L of shadowLayers(decl(r.body, 'box-shadow'))) assert.ok(L.y <= 0 || L.inset, 'bottom shadow in ' + r.sel + ': ' + L.raw);
    }
});

test('look only: the new joystick rules do not size, place or hide it', () => {
    for (const r of R.filter(r => /^html\.o8\.wh-home(\.lb3d)?(\[data-ui=light\])? #whHud #whPad(?![\w-])/.test(r.sel) && !/::before/.test(r.sel) && !/\.mp-/.test(r.sel))) {
        for (const p of ['width', 'height', 'left', 'top', 'right', 'bottom', 'position', 'opacity', 'visibility', 'display', 'transform', 'translate', 'inset']) assert.strictEqual(decl(r.body, p), null, r.sel + ' sets ' + p);
    }
});
