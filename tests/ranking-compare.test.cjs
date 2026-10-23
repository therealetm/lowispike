'use strict';
/* 23 Oct 2026 (Eman, with screenshots: Week has Joseph #1 with 29 ☀ and him #2 with 26, Month has him #1 with 62 and Joseph 40):
   "it has to be clear WHY ... a top 3 stats comparison, so that the All time #1 can also look at Weekly and see exactly what he
   would have to do, and in what time frame, to beat the other person." Also the profile card's "Next: Level 6 · Legend" running
   down the edge one letter per line, and "Tide Guardian · Lv…" cut off. Rules: ranking-core.js. Page: ranking.js. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const CB = require('../care-board-core.js');
const K = require('../ranking-core.js');
const SUN = require('../sun-meter.js');

const NOW = new Date(2026, 9, 23, 15).getTime();   /* Fri 23 Oct 2026, 3 PM: week from Mon 19, month from Oct 1 */
const at = (d, h, m) => new Date(2026, 9, d, h, m || 0).getTime();
const tags = now => ({ wk: CB.tag(CB.periodKey('w', now), 0), mo: CB.tag(CB.periodKey('m', now), 0) });
const person = (n, w, m, xp, extra, now) => Object.assign({ n, uid: 'u-' + n, xpw: w, xpm: m, xp, lv: 0 }, tags(now || NOW), extra || {});

test('span: Week is Monday to Sunday, Month the 1st to the last day; days so far, days left, most possible so far', () => {
  const w = K.span('w', NOW), m = K.span('m', NOW);
  assert.strictEqual(CB.dayKey(w.start), '2026-10-19'); assert.strictEqual(CB.dayKey(w.end), '2026-10-25');
  assert.deepStrictEqual([w.soFar, w.left, w.total, w.max], [5, 2, 7, 60]);
  assert.strictEqual(CB.dayKey(m.start), '2026-10-01'); assert.strictEqual(CB.dayKey(m.end), '2026-10-31');
  assert.deepStrictEqual([m.soFar, m.left, m.total, m.max], [23, 8, 31, 276]);
  assert.strictEqual(K.span('all', NOW), null, 'All time has no stretch');
  assert.strictEqual(CB.dayKey(K.span('m', new Date(2026, 1, 10).getTime()).end), '2026-02-28');
});

/* a busy ledger: more than 12 a day on some days, more meals than their ceiling, older days outside the week */
function busy() {
  const L = [];
  for (let d = 1; d <= 23; d++) {
    ['meal', 'meal', 'meal', 'meal', 'move:est', 'water', 'water', 'scan', 'water', 'macro-goal', 'fast-16'].forEach((s, j) => {
      if ((d * 7 + j) % 3) L.push({ ts: at(d, 8, j * 7), src: s, amt: 10, label: s });
    });
  }
  L.push({ day: '2026-10-21', src: 'water', amt: 5 });          /* a day-only entry counts on its day, like the sun meter */
  L.push({ ts: at(24, 9), src: 'meal', amt: 10 });             /* tomorrow: never counted */
  return L;
}

test('mix: the parts add up to exactly the board score (same rule as the sun meter: per-habit ceiling, then 12 a day)', () => {
  const L = busy();
  for (const k of ['w', 'm']) {
    const a = K.mix(L, k, NOW, SUN), b = CB.care(L, k, NOW, SUN.model);
    assert.strictEqual(a.pts, b.pts, k + ' total'); assert.strictEqual(a.full, b.full, k + ' full-sun days'); assert.strictEqual(a.today, b.today, k + ' today');
    assert.strictEqual(Object.values(a.src).reduce((x, y) => x + y, 0), a.pts, k + ': parts add up');
    assert.ok(a.src.meal <= SUN.CAP.meal * a.days, 'meals never beyond their daily ceiling');
    assert.strictEqual(a.key, CB.periodKey(k, NOW));
  }
  assert.strictEqual(K.mix(L, 'all', NOW, SUN).pts, 0, 'All time is XP, not sunbeams');
  assert.strictEqual(K.mix(L, 'w', NOW, null).pts, 0, 'no sun meter: nothing invented');
});

