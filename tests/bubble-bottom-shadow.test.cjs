'use strict';
/* Oct 18 2026, Emmanuel on his iPad (ring Home, build 20261018-175840): "All bubbles have a shadow bottom. Remove that weird bottom."
   Every Home ring bubble and Misty's Home bubble must read as clean, evenly lit glass: no drop shadow below it, no inset shade rising
   from its lower edge, no shadow / reflection ellipse under Misty. Top highlight, rim and labels stay.
   What used to paint a bottom shadow (all of it is overridden for the ring Home in home-orbit-v2.css, scoped to html.o8.wh-home):
   - Scan / Sleep / Settings shells (.o8-cell): 0 6px 22px rgba(0,20,60,.28), also on :hover
   - the joystick #whPad: var(--wh-glass-sh) = ... 0 8px 26px -12px (dark theme) / 0 8px 24px -12px (light), knob 0 4px 10px -4px black
   - Misty's creature SVG: drop-shadow(0 6px 12px rgba(0,0,0,.22)) (world-home.css)
   - the .lh-reflection ellipse drawn under Misty's cell (cell-world.js), sitting on her name line
   The live check (tests/bubble-bottom-shadow-live.cjs) asserts the same on computed styles at iPhone and iPad sizes. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

const { lengths, bottomLayers, dropShadowsBelow } = require('./fixtures/shadow-layers.cjs');

/* ---- tiny CSS rule reader (top-level and one @media level) ---- */
function rules(css) {
    css = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const out = []; let i = 0;
    function block(str, media) {
        let j = 0;
        while (j < str.length) {
            const open = str.indexOf('{', j); if (open < 0) break;
            const sel = str.slice(j, open).trim();
            let depth = 1, k = open + 1; while (k < str.length && depth) { if (str[k] === '{') depth++; else if (str[k] === '}') depth--; k++; }
            const body = str.slice(open + 1, k - 1);
            if (sel.startsWith('@media') || sel.startsWith('@supports')) block(body, sel);
            else if (!sel.startsWith('@')) out.push({ sel, body, media });
            j = k;
        }
    }
    block(css, null); void i;
    return out;
}
function decl(body, prop) { const re = new RegExp('(?:^|;)\\s*' + prop.replace(/[-]/g, '\\-') + '\\s*:\\s*([^;]+)', 'g'); let m, last = null; while ((m = re.exec(body))) last = m[1].replace(/!important/, '').trim(); return last; }

const O8 = rules(read('home-orbit-v2.css'));

test('helpers: drop shadows below and inset shades from the bottom are caught, centred glows and top highlights are not', () => {
    assert.strictEqual(bottomLayers('inset 0 0 18px rgba(255,255,255,.18), 0 6px 22px rgba(0,20,60,.28)').length, 1);
    assert.strictEqual(bottomLayers('rgba(0, 20, 60, 0.28) 0px 6px 22px 0px').length, 1, 'computed order');
    assert.strictEqual(bottomLayers('rgba(0, 0, 0, 0.3) 0px -8px 12px 0px inset').length, 1, 'inset shade from below');
    assert.strictEqual(bottomLayers('inset 0 0 18px rgba(140,210,255,.32), 0 0 22px rgba(143,231,255,.3)').length, 0);
    assert.strictEqual(bottomLayers('rgba(255,255,255,.4) 0px 6px 10px 0px inset').length, 0, 'inset top highlight is fine');
    assert.strictEqual(bottomLayers('none').length, 0);
    assert.deepStrictEqual(dropShadowsBelow('drop-shadow(rgba(0, 0, 0, 0.22) 0px 6px 12px)', 1).length, 1);
    assert.deepStrictEqual(dropShadowsBelow('drop-shadow(0 1px 3px rgba(0,30,80,.6))', 1).length, 0, 'a 1px label outline is legibility, not a shadow');
});

