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

test('power grows every form: the body plan escalates (Oct 21 2026 redesign replaced fins and stones)', () => {
    const P = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(C.power);
    assert.ok(P[0].cilia && !P[0].flag && !P[0].limbs, 'form 1 is a simple cell');
    assert.ok(P[3].hood && P[3].flag[0] === 3 && P[4].flag[0] === 5 && P[4].sail, 'forms 4-5 swim on filaments');
    assert.ok(P[5].limbs[0] === 8 && P[6].limbs[0] === 10 && P[6].coral > P[5].coral, 'forms 6-7 are reef spirits');
    for (let i = 6; i < 10; i++) assert.ok(P[i].limbs[0] >= P[i - 1].limbs[0] || i === 5, 'arms never drop at form ' + (i + 1));
    for (let i = 8; i < 10; i++) assert.ok(P[i].orbs > P[i - 1].orbs && P[i].bell >= P[i - 1].bell, 'more organelles at form ' + (i + 1));
    P[0].frame = 99; assert.notEqual(C.power(0).frame, 99, 'power() hands out a copy');
});

test('every element draws more each form from the swimmer on', () => {
    for (const el of ELS) {
        const sizes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(st => { const l = L(el, st); return (l.back + l.front).length; });
        for (const i of [1, 2, 3, 4, 6, 7, 8, 9]) assert.ok(sizes[i] > sizes[i - 1], el + ' draws more at form ' + (i + 1));
        assert.ok(count(L(el, 2).back, 'cf-flag') === 1 && count(L(el, 0).back, 'cf-flag') === 0, el + ' first tail at form 3');
    }
});

test('fins get longer from form 3 on and tails reach further (stay in the frame: tools/companion/evo-forms.cjs measures it)', () => {
    const reach = (el, st, cls) => { const l = L(el, st).back, i = l.indexOf('class="' + cls); assert.ok(i >= 0, el + ' ' + cls + ' at ' + st); const seg = l.slice(i, l.indexOf('</g>', i)); let a = 0; for (const v of (seg.match(/-?[\d.]+/g) || []).map(Number)) a = Math.max(a, Math.abs(v)); return a; };
    for (const el of ELS) {
        const p2 = C.power(2).fin[0], p3 = C.power(3).fin[0], p4 = C.power(4).fin[0];
        assert.ok(p3 > p2 * 1.2 && p4 > p3, el + ' fins clearly bigger at form 4 and 5');
        assert.ok(reach(el, 4, 'cf-flag') > reach(el, 2, 'cf-flag'), el + ' tails reach further at form 5');
    }
});

test('tails and arms grow out of the rim, never out of the face', () => {
    for (const el of ELS) for (const st of [2, 3, 4, 5, 6, 7, 8, 9]) {
        const R = C.CELL_R[st], l = L(el, st).back, re = /<path style="--k:\d+" d="M([-\d.]+) ([-\d.]+)L/g; let m, n = 0;
        while ((m = re.exec(l))) { n++; const d = Math.hypot(+m[1] - 130, +m[2] - 158); assert.ok(d > R * .7, el + ' form ' + (st + 1) + ' starts near the rim (' + d.toFixed(1) + ' vs R ' + R + ')'); }
        assert.ok(n > 0);
    }
    assert.deepEqual(C.STONE_AT, [], 'the armour stones are gone');
});

test('frame: young forms sit small, the svg says its form, centre stays put', () => {
    const R = 64, svg = '<svg class="tmg-plant cf-x cw-cell" viewBox="30 58 200 200"><defs id="zzcyto"></defs><g class="lh-creature"><ellipse class="lh-body cw-wall" cx="130" cy="158" rx="' + R + '"/></g><g class="cw-face"></g></svg>';
    const out = st => C.apply(svg.replace('cf-x', 'cf-form'), gen('fire', st), {});
    const vb = st => (/viewBox="([^"]+)"/.exec(out(st)) || [])[1].split(' ').map(Number);
    for (let st = 0; st < 10; st++) {
        const v = vb(st), fr = C.POWER[st].frame;
        assert.ok(Math.abs(v[2] - 200 * fr) < .2 && Math.abs(v[3] - 200 * fr) < .2, 'frame ' + st);
        assert.ok(Math.abs(v[0] + v[2] / 2 - 130) < .2 && Math.abs(v[1] + v[3] / 2 - 158) < .2, 'centred on the body ' + st);
        assert.ok(out(st).includes('data-cf-st="' + st + '"'));
    }
    for (let st = 1; st < 10; st++) assert.ok(C.POWER[st].frame >= C.POWER[st - 1].frame, 'the frame never shrinks, so the body never jumps bigger (' + st + ')');
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
