'use strict';
/* Oct 17, 2026 (E-man): out in the world Misty's controller stays fixed in place on the screen instead of moving with her.
   misty-pad.js measures its spot above Today only while she rests at home; while she is out the spot is a held screen point,
   measured again only for a new screen size (turning the phone, iPad split view). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const A = require(path.join(root, 'misty-pad.js'));
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

const phone = { vw: 390, vh: 844, size: 60, gap: 14, tb: 92, hud: { left: 0, right: 390, bottom: 844 } };
const at = (cx, top) => ({ cx, top });
const inp = o => Object.assign({}, phone, o);

test('the pure rules load in node without a page', () => {
    for (const k of ['key', 'flying', 'measure', 'fallback', 'clamp', 'pick', 'css']) assert.equal(typeof A[k], 'function', k);
});

test('resting at home: the controller sits centred above Today, as before', () => {
    const p = A.pick(null, inp({ flying: false, today: at(195, 690) }));
    assert.deepEqual([p.x, p.y, p.held], [195, 676, false]);
    assert.deepEqual(A.css(p, phone.hud), { left: 195, bottom: 168 });
});

test('out in the world the spot is held while Misty, the camera, the zoom and the faded bubbles move', () => {
    let s = A.pick(null, inp({ flying: false, today: at(195, 690) }));
    const home = { x: s.x, y: s.y };
    /* every frame of a flight: Today (or whatever it measured from) wanders, Misty flies far, the galaxy zooms out */
    for (let i = 0; i < 200; i++) {
        const drift = Math.sin(i / 7) * 120;
        s = A.pick(s, inp({ flying: true, today: i % 5 ? at(195 + drift, 690 - drift) : null, tb: i % 3 ? 0 : 92 }));
        assert.deepEqual({ x: s.x, y: s.y }, home, 'frame ' + i);
        assert.equal(s.held, true);
    }
});

test('a shifted HUD box never moves the controller on screen', () => {
    const s = A.pick(null, inp({ flying: false, today: at(195, 690) }));
    const shifted = { left: -40, right: 350, bottom: 900 };
    const c = A.css(s, shifted);
    assert.equal(shifted.left + c.left, s.x);
    assert.equal(shifted.bottom - c.bottom, s.y);
});

test('turning the phone or iPad split view measures once for the new screen, then holds again', () => {
    let s = A.pick(null, inp({ flying: false, today: at(195, 690) }));
    const land = { vw: 844, vh: 390, hud: { left: 0, right: 844, bottom: 390 } };
    s = A.pick(s, inp(Object.assign({ flying: true, settling: true, today: at(422, 300) }, land)));
    assert.deepEqual([s.x, s.y, s.key, s.held], [422, 286, '844x390', false]);
    const held = { x: s.x, y: s.y };
    s = A.pick(s, inp(Object.assign({ flying: true, today: at(500, 200) }, land)));
    assert.deepEqual({ x: s.x, y: s.y }, held);
    /* rotated while flying with nothing to measure: the middle of the screen above the thumb row, then held */
    const ipad = { vw: 1180, vh: 820, hud: { left: 0, right: 1180, bottom: 820 }, tb: 0 };
    s = A.pick(s, inp(Object.assign({ flying: true, today: null }, ipad)));
    assert.deepEqual([s.x, s.y], [590, 744]);
});

test('the spot always stays whole on screen and in reach of a thumb', () => {
    const p = A.pick(null, inp({ flying: false, today: at(2, 900) }));
    assert.ok(p.x >= 8 + 30 && p.x <= 390 - 8 - 30, 'x on screen');
    assert.ok(p.y <= 844 - 8, 'bottom edge on screen');
    const q = A.pick(null, inp({ flying: false, today: at(600, -50) }));
    assert.ok(q.x <= 390 - 38 && q.y >= 8 + 120, 'never off the top or the right');
});

test('Misty counts as out for every flight state, and as home otherwise', () => {
    const has = set => c => set.includes(c);
    assert.equal(A.flying('drive', has([])), true);
    assert.equal(A.flying('auto', has([])), true);
    for (const c of ['wh-padfly', 'mf-on', 'mf-in', 'mf-galaxy']) assert.equal(A.flying('', has([c])), true, c);
    assert.equal(A.flying('', has(['wh-home', 'wh-clean'])), false);
});

test('the page uses the held spot: no chasing Today during a flight, re-measure only on a new screen size', () => {
    const js = read('misty-pad.js');
    assert.ok(js.includes('const p = PA.pick(spot, {'), 'place() goes through the anchor rules');
    assert.ok(js.includes('const fly = PA.flying(st.mode, c => H.classList.contains(c));'));
    assert.ok(js.includes("W.addEventListener('orientationchange', resized);"));
    assert.ok(js.includes('const c = PA.css(p, hr)'), 'written relative to the HUD box, so the screen point holds');
    assert.ok(!/left = Math\.round\(tr\.left \+ tr\.width \/ 2 - hr\.left\)/.test(js), 'the old every-tick chase is gone');
    assert.ok(js.includes("if (typeof window === 'undefined' || typeof document === 'undefined') return;"), 'the page part never runs in node');
});
