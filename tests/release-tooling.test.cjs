'use strict';
// Release tooling: the gate CI runs, the shared build bump, and the repo staying releasable.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const root = path.join(__dirname, '..');
const { check, buildIds } = require('../scripts/release-check.cjs');
const { nextBuild, berlinNow, applyBump } = require('../scripts/bump-build.cjs');

function fixture(id, opts = {}) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'lowi-rel-'));
  fs.writeFileSync(path.join(d, 'index.html'), '<meta name="lowi-build" content="' + id + '">\n<script src="a.js?v=' + id + '"></script>\n');
  fs.writeFileSync(path.join(d, 'sw.js'), 'const SHELL_BUILD = "' + (opts.sw || id) + '";\nconst CACHE = "lowispike-updates-' + (opts.sw || id) + '";\n');
  fs.writeFileSync(path.join(d, 'apple-ui.js'), "  const v='" + id + "';\n");
  fs.writeFileSync(path.join(d, 'version.json'), JSON.stringify({ build: id, news: { id: 'x-' + id, go: { tab: 'home' }, text: { en: 'Hi', de: 'Hallo', es: 'Hola' } } }) + '\n');
  return d;
}

test('the repository passes its own release check', () => {
  const r = check(root);
  assert.deepStrictEqual(r.errors, []);
  assert.match(r.build, /^\d{8}-\d{6}$/);
});

test('every build id location agrees', () => {
  const ids = buildIds(root);
  assert.ok(Object.keys(ids).length >= 5, 'index.html, version.json, sw.js x2, apple-ui.js');
  assert.strictEqual(new Set(Object.values(ids)).size, 1, JSON.stringify(ids));
});

test('a misaligned service worker build is an error', () => {
  const d = fixture('20261018-010000', { sw: '20261017-230350' });
  const r = check(d);
  assert.ok(r.errors.some(e => /disagree/.test(e)), r.errors.join('\n'));
});

test('missing translations and conflict markers are errors', () => {
  const d = fixture('20261018-010000');
  const v = JSON.parse(fs.readFileSync(path.join(d, 'version.json'), 'utf8'));
  delete v.news.text.es;
  fs.writeFileSync(path.join(d, 'version.json'), JSON.stringify(v));
  fs.writeFileSync(path.join(d, 'a.js'), 'x\n<<<<<<< HEAD\ny\n=======\nz\n>>>>>>> other\n');
  const r = check(d);
  assert.ok(r.errors.some(e => /news\.text\.es/.test(e)));
  assert.ok(r.errors.some(e => /conflict marker.*a\.js/.test(e)));
});

test('stray and secret-looking files are errors', () => {
  const d = fixture('20261018-010000');
  fs.writeFileSync(path.join(d, 'release.log'), 'x');
  fs.writeFileSync(path.join(d, '.env'), 'KEY=1');
  const r = check(d);
  assert.ok(r.errors.some(e => /release\.log/.test(e)));
  assert.ok(r.errors.some(e => /\.env/.test(e)));
});

test('next build is now, but always after the repo and the live build', () => {
  assert.strictEqual(nextBuild('20261017-230350', '20261017-230350', '20261018-001500'), '20261018-001500');
  assert.strictEqual(nextBuild('20261018-001500', '20261018-002000', '20261018-001000'), '20261018-002001');
  assert.strictEqual(nextBuild('20261231-235959', null, '20261231-120000'), '20270101-000000');
  assert.match(berlinNow(new Date('2026-10-17T22:30:00Z')), /^20261018-003000$/);
  assert.match(berlinNow(new Date('2026-12-01T12:00:00Z')), /^20261201-130000$/);
});

test('bump moves every id and prepends What\'s New in three languages', () => {
  const d = fixture('20261018-010000');
  applyBump(d, '20261018-010000', '20261018-010001', { slug: 'ci', text: { en: 'New', de: 'Neu', es: 'Nuevo' }, lead: { en: 'L', de: 'L', es: 'L' } });
  assert.deepStrictEqual(check(d).errors, []);
  assert.strictEqual(new Set(Object.values(buildIds(d))).size, 1);
  assert.strictEqual(buildIds(d)['sw.js CACHE'], '20261018-010001');
  const v = JSON.parse(fs.readFileSync(path.join(d, 'version.json'), 'utf8'));
  assert.strictEqual(v.news.id, 'ci-20261018-010001');
  assert.strictEqual(v.news.text.de, 'Neu\n\nHallo');
  assert.strictEqual(v.news.date, '2026-10-18');
  assert.ok(fs.readFileSync(path.join(d, 'version.json'), 'utf8').endsWith('\n'));
  assert.ok(fs.readFileSync(path.join(d, 'index.html'), 'utf8').includes('a.js?v=20261018-010001'));
});

