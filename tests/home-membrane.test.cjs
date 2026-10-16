'use strict';
/* Oct 16, 2026 (task 1 rework): the fasting and water bubbles on Home look and move like Misty's living cell membrane. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('fasting and water bubbles use the colours of Misty\'s membrane (body-world-3d-scene.js memMat)', () => {
    const css = read('world-home.css'), sc = read('body-world-3d-scene.js');
    for (const c of ['#3a9fe0', '#9b87d2', '#8fe7ff']) assert.ok(sc.includes("'" + c + "'"), c + ' is Misty\'s membrane colour');
    const i = css.indexOf('html.wh-home #spHome #spFast, html.wh-home #whHud .wh-water,\nhtml[data-theme="light"].wh-home #spHome #spFast');
    assert.ok(i > 0, 'one rule for both bubbles, both themes');
    const r = css.slice(i, css.indexOf('}', i));
    assert.ok(r.includes('rgba(58, 159, 224, .1)') && r.includes('rgba(155, 135, 210, .34)') && r.includes('rgba(143, 231, 255, .58)'), 'clear middle, violet rim, cyan edge');
});

test('they wobble and breathe like the membrane, float as before, and stay still with reduced motion', () => {
    const css = read('world-home.css');
    const m = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: no-preference) {'));
    assert.ok(m.includes('wh-float 6s ease-in-out infinite, wh-mem-swell 3.9s ease-in-out infinite, wh-mem-morph 5.7s ease-in-out infinite'));
    assert.ok(m.includes('wh-float 6.8s ease-in-out -2.4s infinite, wh-mem-swell 3.9s'));
    assert.match(css, /@keyframes wh-mem-swell \{ 0%, 100% \{ scale: 1; \} 50% \{ scale: 1\.025; \} \}/);
    assert.match(css, /@keyframes wh-mem-morph \{/);
    /* the swell uses the scale property, so it never fights the translate(-50%, -50%) that places the bubbles */
    assert.ok(!/@keyframes wh-mem-swell[^}]*transform/.test(css));
});
