// 11 Nov 2026 (Emmanuel): For You is people only. The bot's repeating meal ideas leave the feed and arrive as a
// notification; a tap shows that one idea, then you cook it or close it.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const F = require('../foryou-core.js');
const N = require('../nibblo-core.js');
const I = require('../inspo-core.js');
const C = require('../nibblo-idea-core.js');

function glue(extra) {
  const w = Object.assign({ LowiForYouCore: F, LowiInspoCore: I, LowiNibblo: N, document: { documentElement: { lang: 'de' }, addEventListener() {} }, addEventListener() {} }, extra || {});
  new Function('window', 'with(window){' + read('foryou.js').replace('typeof window !== \'undefined\' ? window : this', 'window') + '}')(w);
  return w.LowiForYou;
}
const member = { id: 'm1', uid: 'u-anna', who: 'Anna', ts: Date.now() - 1000, cap: 'Mein Mittag' };

test('For You: the bot slides (Swap of the day) are not in the list any more', () => {
  const FY = glue();
  const bots = FY.botPosts();
  assert.ok(bots.length > 0, 'the bot still builds its slides (saved ones stay findable)');
  const out = FY.feed([member]);
  assert.deepStrictEqual(out.map(p => p.id), ['m1']);
  assert.ok(FY.botPost(bots[0].id), 'a saved bot slide is still found by id');
});

test('For You: a Nibblo meal post from the shared table is left out', () => {
  const FY = glue();
  const row = N.postRow('20261111', 'n');
  const p = N.post({ id: row.id, uid: N.UID, who: row.who, meta: row.meta, ts: Date.now() }, 'de');
  assert.strictEqual(p.nb, 1);
  assert.deepStrictEqual(FY.feed([p, member]).map(x => x.id), ['m1']);
  const raw = { id: row.id, uid: N.UID, who: row.who, meta: row.meta, ts: Date.now() }; /* not mapped yet: still recognised */
  assert.deepStrictEqual(FY.feed([raw, member]).map(x => x.id), ['m1']);
});

test('For You: the app\'s own crowd/bot accounts are left out, people and your own posts stay', () => {
  const FY = glue({ LowiBotAccounts: { isBot: p => p.uid === 'u-crowd' } });
  const crowd = { id: 'c1', uid: 'u-crowd', who: 'Crowd', ts: Date.now(), meta: { spike: 'low' } };
  const mine = { id: 'me1', me: true, vis: 'tribe', ts: Date.now() - 5 };
  assert.deepStrictEqual(FY.feed([crowd, member, mine]).map(x => x.id).sort(), ['m1', 'me1']);
});

test('human(): the pure rule', () => {
  assert.strictEqual(F.human(member, {}), true);
  assert.strictEqual(F.human({ id: 'b', bot: true }, {}), false);
  assert.strictEqual(F.human({ id: 'n', nb: 1, uid: 'x' }, {}), false);
  assert.strictEqual(F.human(null, {}), false);
  assert.strictEqual(F.human({ id: 'x', uid: 'u' }, { nibblo: () => true }), false);
});

test('idea card: which idea is current follows the server\'s Berlin slots', () => {
  const at = (h, m) => Date.UTC(2026, 10, 11, h - 1, m); /* Berlin is UTC+1 in November */
  assert.strictEqual(C.latest(at(6, 0), N), null);
  assert.strictEqual(C.latest(at(7, 30), N).id, 'nb-20261111-m');
  assert.strictEqual(C.latest(at(12, 29), N).id, 'nb-20261111-m');
  assert.strictEqual(C.latest(at(12, 30), N).id, 'nb-20261111-n');
  assert.strictEqual(C.latest(at(23, 0), N).id, 'nb-20261111-e');
});

test('idea card: the same dish the server posted, in the phone\'s language', () => {
  for (const s of ['m', 'n', 'e']) {
    const k = N.pick('20261111', s);
    ['en', 'de', 'es'].forEach((l, i) => {
      const c = C.card('nb-20261111-' + s, l, N);
      assert.strictEqual(c.name, k.dish.name[i]);
      assert.strictEqual(c.line, k.dish.line[i]);
      assert.strictEqual(c.bookId, N.bookId(k.dish.r));
      assert.strictEqual(c.photo, N.photoUrl(k.dish.r));
      assert.ok(c.kicker && c.kicker === C.W.slot[s][i]);
    });
  }
  assert.strictEqual(C.card('snb-20261111-n', 'de', N).id, 'nb-20261111-n', 'the For You post id of the push works too');
  assert.strictEqual(C.card('nb-2026-n', 'de', N), null);
  assert.strictEqual(C.card('chat:abc', 'de', N), null);
});

test('idea card: every word exists in English, German and Spanish, no medical words', () => {
  const all = [];
  (function walk(o) { if (Array.isArray(o)) { assert.strictEqual(o.length, 3); o.forEach(x => { assert.ok(x && typeof x === 'string'); all.push(x); }); } else Object.values(o).forEach(walk); })(C.W);
  assert.ok(!/insulin|blutzucker|glucose|diabet|Misty/i.test(all.join(' ')));
});

test('idea card: the in-app notice shows once per idea', () => {
  let s = C.clean(null);
  assert.strictEqual(C.fresh(s, 'nb-20261111-m'), true);
  s = C.seen(s, 'nb-20261111-m');
  assert.strictEqual(C.fresh(s, 'nb-20261111-m'), false);
  assert.strictEqual(C.fresh(s, 'nb-20261111-n'), true);
  assert.strictEqual(C.fresh(C.clean({ seen: 'junk' }), 'nb-20261111-m'), true);
  assert.strictEqual(C.fresh(s, 'junk'), false);
});

test('a tapped Nibblo notification opens the idea card, not For You', () => {
  const src = read('lis-push.js');
  const line = src.split('\n').find(l => /^\s*if \(nb\)/.test(l));
  assert.ok(line && !/tab\("foryou"\)/.test(line) && /nbShow/.test(line));
  assert.match(src, /LowiNibbloIdea/);
});

test('the idea card is loaded, cached offline and closes with the round bottom button', () => {
  const html = read('index.html'), sw = read('sw.js'), js = read('nibblo-idea.js');
  for (const f of ['nibblo-idea-core.js', 'nibblo-idea.js', 'nibblo-idea.css']) { assert.ok(html.includes(f + '?v='), f + ' in index.html'); assert.ok(sw.includes('"' + f + '"'), f + ' in sw.js'); }
  assert.ok(html.indexOf('nibblo-core.js?v=') < html.indexOf('nibblo-idea-core.js?v='));
  assert.match(js, /data-close/);
  assert.match(js, /cook: true/);
  assert.ok(!/addXP|LowiAudio|speak\(/.test(js), 'no XP, sound or companion speech from a notice');
});
