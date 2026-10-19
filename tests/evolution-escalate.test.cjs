'use strict';
/* Oct 19 2026 evolution escalation (Eman: "aus diesen kleinen Flossen kriegt er richtig dicke Dinger, kriegt er noch mehr Stein ...
   es soll immer heftiger werden"). Every form is clearly more powerful than the last, and the evolution moment gets stronger. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const C = require('../companion-core.js');
const ELS = ['fire', 'water', 'air', 'earth', 'spirit'];
const gen = (el, st, sd) => C.genome({ sign: { element: el }, palette: { a: '#ff8a5c', b: '#ffd36b' } }, st, sd || 7);
const L = (el, st, sd) => C.layers(gen(el, st, sd), C.CELL_R[st], { id: 't' });
const count = (s, cls) => (s.match(new RegExp('class="' + cls + '[ "]', 'g')) || []).length;

test('power grows every form: fins longer and much thicker, more and bigger stones, horns late', () => {
    const P = [0, 1, 2, 3, 4, 5].map(C.power);
    for (let i = 1; i < 6; i++) for (const k of ['grow', 'thick', 'stones', 'stone', 'horn']) assert.ok(P[i][k] >= P[i - 1][k], k + ' never shrinks at form ' + i);
    for (let i = 3; i < 6; i++) assert.ok(P[i].thick > P[i - 1].thick && P[i].stones > P[i - 1].stones, 'form ' + i + ' is clearly heavier than the one before');
    assert.ok(P[5].thick >= 2, 'last form fins are at least twice as thick as the first fins');
    assert.deepEqual(P.map(p => p.stones), [0, 0, 2, 4, 6, 9]);
    assert.ok(P[4].horn > 0 && P[5].horn > P[4].horn && P[3].horn === 0);
    P[0].grow = 99; assert.equal(C.power(0).grow, 1, 'power() hands out a copy');
});

test('every element draws more each form: stones, horns, ears, wings', () => {
    for (const el of ELS) {
        const sizes = [0, 1, 2, 3, 4, 5].map(st => { const l = L(el, st); return { all: l.back + l.front, stones: count(l.front, 'cf-stone'), horns: count(l.back, 'cf-part cf-horn') }; });
        assert.deepEqual(sizes.map(s => s.stones), [0, 0, 2, 4, 6, 9], el + ' stones');
        assert.deepEqual(sizes.map(s => s.horns), [0, 0, 0, 0, 2, 2], el + ' horn pair from form 5');
        for (let i = 2; i < 6; i++) assert.ok(sizes[i].all.length > sizes[i - 1].all.length, el + ' draws more at form ' + i);
    }
});

test('ears/fins get longer and thicker from form 3 on, capped so they stay in the frame', () => {
    const ear = (el, st) => { const m = /class="cf-part cf-ear"[^>]*>\s*<path[^>]*d="([^"]+)"/.exec(L(el, st).back); assert.ok(m, el + ' ear at ' + st); const n = m[1].match(/-?[\d.]+/g).map(Number); let a = 0; for (const v of n) a = Math.max(a, Math.abs(v)); return a; };
    for (const el of ELS) {
        const e2 = ear(el, 2), e3 = ear(el, 3), e5 = ear(el, 5);
        assert.ok(e3 > e2 * 1.2, el + ' fins clearly bigger at form 4 (' + e2 + ' -> ' + e3 + ')');
        assert.ok(e5 > e3, el + ' fins biggest at the last form');
    }
});

test('stones sit on the rim, never on the face', () => {
    for (const el of ELS) for (const st of [2, 3, 4, 5]) {
        const R = C.CELL_R[st], l = L(el, st), re = /class="cf-stone"[^>]*transform="translate\(([-\d.]+) ([-\d.]+)\)/g; let m, n = 0;
        while ((m = re.exec(l.front))) { n++; const x = +m[1] - 130, y = +m[2] - 158, d = Math.hypot(x, y); assert.ok(d > R * .8, el + ' form ' + st + ' stone near the rim (' + d.toFixed(1) + ' vs R ' + R + ')'); }
        assert.ok(n > 0);
    }
    for (const a of C.STONE_AT) assert.ok(a >= 70 && a <= 290, 'no stone on the top of the head (' + a + ')');
});

test('frame: young forms sit small, the svg says its form, centre stays put', () => {
    const R = 64, svg = '<svg class="tmg-plant cf-x cw-cell" viewBox="30 58 200 200"><defs id="zzcyto"></defs><g class="lh-creature"><ellipse class="lh-body cw-wall" cx="130" cy="158" rx="' + R + '"/></g><g class="cw-face"></g></svg>';
    const out = st => C.apply(svg.replace('cf-x', 'cf-form'), gen('fire', st), {});
    const vb = st => (/viewBox="([^"]+)"/.exec(out(st)) || [])[1].split(' ').map(Number);
    for (let st = 0; st < 6; st++) {
        const v = vb(st), fr = C.POWER[st].frame;
        assert.ok(Math.abs(v[2] - 200 * fr) < .2 && Math.abs(v[3] - 200 * fr) < .2, 'frame ' + st);
        assert.ok(Math.abs(v[0] + v[2] / 2 - 130) < .2 && Math.abs(v[1] + v[3] / 2 - 158) < .2, 'centred on the body ' + st);
        assert.ok(out(st).includes('data-cf-st="' + st + '"'));
    }
    assert.ok(C.POWER[0].frame > C.POWER[2].frame, 'the first forms sit smaller than later ones');
});

test('the evolution moment escalates with the tier and waits for other dialogs', () => {
    const js = read('herb-tamagotchi.js'), css = read('herb-tamagotchi.css');
    const evo = js.slice(js.indexOf('function evolve('), js.indexOf('function finishEvolution('));
    assert.ok(evo.includes("'lh-evo-t'+t") && evo.includes("setProperty('--t',t)") && evo.includes("setProperty('--c'"), 'tier class and vars');
    assert.ok(evo.includes('index:from'), 'old form drawn from the same companion at its previous stage');
    assert.ok(/n=4\+3\*t/.test(evo), 'more rays every tier');
    assert.ok(/7000\+700\*t/.test(evo), 'bigger moments stay up a little longer');
    assert.ok(evo.includes('if(evoBusy()){evoWait=setTimeout('), 'waits while something else is open');
    assert.ok(js.includes('#drDay') && js.includes('[aria-modal="true"]:not(#lhEvolution)'), 'Day card and other dialogs count as busy');
    for (let t = 1; t <= 5; t++) assert.ok(/evoPow\d:\['[^']+','[^']+','[^']+'\]/.test(js) && js.includes('evoPow' + t + ":['"), 'power line ' + t + ' in EN/DE/ES');
    for (const k of ['lh-evo-charge', 'lh-evo-burst', 'lh-evo-flash', 'lh-evo-shake']) assert.ok(css.includes('@keyframes ' + k), k);
    assert.ok(/prefers-reduced-motion:reduce\)\{#lhEvolution \.lh-evo-before,#lhEvolution \.lh-evo-flash,#lhEvolution \.lh-evo-rays\{display:none!important\}/.test(css), 'reduced motion: just the new form');
    const block = css.slice(css.indexOf('/* Oct 19 2026 evolution escalation'), css.indexOf('#tmgHomeCard button:focus-visible'));
    assert.ok(!/backdrop-filter|filter:blur|mix-blend/.test(block), 'no new heavy effects on the evolution card');
});

test('Home keeps Eman\'s choices: cell-world untouched by evolution (no glow ring, mouth follows energy)', () => {
    const core = read('companion-core.js');
    const lay = core.slice(core.indexOf('function layers('), core.indexOf('function apply('));
    assert.ok(!/cw-ring|lc-aura|smile/i.test(lay), 'evolution traits add no ring and no smile');
    assert.ok(!/cf-mouth|cw-mouth/.test(lay), 'evolution never draws a mouth');
});
