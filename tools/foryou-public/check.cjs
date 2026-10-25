'use strict';
/* Browser simulation (not a real phone) for 25 Oct 2026 (Emmanuel: "when someone, me or anyone, posts on the For You page,
   it's actually there" and "if it's a video from someone else, it shouldn't play in our platform. It should take them to
   their platform"). Real cloud, TWO marked test accounts (A posts, B looks), so nothing reaches real people:
   1. A's phone holds one old post the 24 Oct rule kept back: My posts says "Not in For You yet" and offers "Share ... to
      For You"; one tap shares it.
   2. A posts a fresh YouTube link with the For You composer (finger taps, typed link and caption): the toast says it is in
      For You and My posts says "In For You".
   3. B opens Community > For You and finds both posts. A's YouTube slide shows YouTube's own still, "Watch on YouTube" and
      the supportive-tribe line in B's language; a tap on its play button opens the original youtube.com link in a new tab
      and no player appears inside LOWiSPIKE.
   4. A deletes both posts, both test profiles are cleaned up.
   node tools/foryou-public/check.cjs [--url LIVE|http://127.0.0.1:PORT/] [--view i13|ipad] [--lang en|de|es] [--out DIR]
   ENGINE=chromium|webkit */
const path = require('path'), fs = require('fs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TA = require('../test-account.cjs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const URL0 = arg('url', 'https://therealetm.github.io/lowispike/'), OUT = arg('out', '/tmp/foryou-public-shots');
const ENG = process.env.ENGINE || 'chromium', VIEW = arg('view', 'i13'), LANG = arg('lang', 'en');
const DEV = { i13: 'iPhone 13', ipad: 'iPad (gen 7)' };
const YT = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const RUN = 'fyp' + Date.now().toString(36);
const OLD = { id: 'old-' + RUN, me: true, vis: 'tribe', url: 'https://youtu.be/aqz-KE-bpKQ', plat: 'youtube', cap: 'Old held test post ' + RUN, ts: Date.now() - 86400000 * 3, likes: 0, saves: 0, cmts: [] };

async function phone(browser, seedOld) {
  const dev = Object.assign({}, pw.devices[DEV[VIEW] || DEV.i13]); if (ENG !== 'webkit') delete dev.defaultBrowserType;
  const ctx = await browser.newContext(Object.assign(dev, { serviceWorkers: 'block' }));
  await ctx.addInitScript(a => {
    try {
      if (sessionStorage.getItem('fyp-seeded')) return; sessionStorage.setItem('fyp-seeded', '1');
      localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowispike.tutorial.v1', JSON.stringify({ done: true, v: 99 }));
      localStorage.setItem('lowi.lang', a.l);
      localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, xp: 0, ledger: [], logs: [], saved: [], lang: a.l, user: { name: 'For You Test', bday: '1990-01-01', tags: [] } }));
      if (a.old) { const t = JSON.parse(localStorage.getItem('lowispike.foryou.v1') || '{}'); t.posts = [a.old].concat(t.posts || []); localStorage.setItem('lowispike.foryou.v1', JSON.stringify(t)); }
    } catch (e) { }
  }, { l: LANG, old: seedOld ? OLD : null });
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  return { ctx, page, errs, ev: (fn, a) => page.evaluate(fn, a) };
}
async function boot(P, fails, tag) {
  await P.page.goto(URL0 + (URL0.includes('?') ? '&' : '?') + 'fyp=' + Date.now(), { waitUntil: 'load', timeout: 180000 });
  await P.page.waitForFunction(() => typeof window.goTab === 'function' && window.TRIBE && window.LowiForYou, null, { timeout: 150000 });
  let uid = ''; for (let i = 0; i < 120 && !uid; i++) { uid = await P.ev(() => { try { return LOWI_CLOUD_X.state().uid || ''; } catch (e) { return ''; } }); if (!uid) await sleep(500); }
  if (!uid) fails.push(tag + ': no cloud sign-in'); else if (!(await TA.markTest(P.page))) fails.push(tag + ': could not mark the test account');
  P.uid = uid;
  await P.ev(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); document.querySelectorAll('[inert]').forEach(e => e.removeAttribute('inert')); });
  return uid;
}
const build = P => P.ev(() => { try { return (document.querySelector('meta[name=lowi-build]') || {}).content || window.LOWI_BUILD || ''; } catch (e) { return ''; } });
async function openForYou(P) {
  await P.ev(() => window.goTab('foryou'));
  await P.page.waitForSelector('.rm-tab[data-rm="fy"]', { timeout: 30000 }).catch(() => { });
  await sleep(900);
  await P.ev(() => { const x = document.querySelector('.rm-ob .rm-x, .rm-ob [data-ob=close], .rm-ob button[aria-label]'); if (x && x.getBoundingClientRect().width) x.click(); });
  await sleep(500);
  await P.page.click('.rm-tab[data-rm="fy"]', { timeout: 10000 }).catch(() => { });
  await sleep(2200);
}
async function myPosts(P) {
  await P.ev(() => TRIBE.openMine());
  await sleep(900);
  return P.ev(() => {
    const sh = document.querySelector('.fy-lrow, .fy-held');
    const rows = [...document.querySelectorAll('.fy-lrow')].map(r => r.innerText.replace(/\s+/g, ' ').trim());
    const held = document.querySelector('.fy-held'), btn = document.querySelector('[data-tr="share-held"]');
    return { open: !!sh, rows, held: held ? held.innerText.replace(/\s+/g, ' ').trim() : '', btn: btn ? btn.textContent.trim() : '' };
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const tag = VIEW + ' ' + LANG + ' ' + ENG, fails = [], info = {};
  const browser = await pw[ENG].launch(ENG === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
  const A = await phone(browser, true), B = await phone(browser, false);
  let newId = '';
  try {
    await boot(A, fails, 'A'); await boot(B, fails, 'B');
    info.build = await build(A);
    /* B reloads once so the app knows it is a test account too (test accounts see each other) */
    await B.page.reload({ waitUntil: 'load' }); await B.page.waitForFunction(() => window.TRIBE && window.LowiForYou, null, { timeout: 150000 });
    await B.ev(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); document.querySelectorAll('[inert]').forEach(e => e.removeAttribute('inert')); });

    /* 1. the old held post: labelled, offered, shared with one tap */
    await openForYou(A);
    const before = await A.ev(id => { const p = (JSON.parse(localStorage.getItem('lowispike.foryou.v1') || '{}').posts || []).find(x => x.id === id); return { held: !!(p && LowiForYou.held(Object.assign({}, p, { me: true }))), inFeed: !!document.querySelector('#fyFeed .fy-slide[data-id="' + id + '"]') }; }, OLD.id);
    info.oldBefore = before;
    if (!before.held) fails.push('the old post is not marked as kept back');
    if (before.inFeed) fails.push('the old post shows in For You before it was shared');
    let mp = await myPosts(A); info.myPostsBefore = mp;
    await A.page.screenshot({ path: path.join(OUT, `${VIEW}-${LANG}-${ENG}-A-myposts-held.png`) });
    if (!mp.held || !mp.btn) fails.push('My posts does not offer to share the kept-back post: ' + JSON.stringify(mp).slice(0, 200));
    if (!mp.rows.some(r => r.toLowerCase().includes(LowiNote(LANG, 'heldTag').toLowerCase()))) fails.push('My posts row does not say "' + LowiNote(LANG, 'heldTag') + '": ' + JSON.stringify(mp.rows.slice(0, 3)));
    info.shareBtn = await A.ev(() => { const b = document.querySelector('[data-tr="share-held"]'); if (!b) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(), t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { r: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], top: t ? (t.tagName + '.' + t.className + '#' + t.id).slice(0, 80) : '', hit: !!(t && (t === b || b.contains(t))) }; });
    await A.page.click('[data-tr="share-held"]', { timeout: 10000 }).catch(e => fails.push('tap Share: ' + e.message.slice(0, 80)));
    let shared = false; for (let i = 0; i < 40 && !shared; i++) { await sleep(500); shared = await A.ev(id => { const t = JSON.parse(localStorage.getItem('lowispike.foryou.v1') || '{}'); const p = (t.posts || []).find(x => x.id === id); return !!(p && p.pub); }, OLD.id); }
    if (!shared) fails.push('the old post did not reach For You after Share');

    /* 2. a fresh YouTube post through the composer, with taps and typing */
    await A.ev(() => { try { window.closeSheet && closeSheet(); } catch (e) { } const x = document.querySelector('[data-act="close-sheet"]'); if (x) x.click(); });
    await sleep(600);
    await A.ev(() => TRIBE.compose()); await sleep(900);
    await A.page.fill('#trUrl', YT); await A.page.dispatchEvent('#trUrl', 'input'); await sleep(3500);
    await A.page.fill('#trCap', 'Fresh test post ' + RUN).catch(e => fails.push('caption: ' + e.message.slice(0, 80)));
    await A.page.dispatchEvent('#trCap', 'input').catch(() => { });
    const vis = await A.ev(() => { const t = [...document.querySelectorAll('#trRest .toggle')].pop(); return t ? t.className : ''; });
    info.composerToggle = vis;
    if (!/\bon\b/.test(vis)) await A.ev(() => { const t = [...document.querySelectorAll('#trRest .toggle')].pop(); if (t) t.click(); });
    await A.page.click('#trPost', { timeout: 10000 }).catch(e => fails.push('tap Post: ' + e.message.slice(0, 80)));
    let toast = ''; for (let i = 0; i < 30; i++) { await sleep(400); toast = await A.ev(() => { const t = document.querySelector('.toast, #toast'); return t ? t.textContent.trim() : ''; }); if (toast && /For You|Für dich|Para ti/.test(toast)) break; }
    info.toast = toast;
    const mine = await A.ev(run => { const t = JSON.parse(localStorage.getItem('lowispike.foryou.v1') || '{}'); const p = (t.posts || []).find(x => (x.cap || '').includes(run) && x.id.indexOf('old-') !== 0); return p ? { id: p.id, vis: p.vis, pub: !!p.pub, fail: !!p.fail } : null; }, RUN);
    info.newPost = mine; newId = mine && mine.id;
    if (!mine) fails.push('the composer made no post'); else if (!mine.pub) fails.push('the fresh post did not reach For You: ' + JSON.stringify(mine));
    if (!/For You|Für dich|Para ti/.test(toast) || /only shows insulin/i.test(toast)) fails.push('toast after posting: ' + JSON.stringify(toast));
    await sleep(1200);
    mp = await myPosts(A); info.myPostsAfter = mp.rows.slice(0, 4);
    await A.page.screenshot({ path: path.join(OUT, `${VIEW}-${LANG}-${ENG}-A-myposts-after.png`) });
    if (!mp.rows.some(r => r.includes(RUN) && r.toLowerCase().includes(LowiNote(LANG, 'inFy').toLowerCase()))) fails.push('My posts does not say "' + LowiNote(LANG, 'inFy') + '" for the fresh post: ' + JSON.stringify(mp.rows.slice(0, 3)));

    /* 3. B sees both, and the YouTube slide links out */
    let seen = null;
    for (let i = 0; i < 6 && !(seen && seen.fresh && seen.old); i++) {
      await B.page.reload({ waitUntil: 'load' }); await B.page.waitForFunction(() => window.TRIBE && window.LowiForYou, null, { timeout: 150000 });
      await B.ev(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); document.querySelectorAll('[inert]').forEach(e => e.removeAttribute('inert')); });
      await sleep(4000); await openForYou(B);
      seen = await B.ev(a => { const f = document.getElementById('fyFeed'); const q = id => f && f.querySelector('.fy-slide[data-id="' + id + '"]'); return { fresh: !!(a.n && q(a.n)), old: !!q(a.o), n: f ? f.querySelectorAll('.fy-slide').length : -1 }; }, { n: newId, o: OLD.id });
    }
    info.bSees = seen;
    if (!seen || !seen.fresh) fails.push('B does not see the fresh post in For You');
    if (!seen || !seen.old) fails.push('B does not see the shared old post in For You');
    if (seen && seen.fresh) {
      await B.ev(id => { const s = document.querySelector('#fyFeed .fy-slide[data-id="' + id + '"]'); s.scrollIntoView({ block: 'start' }); }, newId); await sleep(1500);
      const slide = await B.ev(id => { const s = document.querySelector('#fyFeed .fy-slide[data-id="' + id + '"]'); const o = s.querySelector('.fy-out'), l = s.querySelector('.fy-love'), img = s.querySelector('.fy-bg img'), pl = s.querySelector('.fy-play');
        const r = el => { if (!el) return null; const b = el.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; };
        return { out: o ? o.innerText.replace(/\s+/g, ' ').trim() : '', outBox: r(o), love: l ? l.textContent.trim() : '', img: img ? img.getAttribute('src') : '', imgLoaded: !!(img && img.complete && img.naturalWidth > 0), play: r(pl), playLabel: pl ? pl.getAttribute('aria-label') : '', w: innerWidth }; }, newId);
      info.slide = slide;
      await B.page.screenshot({ path: path.join(OUT, `${VIEW}-${LANG}-${ENG}-B-slide.png`) });
      if (!slide.out.includes(LowiNote(LANG, 'watchOn').replace('{p}', 'YouTube'))) fails.push('no "Watch on YouTube" card: ' + slide.out);
      if (!/YouTube/.test(slide.love) || !/(supportive tribe|zusammenhält|tribu que se apoya)/.test(slide.love)) fails.push('no supportive-tribe line: ' + slide.love);
      if (slide.img !== 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg') fails.push('not YouTube\'s own still: ' + slide.img);
      if (slide.outBox && (slide.outBox[3] < 44 || slide.outBox[0] < 0 || slide.outBox[0] + slide.outBox[2] > slide.w)) fails.push('Watch card off screen or under 44px: ' + slide.outBox);
      const pop = B.ctx.waitForEvent('page', { timeout: 15000 }).catch(() => null);
      await B.page.click('#fyFeed .fy-slide[data-id="' + newId + '"] .fy-play', { timeout: 10000 }).catch(e => fails.push('tap play: ' + e.message.slice(0, 80)));
      const p2 = await pop; let popped = ''; if (p2) { await sleep(800); popped = p2.url(); await p2.close().catch(() => { }); }
      const inApp = await B.ev(() => document.querySelectorAll('#fyFeed iframe, .fye, video[src*="youtube"]').length);
      info.tap = { popped, inApp };
      if (!/^https:\/\/(www\.|m\.|consent\.)?youtube\.com\//.test(popped)) fails.push('the tap did not open the original on YouTube: ' + popped);
      if (inApp) fails.push('a player appeared inside LOWiSPIKE');
      await B.page.click('#fyFeed .fy-slide[data-id="' + newId + '"] .fy-out', { timeout: 10000 }).catch(e => fails.push('tap Watch card: ' + e.message.slice(0, 80)));
      await sleep(1200);
      for (const pg of B.ctx.pages()) if (pg !== B.page) { info.tapCard = pg.url(); await pg.close().catch(() => { }); }
      if (!/youtube\.com/.test(info.tapCard || '')) fails.push('the Watch card did not open YouTube: ' + info.tapCard);
    }
    const sw = await B.ev(() => document.documentElement.scrollWidth - innerWidth); if (sw > 1) fails.push('sideways scroll ' + sw);
    if (A.errs.length || B.errs.length) fails.push('page errors ' + A.errs.concat(B.errs).join(' | '));
  } catch (e) { fails.push(e.message.slice(0, 200)); }
  /* 4. clean up: both test posts out of the shared table, both test profiles removed */
  try { info.unpub = await A.ev(ids => Promise.all(ids.filter(Boolean).map(id => Promise.resolve(LOWI_CLOUD.unpublish(id)).then(() => 'ok').catch(e => 'err')) ), [newId, OLD.id]); } catch (e) { info.unpub = 'err ' + e.message; }
  try { await TA.cleanup(A.page); await TA.cleanup(B.page); } catch (e) { }
  await browser.close();
  console.log(tag + ' ' + JSON.stringify(info));
  console.log((fails.length ? 'FAIL ' : 'PASS ') + tag + (fails.length ? '\n  ' + fails.join('\n  ') : ''));
  process.exit(fails.length ? 1 : 0);
})();

function LowiNote(lang, k) { return require('../../foryou-core.js').note(k, lang); }
