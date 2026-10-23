'use strict';
/* 23 Oct 2026 (Eman): his accounts are one person on the Ranking; every companion shows its chosen name with its rank under it;
   and a Skool-style level ladder behind Your place ("how many percentage of people have reached what level"). */
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const K = require('../ranking-core.js');
const CB = require('../care-board-core.js');
const C = require('../companion-core.js');
const WH = require('../world-home-core.js');

const NOW = new Date(2026, 9, 23, 10).getTime();
const wk = CB.tag(CB.periodKey('w', NOW), 0), mo = CB.tag(CB.periodKey('m', NOW), 0);
const MAIN = '83077af7-8475-4628-9328-25bd335db240', IPAD = '4add63ec-61d6-4187-9c62-bd78c427be24', EMMY = 'd813675e-16b6-40e3-bedb-d6fe8b01af91', EMMANUEL = 'e81217a0-6658-4c00-bce2-bfe56de897a5';
const P = (n, uid, xp, lv, extra) => Object.assign({ n, uid, xp, lv, xpw: 10, wk, xpm: 20, mo }, extra || {});
const others = () => [P('Joseph Castellar', '06f0a8ee-1ed1-4778-a9d4-0852594bd6ad', 2400, 9), P('Q', 'f4f8fbf8-3a18-4317-96d3-9dd778066136', 40, 1), P('Koji', '9a9a9a9a-1111-4222-8333-444444444444', 600, 4)];

test('accounts: Emmanuel, Manuuii (iPad) and Emmy are Eman; Manuel and Emma are not', () => {
  for (const n of ['Emmanuel', 'emmanuel k', 'Manu', 'Manuuii', 'Emmy', 'eman']) assert.ok(K.isOwner({ n, uid: 'x-' + n }), n);
  for (const n of ['Manuel', 'Manuela', 'Emma', 'Joseph Castellar', 'Q']) assert.ok(!K.isOwner({ n, uid: 'x-' + n }), n);
  for (const id of [MAIN, IPAD, EMMY, EMMANUEL]) assert.ok(K.isOwner({ n: 'renamed', uid: id }), id);
  assert.ok(!K.isOwner({ n: 'Manu', bot: true }), 'bots never');
});

test('accounts: on your phone you show up once, the other accounts fold into your row, nobody else is touched', () => {
  const me = P('eman', MAIN, 1878, 9, { me: true });
  const list = [me, P('Emmanuel', EMMANUEL, 2400, 10), P('Manuuii', IPAD, 120, 2), P('Emmy', EMMY, 30, 1)].concat(others());
  for (const k of ['w', 'm', 'all']) {
    const rows = K.rows(list, k, NOW, { w: { pts: 26, full: 1 }, m: { pts: 62, full: 3 } });
    const own = rows.filter(x => K.isOwner(x.p));
    assert.strictEqual(own.length, 1, k + ': Eman once');
    assert.ok(own[0].p.me, k + ': the row kept is yours');
    assert.ok(rows.some(x => x.p.n === 'Joseph Castellar') && rows.some(x => x.p.n === 'Koji'), k + ': others stay');
  }
  const all = K.rows(list, 'all', NOW);
  assert.strictEqual(all.find(x => x.p.me).pts, 2400, 'All time: the best XP of your known accounts');
  assert.strictEqual(list.length, 7, 'nothing deleted from the input');
});

test('accounts: a name-only match folds away but never lends its score', () => {
  const me = P('eman', MAIN, 500, 4, { me: true });
  const rows = K.rows([me, P('Manu', 'zz-unknown', 9000, 20)].concat(others()), 'all', NOW);
  assert.strictEqual(rows.filter(x => K.isOwner(x.p)).length, 1);
  assert.strictEqual(rows.find(x => x.p.me).pts, 500);
});

test('accounts: on someone else\'s phone Eman is one entry, the main account', () => {
  const viewer = P('Koji', '9a9a9a9a-1111-4222-8333-444444444444', 600, 4, { me: true });
  const list = [viewer, P('eman', MAIN, 1878, 9), P('Emmanuel', EMMANUEL, 2400, 10), P('Manuuii', IPAD, 120, 2)];
  const rows = K.rows(list, 'all', NOW);
  const own = rows.filter(x => K.isOwner(x.p));
  assert.strictEqual(own.length, 1); assert.strictEqual(own[0].p.uid, MAIN); assert.strictEqual(own[0].pts, 2400);
  assert.ok(rows.find(x => x.p.me).p.n === 'Koji');
});