test('Scan, Sleep and Settings shells cast no shadow below them, also on hover', () => {
    const cell = O8.filter(r => /\.o8-cell/.test(r.sel) && !/\.o8-ico|wh-cell-tx|wh-cell-fill/.test(r.sel) && decl(r.body, 'box-shadow'));
    assert.ok(cell.length >= 2, 'the shell and its hover rule declare box-shadow');
    for (const r of cell) assert.deepStrictEqual(bottomLayers(decl(r.body, 'box-shadow')).map(l => l.raw), [], r.sel);
    /* the inner rim glow stays */
    const base = cell.find(r => /html\.o8\.wh-home #whHud \.o8-cell$/.test(r.sel));
    assert.ok(base && /inset 0 0 18px/.test(decl(base.body, 'box-shadow')), 'rim glow kept');
});

test('the joystick on the ring Home: no bottom glow on the pad (dark and light theme), no black shadow under the knob', () => {
    const pad = O8.filter(r => /html\.o8\.wh-home/.test(r.sel) && /#whPad|\.wh-pad/.test(r.sel) && decl(r.body, '--wh-glass-sh'));
    assert.ok(pad.some(r => !/data-theme/.test(r.sel)), 'dark theme override of --wh-glass-sh on the pad');
    assert.ok(pad.some(r => /data-theme="light"/.test(r.sel)), 'light theme override of --wh-glass-sh on the pad');
    for (const r of pad) { const v = decl(r.body, '--wh-glass-sh'); assert.deepStrictEqual(bottomLayers(v).map(l => l.raw), [], r.sel); assert.ok(/inset/.test(v), 'pad keeps its inner glass glow: ' + v); }
    const knob = O8.filter(r => /html\.o8\.wh-home/.test(r.sel) && /\.mp-knob/.test(r.sel) && decl(r.body, 'box-shadow'));
    assert.ok(knob.length, 'knob override');
    for (const r of knob) assert.deepStrictEqual(bottomLayers(decl(r.body, 'box-shadow')).map(l => l.raw), [], r.sel);
    /* the knob override must beat misty-pad.css ".wh-pad .mp-knob" but not the forward/back colour states, which are centred glows already */
    assert.ok(!knob.some(r => /!important/.test(r.body)), 'no !important: the mp-fwd / mp-back glows keep winning');
    const mp = rules(read('misty-pad.css'));
    for (const r of mp) { const v = decl(r.body, 'box-shadow'); if (v && /mp-fwd|mp-back/.test(r.sel)) assert.deepStrictEqual(bottomLayers(v).map(l => l.raw), [], 'state glow ' + r.sel); }
});

test("Misty's Home bubble: no drop shadow under her and no reflection ellipse under her cell", () => {
    const plant = O8.filter(r => /html\.o8\.wh-home/.test(r.sel) && /#spBubble/.test(r.sel) && /tmg-plant|lh-sprite/.test(r.sel) && decl(r.body, 'filter'));
    assert.ok(plant.length, "override of world-home.css's drop-shadow(0 6px 12px) on Misty's sprite");
    for (const r of plant) assert.deepStrictEqual(dropShadowsBelow(decl(r.body, 'filter'), 0), [], r.sel);
    const refl = O8.filter(r => /html\.o8\.wh-home/.test(r.sel) && /#spBubble/.test(r.sel) && /\.lh-reflection/.test(r.sel));
    assert.ok(refl.some(r => decl(r.body, 'display') === 'none'), 'the reflection ellipse is not drawn on the ring Home');
    /* Oct 19 2026: Emmanuel asked for no shadow on any bubble, so the source rule itself lost its dark drop shadow
       (it used to be drop-shadow(0 6px 12px black) and the ring Home override hid it). Stricter than before: the
       source must now have no drop shadow below Misty in any layout, and the ring Home override stays. */
    const src = read('world-home.css').match(/html\.wh-home #spBubble \.tmg-plant \{([^}]*)\}/);
    assert.ok(src, 'world-home.css still styles the sprite');
    assert.deepStrictEqual(dropShadowsBelow(decl(src[1], 'filter'), 0), [], 'world-home.css: no drop shadow under Misty in any Home layout');
});

test('the liquid in a part-full bubble has no inner shade along the glass edge (it sat at the bottom: a dark band)', () => {
    const L = require('../living-bubbles.js');
    const scene = read('body-world-3d-scene.js');
    const EDGE = scene.match(/const EDGE_AA = '([^']*)'/)[1].replace(/\\n/g, '\n');
    const fs0 = L.fadeShader('uniform vec3 uIn;varying vec3 vN;varying vec3 vV;varying vec3 vP;' + EDGE + 'void main(){float nv=abs(dot(normalize(vN),normalize(vV)));float a=0.5*lwEdge(nv);gl_FragColor=vec4(vec3(1.0),clamp(a,0.0,0.95));\n#include <colorspace_fragment>\n}');
    const src = L.liquidShader(fs0);
    assert.ok(src, 'liquid shader builds');
    const main = src.slice(src.indexOf('void main(){'));
    /* the colour may not be pulled toward a darker tone by the facing term (1-nv): that is the shade where the glass curves away */
    assert.ok(!/c\s*=\s*mix\(\s*c\s*,[^;]*1\.0\s*-\s*nv/.test(main), 'no rim darkening of the liquid colour: ' + (main.match(/c\s*=\s*mix\(\s*c\s*,[^;]*;/) || [''])[0]);
    assert.ok(!/c\s*\*=\s*[^;]*nv/.test(main), 'no facing-based dimming either');
    /* what stays: the light band under the surface, the colour from the fill, the glass's own edge softening */
    assert.ok(main.includes('c+=vec3(0.2)*smoothstep(0.12,0.0,d)'), 'light band under the surface kept');
    assert.ok(main.includes('vec3 c=mix(uBot,uTop,k)'), "the fill's own colours kept");
    assert.ok(/lwEdge\(nv\)\s*\*\s*uO/.test(main), 'same edge as the glass');
});

test('everything is scoped to the ring Home: worlds, blooms and the old Home keep their own depth', () => {
    const added = O8.filter(r => /--wh-glass-sh|lh-reflection|tmg-plant|mp-knob/.test(r.sel + r.body));
    for (const r of added) for (const s of r.sel.split(',')) assert.ok(/^html\.o8\.wh-home/.test(s.trim()) || /^html\.o8\.wh-home\[data-theme="light"\]/.test(s.trim()), 'scoped: ' + s.trim());
});