test('a release without its own tour drops the previous release\'s lead and steps', () => {
  const d = fixture('20261018-010000');
  applyBump(d, '20261018-010000', '20261018-010001', { slug: 'tour', text: { en: 'A', de: 'A', es: 'A' }, lead: { en: 'Old lead', de: 'L', es: 'L' }, steps: [{ tab: 'home', text: { en: 'Old step', de: 'S', es: 'S' } }] });
  let v = JSON.parse(fs.readFileSync(path.join(d, 'version.json'), 'utf8'));
  assert.strictEqual(v.news.lead.en, 'Old lead');
  assert.strictEqual(v.news.steps.length, 1);
  applyBump(d, '20261018-010001', '20261018-010002', { slug: 'plain', text: { en: 'B', de: 'B', es: 'B' } });
  v = JSON.parse(fs.readFileSync(path.join(d, 'version.json'), 'utf8'));
  assert.strictEqual(v.news.id, 'plain-20261018-010002');
  assert.strictEqual(v.news.lead, undefined, 'the older release\'s lead must not stay');
  assert.strictEqual(v.news.steps.length, 1, 'one step of its own, not the older release\'s tour');
  assert.strictEqual(v.news.steps[0].tab, 'home');
  assert.deepStrictEqual(v.news.steps[0].text, { en: 'B', de: 'B', es: 'B' });
  assert.ok(v.news.text.en.startsWith('B\n\nA'));
  assert.deepStrictEqual(check(d).errors, []);
});

test('the live What\'s New tour belongs to the current news', () => {
  /* every tour lead in version.json must be about the release whose id it carries: its words show up in that release's own
     (first) paragraph. Catches a lead or steps left over from an older release. */
  const v = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'version.json'), 'utf8'));
  const n = v.news || {};
  const first = String((n.text && n.text.en) || '').split('\n\n')[0].toLowerCase();
  if (!n.lead) return; /* no lead: the tour offer says "One new thing in this update" */
  const words = String(n.lead.en).toLowerCase().match(/[a-z]{5,}/g) || [];
  assert.ok(words.length, 'a tour lead needs words');
  const hits = words.filter(w => first.includes(w)).length;
  assert.ok(hits * 2 >= words.length, 'lead "' + n.lead.en + '" does not match this release\'s news "' + first.slice(0, 80) + '"');
});

test('test floor reads the pass count and the newest recorded count', () => {
  const { parsePass, floorFromSubjects } = require('../scripts/test-floor.cjs');
  assert.strictEqual(parsePass('ℹ tests 1213\nℹ pass 1212\nℹ fail 1\n'), 1212);
  assert.strictEqual(parsePass('nothing'), null);
  const f = floorFromSubjects(['Docs only', 'Release 20261018-000407: care board (tests 1205/1205)', 'Release x (tests 1100/1100)']);
  assert.strictEqual(f.floor, 1205);
  assert.strictEqual(floorFromSubjects(['a', 'b']), null);
});

test('CI workflow keeps least privilege, pinned actions and the same gates', () => {
  const y = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
  assert.match(y, /permissions:\s*\n\s*contents: read/);
  for (const m of y.matchAll(/uses:\s*(\S+)/g)) assert.match(m[1], /@[0-9a-f]{40}$/, m[1] + ' must be pinned to a full commit SHA');
  assert.match(y, /node scripts\/release-check\.cjs/);
  assert.match(y, /node --test tests\/\*\.test\.cjs/);
  assert.match(y, /pipefail/);
  assert.match(y, /node scripts\/test-floor\.cjs/);
  assert.match(y, /verify-live\.cjs --at-least/);
  assert.match(y, /cancel-in-progress: \$\{\{ github\.ref != 'refs\/heads\/main' \}\}/);
});

test('Pages deploys only after the tests pass, and the required check keeps its name', () => {
  const y = fs.readFileSync(path.join(root, '.github/workflows/ci.yml'), 'utf8');
  const job = name => { const m = y.match(new RegExp('\\n  ' + name + ':\\n([\\s\\S]*?)(?=\\n  [a-z]+:\\n|$)')); assert.ok(m, name + ' job missing'); return m[1]; };
  assert.match(job('test'), /name: Release check and tests\n/, 'the main ruleset requires this exact check name');
  const deploy = job('deploy');
  assert.match(deploy, /needs: test\n/);
  assert.match(deploy, /github\.ref == 'refs\/heads\/main'/);
  assert.match(deploy, /pages: write/);
  assert.match(deploy, /id-token: write/);
  assert.match(deploy, /name: github-pages/);
  assert.match(deploy, /actions\/upload-pages-artifact@/);
  assert.match(deploy, /actions\/deploy-pages@/);
  assert.doesNotMatch(job('test'), /pages: write|deploy-pages/, 'the test job never deploys');
  assert.match(job('live'), /needs: deploy\n/);
  const rel = fs.readFileSync(path.join(root, 'scripts/release.sh'), 'utf8');
  assert.match(rel, /scripts\/push-main\.sh/);
  assert.doesNotMatch(rel.replace(/^\s*#.*$/mg, ''), /git push origin HEAD:main/, 'release.sh lands through push-main.sh');
  const pm = fs.readFileSync(path.join(root, 'scripts/push-main.sh'), 'utf8');
  assert.match(pm, /refs\/heads\/\$BR/);
  assert.match(pm, /wait-ci\.cjs/);
  assert.doesNotMatch(pm, /--force|\s-f\s|\+HEAD/);
});