test('mix: today\'s room is what each habit can still add today, never more than the sun has left', () => {
  const L = [{ ts: at(23, 8), src: 'meal', amt: 10 }, { ts: at(23, 9), src: 'move:est', amt: 10, mq: 4 }];
  const x = K.mix(L, 'w', NOW, SUN);
  assert.deepStrictEqual([x.today, x.todayRoom], [7, 5]);
  assert.strictEqual(x.room.meal, 5); assert.strictEqual(x.room.move, 4); assert.strictEqual(x.room.water, 4);
  const full = K.mix(Array.from({ length: 6 }, (_, i) => ({ ts: at(23, 8, i), src: i % 2 ? 'meal' : 'move:est', amt: 1, mq: 4 })), 'w', NOW, SUN);
  assert.strictEqual(full.todayRoom, 0); assert.ok(Object.values(full.room).every(v => v === 0));
});

test('plan: the smallest action that is enough, else the biggest, only from what still has room today', () => {
  const P = SUN.PTS, room = { move: 8, meal: 9, scan: 6, water: 4, fast: 6, macro: 4 };
  assert.deepStrictEqual(K.plan(4, room, 12, P), { acts: { move: 1 }, pts: 4 });
  assert.deepStrictEqual(K.plan(1, room, 12, P), { acts: { water: 1 }, pts: 1 });
  assert.deepStrictEqual(K.plan(3, room, 12, P), { acts: { meal: 1 }, pts: 3 });
  assert.deepStrictEqual(K.plan(7, room, 12, P), { acts: { move: 1, meal: 1 }, pts: 7 });
  assert.deepStrictEqual(K.plan(20, room, 12, P).pts, 12, 'never past today\'s 12');
  assert.deepStrictEqual(K.plan(4, { meal: 9 }, 12, P), { acts: { meal: 2 }, pts: 4 }, 'no Move room: two meals');
  assert.deepStrictEqual(K.plan(4, room, 0, P), { acts: {}, pts: 0 }, 'sun already full');
});

/* Eman's screenshots, 23 Oct: Week Joseph 29 / Eman 26 / Christabel 18, Month Eman 62 / Joseph 40, All time two at 2,400, Eman 1,878 */
function screenshot(now) {
  return [
    Object.assign(person('Eman', 0, 0, 1878, { lv: 5 }, now), { me: true }),
    person('Joseph Castellar', 29, 40, 719, { lv: 4 }, now),
    person('Christabel', 18, 18, 400, { lv: 3 }, now),
    person('Koji', 0, 0, 2400, { lv: 6 }, now),
    person('Fernando', 0, 0, 2400, { lv: 6 }, now)
  ];
}
const MINE = { w: { pts: 26, full: 0 }, m: { pts: 62, full: 1 } };

test('across: the same people on every board, so it is clear why Week, Month and All time differ', () => {
  const ppl = screenshot(NOW), me = ppl[0], jo = ppl[1];
  const a = K.across(ppl, NOW, MINE, me), b = K.across(ppl, NOW, MINE, jo);
  assert.deepStrictEqual([a.w.rank, a.w.pts, a.m.rank, a.m.pts, a.all.rank, a.all.pts], [2, 26, 1, 62, 3, 1878]);
  assert.deepStrictEqual([b.w.rank, b.w.pts, b.m.rank, b.m.pts, b.all.rank, b.all.pts], [1, 29, 2, 40, 4, 719]);
  assert.strictEqual(K.across(ppl, NOW, MINE, { uid: 'u-nobody', n: 'Nobody' }).w.rank, 0, 'not on a board: no place');
});

