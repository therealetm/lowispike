/* Oct 15: microbe buddies (crew of companion microbes from the microbe book). Core rules + wiring checks. */
const assert = require('assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const K = require('../microbe-buddies-core.js');
const MBC = require('../micro-book-core.js');
const src = fs.readFileSync(path.join(root, 'microbe-buddies.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'microbe-buddies.css'), 'utf8');
const test = require('node:test');
const t = (name, fn) => test(name, fn);

const at = (h, m, d) => new Date(2026, 9, d || 15, h, m || 0).getTime();
const NOW = at(14, 0);
/* book cards like LowiMicroBook.book(): Lacto (external, found) + the 18 book microbes */
function book(foundIds) {
  const all = MBC.merge(MBC.BUDDIES, [Object.assign({}, K.STARTER)]);
  return all.map((b, i) => ({ no: i + 1, id: b.id, b, found: foundIds.includes(b.id), since: i }));
}

t('every book microbe has a favourite action with copy in three languages', () => {
  for (const b of MBC.BUDDIES) {
    const f = K.favOf(b);
    assert.ok(K.FAVS[f], b.id + ' -> ' + f);
    for (const k of ['n', 'wish', 'cheer', 'happy']) assert.strictEqual(K.FAVS[f][k].length, 3);
  }
  assert.strictEqual(K.favOf(MBC.BUDDIES.find(b => b.id === 'rbc')), 'water');
  assert.strictEqual(K.favOf(MBC.BUDDIES.find(b => b.id === 'mito')), 'move');
  assert.strictEqual(K.favOf(K.STARTER), 'low');
});

t('starter Lacto fits the microbe book extra-buddy contract (merge keeps it, event-found)', () => {
  const m = MBC.merge(MBC.BUDDIES, [K.STARTER]);
  const l = m.find(b => b.id === 'lacto');
  assert.ok(l && l.m === 'event');
  assert.strictEqual(l.n[1], 'Lacto');
  assert.ok(K.STARTER.fact.every(s => s.length > 20));
});

t('crew defaults to Lacto, only found microbes can join, max three, never empty', () => {
  const cards = book(['lacto', 'rbc', 'mito', 'bifido', 'liver']);
  assert.deepStrictEqual(K.crew({}, cards).map(c => c.id), ['lacto']);
  let r = K.add({}, 'rbc', cards, NOW); assert.ok(r.ok);
  assert.deepStrictEqual(r.st.crew, ['lacto', 'rbc']);
  assert.ok(r.st.joined.rbc === NOW);
  r = K.add(r.st, 'mito', cards, NOW); assert.ok(r.ok);
  const full = K.add(r.st, 'bifido', cards, NOW); assert.ok(!full.ok); assert.strictEqual(full.why, 'full');
  assert.strictEqual(K.add(r.st, 'neuron', cards, NOW).why, 'notfound');
  const d = K.drop(r.st, 'rbc', cards); assert.ok(d.ok); assert.deepStrictEqual(d.st.crew, ['lacto', 'mito']);
  const one = K.drop(K.drop(d.st, 'mito', cards).st, 'lacto', cards); assert.ok(!one.ok); assert.strictEqual(one.why, 'last');
  const ld = K.lead(r.st, 'mito', cards); assert.deepStrictEqual(ld.st.crew, ['mito', 'lacto', 'rbc']);
});

t('activity reads meal verdicts, ledger kinds, water glasses and trips per day', () => {
  const act = K.activity({ now: NOW, water: 2,
    logs: [{ ts: at(9), lvl: 'low' }, { ts: at(12), r: 'nein' }, { ts: at(8, 0, 14), lvl: 'low' }, { ts: at(10), lvl: 'low', voided: true }],
    ledger: [{ src: 'move-walk', amt: 10, ts: at(11) }, { src: 'scan', amt: 5, ts: at(10) }, { src: 'buddy-bond:rbc:2', amt: 10, ts: at(10), label: 'Buddy · water' }, { src: 'fast-16', amt: 0, ts: at(10) }],
    trips: [{ ts: at(13) }] });
  const d = act[K.dayKey(NOW)];
  assert.strictEqual(d.low, at(9));
  assert.strictEqual(d.spike, at(12));
  assert.strictEqual(d.move, at(11));
  assert.strictEqual(d.scan, at(10));
  assert.strictEqual(d.trip, at(13));
  assert.ok(d.water > 0);
  assert.ok(!d.fast, 'zero-XP entries do not count');
  assert.strictEqual(K.kind({ src: 'buddy-bond:rbc:2', label: 'water' }), 'other', 'buddy gifts never feed the counters');
  assert.ok(act[K.dayKey(at(8, 0, 14))].low);
});

t('mood: sleepy at night, tidy after a spike, cheer right after the favourite, happy later, wish otherwise', () => {
  const rbc = MBC.BUDDIES.find(b => b.id === 'rbc'), mito = MBC.BUDDIES.find(b => b.id === 'mito');
  const act = K.activity({ now: NOW, logs: [], ledger: [{ src: 'water', amt: 5, ts: at(13, 30) }, { src: 'walk', amt: 10, ts: at(9) }] });
  assert.strictEqual(K.mood(rbc, act, NOW).m, 'cheer');
  assert.strictEqual(K.mood(mito, act, NOW).m, 'happy');
  assert.strictEqual(K.mood(K.STARTER, act, NOW).m, 'wish');
  assert.strictEqual(K.mood(rbc, act, at(23, 30)).m, 'sleepy');
  const sp = K.activity({ now: NOW, logs: [{ ts: at(12, 30), lvl: 'high' }] });
  assert.strictEqual(K.mood(rbc, sp, NOW).m, 'tidy');
  assert.notStrictEqual(K.mood(rbc, sp, at(16)).m, 'tidy', 'the sugar wave passes');
  for (let l = 0; l < 3; l++) for (const m of ['cheer', 'happy', 'wish', 'tidy', 'sleepy']) assert.ok(K.line({ m, fav: 'water' }, l).length > 8);
});

t('bond grows one day per day the favourite was done while in the crew, gift XP once per new level', () => {
  const cards = book(['lacto', 'rbc']);
  let st = K.add({}, 'rbc', cards, at(8, 0, 10)).st;
  let ups = [];
  for (let d = 10; d <= 16; d++) {
    const now = at(15, 0, d);
    const act = K.activity({ now, ledger: d === 12 ? [] : [{ src: 'water', amt: 5, ts: at(10, 0, d) }] });
    const r = K.sync(st, cards, act, now); st = r.st; ups = ups.concat(r.ups);
    const again = K.sync(st, cards, act, now); assert.strictEqual(again.ups.length, 0, 'idempotent'); st = again.st;
  }
  const b = K.bond(st, 'rbc');
  assert.strictEqual(b.days, 6);
  assert.strictEqual(b.lvl, 3);
  assert.deepStrictEqual(ups.filter(u => u.id === 'rbc').map(u => [u.lvl, u.amt]), [[2, 10], [3, 15]]);
  assert.strictEqual(K.bond(st, 'lacto').days, 0, 'Lacto loves low-spike food; none was logged');
  assert.strictEqual(b.left, 1); assert.ok(b.pct > 0 && b.pct < 100);
  assert.deepStrictEqual(K.LEVELS, [0, 1, 3, 7, 14]);
});

t('a finished body trip: the lead buddy came along once per trip, and it counts as a bond day', () => {
  const cards = book(['lacto', 'rbc']);
  let st = K.lead(K.add({}, 'rbc', cards, NOW).st, 'rbc', cards).st;
  let r = K.trip(st, cards, { id: 'body-trip:gut:1', ts: NOW }, NOW);
  assert.strictEqual(r.who.id, 'rbc');
  st = r.st;
  assert.strictEqual(K.trip(st, cards, { id: 'body-trip:gut:1', ts: NOW }, NOW).who, null, 'same trip once');
  assert.strictEqual(K.bond(st, 'rbc').trips, 1);
  assert.strictEqual(K.bond(st, 'rbc').days, 1);
});

t('clean() drops junk from synced state', () => {
  const c = K.clean({ crew: ['lacto', 'lacto', '<x>', 'rbc', 'mito', 'liver'], days: { rbc: ['2026-10-15', 'nope', '2026-10-15'] }, lvl: { rbc: 99 }, trips: { rbc: -3 } });
  assert.deepStrictEqual(c.crew, ['lacto', 'rbc', 'mito']);
  assert.deepStrictEqual(c.days.rbc, ['2026-10-15']);
  assert.strictEqual(c.lvl.rbc, 5);
  assert.strictEqual(c.trips.rbc, 0);
});

t('spots stay clear of the cell centre; 3D orbit stays outside the cell (radius 1.4)', () => {
  for (const [x, y] of K.spots(3)) assert.ok(Math.hypot(x - 50, y - 50) > 25);
  for (let i = 0; i < 3; i++) for (const tt of [0, 1.7, 9]) for (const m of ['cheer', 'sleepy', 'wish']) {
    const p = K.orbit(i, 3, tt, m); assert.ok(Math.hypot(p[0], p[2]) > 2.2, 'outside the cell');
  }
});

t('module exposes LowiBodyBuddies with Lacto even without a DOM', () => {
  const ctx = { console, setTimeout, clearTimeout };
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'microbe-buddies-core.js'), 'utf8'), ctx);
  vm.runInContext(src, ctx);
  assert.ok(Array.isArray(ctx.LowiBodyBuddies) && ctx.LowiBodyBuddies.some(b => b.id === 'lacto'));
  assert.ok(ctx.LowiBuddies && ctx.LowiBuddies.core);
});

