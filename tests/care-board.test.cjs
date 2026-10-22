/* Care board + Misty's growth (Oct 17, 2026): the XP leaderboard and the Bronze / Silver / Gold VIP / courses / 1:1 mentoring
   unlocks are gone; the board ranks the sunbeams Misty got from you, and the level map shows what levels 1-6 really give. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const CB = require('../care-board-core.js');
const SUN = require('../sun-meter.js');
const at = (d, h) => new Date(2026, 9, d, h || 9).getTime(); /* Oct 2026: Mon 12 ... Sun 18 */

test('a day counts the sun meter\'s sunbeams, never more than 12', () => {
  const L = [];
  for (let i = 0; i < 10; i++) L.push({ ts: at(12, 8) + i * 60000, src: 'meal', amt: 10 });   /* meals cap at 9 */
  for (let i = 0; i < 10; i++) L.push({ ts: at(12, 12) + i * 60000, src: 'move', amt: 10 });  /* moves cap at 8 */
  const c = CB.care(L, 'w', at(12, 20), SUN.model);
  assert.strictEqual(c.pts, 12); assert.strictEqual(c.full, 1); assert.strictEqual(c.today, 12); assert.strictEqual(c.days, 1);
  assert.strictEqual(c.key, '2026-10-12');
});

test('the week runs Monday to today and adds each day; the month starts on the 1st', () => {
  const L = [{ ts: at(12), src: 'meal', amt: 10 }, { ts: at(13), src: 'water', amt: 5 }, { ts: at(13, 10), src: 'water', amt: 5 }, { ts: at(5), src: 'meal', amt: 10 }];
  const w = CB.care(L, 'w', at(14, 18), SUN.model);
  assert.strictEqual(w.pts, 3 + 2); assert.strictEqual(w.days, 3); assert.strictEqual(w.full, 0); assert.strictEqual(w.today, 0);
  const m = CB.care(L, 'm', at(14, 18), SUN.model);
  assert.strictEqual(m.pts, 3 + 3 + 2); assert.strictEqual(m.days, 14); assert.strictEqual(m.key, '2026-10');
  /* the tap / combo / full-sun bonus XP never adds sunbeams */
  const q = CB.care([{ ts: at(14), src: 'tap', amt: 50 }, { ts: at(14), src: 'sun-full', amt: 10 }], 'w', at(14, 18), SUN.model);
  assert.strictEqual(q.pts, 0);
});

test('cloud rows: tagged key carries the period and full-sun days; old XP rows never mix in', () => {
  const now = at(14, 18);
  assert.strictEqual(CB.tag('2026-10-12', 2), 'care1:2026-10-12:2');
  assert.deepStrictEqual(CB.untag('care1:2026-10:5'), { key: '2026-10', full: 5 });
  assert.strictEqual(CB.untag('2026-10-12'), null);
  const fresh = { n: 'A', xpw: 30, wk: 'care1:2026-10-12:2', xpm: 70, mo: 'care1:2026-10:4' };
  assert.deepStrictEqual(CB.scoreOf(fresh, 'w', now), { pts: 30, full: 2 });
  assert.deepStrictEqual(CB.scoreOf(fresh, 'm', now), { pts: 70, full: 4 });
  /* an older build still writes weekly XP with a bare date: not counted */
  assert.deepStrictEqual(CB.scoreOf({ n: 'B', xpw: 900, wk: '2026-10-12' }, 'w', now), { pts: 0, full: 0 });
  /* last week's sunbeams don't count this week; nothing beyond 12 a day so far */
  assert.deepStrictEqual(CB.scoreOf({ n: 'C', xpw: 50, wk: 'care1:2026-10-05:3' }, 'w', now), { pts: 0, full: 0 });
  assert.strictEqual(CB.scoreOf({ n: 'D', xpw: 999, wk: 'care1:2026-10-12:9' }, 'w', now).pts, 36);
});

