'use strict';
/* Oct 21 2026 companion evolution redesign (Eman: "That's boring ... not very Pokemon like ... you can really go big here ...
   like Digimon ... in our own design with cellular metabolic"). Approved path: simple glowing cell -> swimming filament
   creature -> many-limbed reef spirit -> massive celestial organism with orbiting organelles, same luminous core and palette.
   Locked forms are never drawn, so every evolution is a reveal. tools/companion/evo-forms.cjs checks the same in a browser. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const C = require('../companion-core.js');
const gen = (el, st, sd) => C.genome({ sign: { element: el }, palette: { a: '#92ddd7', b: '#b8b0ff' } }, st, sd || 7);
const L = (el, st, sd, o) => C.layers(gen(el, st, sd), C.CELL_R[st], Object.assign({ id: 't' }, o || {}));
const all = l => l.back + l.front;
const count = (s, re) => (s.match(re) || []).length;

test('the four approved phases: cell, filament swimmer, reef spirit, celestial organism', () => {
    for (const el of C.ELS) {
        const s = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(st => all(L(el, st)));
        for (const st of [0, 1]) assert.ok(/cf-cilia/.test(s[st]) && !/cf-flag|cf-limbs|cf-orb|cf-hood/.test(s[st]), el + ' form ' + (st + 1) + ' is a simple cell');
        assert.ok(/cf-bud/.test(s[1]) && !/cf-bud/.test(s[0]), el + ' form 2 buds');
        for (const st of [3, 4]) assert.ok(/cf-hood/.test(s[st]) && /cf-flag/.test(s[st]) && !/cf-limbs/.test(s[st]), el + ' form ' + (st + 1) + ' is a filament swimmer');
        for (const st of [5, 6]) assert.ok(/cf-limbs/.test(s[st]) && /cf-coral/.test(s[st]) && /cf-frill/.test(s[st]) && !/cf-hood|cf-orb/.test(s[st]), el + ' form ' + (st + 1) + ' is a reef spirit');
        for (const st of [7, 8, 9]) assert.ok(/cf-bell/.test(s[st]) && /cf-ring-far/.test(s[st]) && /cf-ring-near/.test(s[st]), el + ' form ' + (st + 1) + ' is celestial');
    }
});

test('every form changes the body plan, never just a bigger bubble', () => {
    const sig = s => ['cilia', 'bud', 'flag', 'fin', 'fin2', 'sail', 'hood', 'limbs', 'coral', 'frill', 'bell', 'orb', 'ring', 'corona'].map(k => k + count(s, new RegExp('class="cf-' + k + '[ "]', 'g'))).join(',') + count(s, /<path style="--k/g);
    for (const el of C.ELS) for (let st = 1; st < 10; st++) assert.notEqual(sig(all(L(el, st))), sig(all(L(el, st - 1))), el + ' form ' + (st + 1) + ' differs from form ' + st);
});

test('tails, arms and organelles: counts per form', () => {
    const P = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(C.power);
    assert.deepEqual(P.map(p => p.flag ? p.flag[0] : 0), [0, 0, 1, 3, 5, 0, 0, 2, 2, 4]);
    assert.deepEqual(P.map(p => p.limbs ? p.limbs[0] : 0), [0, 0, 0, 0, 0, 8, 10, 12, 12, 14]);
    assert.deepEqual(P.map(p => p.orbs || 0), [0, 0, 0, 0, 0, 0, 0, 3, 5, 7]);
    for (const el of C.ELS) {
        assert.equal(count(L(el, 3).back, /<g class="cf-flag"[^>]*>(<path[^>]*\/>){3}<\/g>/g), 1, el + ' three tails at form 4');
        const o9 = all(L(el, 9)); assert.equal(count(o9, /class="cf-orb /g), 7, el + ' seven organelles at form 10');
        assert.ok(/cf-st9/.test(o9) && /#ffe6a2/.test(o9), el + ' gold edges on the last form');
    }
    P[0].frame = 99; assert.notEqual(C.power(0).frame, 99, 'power() hands out a copy');
});

test('organelles that pass in front stay out at the sides, never over the face', () => {
    for (const el of C.ELS) for (const st of [7, 8, 9]) for (const sd of [1, 7, 31]) {
        const R = C.CELL_R[st], f = L(el, st, sd).front, chunks = f.split('class="cf-ring cf-ring-near"').slice(1);
        assert.ok(chunks.length >= 1);
        for (const c of chunks) {
            const r = /^ transform="rotate\(([-\d.]+) ([-\d.]+) ([-\d.]+)\)"/.exec(c), a = +r[1] * Math.PI / 180, cx = +r[2], cy = +r[3];
            const part = c.split('class="cf-ring')[0], re = /class="cf-orb[^"]*" style="--k:\d+" transform="translate\(([-\d.]+) ([-\d.]+)\)/g; let m;
            while ((m = re.exec(part))) {
                const x = +m[1] - cx, y = +m[2] - cy, X = cx + x * Math.cos(a) - y * Math.sin(a) - 130, Y = cy + x * Math.sin(a) + y * Math.cos(a) - 158;
                assert.ok(Math.hypot(X, Y) > R * .75, el + ' form ' + (st + 1) + ' organelle off the face (' + Math.hypot(X, Y).toFixed(1) + ' vs R ' + R + ')');
            }
        }
    }
});

test('every form draws clean SVG for every family and seed (no NaN, balanced groups, hats respected)', () => {
    for (const el of C.ELS) for (let st = 0; st < 10; st++) for (const sd of [1, 7, 33, 90]) {
        const l = L(el, st, sd), s = all(l) + l.defs;
        assert.ok(!/NaN|undefined|Infinity/.test(s), el + ' ' + st + ' ' + sd);
        assert.equal(count(s, /<g[ >]/g), count(s, /<\/g>/g), 'balanced groups ' + el + ' ' + st);
        const h = all(L(el, st, sd, { hat: true }));
        assert.ok(!/cf-coral|cf-sail/.test(h), 'nothing on top of the head under a hat ' + el + ' ' + st);
    }
});

test('locked forms are never drawn: mystery orb and ??? until reached', () => {
    const js = read('companion.js'), css = read('companion.css');
    assert.ok(/\(s\.reached \? '<span class="cf-sm">' \+ formArt\(/.test(js), 'art only for reached forms');
    assert.ok(/'<span class="cf-mystery" aria-hidden="true">\?<\/span><b aria-hidden="true">\?\?\?<\/b>'/.test(js), 'locked forms show the mystery orb');
    assert.ok(/not discovered yet/.test(js) && /noch nicht entdeckt/.test(js) && /aún sin descubrir/.test(js), 'screen readers hear it is locked, not its name');
    assert.ok(/\.cf-mystery \{/.test(css) && !/\.cf-locked \.cf-sm/.test(css), 'no faded silhouette style left');
});

test('path tiles fit a 320pt iPhone SE: thumbnail and mystery orb shrink with the tile instead of spilling', () => {
    /* Oct 21 2026 inspection: at 320pt each Misty-sheet tile is ~44px inside; a fixed 58px thumbnail spilled 6px into the
       next column and the 52px orb + margins overflowed. tools/companion/evo-inspect.cjs measures the same in a browser. */
    const css = read('companion.css');
    const rule = sel => { const m = css.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}')); return m ? m[1] : ''; };
    const sm = rule('.cf-misty .cf-sm'), orb = rule('.cf-misty .cf-mystery'), step = rule('.cf-misty .cf-step');
    assert.match(sm, /width:\s*100%/); assert.match(sm, /max-width:\s*58px/); assert.match(sm, /aspect-ratio/); assert.doesNotMatch(sm, /(^|;)\s*width:\s*58px/);
    assert.match(orb, /width:\s*min\(52px/); assert.match(orb, /aspect-ratio:\s*1/);
    assert.match(step, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});
