'use strict';
/* Run 38 (P-REUSED-OVERLAY): #appearancePanel is made once and shown again (hidden toggled), a tap on it (backdrop) closes it.
   Double tap #appearanceBtn after a warm-up open/close. node probe-appearance-dbl.cjs <url|dir> [view] [gaps] */
const L = require('./lib.cjs');
(async () => {
  let url = process.argv[2] || 'https://therealetm.github.io/lowispike/', srv = null; if (!/^https?:/.test(url)) { srv = await L.serve(url); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const view = process.argv[3] || 'iphone13';
  const gaps = (process.argv[4] || '0,120,250').split(',').map(Number);
  const WT = require('fs').readFileSync('/home/sprite/BUGHUNT/.wt', 'utf8').trim();
  const h = await L.open({ url, view, reducedMotion: !!process.env.RM, lang: 'en', preInit: "try{localStorage.setItem('lowi.tutorial.done','1')}catch(e){}",
    ctxHook: async ctx => require(WT + '/tools/sim/mock-cloud.cjs').install(ctx, { members: 30, messages: 20, me: 'Fixture' }) });
  const P = h.page; let bad = 0;
  await P.waitForFunction(() => document.getElementById('whPad') && document.querySelectorAll('[data-orbit]').length >= 8, null, { timeout: 120000 }).catch(() => {});
  await L.sleep(4000);
  await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); });
  const vis = {};
  for (const tab of ['home', 'profile', 'foryou']) {
    await P.evaluate(t => { try { goTab(t); } catch (e) {} }, tab); await L.sleep(1500);
    vis[tab] = await P.evaluate(() => { const b = document.getElementById('appearanceBtn'), sw = document.getElementById('spWorld'); const r = b && b.getBoundingClientRect(); const s = b && getComputedStyle(b);
      const hit = r && r.width ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null;
      return { exists: !!b, w: r ? Math.round(r.width) : 0, disp: s && s.display, vis: s && s.visibility, op: s && s.opacity, hitIsBtn: !!(hit && b && b.contains(hit)), hit: hit ? (hit.id || hit.className + '').slice(0, 40) : null, spWorld: !!sw }; });
  }
  console.log('visibility', JSON.stringify(vis));
  const s = await L.snap(h); console.log('errors', JSON.stringify({ err: s.err, rej: s.rej, pe: h.log.pageerror }));
  await h.browser.close(); if (srv) srv.close(); process.exit(0);
})();
