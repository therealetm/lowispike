/* Oct 22 2026 (Emmanuel: "Move the mirror mode more up, because that's the most impressive part in the whole app, so that needs to
   be highlighted"). Mirror mode: the hero card at the top of the Move page, the first bubble of the Move bloom on Home (two taps:
   Move, then Mirror), and a tutorial card right after the basic gestures. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const F = require('../move-bubble.js');
const S = require('../tutorial-steps.js');

test('Move page: the Mirror hero is the first card, before the quick session; the old mid-page strip is gone', () => {
    const html = read('index.html');
    const i = html.indexOf('h += LowiMirror.heroHTML()'), j = html.indexOf('<div class="card goldline mv-hero">');
    assert.ok(i > 0 && j > 0 && i < j, 'hero before the quick-session card');
    assert.ok(/LowiMirror && !LowiMirror\.heroHTML \? LowiMirror\.stripHTML\(\)/.test(html), 'the strip only shows as a fallback');
});

test('hero card: Start opens Mirror, three languages, One UI glass, still with Reduce Motion', () => {
    const js = read('mirror-move.js'), css = read('mirror-move.css');
    const fn = js.slice(js.indexOf('function heroHTML'), js.indexOf('W.LowiMirror ='));
    assert.ok(/class="mm-hero-go" data-mm="open"/.test(fn), 'Start button opens Mirror');
    for (const s of ['Start Mirror mode', 'Spiegel-Modus starten', 'Empezar modo espejo', 'Nothing is recorded', 'Nichts wird aufgenommen', 'No se graba nada'])
        assert.ok(fn.includes(s), s);
    assert.ok(/W\.LowiMirror = \{ stripHTML, heroHTML, open/.test(js));
    assert.ok(/\.mm-hero \{[\s\S]*?var\(--one-glass/.test(css), 'One UI dark glass (same in Day and Night)');
    assert.ok(/prefers-reduced-motion: reduce\) \{\s*\.mm-hero::before, \.mm-hero::after, \.mm-hero-glow, \.mm-hero-arm \{ animation: none/.test(css));
});

test('Move bloom on Home: Mirror is the first bubble and replaces the bloom (no stacking)', () => {
    const js = read('move-bubble.js');
    assert.ok(/L: mir \? \(i \? C\.LEVELS\[i - 1\] : null\) : C\.LEVELS\[i\]/.test(js), 'first point is Mirror');
    assert.ok(/n: C\.LEVELS\.length \+ \(hasMirror\(\) \? 1 : 0\)/.test(js), 'the fan makes room for it');
    assert.ok(/function openMirror\(orbEl\) \{\s*closeBloom\(false, orbEl\);\s*try \{ W\.LowiMirror\.open\(\)/.test(js), 'the bloom closes before Mirror opens');
    assert.ok(/dataset\.wm === 'mirror'\) openMirror\(t\)/.test(js));
    for (const s of ["'Mirror', 'Spiegel', 'Espejo'", "'camera workout', 'Kamera-Workout', 'entreno con cámara'"]) assert.ok(js.includes(s), s);
});

test('five bubbles still fan apart and on screen on a small phone (iPhone SE size)', () => {
    const g = { cx: 320 - 46 - 8, cy: 230, r: 40, orb: 64, n: 5, vw: 375, vh: 667, top: 6, bottom: 6, misty: { x: 187, y: 330, r: 95 }, avoid: [] };
    const f = F.fan(g), h = g.orb / 2;
    assert.strictEqual(f.pts.length, 5);
    for (const p of f.pts) assert.ok(p.x - h >= 0 && p.x + h <= g.vw && p.y - h >= 0 && p.y + h <= g.vh, 'on screen');
    for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) assert.ok(Math.hypot(f.pts[i].x - f.pts[j].x, f.pts[i].y - f.pts[j].y) >= g.orb - 0.5, 'apart');
});

test('tutorial: Mirror mode has its own card (hold Move, Nov 5 2026), never a "tap Move, then Mirror" path', () => {
    /* Nov 5 2026 (owner: the tour never said that holding Move opens Mirror mode): Mirror mode is its own card again, right after
       Water/Move/Sleep; its finger holds Move and the real Move page opens. The companion card no longer claims to cover it. */
    const m = S.STEPS.find(x => x.id === 'mirror');
    assert.ok(m && m.demo.g === 'hold' && m.demo.open === 'move-page' && m.covers.includes('mirror-mode') && m.teaches.includes('move-hold'), 'hold Move, the Move page opens');
    assert.deepStrictEqual(S.plan({}).map(x => x.id).slice(3, 5), ['day', 'mirror']);
    for (const l of ['en', 'de', 'es']) assert.ok(m.text[l].length <= 200 && /Mirror|Spiegel|espejo/.test(m.text[l]) && /Hold|Halt|Mantén/.test(m.text[l]), 'mirror/' + l);
    assert.strictEqual(S.covered()['mirror-mode'], 'mirror');
    const s = S.STEPS.find(x => x.id === 'hello');
    assert.ok(!s.covers.includes('mirror-mode'), 'the companion card does not mention Mirror mode, so it does not claim it');
    assert.ok(s.demo && s.demo.g === 'hold' && s.demo.open === 'misty-card', 'its finger holds the companion and her card opens');
    for (const l of ['en', 'de', 'es']) assert.ok(s.text[l].length < 230 && s.title[l], l);
    assert.ok(S.VERSION >= 26);
    assert.ok(/mirror: \{ g: 'hold', vis: 'mirror' \}/.test(read('tutorial-show.js')), 'Oct 23: hold Move (Mirror left the Move bloom)');
    for (const st of S.STEPS) for (const l of ['en', 'de', 'es']) assert.ok(!/then Mirror|dann auf Spiegel|luego Espejo/.test(st.text[l]), st.id + '/' + l + ': no old two-tap path');
});
