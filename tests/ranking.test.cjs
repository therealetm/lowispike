'use strict';
/* 23 Oct 2026 (E-man): one board. The Community Ranking tab shows everyone's companions (like Pokemon), with the Spazier Club layout
   (period switch, Your place, a podium of three, a numbered list). The Care board card, the Milestones row and every other board link
   lead here now. Rules: ranking-core.js. Page: ranking.js. */
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const K = require('../ranking-core.js');
const CB = require('../care-board-core.js');

const NOW = new Date(2026, 9, 23, 10).getTime();   /* Fri 23 Oct 2026, week from Mon 19 */
const wk = CB.tag(CB.periodKey('w', NOW), 0), mo = CB.tag(CB.periodKey('m', NOW), 0);
const person = (n, w, m, xp, extra) => Object.assign({ n, uid: 'u-' + n, xpw: w, wk, xpm: m, mo, xp, lv: 0 }, extra || {});

test('periods: week, month and all time; anything else falls back to the week (no Today: other rows carry no day score)', () => {
  assert.deepStrictEqual(K.PERIODS, ['w', 'm', 'all']);
  assert.strictEqual(K.period('d'), 'w');
  assert.strictEqual(K.period('all'), 'all');
});

test('week ranks the care sunbeams (the old Care board numbers), all time ranks companion XP; places follow the order', () => {
  const people = [person('Ana', 40, 90, 500), person('Ben', 70, 120, 200), person('Cem', 10, 300, 9000), person('Dia', 0, 0, 0)];
  const w = K.rows(people, 'w', NOW);
  assert.deepStrictEqual(w.map(x => x.p.n), ['Ben', 'Ana', 'Cem'], 'no score, no place');
  assert.deepStrictEqual(w.map(x => x.rank), [1, 2, 3]);
  const m = K.rows(people, 'm', NOW);
  assert.deepStrictEqual(m.map(x => x.p.n), ['Cem', 'Ben', 'Ana']);
  const a = K.rows(people, 'all', NOW);
  assert.deepStrictEqual(a.map(x => [x.p.n, x.pts]), [['Cem', 9000], ['Ana', 500], ['Ben', 200]]);
  assert.ok(a[0].lv >= a[1].lv, 'level comes from XP');
});

test('a forged score cannot jump the board: stale week rows count 0 and all-time XP is capped', () => {
  const stale = person('Old', 999, 999, 0, { wk: CB.tag('2020-01-06', 0), mo: CB.tag('2020-01', 0) });
  assert.strictEqual(K.rows([stale], 'w', NOW).length, 0);
  assert.strictEqual(K.xpOf({ xp: 1e15 }), K.XP_MAX);
  assert.strictEqual(K.xpOf({ xp: -5 }), 0);
});

test('podium order is the reference: 2nd left, 1st centre, 3rd right', () => {
  const L = [{ rank: 1 }, { rank: 2 }, { rank: 3 }, { rank: 4 }];
  assert.deepStrictEqual(K.podium(L).map(x => x.rank), [2, 1, 3]);
  assert.deepStrictEqual(K.podium(L.slice(0, 2)).map(x => x.rank), [2, 1]);
  assert.deepStrictEqual(K.podium(L.slice(0, 1)).map(x => x.rank), [1]);
});

test('privacy: only a published look draws a companion; bots and people without a look get none', () => {
  assert.strictEqual(K.lookFor({ uid: 'a' }, { a: 'LOOK1' }), 'LOOK1');
  assert.strictEqual(K.lookFor({ uid: 'a' }, {}), null);
  assert.strictEqual(K.lookFor({ uid: 'a', bot: true }, { a: 'LOOK1' }), null);
  assert.strictEqual(K.lookFor({}, { a: 'LOOK1' }), null);
});

function page(people, opts) {
  opts = opts || {};
  const store = {};
  const win = {
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
    LowiRankingCore: K, LowiCareBoard: CB,
    LowiR3: { everyone: () => people, me: () => (opts.myW ? { care: { w: { pts: opts.myW, full: 0 } } } : null) },
    LowiCompanionCore: {
      MAX_ST: 9, decode: c => (c === 'GOOD' ? { st: 3, el: 'water' } : null), miniSVG: (g, key) => '<svg data-k="' + key + '"></svg>',
      genome: (o, st) => ({ st, el: 'bot' }), formName: st => 'Form' + st
    },
    LowiCompanion: { friendLooks: () => opts.looks || {}, genome: () => ({ st: 2, el: 'me' }), prefs: () => ({ share: true }) },
    goTab: t => { win.__tab = t; }
  };
  win.window = win;
  const doc = { getElementById: () => null };
  vm.runInNewContext(R('ranking.js'), { window: win, document: doc, localStorage: win.localStorage, setTimeout: () => 0, console });
  return win;
}

