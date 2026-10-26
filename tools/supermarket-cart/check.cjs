'use strict';
/* Oct 26, 2026 (MAYA-HANDOFF 0.22): Supermarket Cart (Warenkorb / Carrito), no Seller Zone strip inside the Supermarket tab, and
   Give a hand as a swipe deck (right = pay, left = skip).
   node tools/supermarket-cart/check.cjs [url|root] [sizes] [langs] [outdir]     ENG=chromium|webkit (default chromium)
   WebKit on this VM: SIM_REDUCED_MOTION=1 SIM_WK_NOSHOT=1 keep software rendering moving.
   Fake data only: a made-up shopping list in localStorage and an offline fake Give a hand server with made-up baskets
   ("Testperson A/B/C", example.org pay links). Nothing is sent anywhere, nothing is paid. */
const H = require('../sim/harness.cjs');
const fs = require('fs');
const SZ = { iphone: [390, 844], se: [320, 568], small: [375, 667] };
process.env.SIM_WK_VIEWPORT = '1';
const CART = { en: 'Cart', de: 'Warenkorb', es: 'Carrito' };
(async () => {
  const where = process.argv[2] || '.', sizes = (process.argv[3] || 'iphone').split(','), langs = (process.argv[4] || 'en,de,es').split(',');
  const out = process.argv[5] || '/tmp/supermarket-cart', engine = process.env.ENG || 'chromium';
  fs.mkdirSync(out, { recursive: true });
  let pass = 0, fail = 0; const bad = [];
  for (const sz of sizes) for (const lang of langs) {
    const [w, h] = SZ[sz], tag = sz + '-' + lang + '-' + engine;
    const o = { engine, members: 6, messages: 6, probe: false, lang, viewport: { width: w, height: h } };
    if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o), P = R.page;
    const ok = (name, c, info) => { if (c) pass++; else { fail++; bad.push(tag + ' ' + name); } console.log((c ? 'PASS ' : 'FAIL ') + tag + ' ' + name + (c || info === undefined ? '' : ' ' + JSON.stringify(info).slice(0, 600))); };
    try {
      if (engine === 'chromium') await P.setViewportSize({ width: w, height: h });
      await R.ctx.addInitScript(a => { try { if (sessionStorage.getItem('smc-seeded')) return; sessionStorage.setItem('smc-seeded', '1');
        localStorage.setItem('lowispike.lang', a.l); localStorage.setItem('lowi.lang', a.l); localStorage.setItem('lowi.storePicks.tab', 'shop');
        localStorage.setItem('lowi.giftBasket.server.v1', JSON.stringify({ ok: true, at: Date.now() })); localStorage.removeItem('lowi.giftBasket.skips.v1'); } catch (e) { } }, { l: lang });
      await R.ctx.addInitScript(() => { const t = setInterval(() => { if (window.LowiGiftBasket) { clearInterval(t);
        const now = new Date().toISOString(), B = (id, name, items, total) => ({ id, user_id: 'u-' + id, first_name: name, anon: false, city: 'Teststadt', items: items.map(n => ({ n })), total_eur: total, pay_url: 'https://ko-fi.com/test-' + id, created_at: now });
        const open = [B('b1', 'Testperson A', ['Skyr', 'Oats', 'Spinach'], 14), B('b2', 'Testperson B', ['Eggs', 'Lentils'], 9), B('b3', 'Testperson C', ['Apples', 'Rye bread'], 7)];
        window.open = function () { window.__opened = (window.__opened || 0) + 1; return null; };
        window.LowiGiftBasket._api = { uid: () => 'me', ready: async () => true, open: async () => open.map(b => Object.assign({}, b)), mine: async () => [], given: async () => [], trust: async () => [] }; } }, 50); });
      await R.goto(); await H.sleep(6000);
      const build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || '');
      console.log(tag, 'build', build, 'viewport', JSON.stringify(P.viewportSize()));
      /* a made-up cart on the real shopping list: one priced (as a reported shelf price), one without a price */
      await P.evaluate(() => { const S = window.LOWI_SHELF; S.addIngredients([{ n: 'Testskyr', e: '\u{1F95B}' }, { n: 'Testhafer', e: '\u{1F33E}' }]);
        const st = S.state(); const a = st.list.find(i => i.n === 'Testskyr'); if (a) a.p = 1.29; });
      await P.evaluate(() => LowiStorePicks.open('home-bloom')); await H.sleep(1500);
      const pane = () => P.evaluate(() => { const c = document.querySelector('.stp-card'); const cb = c && c.querySelector('.stp-cartbtn'), r = cb && cb.getBoundingClientRect();
        return { tabs: [...document.querySelectorAll('.stp-tab')].map(b => b.dataset.stpTab).join(), strip: !!(c && c.querySelector('.stp-card .sz-strip, .stp-card [class*="sz-strip"], .stp-card .sz-entry')),
          cart: cb ? { txt: cb.textContent, h: Math.round(r.height), w: Math.round(r.width), n: (cb.querySelector('.stp-cart-n') || {}).textContent || '' } : null,
          over: document.documentElement.scrollWidth > innerWidth + 1 }; });
      let t = await pane();
      ok('1 Supermarket tab has no Seller Zone strip; Seller Zone keeps its own tab; no Kitchen tab', !t.strip && /(^|,)sz(,|$)/.test(t.tabs) && !/kitchen/.test(t.tabs), t);
      ok('2 Cart button named ' + CART[lang] + ', 44 px+, shows the count', t.cart && t.cart.txt.indexOf(CART[lang]) >= 0 && t.cart.h >= 44 && +t.cart.n >= 2 && !t.over, t);
      await R.shot(out + '/1-supermarket-' + tag + '.png');
      await R.tap('.stp-card .stp-cartbtn'); await H.sleep(900);
      const sheet = () => P.evaluate(() => { const q = document.querySelector('.stp-cartv .stp-cart-card'); if (!q) return null; const r = q.getBoundingClientRect();
        const rows = [...q.querySelectorAll('.stp-cart-row')].map(x => ({ n: x.querySelector('.stp-cart-txt b').textContent, q: x.querySelector('.stp-cart-q b').textContent, small: x.querySelector('small').textContent,
          steps: [...x.querySelectorAll('.stp-cart-step')].map(b => { const k = b.getBoundingClientRect(); return Math.round(Math.min(k.width, k.height)); }) }));
        return { inView: r.left >= -1 && r.right <= innerWidth + 1, rows, total: (q.querySelector('.stp-cart-total b') || {}).textContent || '', fine: [...q.querySelectorAll('.stp-fine')].map(x => x.textContent).join(' '), h: q.querySelector('h3').textContent }; });
      let s = await sheet();
      const sk = s && s.rows.find(r => r.n === 'Testskyr'), ha = s && s.rows.find(r => r.n === 'Testhafer');
      ok('3 tap Cart: the sheet opens with both lines, quantity 1, steppers 44 px+', !!(s && s.inView && sk && ha && sk.q === '1' && s.rows.every(r => r.steps.every(v => v >= 44))), s);
      ok('4 estimate only from the reported price, and it says one has no price yet', !!(s && /1[.,]29/.test(s.total) && /1/.test(s.fine) && ha && !/€/.test(ha.small)), s);
      await R.shot(out + '/2-cart-' + tag + '.png');
      await R.tap('.stp-cart-row:first-child [data-stp-cd="1"]'); await H.sleep(500);
      s = await sheet();
      const sk2 = s && s.rows.find(r => r.n === 'Testskyr');
      ok('5 + makes it 2 and the estimate doubles; saved on the shopping list', !!(sk2 && sk2.q === '2' && /2[.,]58/.test(s.total)) && await P.evaluate(() => (LOWI_SHELF.state().list.find(i => i.n === 'Testskyr') || {}).q === 2), s);
      const hafIdx = s.rows.findIndex(r => r.n === 'Testhafer') + 1;
      await R.tap('.stp-cart-row:nth-child(' + hafIdx + ') [data-stp-cd="-1"]'); await H.sleep(500);
      s = await sheet();
      ok('6 − on quantity 1 takes the line out of the cart, and the total is complete', !!(s && !s.rows.some(r => r.n === 'Testhafer') && /2[.,]58/.test(s.total)), s);
      await R.tap('.stp-cartv .stp-pill[data-stp="qv-close"]'); await H.sleep(700);
      t = await pane();
      ok('7 Back closes the sheet, the Cart badge shows the new count', t.cart && /\d/.test(t.cart.n) && !(await P.evaluate(() => !!document.querySelector('.stp-cartv'))), t);
      /* Give a hand: the swipe deck */
      await R.tap('.stp-tab[data-stp-tab="gift"]'); await H.sleep(2500);
      const deck = () => P.evaluate(() => { const c = document.querySelector('.gb-swipe'); const r = c && c.getBoundingClientRect();
        return { top: c ? c.getAttribute('data-gb-id') : '', picked: !!(c && c.classList.contains('gb-picked')), pay: !!(c && c.querySelector('.gb-pay')), hint: (document.querySelector('.gb-swipe-hint') || {}).textContent || '',
          box: r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null, btns: [...document.querySelectorAll('.gb-round')].map(b => { const k = b.getBoundingClientRect(); return Math.round(Math.min(k.width, k.height)); }),
          none: (document.querySelector('.gb-none') || {}).textContent || '', over: document.documentElement.scrollWidth > innerWidth + 1 }; });
      let d = await deck();
      ok('8 Give a hand shows one basket on top, a hint, no pay link yet, Skip and Pay buttons 44 px+', d.top === 'b1' && !!d.hint && !d.pay && d.btns.length === 2 && d.btns.every(v => v >= 44) && !d.over, d);
      await R.shot(out + '/3-deck-' + tag + '.png');
      await P.evaluate(() => { const c = document.querySelector('.gb-swipe'); if (c) c.scrollIntoView({ block: 'center' }); }); await H.sleep(300);
      d = await deck();
      const drag = async (dx) => { const b = d.box, x = b.x + b.w / 2, y = b.y + Math.min(60, b.h / 3); await P.mouse.move(x, y); await P.mouse.down();
        for (let i = 1; i <= 8; i++) { await P.mouse.move(x + dx * i / 8, y + 2); await H.sleep(30); } await P.mouse.up(); await H.sleep(700); };
      await drag(-Math.round(w * 0.5));
      d = await deck();
      ok('9 swipe left skips: the next basket is on top, the skip is saved', d.top === 'b2' && await P.evaluate(() => !!JSON.parse(localStorage.getItem('lowi.giftBasket.skips.v1') || '{}').b1), d);
      await R.tap('.gb-undo'); await H.sleep(600);
      d = await deck(); ok('10 Undo brings it back', d.top === 'b1', d);
      await R.tap('.gb-skip'); await H.sleep(600);
      d = await deck(); ok('11 the Skip button skips too', d.top === 'b2', d);
      await P.evaluate(() => { const c = document.querySelector('.gb-swipe'); if (c) c.scrollIntoView({ block: 'center' }); }); await H.sleep(300);
      d = await deck();
      await drag(Math.round(w * 0.5));
      d = await deck();
      const pop = await P.evaluate(() => window.__opened || 0);
      ok('12 swipe right picks it: the card stays on top, glows, and only now shows the person\'s own pay link; nothing opened by itself', d.top === 'b2' && d.picked && d.pay && !pop, d);
      await R.shot(out + '/4-picked-' + tag + '.png');
      const errs = R.errs.filter(e => !/supabase|Failed to fetch|NetworkError|Load failed/i.test(e.m));
      ok('13 zero page errors', !errs.length, errs.slice(0, 4));
    } catch (e) { fail++; bad.push(tag + ' crashed: ' + e.message); console.log('FAIL ' + tag + ' crashed ' + e.message); }
    await R.close();
  }
  console.log('RESULT pass ' + pass + ' fail ' + fail + (bad.length ? '\n' + bad.join('\n') : ''));
  process.exit(fail ? 1 : 0);
})();
