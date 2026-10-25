/* What's New mini tour for the Give a hand tab (Oct 25 2026, Maya 10). node tools/give-hand-tab/tour.cjs [root|url] [iphone|ipadL] [en,de,es]
   ENG=webkit for Playwright WebKit (iPhone 13 / iPad Pro 11; add SIM_REDUCED_MOTION=1 SIM_WK_NOSHOT=1 on this VM).
   An unseen release whose tour is ["new-give-hand"] opens the tutorial card; on new-give-hand Shop is open on Kitchen and the
   spotlight sits on the Give a hand tab; the last card ends on Home with Shop closed. Fake cloud (tools/sim): no Supabase
   writes, no real gifts or posts. Server gate faked open (lowi.giftBasket.server.v1 + LowiGiftBasket._api). Locally the news
   entry is injected into version.json; against the live site the real one must already carry the tour. */
const H = require('../sim/harness.cjs');
const where = process.argv[2] || '.', size = process.argv[3] || 'iphone', langs = (process.argv[4] || 'en,de,es').split(',');
const engine = process.env.ENG || 'chromium', live = /^https?:/.test(where);
process.env.SIM_WK_VIEWPORT = '1';
const VP = size === 'ipadL' ? { width: 1180, height: 820 } : size === 'ipadP' ? { width: 820, height: 1180 } : { width: 390, height: 844 };
const TITLE = { en: 'Give a hand', de: 'Hilf mit', es: 'Echa una mano' };
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else fail++; console.log((c ? '  ok   ' : '  FAIL ') + m); };
const state = P => P.evaluate(() => { const t = document.getElementById('ltTour'), T = window.LowiTutorial;
  const hole = t && t.querySelector('.lt-hole'), tab = document.querySelector('.stp-card .stp-tab[data-stp-tab="gift"]'), card = t && t.querySelector('.lt-card');
  const box = e => { if (!e) return null; const r = e.getBoundingClientRect(); return r.width > 2 ? r : null; };
  /* the hole draws its ring with a shadow and has no layout box of its own: read where tutorial.js put it from its style */
  const hs = hole && hole.style, h = hs && parseFloat(hs.width) > 2 ? { left: parseFloat(hs.left), top: parseFloat(hs.top), right: parseFloat(hs.left) + parseFloat(hs.width), bottom: parseFloat(hs.top) + parseFloat(hs.height) } : null, g = box(tab), c = box(card);
  const inside = (a, b) => !!(a && b) && b.left >= a.left - 1 && b.right <= a.right + 1 && b.top >= a.top - 1 && b.bottom <= a.bottom + 1;
  const over = (a, b) => !!(a && b) && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 8 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 8;
  return { on: !!(t && !t.classList.contains('lt-out') && T && T.isOn()), mode: T && T.mode(), held: T && T.held(), step: T && T.step(),
    title: ((t && t.querySelector('.lt-title')) || {}).textContent || '', text: ((t && t.querySelector('.lt-text, .lt-body, p')) || {}).textContent || '',
    shop: !!(window.LowiStorePicks && LowiStorePicks.isOpen()), shopTab: window.LowiStorePicks && LowiStorePicks.isOpen() ? LowiStorePicks.tab() : '',
    giftTab: !!g, holdsTab: inside(h, g), cardOverTab: over(c, g), cardIn: !c || (c.top >= -1 && c.left >= -1 && c.bottom <= innerHeight + 1 && c.right <= innerWidth + 1),
    homeTab: (document.querySelector('.tab.active') || {}).id || '' }; });
