'use strict';
/* Nov 8 2026 (Emmanuel: "vielleicht haben wir einfach einen Challenge-Raum ... Weekly Challenge, wo jeder mitmachen kann ... wie bei
   wo Mission und Shuffle ist"): a Challenge tab in the Circle games bar opens this week's plan (the creator's Fakeaway week), picked
   by calendar week from a list, so a new plan takes over on its week by itself. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

function load() {
  const W = { LowiStorePicks: { fakeaway: o => { W.opened = o; } } };
  new Function('window', 'document', read('circle-games.js'))(W, { documentElement: { lang: 'de' }, readyState: 'loading', addEventListener() {} });
  return W;
}

test('the bar: Billard, Mischen, Swipen, Challenge; four columns', () => {
  const G = load().LowiCircleGames;
  assert.deepEqual(G.GAMES.map(g => g.id), ['billard', 'mischen', 'swipen', 'challenge']);
  assert.equal(G.GAMES[3].t(), 'Challenge');
  assert.match(read('circle-games.css'), /grid-template-columns:repeat\(4,1fr\)/);
});

test('calendar weeks (ISO) are right across the year change', () => {
  const G = load().LowiCircleGames;
  assert.equal(G.isoWeek(new Date(2026, 10, 8)).key, '2026-W45');
  assert.equal(G.isoWeek(new Date(2026, 10, 9)).key, '2026-W46');
  assert.equal(G.isoWeek(new Date(2027, 0, 1)).key, '2026-W53');
  assert.equal(G.isoWeek(new Date(2027, 0, 4)).key, '2027-W01');
});

test('the newest plan whose week has come runs; a later one takes over by itself', () => {
  const W = load(), G = W.LowiCircleGames;
  assert.equal(G.challengeNow(new Date(2026, 10, 8)).id, 'fakeaway');
  assert.equal(G.challengeNow(new Date(2026, 9, 1)), null, 'nothing before the first week');
  G.CHALLENGES.push({ from: '2026-W48', id: 'next' });
  assert.equal(G.challengeNow(new Date(2026, 10, 20)).id, 'fakeaway');
  assert.equal(G.challengeNow(new Date(2026, 10, 24)).id, 'next');
});

test('tapping Challenge opens the plan with the week number and does not switch the game', () => {
  const W = load(), G = W.LowiCircleGames;
  G.select('challenge');
  assert.ok(W.opened && W.opened.ch >= 1 && W.opened.ch <= 53);
  assert.equal(G.current(), 'billard');
});

test('the page shows the challenge label only when opened from the app with a week', () => {
  const sp = read('store-picks.js'), app = read('tools/fakeaway/src/p4_app.js'), html = read('fakeaway/index.html');
  assert.match(sp, /\(ch \? '&amp;ch=' \+ ch : ''\)/);
  assert.match(app, /if \(q\.get\('app'\) === '1' && \/\^\\d\{1,2\}\$\/\.test\(ch \|\| ''\)\) cur0\.ch = \+ch;/);
  assert.ok(html.includes("'Wochen-Challenge \\u00b7 KW\\u00a0'"), 'built page is up to date');
});
