/* Run 41 (BH-041b): a two-step delete armed AND confirmed by one double tap. Cycle world > settings > Delete all cycle data.
   node probe-armed-dbl.cjs <url|dir> [view] [gaps]. A deliberate 2nd tap after 900 ms must still delete. */
'use strict';
const L = require('./lib.cjs');
(async () => {
  let url = process.argv[2] || 'https://therealetm.github.io/lowispike/', srv = null; if (!/^https?:/.test(url)) { srv = await L.serve(url); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const view = process.argv[3] || 'iphone13', GAPS = (process.argv[4] || '0,120,250,900').split(',').map(Number);
  const h = await L.open({ url, view, lang: 'en', preInit: "try{localStorage.setItem('lowi.tutorial.done','1')}catch(e){}" }); const P = h.page; let bad = 0;
  await P.waitForFunction(() => window.LowiCycleWorld && window.LowiCycleWorld.open, null, { timeout: 120000 }).catch(() => {});
  await L.sleep(3000);
  await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); try { LowiR2.closeAll(); } catch (e) {} });
  const tap = async (x, y) => { if (h.touch) await P.touchscreen.tap(x, y); else await P.mouse.click(x, y); };
  for (const g of GAPS) {
    await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) {} }); await L.sleep(600);
    await P.evaluate(() => { LowiCycleWorld.open(); }); await L.sleep(1500);
    const ok = await P.evaluate(() => { const b = document.querySelector('[data-cw="del"]'); if (!b) return 'nobtn'; const d = b.closest('details'); if (d) d.open = true; b.scrollIntoView({ block: 'center' }); return 'ok'; });
    await L.sleep(500);
    const c = await L.center(h, '[data-cw="del"]'); if (!c || ok !== 'ok') { console.log('gap' + g + ' setup ' + ok); continue; }
    await P.evaluate(() => { window.__del = 0; const L0 = window.LowiCycleLog || window.LOWI_CYCLE || null; window.__txt0 = document.body.innerText.includes('Tap again'); });
    await tap(c.x, c.y); if (g) await L.sleep(g); const c2 = await L.center(h, '[data-cw="del"]') || c; await tap(c2.x, c2.y); await L.sleep(700);
    const s = await P.evaluate(() => { const b = document.querySelector('[data-cw="del"]'); return { btn: b ? b.textContent : null, armed: !!(b && b.classList.contains('armed')), deleted: /All cycle data|deleted/i.test(document.body.innerText.replace(/Delete all cycle data/g, '')) }; });
    const fail = s.deleted && g < 400; if (fail) bad++; const miss = g >= 900 && !s.deleted; if (miss) bad++;
    console.log((s.deleted ? 'DELETED' : 'kept') + ' gap' + g + ' ' + JSON.stringify(s) + (fail ? ' FAIL (one double tap deleted everything)' : miss ? ' FAIL (deliberate confirm did not delete)' : ''));
  }
  const sn = await L.snap(h); console.log('errors', JSON.stringify({ err: sn.err, rej: sn.rej, pe: h.log.pageerror }), bad ? 'RESULT FAIL ' + bad : 'RESULT PASS');
  await h.browser.close(); if (srv) srv.close(); process.exit(0);
})();
