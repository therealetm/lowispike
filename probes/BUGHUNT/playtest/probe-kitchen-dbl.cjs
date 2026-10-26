/* Run 41 (P-ROW-SHIFT: a row action removes its row, the next row slides under the finger): Cook > Kitchen > To buy list.
   Double tap "Bought" (or "x" take off the list) on the first row: does the 2nd tap act on the NEXT row too?
   Also C: bin a selected card in a shelf by a double tap on "Ran out: bin it" (points counted twice?).
   node probe-kitchen-dbl.cjs <url|dir> [view] [gaps]   env RM=1 ONLY=GXB */
'use strict';
const L = require('./lib.cjs');
(async () => {
  let url = process.argv[2] || 'https://therealetm.github.io/lowispike/', srv = null; if (!/^https?:/.test(url)) { srv = await L.serve(url); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const view = process.argv[3] || 'chromium390', GAPS = (process.argv[4] || '0,120,250').split(',').map(Number), ONLY = process.env.ONLY || 'GXB';
  const h = await L.open({ url, view, reducedMotion: !!process.env.RM, lang: 'en', preInit: "try{localStorage.setItem('lowi.tutorial.done','1')}catch(e){};window.__ck=[];document.addEventListener('click',function(e){if(e.isTrusted){var b=e.target.closest&&e.target.closest('button');window.__ck.push(Math.round(e.timeStamp)+':'+(b?(b.getAttribute('data-kg-got')||b.getAttribute('data-kg-bdrop')||b.getAttribute('data-kg-bin')||b.className):(e.target.className+'').slice(0,20)))}},true);" });
  const P = h.page; let bad = 0;
  await P.waitForFunction(() => window.LowiKitchenGame && window.LOWI_SHELF && window.LOWI_SHELF.listOpen, null, { timeout: 120000 }).catch(() => {});
  await L.sleep(3000);
  await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); try { LowiR2.closeAll(); } catch (e) {} });
  const dbl = async (x, y, g) => { if (h.touch) { await P.touchscreen.tap(x, y); if (g) await L.sleep(g); await P.touchscreen.tap(x, y); } else { await P.mouse.click(x, y); if (g) await L.sleep(g); await P.mouse.click(x, y); } };
  const real = ck => ck.length >= 2 ? parseInt(ck[ck.length - 1]) - parseInt(ck[0]) : -1;
  const seedList = () => P.evaluate(() => { const S = window.LOWI_SHELF; try { S.listOpen(true).forEach(i => S.dropList(i.id)); } catch (e) {} S.addIngredients(['Apples', 'Butter', 'Carrots', 'Dates', 'Eggs'].map(n => ({ n })), ''); return S.listOpen(true).filter(i => !i.done).map(i => i.n); });
  const kitN = () => P.evaluate(() => { try { return JSON.parse(localStorage.getItem(LowiKitchenCore.KEY) || '{}').items.map(i => i.n); } catch (e) { return []; } });
  for (const mode of ['G', 'X']) { if (!ONLY.includes(mode)) continue;
    for (const g of GAPS) {
      try { localStorage; } catch (e) {}
      await P.evaluate(() => { try { localStorage.removeItem(LowiKitchenCore.KEY); } catch (e) {} });
      const list0 = await seedList();
      await P.evaluate(() => { LowiKitchenGame.open('buy'); }); await L.sleep(1800);
      const sel = mode === 'G' ? '#kgRoot .kg-buyv .kg-card:not(.done) [data-kg-got]' : '#kgRoot .kg-buyv .kg-card:not(.done) [data-kg-bdrop]';
      const c = await L.center(h, sel); if (!c) { console.log(mode + ' gap' + g + ' setup: no button; list ' + JSON.stringify(list0) + ' state ' + JSON.stringify(await P.evaluate(() => LowiKitchenGame.state()))); continue; }
      await P.evaluate(() => { window.__ck.length = 0; });
      await dbl(c.x, c.y, g); await L.sleep(1200);
      const s = await P.evaluate(() => ({ left: LOWI_SHELF.listOpen(true).filter(i => !i.done).map(i => i.n), ck: window.__ck.slice() }));
      const kit = await kitN(); const r = real(s.ck); const gone = list0.filter(n => !s.left.includes(n));
      const fail = gone.length > 1 && r >= 0 && r < 400; if (fail) bad++;
      console.log((gone.length > 1 ? 'TWO ROWS' : 'ok') + ' ' + (mode === 'G' ? 'Bought' : 'x') + ' gap' + g + ' real ' + r + 'ms gone ' + JSON.stringify(gone) + ' kitchen ' + JSON.stringify(kit) + ' clicks ' + JSON.stringify(s.ck) + (fail ? ' FAIL' : ''));
      await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) {} }); await L.sleep(500);
    }
  }
  const s = await L.snap(h); console.log('errors', JSON.stringify({ err: s.err, rej: s.rej, pe: h.log.pageerror }), bad ? 'RESULT FAIL ' + bad : 'RESULT PASS');
  await h.browser.close(); if (srv) srv.close(); process.exit(0);
})();
