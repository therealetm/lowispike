/* Oct 19 (E-man: "why wasn't the version shown in onboarding given to me?"): the companion the onboarding reveal shows is the
   one Home, Forms, the care room, the dock and the 3D sprite draw. Before this, cell-world.js drew the same shared cell for
   every user and the birth companion's look (companion-birth-core.js) only ever appeared in the reveal and on Profile. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const B = require('../companion-birth-core.js');
const CW = require('../cell-world.js');
const MF = require('../misty-face.js');
const CC = require('../companion-core.js');

/* a herb svg shaped like herb-tamagotchi's real output: nested face groups, wardrobe after the face, pot and effects */
const FACE = '<g class="lh-face" transform="translate(130 196)"><g class="lh-eyes"><ellipse cx="-11" cy="-2" rx="4" ry="5"/><ellipse cx="11" cy="-2" rx="4" ry="5"/></g>' +
    '<g class="lh-sleep-eyes"><path d="M-15 -1q4 3 8 0"/></g><g class="lh-dizzy-eyes"><path d="M-8 -2"/></g><ellipse class="lh-blush" cx="-21" cy="9"/><ellipse class="lh-blush" cx="21" cy="9"/>' +
    '<path class="lh-smile" d="M-5 9q5 4 10 0"/><path class="lh-flat" d="M-4 11h8"/><path class="lh-calm" d="M-3 11h6"/><path class="lh-frown" d="M-4 13q4-3 8 0"/><ellipse class="lh-ooh" cy="11"/></g>';
const ORIG = '<svg class="tmg-plant lh-sprite lh-stage-0 lh-calm lh-pot-porcelain" style="--tmg-a:#ffd1e5;--tmg-b:#b6d4ff" viewBox="0 0 260 310" role="img"><defs><radialGradient id="lh9glow"></radialGradient></defs>' +
    '<g class="lh-constellation"><circle r="1"/></g><g class="lh-halo"><ellipse/></g><g class="lh-creature"><g class="lh-foliage"><path class="lh-stem"/><g class="lh-leaf"><path/></g><ellipse class="lh-body"/>' +
    FACE + '<g class="lh-acc lh-acc-scarf"><path/></g><g class="lh-acc lh-acc-crown"><path/></g></g>' +
    '<g class="lh-pot"><path/><g class="lh-pot-fx"><circle/></g></g></g><g class="lh-comet-orbit"><circle/></g><g class="lh-care-fx"></g></svg>';
const stage = (s, i) => s.replace('lh-stage-0', 'lh-stage-' + i);
const ownOf = (bday, btime, n) => { const c = B.generate({ bday, btime: btime || '', n: n || 0 }); return { c, q: B.parts(c, 'lh9o') }; };
const balanced = s => (s.match(/<g\b/g) || []).length === (s.match(/<\/g>/g) || []).length;

test('the reveal draws the companion from the same shared pieces Home uses', () => {
    for (const d of ['1997-10-03', '1997-10-14', '1997-10-27', '1990-03-30', '2004-08-08']) {
        const c = B.generate({ bday: d }), q = B.parts(c, 'zz'), s = B.svg(c);
        const id = /id="(lc\d+x\d+)b"/.exec(s)[1], q2 = B.parts(c, id);
        for (const k of ['shape', 'marks', 'eyes', 'mouth', 'acc', 'motif', 'parts', 'cheeks']) assert.ok(s.includes(q2[k]), d + ' reveal contains ' + k);
        assert.equal(q.shape.replace(/zz/g, ''), q2.shape.replace(new RegExp(id, 'g'), ''), 'same body for any id');
    }
});