test('companion names ride on the shared look; old looks still decode; names are cleaned', () => {
  const g = C.decode('1.5.1.ff8844.aa66ff.s.v.n.m.k1');
  assert.ok(g && !g.nm, 'a look without a name decodes as before');
  const code = C.withName(C.encode(g), 'Blaze Nova');
  assert.match(code, /~Blaze%20Nova$/);
  const back = C.decode(code);
  assert.strictEqual(back.nm, 'Blaze Nova'); assert.strictEqual(back.st, g.st); assert.strictEqual(back.el, g.el);
  assert.strictEqual(C.decode(C.withName(C.encode(g), 'Lúa Estrella')).nm, 'Lúa Estrella');
  assert.strictEqual(C.decode(C.withName(C.encode(g), '<script>x</script>')).nm, 'scriptx/script');
  assert.strictEqual(C.cleanName('a'.repeat(40)).length, 24);
  assert.strictEqual(C.withName(C.encode(g), '   '), C.encode(g), 'no empty name');
  assert.ok(C.decode('1.5.1.ff8844.aa66ff.s.v.n.m.k1~%E0%A4%A'), 'a broken name still keeps the look');
});

test('Ranking page: chosen name first, rank (form and level) under it, owner small; fallback to the form', () => {
  const s = R('ranking.js');
  assert.match(s, /g\.nm \? \{ g, name: g\.nm, form, named: true \}/);
  assert.match(s, /class="rk-ownr"/);
  assert.match(s, /function ownerLine\(p, lv, c\)/);
  const cm = R('companion.js');
  assert.match(cm, /C\.withName\(C\.encode\(g\), myName\(\)\)/, 'your shared look carries your companion name');
});

test('level ladder: 25 levels, share of real players who reached each, Eman once, bots out', () => {
  const me = P('eman', MAIN, 1878, 9, { me: true });
  const list = [me, P('Emmanuel', EMMANUEL, 2400, 10), P('Emmy', EMMY, 30, 1), { n: 'Samir', lv: 43, bot: true }].concat(others());
  const d = K.ladder(list);
  assert.strictEqual(d.total, 4, 'you, Joseph, Q and Koji');
  assert.strictEqual(d.steps.length, WH.MAX_LEVEL);
  assert.strictEqual(d.steps[0].pct, 100);
  assert.strictEqual(d.my, 10);
  assert.strictEqual(d.steps[3].pct, 75, 'level 4: you, Joseph, Koji');
  assert.strictEqual(d.steps[8].pct, 50, 'level 9: you and Joseph');
  assert.strictEqual(d.steps[9].pct, 25, 'level 10: only you');
  assert.strictEqual(d.steps[10].pct, 0);
  assert.ok(d.steps[9].now && d.steps[9].reached && !d.steps[10].reached);
  assert.strictEqual(d.next, WH.STAGES[10].xp); assert.strictEqual(d.toNext, WH.STAGES[10].xp - 2400);
  assert.deepStrictEqual(d.steps.filter(s => s.evo).map(s => s.lv), WH.EVO_LEVELS);
  for (let i = 1; i < d.steps.length; i++) assert.ok(d.steps[i].pct <= d.steps[i - 1].pct, 'never more people at a higher level');
});

test('level ladder page: opens from Your place, three languages, lock for locked levels, closes on Escape', () => {
  const s = R('ranking.js'), css = R('ranking.css');
  assert.match(s, /data-rk="ladder"/);
  assert.match(s, /t\.dataset\.rk === 'ladder'\) \{ openLadder\(t\)/);
  for (const k of ['ladNext', 'ladPct', 'ladFoot', 'ladLock', 'ladEvo']) assert.match(s, new RegExp(k + ": \\['[^']+', '[^']+', '[^']+'\\]"), k + ' in EN, DE, ES');
  assert.match(s, /'Escape'/);
  assert.match(css, /\.rk-lad-i\.off \.rk-lad-b/); assert.match(css, /\.rk-lock/); assert.match(css, /\.rk-lad-i\.on \.rk-lad-b/);
});
