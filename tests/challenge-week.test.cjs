'use strict';
/* Nov 8 2026 (Emmanuel, first time in the Challenge on a Sunday: "it feels like it thinks I already bought the things ... there should be a
   little gamified start of the week ... if it's Sunday, then they gotta start tomorrow"; "We shouldn't lock in the time ... morning,
   brunch, evening, nighttime ... or snack"; "insulin-friendly ... No sugar, no junk food"; calories "on that day and on that week";
   money saved "within a month versus a month of just ... buying sweets ... eating out ... juice ... chewing gum"; and "it is very
   important that it is in the same style ... so it doesn't feel like it's opening a new page"). challenge-week.js draws the Challenge
   in Circle under the games bar. Browser check: Chromium 393 x 852 German, intro -> Ich bin dabei -> 1 Tag bis zum Start -> running
   day with ticks -> recipe in the panel -> Billard removes the panel. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

function load(lang) {
  const W = {}; W.window = W; W.self = W;
  const store = {};
  const ls = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
  const doc = { documentElement: { lang: lang || 'de', classList: { add() {}, toggle() {} }, setAttribute() {} }, querySelector() { return null; }, getElementById() { return null; }, addEventListener() {} };
  W.localStorage = ls;
  new Function('window', 'self', 'document', 'localStorage', 'navigator', 'location', read('faw-core.js'))(W, W, doc, ls, { language: 'de' }, { search: '', origin: '', pathname: '/' });
  new Function('window', 'document', 'localStorage', read('challenge-week.js'))(W, doc, ls);
  return W;
}

test('the start is the next Monday: Sunday -> tomorrow, Monday -> today, Wednesday -> next Monday', () => {
  const C = load().LowiChallenge;
  assert.equal(C.ymd(C.startFor(new Date(2026, 10, 8))), '2026-11-09', 'Sunday 8 Nov -> Monday 9 Nov');
  assert.equal(C.ymd(C.startFor(new Date(2026, 10, 9, 15))), '2026-11-09', 'Monday -> today');
  assert.equal(C.ymd(C.startFor(new Date(2026, 10, 11))), '2026-11-16', 'Wednesday -> next Monday');
});

test('phases: not joined, waiting with a countdown, day n of 7, done', () => {
  const C = load().LowiChallenge;
  assert.equal(C.phase({}).k, 'intro');
  const w = C.phase({ start: '2026-11-09' }, new Date(2026, 10, 8, 20));
  assert.deepEqual([w.k, w.left], ['wait', 1]);
  const r = C.phase({ start: '2026-11-09' }, new Date(2026, 10, 11, 9));
  assert.deepEqual([r.k, r.day], ['run', 2]);
  assert.equal(C.phase({ start: '2026-11-09' }, new Date(2026, 10, 16)).k, 'done');
});

test('no clock times: parts of the day', () => {
  const C = load().LowiChallenge;
  assert.deepEqual(['07:30', '10:30', '12:30', '16:00', '18:00'].map(t => C.slotOf(t, 'meal')), ['morning', 'brunch', 'midday', 'snack', 'evening']);
  assert.equal(C.slotOf('20:00', 'thaw'), 'night');
  assert.equal(C.slotOf('10:00', 'shop'), 'forenoon');
  const html = read('challenge-week.js');
  assert.doesNotMatch(html.slice(html.indexOf('function mealsHTML'), html.indexOf('function leaveHTML')), /x\.time \+|esc\(x\.time\)/, 'the time is never printed');
  assert.match(read('tools/fakeaway/src/p4_app.js'), /esc\(t\.slotW\[slotOf\(x\.time, x\.kind\)\]\)/, 'the shared page too');
  assert.match(read('fakeaway/index.html'), /slotW: \{ morning: 'Morgens'/);
});

test('kcal for the day and the week (one adult, estimate)', () => {
  const C = load().LowiChallenge;
  for (let d = 0; d < 7; d++) { const k = C.kcalOf(d); assert.ok(k > 900 && k < 2200, d + ': ' + k); }
  assert.equal(C.kcalWeek(), [0, 1, 2, 3, 4, 5, 6].reduce((a, d) => a + C.kcalOf(d), 0));
});

test('money: a month of extras, each can be tapped away; labelled as an example', () => {
  const C = load().LowiChallenge;
  assert.deepEqual(C.EXTRAS.map(x => x.id), ['sweets', 'drinks', 'takeaway', 'bakery', 'coffee', 'gum']);
  assert.equal(C.savedPerMonth({}), 127);
  assert.equal(C.savedPerMonth({ takeaway: true, gum: true }), 76);
  assert.match(read('challenge-week.js'), /Beispielbeträge für eine Person, nicht deine echten Ausgaben\./);
});

test('the page: insulin-friendly first, the dishes as pictures, the start card; joined it counts down', () => {
  const W = load(), C = W.LowiChallenge;
  const intro = C.html();
  assert.match(intro, /cwk-badge on">[^<]*Insulinfreundlich/);
  assert.match(intro, /Kein Zucker/); assert.match(intro, /Kein Junkfood/);
  assert.equal((intro.match(/class="cwk-dish"/g) || []).length, 7);
  assert.match(intro, /data-cwk="join">Ich bin dabei</);
  W.localStorage.setItem(C.KEY, JSON.stringify({ start: C.ymd(new Date(Date.now() + 2 * 864e5)) }));
  const wait = C.html();
  assert.match(wait, /class="cwk-big">2</); assert.match(wait, /Tage bis zum Start/);
  assert.doesNotMatch(wait, /data-cwk="ate"/, 'nothing to tick before the start');
});

test('in place under the games bar, not a new page', () => {
  const cg = read('circle-games.js'), css = read('challenge-week.css'), html = read('index.html');
  assert.match(cg, /\{ id: 'challenge', ic: '\\uD83C\\uDFC6', t: \(\) => L\('Challenge', 'Challenge', 'Reto'\), panel: true \}/);
  assert.match(cg, /if \(cur === 'challenge' && !circle\) cur = 'billard';\n    challengePane\(circle && cur === 'challenge'\);/);
  assert.match(css, /html\.csp-chal #cmPaneChat>#cpRoom/);
  assert.match(css, /\.cwk-pane\{position:fixed;left:0;right:0;z-index:30;top:var\(--csp-top/);
  assert.match(html, /<script src="faw-core\.js\?v=[^"]+"><\/script>\n<script src="challenge-week\.js\?v=/);
  assert.match(read('sw.js'), /STATIC\.push\("challenge-week\.js", "challenge-week\.css", "faw-core\.js"\);/);
  assert.match(read('tools/fakeaway/src/build.cjs'), /fs\.writeFileSync\(path\.join\(d, '\.\.', '\.\.', '\.\.', 'faw-core\.js'\), core\);/);
});