test('gap: Week, you need 4 more by Sunday to pass Joseph, and a Move does it today', () => {
  const ppl = screenshot(NOW), list = K.rows(ppl, 'w', NOW, MINE), rv = K.rival(list, 'w');
  assert.strictEqual(rv.them.p.n, 'Joseph Castellar');
  const mx = K.mix([{ ts: at(23, 8), src: 'meal', amt: 10 }], 'w', NOW, SUN);
  const g = K.gap(rv.me, rv.them, 'w', NOW, { mix: mx, PTS: SUN.PTS });
  assert.strictEqual(g.need, 4); assert.strictEqual(CB.dayKey(g.end), '2026-10-25');
  assert.ok(g.possible); assert.deepStrictEqual(g.today, { acts: { move: 1 }, pts: 4 }); assert.strictEqual(g.rest, 0);
  /* a bigger gap than today allows: the rest is spread over the days left, 12 a day at most */
  const far = K.gap({ pts: 2, rank: 2, p: { me: true } }, { pts: 25, rank: 1, p: { n: 'X', uid: 'x' } }, 'w', NOW, { mix: mx, PTS: SUN.PTS });
  assert.deepStrictEqual([far.need, far.today.pts, far.rest, far.restDays], [24, 9, 15, 2]);
  /* out of reach this week */
  const no = K.gap({ pts: 2, rank: 2, p: { me: true } }, { pts: 60, rank: 1, p: { n: 'X', uid: 'x' } }, 'w', NOW, { mix: mx });
  assert.strictEqual(no.possible, false); assert.strictEqual(no.short, 59 - (9 + 24));
});

test('gap: Month, you lead Joseph by 22, he needs 23 by October 31; All time: XP to the one above and your pace', () => {
  const ppl = screenshot(NOW), m = K.rows(ppl, 'm', NOW, MINE), rv = K.rival(m, 'm');
  assert.ok(rv.first); assert.strictEqual(rv.them.p.n, 'Joseph Castellar');
  const g = K.gap(rv.me, rv.them, 'm', NOW, {});
  assert.deepStrictEqual([g.ahead, g.lead, g.theyNeed, g.theyCan, CB.dayKey(g.end)], [true, 22, 23, true, '2026-10-31']);
  const safe = K.gap({ pts: 80, rank: 1, p: { me: true } }, { pts: 2, rank: 2, p: { n: 'X', uid: 'x' } }, 'w', NOW, {});
  assert.strictEqual(safe.theyCan, false, '78 behind with 3 days left: cannot catch up');
  const a = K.rows(ppl, 'all', NOW, MINE), ra = K.rival(a, 'all');
  const ga = K.gap(ra.me, ra.them, 'all', NOW, { pace: 200 });
  assert.deepStrictEqual([ga.unit, ga.need, ga.days], ['xp', 2400 - 1878 + 1, 3]);
  assert.strictEqual(K.gap(ra.me, ra.me, 'all', NOW, {}).self, true);
});

test('gap: a tie is not "lead by 0": you win the tie-break, and it says why (full-sun days, then level, then name)', () => {
  const me = (pts, full, lv) => ({ pts, full, lv, rank: 1, p: { me: true, n: 'eman' } }), them = (pts, full, lv) => ({ pts, full, lv, rank: 2, p: { n: 'X', uid: 'x' } });
  let g = K.gap(me(2400, 0, 9), them(2400, 0, 9), 'all', NOW, {});
  assert.deepStrictEqual([g.ahead, g.lead, g.tie, g.why, g.theyNeed], [true, 0, true, 'name', 1]);
  assert.strictEqual(K.gap(me(2400, 0, 9), them(2400, 0, 5), 'all', NOW, {}).why, 'lv');
  assert.strictEqual(K.gap(me(20, 2, 4), them(20, 1, 4), 'w', NOW, {}).why, 'full');
  assert.strictEqual(K.gap(me(20, 1, 6), them(20, 1, 4), 'm', NOW, {}).why, 'lv');
  g = K.gap(me(21, 1, 4), them(20, 1, 4), 'w', NOW, {});
  assert.deepStrictEqual([g.tie, g.why, g.lead], [false, null, 1]);
});

