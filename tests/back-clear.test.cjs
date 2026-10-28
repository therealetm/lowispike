'use strict';
/* Oct 29 2026 (Emmanuel): "Kannst du bitte alle Backbuttons durchsichtig machen? ... die sind so blau ... transparent",
   then "The X buttons genauso". The bottom-center back / X (bottom-close.css) has no blue fill, glow or frosted plate any more:
   a thin rim and the icon only, dark ink in the light theme. The screens' own X / back buttons that stay visible lose their fill too. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'bottom-close.css'), 'utf8');
const rule = sel => { const i = css.indexOf(sel + '{'); assert.ok(i >= 0, sel); return css.slice(i, css.indexOf('}', i)); };

test('bottom back / X is see-through: no blue fill, no glow, no frosted plate', () => {
    const r = rule('.lw-bx');
    assert.match(r, /background:transparent;/);
    assert.match(r, /backdrop-filter:none;/);
    assert.match(r, /box-shadow:none;/);
    assert.doesNotMatch(r, /rgba\(10,22,58|rgba\(120,180,255|rgba\(80,170,255|rgba\(143,216,255/, 'no blue left in the button');
    assert.match(r, /border:1\.5px solid rgba\(255,255,255,\.42\)/, 'a thin neutral rim keeps the 56 px target visible');
    assert.match(r, /width:56px;height:56px/, 'tap target unchanged');
});

test('icon stays readable on any background, in both themes, with a pressed and focus state', () => {
    assert.match(css, /\.lw-bx svg\{[^}]*filter:drop-shadow\(/);
    assert.match(css, /color:#fff;cursor:pointer/, 'white ink in both themes (Day mode keeps the dark world behind it)');
    assert.doesNotMatch(css, /color:#0d2440/);
    assert.match(css, /\.lw-bx:active\{[^}]*background:rgba\(255,255,255,\.14\)/);
    assert.match(css, /\.lw-bx:focus-visible\{outline:2px solid #7fd4ff/);
});

test('the screens\' own X / back buttons that stay visible lose their blue fill the same way', () => {
    for (const s of ['.cg-photo-x', '.rk-lad-x', '.cf-misty .cf-x', '.r2-gate .hs-back', '.sc-ov .r2-sh .r2-x', '.rm-x', '.nm-layer-fy .nm-back'])
        assert.ok(css.includes(s), s);
    assert.match(css, /\{background:transparent!important;box-shadow:none!important\}/);
});

test('top-left back to Home (#secX) and the bottom X of Home\'s sheets (#whX) are see-through too', () => {
    assert.match(css, /#secX,#whX\{background:transparent!important;border:1\.5px solid rgba\(255,255,255,\.42\)!important;box-shadow:none!important;/);
    assert.match(css, /backdrop-filter:none!important;color:#fff!important\}/);
});
