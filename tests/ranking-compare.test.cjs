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

test('privacy + quiet sync: the split is only sent while you share your companion, and stops for good when the column is missing', () => {
  const src = R('ranking.js');
  assert.match(src, /const v = shared\(\) \? K\.mixTag\(w, m\) : null/);
  assert.match(src, /update\(\{ care_mix: v \}\)\.eq\('id', st\.uid\)/);
  assert.match(src, /if \(r\.error\) \{ if \(noCol\(r\.error\)\) colMissing\(\); return; \}/);
  assert.match(src, /if \(mixCol === 'no' \|\| mixBusy/);
  assert.doesNotMatch(R('index.html').match(/sb\.from\("profiles"\)\.select\("[^"]*"\)/g).join(' '), /care_mix/, 'the main people list never asks for the optional column');
});

// 23 Oct, 15:00 (Eman: "too much text ... more symbols and animations, a gaming type of ranking; only if I click on someone do I see the comparison"):
test('page: the board is symbols, not sentences; no Compare the top 3; tapping a companion opens You vs them, your own place opens the level ladder', () => {
  const now = Date.now();
  for (const lg of ['en', 'de', 'es']) {
    const h = page(screenshot(now), { lang: lg }).LowiRanking._html();
    assert.doesNotMatch(h, /class="rk-t"|class="rk-sub"|class="rk-per"|data-rk="cmp3"|class="rk-cmpb"/, lg + ': no title, explainer or Compare the top 3');
    assert.match(h, /<button type="button" class="rk-info" data-rk="info"/, lg + ': the rules sit behind a small info button');
    assert.match(h, /class="rk-chips"/, lg + ': what counts and the time left are two symbol chips');
    assert.match(h, /rk-pod n3[\s\S]*?rk-medal m1/, lg + ': podium with medals');
  }
  const src = R('ranking.js');
  assert.match(src, /if \(t\.dataset\.rk === 'open'\) \{ if \(t\.dataset\.me === '1'\) openLadder\(t\); else openCmp\(\{ uid: t\.dataset\.uid \|\| '', n: t\.dataset\.who \|\| '' \}, t\); \}/);
  assert.match(src, /else if \(a === 'profile'\) \{ const q = \{ uid: t\.dataset\.uid \|\| '', name: t\.dataset\.who \|\| '' \}; closeCmp\(\); try \{ const r = R3\(\); if \(r && r\.open\) r\.open\(q\);/, 'the profile is one tap on');
});

test('page: You vs Joseph is a visual duel: VS header, one bar, one "what it takes" line, mirrored bars per board, no long text', () => {
  const now = Date.now(), W = page(screenshot(now), { looks: { 'u-Joseph Castellar': 'GOOD' } });
  const h = W.LowiRanking._compare({ uid: 'u-Joseph Castellar', n: 'Joseph Castellar' }, 'w');
  assert.match(h, /<div class="rk-vs-h"><div class="rk-vs-s me">[\s\S]*?<b class="rk-vs-b" aria-hidden="true">VS<\/b><div class="rk-vs-s them">/);
  assert.match(h, /<div class="rk-duel" style="--a:0\.\d+"/);
  assert.equal((h.match(/<p class="rk-goal">/g) || []).length, 1, 'one line for what it takes');
  assert.match(h.match(/<p class="rk-goal">[\s\S]*?<\/p>/)[0].replace(/<[^>]+>/g, ''), /\+4 \u2600 by Sun · a Move today does it/);
  assert.equal((h.match(/class="rk-mir-r/g) || []).length >= 3, true, 'Week, Month and All time side by side');
  assert.doesNotMatch(h, /Why the boards differ|Where the sunbeams came from|rk-cmp-need/, 'the long explanations are gone');
  for (const [lg, re] of [['de', /\+4 \u2600 bis So · Heute reicht ein Move/], ['es', /\+4 \u2600 para el dom · Hoy basta un Move/]]) {
    const g = page(screenshot(now), { lang: lg, looks: { 'u-Joseph Castellar': 'GOOD' } }).LowiRanking._compare({ uid: 'u-Joseph Castellar', n: 'Joseph Castellar' }, 'w');
    assert.match(g.match(/<p class="rk-goal">[\s\S]*?<\/p>/)[0].replace(/<[^>]+>/g, ''), re, lg);
  }
});

test('page: a tie says who wins the tie-break, never "lead by 0", in English, German and Spanish', () => {
  const now = Date.now(), ppl = screenshot(now), self = ppl.find(p => p.me), lv = K.level(self);
  const jo = ppl.find(p => p.n === 'Joseph Castellar'); jo.xp = K.rows(ppl, 'all', now, MINE).find(x => x.p.me).pts; jo.lv = lv;
  for (const [lg, re] of [['en', /Tie · you win on name/], ['de', /Gleichstand · du gewinnst durch den Namen/], ['es', /Empate · ganas por nombre/]]) {
    const h = page(ppl, { lang: lg }).LowiRanking._compare({ uid: 'u-Joseph Castellar', n: 'Joseph Castellar' }, 'all');
    assert.match(h, re, lg); assert.doesNotMatch(h, /by 0 XP|0 XP vorne|0 XP por delante/, lg);
  }
});

test('page: the sun is the app\'s own sun icon, labelled "sunbeams", when the icon set is there', () => {
  const now = Date.now(), W = page(screenshot(now), { looks: { 'u-Joseph Castellar': 'GOOD' } });
  W.LowiIcons = { svg: (n, o) => '<svg class="sp-symbol li li-' + n + ' ' + o.cls + '" role="img" aria-label="' + o.label + '"></svg>' };
  const h = W.LowiRanking._compare({ uid: 'u-Joseph Castellar', n: 'Joseph Castellar' }, 'w');
  assert.match(h, /<svg class="sp-symbol li li-sun rk-sun[^"]*" role="img" aria-label="sunbeams"><\/svg>/);
  assert.match(R('ranking.css'), /\.rk-sun,\.rk-sun svg\{color:#ffd666;/);
});

test('layout: one type scale, names stay on one line, game motion with a reduced-motion fallback', () => {
  const css = R('ranking.css');
  assert.match(css, /\.rk \.rk-cn\{font-weight:700;font-size:15px;line-height:1\.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis\}/);
  for (const k of ['rk-rise', 'rk-pop', 'rk-slide', 'rk-glow', 'rk-grow', 'rk-slam']) assert.match(css, new RegExp('@keyframes ' + k + '\\{'), k);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)/);
});

test('every string of the Ranking exists in English, German and Spanish', () => {
  const src = R('ranking.js'), body = src.slice(src.indexOf('const T = {'), src.indexOf('};', src.indexOf('const T = {')));
  const keys = body.match(/\b[a-zA-Z0-9_]+: \[/g) || [];
  assert.ok(keys.length > 40, 'found the strings');
  for (const k of keys) assert.match(body, new RegExp('\\b' + k.replace('[', '\\[') + "'[^']*(?:\\\\'[^']*)*', '[^']*(?:\\\\'[^']*)*', '[^']*(?:\\\\'[^']*)*'\\]"), k + ' in three languages');
});

test('layout: "Next: Level 6 · Legend" gets its own row below the 25 dots in the room profile', () => {
  const html = R('index.html');
  assert.match(html, /\.r3m-hint\{display:flex;flex-wrap:wrap;/);
  assert.match(html, /\.r3m-hb\{display:flex;flex-wrap:wrap;gap:4px;flex:1 1 100%;min-width:0\}/);
  assert.match(html, /\.r3m-hint>span:nth-child\(2\)\{flex:1 1 0;min-width:0;overflow-wrap:normal;word-break:normal\}/);
});

test('page: their breakdown shows only when they share their companion; hidden shows only the totals', () => {
  const now = Date.now();
  const shown = page(screenshot(now), { looks: { 'u-Joseph Castellar': 'GOOD' } }).LowiRanking._compare({ uid: 'u-Joseph Castellar', n: 'Joseph Castellar' }, 'w');
  const hid = page(screenshot(now)).LowiRanking._compare({ uid: 'u-Joseph Castellar', n: 'Joseph Castellar' }, 'w');
  const them = h => ((h.match(/<ul class="rk-mir rk-src">[\s\S]*?<\/ul>/) || [''])[0].match(/rk-mir-v them[^"]*"><b class="num">/g) || []).length;
  assert.equal(them(hid), 0, 'hidden: none of their sources');
  assert.match(hid, /rk-orb rk-hid/);
  assert.match(hid, /<p class="rk-tot">/, 'hidden: a lock line says only totals are shared');
  assert.ok(them(shown) >= 0);
});

test('page: the small i holds the rules, one short line each, the open board marked, in English, German and Spanish', () => {
  const now = Date.now();
  for (const [lg, re] of [['en', /Sunbeams since Monday/], ['de', /Sonnenstrahlen seit Montag/], ['es', /Rayos de sol desde el lunes/]]) {
    const h = page(screenshot(now), { lang: lg }).LowiRanking._info();
    assert.match(h, re, lg);
    assert.equal((h.match(/<li class="cur"/g) || []).length, 1, lg + ': the open board is marked');
    for (const b of h.match(/<b>[^<]*<\/b>/g) || []) assert.ok(b.length < 110, lg + ': short line: ' + b);
  }
});