test('page: a tie says you win the tie-break, never "lead by 0", in English, German and Spanish', () => {
  const now = Date.now(), ppl = screenshot(now), self = ppl.find(p => p.me), lv = K.level(self);
  const jo = ppl.find(p => p.n === 'Joseph Castellar'); jo.xp = K.rows(ppl, 'all', now, MINE).find(x => x.p.me).pts; jo.lv = lv;
  for (const [lg, re] of [['en', /You and Joseph Castellar both have [\d,.]+ XP\. You win the tie-break by name, A to Z\./], ['de', /Du und Joseph Castellar habt beide [\d,.]+ XP\. Bei Gleichstand liegst du vorne, nach dem Namen, A bis Z\./], ['es', /Tú y Joseph Castellar tenéis [\d,.]+ XP\. Ganas el desempate por nombre, de la A a la Z\./]]) {
    const h = page(ppl, { lang: lg }).LowiRanking._compare({ uid: 'u-Joseph Castellar', n: 'Joseph Castellar' }, 'all');
    assert.match(h, re, lg); assert.doesNotMatch(h, /by 0 XP|0 XP vor|0 XP por delante/, lg);
  }
});

test('page: the sun in what it takes is the app\'s own sun icon, labelled "sunbeams", when the icon set is there', () => {
  const now = Date.now(), W = page(screenshot(now), { looks: { 'u-Joseph Castellar': 'GOOD' } });
  W.LowiIcons = { svg: (n, o) => '<svg class="sp-symbol li li-' + n + ' ' + o.cls + '" role="img" aria-label="' + o.label + '"></svg>' };
  const h = W.LowiRanking._compare({ uid: 'u-Joseph Castellar', n: 'Joseph Castellar' }, 'w');
  assert.match(h, /You need 4 <svg class="sp-symbol li li-sun rk-sun" role="img" aria-label="sunbeams"><\/svg> more by/);
  assert.doesNotMatch(h.match(/rk-cmp-need[\s\S]*?<\/section>/)[0], /\u2600/, 'no bare sun left for the emoji pass to strip');
  assert.match(R('ranking.css'), /\.rk-cmp \.rk-sun\{[^}]*color:#ffd666\}/);
});

test('layout: a long form wraps at the space instead of being cut, on the podium and the Your place card (small phone 360px)', () => {
  const css = R('ranking.css');
  assert.match(css, /\.rm-rank \.rk-of\{white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:normal;word-break:keep-all;/);
});

test('rival: off the board you chase place 10 (or 1 point while there is room)', () => {
  const crowd = Array.from({ length: 12 }, (_, i) => person('P' + i, 40 - i, 40 - i, 1000 - i));
  const list = K.rows(crowd.concat([Object.assign(person('Me', 0, 0, 1), { me: true })]), 'w', NOW, { w: { pts: 0, full: 0 } });
  const rv = K.rival(list, 'w');
  assert.ok(rv.off); assert.strictEqual(rv.them.rank, 10);
  assert.strictEqual(K.rival(K.rows(crowd.slice(0, 3), 'w', NOW), 'w').them, null);
});

test('pace: your XP a day over the last 7 days, from the ledger', () => {
  const L = [{ ts: NOW - 864e5, amt: 700 }, { ts: NOW - 3 * 864e5, amt: 700 }, { ts: NOW - 9 * 864e5, amt: 5000 }, { ts: NOW + 1000, amt: 5000 }];
  assert.strictEqual(K.pace(L, NOW), 200);
  assert.strictEqual(K.pace([], NOW), 0);
});

test('shared breakdown: written only for the current periods, read back only when it matches the board score', () => {
  const L = busy(), w = K.mix(L, 'w', NOW, SUN), m = K.mix(L, 'm', NOW, SUN), tag = K.mixTag(w, m);
  assert.match(tag, /^cm1:2026-10-19:\d+(\.\d+){6};2026-10:\d+(\.\d+){6}$/);
  assert.deepStrictEqual(K.mixOf(tag, 'w', NOW, w.pts), w.src);
  assert.deepStrictEqual(K.mixOf(tag, 'm', NOW, m.pts), m.src);
  assert.strictEqual(K.mixOf(tag, 'w', NOW, w.pts + 1), null, 'out of step with the score: nothing shown');
  assert.strictEqual(K.mixOf(tag, 'w', NOW + 7 * 864e5, w.pts), null, 'last week\'s split never shows as this week');
  assert.strictEqual(K.mixOf(tag, 'all', NOW, 0), null);
  assert.strictEqual(K.mixOf('cm1:junk', 'w', NOW, 0), null);
  /* the SQL for the optional column accepts exactly this format and nothing longer */
  const sql = R('supabase/proposals/care_mix_20261023.sql');
  assert.match(sql, /add column if not exists care_mix text/);
  const re = /care_mix ~ '([^']+)'/.exec(sql);
  assert.ok(re, 'format check in SQL'); assert.ok(new RegExp(re[1].replace(/\[0-9\]/g, '\\d')).test(tag), 'SQL format accepts the tag');
});

