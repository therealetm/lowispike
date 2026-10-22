/* Oct 22, 2026, evolution step 1 (Emmanuel: "I'm leveling up too fast. We need more levels. After level 10, it should go up to 25.").
   Pins the 25-level table, the slower curve against a regular day of real XP, the evolution marks at 5/10/15/20/25, the fair-play
   floor for people whose level would drop, and the empty hooks for steps 2-5 (MAYA-HANDOFF.md "Evolution plan"). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const WHC = require('../world-home-core.js');
const cfg = require('../herb-config.js');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

function store(init) { const m = Object.assign({}, init || {}); return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; }, m }; }

/* a regular day, from what award() pays: check-in with a 10-day streak 40, four daily quests 40, three meals 45, six cups 12,
   a 13 h overnight gap 26 + milestones 10, one 10-minute Move 20, 6,000 steps 30, close the day 15, a full sun 10 */
const REGULAR_DAY = 40 + 40 + 45 + 12 + 36 + 20 + 30 + 15 + 10;

test('25 levels, rising XP, names in EN/DE/ES, all different', () => {
  assert.strictEqual(WHC.STAGES.length, 25);
  assert.strictEqual(WHC.MAX_LEVEL, 25);
  for (let l = 0; l < 3; l++) assert.strictEqual(new Set(WHC.STAGES.map(s => s.n[l])).size, 25, 'unique names in language ' + l);
  WHC.STAGES.forEach((s, i) => {
    assert.strictEqual(s.n.length, 3); assert.strictEqual(s.d.length, 3);
    s.n.concat(s.d).forEach(x => assert.ok(x && x.length > 2));
    if (i) assert.ok(s.xp > WHC.STAGES[i - 1].xp);
  });
  assert.deepStrictEqual(WHC.STAGES.slice(10).map(s => s.n[0]), ['Pulsar cell', 'Prism cell', 'Crystal cell', 'Thunder cell', 'Supernova', 'Orbit cell', 'Quasar cell', 'Zenith cell', 'Phoenix cell', 'Galaxy', 'Celestial cell', 'Eternal cell', 'Cosmic cell', 'Genesis cell', 'Cosmos']);
  /* cell theme: every non-evolution name from 11 on is a "... cell" in all three languages */
  WHC.STAGES.slice(10).forEach(s => { if (!s.evo) assert.ok(/cell$/.test(s.n[0]) && /zelle$/i.test(s.n[1].replace(/ Zelle$/, 'zelle')) && /^Célula /.test(s.n[2]), s.n[0]); });
});

test('evolution stages sit at levels 5, 10, 15, 20 and 25', () => {
  assert.deepStrictEqual(WHC.EVO_LEVELS, [5, 10, 15, 20, 25]);
  assert.deepStrictEqual(WHC.STAGES.map(s => s.evo).filter(Boolean), [1, 2, 3, 4, 5]);
  assert.strictEqual(WHC.evoLevel(3), 15);
  assert.deepStrictEqual([1, 4, 5, 9, 10, 14, 15, 24, 25].map(WHC.evoOf), [0, 0, 1, 1, 2, 2, 3, 4, 5]);
  assert.strictEqual(WHC.stage(33500).evo, 3);
});

test('the curve: first days stay quick, 10 is about two months, every level from 11 to 25 is 2-4 weeks of regular days', () => {
  const xp = WHC.STAGES.map(s => s.xp);
  assert.deepStrictEqual(xp.slice(0, 6), [0, 100, 300, 700, 1500, 3000], 'levels 1-6 unchanged');
  assert.ok(REGULAR_DAY >= 240 && REGULAR_DAY <= 260, 'regular day ' + REGULAR_DAY);
  assert.ok(xp[4] / REGULAR_DAY <= 7, 'level 5 (first evolution) within the first week');
  const d10 = xp[9] / REGULAR_DAY; assert.ok(d10 >= 50 && d10 <= 60, 'level 10 after ' + d10 + ' days');
  for (let i = 10; i < 25; i++) {
    const days = (xp[i] - xp[i - 1]) / REGULAR_DAY;
    assert.ok(days >= 14 && days <= 28, 'level ' + (i + 1) + ' takes ' + days.toFixed(1) + ' days');
  }
  for (let i = 1; i < 25; i++) assert.ok(xp[i] - xp[i - 1] >= xp[i - 1] - (xp[i - 2] || 0), 'steps never shrink at ' + (i + 1));
});

