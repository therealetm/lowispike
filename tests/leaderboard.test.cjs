/* Community strength leaderboard (Oct 22 2026). Emmanuel: "a leaderboard in our community, so it becomes like a competition game.
   You can see which companion is the strongest, who's number one, place one, two, three." Ranks only app XP and level (never
   weight or BMI), checks every row against the daily XP ceiling, and respects "Show me on the leaderboard". */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
process.env.TZ = 'Europe/Berlin';
const L = require('../leaderboard-core.js');
const CB = require('../care-board-core.js');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const NOW = new Date('2026-10-22T14:30:00+02:00').getTime(); /* Thursday: 4 days of the week so far */
const wk = (x, h) => L.tag('care1:2026-10-19:2', { wxp: x, hide: h });

test('the week starts Monday 00:00 phone time, the same week as the Care board', () => {
  assert.strictEqual(L.weekKey(NOW), '2026-10-19');
  assert.strictEqual(L.weekKey(NOW), CB.periodKey('w', NOW));
  assert.strictEqual(L.daysSoFar(NOW), 4);
  assert.strictEqual(L.weekKey(new Date('2026-10-26T00:00:30+01:00').getTime()), '2026-10-26');
});

test('your week XP is summed from your ledger since Monday only', () => {
  const led = [{ ts: new Date('2026-10-18T23:59:00+02:00').getTime(), amt: 500 }, { ts: new Date('2026-10-19T00:01:00+02:00').getTime(), amt: 40 }, { ts: NOW - 6e5, amt: 25 }, { ts: NOW - 1e3, amt: -10 }];
  assert.strictEqual(L.weekXP(led, NOW), 65);
});

test('the wk text keeps the care part and the Care board still reads it', () => {
  const t = wk(340);
  assert.strictEqual(t, 'care1:2026-10-19:2:x340');
  assert.deepStrictEqual(CB.untag(t), { key: '2026-10-19', full: 2 });
  assert.deepStrictEqual(CB.untag(wk(5, true)), { key: '2026-10-19', full: 2 });
  assert.deepStrictEqual(L.parse(wk(5, true)), { key: '2026-10-19', full: 2, wxp: 5, hide: true });
  assert.strictEqual(L.tag(t, { wxp: 400, now: NOW }), 'care1:2026-10-19:2:x400', 'a second tag replaces the old suffix');
  assert.deepStrictEqual(L.parse('care1:2026-10-19:2'), { key: '2026-10-19', full: 2, wxp: null, hide: false }, 'older builds: no week XP yet');
});

test('levels are worked out from XP, never taken from the row', () => {
  assert.strictEqual(L.levelFor(0), 1);
  const r = L.rank([{ n: 'A', uid: 'a', xp: 100, lv: 99, wk: wk(50) }], 'strong', NOW, null);
  assert.strictEqual(r.rows[0].lv, L.levelFor(100));
});

test('ranking: This week by week XP, Strongest by all-time XP, podium order 1-2-3', () => {
  const list = [
    { n: 'Mia', uid: 'm', xp: 3000, wk: wk(120) },
    { n: 'Ben', uid: 'b', xp: 900, wk: wk(600) },
    { n: 'Lea', uid: 'l', xp: 2000, wk: wk(300) },
    { n: 'Old', uid: 'o', xp: 5000, wk: 'care1:2026-10-12:3:x900' }, /* last week: 0 this week */
    { n: 'me', me: true, xp: 0 }
  ];
  const w = L.rank(list, 'week', NOW, { xp: 1500, wxp: 200 });
  assert.deepStrictEqual(w.rows.map(r => r.p.n), ['Ben', 'Lea', 'me', 'Mia']);
  assert.strictEqual(w.me, 2);
  const s = L.rank(list, 'strong', NOW, { xp: 1500, wxp: 200 });
  assert.deepStrictEqual(s.rows.map(r => r.p.n), ['Old', 'Mia', 'Lea', 'me', 'Ben']);
});

test('fair play: numbers above the daily caps never rank', () => {
  const list = [
    { n: 'Honest', uid: 'h', xp: 1200, wk: wk(700) },
    { n: 'Huge', uid: 'x', xp: 99999999, wk: wk(10) },
    { n: 'WeekFaker', uid: 'w', xp: 9000, wk: wk(L.DAY_CAP * 4 + 1) },
    { n: 'MoreThanTotal', uid: 't', xp: 100, wk: wk(300) },
    { n: 'Jumper', uid: 'j', xp: 8000, wk: wk(100) },
    { n: 'Neg', uid: 'n', xp: -50, wk: wk(0) }
  ];
  const seen = p => p.uid === 'j' ? { xp: 1000, t: NOW - 864e5 } : null; /* +7000 in one day */
  const r = L.rank(list, 'strong', NOW, null, { seen });
  assert.deepStrictEqual(r.rows.map(x => x.p.n), ['Honest']);
  assert.deepStrictEqual(r.held.map(x => x.why).sort(), ['bad-xp', 'grew-too-fast', 'week-over-cap', 'week-over-total', 'xp-over-cap']);
  assert.ok(L.check({ xp: 1200, wk: wk(700) }, NOW, { xp: 600, t: NOW - 864e5 }).ok, 'an honest day of growth passes');
});

test('hidden members and demo bots stay off the live board', () => {
  const list = [{ n: 'Hana', uid: 'h', xp: 5000, wk: wk(800, true) }, { n: 'Bot', bot: true }, { n: 'Kai', uid: 'k', xp: 50, wk: wk(20) }, { n: 'me', me: true }];
  assert.deepStrictEqual(L.rank(list, 'strong', NOW, { xp: 10, wxp: 0, hide: true }).rows.map(r => r.p.n), ['Kai']);
  const demo = L.rank(list, 'strong', NOW, { xp: 10 }, { demo: true });
  assert.ok(demo.rows.find(r => r.p.n === 'Bot').demo, 'offline: demo players are marked demo');
});

test('weight, weight lost and BMI never reach the board', () => {
  const ui = read('leaderboard.js'), core = read('leaderboard-core.js');
  for (const src of [ui, core.replace(/never weight[^'"]*/gi, '').replace(/Never weight[^.]*/g, '')]) {
    assert.ok(!/\bp\.w\b|\.weight\b|\bbmi\b|weightLost|\.avatar\b/i.test(src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/'[^'\n]*(BMI|IMC|weight|Gewicht|peso)[^'\n]*'/gi, "''")), 'no weight, BMI or photo field is read');
  }
});

test('wiring: profile row carries the tag, Care board respects hide, hub switch, scripts cached, texts in EN DE ES', () => {
  const html = read('index.html'), sw = read('sw.js'), me = read('community-me.js');
  assert.ok(/LowiLeaderboard\.wkTag\(o\.wk\)/.test(html), 'profileExtra adds the week XP to wk');
  assert.ok(/everyone\(\)\.filter\(p => !\(window\.LowiLeaderboard/.test(html), 'Care board drops hidden members');
  assert.ok(/select\("id,name,[^"]*,look"\)/.test(html) && /look:r\.look/.test(html), 'shared companion looks are read');
  for (const f of ['leaderboard-core.js', 'leaderboard.js', 'leaderboard.css']) { assert.ok(html.includes(f + '?v='), f + ' loaded'); assert.ok(sw.includes('"' + f + '"'), f + ' cached'); }
  assert.ok(/id === 'lbShow'/.test(me) && /data-cme="lbShow"/.test(me), 'profile hub has the switch');
  for (const l of ['en', 'de', 'es']) { const t = L.TX[l]; for (const k of Object.keys(L.TX.en)) assert.ok(t[k], l + ' ' + k); }
});