/* the page: ranking.js in a small window */
function page(people, opts) {
  opts = opts || {};
  const store = { 'lowispike.lang': opts.lang || 'en' }, now = Date.now();
  const win = {
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
    LowiRankingCore: K, LowiCareBoard: CB, LowiSun: SUN,
    LowiR2: { S: () => ({ ledger: [{ ts: now - 60000 > new Date(new Date(now).setHours(0, 0, 0, 0)).getTime() ? now - 60000 : now, src: 'meal', amt: 10 }] }) },
    LowiR3: { everyone: () => people, me: () => ({ care: MINE }) },
    LowiCompanionCore: {
      MAX_ST: 9, decode: c => (c === 'GOOD' ? { st: 3, el: 'water', nm: 'Tide' } : null), miniSVG: (g, key) => '<svg data-k="' + key + '"></svg>',
      genome: (o, st) => ({ st, el: 'bot' }), formName: st => 'Guardian'
    },
    LowiCompanion: { friendLooks: () => opts.looks || {}, genome: () => ({ st: 5, el: 'air', nm: 'Misty Comet' }), prefs: () => ({ share: true }) }
  };
  win.window = win;
  vm.runInNewContext(R('ranking.js'), { window: win, document: { getElementById: () => null }, localStorage: win.localStorage, setTimeout: () => 0, console });
  return win;
}