test('nobody drops: a level the new curve would lower stays as a floor until the curve passes it', () => {
  assert.deepStrictEqual(WHC.OLD_XP, [0, 100, 300, 700, 1500, 3000, 4500, 7000, 10000, 14000]);
  assert.strictEqual(WHC.floorFor(4600), 7);
  assert.strictEqual(WHC.floorFor(7200), 8);
  assert.strictEqual(WHC.floorFor(10200), 9);
  for (const x of [0, 99, 1500, 4499, 5000, 7500, 10500, 14000, 20000, 90000]) assert.strictEqual(WHC.floorFor(x), 0, 'no floor at ' + x);
  /* above the old cap you go up, never down */
  assert.strictEqual(WHC.stage(20000).index + 1, 11);
  const s = store();
  assert.strictEqual(WHC.migrate(4600, s), 7);
  assert.strictEqual(s.m['lowi.lvCurve'], '2');
  assert.strictEqual(WHC.migrate(1, s), 7, 'runs once: a later call keeps the stored floor');
  assert.strictEqual(WHC.myFloor(4800, s), 7);
  const st = WHC.stage(4800, 7);
  assert.strictEqual(st.index + 1, 7); assert.ok(st.floored);
  assert.strictEqual(st.left, 2700, 'XP to level 8 on the new curve');
  assert.ok(st.pct > 0 && st.pct < 1);
  assert.strictEqual(WHC.stage(4800).index + 1, 6, 'other members never read your floor');
  assert.strictEqual(WHC.myFloor(5000, s), 0, 'passed: the floor is gone');
  assert.ok(!('lowi.lvFloor' in s.m));
  const fresh = store(); assert.strictEqual(WHC.migrate(800, fresh), 0); assert.ok(!('lowi.lvFloor' in fresh.m)); assert.strictEqual(fresh.m['lowi.lvCurve'], '2');
});

test('hooks for steps 2-5 are there and empty', () => {
  const h = WHC.hooks(25);
  assert.deepStrictEqual(h, { level: 25, evo: 5, stats: null, powers: [], bubble: null });
  assert.deepStrictEqual(Object.keys(WHC.HOOKS).sort(), ['bubble', 'powers', 'stats']);
});

test('herb-config, the care board and the app read the same 25 levels', () => {
  assert.deepStrictEqual(cfg.stages.map(s => s.xp), WHC.STAGES.map(s => s.xp));
  assert.strictEqual(new Set(cfg.stages.map(s => s.id)).size, 25);
  assert.strictEqual(cfg.stages[24].id, 'cosmos');
  assert.strictEqual(require('../care-board-core.js').MAX_L, 25);
  const html = R('index.html');
  assert.ok(!html.includes('levelOf(S.xp)'), 'your own level always reads the floor');
  assert.ok(html.includes('window.LowiWorldHomeCore.migrate(S.xp)'), 'the curve change runs once at start');
  assert.ok(html.includes('[/^Evolution (\\d)$/, "Entwicklung $1", "Evolución $1"]'), 'growth map evolution mark is translated');
  for (const f of ['world-home.js', 'misty-hub.js', 'adventure-tiers.js', 'herb-tamagotchi.js']) assert.ok(/stage\((?:xp|xp\(\)|m\.xp), ?true\)/.test(R(f)), f + ' shows your floored level');
  assert.ok(/More evolutions at level/.test(R('companion.js')), 'Forms tells you about the evolutions after form 10');
});

test('levelOf(xp, true) in the app keeps the floor; levelOf(xp) does not', () => {
  const html = R('index.html');
  const src = html.slice(html.indexOf('const LEVEL_TABLE'), html.indexOf('const titleOf') + 200).split('\n').slice(0, 9).join('\n');
  const s = store({ 'lowi.lvCurve': '2', 'lowi.lvFloor': '8' });
  const core = Object.assign({}, WHC, { myFloor: x => WHC.myFloor(x, s) });
  const L = new Function('window', src + '\nreturn {levelOf, MAX_LEVEL};')({ LowiWorldHomeCore: core });
  assert.strictEqual(L.MAX_LEVEL, 25);
  assert.strictEqual(L.levelOf(7200).L, 7);
  const me = L.levelOf(7200, true);
  assert.strictEqual(me.L, 8); assert.strictEqual(me.left, 3300); assert.ok(me.pct > 0 && me.pct < 1);
  assert.strictEqual(L.levelOf(7500, true).L, 8);
  assert.strictEqual(s.getItem('lowi.lvFloor'), null, 'reaching level 8 for real clears the floor');
});
