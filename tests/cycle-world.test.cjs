/* Cycle tracking, stage 1 (Oct 23 2026, rebuilt from the previous Maya's notes; her branch never reached GitHub).
   Only for women, opt-in during setup, off for everyone else. Phases are a cell world (no weather, no seasons).
   Log the first day of a period, see the phase. Gentle, no medical claims, data in S.health.cyc like the other private logs. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = R('index.html'), sw = R('sw.js'), js = R('cycle-world.js'), css = R('cycle-world.css');

function load() {
    const saved = globalThis.window; delete globalThis.window;
    delete require.cache[require.resolve('../cycle-world.js')];
    try { return require('../cycle-world.js'); } finally { if (saved !== undefined) globalThis.window = saved; }
}
const CW = load();
const r3d = (() => { const a = html.indexOf('<script id="r3djs">'); return html.slice(a, html.indexOf('</script>', a)); })();

test('the new files load with the build tag and are cached offline', () => {
    for (const f of ['cycle-world.js', 'cycle-world.css']) {
        assert.ok(new RegExp(f.replace('.', '\\.') + '\\?v=\\d{8}-\\d{6}').test(html), f + ' is loaded by index.html');
        assert.ok(sw.includes('"' + f + '"'), f + ' is in the service worker list');
    }
});

test('only women can have it: men, prefer-not-to-say and unknown never do, even with old data', () => {
    const st = (gender, cyc, cycleOn) => ({ user: { gender }, health: Object.assign({ cyc }, cycleOn ? { cycleOn: true } : {}) });
    assert.strictEqual(CW.eligible(st('f')), true);
    for (const g of ['m', 'x', '', undefined]) {
        assert.strictEqual(CW.eligible(st(g)), false, String(g));
        assert.strictEqual(CW.rule(st(g, { show: true, setup: true, days: { '2026-10-01': { p: 'med' } } }, true)), false, String(g) + ' stays off even with old cycle data');
    }
});

test('opt-in: a woman who said nothing has it off; yes turns it on, no keeps it off; existing trackers keep it', () => {
    const f = cyc => ({ user: { gender: 'f' }, health: { cyc } });
    assert.strictEqual(CW.rule(f(undefined)), false, 'never asked: off');
    assert.strictEqual(CW.rule(f({ show: null, days: {} })), false, 'no answer: off');
    assert.strictEqual(CW.rule(f({ show: true, days: {} })), true, 'said yes');
    assert.strictEqual(CW.rule(f({ show: false, setup: true, days: {} })), false, 'said no');
    assert.strictEqual(CW.rule(f({ show: null, setup: true, days: {} })), true, 'already tracking before the opt-in existed');
    assert.strictEqual(CW.rule(f({ show: null, days: { '2026-10-01': { p: 'med' } } })), true, 'has a logged period');
});

test('the four phases are a cell world: rest, grow, glow, gather; never weather or seasons', () => {
    assert.deepStrictEqual(['menstrual', 'follicular', 'ovulation', 'luteal'].map(p => CW.cellOf(p).id), ['rest', 'grow', 'glow', 'gather']);
    assert.strictEqual(CW.cellOf('nonsense'), null);
    for (const lang of ['en', 'de', 'es']) for (const p of ['menstrual', 'follicular', 'ovulation', 'luteal']) {
        const c = CW.cellOf(p, lang);
        assert.ok(c.name && c.plain && c.line, lang + ' ' + p + ' has a name, a plain phase name and a line');
    }
    const words = JSON.stringify(CW.strings).toLowerCase();
    for (const w of ['season', 'weather', 'winter', 'summer', 'spring', 'autumn', 'sunny', 'rain', 'jahreszeit', 'wetter', 'sommer', 'frühling', 'herbst', 'estación', 'invierno', 'verano', 'otoño', 'clima'])
        assert.ok(!words.includes(w), 'no ' + w);
});

test('gentle and non-clinical: no hormones, fertility or diagnosis talk, and it says it is a rough guide', () => {
    const words = JSON.stringify(CW.strings).toLowerCase();
    for (const w of ['estrogen', 'östrogen', 'estrógeno', 'progesteron', 'hormon', 'fertil', 'ovulat', 'eisprung', 'ovulación', 'diagnos', 'pregnan', 'schwanger', 'embaraz', 'contracept', 'verhütung'])
        assert.ok(!words.includes(w), 'no ' + w);
    for (const lang of ['en', 'de', 'es']) assert.ok(CW.strings[lang].hedge.length > 20, lang + ' has the rough-guide line');
});

test('the scene draws the current cell big and lit, the others small, and shows the day', () => {
    const svg = CW.scene({ ph: 'follicular', day: 9, len: 28, has: true });
    assert.match(svg, /class="cw-svg cw-grow"/);
    assert.match(svg, /data-cell="grow"[^>]*class="cw-mini on"|class="cw-mini on"[^>]*data-cell="grow"/);
    assert.strictEqual((svg.match(/class="cw-mini( on)?"/g) || []).length, 4, 'four phase cells on the track');
    assert.strictEqual((svg.match(/cw-mini on/g) || []).length, 1, 'one is lit');
    const none = CW.scene({ has: false });
    assert.match(none, /cw-svg cw-none/, 'no start logged yet: a quiet waiting cell');
});

test('setup asks women only, after "I am", and the answer is saved through LowiCycle.setShow', () => {
    assert.match(html, /ob\.gender === "f" \? '<div class="r2-obsub r2-cyq">Track your cycle\?/, 'the question only renders for A woman');
    assert.ok(html.includes('[["1", "Yes, track it", true], ["0", "No thanks", false]]') && html.includes('data-r2cy="'), 'Yes and No thanks');
    assert.match(html, /closest\("\[data-r2cy\]"\)/, 'tapping an answer is handled');
    assert.match(html, /if \(ob\.gender !== "f"\) \{ ob\.pcos = false; ob\.cycle = null; \}/, 'switching away from A woman drops the answer');
    assert.match(html, /if \(ob\.gender === "f" && ob\.cycle !== null && window\.LowiCycle && LowiCycle\.setShow\) LowiCycle\.setShow\(ob\.cycle\)/, 'saved on the cycle data');
    assert.match(html, /cycle: \(s\.health && s\.health\.cyc && typeof s\.health\.cyc\.show === "boolean"\) \? s\.health\.cyc\.show : null/, 'a returning woman sees her earlier answer');
});

test('the cycle module is off for everyone but opted-in women, and its tips stop too', () => {
    assert.match(r3d, /function enabled\(\)\{ const c = C\(\); if \(!c \|\| !isFem\(\)\) return false;/);
    assert.match(r3d, /setShow\(v\)/, 'LowiCycle.setShow exists for setup');
    assert.match(r3d, /markStart/, 'LowiCycle.markStart logs a first day');
    assert.match(r3d, /if \(!enabled\(\)\) return \{on: false/, 'no cycle tips or quests when off');
    assert.match(r3d, /function profHTML\(\)\{ if \(!isFem\(\)\) return '<span id="cyProf" hidden><\/span>';/, 'no Profile row for anyone else');
});

test('the profile hub gets a My cycle tile right after Your details, only when it is on', () => {
    const m = html.match(/const GRID = (\[[^\]]*\])/); const grid = JSON.parse(m[1]);
    assert.deepStrictEqual(grid.slice(0, 2), ['details', 'cycle']);
    assert.match(html, /k === "cycle" \? cyOn\(\)/);
    assert.match(html, /k === "cycle" \? 'data-cw="open"'/);
    assert.match(js, /closest\('\[data-cw="open"\]'\)/, 'the tile opens the cell world');
});

test('the panel uses the shared sheet (one-sheet glass) and logs through LowiCycle', () => {
    assert.match(js, /R2\.sheet\('<div class="cw" id="cwSheet" data-noi18n><\/div>', \{ cls: 'cw-ov one-sheet'/);
    assert.match(js, /const C = \(\) => W\.LowiCycle/);
    assert.match(js, /L\.markStart\(todayK\(\)\)/, 'started today');
    assert.match(js, /L\.markStart\(v, /, 'another day, moving a wrong date');
    assert.match(js, /L\.setShow\(false\)/, 'she can turn it off from the panel');
    assert.match(css, /prefers-reduced-motion/, 'calm motion setting is respected');
});
