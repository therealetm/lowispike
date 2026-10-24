// For You only shows insulin-friendly items (DECISIONS.md, 24 Oct 2026). foryou-core.js / foryou.js.
// Emmanuel: "From now on make sure they're always insulin friendly and fit our whole LOWiSPIKE scene."
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const F = require('../foryou-core.js');
const I = require('../inspo-core.js');
const S = require('../meal-photo.js');

const html = read('index.html');
const BOOK = (() => {
  const a = html.indexOf('const RECIPE_BOOK = ['), b = html.indexOf('\n];', a);
  /* constants the literal names (NOTE_SAUCE ...) read as '' : only n and r matter here */
  const scope = new Proxy({}, { has: (t, k) => k !== 'Array' && k !== 'Object' && k !== 'String' && k !== 'JSON', get: () => '' });
  const list = new Function('scope', 'with (scope) { return ' + html.slice(a + 'const RECIPE_BOOK = '.length, b + 2) + '; }')(scope);
  list.forEach(r => { r.id = I.bookId(r.n); });
  return list;
})();
const ctx = { meal: m => (S.clean(m) || {}).bs, recipe: id => BOOK.find(r => r.id === id) || null };
const meal = (name, carbs, fiber, protein) => ({ name, items: [{ name, grams: 300, carbs, sugar: 2, fiber, protein, fat: 12, kcal: 400 }],
  total: { carbs, sugar: 2, fiber, protein, fat: 12, kcal: 400 } });

test('the seeded "Just ate" posts from the screenshots do not show: they carry no insulin-friendly verdict', () => {
  const crowd = JSON.parse(read('tools/community-crowd/meal-photos.json'));
  const names = JSON.stringify(crowd);
  for (const n of ['Garides Saganaki', 'Presh me Oriz Leek and Rice Bake', 'Panang chicken curry']) assert.ok(names.includes(n), n + ' is in the crowd photo list');
  const posts = [
    { id: 'c1', who: 'Sofía O.', cap: 'Just ate: Garides Saganaki', photo: 'https://x.supabase.co/a.jpg', meta: null },
    { id: 'c2', who: 'Paolo H.', cap: 'Just ate: Presh me Oriz Leek and Rice Bake', photo: 'https://x.supabase.co/b.jpg', meta: null },
    { id: 'c3', who: 'Niklas', cap: 'Just ate: Panang chicken curry', photo: 'https://x.supabase.co/c.jpg' },
    { id: 'v1', plat: 'tiktok', url: 'https://www.tiktok.com/@x/video/1', cap: 'Pasta night' },
    { id: 't1', cap: 'Feeling great today' }
  ];
  for (const p of posts) { assert.equal(F.verdict(p, ctx), ''); assert.equal(F.passes(p, ctx), false); }
  assert.deepEqual(F.filter(posts, ctx), []);
});

test('meals are scored again on the phone with the app\'s own meal logic; only a low spike passes', () => {
  const low = { id: 'm1', photo: 'https://x/a.jpg', meta: { meal: meal('Salmon, broccoli and egg', 9, 7, 38) } };
  const high = { id: 'm2', photo: 'https://x/b.jpg', meta: { meal: meal('Leek and rice bake', 78, 3, 14) } };
  assert.equal(S.clean(low.meta.meal).bs, 'low');
  assert.notEqual(S.clean(high.meta.meal).bs, 'low');
  assert.equal(F.passes(low, ctx), true);
  assert.equal(F.passes(high, ctx), false);
  /* a forged bs label is ignored: the phone recomputes it from the numbers */
  const forged = { id: 'm3', meta: { meal: Object.assign(meal('Rice', 90, 1, 5), { bs: 'low' }) } };
  assert.equal(F.passes(forged, ctx), false);
  /* a meal the phone cannot score does not pass */
  assert.equal(F.passes({ id: 'm4', meta: { meal: {} } }, { recipe: ctx.recipe }), false);
});

test('Recipe Book recipes pass by their own verdict; the worst verdict on an item wins', () => {
  const ja = BOOK.find(r => r.r === 'ja'), notJa = BOOK.find(r => r.r && r.r !== 'ja');
  assert.ok(ja);
  assert.equal(F.passes({ id: 'r1', rec: ja.id, cap: 'Dinner' }, ctx), true);
  if (notJa) assert.equal(F.passes({ id: 'r2', rec: notJa.id }, ctx), false);
  assert.equal(F.passes({ id: 'r3', rec: 'rb_does_not_exist' }, ctx), false, 'unknown recipe id fails');
  assert.equal(F.passes({ id: 'r4', rec: ja.id, meta: { meal: meal('Rice bowl', 90, 1, 5) } }, ctx), false, 'a high meal with a good recipe chip still fails');
  assert.equal(F.passes({ id: 'r5', rec: ja.id, meta: { spike: 'mid' } }, ctx), false);
});

