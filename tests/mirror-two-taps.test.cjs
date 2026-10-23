'use strict';
/* 23 Oct 2026 (mirror-move): Emmanuel, 22 Oct: "Move the mirror mode more up, because that's the most impressive part in the whole app,
   so that needs to be highlighted." Mirror mode is two taps from Home on the eight-bubble Home: tap Move, the Move bloom
   (home-blooms-v2.js, hb2) opens with Mirror as its FIRST orb, tap it. The orb is the highlighted one, in brand blues only.
   Browser check: tools/sim/mirror-move.cjs. */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'home-blooms-v2.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'home-blooms-v2.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const core = require('../home-blooms-v2.js');

test('the Move bloom on Home lists Mirror first, before the Quick / Medium / Long / Epic sessions', () => {
    const at = src.indexOf("} else if (kind === 'move') {");
    assert.ok(at > 0, 'move branch');
    const end = src.indexOf('} else if', at + 10);
    const body = src.slice(at, end);
    const mi = body.indexOf("id: 'mirror'"), lv = body.indexOf('LEVELS');
    assert.ok(mi > 0, 'Mirror orb in the Move bloom');
    assert.ok(lv < 0 || mi < lv, 'Mirror comes before the session sizes');
    assert.match(body, /fn\(W\.LowiMirror, 'open'\)/, 'only when Mirror mode is loaded');
    assert.match(body, /run: \(\) => W\.LowiMirror\.open\(\)/, 'the orb opens Mirror mode');
    assert.match(body, /T\('Mirror', 'Spiegel', 'Espejo'\)/, 'label in English, German and Spanish');
});

test('the Mirror orb has a camera icon and its own highlight', () => {
    assert.match(src, /cam: '<rect /, 'camera icon');
    assert.match(css, /\.hb2-orb\.hb2-mirror \{/, 'highlight rule');
    assert.match(css, /prefers-reduced-motion: reduce\) \{ \.hb2-bloom\.on \.hb2-orb\.hb2-mirror \{ animation: none; \}/, 'pulse stops for reduced motion');
});

const rgb = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (m) return m[1].split(/[ ,/]+/).slice(0, 3).map(Number); const h = c.slice(1); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const hue = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return -1; let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; return h < 0 ? h + 360 : h; };

test('the Mirror orb is brand blue only: no violet, no green', () => {
    const rules = (css.match(/[^{}]*hb2-mirror[^{}]*\{[^{}]*\}/g) || []).join('\n') + (css.match(/@keyframes hb2MirrorPulse[^@]*?\} \}/) || [''])[0];
    const cs = rules.match(/#[0-9a-fA-F]{6}\b|rgba?\([^)]+\)/g) || [];
    assert.ok(cs.length >= 6, 'colours found');
    const off = cs.filter(c => { const v = rgb(c); const h = hue(v); return h >= 0 && !(v[0] > 240 && v[1] > 240 && v[2] > 240) && (h < 190 || h > 224); });
    assert.deepEqual(off, [], 'off-brand: ' + off.join(' '));
});

test('five orbs fit around the Move bubble on small and large phones without covering Misty', () => {
    const inside = (p, o, vw, vh) => p.x - o / 2 >= 0 && p.y - o / 2 >= 0 && p.x + o / 2 <= vw && p.y + o / 2 <= vh;
    const apart = (pts, o) => pts.every((p, i) => pts.every((q, j) => i >= j || Math.hypot(p.x - q.x, p.y - q.y) >= o * 0.98));
    for (const [vw, vh] of [[375, 667], [390, 844], [430, 932], [412, 915]]) {
        const m = { x: vw / 2, y: vh * 0.5, r: Math.min(vw, vh) * 0.2 };
        for (const b of [{ x: vw - 52, y: vh * 0.36, r: 36 }, { x: vw - 52, y: vh * 0.5, r: 36 }, { x: vw * 0.74, y: vh * 0.27, r: 36 }]) {
            const L = core.layout(b, m, 5, 72, vw, vh);
            assert.equal(L.pts.length, 5);
            L.pts.forEach(p => assert.ok(inside(p, 72, vw, vh), vw + 'x' + vh + ' inside'));
            assert.ok(apart(L.pts, 72), vw + 'x' + vh + ' apart');
        }
    }
});
