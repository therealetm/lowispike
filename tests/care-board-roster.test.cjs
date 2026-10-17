/* Care board roster (Oct 18, 2026). Emmanuel, monthly Care board on his iPhone: "email number one, email number two,
   Samuel number three, Jonas number four, email number five, which is actually me, my real profile ... six is Mateo".
   Cause found in the live profiles table: two other accounts were also named "eman" (test-browser sessions with the same
   name), and the board listed every cloud row by account, while Community already shows one body per name and keeps
   your own name for you. These rows are the live data (ids shortened), scored at 00:58 on Oct 18 in Flensburg. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
process.env.TZ = 'Europe/Berlin';
const C = require('../care-board-core.js');

const NOW = new Date('2026-10-18T00:58:00+02:00').getTime();
const bots = [
  { n: 'Mateo', lv: 1, shownLv: 1, bot: true },
  { n: 'Jonas', lv: 18, shownLv: 4, bot: true },
  { n: 'Samir', lv: 43, shownLv: 6, bot: true }
];
const cloud = [
  { n: 'eman', uid: 'ca2b5daf', lv: 4, xp: 940, wk: 'care1:2026-10-12:6', xpw: 72, mo: 'care1:2026-10:17', xpm: 204 },
  { n: 'eman', uid: '01aa50e7', lv: 4, xp: 940, wk: 'care1:2026-10-12:6', xpw: 72, mo: 'care1:2026-10:17', xpm: 204 },
  { n: 'Eman', uid: 'a6c84e7e', lv: 2, xp: 120, wk: '2026-10-12', xpw: 0, mo: '2026-10', xpm: 0 },
  { n: 'Joseph Castellar', uid: '06f0a8ee', lv: 3, xp: 313, wk: 'care1:2026-10-12:2', xpw: 30, mo: 'care1:2026-10:3', xpm: 60 },
  { n: 'Q', uid: 'f4f8fbf8', lv: 1, xp: 5, wk: 'care1:2026-10-12:0', xpw: 5, mo: 'care1:2026-10:0', xpm: 5 },
  { n: 'Emma', uid: 'e1', lv: 1, xp: 0, wk: 'care1:2026-10-12:0', xpw: 9, mo: 'care1:2026-10:0', xpm: 9 },
  { n: 'Emma', uid: 'e2', lv: 2, xp: 50, wk: 'care1:2026-10-12:0', xpw: 3, mo: 'care1:2026-10:0', xpm: 3 }
];
const me = { n: 'eman', uid: '83077af7', lv: 5, me: true };
const mine = { w: { pts: 56, full: 4 }, m: { pts: 86, full: 6 } };
const all = cloud.concat(bots, [me]);

test('roster: nobody else wears your name, so the board shows you once', () => {
  const r = C.roster(all);
  const emans = r.filter(p => p.n.trim().toLowerCase() === 'eman');
  assert.strictEqual(emans.length, 1);
  assert.strictEqual(emans[0].me, true);
});

test('roster: one row per name for other people, the highest level kept', () => {
  const r = C.roster(all);
  const emma = r.filter(p => p.n === 'Emma');
  assert.strictEqual(emma.length, 1);
  assert.strictEqual(emma[0].uid, 'e2');
});

test('roster: every real person with their own name and all three demo bots stay', () => {
  const names = C.roster(all).map(p => p.n).sort();
  assert.deepStrictEqual(names, ['Emma', 'Jonas', 'Joseph Castellar', 'Mateo', 'Q', 'Samir', 'eman']);
});

test('roster: a bot steps aside when a real person has its name', () => {
  const r = C.roster(all.concat([{ n: 'Jonas', uid: 'real-jonas', lv: 2, xp: 10 }]));
  const j = r.filter(p => p.n === 'Jonas');
  assert.strictEqual(j.length, 1);
  assert.strictEqual(j[0].uid, 'real-jonas');
});

test('roster: rows without a name are left out, and the input is not changed', () => {
  const list = all.concat([{ n: '', uid: 'blank', lv: 1 }, { n: '   ', uid: 'blank2', lv: 1 }]);
  const before = JSON.stringify(list);
  const r = C.roster(list);
  assert.ok(!r.some(p => p.uid === 'blank' || p.uid === 'blank2'));
  assert.strictEqual(JSON.stringify(list), before);
  assert.deepStrictEqual(C.roster(null), []);
});

test('monthly board from the live rows: you, then the bots and friends, no copies of you', () => {
  const order = C.rank(C.roster(all), 'm', NOW, mine).map(x => x.p.n + (x.p.me ? '*' : ''));
  assert.strictEqual(order.filter(n => /^eman/i.test(n)).length, 1);
  assert.ok(order.includes('eman*'));
  assert.ok(order.includes('Joseph Castellar'));
  assert.deepStrictEqual(order.filter(n => ['Samir', 'Jonas', 'Mateo'].includes(n)), ['Samir', 'Jonas', 'Mateo']);
});

test('index.html ranks the care board through the roster', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const line = html.split('\n').find(l => l.startsWith('function ranked(k)'));
  assert.ok(line, 'ranked() exists');
  assert.match(line, /\.roster\(/);
});
