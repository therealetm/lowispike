// Seasonal themes: the world changes look with the season, automatically by date (no setting), one WebGL context.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const C = require('../season-core.js');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const js = read('season.js'), css = read('season.css'), loader = read('apple-ui.js'), sw = read('sw.js');
const at = (y, m, d) => new Date(y, m - 1, d, 12).getTime();
const BERLIN = { tz: 'Europe/Berlin' };

test('northern seasons switch on the right local days', () => {
    const cases = [[2026, 3, 19, 'winter'], [2026, 3, 20, 'spring'], [2026, 6, 20, 'spring'], [2026, 6, 21, 'summer'], [2026, 9, 21, 'summer'],
        [2026, 9, 22, 'autumn'], [2026, 10, 15, 'autumn'], [2026, 12, 20, 'autumn'], [2026, 12, 21, 'winter'], [2027, 1, 10, 'winter'], [2026, 1, 1, 'winter']];
    for (const [y, m, d, s] of cases) assert.strictEqual(C.season(at(y, m, d), BERLIN).id, s, y + '-' + m + '-' + d);
});

test('today (Oct 15, 2026 in Flensburg) is autumn, in its golden early phase', () => {
    const s = C.season(at(2026, 10, 15), BERLIN);
    assert.strictEqual(s.id, 'autumn'); assert.strictEqual(s.phase, 'early');
    assert.strictEqual(C.season(at(2026, 11, 5), BERLIN).phase, 'peak');
    assert.strictEqual(s.from, '2026-09-22'); assert.strictEqual(s.to, '2026-12-21');
    assert.deepStrictEqual(s.name, ['Autumn', 'Herbst', 'Otoño']); assert.strictEqual(s.mote, 'leaf');
    assert.strictEqual(C.season(at(2026, 9, 25), BERLIN).phase, 'early');
    assert.strictEqual(C.season(at(2026, 11, 28), BERLIN).phase, 'late');
});

test('winter wraps over new year with a correct span', () => {
    const s = C.season(at(2027, 2, 1), BERLIN);
    assert.strictEqual(s.id, 'winter'); assert.strictEqual(s.from, '2026-12-21'); assert.strictEqual(s.to, '2027-03-20');
    const s2 = C.season(at(2026, 12, 30), BERLIN);
    assert.strictEqual(s2.from, '2026-12-21'); assert.strictEqual(s2.to, '2027-03-20'); assert.strictEqual(s2.phase, 'early');
});

test('southern hemisphere time zones get the opposite season', () => {
    assert.ok(C.southern('Australia/Sydney')); assert.ok(C.southern('America/Argentina/Buenos_Aires')); assert.ok(C.southern('Pacific/Auckland'));
    assert.ok(!C.southern('Europe/Berlin')); assert.ok(!C.southern('America/New_York')); assert.ok(!C.southern(''));
    assert.strictEqual(C.season(at(2026, 10, 15), { tz: 'Australia/Sydney' }).id, 'spring');
    assert.strictEqual(C.season(at(2026, 7, 1), { tz: 'America/Sao_Paulo' }).id, 'winter');
});

test('force previews a season (dev ?season=) without touching the date logic', () => {
    const s = C.season(at(2026, 10, 15), { tz: 'Europe/Berlin', force: 'winter', phase: 'late' });
    assert.strictEqual(s.id, 'winter'); assert.strictEqual(s.phase, 'late'); assert.strictEqual(s.key, 'winter:late');
    assert.strictEqual(C.season(at(2026, 10, 15), { tz: 'Europe/Berlin', force: 'nope' }).id, 'autumn');
});

