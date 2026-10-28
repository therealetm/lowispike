'use strict';
/* Oct 19 2026 (Emmanuel: "There should be a tutorial button ... our companion takes you through everything from the beginning, as if
   you were new. Obviously, you can skip ... with every new update, the tutorial also needs to be updated.")
   Pins: the one data file of steps (tutorial-steps.js), its three languages, the claim-your-own-companion step first, Skip / Skip all,
   the KEEP-CURRENT rule (every Home ring control and Settings row is covered or explicitly not; every What's New entry names its
   tutorial step or says why none is needed, enforced by bump-build and release-check), the Settings row, the wiring, and that the
   tour gives way to setup and every other panel (bug hunt round 8). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const S = require('../tutorial-steps.js');
const LANGS = ['en', 'de', 'es'];

test('steps: unique ids, known areas, every text in English, German and Spanish', () => {
    const ids = S.STEPS.map(s => s.id);
    assert.strictEqual(new Set(ids).size, ids.length, 'unique ids');
    assert.ok(S.STEPS.length >= 10, 'a full tour');
    for (const s of S.STEPS) {
        assert.match(s.id, /^[a-z][a-z0-9-]*$/, s.id);
        assert.ok(S.AREAS.includes(s.area), s.id + ' area ' + s.area);
        assert.ok(Array.isArray(s.covers), s.id + ' covers');
        assert.ok(s.target === null || (Array.isArray(s.target) && s.target.length), s.id + ' target');
        for (const f of ['title', 'text'].concat(s.cta ? ['cta'] : [])) for (const l of LANGS) {
            assert.ok(s[f] && typeof s[f][l] === 'string' && s[f][l].trim(), s.id + '.' + f + '.' + l);
            assert.ok(!/\p{Extended_Pictographic}/u.test(s[f][l]), 'no emoji in ' + s.id);
        }
        if (s.target) for (const l of LANGS) assert.ok(s.text[l].length <= 260, s.id + '.' + l + ' fits a phone card');
    }
    for (const l of LANGS) for (const k of ['next', 'back', 'skip', 'skipAll', 'of']) assert.ok(S.UI[l][k], 'UI ' + l + '.' + k);
    /* German / Spanish are real translations, not English copies */
    for (const s of S.STEPS) assert.notStrictEqual(s.text.de, s.text.en, s.id + ' de'), assert.notStrictEqual(s.text.es, s.text.en, s.id + ' es');
});

test('the first step claims your own companion, only for accounts that still have the standard Misty', () => {
    const first = S.STEPS[0];
    assert.strictEqual(first.id, 'claim');
    assert.strictEqual(first.action, 'claim');
    assert.strictEqual(first.when, 'claimReady'); assert.ok(first.hook, 'claim step is a marked hook');
    for (const l of LANGS) assert.match(first.text[l], /\p{L}/u);
    assert.strictEqual(S.plan({ claimReady: true })[0].id, 'claim');
    assert.ok(!S.plan({ claimReady: false }).some(s => s.id === 'claim'), 'no claim step once you have your own');
    assert.strictEqual(S.plan({ claimReady: false })[0].id, 'hello');
    assert.strictEqual(S.STEPS[S.STEPS.length - 1].id, 'done');
});

test('the tour walks every main feature the brief names', () => {
    const c = S.covered();
    for (const f of ['gap', 'move', 'water', 'fuel', 'scan', 'snap-food', 'log-meal', 'forms', 'worlds', 'autopilot', 'energy', 'community', 'community-chat', 'settings', 'tutorial'])
        assert.ok(c[f] && c[f] !== 'none', f + ' has a step');
});