(async () => {
  let older = ['older-20261001-000000'];
  if (live) { try { const v = await (await fetch(where.replace(/\/?$/, '/') + 'version.json?t=' + Date.now())).json(); older = (v.news.history || []).map(x => x.id).filter(id => id !== v.news.id); } catch (e) { } }
  for (const lang of langs) {
    const tag = size + '-' + lang + '-' + engine;
    const o = { engine, members: 4, messages: 4, probe: false, lang, viewport: VP };
    if (/^ipad/.test(size)) { o.device = 'iPad Pro 11'; o.dpr = 2; }
    if (live) o.url = where; else o.root = where;
    const R = await H.open(o), P = R.page;
    try {
      if (engine === 'chromium') await P.setViewportSize(VP);
      await R.ctx.addInitScript(([l, older]) => { try { if (sessionStorage.getItem('ght-tour')) return; sessionStorage.setItem('ght-tour', '1');
        localStorage.setItem('lowi.news.seen', JSON.stringify(older)); localStorage.setItem('lowi.news.tourseen', JSON.stringify(older)); localStorage.setItem('lowi.g1.auto', '1');
        localStorage.setItem('lowi.lang', l); localStorage.setItem('lowispike.lang', l);
        localStorage.setItem('lowi.giftBasket.server.v1', JSON.stringify({ ok: true, at: Date.now() })); } catch (e) { } }, [lang, older]);
      await R.ctx.addInitScript(() => { const t = setInterval(() => { if (window.LowiGiftBasket) { clearInterval(t);
        window.LowiGiftBasket._api = { uid: () => 'me', ready: async () => true, open: async () => [], mine: async () => [], given: async () => [], trust: async () => [] }; } }, 50); });
      if (!live) await P.route(u => /\/version\.json/.test(String(u)), async r => { const res = await r.fetch(); const v = await res.json();
        v.news = Object.assign({}, v.news, { id: 'ght-' + v.build, tutorial: 'new-give-hand', tour: ['new-give-hand'] }); r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(v) }); });
      await R.goto();
      const build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || window.LOWI_BUILD || '');
      console.log(tag, 'build', build, 'viewport', JSON.stringify(P.viewportSize()));
      let s, t0 = Date.now();
      while (Date.now() - t0 < 45000) { s = await state(P); if (s.on && !s.held) break; await H.sleep(500); }
      ok(s.on && s.mode === 'news', tag + ' the mini tour opens on its own (' + s.step + ')');
      for (let k = 0; k < 4 && s.on && s.step !== 'new-give-hand'; k++) { await P.click('#ltTour [data-lt="next"]'); t0 = Date.now(); while (Date.now() - t0 < 8000) { await H.sleep(500); s = await state(P); if (s.step === 'new-give-hand' && !s.held) break; } }
      await H.sleep(1500); s = await state(P);
      ok(s.step === 'new-give-hand' && s.title === TITLE[lang], tag + ' card "' + s.title + '": ' + s.text.slice(0, 90));
      ok(s.shop && s.shopTab === 'kitchen' && s.giftTab, tag + ' Shop open on Kitchen with the Give a hand tab showing (' + s.shopTab + ')');
      ok(s.holdsTab && !s.cardOverTab && s.cardIn, tag + ' spotlight on the Give a hand tab, card on screen and not over it ' + (s.holdsTab && !s.cardOverTab && s.cardIn ? '' : JSON.stringify(s)));
      if (process.env.SIM_WK_NOSHOT !== '1') await P.screenshot({ path: '/tmp/ght-tour-' + tag + '.png' }).catch(() => { });
      for (let k = 0; k < 4 && s.on; k++) { await P.click('#ltTour [data-lt="next"]'); await H.sleep(2000); s = await state(P); }
      ok(!s.on && !s.shop && s.homeTab === 'tab-home', tag + ' last card ends on Home with Shop closed ' + JSON.stringify({ on: s.on, step: s.step, shop: s.shop, home: s.homeTab }));
      await P.reload({ waitUntil: 'load' }); await H.sleep(9000); s = await state(P);
      ok(!s.on, tag + ' after reload the tour does not come back');
      const errs = R.errs.filter(e => !/supabase|realtime|websocket/i.test(e.m));
      ok(!errs.length, tag + ' zero page errors ' + JSON.stringify(errs.slice(0, 2)));
    } catch (e) { fail++; console.log('  FAIL ' + tag + ' threw ' + e.message); }
    await R.close();
  }
  console.log(engine + ': ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
