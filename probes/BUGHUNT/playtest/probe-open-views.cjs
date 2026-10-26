'use strict';
/* Run 34: Community opening paths after BH-034. Plain Community (goTab) still lands on the first tab with the warp; openOn('fy') and
   LowiRanking.open() land on their view in the same task. Mock cloud (no live DB). node probe-open-views.cjs <url|dir> [view] */
const L = require('./lib.cjs');
(async () => {
  let url = process.argv[2] || 'https://therealetm.github.io/lowispike/', srv = null; if (!/^https?:/.test(url)) { srv = await L.serve(url); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const WT = require('fs').readFileSync('/home/sprite/BUGHUNT/.wt', 'utf8').trim();
  const h = await L.open({ url, view: process.argv[3] || 'iphone13', lang: 'en', preInit: "try{localStorage.setItem('lowi.tutorial.done','1')}catch(e){}",
    ctxHook: async ctx => require(WT + '/tools/sim/mock-cloud.cjs').install(ctx, { members: 30, messages: 20, me: 'Fixture' }) });
  const P = h.page;
  await P.waitForFunction(() => document.getElementById('whPad') && document.querySelectorAll('[data-orbit]').length >= 8, null, { timeout: 120000 }).catch(() => {});
  await L.sleep(4000);
  await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); });
  const runs = [['plain', "goTab('foryou')"], ['fy', "LowiRoomsUI.openOn('fy')"], ['rank', "LowiRanking.open()"], ['plain2', "goTab('foryou')"]];
  for (const [name, code] of runs) {
    await P.evaluate(() => { try { goTab('home'); } catch (e) {} }); await L.sleep(1500);
    const r = await P.evaluate(code => { const H = document.documentElement; let warp = false; const mo = new MutationObserver(() => { if (H.classList.contains('gx-out') || H.classList.contains('gx-hold')) warp = true; }); mo.observe(H, { attributes: true });
      (0, eval)(code); const sync = LowiRoomsUI.view(); return new Promise(res => setTimeout(() => { mo.disconnect(); res({ sync, later: LowiRoomsUI.view(), warp, tab: (document.querySelector('.rm-tab.on,.rm-tab[aria-selected=true]') || {}).dataset?.rm }); }, 2000)); }, code);
    console.log(name, JSON.stringify(r));
  }
  const s = await L.snap(h); console.log('errors', JSON.stringify({ err: s.err, rej: s.rej, pe: h.log.pageerror }));
  await h.browser.close(); if (srv) srv.close(); process.exit(0);
})();