test('every season has a dark (Night) and light (Cloud) look with gold kept as the shared glow', () => {
    for (const id of C.ORDER) for (const th of ['dark', 'light']) {
        const L = C.look({ id, phase: 'peak' }, th);
        assert.strictEqual(L.theme, th); assert.ok(/^#[0-9a-f]{6}$/i.test(L.haze), id + th);
        assert.ok(L.amt > 0 && L.amt <= 0.3, 'haze stays a tint ' + id + th);
        assert.ok(L.motes.length >= 3 && L.motes.every(c => /^#[0-9a-f]{6}$/i.test(c)));
        assert.ok([L.a, L.b, L.c].every(c => /^#[0-9a-f]{6}$/i.test(c)));
    }
    for (const id of C.ORDER) { const d = C.look(id, 'dark'); assert.ok([d.a, d.b, ...d.motes].includes('#f4cd7e'), id + ' keeps gold'); }
    assert.notStrictEqual(C.look({ id: 'autumn', phase: 'late' }, 'dark').haze, C.look({ id: 'autumn', phase: 'peak' }, 'dark').haze, 'late autumn turns misty');
    assert.strictEqual(C.look('weird', 'dark').id, 'autumn');
});

test('particles stay few: <= 10 DOM, none with reduced motion, fewer when it rains', () => {
    assert.strictEqual(C.counts({ w: 390 }).dom, 7); assert.strictEqual(C.counts({ w: 1180 }).dom, 10);
    assert.strictEqual(C.counts({ w: 390, reduced: true }).dom, 0);
    assert.ok(C.counts({ w: 390, wet: true }).dom < 7); assert.ok(C.counts({ w: 1180, phase: 'late' }).dom < 10);
    assert.ok(C.counts({ w: 1180 }).motes <= 80);
    const p = C.particles(7, 3); assert.strictEqual(p.length, 7);
    assert.deepStrictEqual(p, C.particles(7, 3), 'deterministic');
    for (const q of p) { assert.ok(q.x >= 0 && q.x <= 100); assert.ok(q.dur >= 15 && q.dur <= 26); assert.ok(q.delay <= 0); }
    assert.strictEqual(C.mix('#000000', '#ffffff', 0.5), '#808080');
});

test('season.js: automatic, no setting, no second WebGL context, stays out of regions and rides', () => {
    assert.ok(js.includes('H.dataset.season = s.id') && js.includes('H.dataset.seasonPhase'));
    assert.ok(!/getContext\(\s*['"](webgl|webgl2|experimental-webgl)/.test(js), 'no own WebGL context');
    assert.ok(!/WebGLRenderer|import\(/.test(js), 'no own renderer or three.js load');
    assert.ok(js.includes('LowiWorld3D') && js.includes('onFrame'), 'uses the shared world');
    assert.ok(js.includes('if (inRegion(a)) return;'), 'regions keep their own look');
    assert.ok(!js.includes('LowiRide'), 'the cell ride is gone');
    assert.ok(!/localStorage\.setItem/.test(js), 'nothing to store, nothing to set');
    assert.ok(js.includes("setAttribute('aria-hidden', 'true')"));
    assert.ok(js.includes("'season.css'"), 'loads its own css');
});

test('season.css: no touches, transforms/opacity only, reduced motion holds still, every surface tinted', () => {
    assert.ok(/#ssnSky\s*\{[^}]*pointer-events:\s*none/.test(css));
    for (const sel of ['.cw-env::after', '.bw3-stage::after', '.cr-scene::before', '#ssnSky .ssn-wash']) assert.ok(css.includes(sel), sel);
    for (const id of ['spring', 'summer', 'autumn', 'winter']) {
        assert.ok(css.includes('html[data-season=' + id + '] #ssnSky .ssn-wash'), id + ' wash');
        assert.ok(css.includes('html[data-theme=light][data-season=' + id + '] #ssnSky .ssn-wash'), id + ' light wash');
    }
    const kf = css.match(/@keyframes[\s\S]*?\n\}/g) || [];
    assert.ok(kf.length >= 2); for (const k of kf) assert.ok(!/\b(top|left|width|height|margin)\s*:/.test(k), 'keyframes animate transform/opacity only');
    assert.ok(/prefers-reduced-motion:\s*reduce\)\s*\{[^@]*#ssnSky \.ssn-p \{ display: none \}/.test(css));
});

test('loader and service worker carry the season files after the cell ride', () => {
    const files = loader.match(/const files=\[([^\]]*)\]/)[1];
    const i = files.indexOf("'inside-row.js'"), a = files.indexOf("'season-core.js'"), b = files.indexOf("'season.js'");
    assert.ok(i >= 0 && a > i && b > a, 'season-core.js then season.js after inside-row.js');
    assert.ok(!files.includes("'season.css'"), 'season.css loads itself');
    const lines = sw.split('\n').filter(l => l.includes('"inside-row.js"'));
    assert.strictEqual(lines.length, 2);
    for (const l of lines) for (const f of ['season-core.js', 'season.js', 'season.css']) assert.ok(l.includes('"' + f + '"'), f);
});
