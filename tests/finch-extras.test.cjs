'use strict';
/* Oct 15: in-scene first-use hints, per-tab tint, community milestones + good vibes with quiet hours. */
const {test} = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const X = require('../finch-extras.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('every hint is two to four uppercase words in de, en and es', () => {
  assert.ok(X.HINTS.length >= 3);
  for (const h of X.HINTS) {
    assert.equal(h.txt.length, 3);
    for (const s of h.txt) { assert.ok(X.words(s) >= 2 && X.words(s) <= 4, s); assert.equal(s, s.toUpperCase(), s); }
  }
});

test('one hint at a time, in order, and a finished hint never comes back', () => {
  const all = () => true;
  assert.equal(X.nextHint({}, all).id, 'scan');
  assert.equal(X.nextHint({scan: 1}, all).id, 'herb');
  assert.equal(X.nextHint({scan: 1}, h => h.id === 'fast').id, 'fast', 'a hint whose control is off screen is skipped');
  assert.equal(X.nextHint(Object.fromEntries(X.HINTS.map(h => [h.id, 1])), all), null);
  assert.equal(X.nextHint({}, () => false), null);
});

test('each tab has its own tint, scan is cyan', () => {
  assert.deepEqual(['home', 'shelf', 'move', 'foryou', 'scan'].map(X.tintFor), ['sun', 'herb', 'coral', 'violet', 'cyan']);
  assert.equal(X.tintFor('nope'), 'sun');
  const css = read('finch-extras.css');
  for (const k of ['sun', 'herb', 'coral', 'violet', 'cyan']) assert.match(css, new RegExp('html\\[data-tint=' + k + '\\]'));
  /* Oct 21: menu bar removed, check dropped */
  assert.match(css, /data-ui=light\] #fxGlow\{display:none\}/, 'dark theme only');
});

