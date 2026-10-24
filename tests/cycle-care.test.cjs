'use strict';
/* Cycle care (Oct 24 2026, Emmanuel approved the cycle audit): the app responds to what she SAYS, never to the estimated phase.
   "How are you today?" (reuses the old cycle data keys), a gentle day she switches on herself (smaller Move goal, rest counts
   for Misty's energy with explicit fair-play caps, nothing lost), a calm world for today only, the recovered cycle settings
   (length, irregular, own phase, delete everything), who may turn tracking on, and the retired phase tips. */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const CC = require('../cycle-care-core.js'), Sun = require('../sun-meter.js'), CW = require('../cycle-world.js');
const html = R('index.html'), cw = R('cycle-world.js'), css = R('cycle-world.css'), audio = R('world-audio.js'), sw = R('sw.js');
const r3d = html.slice(html.indexOf('<script id="r3djs">'), html.indexOf('</script>', html.indexOf('<script id="r3djs">')));

test('the check-in: one tap per answer, written to the old cycle keys; all good and rather not say behave', () => {
    let d = CC.applyFeel(undefined, 'cramps');
    assert.deepStrictEqual(d.sym, ['cramps']); assert.ok(CC.notGreat(d)); assert.ok(CC.feelOn(d, 'cramps'));
    d = CC.applyFeel(d, 'strong'); assert.deepStrictEqual(d.sym, ['strong'], 'strong cramps replaces cramps');
    d = CC.applyFeel(d, 'tired'); assert.strictEqual(d.en, 'low');
    d = CC.applyFeel(d, 'low'); assert.strictEqual(d.mood, 'low');
    const kept = Object.assign({ p: 'med' }, d);
    let g = CC.applyFeel(kept, 'good');
    assert.strictEqual(g.mood, 'good'); assert.ok(!g.sym && !g.en, 'all good clears the not-great answers'); assert.strictEqual(g.p, 'med', 'the period flow stays');
    assert.ok(!CC.notGreat(g));
    g = CC.applyFeel(g, 'head'); assert.ok(!CC.feelOn(g, 'good'), 'a not-great answer clears all good'); assert.ok(CC.notGreat(g));
    let s = CC.applyFeel(g, 'skip'); assert.ok(s.ns && !s.sym && !s.mood && !s.en, 'rather not say clears every answer');
    assert.ok(!CC.notGreat(s), 'and never opens the gentle-day question');
    s = CC.applyFeel(s, 'skip'); assert.ok(!s.ns, 'tap again to undo');
    assert.ok(CC.feelOn(CC.applyFeel({}, 'crave'), 'crave')); assert.ok(!CC.feelOn(CC.applyFeel(CC.applyFeel({}, 'crave'), 'crave'), 'crave'), 'second tap removes it');
    const input = { sym: ['bloat'] }; CC.applyFeel(input, 'head'); assert.deepStrictEqual(input, { sym: ['bloat'] }, 'never mutates the stored day');
    assert.strictEqual(CC.FEELS.length, 8);
});

test('gentle day: only when she switches it on; goal sizes; rest once a day, today only, never re-granted', () => {
    const c = { days: {} }, k = '2026-10-24', now = new Date('2026-10-24T15:00:00').getTime();
    assert.deepStrictEqual(CC.energyInput(c, k), { moveGoal: 1, rest: false, gentle: false }, 'nothing changes without a gentle day');
    assert.strictEqual(CC.logRest(c, k, now), false, 'rest needs a gentle day');
    CC.setGentle(c, k, true);
    assert.strictEqual(CC.gentle(c, k).goal, 'tiny', 'starts with one short Move');
    assert.strictEqual(CC.energyInput(c, k).moveGoal, 0.25);
    CC.setGentle(c, k, true, 'half'); assert.strictEqual(CC.energyInput(c, k).moveGoal, 0.5);
    CC.setGentle(c, k, true, 'usual'); assert.strictEqual(CC.energyInput(c, k).moveGoal, 1);
    CC.setGentle(c, k, true, 'huge'); assert.strictEqual(CC.gentle(c, k).goal, 'usual', 'unknown sizes are ignored');
    assert.strictEqual(CC.logRest(c, '2026-10-23', now), false, 'no back-dating');
    assert.strictEqual(CC.logRest(c, k, now), true);
    assert.strictEqual(CC.logRest(c, k, now + 3600e3), false, 'once per day');
    assert.strictEqual(CC.energyInput(c, k).rest, true);
    CC.setGentle(c, k, false); assert.strictEqual(CC.energyInput(c, k).rest, false, 'off: rest no longer counts');
    CC.setGentle(c, k, true); assert.strictEqual(CC.logRest(c, k, now + 7200e3), false, 'off and on again grants nothing new');
    assert.strictEqual(CC.energyInput(c, k).rest, true, 'the one rest is still the one rest');
    assert.strictEqual(CC.energyInput(c, '2026-10-25').gentle, false, 'tomorrow is a normal day');
});

