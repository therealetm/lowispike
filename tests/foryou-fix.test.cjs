// 25 Oct 2026, Emmanuel (voice, afternoon): "to for you page. Is there a fix? I post that. I keep losing the for you page and I
// still can't see them. Fix that." Read-only check of his real account (eman, therealetm@gmail.com) and his phone's backup:
//  - a TikTok link he posted at 10:56 ("Blutzuckerspiegel frühstück") was never sent: it was made before the 11:41 release, so it
//    carried no pub / pend / fail mark, the retry only picked up fail / pend, and the 25 Oct rule hid it from his own feed;
//  - his 12 older posts ARE in the shared table but carry no pub mark on his phone, so whenever the app was not connected yet (the
//    first seconds after opening, a weak network) they counted as "held" and vanished, and For You showed sample posts instead;
//  - Community always opens on his first tab (Room), and iOS reloads the Home Screen app after a trip to TikTok, so For You was
//    gone every time he came back with a link; "My posts" only lived on the old Tribe profile, which nothing opens any more.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const F = require('../foryou-core.js');
const html = read('index.html');

const CLOUD = new Set(['tmuzpqrt1j37oa']);
const ctx = { meal: () => null, recipe: () => null, botAccount: () => false, hidden: () => false, inCloud: id => CLOUD.has(id) };
const offline = { meal: () => null, recipe: () => null, botAccount: () => false, hidden: () => false, inCloud: () => false };
/* his phone's For You store (backup of 25 Oct, 13:37 UTC), trimmed */
const HIS = [
  { id: 'tmvnlfx69jobzd', me: true, vis: 'tribe', ts: Date.UTC(2026, 9, 25, 8, 56), plat: 'tiktok', url: 'https://vm.tiktok.com/ZNRWqNC5S/', cap: 'Blutzuckerspiegel frühstück' },
  { id: 'tmuzpqrt1j37oa', me: true, vis: 'tribe', ts: Date.UTC(2026, 9, 16, 9, 22), plat: 'tiktok', url: 'https://vm.tiktok.com/ZNRp9bF7b/', cap: '' },
  { id: 'tmv1gtapv00jql', me: true, vis: 'me', ts: Date.UTC(2026, 9, 9, 18, 0), plat: 'tiktok', url: 'https://vm.tiktok.com/ZNdKjsmqa/', cap: 'Gotta try these' }
];
const RELEASE = Date.UTC(2026, 9, 25, 16, 0);

test('everything he posted to For You shows on his own phone, connected or not, sent or still on its way', () => {
  for (const p of HIS.slice(0, 2)) {
    assert.equal(F.shows(p, ctx), true, 'connected: ' + p.id);
    assert.equal(F.shows(p, offline), true, 'not connected yet: ' + p.id);
    assert.equal(F.shows(Object.assign({}, p, { fail: 1 }), offline), true, 'a send that failed still shows to him, labelled');
  }
  /* still private to everyone else until it is in the shared table: other people only ever see cloud rows */
  assert.equal(F.shows({ id: 'x', me: true, vis: 'me', cap: 'mine' }, ctx), false, 'Only me stays only me');
});

test('what still has to go out: every own For You post not in the shared table, the old unmarked ones too', () => {
  const todo = F.toPublish(HIS, ctx).map(p => p.id);
  assert.deepEqual(todo, ['tmvnlfx69jobzd'], 'the 10:56 TikTok goes; the one already in the table does not; Only me does not');
  assert.deepEqual(F.toPublish([Object.assign({}, HIS[0], { pub: 5 })], ctx), [], 'published once is done');
  assert.deepEqual(F.toPublish([Object.assign({}, HIS[0], { vis: 'tribe', bot: true })], ctx), [], 'the bot never posts as him');
  assert.deepEqual(F.toPublish([Object.assign({}, HIS[0], { cloud: true })], ctx), []);
  assert.deepEqual(F.toPublish(null, ctx), []);
});

test('his old links marked Only me before today go to For You once; photos, notes and anything after today stay private', () => {
  const list = HIS.map(p => Object.assign({}, p));
  const photo = { id: 'ph', me: true, vis: 'me', ts: Date.UTC(2026, 9, 10), photo: 'data:image/jpeg;base64,AAA', cap: 'Lunch' };
  const text = { id: 'tx', me: true, vis: 'me', ts: Date.UTC(2026, 9, 10), cap: 'note to self' };
  const later = { id: 'lt', me: true, vis: 'me', ts: RELEASE + 60000, plat: 'youtube', url: 'https://youtu.be/dQw4w9WgXcQ' };
  const vid = { id: 'vd', me: true, vis: 'me', ts: Date.UTC(2026, 9, 10), vid: 1, url: '' };
  list.push(photo, text, later, vid);
  assert.equal(F.freeLinks(list, RELEASE), 1);
  assert.equal(list[2].vis, 'tribe', '"Gotta try these" (a TikTok link)');
  assert.equal(photo.vis, 'me'); assert.equal(text.vis, 'me'); assert.equal(later.vis, 'me'); assert.equal(vid.vis, 'me');
  assert.equal(F.freeLinks(list, RELEASE), 0, 'nothing left to move');
});

test('labels for the new bits in English, German and Spanish', () => {
  for (const k of ['mine', 'sending', 'retrying']) {
    const [en, de, es] = F.NOTE[k];
    assert.ok(en && de && es && en !== de && en !== es, k);
  }
  assert.equal(F.note('mine', 'de'), 'Meine Beiträge');
});