test('every one of the inspiration bot\'s slides passes the same rule, with no free pass', () => {
  for (const l of I.LANGS) for (let d = 0; d < 40; d++) {
    for (const p of I.feed({ now: Date.UTC(2026, 9, 1 + d, 12), lang: l })) {
      assert.equal(F.verdict(p, ctx), 'low', p.id + ' ' + p.rec);
      assert.equal(ctx.recipe(p.rec).r, 'ja');
    }
  }
  assert.equal(F.passes({ id: 'b', bot: true, cap: 'x' }, ctx), false, 'a bot post without a recipe fails too');
  const merged = F.merge([{ id: 'c1', cap: 'Just ate: curry', ts: Date.now() + 1 }], I.feed({ now: Date.now(), lang: 'en' }), ctx);
  assert.equal(merged.length, 5);
  assert.ok(merged.every(p => p.bot));
});

test('Share -> Community also posts to For You when it passes; otherwise Community only, with a gentle note', () => {
  const body = 'meal:https://abc.supabase.co/storage/v1/object/public/community/u/1.jpg';
  const parse = s => (s.startsWith('meal:') ? { src: s.slice(5) } : null);
  const src = F.srcOfRow({ id: 9, t: body, room: 'x' }, parse);
  assert.equal(src, 'https://abc.supabase.co/storage/v1/object/public/community/u/1.jpg');
  const ok = F.sharePost({ src, name: 'Chicken & greens', lvl: 'low', caption: 'Lunch', id: 'log1', now: 5 });
  assert.equal(ok.vis, 'tribe'); assert.equal(ok.photo, src); assert.equal(ok.meta.spike, 'low'); assert.equal(ok.cap, 'Lunch'); assert.equal(ok.ts, 5);
  assert.equal(F.passes(ok, ctx), true);
  const mid = F.sharePost({ src, name: 'Pasta', lvl: 'mid' });
  assert.equal(F.passes(mid, ctx), false);
  assert.equal(F.sharePost({ src: 'http://insecure/x.jpg', name: 'A', lvl: 'low' }), null);
  assert.equal(F.sharePost({ src, name: '', lvl: 'low' }), null);
  for (const l of ['en', 'de', 'es']) for (const k of ['both', 'only', 'post']) assert.ok(F.note(k, l).length > 10);
  assert.match(F.note('only', 'de'), /Für dich/);
  assert.match(F.note('only', 'es'), /Para ti/);
  const mj = read('meal-journal.js');
  assert.match(mj, /const row = await C\.shareMeal\(/);
  assert.match(mj, /root\.LowiForYou\.fromCommunityShare\(\{ row, id: log\.id, name: s\.name, lvl: s\.lvl, caption: s\.caption \}\)/);
  assert.match(mj, /Low-spike meals also show in For You/);
  assert.match(mj, /erscheinen auch in Für dich/);
  assert.match(mj, /también salen en Para ti/);
});

test('the composer keeps posts that fail in My posts: not published, no XP, a gentle note', () => {
  assert.match(html, /const fyOk = !window\.LowiForYou \|\| LowiForYou\.passes\(p\);\n  if \(p\.vis === "tribe" && !fyOk\) h\.toast\(LowiForYou\.note\("post"\)\);\n  else if \(p\.vis === "tribe" && window\.LOWI_CLOUD\) LOWI_CLOUD\.publish\(p\);/);
  assert.match(html, /if \(fyOk && window\.LOWI_CLOUD\) LOWI_CLOUD\.publish\(p, u\.file\);/);
  assert.match(html, /if \(p\.vis === "tribe" && fyOk\) LOWI_CLOUD\.publish\(p\); else LOWI_CLOUD\.unpublish\(p\.id\);/);
});

test('the rule is written down and every new file ships with the build', () => {
  const d = read('DECISIONS.md');
  assert.match(d, /For You only shows insulin-friendly items/);
  const sw = read('sw.js');
  for (const f of ['foryou.css', 'foryou-core.js', 'inspo-core.js', 'foryou.js']) {
    assert.ok(sw.includes('"' + f + '"'), f + ' in the offline list');
    assert.ok(new RegExp(f.replace('.', '\\.') + '\\?v=\\d{8}-\\d{6}').test(html), f + ' carries the build number');
  }
  assert.ok(html.indexOf('foryou-core.js?v=') < html.indexOf('foryou.js?v='));
});
