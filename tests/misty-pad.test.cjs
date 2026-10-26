'use strict';
/* Oct 16, 2026: Misty's bubble controller on Home (misty-pad.js): drag to steer her, double-tap for autopilot. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('the controller ships: loaded on the page, precached, and wired into the 3D world', () => {
    const html = read('index.html'), sw = read('sw.js'), wh = read('world-home.js'), js = read('misty-pad.js'), css = read('misty-pad.css');
    assert.match(html, /<script src="misty-pad\.js\?v=[\d-]+"><\/script>/);
    assert.match(html, /id="mpCss" href="misty-pad\.css\?v=[\d-]+"/);
    assert.ok(sw.includes('"misty-pad.js"') && sw.includes('"misty-pad.css"'));
    assert.ok(wh.includes('W.LowiWorldHome.pad = pad;'), 'Home exposes the pad');
    // Oct 26 (Emmanuel: "You know the auto fly ... not automatically ... then the UI breaks"): she shows outside her bubble only
    // while the controller has her out; on her timed trip she is simply away (no faded copy drifting over Home's bubbles)
    assert.ok(wh.includes("const show = padOn && (r.mode === 'home'"), 'Misty flies whenever the controller has her out');
    assert.ok(wh.includes("const sleepy = PD.mode === 'auto' && k < 0.4;"), 'low energy autopilot is a slow, sleepy drift');
    assert.ok(js.includes('no-page-swipe'), 'a drag on the controller never pages the tabs');
    assert.ok(js.includes("['touchstart', 'mousedown'].forEach(n => b.addEventListener(n, e => e.stopPropagation()"), 'the world never sees a touch on the controller');
    assert.ok(css.includes('html.wh-padfly #spBubble .tmg-plant'), 'never two Mistys on screen');
    assert.ok(css.includes('touch-action: none'));
});

test('the controller never brings back the microbe buddies', () => {
    const js = read('misty-pad.js');
    assert.ok(!/buddy|buddies|lacto/i.test(js));
});