t('wiring: one shared WebGL world, sheet above the tree/room/3D layers, a11y, reduced motion', () => {
  assert.ok(!/getContext\(['"]webgl/.test(src) && !/new\s+THREE\.WebGLRenderer|WebGLRenderer\(/.test(src), 'no second WebGL context');
  assert.ok(!/import\(['"][^'"]*three/.test(src), 'no own three.js load');
  assert.ok(/w\.hub\.add\(group\)/.test(src) && /'lowi-buddies'/.test(src));
  assert.ok(/LowiWorldRegions/.test(src) && /LowiRide/.test(src), 'hidden inside regions and rides');
  assert.ok(/\.r2-ov\.mbd-ov\{z-index:99995\}/.test(css));
  assert.ok(/prefers-reduced-motion:reduce/.test(css));
  assert.ok(/min-height:44px/.test(css) && /\.mbd-pal\{[^}]*width:44px;height:44px/.test(css), '44px tap targets');
  assert.ok(/lowi:body-trip-done/.test(src) && /lowi:buddy-found/.test(src) && /LowiHost\.award/.test(src));
  assert.ok(/aria-label/.test(src) && /role', 'status'/.test(src));
});

t('loader, service worker lists and update note include the buddy files', () => {
  const ui = fs.readFileSync(path.join(root, 'apple-ui.js'), 'utf8');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const ver = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8'));
  for (const f of ['microbe-buddies-core.js', 'microbe-buddies.js']) assert.ok(ui.includes(f), 'loader ' + f);
  assert.ok(ui.indexOf('microbe-buddies-core.js') < ui.indexOf('microbe-buddies.js'));
  for (const f of ['microbe-buddies-core.js', 'microbe-buddies.js', 'microbe-buddies.css']) {
    const hits = sw.split(f).length - 1;
    assert.ok(hits >= 2, 'both sw lists carry ' + f + ' (' + hits + ')');
  }
  const news = ver.news || {};
  assert.ok(/^microbe-buddies-\d{8}-\d{6}$/.test(news.id || ''), 'update note id ' + news.id);
  assert.ok(/Buddys/.test(news.text.de) && /buddies/i.test(news.text.en) && /compa\u00f1eros/i.test(news.text.es), 'note in de/en/es');
});

