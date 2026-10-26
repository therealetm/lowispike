'use strict';
/* Run 36 sanity: Give a hand, Shop finds and Seller Zone still open, take taps, close on X, and reopen (after BH-036). */
const L = require('./lib.cjs');
(async () => {
  let url = process.argv[2], srv = null; if (!/^https?:/.test(url)) { srv = await L.serve(url); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const WT = require('fs').readFileSync('/home/sprite/BUGHUNT/.wt', 'utf8').trim();
  const h = await L.open({ url, view: process.argv[3] || 'iphone13', lang: 'en', preInit: "try{localStorage.setItem('lowi.tutorial.done','1')}catch(e){}",
    ctxHook: async ctx => require(WT + '/tools/sim/mock-cloud.cjs').install(ctx, { members: 30, messages: 20, me: 'Fixture' }) });
  const P = h.page; let bad = 0;
  await P.waitForFunction(() => document.querySelectorAll('[data-orbit]').length >= 8, null, { timeout: 120000 }).catch(() => {});
  await L.sleep(4000); await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); });
  for (const [api, ovSel, xSel, tapSel] of [['LowiGiftBasket', '.gb-ov', '[data-gb="close"]', '[data-gb-tab]'], ['LowiGrocery', '.gh-ov', '[data-gh="close"]', '[data-gh]:not([data-gh="close"]):not([data-gh="scan"]):not([data-gh="photo"])'], ['LowiSellerZone', '.sz-ov', '[data-sz="close"]', '[data-sz-cat]']]) {
    for (let round = 1; round <= 2; round++) {
      await P.evaluate(a => { try { window[a].open('probe'); } catch (e) { window.__oe = String(e); } }, api); await L.sleep(1200);
      const open1 = await P.evaluate(a => window[a].isOpen(), api);
      const t = await L.center(h, ovSel + ' ' + tapSel); if (t) { await L.tap(h, t.x, t.y); await L.sleep(500); }
      const stillOpen = await P.evaluate(a => window[a].isOpen(), api);
      const x = await L.center(h, ovSel + ' ' + xSel); if (x) await L.tap(h, x.x, x.y); await L.sleep(900);
      const closed = await P.evaluate(o => !window[o.a].isOpen() && !document.querySelector(o.s), { a: api, s: ovSel });
      const ok = open1 && stillOpen && closed && !!x; if (!ok) bad++;
      console.log((ok ? 'PASS ' : 'FAIL ') + api + ' round' + round + ' ' + JSON.stringify({ open1, tapped: !!t, stillOpen, x: !!x, closed }));
      await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) {} try { LowiStorePicks.close(); } catch (e) {} }); await L.sleep(800);
    }
  }
  const s = await L.snap(h); console.log('errors', JSON.stringify({ err: s.err, rej: s.rej, pe: h.log.pageerror }), bad ? 'RESULT FAIL ' + bad : 'RESULT PASS');
  await h.browser.close(); if (srv) srv.close(); process.exit(0);
})();
