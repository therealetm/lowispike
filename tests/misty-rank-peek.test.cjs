'use strict';
/* 23 Oct 2026 (Eman: "when we check our own Misty stats, that's where we see where Misty's ranked, worldwide basically ... a very
   tiny preview, to others"): the rank peek in Misty's card. Same rows as the Ranking tab, the best board, neighbours above and below. */
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const K = require('../ranking-core.js');
const CB = require('../care-board-core.js');

const NOW = new Date(2026, 9, 23, 10).getTime();
const wk = CB.tag(CB.periodKey('w', NOW), 0), mo = CB.tag(CB.periodKey('m', NOW), 0);
const MAIN = '83077af7-8475-4628-9328-25bd335db240', IPAD = '4add63ec-61d6-4187-9c62-bd78c427be24';
const P = (n, uid, xp, lv, xpw, xpm, extra) => Object.assign({ n, uid, xp, lv, xpw, wk, xpm, mo }, extra || {});
const crowd = () => [
  P('Joseph Castellar', '06f0a8ee-1ed1-4778-a9d4-0852594bd6ad', 2400, 9, 40, 90),
  P('Koji', '9a9a9a9a-1111-4222-8333-444444444444', 600, 4, 5, 10),
  P('Q', 'f4f8fbf8-3a18-4317-96d3-9dd778066136', 40, 1, 2, 3),
  P('Mateo', 'bot:mateo', 9000, 20, 80, 300, { bot: true })
];

test('peek: the same rows as the Ranking, best board wins, neighbours above and below', () => {
  const me = P('eman', MAIN, 1878, 9, 0, 0, { me: true });
  const list = crowd().concat([me, P('Manuuii', IPAD, 120, 2, 1, 1)]);
  const care = { w: { pts: 12, full: 1 }, m: { pts: 95, full: 4 } };
  const d = K.peek(list, NOW, care);
  assert.ok(d, 'a peek');
  assert.strictEqual(d.k, 'm', 'Month is where Misty places best (#1)');
  assert.strictEqual(d.rank, 1);
  assert.strictEqual(d.up, null, 'nobody above #1');
  assert.strictEqual(d.down.p.n, 'Joseph Castellar');
  for (const k of ['w', 'm', 'all']) {
    const rows = K.rows(list, k, NOW, care), i = rows.findIndex(x => x.p.me);
    assert.strictEqual(d.per[k], i < 0 ? 0 : rows[i].rank, k + ': the same place as the Ranking tab');
  }
  assert.strictEqual(d.per.all, 2, 'All time: #2 behind Joseph, the bot never counts');
});

test('peek: a tie between boards goes to All time; bots and other Eman accounts never show as neighbours', () => {
  const me = P('eman', MAIN, 1878, 9, 0, 0, { me: true });
  const list = crowd().concat([me, P('Emmanuel', 'e81217a0-6658-4c00-bce2-bfe56de897a5', 100, 2, 1, 1)]);
  const d = K.peek(list, NOW, { w: { pts: 10, full: 0 }, m: { pts: 20, full: 0 } });
  assert.strictEqual(d.per.all, 2); assert.strictEqual(d.per.m, 2); assert.strictEqual(d.per.w, 2);
  assert.strictEqual(d.k, 'all', 'tie: All time');
  assert.strictEqual(d.up.p.n, 'Joseph Castellar');
  assert.strictEqual(d.down.p.n, 'Koji');
  for (const x of [d.up, d.down]) assert.ok(!x.p.bot && !K.isOwner(x.p), 'no bot, not Eman twice');
});

test('peek: nothing when Misty is on no board or alone on it', () => {
  assert.strictEqual(K.peek([P('eman', MAIN, 0, 1, 0, 0, { me: true })].concat(crowd()), NOW, { w: { pts: 0 }, m: { pts: 0 } }), null, 'not ranked');
  assert.strictEqual(K.peek([P('eman', MAIN, 500, 3, 0, 0, { me: true }), P('Mateo', 'bot:m', 900, 5, 9, 9, { bot: true })], NOW, { w: { pts: 5 }, m: { pts: 5 } }), null, 'alone with a bot');
});

test('Misty card: the peek sits under her level, small label + short value, opens the Ranking at Your place, EN/DE/ES', () => {
  const js = R('misty-hub.js'), css = R('misty-hub.css');
  assert.ok(/class="mh-lv"[\s\S]{0,400}rankHtml\(\) \+/.test(js), 'right under the level line');
  assert.ok(js.includes('k.peek(ppl, Date.now(), care)'), 'the Ranking rules (ranking-core peek)');
  assert.ok(js.includes("['Worldwide', 'Weltweit', 'Mundial']") && js.includes("['All time', 'Gesamt', 'Total']"), 'EN/DE/ES');
  assert.ok(/R\.setPeriod\(k\)[\s\S]{0,80}R\.open\(\)/.test(js) && js.includes('.rk .rk-me'), 'opens that board, at Your place');
  const ls = (css.match(/\.mh-rk-l \{[^}]*\}/) || [''])[0], vs = (css.match(/\.mh-rk-v \{[^}]*\}/) || [''])[0], ts = (css.match(/\.mh-rk-t \{[^}]*\}/) || [''])[0];
  assert.ok(/font-size: 13px/.test(ts) && /font-size: 13px/.test(vs) && !/font-size/.test(ls), 'label and value the same size');
  assert.ok(/\.mh-rk \{[^}]*min-height: 44px/.test(css), 'a thumb-sized target');
  assert.ok(/prefers-reduced-motion: no-preference\) \{ \.mh-rk \{ animation/.test(css), 'the pulse respects reduced motion');
});
