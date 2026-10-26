/* Run 42 (P-ROW-SHIFT siblings in Shop > Supermarket > Snacks to buy):
   R: double tap "Buy again · recent" (Add N): the row becomes "N snacks are back" with Undo where Add N was -> 2nd tap = Undo?
   U: double tap Undo: the Buy again row comes back under the finger -> 2nd tap refills again?
   T: double tap the tick (Bought) on the first snack: the next snack slides up -> two bought?
   node probe-snack-dbl.cjs <url|dir> [view] [gaps]   env RM=1 ONLY=RUT */
'use strict';
const L = require('./lib.cjs');
(async () => {
  let url = process.argv[2] || 'https://therealetm.github.io/lowispike/', srv = null; if (!/^https?:/.test(url)) { srv = await L.serve(url); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const view = process.argv[3] || 'iphone13', GAPS = (process.argv[4] || '0,120,250').split(',').map(Number), ONLY = process.env.ONLY || 'RUT';
  const h = await L.open({ url, view, reducedMotion: !!process.env.RM, lang: 'en', preInit: "try{localStorage.setItem('lowi.tutorial.done','1')}catch(e){};window.__ck=[];document.addEventListener('click',function(e){if(e.isTrusted){var b=e.target.closest&&e.target.closest('button');window.__ck.push(Math.round(e.timeStamp)+':'+(b?(b.className||b.tagName):(e.target.className+'').slice(0,20)))}},true);" });
  const P = h.page; let bad = 0;
  await P.waitForFunction(() => window.LowiStorePicks && window.LowiStorePicks.open, null, { timeout: 120000 }).catch(() => {});
  await L.sleep(3000);
  await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); try { LowiR2.closeAll(); } catch (e) {} });
  const dbl = async (x, y, g) => { if (h.touch) { await P.touchscreen.tap(x, y); if (g) await L.sleep(g); await P.touchscreen.tap(x, y); } else { await P.mouse.click(x, y); if (g) await L.sleep(g); await P.mouse.click(x, y); } };
  const real = ck => ck.length >= 2 ? parseInt(ck[ck.length - 1]) - parseInt(ck[0]) : -1;
  /* buy: Apples, Bananas, Carrots; got before (recent): Nuts, Yogurt, Berries */
  const seed = (withUndoState) => P.evaluate(() => {
    const t = Date.now(), l = [['Apples', 0], ['Bananas', 0], ['Carrots', 0], ['Nuts', t - 3e5], ['Yogurt', t - 2e5], ['Berries', t - 1e5]].map((a, k) => ({ id: 's' + k + '-' + t, n: a[0], got: a[1], t: t - 1e6 + k }));
    localStorage.setItem('lowi.snackBuy.v1', JSON.stringify(l));
  });
  const reopen = async () => { await P.evaluate(() => { try { LowiStorePicks.close(); } catch (e) {} }); await L.sleep(500);
    /* store-picks keeps `snacks` in memory: reload page state by re-evaluating is not possible, so reload */
  };
  const state = () => P.evaluate(() => { const s = LowiStorePicks.snacks(); return { buy: s.filter(i => !i.got).map(i => i.n), row: (document.querySelector('.stp-again') || {}).className || 'none', ck: window.__ck.slice() }; });
  const openAt = async sel => {
    await P.evaluate(() => { LowiStorePicks.setTab('shop'); LowiStorePicks.open(); }); await L.sleep(1800);
    await P.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: 'center' }); }, sel); await L.sleep(700);
  };
  for (const mode of ['R', 'U', 'T']) { if (!ONLY.includes(mode)) continue;
    for (const g of GAPS) {
      await seed(); await P.reload(); await P.waitForFunction(() => window.LowiStorePicks && window.LowiStorePicks.open, null, { timeout: 120000 }).catch(() => {}); await L.sleep(2500);
      await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); try { LowiR2.closeAll(); } catch (e) {} });
      if (mode === 'U') { await openAt('[data-stp-snack-refill]'); const c0 = await L.center(h, '[data-stp-snack-refill]'); if (!c0) { console.log('U setup: no refill row'); continue; } await L.tap(h, c0.x, c0.y); await L.sleep(900); }
      const sel = mode === 'R' ? '[data-stp-snack-refill] .stp-again-add' : mode === 'U' ? '[data-stp-snack-undo]' : '.stp-snack-list .stp-snack-tick';
      if (mode !== 'U') await openAt(sel);
      const c = await L.center(h, sel); if (!c) { console.log(mode + ' gap' + g + ' setup: no ' + sel + ' ' + JSON.stringify(await state())); continue; }
      const s0 = await state();
      await P.evaluate(() => { window.__ck.length = 0; });
      await dbl(c.x, c.y, g); await L.sleep(1000);
      const s = await state(); const r = real(s.ck);
      let fail = false, what;
      if (mode === 'R') { fail = s.buy.length === 3 && s.ck.length >= 2; what = 'buy ' + JSON.stringify(s.buy) + ' row ' + s.row; }
      else if (mode === 'U') { fail = s.buy.length !== 3 && s.ck.length >= 2; what = 'buy ' + JSON.stringify(s.buy) + ' row ' + s.row; }
      else { const gone = s0.buy.filter(n => !s.buy.includes(n)); fail = gone.length > 1; what = 'bought ' + JSON.stringify(gone); }
      fail = fail && r >= 0 && r < 400; if (fail) bad++;
      console.log((fail ? 'FAIL' : 'ok') + ' ' + ({ R: 'Add N', U: 'Undo', T: 'tick' })[mode] + ' gap' + g + ' real ' + r + 'ms ' + what + ' clicks ' + JSON.stringify(s.ck));
    }
  }
  const s = await L.snap(h); console.log('errors', JSON.stringify({ err: s.err, rej: s.rej, pe: h.log.pageerror }), bad ? 'RESULT FAIL ' + bad : 'RESULT PASS');
  await h.browser.close(); if (srv) srv.close(); process.exit(0);
})();
