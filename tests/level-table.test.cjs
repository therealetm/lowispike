// Oct 22, 2026 (Emmanuel: "Is this aligned with the new design and the new level-up point system? Check and align it."):
// the profile XP card said "Level 4 · Flourishing Herb" while Misty's growth sheet said "Level 4 · Bright cell". There is now
// ONE level table, world-home-core.js STAGES. These tests keep every surface on it and the old plant / comet names gone.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const WHC = require('../world-home-core.js');

// 'Seed' and 'Sprout' are left out: a demo pet is called Sprout. The level table test below covers the first two names.
const OLD = ['Young Herb', 'Flourishing Herb', 'Radiant Herb', 'Legendary Bloom', 'Sapling', 'Grower', 'Flowstate',
  'Glimmer', 'Young Comet', 'Bright Comet', 'Radiant Comet', 'Legendary Comet', 'Nova Comet', 'Titan Comet', 'Monarch Comet', 'Majestic Comet'];
const SHIPPED = () => {
  const list = require('../scripts/site-files.cjs');
  const files = (Array.isArray(list) ? list : list.files || list.FILES || []).filter(f => /\.(js|html)$/.test(f));
  return files.length ? files : fs.readdirSync(path.join(__dirname, '..')).filter(f => /\.(js|html)$/.test(f));
};

test('no old plant or comet level name is shown anywhere in the app', () => {
  let files = [];
  try { files = SHIPPED(); } catch (e) { files = fs.readdirSync(path.join(__dirname, '..')).filter(f => /\.(js|html)$/.test(f)); }
  files = files.filter(f => fs.existsSync(path.join(__dirname, '..', f)) && !/^vendor\//.test(f));
  assert.ok(files.includes('index.html'));
  const quoted = n => new RegExp('["\'`>]' + n + '["\'`<]');
  for (const f of files) {
    const src = R(f);
    for (const n of OLD) assert.ok(!quoted(n).test(src), f + ' still shows the old level name "' + n + '"');
  }
  assert.ok(!/herb reached level|Kraut hat Level/.test(R('finch-extras.js')));
});

test('world-home-core STAGES is the one table: 10 cell stages with rising XP and names in EN/DE/ES', () => {
  assert.strictEqual(WHC.STAGES.length, 10);
  assert.deepStrictEqual(WHC.STAGES.slice(0, 6).map(s => s.n[0]), ['Spark', 'Little cell', 'Glow cell', 'Bright cell', 'Star cell', 'Legend']);
  WHC.STAGES.forEach((s, i) => {
    assert.strictEqual(s.n.length, 3);
    if (i) assert.ok(s.xp > WHC.STAGES[i - 1].xp);
  });
  assert.strictEqual(WHC.STAGES[3].xp, 700);
  assert.strictEqual(WHC.STAGES[4].xp, 1500);
});

test('herb-config and the care board read the one table', () => {
  const cfg = require('../herb-config.js');
  assert.deepStrictEqual(cfg.stages.map(s => s.xp), WHC.STAGES.map(s => s.xp));
  assert.deepStrictEqual(cfg.stages.map(s => s.name), WHC.STAGES.map(s => s.n));
  const cb = require('../care-board-core.js');
  assert.strictEqual(cb.MAX_L, WHC.STAGES.length);
  assert.strictEqual(cb.shownLevel({ lv: 9 }), 9);
  assert.ok(/importScripts\("world-home-core\.js","herb-config\.js"/.test(R('sw.js')), 'the service worker loads the table before herb-config');
});

test('the profile, level-up toast and growth map read the table, loaded before the core script', () => {
  const html = R('index.html');
  const tag = html.indexOf('<script src="world-home-core.js?v=');
  const core = html.indexOf('const LEVEL_TABLE = window.LowiWorldHomeCore.STAGES;');
  assert.ok(tag > 0 && core > tag, 'world-home-core.js loads before the core script reads it');
  const v = html.slice(tag).match(/\?v=([^"]+)"/)[1], build = (html.match(/apple-ui\.js\?v=([0-9-]+)/) || [])[1];
  assert.strictEqual(v, build, 'the table\'s script tag carries the build id, so bump-build updates it');
  assert.ok(html.includes('const HERB_XP = LEVEL_TABLE.map(s => s.xp);'));
  assert.ok(html.includes('const HERB_TITLES = LEVEL_TABLE.map(s => s.n[0]);'));
  assert.ok(!/const HERB_XP = \[/.test(html) && !/const HERB_TITLES = \[/.test(html), 'no second XP or title list');
  assert.ok(!/lv\.L<6|Math\.min\(6, \(p/.test(html), 'no hard-coded top level of 6');
  assert.ok(html.includes('TITLE[st.n[0]] = [st.n[1], st.n[2]]'), 'the "Level N · name" translation reads the table');
});

test('levelOf on the table: XP, XP to next and the bar agree with the growth sheet', () => {
  const html = R('index.html');
  const src = html.slice(html.indexOf('const LEVEL_TABLE'), html.indexOf('const titleOf') + 200).split('\n').slice(0, 9).join('\n');
  const fn = new Function('window', src + '\nreturn {levelOf, titleOf, stepXP, levelStart, MAX_LEVEL};');
  const L = fn({ LowiWorldHomeCore: WHC });
  const o = L.levelOf(1327);
  assert.deepStrictEqual([o.L, o.into, o.need, o.left], [4, 627, 800, 173]);
  assert.strictEqual(L.titleOf(4), 'Bright cell');
  assert.strictEqual(L.titleOf(5), 'Star cell');
  assert.strictEqual(L.levelOf(3000).L, 6);
  assert.strictEqual(L.levelOf(5000).L, 7);
  assert.strictEqual(L.levelOf(99999).L, 10);
  assert.strictEqual(L.levelOf(99999).pct, 1);
  assert.strictEqual(L.MAX_LEVEL, 10);
  assert.strictEqual(L.stepXP(4), 800);
});

test('growth map: glows say unlocked or how far in total XP, and the level line uses total XP', () => {
  const html = R('index.html');
  assert.ok(html.includes("function glowAt(x, xp){ return xp >= x.xp ? 'Unlocked at '"));
  assert.ok(!html.includes("XP into this level</span>"), 'no level-relative "627 / 800" next to a total-XP glow');
  assert.ok(html.includes("N(xp) + ' / ' + N(startOf(n + 1)) + ' XP \\u00b7 '"));
  for (const s of ['Unlocked at', 'Unlocks at', 'to Level (\\d+)$/']) assert.ok(html.includes(s));
});

test('How you earn XP lists what award() really pays, and is translated', () => {
  const html = R('index.html');
  const i = html.indexOf('function earnHTML'), body = html.slice(i, i + 1600);
  for (const s of ['daily quests', 'Water', 'scan a product', 'finish a recipe', 'shop shelf', 'Close your day', 'Meal gaps: 2 XP an hour, up to 16 hours']) assert.ok(body.includes(s), s);
  assert.ok(!body.includes('XP never comes from eating less or fasting longer'));
  // the code these lines describe
  for (const s of ['label:"Water logged"', 'label:"Product scanned"', 'label:"Recipe finished"', 'CAP_H = 16', 'xpLabel:"Day closed"', 'xpAll:"Daily quest complete"']) assert.ok(html.includes(s), s);
  for (const s of ['Daily check-in and daily quests', 'Meal gaps: 2 XP an hour, up to 16 hours', 'A gap longer than 16 hours earns nothing extra, and eating less never earns XP.']) assert.ok(html.includes('["' + s + '", "'), 'translated: ' + s);
});