test('page: every board says what it counts; Compare the top 3 sits under the podium; tapping a companion opens the comparison', () => {
  const now = Date.now(), W = page(screenshot(now));
  const h = W.LowiRanking._html();
  assert.match(h, /<p class="rk-per">Week counts the sunbeams since Monday, [^<]+\. Up to 12 a day, so \d+ at most so far\. It starts again on Monday\.<\/p>/);
  assert.match(h, /rk-pod n3[\s\S]*?<button type="button" class="rk-cmpb" data-rk="cmp3"[^>]*><span>Compare the top 3<\/span>/);
  const src = R('ranking.js');
  assert.match(src, /if \(t\.dataset\.rk === 'open'\) \{ openCmp\(t\.dataset\.me === '1' \? null : \{ uid: t\.dataset\.uid \|\| '', n: t\.dataset\.who \|\| '' \}, t\); \}/);
  assert.match(src, /else if \(a === 'profile'\) \{ const q = \{ uid: t\.dataset\.uid \|\| '', name: t\.dataset\.who \|\| '' \}; closeCmp\(\); try \{ const r = R3\(\); if \(r && r\.open\) r\.open\(q\);/, 'the profile is one tap on');
  for (const [lg, re] of [['de', /Woche zählt die Sonnenstrahlen seit Montag/], ['es', /Semana cuenta los rayos de sol desde el lunes/]]) assert.match(page(screenshot(now), { lang: lg }).LowiRanking._html(), re);
});

test('page: You vs Joseph on Week shows every board, per day, full-sun days, where your sunbeams came from and what it takes', () => {
  const now = Date.now(), W = page(screenshot(now), { looks: { 'u-Joseph Castellar': 'GOOD' } });
  const h = W.LowiRanking._compare({ uid: 'u-Joseph Castellar', n: 'Joseph Castellar' }, 'w');
  assert.match(h, /You vs Joseph Castellar/);
  assert.match(h, /<tr class="cur"><th scope="row">Week<small>☀<\/small><\/th><td class=""><b class="num">26<\/b><small>#2<\/small><\/td><td class=" win"><b class="num">29<\/b><small>#1<\/small>/);
  assert.match(h, /<th scope="row">Month<small>☀<\/small><\/th><td class=" win"><b class="num">62<\/b><small>#1<\/small>/);
  assert.match(h, /<th scope="row">All time<small>XP<\/small><\/th><td class=" win"><b class="num">1,878<\/b><small>#3<\/small>/);
  assert.match(h, /Per day/); assert.match(h, /Full-sun days/);
  assert.match(h, /Before Monday this month: you 36 ☀, Joseph Castellar 11 ☀\./, 'why Month and Week disagree');
  assert.match(h, /Where the sunbeams came from[\s\S]*?Meals/);
  assert.match(h, /Joseph Castellar(?:'|&#39;)s app shares only the total and the full-sun days, not where each sunbeam came from\./);
  assert.match(h, /You need 4 ☀ more by [^<]+ to pass Joseph Castellar, if Joseph Castellar adds none\. Today this does it: a Move \(\+4\)\./);
  assert.match(h, /Why the boards differ/);
  assert.match(h, /data-cmp="profile" data-uid="u-Joseph Castellar"/);
  /* Month: you lead */
  assert.match(W.LowiRanking._compare({ uid: 'u-Joseph Castellar', n: 'Joseph Castellar' }, 'm'), /You lead Joseph Castellar by 22 ☀\. Joseph Castellar needs 23 more by [^<]+ to pass you\./);
  /* All time: XP */
  assert.match(W.LowiRanking._compare({ uid: 'u-Koji', n: 'Koji' }, 'all'), /You need 523 XP more to pass Koji\./);
});

test('page: their breakdown shows only when they share their companion and it matches their score; hidden shows only the total', () => {
  const now = Date.now(), W = page(screenshot(now), { looks: { 'u-Joseph Castellar': 'GOOD' } });
  const wkey = CB.periodKey('w', now), mkey = CB.periodKey('m', now);
  W.LowiRanking._mixes({ 'u-Joseph Castellar': 'cm1:' + wkey + ':9.3.12.0.2.3.0;' + mkey + ':12.3.16.0.2.7.0', 'u-Christabel': 'cm1:' + wkey + ':9.3.4.0.0.2.0;' + mkey + ':9.3.4.0.0.2.0' });
  const h = W.LowiRanking._compare({ uid: 'u-Joseph Castellar', n: 'Joseph Castellar' }, 'w');
  assert.match(h, /<ul class="rk-src two">/); assert.doesNotMatch(h, /shares only the total/);
  const hid = W.LowiRanking._compare({ uid: 'u-Christabel', n: 'Christabel' }, 'w');
  assert.doesNotMatch(hid, /rk-src two/, 'hidden companion: their split is never shown');
  assert.match(hid, /Christabel hides their companion, so only the total shows\./);
});

test('page: the top 3 side by side, with you added below, every board\'s number and place, and what it takes on each board', () => {
  const now = Date.now(), ppl = screenshot(now).concat([person('Ana', 27, 30, 100, null, now), person('Bo', 28, 30, 100, null, now)]);
  const h = page(ppl).LowiRanking._compare(null, 'w');
  assert.match(h, /Top 3 side by side/);
  const body = h.slice(h.indexOf('<tbody>'), h.indexOf('</tbody>'));
  assert.deepStrictEqual([...body.matchAll(/rk-cmp-rk num">(\d+)</g)].map(x => x[1]), ['1', '2', '3', '4'], 'top 3 and you (4th)');
  assert.match(body, /<tr class="me">/); assert.strictEqual((body.match(/data-cmp="pair"/g) || []).length, 3);
  assert.match(h, /What it takes for you<\/h4><ul><li class="cur"><b>Week<\/b> You need 2 ☀ more by [^<]+ to pass Ana/);
  assert.match(h, /<li class=""><b>Month<\/b> You lead Joseph Castellar by 22/);
  assert.match(h, /<li class=""><b>All time<\/b> You need 523 XP more to pass/);
  assert.match(page(ppl, { lang: 'de' }).LowiRanking._compare(null, 'w'), /Top 3 im Vergleich[\s\S]*Was du brauchst/);
  assert.match(page(ppl, { lang: 'es' }).LowiRanking._compare(null, 'w'), /El top 3, lado a lado[\s\S]*Lo que te hace falta/);
});

test('every string of the comparison exists in English, German and Spanish', () => {
  const src = R('ranking.js');
  const keys = ['perW', 'perM', 'perA', 'cmp3', 'cmpT3', 'vs', 'profile', 'boards', 'perDay', 'fullDays', 'before', 'whyGen', 'srcT', 'srcNone', 'srcHid', 'needT', 'needYou', 'pass', 'today', 'todayPart', 'todayFull', 'rest1', 'restN', 'noWay', 'lead', 'leadSafe', 'passA', 'pace1', 'paceN', 'leadA', 'tie', 'tieSafe', 'tieA', 'tb_full', 'tb_lv', 'tb_name', 'inW', 'inA', 'alone',
    's_meal', 's_scan', 's_move', 's_fast', 's_macro', 's_water', 's_other', 'a_move', 'a_meal', 'a_scan', 'a_water', 'a_fast', 'a_macro', 'n_move', 'n_meal', 'n_scan', 'n_water', 'n_fast', 'n_macro'];
  for (const k of keys) assert.match(src, new RegExp('\\b' + k + ": \\['[^']*(?:\\\\'[^']*)*', '[^']*(?:\\\\'[^']*)*', '[^']*(?:\\\\'[^']*)*'\\]"), k + ' in three languages');
});

test('privacy + quiet sync: the split is only sent while you share your companion, and stops for good when the column is missing', () => {
  const src = R('ranking.js');
  assert.match(src, /const v = shared\(\) \? K\.mixTag\(w, m\) : null/);
  assert.match(src, /update\(\{ care_mix: v \}\)\.eq\('id', st\.uid\)/);
  assert.match(src, /if \(r\.error\) \{ if \(noCol\(r\.error\)\) colMissing\(\); return; \}/);
  assert.match(src, /if \(mixCol === 'no' \|\| mixBusy/);
  assert.doesNotMatch(R('index.html').match(/sb\.from\("profiles"\)\.select\("[^"]*"\)/g).join(' '), /care_mix/, 'the main people list never asks for the optional column');
});

test('layout: "Next: Level 6 · Legend" gets its own row below the 25 dots; form and level wrap instead of being cut', () => {
  const html = R('index.html');
  assert.match(html, /\.r3m-hint\{display:flex;flex-wrap:wrap;/);
  assert.match(html, /\.r3m-hb\{display:flex;flex-wrap:wrap;gap:4px;flex:1 1 100%;min-width:0\}/);
  assert.match(html, /\.r3m-hint>span:nth-child\(2\)\{flex:1 1 0;min-width:0;overflow-wrap:normal;word-break:normal\}/);
  const css = R('ranking.css');
  assert.match(css, /\.rm-rank \.rk-own\{white-space:normal;overflow:visible;text-overflow:clip\}/);
  assert.match(css, /\.rm-rank \.rk-pod-i \.rk-own\{display:flex;flex-direction:column;align-items:center\}/);
  const now = Date.now(), h = page(screenshot(now), { looks: { 'u-Joseph Castellar': 'GOOD' } }).LowiRanking._html();
  assert.match(h, /<small class="rk-own"><span class="rk-of">Guardian<\/span><span class="rk-sep"> · <\/span><span class="rk-ol">Lv 4<\/span><\/small>/);
});