test('KEEP CURRENT: every Home ring control and every Settings row has a tutorial step or an explicit no-tutorial note', () => {
    const order = JSON.parse(read('home-orbit-v2.js').match(/const ORDER = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
    const SS = require('../home-settings-sleep-v2.js');
    const rows = [].concat(...SS.pageGroups({ has: () => true }).map(g => g.ids));
    const c = S.covered(), missing = order.concat(rows).filter(id => !c[id]);
    assert.deepStrictEqual(missing, [], 'add a step to tutorial-steps.js (covers) or a NO_TUTORIAL reason for: ' + missing.join(', '));
    for (const [k, why] of Object.entries(S.NO_TUTORIAL)) assert.ok(String(why).length >= 8, 'reason for ' + k);
    assert.ok(rows.includes('tutorial'), 'Settings lists Tutorial');
});

test('Skip jumps past the rest of the part; text fills the companion name', () => {
    const list = S.plan({ claimReady: true });
    const home = list.findIndex(s => s.area === 'home');
    const j = S.skipIndex(list, home);
    assert.ok(j > home + 1, 'Skip leaves the whole Home part');
    assert.notStrictEqual(list[j].area, 'home');
    assert.strictEqual(S.skipIndex(list, list.length - 1), list.length);
    assert.strictEqual(S.text(S.STEPS.find(s => s.id === 'hello'), 'title', 'de', { name: 'Kreb' }), 'Hi, ich bin Kreb');
    assert.strictEqual(S.text(S.STEPS[0], 'title', 'xx'), S.STEPS[0].title.en, 'unknown language falls back to English');
});

test('KEEP CURRENT: bump-build refuses a What\'s New without a tutorial note and carries it into version.json', () => {
    const B = require('../scripts/bump-build.cjs');
    const news = { slug: 'x', text: { en: 'New', de: 'Neu', es: 'Nuevo' } };
    assert.match(B.checkTutorial(ROOT, news), /no "tutorial" field/);
    assert.match(B.checkTutorial(ROOT, Object.assign({}, news, { tutorial: 'no-such-step' })), /existing step id/);
    assert.match(B.checkTutorial(ROOT, Object.assign({}, news, { tutorial: { none: '' } })), /reason/);
    assert.strictEqual(B.checkTutorial(ROOT, Object.assign({}, news, { tutorial: 'scan' })), '');
    assert.strictEqual(B.checkTutorial(ROOT, Object.assign({}, news, { tutorial: { none: 'server-only fix, nothing on screen changed' } })), '');
    assert.strictEqual(B.checkTutorial(ROOT, null), '', 'a release without What\'s New is not blocked here');
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'tut-'));
    fs.writeFileSync(path.join(d, 'version.json'), JSON.stringify({ build: '20261019-170000', news: { id: 'old-20261019-160000', text: { en: 'a', de: 'b', es: 'c' }, tutorial: 'scan' } }) + '\n');
    B.applyBump(d, '20261019-170000', '20261019-170001', Object.assign({}, news, { tutorial: 'settings' }));
    assert.strictEqual(JSON.parse(fs.readFileSync(path.join(d, 'version.json'), 'utf8')).news.tutorial, 'settings');
    B.applyBump(d, '20261019-170001', '20261019-170002', news);
    assert.ok(!('tutorial' in JSON.parse(fs.readFileSync(path.join(d, 'version.json'), 'utf8')).news), 'an old note never sticks to a new entry');
    const sh = read('scripts/release.sh');
    assert.match(sh, /set -euo pipefail/, 'a refused bump stops release.sh');
    assert.match(sh, /node scripts\/bump-build\.cjs/);
});

test('KEEP CURRENT: the What\'s New on main names its tutorial step (from the tutorial release on)', () => {
    const ver = JSON.parse(read('version.json')), n = ver.news || {};
    const b = (String(n.id || '').match(/(\d{8}-\d{6})$/) || [])[1] || '';
    const from = read('scripts/release-check.cjs').match(/TUTORIAL_RULE_FROM = '(\d{8}-\d{6})'/)[1];
    if (b && b >= from) assert.ok(S.newsOk(n.tutorial), 'version.json news.tutorial must be a step id or {none}: ' + JSON.stringify(n.tutorial));
    else assert.ok(b < from, 'older entries predate the rule');
});