test('calm world: today only, only with a gentle day, ends with the gentle day', () => {
    const c = {}, k = '2026-10-24';
    CC.setGentle(c, k, true); CC.setCalm(c, k, true);
    assert.ok(CC.calmOn(c, k)); assert.ok(!CC.calmOn(c, '2026-10-25'), 'normal again tomorrow');
    CC.setCalm(c, k, false); assert.ok(!CC.calmOn(c, k));
    CC.setCalm(c, k, true); CC.setGentle(c, k, false); assert.ok(!CC.calmOn(c, k), 'ending the gentle day ends calm');
    assert.strictEqual(CC.CALM_SPEED, 0.5);
});

test('local days across the Oct 25 clock change, and pruning old records', () => {
    const prev = process.env.TZ; process.env.TZ = 'Europe/Berlin';
    try {
        assert.strictEqual(CC.dayKey(new Date('2026-10-25T00:30:00+02:00').getTime()), '2026-10-25');
        assert.strictEqual(CC.dayKey(new Date('2026-10-25T23:30:00+01:00').getTime()), '2026-10-25', 'the 25-hour day is one day');
        assert.strictEqual(CC.dayKey(new Date('2026-10-26T00:10:00+01:00').getTime()), '2026-10-26');
        assert.strictEqual(CC.daysBetween('2026-10-24', '2026-10-26'), 2);
        assert.strictEqual(CC.daysBetween('2026-03-28', '2026-03-30'), 2, 'spring change too');
        const c = {}; CC.setGentle(c, '2026-10-25', true);
        const late = new Date('2026-10-25T23:50:00+01:00').getTime();
        assert.strictEqual(CC.logRest(c, '2026-10-25', late), true, 'rest late on the long day still counts for that day');
        CC.setGentle(c, '2026-08-01', true); CC.setGentle(c, '2026-10-01', true);
        assert.strictEqual(CC.prune(c, '2026-10-26'), 1); assert.ok(!c.care.g['2026-08-01'] && c.care.g['2026-10-01']);
    } finally { if (prev === undefined) delete process.env.TZ; else process.env.TZ = prev; }
});