test('index.html: sends unmarked posts on its own, quietly, keeps their date, and marks what is already in the table', () => {
  const share = html.slice(html.indexOf('function retryShares()'), html.indexOf('function heldPosts()'));
  assert.ok(share.includes('LowiForYou.toPublish('), 'the unmarked ones go too');
  assert.ok(share.includes('LowiForYou.freeLinks(T.posts, FY_FREE_BEFORE)') && share.includes('T.freed1'), 'one pass, remembered');
  assert.ok(share.includes('q.pub = q.pub || Date.now()'), 'posts already in the table get their mark, so they never look held');
  assert.ok(share.includes('sharePost(p, null, true)'), 'background sends are quiet: no toast every minute');
  const pub = html.slice(html.indexOf('async function publish(p, file'), html.indexOf('async function unpublish('));
  assert.ok(pub.includes('created_at:'), 'an older post keeps its own date, so it does not jump to the top for everyone');
  assert.ok(pub.includes('if (!quiet) toast('), 'quiet sends never toast');
});

test('index.html: For You paints the last real feed while it connects, never the sample posts', () => {
  const fa = html.slice(html.indexOf('function feedAll(){'), html.indexOf('function ago(ts)'));
  assert.ok(fa.includes('fyCacheRead()') && fa.includes('fyCacheWrite('), 'cache read when not connected, written when connected');
  assert.ok(!/const remote = on \? CL\.posts\(\) : DEMO;/.test(fa), 'no sample posts in place of the real feed');
  const c = html.slice(html.indexOf('function fyCacheRead()'), html.indexOf('function fyCacheRead()') + 1200);
  assert.ok(c.includes('"lowi.fycache.v1"') && c.includes('uid'), 'per account, on this device only (lowi.* keys outside the backup list)');
  assert.equal(require('../account-sync-core.js').synced('lowi.fycache.v1'), false, 'never copied into the account backup');
});

test('index.html: a new post lands at the top in view, My posts sits on the feed, and My posts lists the cloud ones too', () => {
  const rf = html.slice(html.indexOf('function renderForYou(el){'), html.indexOf('function fyBurst('));
  assert.ok(rf.includes('data-tr="list-mine"') && rf.includes('fy-mine'), 'a My posts button on the feed itself');
  assert.ok(rf.includes('fyTop') && rf.includes('f.scrollTop = fyTop ? 0 : y'));
  const dp = html.slice(html.indexOf('function doPost(btn){'), html.indexOf('function doPost(btn){') + 2500);
  assert.ok(dp.includes('fyTop = 1'));
  const ls = html.slice(html.indexOf('function listSheet(kind){'), html.indexOf('function listSheet(kind){') + 900);
  assert.ok(ls.includes('fyMineAll()'), 'My posts shows every post of his, also those only in the shared table');
  const sl = html.slice(html.indexOf('function slideHTML(p){'), html.indexOf('function sharePost('));
  assert.ok(sl.includes('fy-state'), 'an own post that is not out yet says so on the slide');
});

test('index.html: the bot list loads even when the scripts arrive after the connection', () => {
  const s = html.slice(html.indexOf('async function start(){'), html.indexOf('async function start(){') + 9000);
  assert.ok(s.includes('fyBotsLater(sb)'), 'retried once the script is there');
  assert.ok(html.includes('function fyBotsLater(sb, n)'));
});

test('foryou-stay.js: back on For You, at the same post, after iOS reloads the app (30 minutes)', () => {
  const S = require('../foryou-stay.js');
  const now = Date.UTC(2026, 9, 25, 14, 0);
  assert.equal(S.resume({ fy: 1, id: 'a', at: now - 5 * 60000 }, now, ''), 'a');
  assert.equal(S.resume({ fy: 1, id: '', at: now - 5 * 60000 }, now, ''), '', 'For You, at the top');
  assert.equal(S.resume({ fy: 1, id: 'a', at: now - 31 * 60000 }, now, ''), null, 'too long ago: the first tab rule');
  assert.equal(S.resume({ fy: 0, id: 'a', at: now - 60000 }, now, ''), null, 'he was somewhere else');
  assert.equal(S.resume({ fy: 1, id: 'a', at: now - 60000 }, now, '#community/affiliates'), null, 'a link wins');
  assert.equal(S.resume(null, now, ''), null);
  assert.ok(html.includes('<script src="foryou-stay.js'), 'loaded by the app');
  const sw = read('sw.js'); assert.ok(sw.includes('foryou-stay.js'), 'cached for offline');
});

test('community-tab-order.js: back in Community within 30 minutes of leaving it from For You opens For You, links still win', () => {
  const t = read('community-tab-order.js');
  const i = t.indexOf('function openFirst(deep)'), seg = t.slice(i, i + 2600);
  assert.ok(seg.includes('W.LowiForYouStay.back()') && seg.includes("act = (R.view && R.view() === 'fy') ? null : 'fy'"));
  assert.ok(seg.includes('if (!deep && W.LowiForYouStay'), 'a link into Community is not overridden');
  const s = read('foryou-stay.js');
  assert.ok(s.includes("api.back = () => lastView === 'fy' && Date.now() - lastSeen < MAX"));
});
