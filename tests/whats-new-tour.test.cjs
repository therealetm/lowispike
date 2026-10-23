'use strict';
/* What's New as a mini tour in the tutorial's card (Oct 23 2026, Emmanuel: "every time I do an update it's not in the tutorial style
   ... take them to the place where you updated it and show them around"), and exactly ONE announcement per launch (same day:
   "New in this update keeps reappearing in a loop"). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.join(__dirname, '..');
const S = require('../tutorial-steps.js');
const { applyBump, checkTutorial } = require('../scripts/bump-build.cjs');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('part new: intro first, every step short, three languages, a known route', () => {
  const nw = S.STEPS.filter(s => s.area === 'new');
  assert.ok(nw.length >= 2);
  assert.strictEqual(nw[0].id, 'new-intro');
  assert.ok(S.AREAS.indexOf('new') === S.AREAS.indexOf('end') - 1, 'part new comes right before the end');
  const js = read('tutorial.js');
  for (const s of nw) {
    for (const l of ['en', 'de', 'es']) {
      assert.ok(s.title[l] && s.text[l], s.id + ' ' + l);
      assert.ok(s.text[l].length <= 140, s.id + ' ' + l + ': keep it short (' + s.text[l].length + ')');
    }
    if (s.open) assert.match(js, new RegExp('\\b' + s.open + ': \\{ go\\('), s.id + ': open route ' + s.open + ' exists in tutorial.js OPEN');
  }
  for (const l of ['en', 'de', 'es']) for (const k of ['newsLabel', 'newsSkip', 'newsDone', 'newsTitle']) assert.ok(S.UI[l][k], l + ' ' + k);
  assert.strictEqual(S.UI.de.newsSkip, 'Überspringen');
});

test('tourOf: tour list, else the tutorial step, only existing steps, no repeats, never the intro', () => {
  assert.deepStrictEqual(S.tourOf({ tour: ['new-rooms', 'nope', 'new-rooms', 'new-intro', 'new-sleep'] }), ['new-rooms', 'new-sleep']);
  assert.deepStrictEqual(S.tourOf({ tutorial: 'new-sync' }), ['new-sync']);
  assert.deepStrictEqual(S.tourOf({ tutorial: { none: 'server only fix' } }), []);
});

test('unseenNews: one entry for every unseen release, union of tours, null once all are seen', () => {
  const n = { id: 'c', tour: ['new-sync'], text: { en: 'C' }, history: [{ id: 'c', tour: ['new-sync'] }, { id: 'b', tour: ['new-rooms', 'new-sync'] }, { id: 'a', tour: ['new-sleep'] }] };
  const seen = new Set(['a']);
  const u = S.unseenNews(n, id => seen.has(id));
  assert.deepStrictEqual(u.ids, ['c', 'b']);
  assert.deepStrictEqual(u.tour, ['new-sync', 'new-rooms']);
  u.ids.forEach(id => seen.add(id));
  assert.strictEqual(S.unseenNews(n, id => seen.has(id)), null, 'after it was shown once, nothing is left to show');
  assert.strictEqual(S.unseenNews({}, () => false), null);
});

test('a fix without a step still gets one short card in the same style', () => {
  const c = S.newsCard({ text: { en: 'Fixed the loop. It shows once now. A third sentence that is quite a bit longer than the others are, and keeps going on and on for a while, far too long.\n\nOlder release', de: 'Behoben.', es: 'Arreglado.' } });
  assert.strictEqual(c.title.de, 'Neu in diesem Update');
  assert.ok(c.text.en.startsWith('Fixed the loop. It shows once now.'));
  assert.ok(!c.text.en.includes('Older release'));
  assert.ok(c.text.en.length <= 220);
});

test('reload regression: index.html marks every unseen id seen (localStorage) BEFORE the tour shows, and offers nothing else after', () => {
  const html = read('index.html');
  const at = html.indexOf('LowiTutorialSteps.unseenNews(NEWS, newsSeen)');
  assert.ok(at > 0, 'the tick folds unseen news into one');
  const block = html.slice(at, html.indexOf('return; }', at) + 9);
  assert.ok(block.indexOf('u.ids.forEach(markSeen)') >= 0 && block.indexOf('u.ids.forEach(markSeen)') < block.indexOf('LowiTutorial.news(u)'), 'seen is saved before the tour shows');
  assert.match(block, /return; \}$/, 'the tick ends there: no second offer (offerTour / offerNews) in the same launch');
  assert.ok(html.indexOf('LowiTutorialSteps.unseenNews') < html.indexOf('offerTour(); return; }'), 'the mini tour runs before the old offers');
  /* the seen list is persistent */
  assert.match(html, /function markSeen\(id\)\{[^}]*localStorage\.setItem\(SEEN/);
  /* simulate launches: a fresh launch with the same news finds nothing to show */
  const store = {}; const seen = id => (store.seen || []).includes(id); const mark = id => { store.seen = (store.seen || []).concat(id); };
  const NEWS = { id: 'x-2', tour: ['new-rooms'], history: [{ id: 'x-2', tour: ['new-rooms'] }, { id: 'x-1', tour: ['new-sleep'] }] };
  let shown = 0;
  for (let launch = 0; launch < 5; launch++) { const u = S.unseenNews(NEWS, seen); if (u) { u.ids.forEach(mark); shown++; } }
  assert.strictEqual(shown, 1);
});

test('the news tour never touches the saved place of the full tour', () => {
  const js = read('tutorial.js');
  assert.match(js, /if \(mode !== 'news'\) \{ const st = store\.get\(\); st\.last/);
  assert.match(js, /mode === 'news' \? \{ news: true \}/);
  assert.match(read('tutorial-resume.js'), /e\.detail\.news\) return;/);
  assert.match(read('tutorial-auto.js'), /e\.detail\.news\) return;/);
});

test('bump-build: tour and history go into version.json; a bad tour id blocks', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wnt-'));
  fs.writeFileSync(path.join(d, 'version.json'), JSON.stringify({ build: '20261023-100000', news: { id: 'old-20261023-100000', text: { en: 'o', de: 'o', es: 'o' }, history: [{ id: 'old-20261023-100000', tour: ['new-sleep'] }] } }) + '\n');
  fs.copyFileSync(path.join(ROOT, 'tutorial-steps.js'), path.join(d, 'tutorial-steps.js'));
  applyBump(d, '20261023-100000', '20261023-100001', { slug: 'rooms', tutorial: 'new-rooms', tour: ['new-rooms', 'new-deadlift'], text: { en: 'R', de: 'R', es: 'R' } });
  const v = JSON.parse(fs.readFileSync(path.join(d, 'version.json'), 'utf8'));
  assert.deepStrictEqual(v.news.tour, ['new-rooms', 'new-deadlift']);
  assert.deepStrictEqual(v.news.history.map(h => h.id), ['rooms-20261023-100001', 'old-20261023-100000']);
  assert.match(checkTutorial(ROOT, { tutorial: 'new-rooms', tour: ['new-nope'] }), /do not exist/);
  assert.strictEqual(checkTutorial(ROOT, { tutorial: 'new-rooms', tour: ['new-rooms'] }), '');
});
