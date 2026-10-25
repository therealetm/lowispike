// 25 Oct 2026, Emmanuel (voice 10:02): "when someone, me or anyone, posts on the For You page, it's actually there" and
// "if it's a video from someone else, it shouldn't play in our platform. It should take them to their platform ...
// We're a supportive tribe." (DECISIONS.md, 2026-10-25). foryou-core.js shows / held / external / love, index.html TRIBE.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const F = require('../foryou-core.js');
const S = require('../meal-photo.js');
const html = read('index.html');

const BOTS = new Set(['crowd-1']), HIDDEN = new Set(['test-hidden']), CLOUD = new Set(['in-cloud']);
const ctx = {
  meal: m => (S.clean(m) || {}).bs, recipe: () => null,
  botAccount: p => !p.me && BOTS.has(p.uid), hidden: p => !p.me && HIDDEN.has(p.uid), inCloud: id => CLOUD.has(id)
};
const highMeal = { name: 'Fufu', items: [{ name: 'Fufu', grams: 400, carbs: 90, sugar: 2, fiber: 1, protein: 3, fat: 1, kcal: 400 }], total: { carbs: 90, sugar: 2, fiber: 1, protein: 3, fat: 1, kcal: 400 } };

/* Emmanuel's My posts on 25 Oct, as they were stored: meant for For You (vis tribe), never published */
const HIS = [
  { id: 'p1', me: true, vis: 'tribe', cap: 'Blutzuckerspiegel frühstück', vid: 1 },
  { id: 'p2', me: true, vis: 'tribe', cap: 'Just ate: Phở', photo: 'data:image/jpeg;base64,AAA' },
  { id: 'p3', me: true, vis: 'tribe', cap: 'Fufu', meta: { meal: highMeal } },
  { id: 'p4', me: true, vis: 'tribe', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', plat: 'youtube', cap: 'Harvard Psychiatrist REVEALS The Foods You Must STOP EATING To HEAL Your BRAIN!' }
];

test('a member\'s new post to For You shows for everyone: video, link, plain photo, any meal', () => {
  for (const p of HIS) {
    const fresh = Object.assign({}, p, { pub: 1 });
    assert.equal(F.shows(fresh, ctx), true, 'own: ' + p.cap);
    const remote = Object.assign({}, p, { me: false, uid: 'real-member', cloud: true });
    assert.equal(F.shows(remote, ctx), true, 'seen by a second member: ' + p.cap);
  }
  /* in flight it already shows on the poster's own phone */
  assert.equal(F.shows(Object.assign({}, HIS[1], { pend: 1 }), ctx), true);
});

test('what the app adds by itself keeps the insulin rule; hidden accounts never show', () => {
  const crowd = { id: 'c1', uid: 'crowd-1', cloud: true, cap: 'Just ate: curry', photo: 'https://x/y.jpg' };
  assert.equal(F.shows(crowd, ctx), false, 'a crowd account\'s post with no low-spike verdict');
  assert.equal(F.shows({ id: 'h1', uid: 'test-hidden', cloud: true, cap: 'hi' }, ctx), false);
  assert.equal(F.shows({ id: 'x1', cap: 'Just ate: pasta' }, ctx), false, 'no known author: the insulin rule');
  assert.equal(F.shows({ id: 'b1', bot: true, cap: 'x', meta: { meal: highMeal } }, ctx), false, 'the bot never shows a spike meal');
  const merged = F.merge([crowd, Object.assign({}, HIS[3], { me: false, uid: 'real-member', cloud: true })], [], ctx);
  assert.deepEqual(merged.map(p => p.id), ['p4']);
});

test('a private post stays private; a post kept back is labelled, never silently hidden', () => {
  assert.equal(F.shows({ id: 'm', me: true, vis: 'me', cap: 'mine' }, ctx), false);
  /* the posts the 24 Oct rule kept back: held, so My posts says "Not in For You yet" and offers to share them */
  for (const p of HIS) assert.equal(F.held(p, ctx), true, p.cap);
  for (const p of HIS) assert.equal(F.shows(p, ctx), false, 'not in For You until shared: ' + p.cap);
  /* already in the shared table, published, in flight or private: not held */
  assert.equal(F.held(Object.assign({}, HIS[0], { id: 'in-cloud' }), ctx), false);
  assert.equal(F.held(Object.assign({}, HIS[0], { pub: 5 }), ctx), false);
  assert.equal(F.held(Object.assign({}, HIS[0], { pend: 1 }), ctx), false);
  assert.equal(F.held(Object.assign({}, HIS[0], { vis: 'me' }), ctx), false);
  /* could not go (no connection): held until it goes */
  assert.equal(F.held(Object.assign({}, HIS[0], { fail: 1 }), ctx), true);
});

test('the poster is told in EN, DE and ES, and the old "For You only shows insulin-friendly food" toast is gone', () => {
  for (const k of ['post', 'shared', 'nowIn', 'onlyNow', 'inFy', 'onlyYou', 'sending', 'heldTag', 'shareNow', 'onlyMe', 'heldWhy', 'heldOne', 'shareAll', 'sharedN', 'watchOn', 'byWho', 'love', 'loveAnon']) {
    const [en, de, es] = F.NOTE[k];
    assert.ok(en && de && es && en !== de && en !== es, k);
  }
  assert.ok(!/only shows insulin-friendly food/i.test(JSON.stringify(F.NOTE.post)));
  assert.equal(F.note('shareAll', 'de', { n: 14 }), 'Alle 14 in Für dich teilen');
  assert.match(F.note('heldWhy', 'en', { n: 14 }), /^14 of your posts are not in For You yet\./);
});

test('a creator\'s video: platform, creator and the supportive-tribe nudge, in three languages', () => {
  const yt = { url: 'https://youtu.be/dQw4w9WgXcQ', meta: { author: 'Dr. Chris Palmer' } };
  assert.equal(F.love(yt, 'en'), 'Show Dr. Chris Palmer some love: watch it on YouTube, follow them and like the original. We\'re a supportive tribe.');
  assert.match(F.love(yt, 'de'), /^Zeig Dr\. Chris Palmer etwas Liebe: schau es auf YouTube/);
  assert.match(F.love(yt, 'es'), /^Dale amor a Dr\. Chris Palmer: míralo en YouTube.*Somos una tribu que se apoya\.$/);
  assert.match(F.love({ url: 'https://www.instagram.com/reel/Cxyz/' }, 'en'), /^Show the creator some love: watch it on Instagram/);
  assert.equal(F.love({ url: 'https://example.com/article' }, 'en'), '', 'an ordinary web link gets no video nudge');
  assert.equal(F.note('watchOn', 'es', { p: 'TikTok' }), 'Ver en TikTok');
});

test('a real picture instead of the placeholder: YouTube\'s own still, else the link\'s https preview', () => {
  assert.equal(F.thumbOf({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }), 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  assert.equal(F.thumbOf({ url: 'https://www.youtube.com/shorts/dQw4w9WgXcQ', meta: { thumb: 'https://old/expired.jpg' } }), 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  assert.equal(F.thumbOf({ url: 'https://www.tiktok.com/@a/video/1', meta: { thumb: 'https://p16.tiktokcdn.com/a.jpg' } }), 'https://p16.tiktokcdn.com/a.jpg');
  assert.equal(F.thumbOf({ url: 'https://www.tiktok.com/@a/video/1', meta: { thumb: 'javascript:alert(1)' } }), '');
  const bg = html.slice(html.indexOf('function fyBg('), html.indexOf('function fyOut('));
  assert.ok(bg.includes('FYX.thumbOf(p)') && bg.includes('fy-art-ext') && bg.includes('FY_PLAT_ART[ex.plat]'));
});

test('the slide links out: "Watch on ..." card with the creator, no in-app player for another platform', () => {
  const slide = html.slice(html.indexOf('function slideHTML'), html.indexOf('function sharePost'));
  assert.ok(slide.includes('(ex ? fyOut(p, ex) : p.url ?'));
  assert.ok(slide.includes('LowiForYou.note("watchOn", {p: ex.name})'));
  const out = html.slice(html.indexOf('function fyOut('), html.indexOf('function fyOut(') + 900);
  assert.ok(out.includes('data-tr="open"') && out.includes('FYX.note("byWho", {who})') && out.includes('<p class="fy-love">'));
});

test('publishing marks every post and retries what could not go; My posts and ··· let the poster choose', () => {
  const share = html.slice(html.indexOf('function sharePost(p, file)'), html.indexOf('function renderForYou(el)'));
  assert.ok(share.includes('p.pend = 1; delete p.fail; save();'));
  assert.ok(share.includes('if (ok) { q.pub = Date.now(); delete q.fail; } else q.fail = 1;'));
  assert.ok(share.includes('!p.pub && (p.fail || p.pend)'), 'retries failed and interrupted posts');
  assert.ok(html.includes('load(); retryShares(); const list = feed();'));
  assert.ok(html.includes('case "share-held": {') && html.includes('case "vis-me": {'));
  assert.ok(html.includes('data-tr="share-held"'), 'one tap to share the posts kept back, never flipped without asking');
  const menu = html.slice(html.indexOf('function postMenu'), html.indexOf('function postMenu') + 2600);
  assert.ok(menu.includes('fn("shareNow", "Share to For You")') && menu.includes('fn("heldOne", "")'));
  const list = html.slice(html.indexOf('function listSheet'), html.indexOf('function listSheet') + 3000);
  assert.ok(list.includes('fn("heldTag", "Not in For You yet")') && list.includes('fn("inFy", "In For You")') && list.includes('fn("onlyYou", "Only you")'));
  assert.ok(!/LowiForYou\.passes\(p\)\) \? "In For You" : "Only you"/.test(html));
});

test('the feed asks who is a bot or hidden, and re-checks when the bot list arrives', () => {
  const fy = read('foryou.js');
  assert.ok(fy.includes('B.isBot(p)') && fy.includes('Hd.isHidden(p.uid)') && fy.includes('CL.post(id)'));
  assert.ok(fy.includes("addEventListener('lowi-bots'"));
});

test('no age next to a name, not even your own', () => {
  const d = html.slice(html.indexOf('function detailsBits('), html.indexOf('function detailsBits(') + 400);
  assert.ok(!d.includes('ageOf('));
});
