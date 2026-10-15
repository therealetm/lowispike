/* Living cell + metabolic world: model, cell drawing, copy and wiring. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const C = require('../cell-world.js');
const H = 3600000, M = 60000;
const NOON = new Date(2026, 9, 15, 13, 0).getTime();
const LATE = new Date(2026, 9, 15, 23, 40).getTime();

test('a high-spike meal makes the world spiked, and it fades over the next hours', () => {
    const meal = { t: 'Schoko-Pudding', lvl: 'high', r: 'nein', ts: NOON - 20 * M };
    const v = C.model({ now: NOON, logs: [meal] });
    assert.equal(v.state, 'spiked');
    assert.ok(v.spike > 0.9);
    assert.equal(v.activity, 'clean');
    assert.ok(v.reasons.some(r => r.k === 'spike'));
    const later = C.model({ now: NOON + 3 * H, logs: [meal] });
    assert.ok(later.spike < v.spike && later.spike < 0.35, 'recovers after a few hours');
    assert.notEqual(later.state, 'spiked');
    assert.equal(C.model({ now: NOON + 5 * H, logs: [meal] }).spike, 0);
});

test('spike verdicts: analyzer fields first, sugar or sweet words only without a verdict', () => {
    assert.equal(C.verdict({ lvl: 'high' }), 'spike');
    assert.equal(C.verdict({ r: 'nein' }), 'spike');
    assert.equal(C.verdict({ lvl: 'low', t: 'Schokolade 90%' }), 'low');
    assert.equal(C.verdict({ r: 'selten' }), 'medium');
    assert.equal(C.verdict({ t: 'Chocolate pudding', r: 'unknown', lvl: '' }), 'spike');
    assert.equal(C.verdict({ t: 'Linsen Bowl', macros: { sugar: 30 } }), 'spike');
    assert.equal(C.verdict({ t: 'Linsen Bowl', macros: { sugar: 4 } }), '');
    assert.equal(C.verdict({ t: 'Linsen Bowl', macros: { sugar: null } }), '');
    const voided = C.model({ now: NOON, logs: [{ t: 'Kuchen', lvl: 'high', ts: NOON - M, voided: true }] });
    assert.notEqual(voided.state, 'spiked', 'undone meals do not count');
});

test('a Move logged recently makes the cell pump, and it calms down after', () => {
    const led = [{ ts: NOON - 15 * M, amt: 15, src: 'move', label: 'Move' }];
    const v = C.model({ now: NOON, ledger: led });
    assert.equal(v.state, 'active');
    assert.equal(v.activity, 'pump');
    assert.ok(v.speed < 3, 'fast flow');
    assert.equal(C.model({ now: NOON + 3 * H, ledger: led }).state, 'calm');
    assert.equal(C.kindOf({ src: 'quest', label: 'Spazieren gehen (walk)' }), 'move');
    assert.equal(C.kindOf({ src: 'meal', label: 'Breakfast' }), '');
});

test('late at night with the app open the cell is awake but tired', () => {
    const v = C.model({ now: LATE });
    assert.equal(v.state, 'night');
    assert.equal(v.night, true);
    assert.equal(v.tired, 1);
    assert.equal(v.activity, 'yawn');
    assert.equal(C.model({ now: new Date(2026, 9, 16, 3, 0).getTime() }).state, 'night');
    assert.equal(C.model({ now: new Date(2026, 9, 16, 7, 0).getTime() }).state, 'calm');
});

test('water, low-spike meals, fasting and a full sun clear the world', () => {
    const v = C.model({ now: NOON, water: 6, logs: [{ t: 'Salat', lvl: 'low', ts: NOON - H }], ledger: [{ ts: NOON - 2 * H, amt: 10, src: 'sun-full', day: C.dayKey(NOON) }] });
    assert.equal(v.state, 'clear');
    assert.equal(v.activity, 'glow');
    assert.ok(v.clear >= 0.9);
    assert.ok(v.sunFull);
    const plain = C.model({ now: NOON });
    assert.equal(plain.state, 'calm');
    assert.equal(plain.reasons.length, 0);
});

test('the optional mood tap is mirrored and expires', () => {
    assert.equal(C.model({ now: NOON, mood: { v: 'unwell', ts: NOON - H } }).state, 'unwell');
    assert.equal(C.model({ now: NOON, mood: { v: 'tired', ts: NOON - H } }).state, 'tired');
    assert.equal(C.model({ now: NOON, mood: { v: 'good', ts: NOON - H } }).state, 'clear');
    assert.equal(C.model({ now: NOON, mood: { v: 'tired', ts: NOON - 9 * H } }).state, 'calm', 'old moods drop off');
    assert.equal(C.model({ now: NOON, mood: { v: 'grumpy', ts: NOON } }).mood, '');
    assert.equal(C.model({ now: NOON, energy: 2 }).state, 'tired', 'existing body diary energy is used when present');
});

test('the garden trip from the sun meter is the cell journey', () => {
    const v = C.model({ now: NOON, sun: { away: true, left: 30 * M } });
    assert.equal(v.activity, 'journey');
    assert.equal(v.away, true);
    assert.equal(v.left, 30 * M);
});

const ORIG = '<svg class="tmg-plant lh-sprite lh-stage-2 lh-calm lh-pot-porcelain" style="--tmg-a:#8fe3c8;--tmg-b:#b7a6ff" viewBox="0 0 260 310" role="img"><defs><radialGradient id="lh9glow"></radialGradient></defs>' +
    '<g class="lh-constellation"><circle r="1"/></g><g class="lh-halo"><ellipse/></g><g class="lh-creature"><g class="lh-foliage"><path class="lh-stem"/><g class="lh-leaf"><path/></g><ellipse class="lh-body"/>' +
    '<g class="lh-face"><g class="lh-eyes"><ellipse/></g></g><g class="lh-acc lh-acc-scarf"><path/></g><g class="lh-acc lh-acc-crown"><path/></g></g>' +
    '<g class="lh-pot"><path/><g class="lh-pot-fx"><circle/></g></g></g><g class="lh-comet-orbit"><circle/></g><g class="lh-care-fx"></g></svg>';

test('the herb SVG becomes a cell and keeps face, wardrobe pieces and effects', () => {
    const out = C.compose(ORIG, 2);
    assert.match(out, /class="tmg-plant cw-cell lh-sprite lh-stage-2/);
    assert.match(out, /cw-membrane/);
    assert.match(out, /cw-nucleus/);
    assert.match(out, /cw-mito/);
    assert.match(out, /cw-xtals/);
    assert.match(out, /class="lh-body cw-wall"/);
    assert.doesNotMatch(out, /lh-stem|lh-leaf/, 'no stem or leaves left');
    for (const k of ['lh-face', 'lh-eyes', 'lh-acc-scarf', 'lh-acc-crown', 'lh-pot-fx', 'lh-comet-orbit', 'lh-care-fx', 'lh-halo', 'lh-constellation']) assert.ok(out.includes(k), k + ' kept');
    assert.equal((out.match(/<g/g) || []).length, (out.match(/<\/g>/g) || []).length, 'groups balanced');
    assert.ok(out.endsWith('</svg>'));
    assert.doesNotMatch(out, /viewBox="0 0 260 310"/, 'framed around the cell');
    assert.equal(C.compose('<svg viewBox="0 0 10 10"></svg>', 0), '<svg viewBox="0 0 10 10"></svg>', 'unknown markup passes through');
});

test('every stage draws a bigger, richer cell', () => {
    let last = 0, lastCilia = -1;
    for (let i = 0; i < 6; i++) {
        const c = C.cellParts(i, 'x', '#fff', '#000');
        assert.ok(c.R > last);
        const cilia = (c.body.match(/cw-cilium/g) || []).length;
        assert.ok(cilia > lastCilia || (i === 0 && cilia === 0));
        last = c.R; lastCilia = cilia;
    }
});

const js = fs.readFileSync(path.join(root, 'cell-world.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'cell-world.css'), 'utf8');

test('copy in English, German and Spanish, with no health claims', () => {
    global.window = undefined;
    const m = js.match(/const copy = \{([\s\S]*?)\n    \};/);
    assert.ok(m);
    const copy = Function('return {' + m[1] + '}')();
    for (const k of ['clear', 'calm', 'active', 'spiked', 'night', 'tired', 'unwell', 'feel', 'm_good', 'm_okay', 'm_tired', 'm_unwell', 'hint', 'act_journey', 'act_pump', 'act_clean', 'act_yawn', 'act_glow', 'act_drift', 'act_repair', 'act_rest']) {
        assert.equal(copy[k].length, 3, k);
        copy[k].forEach(t => assert.ok(t && t.length > 1, k));
    }
    const all = Object.values(copy).flat().join(' ').toLowerCase();
    for (const bad of ['insulin level', 'blood sugar level', 'heal', 'cure', 'diagnos', 'disease', 'krankheit', 'heilt', 'blutzuckerwert', 'enfermedad', 'cura ']) assert.ok(!all.includes(bad), bad);
    assert.match(copy.hint[1], /keine Messung/);
});

test('reduced motion stops every animation, and nothing heavy is loaded', () => {
    const rm = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    assert.match(rm, /\.cw-env i, \.cw-cell \*, \.cw-cell[^{]*\{ animation: none !important/);
    assert.doesNotMatch(js, /import\(|three|pixi|lottie|<canvas/i);
    assert.doesNotMatch(css, /animation[^;]*(width|height|left|top)\b/, 'only transform and opacity animate');
});

test('loaded before spirit.js, cached by the service worker, mood saved without XP', () => {
    const ui = fs.readFileSync(path.join(root, 'apple-ui.js'), 'utf8');
    assert.match(ui, /'herb-tamagotchi-mount-fix\.js','cell-world\.js','herb-touch\.js','spirit\.js'/);
    const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
    assert.ok((sw.match(/"cell-world\.js", "cell-world\.css"/g) || []).length >= 2);
    const setMood = js.slice(js.indexOf('function setMood'), js.indexOf('function speak'));
    assert.match(setMood, /s\.cell\.mood = \{ v, ts: Date\.now\(\) \}/);
    assert.doesNotMatch(setMood, /award|xp/i);
    assert.match(js, /opts && opts\.crop\) return out/, 'wardrobe thumbnails stay cropped pieces');
});
