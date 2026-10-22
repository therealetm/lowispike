// Oct 22 2026 (Emmanuel: "every cell world should be named. When they enter they should know where they entered").
// Every cell world has its own name in EN/DE/ES, an entry banner shows it when you pass in (auto-fades, no taps),
// and a small pill keeps it named while you are inside.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const R = require(path.join(root, 'body-world-regions.js'));
const src = fs.readFileSync(path.join(root, 'body-world-regions.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'body-world-regions.css'), 'utf8');
const STAGES = (() => { try { const m = require(path.join(root, 'world-home-core.js')); return m.STAGES || (m.API && m.API.STAGES) || []; } catch (e) { return []; } })();

test('every world (bloodstream + seven places) has a name and a tagline in EN, DE and ES', () => {
    const all = [R.HUB].concat(R.REGIONS);
    assert.strictEqual(all.length, 8);
    for (const w of all) {
        assert.ok(Array.isArray(w.w) && w.w.length === 3 && w.w.every(x => typeof x === 'string' && x.trim().length >= 3), w.id + ' name');
        assert.ok(Array.isArray(w.t) && w.t.length === 3 && w.t.every(x => typeof x === 'string' && x.length > 10 && x.length <= 60), w.id + ' tagline');
        assert.notStrictEqual(w.w[0], w.n[0], w.id + ': a world name, not just the body part');
    }
});

test('world names are unique per language and do not reuse the level names', () => {
    const all = [R.HUB].concat(R.REGIONS);
    for (let i = 0; i < 3; i++) { const names = all.map(w => w.w[i].toLowerCase()); assert.strictEqual(new Set(names).size, names.length, 'unique in language ' + i); }
    const levels = new Set([].concat(...STAGES.map(s => (s.n || []).map(x => x.toLowerCase()))));
    for (const w of all) for (const n of w.w) assert.ok(!levels.has(n.toLowerCase()), n + ' is a level name');
});

test('worldName() reads the right language and falls back to English', () => {
    assert.strictEqual(R.worldName('pancreas', 'en'), 'Insulin Island');
    assert.strictEqual(R.worldName('liver', 'de'), 'Zuckertresor');
    assert.strictEqual(R.worldName('blood', 'es'), 'Río Rubí');
    assert.strictEqual(R.worldName('muscles', 'fr'), 'Fuel Forge');
    assert.strictEqual(R.worldName('nowhere', 'en'), '');
});

test('entering a new world shows the banner first, then the line; quiet arrivals show nothing', () => {
    assert.match(src, /if \(!quiet\) \{ if \(id !== prev\) \{ banner\(id\);/);
    assert.match(src, /setTimeout\(\(\) => \{ if \(st\.cur === id\) say\(id\); \}, ENTER_MS - 300\)/);
    assert.ok(R.ENTER_MS >= 1800 && R.ENTER_MS <= 4000, 'brief, auto-dismissing');
    assert.match(src, /st\.bt = setTimeout\(\(\) => \{ if \(st\.banner\) st\.banner\.classList\.remove\('on'\); \}, ENTER_MS\)/);
});

test('banner and where-pill never take a tap and have day and night styles', () => {
    const rule = sel => (css.match(new RegExp('\\' + sel + '\\{[^}]*\\}')) || [''])[0];
    assert.match(rule('.bwr-enter'), /pointer-events:none/);
    assert.match(rule('.bwr-where'), /pointer-events:none/);
    assert.doesNotMatch(css, /\.bwr-enter\.on\{[^}]*pointer-events:auto/);
    assert.match(css, /html\[data-theme="light"\] \.bwr-enter/);
    assert.match(css, /html\[data-theme="light"\] \.bwr-where/);
    assert.match(css, /\.bw3-full \.bwr-where\{display:none\}/, 'the full view names the world in its header instead');
});

test('clean view inside a world keeps the banner and the pill (data-clean-keep)', () => {
    assert.match(src, /b\.id = 'bwrEnter'; b\.dataset\.cleanKeep = '1';/);
    assert.match(src, /where\.id = 'bwrWhere'; where\.dataset\.cleanKeep = '1';/);
    const CC = fs.readFileSync(path.join(root, 'clean-view-core.js'), 'utf8');
    assert.match(CC, /:not\(\[data-clean-keep\]\)/);
});

test('the header, the pill, the map and the arrival line all use the world name', () => {
    assert.match(src, /t\.textContent = st\.cur === 'hub' \? t\.dataset\.hubTitle : pick\(cur\.w, l\)/);
    assert.match(src, /st\.where\.innerHTML = inside \? '<i aria-hidden="true"><\/i>' \+ esc\(pick\(cur\.w, l\)\)/);
    assert.match(src, /esc\(pick\(R\.w, l\)\) \+ '<small>' \+ esc\(pick\(R\.n, l\)\)/);
    assert.match(src, /LowiArrival\.note\(pick\(R\.w, l\)/);
});
