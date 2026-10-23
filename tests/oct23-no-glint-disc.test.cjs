'use strict';
/* Oct 23 2026, Emmanuel (iPhone screenshot, Misty flying in the metabolic world; he circled a pale flat oval next to her):
   "Multiple times I've said that remove the shadow from every bubble. The shadow doesn't make sense in that world. That round thing's
   supposed to be their shadow or something, or a bubble reflection, I don't know what that is. Remove it."
   The oval was Misty's CSS glass glint: #spBubble::before (spirit.css .sp-bubble:before, a white #ffffff60 = 37.6% oval, 31% x 9% of
   the bubble, rotate(-28deg)). It stays in place when Misty flies out of her bubble, so it floats in empty space. Oct 17 copied it onto
   every living bubble (.lb-bub::before) and Oct 18 onto the joystick (#whPad.lb-live::before); companion.css had it on .cf-bub.
   Oct 19 removed the 3D glint lobe and .lh-reflection but missed these CSS copies, which is why it came back.
   Rule: no stylesheet draws a small flat (plain-colour, hard-edged) white oval in a ::before / ::after (border-radius 50%, white fill, rotated) on any bubble.
   The glass look stays: the 3D membrane fresnel rim, radial-gradient sheen inside the shell, glow rings and floating cells.
   tests/no-bubble-shadow-live.cjs checks the computed styles in the browser. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

const cssFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.css'));
function rules(css) {
    css = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const out = []; const re = /([^{}]+)\{([^{}]*)\}/g; let m;
    while ((m = re.exec(css))) out.push({ sel: m[1].trim().replace(/\s+/g, ' '), body: m[2] });
    return out;
}
const inlineCss = () => { const h = read('index.html'); const out = []; const re = /<style[^>]*>([\s\S]*?)<\/style>/g; let m; while ((m = re.exec(h))) out.push(m[1]); return out.join('\n'); };
const WHITE = /#fff(fff)?([0-9a-f]{2})?\b|rgba?\(\s*255\s*,\s*255\s*,\s*255|\bwhite\b/i;
/* a flat, hard-edged white fill (a plain colour, no gradient): that is the disc he circled. Soft gradient highlights that fade out
   (.lb3-g, .hs-orb) are the glass shine and stay. */
const flatWhite = bg => !/gradient/.test(bg) && WHITE.test(bg);
const glintOval = body => /border-radius:\s*50%/.test(body) && /transform:\s*rotate\(-?\d/.test(body) && flatWhite((/background(-color)?:\s*([^;]+)/.exec(body) || [])[2] || '')
    && /height:\s*([0-9.]+)%/.test(body) && parseFloat(/height:\s*([0-9.]+)%/.exec(body)[1]) < 20;

test('no stylesheet draws the flat white glint oval in a pseudo-element', () => {
    const hits = [];
    for (const f of cssFiles) for (const r of rules(read(f))) if (/(::|:)(before|after)/.test(r.sel) && glintOval(r.body)) hits.push(f + ': ' + r.sel);
    for (const r of rules(inlineCss())) if (/(::|:)(before|after)/.test(r.sel) && glintOval(r.body)) hits.push('index.html: ' + r.sel);
    assert.deepStrictEqual(hits, [], 'glint oval rules found:\n' + hits.join('\n'));
});

test('the known glint selectors are gone (Misty, fast bubble, companion card, living bubbles, joystick)', () => {
    const all = cssFiles.map(read).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const sel of [/\.sp-bubble:{1,2}before/, /\.sp-fast:{1,2}before/, /\.cf-bub::before/, /\.lb-bub::before/, /#whPad\.lb-live::before/])
        assert.ok(!sel.test(all), 'rule still present: ' + sel);
});

test('the glass look stays: membrane rim, shell sheen and the bubble shells', () => {
    assert.match(read('companion.css'), /\.cf-bub \{[^}]*radial-gradient\(circle at 28% 20%/, 'companion card bubble keeps its inner sheen');
    assert.match(read('living-bubbles.css'), /html\.lb3d\.wh-home #whHud \.lb-bub \{/, 'living bubble shell rule stays');
    assert.match(read('home-orbit-v2.css'), /html\.o8\.wh-home #whHud #whPad \{[\s\S]*?radial-gradient\(circle at 34% 28%/, 'joystick keeps the ring bubble glass');
});
