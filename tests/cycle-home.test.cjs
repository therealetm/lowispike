/* Cycle on Home (Oct 24 2026, Emmanuel): "an information window alone isn't a real benefit". Two approved parts:
   1) with cycle tracking on, Misty's hold card (misty-hub.js) has a "Your cycle" section that opens My cycle. First planned as
      a long press on Gap; that gesture was taken (the last meal time editor) and Emmanuel moved it into Misty's card instead.
   2) a subtle ring on Misty's Home bubble in the estimated phase colour (Rest rose, Grow mint, Glow gold, Gather violet), only
      with tracking on, labelled for screen readers, no motion with reduced motion.
   Also: a period start entered 7 days ago is cycle day 8 (Emmanuel tested that), also across the October clock change. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = R('index.html'), cwJs = R('cycle-world.js'), cwCss = R('cycle-world.css'), lb = R('living-bubbles.js'), fe = R('fast-edit.js');

function loadCW() {
    const saved = globalThis.window; delete globalThis.window;
    delete require.cache[require.resolve('../cycle-world.js')];
    try { return require('../cycle-world.js'); } finally { if (saved !== undefined) globalThis.window = saved; }
}
const CW = loadCW();

/* LowiCycle's own date maths and model, out of index.html, run with a fixed today */
function cycleAt(todayIso, tz) {
    const a = html.indexOf('const pad = n => String(n).padStart(2, "0");', html.indexOf('cycle stage 1') - 40000);
    const pre = html.slice(a, html.indexOf('/* ---------- data ---------- */', a));
    const dataEnd = html.indexOf('const PH_KEYS = [', a);
    const data = html.slice(html.indexOf('/* ---------- data ---------- */', a), dataEnd);
    assert.ok(a > 0 && pre.includes('const diff = ') && data.includes('function model(){') && data.includes('function markStart('), 'found the cycle maths');
    const prevTZ = process.env.TZ; if (tz) process.env.TZ = tz;
    const RealDate = Date, fixed = new RealDate(todayIso).getTime();
    class FakeDate extends RealDate { constructor(...x) { if (x.length) super(...x); else super(fixed); } static now() { return fixed; } }
    const S = { user: { gender: 'f' }, health: {} };
    const box = { Date: FakeDate, Math, Object, JSON, String, Number, Array, S, save() { }, toast() { }, award() { return 0; }, L: () => 0, tr: a => a[0],
        pushSoon() { }, giveLogXP() { }, paint() { }, refreshHome() { }, setTimeout() { }, console };
    vm.createContext(box);
    vm.runInContext(pre.replace(/^const (\w+) = /gm, 'var $1 = ') + '\n' + data + '\nthis.api = {markStart, model, starts, setShow, enabled};', box);
    const done = () => { if (tz) { if (prevTZ === undefined) delete process.env.TZ; else process.env.TZ = prevTZ; } };
    return { api: box.api, done };
}

test('a period start entered 7 days earlier is cycle day 8, not day 10, also when moved with "started another day"', () => {
    let c = cycleAt('2026-10-24T09:14:00', 'Europe/Berlin');
    try {
        c.api.setShow(true);
        assert.strictEqual(c.api.markStart('2026-10-17'), true);
        const m = c.api.model();
        assert.strictEqual(m.day, 8, 'Oct 17 -> Oct 24 is day 8');
        assert.strictEqual(m.ph, 'follicular', 'day 8 of 28 is Grow');
    } finally { c.done(); }
    c = cycleAt('2026-10-24T23:30:00', 'Europe/Berlin');
    try {
        c.api.setShow(true);
        c.api.markStart('2026-10-24');               /* tapped "started today" first */
        c.api.markStart('2026-10-17', true);         /* then fixed it to 7 days earlier */
        assert.strictEqual(JSON.stringify(c.api.starts()), '["2026-10-17"]', 'the wrong date is moved, not kept as a second start');
        assert.strictEqual(c.api.model().day, 8);
    } finally { c.done(); }
    c = cycleAt('2026-10-26T00:20:00', 'Europe/Berlin');   /* the clocks went back on Oct 25 */
    try { c.api.setShow(true); c.api.markStart('2026-10-19'); assert.strictEqual(c.api.model().day, 8, 'across the clock change'); } finally { c.done(); }
});

