'use strict';
// Oct 24 2026 (Emmanuel: "if you find a bug and you fix it, don't send out an update notification that annoys the people. They
// don't need to know that."): scripts/release.sh --quiet ships a silent bug fix: no "New version" ask, no "Update loaded",
// no What's New. version.json "loud" = the newest build that announces itself.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const root = path.join(__dirname, '..');
const { applyBump } = require('../scripts/bump-build.cjs');

function fixture(id, extra) {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'lowi-quiet-'));
    fs.writeFileSync(path.join(d, 'index.html'), '<meta name="lowi-build" content="' + id + '">\n');
    fs.writeFileSync(path.join(d, 'sw.js'), 'const SHELL_BUILD = "' + id + '";\nconst CACHE = "lowispike-updates-' + id + '";\n');
    fs.writeFileSync(path.join(d, 'apple-ui.js'), "  const v='" + id + "';\n");
    fs.writeFileSync(path.join(d, 'version.json'), JSON.stringify(Object.assign({ build: id }, extra || {}, { news: { id: 'n-' + id, go: { tab: 'home' }, text: { en: 'Hi', de: 'Hallo', es: 'Hola' } } })) + '\n');
    return d;
}
const V = d => JSON.parse(fs.readFileSync(path.join(d, 'version.json'), 'utf8'));
const raw = d => fs.readFileSync(path.join(d, 'version.json'), 'utf8');

test('a quiet release keeps the last loud build and leaves What\'s New alone', () => {
    const d = fixture('20261024-100000');
    applyBump(d, '20261024-100000', '20261024-100001', null, { quiet: true });
    const v = V(d);
    assert.strictEqual(v.build, '20261024-100001');
    assert.strictEqual(v.loud, '20261024-100000', 'the build before was loud');
    assert.strictEqual(v.news.id, 'n-20261024-100000', 'no new What\'s New');
    applyBump(d, '20261024-100001', '20261024-100002', null, { quiet: true });
    assert.strictEqual(V(d).loud, '20261024-100000', 'two quiet fixes in a row still point at the last loud one');
});

test('a normal release is loud', () => {
    const d = fixture('20261024-100000', { loud: '20261023-090000' });
    applyBump(d, '20261024-100000', '20261024-100001', { slug: 'x', text: { en: 'A', de: 'A', es: 'A' } });
    assert.strictEqual(V(d).loud, '20261024-100001');
    const d2 = fixture('20261024-100000');
    applyBump(d2, '20261024-100000', '20261024-100001', null);
    assert.strictEqual(V(d2).loud, '20261024-100001', 'no --quiet = announces itself, as before');
});

test('the app\'s 64-byte update poll can read build and loud', () => {
    const d = fixture('20261024-100000');
    applyBump(d, '20261024-100000', '20261024-100001', null, { quiet: true });
    const head = raw(d).slice(0, 64);
    assert.match(head, /^\{"build":"20261024-100001","loud":"20261024-100000"/);
});

test('a quiet release cannot carry What\'s New', () => {
    const d = fixture('20261024-100000');
    assert.throws(() => applyBump(d, '20261024-100000', '20261024-100001', { slug: 'x', text: { en: 'A', de: 'A', es: 'A' } }, { quiet: true }), /quiet/);
    const sh = fs.readFileSync(path.join(root, 'scripts', 'release.sh'), 'utf8');
    assert.match(sh, /--quiet\) QUIET="--quiet"; shift;;/);
    assert.match(sh, /bump-build\.cjs \$\{NEWS:\+--news "\$NEWS"\} \$QUIET/);
});

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
function loudOf() {
    const m = /const loudOf = (\(t, build\) => \{[^\n]*\});/.exec(html);
    assert.ok(m, 'loudOf in index.html');
    return eval(m[1]);
}

test('the app reads loud, and an old version.json without it counts every build as loud', () => {
    const f = loudOf();
    assert.strictEqual(f('{"build":"20261024-100001","loud":"20261024-100000","news"', '20261024-100001'), '20261024-100000');
    assert.strictEqual(f('{"build":"20261024-100001","news":{"id"', '20261024-100001'), '20261024-100001');
    assert.strictEqual(f('{"build":"20261024-100001","loud":"2026102', '20261024-100001'), '20261024-100001', 'cut off = loud, the safe side');
});

test('a silent fix never asks "New version" and never says "Update loaded"', () => {
    assert.match(html, /if \(validBuild\(v\.loud\) && v\.loud <= BUILD\) \{ clearUpd\(\); return; \}/, 'no ask while only quiet builds are newer');
    assert.match(html, /liveInfo\(\)\.then\(v => \{ if \(!validBuild\(v\.loud\) \|\| v\.loud > seen\) updNote\(updTxt\(\)\[1\]\); \}\)/, 'no "Update loaded" for a quiet build');
    assert.match(html, /async function liveBuild\(\)\{ return \(await liveInfo\(\)\)\.build; \}/);
});
