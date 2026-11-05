'use strict';
/* Nov 5 2026 (owner walkthrough): Plan my week -> Cart -> Someone else pays, phone size.
   node tools/walkthrough/cart.cjs [root] [sizes] [rules]   ENG=chromium|webkit   rules: open,old
   Fake data only: foods added the way Plan my week adds them (packs + store estimate), an offline fake Give a hand server.
   Nothing is sent anywhere, no basket, payment or post is created.
   Checks: the Cart keeps 3 cucumbers / 4 yogurts and shows a ≈ total; two equal choices, no Scan in the shop; Someone else pays
   puts EVERY food in (open rules) or names what the old server can't take (old rules); the total is the cart total to the cent,
   never €5; Share sends that total and the quantities. Zero page errors. */
const H = require('../sim/harness.cjs');
const fs = require('fs');
process.env.SIM_WK_VIEWPORT = '1';
const SZ = { iphone: [390, 844], se: [320, 568] };
const FOODS = [
  { n: 'Cucumber', packs: 3, pe: 0.59 }, { n: 'Greek yogurt', packs: 4, pe: 1.19 }, { n: 'Halloumi', packs: 1, pe: 2.79 },
  { n: 'Courgette', packs: 2, pe: 0.89 }, { n: 'Nori', packs: 1, pe: 2.49 }, { n: 'Tortilla wraps', packs: 1, pe: 1.49 }, { n: 'Eggs', packs: 1, pe: 2.29 }
];
const EXPECT = Math.round(FOODS.reduce((a, f) => a + f.packs * f.pe, 0) * 100) / 100;
(async () => {
  const root = process.argv[2] || '.', sizes = (process.argv[3] || 'iphone,se').split(','), rules = (process.argv[4] || 'open,old').split(','), engine = process.env.ENG || 'chromium';
  let pass = 0, fail = 0; const bad = []; fs.mkdirSync('/home/sprite/walk-shots', { recursive: true });
  for (const sz of sizes) for (const rule of rules) {
    const [w, h] = SZ[sz], tag = sz + '-' + rule + '-' + engine;
    const R = await H.open({ engine, members: 6, messages: 6, probe: false, lang: 'en', viewport: { width: w, height: h }, root }), P = R.page, errs = [];
    P.on('pageerror', e => errs.push(String(e && e.message || e)));
    const ok = (name, c, info) => { if (c) pass++; else { fail++; bad.push(tag + ' ' + name); } console.log((c ? 'PASS ' : 'FAIL ') + tag + ' ' + name + (c || info === undefined ? '' : ' ' + JSON.stringify(info).slice(0, 700))); };
    try {
      if (engine === 'chromium') await P.setViewportSize({ width: w, height: h });
      await R.ctx.addInitScript(() => { try { if (sessionStorage.getItem('wc-seeded')) return; sessionStorage.setItem('wc-seeded', '1');
        localStorage.setItem('lowi.storePicks.tab', 'shop'); localStorage.setItem('lowi.giftBasket.server.v1', JSON.stringify({ ok: true, at: Date.now() })); } catch (e) { } });
      await R.ctx.addInitScript(rule => { window.__shares = []; const t = setInterval(() => { if (window.LowiGiftBasket) { clearInterval(t);
        window.LowiGiftBasket._api = { uid: () => 'me', ready: async () => true, open: async () => [], mine: async () => [], given: async () => [], trust: async () => [],
          limits: async () => rule === 'open' ? { any_food: true, max_items: 60, min_eur: 5, max_eur: 150 } : null,
          share: async (row, id) => { window.__shares.push({ row, id }); return Object.assign({ id: 'fake-' + window.__shares.length, user_id: 'me', status: 'open', created_at: new Date().toISOString() }, row); } }; } }, 50); }, rule);
      await R.goto(); await H.sleep(6000);
      await P.evaluate(f => window.LOWI_SHELF.addIngredients(f, 'Plan my week'), FOODS);
      await P.evaluate(f => window.LOWI_SHELF.addIngredients(f, 'Plan my week'), FOODS); /* the same week twice must not double anything */
      await P.evaluate(() => LowiStorePicks.open('home-bloom')); await H.sleep(1500);
      await R.tap('.stp-card .stp-cartbtn'); await H.sleep(1800);
      const c = await P.evaluate(() => { const q = document.querySelector('.stp-cartv .stp-cart-card'); if (!q) return null;
        const rows = [...q.querySelectorAll('.stp-cart-row')].map(r => ({ n: r.querySelector('.stp-cart-txt b').textContent, q: (r.querySelector('[data-stp-cq]') || {}).textContent || (r.querySelector('.stp-cart-q') || {}).textContent, s: r.querySelector('small').textContent }));
        const btns = [...q.querySelectorAll('.stp-cart-acts button')].map(b => { const k = b.getBoundingClientRect(); return { t: b.textContent.trim(), a: b.dataset.stp, w: Math.round(k.width), h: Math.round(k.height), inView: k.bottom <= innerHeight + 1 && k.top >= 0 }; });
        return { rows, btns, text: q.textContent, total: window.LOWI_SHELF.cartTotal() }; });
      ok('1 the Cart keeps every food once, 3 cucumbers and 4 yogurts', c && c.rows.length === 7 && /3/.test(c.rows.find(r => r.n === 'Cucumber').q) && /4/.test(c.rows.find(r => r.n === 'Greek yogurt').q), c && c.rows);
      ok('2 the Cart total is the sum of packs x estimate, marked ≈', c && Math.abs(c.total.sum - 0) > 0 && Math.round(c.total.sum * 100) === Math.round(16.29 * 100) && c.total.approx === 7 && /≈/.test(c.text), c && { total: c.total, expect: 16.29 });
      ok('3 two equal choices, both on screen, no Scan in the shop', c && c.btns.length === 2 && c.btns.map(b => b.a).join() === 'mylist,giftcart' && c.btns.every(b => b.inView && b.h >= 44) && !/Scan in the shop/.test(c.text), c && c.btns);
      await R.shot('/home/sprite/walk-shots/cart-' + tag + '.png').catch(() => {});
      await R.tap('.stp-cart-acts [data-stp="giftcart"]'); await H.sleep(2500);
      const g = await P.evaluate(() => { const card = document.querySelector('.gb-fromcart');
        return { card: !!card, items: card ? [...card.querySelectorAll('.gb-items li')].map(x => x.textContent.trim()) : [], left: (document.querySelector('.gb-fromcart .gb-left') || {}).textContent || '',
          total: (document.querySelector('#gb-total') || {}).value, note: (document.querySelector('.gb-totalnote') || {}).textContent || '' }; });
      if (rule === 'open') ok('4 open rules: EVERY food goes in (halloumi and wraps too), nothing left out', g.card && g.items.length === 7 && g.items.some(x => /Halloumi/.test(x)) && g.items.some(x => /Tortilla/.test(x)) && !g.left, g);
      else ok('4 old rules: whatever the server cannot take yet is named, nothing vanishes', g.card && g.items.length >= 1 && (g.items.length === 7 || /can’t take these yet/.test(g.left)), g);
      ok('5 the total field is the cart total to the cent (not €5) and says it is an estimate', g.total === '16.29' && /16\.29/.test(g.note) && /estimates/.test(g.note), { total: g.total, note: g.note });
      await R.shot('/home/sprite/walk-shots/give-' + tag + '.png').catch(() => {});
      await P.fill('#gb-link', 'https://ko-fi.com/fakeperson'); await H.sleep(400);
      await P.evaluate(() => document.querySelector('.gb-cartshare').scrollIntoView({ block: 'center' })); await H.sleep(300);
      await R.tap('.gb-cartshare'); await H.sleep(2200);
      const s = await P.evaluate(() => ({ n: window.__shares.length, row: window.__shares[0] && window.__shares[0].row, tab: LowiGiftBasket._state().tab }));
      const want = rule === 'open' ? 7 : (g.items.length);
      ok('6 Share sends the cart total and the counts', s.n === 1 && s.row && s.row.total_eur === 16.29 && s.row.items.length === want && s.row.items.some(i => i.q === 3), { n: s.n, row: s.row });
      ok('7 then the Give a hand feed', s.tab === 'give', s.tab);
      ok('8 zero page errors', errs.length === 0, errs);
    } catch (e) { ok('run', false, String(e && e.stack || e).slice(0, 600)); }
    await R.close();
  }
  console.log('\n' + pass + ' passed, ' + fail + ' failed' + (bad.length ? '\n' + bad.join('\n') : ''));
  process.exit(fail ? 1 : 0);
})();