test('Misty energy: a gentle day can only help, rest counts as one Move goal, and it gives no XP or sunbeams', () => {
    const now = new Date('2026-10-24T15:00:00').getTime();
    const quarter = [{ ts: now - 6e4, amt: 1, src: 'move:est', mq: 1, label: 'walk' }];
    const base = { now, logs: [], ledger: [], water: 0 };
    const e0 = Sun.energy(base), eq = Sun.energy(Object.assign({}, base, { ledger: quarter }));
    const g = Sun.energy(Object.assign({}, base, { ledger: quarter, moveGoal: 0.25 }));
    assert.ok(g.value > eq.value, 'one short Move meets the gentle goal');
    const r = Sun.energy(Object.assign({}, base, { rest: true, moveGoal: 0.25 }));
    assert.ok(r.value > e0.value, 'rest gives energy'); assert.strictEqual(r.known.move, true); assert.strictEqual(r.rested, true);
    const full = Sun.energy(Object.assign({}, base, { ledger: [{ ts: now - 6e4, amt: 1, src: 'move', label: 'run' }] }));
    const fullRest = Sun.energy(Object.assign({}, base, { ledger: [{ ts: now - 6e4, amt: 1, src: 'move', label: 'run' }], rest: true }));
    assert.strictEqual(fullRest.value, full.value, 'rest never pushes past a full Move part');
    for (const goal of [0.25, 0.5, 1]) for (const rest of [false, true]) {
        const a = Sun.energy(Object.assign({}, base, { ledger: quarter })), b = Sun.energy(Object.assign({}, base, { ledger: quarter, moveGoal: goal, rest }));
        assert.ok(b.value >= a.value, 'never lower: goal ' + goal + ' rest ' + rest);
    }
    assert.doesNotMatch(cw + R('cycle-care-core.js'), /award\(|giveXP|addXP|ledger\.push|sunbeam\(/, 'no XP or ledger writes from cycle care');
    assert.match(R('sun-meter.js'), /moveGoal: ci\.moveGoal, rest: ci\.rest/, 'energyNow reads the gentle day');
    assert.match(R('sun-meter.js'), /L\.enabled\(\)/, 'only with cycle tracking on');
});

test('who may turn tracking on, and the not-relevant / delete paths', () => {
    assert.strictEqual(CC.canUse({ user: { gender: 'x' }, health: {} }), true);
    assert.strictEqual(CC.canUse({ user: {}, health: {} }), true);
    assert.strictEqual(CC.canUse({ user: { gender: 'm' }, health: {} }), false);
    assert.strictEqual(CC.canUse({ user: { gender: 'm' }, health: { cyc: { show: true } } }), true);
    for (const g of ['f', 'x', 'm', '']) assert.strictEqual(CC.canUse({ user: { gender: g }, health: {} }), CW.eligible({ user: { gender: g }, health: {} }), 'core and sheet agree: ' + g);
    assert.match(r3d, /data: \(\) => C\(\), save: \(\) => \{ persist\(\); try \{ refreshHome\(\); \} catch\(e\)\{\} \}, delAll\}/);
    assert.match(r3d, /async function delAll\(\)\{[\s\S]{0,400}s\.health\.cyc = \{v: 1, days: \{\}/, 'delete resets the whole cycle object (care data lives inside it)');
    assert.match(cw, /c\.na = 1; L\.setShow\(false\)/, 'not relevant turns it off without asking why');
    assert.match(cw, /if \(!delArm\) \{ delArm = Date\.now\(\)/, 'delete asks for a second tap');
    assert.match(cw, /c\.len = Math\.max\(21, Math\.min\(45,/, 'cycle length stays within 21 to 45 days');
    assert.match(cw, /if \(!c\.irregular\) c\.manual = ''/, 'leaving irregular drops the own phase');
    assert.match(r3d, /if \(c\.irregular && c\.manual && PH_KEYS\.includes\(c\.manual\)\) ph = c\.manual;/, 'the model uses her own phase when irregular');
});

test('estimated, not measured: the label, the wide guess and the dimmer ring', () => {
    assert.strictEqual(CC.certainty({ has: true, irregular: false, lateBy: 0 }), 'firm');
    assert.strictEqual(CC.certainty({ has: true, irregular: true, lateBy: 0 }), 'wide');
    assert.strictEqual(CC.certainty({ has: true, irregular: false, lateBy: 3 }), 'wide');
    assert.strictEqual(CC.certainty({ has: false }), 'none');
    for (const l of ['en', 'de', 'es']) for (const k of ['est', 'wide', 'feelT', 'gAsk', 'gOn', 'rest', 'calm', 'normal', 'setT', 'irr', 'na', 'del', 'delAgain', 'doc']) assert.ok(CW.strings[l][k], l + ' ' + k);
    assert.match(css, /\.cyh-ring\[data-wide\] \{ opacity: \.45; \}/);
    const all = JSON.stringify(CW.strings).toLowerCase();
    for (const w of ['hormon', 'estrogen', 'progest', 'östrogen', 'magnes', 'fertil', 'ovulat']) assert.ok(!all.includes(w), 'no medical claims: ' + w);
});

test('calm world runtime: never writes her speed, respects reduced motion, calls Misty home once, quieter sound', () => {
    assert.match(cw, /const SPEED_KEY = 'lowi\.world\.speed\.v1'/);
    assert.doesNotMatch(cw, /localStorage\.setItem\(SPEED_KEY/, 'her own speed is never overwritten');
    assert.match(cw, /if \(on && !rm\) \{ const cap = Math\.min\(userSpeed\(\)/, 'reduced motion: no speed change');
    assert.match(cw, /else if \(calmWas\) W\.LowiWorldSpeed = userSpeed\(\)/, 'switching back restores her speed');
    assert.match(cw, /P\.state\(\)\.pad === 'auto'\) P\.mode\(null\)/, 'autopilot stops so Misty stays close');
    assert.match(css, /html\.cc-calm \.bw3-stage::before, html\.cc-calm \.bw3-view::before, html\.cc-calm #bw3Back::before \{ opacity: 1; \}/);
    assert.match(audio, /function calm\(on\) \{/); assert.match(audio, /calm, get calmOn\(\)/);
    assert.match(audio, /C\.masterGain\(prefs\.vol\) \* calmK\(\)/, 'quieter, her volume setting untouched');
});

test('the old phase tips are retired: no unsourced hormone or nutrition text left, nothing reaches the old sheet', () => {
    for (const s of ['Hormones are at their lowest', 'Progesterone rises', 'Your strongest days for many', 'oily fish', 'Magnesium']) assert.ok(!r3d.includes(s), 'gone: ' + s);
    assert.match(r3d, /function phaseNow\(\)\{ return null; \}/);
    assert.match(r3d, /function cardHTML\(\)\{ return ""; \}/);
    assert.match(r3d, /function openSheet\(sec\)\{ if \(window\.LowiCycleWorld && LowiCycleWorld\.open\) \{ LowiCycleWorld\.open\(\); return; \}/);
    assert.match(r3d, /const CY_SYMTIP = \{\};/); assert.match(r3d, /const CY_PCOS = \[\];/);
    assert.match(html, /<script src="cycle-care-core\.js\?v=[^"]+"><\/script>\s*<script src="cycle-world\.js/, 'loads before My cycle');
    assert.match(sw, /cycle-care-core\.js/, 'cached offline');
});

test('nothing about cycles goes public: no push, community or post calls in cycle care', () => {
    assert.doesNotMatch(cw + R('cycle-care-core.js'), /pushSoon|sendPush|LowiPush|community|LowiCircle|postMessage\(|feed\.add|whatsNew/i);
});

test('companion name: cycle copy never hard-codes "Misty"; it uses her own companion name or a neutral "your companion"', () => {
    for (const l of Object.keys(CW.strings)) for (const [k, v] of Object.entries(CW.strings[l])) assert.ok(!/Misty/.test(String(v)), l + '.' + k + ' hard-codes Misty: ' + v);
    for (const k of ['gAskS', 'restDone', 'restS', 'calmS', 'irrS']) for (const l of ['en', 'de', 'es']) {
        const neutral = CW.text(k, l, ''), named = CW.text(k, l, 'Luna');
        assert.ok(!/[{}]/.test(neutral) && !/[{}]/.test(named), 'token left in ' + l + '.' + k + ': ' + neutral + ' / ' + named);
        assert.ok(/Luna/.test(named), l + '.' + k + ' should use her own name: ' + named);
        assert.ok(/companion|Begleiter|compañero/.test(neutral), l + '.' + k + ' should say your companion: ' + neutral);
    }
    assert.strictEqual(CW.text('restDone', 'en', ''), 'Rest counted for your companion today');
    assert.strictEqual(CW.text('restS', 'en', 'Luna'), 'Counts as today\u2019s Move for Luna\u2019s energy, once a day.');
    assert.strictEqual(CW.text('restS', 'en', 'Marcus'), 'Counts as today\u2019s Move for Marcus\u2019 energy, once a day.');
    assert.strictEqual(CW.text('calmS', 'de', ''), 'Weicheres Licht, eine langsamere Welt und leiserer Klang. Dein Begleiter bleibt in der Nähe.');
    assert.strictEqual(CW.text('calmS', 'es', 'Luna'), 'Luz más suave, un mundo más lento y un sonido más bajo. Luna se queda cerca.');
});