test('the rule is written down for future tasks', () => {
    for (const f of ['AGENTS.md', 'RELEASE.md', 'TUTORIAL.md', 'SUCCESSOR_HANDOFF.md']) {
        const t = read(f);
        assert.match(t, /tutorial-steps\.js/, f + ' names the data file');
        assert.match(t, /"tutorial"/, f + ' names the news.json field');
    }
});

test('Settings has a Tutorial row in all three languages that starts the tour', () => {
    const SS = require('../home-settings-sleep-v2.js');
    assert.deepStrictEqual(SS.pageGroups({ has: () => true })[0].ids, ['catchUp', 'theme', 'look', 'worldSound', 'language', 'tutorial']);  /* Oct 26 2026 (MAYA-HANDOFF 0.39): Catch up on today is the first row */
    for (const l of LANGS) assert.ok(SS.TX[l].tutorial, 'label ' + l);
    assert.strictEqual(SS.rowAction('tutorial'), 'go', 'a place: Settings closes, then the tour starts');
    const src = read('home-settings-sleep-v2.js');
    assert.match(src, /tutorial: \{ has: \(\) => !!\(root\.LowiTutorial && fn\(root\.LowiTutorial, 'start'\)\), run: \(\) => root\.LowiTutorial\.start\(\{ from: 'settings' \}\) \}/);
    assert.match(src, /tutorial: '<circle/, 'its own icon');
});

test('wiring: loaded once after the Home modules, cache-busted, precached by the service worker', () => {
    const html = read('index.html'), build = JSON.parse(read('version.json')).build;
    for (const f of ['tutorial.css', 'tutorial-steps.js', 'tutorial.js']) {
        const n = (html.match(new RegExp('(href|src)="' + f.replace('.', '\\.') + '\\?v=' + build + '"', 'g')) || []).length;
        assert.strictEqual(n, 1, f + ' once with the build id');
    }
    assert.ok(html.indexOf('src="tutorial-steps.js') < html.indexOf('src="tutorial.js'), 'data before the player');
    assert.ok(html.indexOf('src="tutorial.js') > html.indexOf('src="home-settings-sleep-v2.js'), 'after Settings');
    const sw = read('sw.js'), list = JSON.parse(sw.match(/const STATIC = (\[[^\]]*\])/)[1]);
    for (const f of ['tutorial.css', 'tutorial-steps.js', 'tutorial.js']) assert.ok(list.includes(f), f + ' precached');
});

test('the tour never covers setup or other panels: it hides while they are up and the Day card waits for it', () => {
    const js = read('tutorial.js');
    for (const k of ["'gate-up'", "'gate-boot'", "'#r2ob'", 'aria-modal', 'LowiRitualCore.BUSY', "'mf-on'", "'ss2-open'"]) assert.ok(js.includes(k), 'gives way to ' + k);
    assert.match(js, /function hold\(/);
    assert.match(js, /lt-held/);
    assert.match(read('tutorial.css'), /\.lt-tour\.lt-held \{ visibility: hidden; pointer-events: none;/, 'held = invisible and untouchable');
    const R = require('../daily-ritual.js');
    assert.ok(R.BUSY.includes('#ltTour:not(.lt-held)'), 'the Day card does not open over the tour');
    /* the player reads and writes no app data: one key of its own */
    assert.deepStrictEqual([...new Set((js.match(/localStorage\.(setItem|removeItem)\([^,)]+/g) || []))], ['localStorage.setItem(KEY']);
    assert.ok(!/LowiR2\.save|R2\.save|removeItem|clear\(\)/.test(js), 'no app data written or wiped');
    assert.match(js, /B\.claim\(\{ from: 'tutorial' \}\)/, 'claim step: the own-companion task\'s API');
    assert.doesNotMatch(js, /B\.openCreator\(\)/, 'no dependency on the unbuilt claim step'); assert.match(js, /typeof B\.claim === 'function'/, 'claim hook gated');
    for (const k of ["'skipall'", "'skip'", "'back'", "'next'", "'Escape'"]) assert.ok(js.includes(k), k);
});
