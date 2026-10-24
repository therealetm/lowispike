// Oct 24 2026, Emmanuel with six screenshots of Fastic's Body status: "similar to Fastic, but everything bezüglich lowering insulin
// spike after a meal" and "their picture is a lil animation btw". The Gap card now opens with an "After your meal" strip: five round
// phases on a line from the logged last meal, the current one glows, a small animated card per phase with a typical-time pill, two
// short hedged sentences and one lever that lowers the spike. These tests keep the times, the hedging, the sources and the wiring.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'gap-view.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'gap-view.css'), 'utf8');
const G = require(path.join(root, 'gap-view.js'));

test('five phases, in order, starting at the meal: rise, peak, insulin, baseline, insulin low', () => {
    assert.deepStrictEqual(G.phases.map(p => p.id), ['rise', 'peak', 'insulin', 'base', 'low']);
    assert.deepStrictEqual(G.phases.map(p => p.m), [0, 30, 60, 120, 240]);
});

test('the clock picks the phase: none without a meal, then each from its typical start', () => {
    assert.strictEqual(G.curvePhase(null), -1);
    assert.strictEqual(G.curvePhase(NaN), -1);
    const at = [[0, 0], [12, 0], [29.9, 0], [30, 1], [59, 1], [60, 2], [119, 2], [120, 3], [239, 3], [240, 4], [900, 4]];
    for (const [min, k] of at) assert.strictEqual(G.curvePhase(min), k, min + ' min');
});

test('every phase has a title, a time pill, a text and a lever in English, German and Spanish', () => {
    for (const p of G.phases) for (const f of ['n', 'p', 't', 'l']) {
        assert.strictEqual(p[f].length, 3, p.id + '.' + f);
        p[f].forEach((v, i) => assert.ok(typeof v === 'string' && v.trim().length > 1, p.id + '.' + f + '[' + i + ']'));
    }
    for (const k of ['mcH', 'mcTyp', 'mcLever', 'mcMove', 'mcRow', 'mcPrev', 'mcNext'])
        for (const l of ['en', 'de', 'es']) assert.ok(G.strings[l][k], l + '.' + k);
});

test('times and effects are hedged as typical, never a reading or a promise', () => {
    const pills = G.phases.slice(1).map(p => p.p[0]);
    pills.forEach(v => assert.ok(/^(About|From about) /.test(v), 'pill hedged: ' + v));
    assert.ok(/many people/.test(G.phases[1].t[0]) && /Bei vielen/.test(G.phases[1].t[1]) && /muchas personas/.test(G.phases[1].t[2]), 'the peak is for many people');
    assert.ok(/without diabetes/.test(G.phases[3].t[0]) && /usually/.test(G.phases[3].t[0]), 'baseline: people without diabetes, usually');
    assert.ok(/Typical, not measured/.test(G.strings.en.mcTyp), 'the strip says it is typical, not measured');
});

test('no invented effects and nothing about insulin dosing', () => {
    const all = G.phases.flatMap(p => [...p.n, ...p.p, ...p.t, ...p.l]).join(' ');
    for (const bad of [/brain/i, /Gehirn/i, /cerebro/i, /autophag/i, /ketos/i, /ketone/i, /dose|dosis|dosier/i, /\bunits?\b|Einheit|unidades/i, /burns? fat|Fett verbrenn|quema grasa/i, /detox|entgift/i, /cure|heilt|cura\b/i])
        assert.ok(!bad.test(all), 'no claim matching ' + bad);
});

test('each statement keeps its source in the code', () => {
    for (const ref of ['Freckmann', 'Shukla', 'Buffey', 'Reynolds', 'Richter', 'OpenStax'])
        assert.ok(src.includes(ref), 'cites ' + ref);
});

test('the strip renders: the current phase glows, the picked one opens, Move only on a walk phase that is now', () => {
    const html = G._curve({ mcCur: 1 });
    assert.strictEqual((html.match(/class="mc-ph/g) || []).length, 5, 'five round phases');
    assert.strictEqual((html.match(/class="mc-link/g) || []).length, 4, 'joined by four links');
    assert.ok(/class="mc-ph sel now" data-gv="mc" data-i="1"/.test(html), 'the peak is current and open');
    assert.ok(/data-gv="move"/.test(html), 'the walk lever links to Move while the peak is now');
    assert.ok(/aria-pressed="true"/.test(html) && /aria-label="Peak, About 30–60 min after eating, Now"/.test(html), 'screen readers hear the phase, its time and Now');
    assert.ok(/<b>around 30 to 60 minutes<\/b>/.test(html), 'the key words are bold');
    const none = G._curve({ mcCur: -1 });
    assert.ok(/class="mc-ph sel" data-gv="mc" data-i="0"/.test(none) && !/ now"/.test(none), 'no meal: the first phase is open, none is current');
    assert.ok(!/data-gv="move"/.test(none), 'no Move link without a current walk phase');
    const late = G._curve({ mcCur: 4 });
    assert.ok(!/data-gv="move"/.test(late) && /class="mc-link lit"/.test(late), 'later in the gap: the trail is lit, no Move link');
});

test('the Gap card leads with the strip and only shows the hexagon Now card after the after-meal window', () => {
    const body = src.slice(src.indexOf('function body('), src.indexOf('function open('));
    assert.ok(/curve\(m\) \+\s*\(curM && m\.hours >= MC_WIN/.test(body), 'strip first, the old Now card from 4 h on');
    assert.ok(/curve\(m\) \+ markers\(m\)/.test(body), 'also shown before any meal is logged');
    const open = src.slice(src.indexOf('function open('), src.indexOf('function close('));
    assert.ok(/mcSel = -1/.test(open) && /mcSwipe\(el\)/.test(open), 'opens on the current phase, with the sideways swipe wired');
});

test('the animation is small, transform and opacity only, and off with reduced motion', () => {
    const kf = css.match(/@keyframes mc\w+ \{[^@]*?\} \}/g) || [];
    assert.ok(kf.length >= 5, 'mc keyframes exist');
    kf.forEach(k => assert.ok(!/(width|height|top|left|filter|box-shadow)\s*:/.test(k.replace(/^@keyframes mc\w+ \{/, '')), 'only transform and opacity: ' + k.slice(0, 30)));
    const rm = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    assert.ok(/\.mc-motif \*/.test(rm) && /\.mc-card/.test(rm) && /animation: none/.test(rm), 'reduced motion stops the strip');
    assert.ok(/\.mc-card \{[^}]*touch-action: pan-y/.test(css), 'sideways swipes reach the card, vertical scroll stays');
});