test('page: Your place, a podium of three, the rest numbered, companions instead of faces, hidden ones as a plain orb', () => {
  const people = [person('Ana', 40, 0, 0), person('Ben', 70, 0, 0), person('Cem', 10, 0, 0), person('Dia', 5, 0, 0), Object.assign(person('Me', 20, 0, 0), { me: true })];
  const W = page(people, { looks: { 'u-Ben': 'GOOD' }, myW: 20 });
  const h = W.LowiRanking._html();
  assert.match(h, /class="rk-t">Ranking</);
  assert.match(h, /data-rk="per" data-k="w" aria-selected="true"/);
  assert.match(h, /class="rk-me"[\s\S]*?#3/, 'Your place shows #3');
  const pod = h.slice(h.indexOf('rk-pod n3'), h.indexOf('rk-list'));
  assert.deepStrictEqual([...pod.matchAll(/rk-pod-i rk-p(\d)/g)].map(m => m[1]), ['2', '1', '3']);
  assert.match(pod, /rk-p1"[^>]*data-who="Ben"[\s\S]*?<svg data-k="rkp1"><\/svg>[\s\S]*?Form3/, 'Ben\'s published companion is drawn on top');
  assert.match(pod, /rk-p2"[^>]*data-who="Ana"[\s\S]*?rk-orb rk-hid[\s\S]*?Hidden companion/, 'no look: hidden orb, score still counts');
  assert.match(h, /<ol class="rk-list"><li><button type="button" class="rk-row"[^>]*data-who="Cem"[\s\S]*?rk-n num">4</);
  assert.doesNotMatch(h, /<img/, 'no human profile pictures');
});

test('open(): goes to Community (the foryou tab) and asks for the Ranking view', () => {
  const W = page([]);
  W.LowiRanking.open();
  assert.strictEqual(W.__tab, 'foryou');
});

test('wiring: Ranking is the fifth Community tab, scripts load after the Care board rules, cached for offline', () => {
  const html = R('index.html');
  const cb = html.indexOf('<script src="care-board-core.js'), rc = html.indexOf('<script src="ranking-core.js'), rj = html.indexOf('<script src="ranking.js');
  assert.ok(cb > 0 && rc > cb && rj > rc, 'care-board-core, then ranking-core, then ranking');
  assert.ok(html.includes('<link rel="stylesheet" href="ranking.css'), 'ranking.css linked');
  assert.match(R('sw.js'), /"ranking-core\.js", "ranking\.js", "ranking\.css"/);
  assert.deepStrictEqual(require('../community-tab-order.js').IDS.slice(-1), ['rank']);
  assert.match(R('community-rooms-ui.js'), /W\.LowiRanking\.render\(box\)/);
  assert.match(R('community-rooms.css'), /grid-template-columns:repeat\(var\(--rm-n,4\),minmax\(0,1fr\)\)/);
});

test('one board: every old Care board / leaderboard way in opens the Ranking; Move shows no board cards', () => {
  const html = R('index.html');
  assert.match(html, /function openBoardTab\(\)\{[\s\S]{0,400}?if \(window\.LowiRanking && LowiRanking\.open\) \{ LowiRanking\.open\(\); return; \}/);
  assert.ok(!html.includes('<b>Care board</b>'), 'Profile row says Ranking');
  assert.ok(html.includes('data-r3="board">See Ranking '));
  const nm = R('nav-moves.js');
  assert.match(nm, /if \(k === 'lb' && W\.LowiRanking && W\.LowiRanking\.open\) \{ W\.LowiRanking\.open\(\); return; \}/);
  assert.doesNotMatch(nm, /className = 'card goldline nm-lbcard'/);
  assert.doesNotMatch(nm, /className = 'card nm-milescard'/);
  const hs = R('home-settings-sleep-v2.js');
  assert.match(hs, /care: 'Ranking',/);
  assert.match(hs, /run: \(\) => \(root\.LowiRanking && fn\(root\.LowiRanking, 'open'\)\) \? root\.LowiRanking\.open\(\)/);
  assert.doesNotMatch(R('tutorial-steps.js'), /Care board is in Move/);
  /* ranking.js reads LowiR3.everyone / me / open: they must exist on the real R3 */
  assert.match(html, /R3\.everyone = everyone; R3\.me = me;\nR3\.open = function\(q\)\{ q = q \|\| \{\}; const all = \(typeof R3\.everyone === "function" \? R3\.everyone : everyone\)\(\)/);
});