test('the Home ring: estimated phase colour and a screen reader label, only when tracking is on', () => {
    assert.strictEqual(typeof CW.homeRing, 'function');
    assert.strictEqual(CW.homeRing({ ph: 'follicular', day: 8 }, false, 'en'), null, 'tracking off: no ring');
    assert.strictEqual(CW.homeRing({ ph: '' }, true, 'en'), null, 'no first day yet: no ring');
    assert.strictEqual(CW.homeRing(null, true, 'en'), null);
    const want = { menstrual: 'rest', follicular: 'grow', ovulation: 'glow', luteal: 'gather' };
    for (const ph of Object.keys(want)) assert.strictEqual(CW.homeRing({ ph }, true, 'en').id, want[ph], ph);
    assert.strictEqual(CW.homeRing({ ph: 'follicular' }, true, 'en').label, 'Estimated cycle phase: Grow');
    assert.strictEqual(CW.homeRing({ ph: 'menstrual' }, true, 'de').label, 'Geschätzte Zyklusphase: Ruhen');
    assert.strictEqual(CW.homeRing({ ph: 'luteal' }, true, 'es').label, 'Fase estimada del ciclo: Juntarse');
    /* colours: rose, mint, gold, violet, the cell world's own */
    for (const id of ['rest', 'grow', 'glow', 'gather']) assert.ok(new RegExp('\\.cyh-ring\\[data-ph="' + id + '"\\][^}]*var\\(--cw-' + id + '\\)').test(cwCss), id + ' colour');
    assert.match(cwCss, /\.cyh-ring \{[^}]*pointer-events: none/, 'never catches a touch meant for Misty');
    assert.match(cwCss, /@media \(prefers-reduced-motion: reduce\) \{[^@]*\.cyh-ring \{[^}]*transition: none/, 'reduced motion: no fade');
    assert.ok(cwJs.includes("ring.setAttribute('aria-hidden', 'true')") && cwJs.includes('aria-describedby'), 'the ring is decoration; the bubble gets the phase as its description');
    assert.ok(/function paintRing\(\)[\s\S]*?el\.dataset\.cyh === key/.test(cwJs), 'writes to the page only when the phase changes');
});

test('the way in is a section in Misty\'s hold card (tracking on only); no new gesture, the Gap long press is untouched', () => {
    assert.strictEqual(typeof CW.hubHtml, 'function');
    assert.strictEqual(CW.hubHtml(), '', 'no tracking (no LowiCycle here): nothing in Misty\'s card');
    assert.ok(/function hubHtml\(\) \{\s*if \(!enabled\(\)\) return '';/.test(cwJs), 'only with tracking on');
    assert.ok(/function hubOpen\(\) \{\s*if \(!enabled\(\)\) return false;/.test(cwJs));
    assert.ok(cwJs.includes('data-mh="cycle"'), 'the section is a button in Misty\'s card');
    const hub = R('misty-hub.js');
    const html = hub.slice(hub.indexOf('doorsHtml() + secHtml()'), hub.indexOf('scaleHtml() +'));
    assert.ok(html.indexOf('doorsHtml()') === 0 && html.indexOf('cycleHtml()') > 0, 'right under her doors');
    assert.ok(/k === 'cycle'\) \{[^}]*hubOpen\(\)/.test(hub), 'tapping it opens My cycle');
    for (const l of ['en', 'de', 'es']) assert.ok(CW.strings[l].hubOpen && CW.strings[l].ringL, l);
    /* Emmanuel, Oct 24: "rather than being its own separate trigger": no Gap long press for the cycle */
    assert.ok(!/LowiCycleWorld/.test(lb) && !/LowiCycleWorld/.test(fe), 'living-bubbles / fast-edit (the Gap long press) do not know the cycle');
    assert.ok(!/gapHold/.test(cwJs));
});

test('discreet: no push, no Community post, no announcement for the cycle on Home', () => {
    const add = cwJs.slice(cwJs.indexOf('/* ---------- Home (Oct 24 2026)'));
    assert.ok(add.length > 100, 'Home section found');
    for (const w of ['Notification', 'showNotification', 'LowiCommunity', 'toast(', 'LowiNews', 'speak(']) assert.ok(!add.includes(w), 'no ' + w);
});