test('ranking: most sunbeams, then more full-sun days, then the higher level; zero is left off; bots get made-up numbers within reach', () => {
  const now = at(14, 18), mine = { w: { pts: 20, full: 1 }, m: { pts: 20, full: 1 } };
  const people = [
    { n: 'Low', xpw: 5, wk: 'care1:2026-10-12:0', lv: 6 },
    { n: 'Tie', xpw: 20, wk: 'care1:2026-10-12:0', lv: 6 },
    { n: 'Zero', xpw: 0, wk: 'care1:2026-10-12:0' },
    { n: 'You', me: true, lv: 1 },
  ];
  const r = CB.rank(people, 'w', now, mine).map(x => x.p.n);
  assert.deepStrictEqual(r, ['You', 'Tie', 'Low']);
  for (const n of ['Mara', 'Jules', 'Ivy']) { const d = CB.demo(n, 'w', now); assert.ok(d.pts > 0 && d.pts <= 36 && d.full <= 3, n + ' ' + JSON.stringify(d)); }
});

test('the old VIP channel, courses / video modules and 1:1 mentoring unlocks are gone from the app', () => {
  const h = R('index.html').replace(/\/\*[\s\S]*?\*\//g, ''); /* code and copy, not the history in comments */
  for (const s of ['VIP channel', '1:1 mentoring', 'Video modules', 'openVip', 'openCourses', 'openMentor', 'vip_messages', 'course_modules', 'mentoring_requests', 'VIP, courses, 1:1', 'r3m-tcs3'])
    assert.ok(!h.includes(s), 'still in index.html: ' + s);
  const lv = h.slice(h.indexOf('<script id="r3mjs">'), h.indexOf('</script>', h.indexOf('<script id="r3mjs">')));
  for (const s of ['Bronze', 'Silver', 'Gold \u00b7', 't-bronze', 'r3m-rim', 'data-r3m-tier']) assert.ok(!lv.includes(s), 'growth map still has ' + s);
  /* the growth map reads the real definitions: Misty's forms, the Adventure reach and the bubble glows */
  assert.ok(lv.includes('h.STAGES') && lv.includes('a.TIERS') && lv.includes('h.AURAS'));
  assert.ok(lv.includes('window.LowiLevels = {open:openMap'));
});

test('wired in: the core loads, the offline cache has it, the board and profile push use it', () => {
  const h = R('index.html'), sw = R('sw.js');
  assert.match(h, /<script src="care-board-core\.js\?v=[^"]+"><\/script>/);
  assert.ok(sw.includes('"care-board-core.js"'));
  assert.ok(h.includes('<h2>Care board</h2>') && h.includes('data-r3cb="sun"'));
  assert.ok(h.includes('wk:careTag(m.care.w)') && h.includes('mo:careTag(m.care.m)'));
  assert.ok(!/xpw:periodXP|function periodXP/.test(h), 'weekly XP leaderboard code removed');
  /* the compact Community tile now opens Misty's growth */
  assert.ok(h.includes('<b>Misty\\\'s growth</b><small>Forms, glows, adventures</small>') && h.includes('LowiLevels.open({scrollToMe:true})'));
});

test('bots show a Misty level 1-6 that matches their companion stage, and stay labelled as bots', () => {
  assert.strictEqual(CB.shownLevel({ n: 'Mateo', lv: 1, bot: true }), 1);
  assert.strictEqual(CB.shownLevel({ n: 'Jonas', lv: 18, bot: true }), 4);
  assert.strictEqual(CB.shownLevel({ n: 'Samir', lv: 43, bot: true }), 6);
  // Oct 22, 2026: real people go up to the one level table's top (world-home-core.js STAGES, 25 since evolution step 1), not a separate cap of 6
  assert.strictEqual(CB.shownLevel({ n: 'Real', lv: 9 }), 9);
  assert.strictEqual(CB.shownLevel({ n: 'Real', lv: 43 }), 25);
  assert.strictEqual(CB.shownLevel({ n: 'Real', lv: 3 }), 3);
  const html = R('index.html');
  assert.match(html, /n:"Mateo"[^}]*lv:1, shownLv:1/);
  assert.match(html, /n:"Jonas"[^}]*lv:18, shownLv:4/);
  assert.match(html, /n:"Samir"[^}]*lv:43, shownLv:6/);
  assert.match(html, /levelStart\(b\.shownLv\)/);
  assert.match(html, /'Lv ' \+ lvShow\(p\)/);
  assert.match(html, /botTag\(p\) \+ '<\/b><small>'/);
  assert.doesNotMatch(html, /'Lv ' \+ \(p\.lv \|\| 1\)/);
});
