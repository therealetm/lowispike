// Oct 25, 2026 (Emmanuel, voice, with a screenshot of his "Blutzuckerspiegel frühstück" post in For You):
// "every TikTok video inside my app, we see a thumbnail, the thumbnail or preview at least. And there is a play button which opens
// TikTok ... It should open TikTok direct. ... Show the creator some love." And later: "When someone is posting someone else's
// TikTok, remove the like button, the chat button, the save button, the share button, the swipe button. All the engagement is
// just dedicated for that TikTok video."
// The screenshot: a dark gradient with a generic play circle (the stored TikTok picture link had expired), "Watch on TikTok" and a
// two-line caption. tiktok-open.js + supabase/functions/tiktok-meta + foryou-core.js + index.html TRIBE.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const F = require('../foryou-core.js');
const TT = require('../tiktok-open.js');
const STORED = 'https://vnfwmifmsfecascwaody.supabase.co/storage/v1/object/public/media/tiktok/7696524020799327520.jpg';
const OLD = 'https://p16-common-sign.tiktokcdn-eu.com/tos-no1a-p-0037-no/abc~tplv-tiktokx-origin.image?dr=9636&x-expires=1761426000&x-signature=xyz';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';

test('an expired TikTok picture link counts as no picture; the stored copy and YouTube stills stay', () => {
  const now = Date.UTC(2026, 9, 25, 16);
  assert.equal(F.expired(OLD, now), true);
  assert.equal(F.expired(OLD.replace('1761426000', '1893456000'), now), false, 'not yet expired');
  assert.equal(F.expired(STORED, now), false, 'our own storage never expires');
  assert.equal(F.thumbOf({ url: 'https://vm.tiktok.com/ZGdCv8Hje/', meta: { thumb: OLD } }), '');
  assert.equal(F.thumbOf({ url: 'https://vm.tiktok.com/ZGdCv8Hje/', meta: { thumb: STORED } }), STORED);
  assert.equal(F.thumbOf({ url: 'https://youtu.be/dQw4w9WgXcQ' }), 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
});

test('the stored picture is asked for at the size it is drawn, cropped to cover, never stretched', () => {
  assert.equal(TT.stable(STORED), true);
  assert.equal(TT.stable(OLD), false);
  assert.equal(TT.stable('https://evil.example/storage/v1/object/public/media/tiktok/1234567890.jpg'), false);
  const big = TT.sized(STORED, 720, 1280), small = TT.sized(STORED, 160, 284);
  assert.ok(big.includes('/storage/v1/render/image/public/media/tiktok/7696524020799327520.jpg?width=720&height=1280&resize=cover'));
  assert.ok(small.includes('width=160&height=284&resize=cover'));
  assert.equal(TT.sized('https://i.ytimg.com/vi/x/hqdefault.jpg', 720, 1280), 'https://i.ytimg.com/vi/x/hqdefault.jpg', 'other pictures as they are');
  const html = read('index.html');
  assert.ok(/function fyThumbImg\(th, small\)/.test(html));
  assert.ok(html.includes('loading="lazy" decoding="async" referrerpolicy="no-referrer" data-full='), 'lazy, async decode, falls back to the full picture');
  assert.ok(/\.fy-art\.fy-art-ext > img \{[^}]*object-fit: cover/.test(read('fy-embed.css')));
});

test('the video id comes from the server (short links too) or the link; the app link is TikTok\'s own scheme', () => {
  assert.equal(TT.vidOf({ url: 'https://vm.tiktok.com/ZGdCv8Hje/', meta: { vid: '7696524020799327520' } }), '7696524020799327520');
  assert.equal(TT.vidOf({ url: 'https://www.tiktok.com/@doctorbowl/video/7609791526398381334?lang=de' }), '7609791526398381334');
  assert.equal(TT.vidOf({ url: 'https://vm.tiktok.com/ZGdCv8Hje/' }), '');
  assert.equal(TT.appURL('7696524020799327520'), 'snssdk1233://aweme/detail/7696524020799327520');
  assert.equal(TT.appURL('abc'), '');
  assert.equal(TT.needsHeal({ cloud: true, url: 'https://vm.tiktok.com/x/', meta: { thumb: OLD } }), true);
  assert.equal(TT.needsHeal({ cloud: true, url: 'https://vm.tiktok.com/x/', meta: { thumb: STORED } }), false);
  assert.equal(TT.needsHeal({ cloud: false, url: 'https://vm.tiktok.com/x/' }), false, 'a post not in the shared table yet waits');
  assert.equal(TT.needsHeal({ cloud: true, url: 'https://youtu.be/dQw4w9WgXcQ' }), false);
});

/* a tiny Home Screen page: records navigations and timers */
function page({ ua = IPHONE, standalone = true } = {}) {
  const L = {}, timers = [], log = { nav: [] };
  const document = { visibilityState: 'visible', documentElement: { lang: 'de' }, addEventListener: (t, f) => { (L[t] = L[t] || []).push(f); }, querySelectorAll: () => [] };
  const loc = { _h: 'https://therealetm.github.io/lowispike/', get href() { return this._h; }, set href(u) { log.nav.push(String(u)); } };
  const win = { document, location: loc, navigator: { userAgent: ua, standalone, platform: 'iPhone', maxTouchPoints: 5 },
    matchMedia: q => ({ matches: standalone && /standalone/.test(q) }), setTimeout: (f, ms) => { timers.push([f, ms]); return timers.length; }, clearTimeout() {},
    sessionStorage: { getItem: () => null, setItem() {} }, toast: m => { log.toast = m; } };
  win.window = win;
  vm.runInNewContext(read('tiktok-open.js'), { window: win, document, navigator: win.navigator, URL, JSON, Date, Array, String, Number });
  return { win, document, log, timers, L };
}
const POST = { id: 'tmvnlfx69jobzd', url: 'https://vm.tiktok.com/ZGdCv8Hje/', meta: { vid: '7696524020799327520' } };

test('Home Screen app on iPhone: the tap goes straight to the TikTok app; no app, the next tap opens the TikTok page', () => {
  const { win, log, timers } = page();
  const small = { textContent: 'von @glowwithshiva' };
  const btn = { closest: s => (s === '.fy-slide' ? { querySelector: q => (q === '.fy-out small' ? small : null) } : null) };
  assert.equal(win.LowiTikTok.open(POST, btn), true);
  assert.deepEqual(log.nav, ['snssdk1233://aweme/detail/7696524020799327520']);
  const [stayed, ms] = timers.find(t => t[1] === 2500); assert.equal(ms, 2500);
  stayed(); /* still on the page after 2.5 s: no TikTok app */
  assert.equal(small.textContent, 'Keine TikTok-App? Nochmal tippen für den Browser');
  assert.equal(win.LowiTikTok.open(POST, btn), false, 'second tap: the caller opens the https page');
  assert.equal(small.textContent, 'von @glowwithshiva', 'the button reads as before');
});

test('the app took it (page went to the background): no hint, the next tap goes to the app again', () => {
  const { win, document, log, timers, L } = page();
  win.LowiTikTok.open(POST, null);
  document.visibilityState = 'hidden'; L.visibilitychange.forEach(f => f());
  timers.find(t => t[1] === 2500)[0]();
  document.visibilityState = 'visible';
  assert.equal(log.toast, undefined);
  assert.equal(win.LowiTikTok.open(POST, null), true);
  assert.equal(log.nav.length, 2);
});

test('Safari tab, Android or desktop: the plain https link (the system hands it to the app); no id: the link too', () => {
  assert.equal(page({ standalone: false }).win.LowiTikTok.open(POST, null), false);
  assert.equal(page({ ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)' }).win.LowiTikTok.open(POST, null), false);
  assert.equal(page().win.LowiTikTok.open({ url: 'https://vm.tiktok.com/ZGdCv8Hje/' }, null), false);
  const html = read('index.html');
  assert.ok(html.includes('if (ex && ex.plat === "tiktok" && window.LowiTikTok && LowiTikTok.open(p, b)) break;\n      window.open(u, "_blank", "noopener");'));
  assert.ok(html.includes('<script src="tiktok-open.js?v='));
  assert.ok(/"tiktok-open\.js"/.test(read('sw.js')), 'works offline too');
});

test('"Show the creator some love" is the button, one short line under it, natural in German and Spanish', () => {
  assert.equal(F.note('loveBtn', 'en'), 'Show the creator some love');
  assert.equal(F.note('loveBtn', 'de'), 'Zeig dem Creator etwas Liebe');
  assert.equal(F.note('loveBtn', 'es'), 'Dale amor al creador');
  assert.equal(F.note('loveSub', 'en'), 'Follow & like the original 💜');
  assert.equal(F.note('loveSub', 'de'), 'Folgen & das Original liken 💜');
  assert.equal(F.note('loveSub', 'es'), 'Síguele y dale like al original 💜');
  for (const l of ['en', 'de', 'es']) assert.ok(F.note('loveSub', l).length <= 36 && F.note('loveBtn', l).length <= 30, 'short: ' + l);
  const html = read('index.html');
  assert.ok(html.includes('esc(FYX.note("loveBtn"))') && html.includes('esc(FYX.note("loveSub"))'));
  assert.ok(!/esc\(FYX\.love\(p\)\)/.test(html), 'the long two-line caption is gone from the card');
  assert.ok(html.includes('watch = ex ? LowiForYou.note("loveBtn") + " \\u00b7 " + LowiForYou.note("watchOn", {p: ex.name}) : pl.open'), 'the play button says the same to screen readers');
});

test('a creator\'s video has no like, chat, save, share or Swipe in the rail; only ··· stays; own posts keep them all', () => {
  const html = read('index.html');
  const a = html.indexOf('function slideHTML(p){'), b = html.indexOf('function sharePost(', a), s = html.slice(a, b);
  assert.ok(s.includes(`'<div class="fy-rail' + (ex ? ' fy-rail-ext' : '') + '">' + (ex ? '' :`));
  const gated = s.slice(s.indexOf("(ex ? '' :"), s.indexOf('fy-act fy-more'));
  for (const k of ['data-tr="like"', 'data-tr="comment"', 'data-tr="save"', 'data-tr="share"', 'LowiFood.railBtn']) assert.ok(gated.includes(k), k + ' only for non-creator posts');
  assert.ok(gated.trim().endsWith("LowiFood.railBtn(p.id) : \"\")) +\n      '<button class=\""), 'the ··· button sits outside the gate');
});

test('server: oEmbed with a page fallback, the picture copied into our storage, the stable link written on the post', () => {
  const fn = read('supabase/functions/tiktok-meta/index.ts');
  assert.ok(fn.includes('https://www.tiktok.com/oembed?url='));
  assert.ok(fn.includes('__UNIVERSAL_DATA_FOR_REHYDRATION__'), 'oEmbed gives no picture from some regions: the video page has the cover');
  assert.ok(fn.includes('admin.storage.from("media").upload("tiktok/" + vid + "." + ext'));
  assert.ok(fn.includes('meta.thumb = m.thumb') && !/meta\.thumb = src/.test(fn), 'only the stored copy is ever written, never TikTok\'s expiring link');
  assert.ok(fn.includes('old.thumb.startsWith(PUB) && old.vid'), 'idempotent');
  const html = read('index.html');
  assert.ok(html.includes('function fyHealThumbs(){') && /fyHealThumbs\(\); load\(\); retryShares\(\); const list = feed\(\);/.test(html));
  assert.ok(html.includes('if (TT && was && was.meta && TT.stable(was.meta.thumb)'), 'a re-send keeps the stored picture');
});