test('the evolution moment and the path name the new anatomy in three languages', () => {
    const h = read('herb-tamagotchi.js');
    for (const [k, w] of [[2, 'whip tail'], [3, 'filament swimmer'], [5, 'reef spirit'], [7, 'orbiting organelles'], [9, 'golden edges']]) assert.ok(new RegExp('evoPow' + k + ":\\['[^']*" + w, 'i').test(h), 'evoPow' + k + ' says ' + w);
    assert.ok(!/horns|stones|Hörnchen|Steine|piedras/.test((h.match(/evoPow\d:\[[^\]]*\]/g) || []).join(' ')), 'no old armour wording');
    assert.equal(C.traitName('water', 5, 'en'), 'Tide reef arms');
    assert.equal(C.traitName('water', 3, 'de').split('-')[1], 'Fadenschweife');
    assert.ok(/órbitas de orgánulos/.test(C.traitName('fire', 8, 'es')));
});

test('motion stays cheap and honours Reduce Motion', () => {
    const css = read('companion.css'), rm = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce) {'));
    for (const sel of ['.cf-flag path', '.cf-limbs', '.cf-bell', '.cf-cilia', '.cf-fin > path', '.cf-sail > path', '.cf-orb > *', '.cf-glow circle', '.cf-corona']) assert.ok(rm.slice(0, 900).includes(sel), 'reduce motion stops ' + sel);
    const core = read('companion-core.js'), body = core.slice(core.indexOf('const ANATOMY = ['), core.indexOf('/* add the form to'));
    assert.ok(!/filter=|<filter|feGaussian/.test(body), 'no SVG filters in the anatomy');
});