test('the tint never changes sizes of the tab bar or the iPad sidebar', () => {
  const css = read('finch-extras.css');
  const rules = css.split('}').filter(r => /#tabbar/.test(r));
  for (const r of rules) assert.doesNotMatch(r, /(?:^|[;{])\s*(width|height|padding|margin|font-size|gap|flex|display|letter-spacing)\s*:/, r);
});

test('reduced motion: no fade, breathing or sparkle', () => {
  const css = read('finch-extras.css'), rm = css.slice(css.indexOf('prefers-reduced-motion'));
  assert.match(rm, /#fxHint\.on/); assert.match(rm, /animation:none!important/); assert.match(rm, /\.fx-burst\{display:none\}/);
  assert.match(css, /#fxHint\{[^}]*pointer-events:none/, 'hints never catch taps');
  assert.match(read('finch-extras.js'), /function burst\(btn\) \{\s*if \(reduced\(\)\) return;/);
});

test('milestones come only from real levels and streaks, yours first', () => {
  const people = [{n: 'Merve', uid: 'u1', lv: 4, streak: 9}, {n: 'Aylin', uid: 'u2', lv: 1, streak: 2}, {n: 'Me', uid: 'me1', lv: 3, streak: 30}];
  const m = X.milestones(people, {n: 'Me', uid: 'me1', lv: 3, streak: 30});
  assert.ok(m[0].mine && m[1].mine, 'your own come first');
  assert.equal(m.filter(x => x.who === 'Aylin').length, 0, 'level 1 and a 2-day streak are no milestone');
  assert.equal(m.filter(x => x.uid === 'me1' && !x.mine).length, 0, 'you are not listed twice');
  const merve = m.filter(x => x.who === 'Merve').map(x => x.kind + x.n).sort();
  assert.deepEqual(merve, ['level4', 'streak7']);
  assert.deepEqual(X.milestones([], null), [], 'no data, no milestones (nothing invented)');
  assert.equal(X.streakMark(13), 7); assert.equal(X.streakMark(2), 0); assert.equal(X.streakMark(400), 365);
});

test('good vibes go once per milestone and never to yourself', () => {
  const m = {key: 'u1:lv4', mine: false}, mine = {key: 'me:lv3', mine: true};
  assert.equal(X.canSend({sent: {}}, m), true);
  assert.equal(X.canSend({sent: {'u1:lv4': 1}}, m), false);
  assert.equal(X.canSend({sent: {}}, mine), false);
});

test('quiet hours wrap past midnight and hold incoming vibes until morning', () => {
  const q = {on: true, from: '22:00', to: '08:00'}, at = (h, mi) => new Date(2026, 9, 15, h, mi || 0);
  assert.equal(X.isQuiet(at(23), q), true); assert.equal(X.isQuiet(at(1), q), true); assert.equal(X.isQuiet(at(7, 59), q), true);
  assert.equal(X.isQuiet(at(8), q), false); assert.equal(X.isQuiet(at(14), q), false); assert.equal(X.isQuiet(at(22), q), true);
  assert.equal(X.isQuiet(at(23), {on: false, from: '22:00', to: '08:00'}), false);
  assert.equal(X.isQuiet(at(13), {on: true, from: '12:00', to: '14:00'}), true);
  const inc = [{id: 'a', who: 'Merve'}, {id: 'b', who: 'Aylin'}];
  assert.deepEqual(X.sortIncoming(inc, {a: 1}, at(23), q), {show: [], hold: [{id: 'b', who: 'Aylin'}]});
  assert.deepEqual(X.sortIncoming(inc, {}, at(12), q).show.map(v => v.who), ['Merve', 'Aylin']);
});

test('wired into the app shell, offline cache and build', () => {
  assert.match(read('apple-ui.js'), /'finch-extras\.js'[,\]]/);
  const sw = read('sw.js'); assert.match(sw, /"finch-extras\.js", "finch-extras\.css"/);
  const b = JSON.parse(read('version.json')).build;
  assert.match(sw, new RegExp('SHELL_BUILD = "' + b + '"')); assert.match(sw, new RegExp('CACHE = "lowispike-updates-' + b + '"'));
  assert.match(read('apple-ui.js'), new RegExp("v='" + b + "'"));
  assert.match(read('index.html'), new RegExp('<meta name="lowi-build" content="' + b + '">'));
  const js = read('finch-extras.js');
  assert.doesNotMatch(js, /Finch|Frankie|birb|Rainbow Stones/, 'no borrowed names in what the user sees');
});

test('reactions are fixed supportive phrases, hidden people disappear, privacy line names what is never shown', () => {
  assert.equal(X.REACTIONS.length, 3);
  for (const r of X.REACTIONS) assert.equal(r.txt.length, 3);
  const list = [{key: 'u1:lv4', uid: 'u1', who: 'Merve'}, {key: 'u2:lv2', uid: 'u2', who: 'Aylin'}, {key: 'me:lv3', mine: true}];
  assert.deepEqual(X.visible(list, {blocked: {u1: 'hide'}}).map(m => m.key), ['u2:lv2', 'me:lv3']);
  assert.equal(X.canSend({sent: {}, blocked: {u2: 'report'}}, list[1]), false);
  const js = read('finch-extras.js');
  assert.match(js, /Never food, scans, body or macro data/);
  assert.match(js, /data-fx="hide"/); assert.match(js, /data-fx="report"/); assert.match(js, /data-fx="recv"/);
  assert.doesNotMatch(js, /<textarea|<input/, 'no free text');
});

test('wardrobe and herb hints exist and every hint is also an aria-description on its control', () => {
  const ids = X.HINTS.map(h => h.id);
  for (const id of ['scan', 'herb', 'fast', 'vibes']) assert.ok(ids.includes(id), id);
  for (const id of ['wear', 'try']) assert.ok(!ids.includes(id), 'dress-up hint retired: ' + id);
  assert.match(read('finch-extras.js'), /setAttribute\('aria-description'/);
});
