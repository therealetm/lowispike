'use strict';
// 28 Oct 2026, Emmanuel (call): "on the For You page, I wanted the like button, chat button ... and the share button ... To be
// removed ... it says added to swipe. Okay, that's cool ... those gotta go." Every For You card (own and members' posts, food
// posts, Nibblo's server posts, Nibblo's swap slides, a creator's video) renders without Like, Chat or Share. Save, the
// + Swipe / In swipe button and ··· stay where they were. Community chat and the rest of the app keep their own buttons.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const html = read('index.html');

const SOCIAL = /data-tr="(like|comment|share)"/;

/* the real slideHTML from index.html, run with small stand-ins for the app around it */
function mainSlide() {
  const a = html.indexOf('function slideHTML(p){'), b = html.indexOf('function sharePost(', a);
  assert.ok(a > 0 && b > a, 'slideHTML found in index.html');
  const ctx = {
    T: { likes: {}, saved: { s1: 1 } }, DEMO: [], FY_IMG: {},
    PLAT: { web: { open: 'Open' }, tiktok: { open: 'Open TikTok' } }, PICON: { web: '', tiktok: '' },
    FIC: { heart: '<svg/>', chat: '<svg/>', save: '<svg/>', share: '<svg/>' }, IC: { more: '<svg/>', play: '', gem: '', ext: '' },
    H: () => ({ user: () => ({ name: 'Eman' }), avatar: () => '<i></i>' }),
    describe: () => ({ line: '', tags: [] }), byline: () => 'link', fyBg: () => '<div class="fy-bg"></div>',
    fyOut: () => '<button class="fy-out" data-tr="open"></button>', ago: () => 'now', fyT: s => s,
    esc: s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
    window: {
      LowiFood: { isFoodPost: p => !!p.food, railBtn: id => '<button class="fy-act r5-ftb on" data-r5="ftadd" data-id="' + id + '" aria-pressed="true"><span>In swipe</span></button>' },
      LowiForYou: {
        external: u => (/tiktok/.test(u) ? { plat: 'tiktok', name: 'TikTok', url: u } : null), note: k => k, creatorOf: () => 'someone',
        slideHTML: () => 'BOT'
      }
    }
  };
  ctx.LowiFood = ctx.window.LowiFood; ctx.LowiForYou = ctx.window.LowiForYou;
  vm.createContext(ctx);
  vm.runInContext(html.slice(a, b) + ';this.slideHTML = slideHTML;', ctx);
  return ctx.slideHTML;
}

test('For You: member, own, food and Nibblo server posts have no Like, Chat or Share; Save, Swipe and ··· stay', () => {
  const slide = mainSlide();
  const posts = {
    member: { id: 'm1', who: 'Ana', cap: 'Lunch', ts: 1, likes: 4 },
    own: { id: 's1', me: true, cap: 'Mine', ts: 1, vis: 'tribe', pub: 1, cloud: 1 },
    food: { id: 'f9', who: 'Ana', cap: 'Bowl', photo: 'x.jpg', food: true, ts: 1 },
    nibblo: { id: 'nb1', who: 'Nibblo', nb: true, photo: 'x.jpg', cap: 'Lunch idea', ts: 1 },
    textOnly: { id: 't1', who: 'Ana', cap: 'Hello', ts: 1 }
  };
  for (const [k, p] of Object.entries(posts)) {
    const out = slide(p);
    assert.doesNotMatch(out, SOCIAL, k + ': no Like, Chat or Share');
    assert.doesNotMatch(out, /class="num"|aria-label="(Like|Comment|Share)"/, k + ': no like count or social labels');
    assert.match(out, /data-tr="save"[^>]*aria-label="Save"/, k + ': Save stays');
    assert.match(out, /fy-act fy-more" data-tr="post-menu"/, k + ': ··· stays');
  }
  assert.match(slide(posts.own), /data-tr="save"[^>]*>[\s\S]*?<span>Saved<\/span>/, 'a saved post still says Saved');
  assert.match(slide(posts.food), /data-r5="ftadd"[\s\S]*In swipe/, 'the Added to Swipe button stays on food posts');
  const ext = slide({ id: 'x1', who: 'Ana', url: 'https://www.tiktok.com/@a/video/1', plat: 'tiktok', ts: 1 });
  assert.doesNotMatch(ext, SOCIAL); assert.match(ext, /fy-rail fy-rail-ext/); assert.match(ext, /data-tr="post-menu"/);
  assert.doesNotMatch(ext, /data-tr="save"/, 'a creator\'s video keeps only ··· (25 Oct rule unchanged)');
});

test('Nibblo\'s swap slide (foryou.js) has Save only, no Share', () => {
  const s = read('foryou.js'), a = s.indexOf('function slideHTML'), b = s.indexOf('function fromCommunityShare', a);
  const fn = s.slice(a, b);
  assert.doesNotMatch(fn, SOCIAL);
  assert.match(fn, /data-tr="save"/);
  assert.doesNotMatch(fn, /appT\('Share'\)/);
});

test('no double-tap like on For You any more (there is nothing to like)', () => {
  const a = html.indexOf('function renderForYou(el){'), b = html.indexOf('function fyBurst(', a);
  const rf = html.slice(a, b);
  assert.ok(a > 0 && b > a);
  assert.doesNotMatch(rf, /dblclick/);
  assert.doesNotMatch(rf, /\[data-tr="like"\]/);
});

test('the handlers stay, so Community and older cards keep working; Community chat is not touched', () => {
  for (const c of ['case "like":', 'case "comment":', 'case "share":', 'case "save":']) assert.ok(html.includes(c), c);
  assert.match(read('nav-moves.js'), /\[data-tr="comment"\]/);
});