test('Home draws the onboarding companion: its body, colours, marks, eyes, accessory, motif and particles', () => {
    const { c, q } = ownOf('1997-10-14');
    const out = CW.compose(ORIG, 0, { own: q });
    assert.match(out, /class="tmg-plant cw-cell cw-own-cell lh-sprite lh-stage-0/);
    for (const k of ['shape', 'marks', 'eyes', 'acc', 'motif', 'parts', 'mouth']) assert.ok(out.includes(q[k]), k + ' drawn on Home');
    assert.ok(out.includes('stop-color="' + c.palette.a + '"') && out.includes('stop-color="' + c.palette.deep + '"'), 'its own colours');
    assert.doesNotMatch(out, /cw-nucleus|cw-mito|cw-er|cw-xtals|cw-cilia/, 'not the shared cell');
    assert.equal((out.match(/class="lh-face/g) || []).length, 1, 'exactly one face, the herb face is replaced');
    assert.match(out, /class="lh-body cw-wall"[^>]*visibility:hidden/, 'the wall anchor stays for apply() and the 3D face, invisible');
    for (const k of ['lh-eyes', 'lh-sleep-eyes', 'lh-dizzy-eyes', 'lh-blush', 'lh-smile', 'lh-flat', 'lh-calm', 'lh-frown', 'lh-ooh', 'lh-acc-scarf', 'lh-acc-crown', 'lh-pot-fx', 'lh-comet-orbit', 'lh-care-fx', 'lh-halo']) assert.ok(out.includes(k), k + ' kept (moods, wardrobe, effects)');
    assert.ok(balanced(out), 'groups balanced');
    assert.ok(out.endsWith('</svg>'));
});

test('without an own companion the cell is exactly as before (Misty, friends, users before the reveal)', () => {
    const plain = CW.compose(ORIG, 2);
    assert.equal(CW.compose(ORIG, 2, { own: false }), plain);
    assert.equal(CW.compose(ORIG, 2, { own: null }), plain);
    assert.equal(CW.compose(ORIG, 2, { own: {} }), plain, 'a broken record falls back to the cell');
    assert.match(plain, /cw-nucleus/);
    assert.doesNotMatch(plain, /cw-own/);
});

test('different birthdays give different Home companions; a new name keeps the look', () => {
    const seen = new Set();
    for (const d of ['1997-10-01', '1997-10-08', '1997-10-14', '1997-10-21', '1997-10-25', '1997-10-31']) seen.add(CW.compose(ORIG, 0, { own: ownOf(d).q }));
    assert.equal(seen.size, 6, 'six October 1997 birthdays, six companions');
    assert.notEqual(CW.compose(ORIG, 0, { own: ownOf('1997-10-14', '07:45').q }), CW.compose(ORIG, 0, { own: ownOf('1997-10-14').q }), 'birth time changes it, as in the reveal');
    assert.equal(CW.compose(ORIG, 0, { own: ownOf('1997-10-14', '', 3).q }), CW.compose(ORIG, 0, { own: ownOf('1997-10-14', '', 0).q }), 'shuffling the name keeps the same look');
});

test('every Forms stage shows the same companion, growing, with the face the 3D sprite can crop', () => {
    const { q } = ownOf('1997-10-27', '07:45');
    let last = 0;
    for (let i = 0; i < 6; i++) {
        const out = CW.compose(stage(ORIG, i), i, { own: q });
        assert.ok(out.includes(q.shape) && out.includes(q.eyes), 'stage ' + i + ' is the own companion');
        const k = +/cw-own-body" transform="translate\([\d.]+ [\d.]+\) scale\(([\d.]+)\)/.exec(out)[1];
        assert.ok(k > last, 'stage ' + i + ' bigger'); last = k;
        const kf = +/cw-own-face" transform="translate\(130 [-\d.]+\)"><g transform="scale\(([\d.]+)\)/.exec(out)[1];
        assert.ok(kf <= 2.3 + 1e-9, 'face fits the 3D crop at stage ' + i);
        const sp = MF.splitArt(out);
        assert.ok(sp && sp.face.includes('lh-eyes') && !sp.body.includes('lh-face'), 'misty-face splits body and face at stage ' + i);
        const g = CC.genome({ sign: 'scorpio', type: 'INFJ' });
        const formed = CC.apply ? CC.apply(out, g, i) : out;
        assert.ok(balanced(formed) && formed.includes(q.shape), 'the evolution form layers wrap it at stage ' + i);
    }
});

test('wiring: the app reads the saved companion, friends never wear it, and Home repaints when it is saved', () => {
    const cw = read('cell-world.js'), cp = read('companion.js'), css = read('cell-world.css');
    assert.match(cw, /function ownOpts\(opts, out\)/);
    assert.match(cw, /LowiBirthCompanion[\s\S]{0,200}B\.has\(\)[\s\S]{0,200}K\.parts\(c,/);
    assert.match(cw, /compose\(out, m && m\.index \| 0, ownOpts\(opts, out\)\)/);
    assert.match(cw, /addEventListener\('lowi:companion'/, 'the reveal save repaints Home');
    assert.match(cp, /\{ hidden: true, own: false \}/, 'friend art opts out');
    assert.match(css, /prefers-reduced-motion: no-preference\)[\s\S]*\.cw-own-cell \.lc-tw/, 'twinkles only with motion allowed');
    assert.match(read('companion-birth.js'), /dispatchEvent\(new CustomEvent\('lowi:companion'/, 'the reveal announces the save');
});
