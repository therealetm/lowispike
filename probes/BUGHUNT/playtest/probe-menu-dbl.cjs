'use strict';
/* Run 38 (P-REUSED-OVERLAY): Community's menu (.rm-menu) is a full-screen body element made once and shown again (hidden toggled);
   a tap on its backdrop closes it. After the first open it is no longer 'born', so a double tap on the menu button could open it and
   close it at once (2nd tap lands on the backdrop). node probe-menu-dbl.cjs <url|dir> [view] [gaps]   env RM=1 */
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
  await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot');
    window.__ck = []; addEventListener('click', e => { const b = e.target.closest && e.target.closest('button,[data-act],a,[data-rmm]'); window.__ck.push(Math.round(e.timeStamp) + ' ' + (e.target === document.querySelector('.rm-menu') ? 'BACKDROP' : b ? ((b.id ? '#' + b.id + ' ' : '') + b.className + ' ' + (b.getAttribute('aria-label') || '')).slice(0, 50) : e.target.tagName)); }, true); });
  await P.evaluate(() => { try { goTab('foryou'); } catch (e) {} });
  await P.waitForSelector('.rm-menu-btn', { state: 'visible', timeout: 20000 }).catch(() => {}); await L.sleep(2500);
  /* warm up: open and close the menu once so the overlay exists and is old */
  { const b = await L.center(h, '.rm-menu-btn'); if (!b) { console.log('no menu button'); process.exit(0); } await L.tap(h, b.x, b.y); await L.sleep(800);
    const first = await P.evaluate(() => { const m = document.querySelector('.rm-menu'); return !!(m && !m.hidden); }); console.log('warm open', first);
    await P.keyboard.press('Escape'); await L.sleep(1500); }
  for (const gap of gaps) {
    await P.evaluate(() => { const m = document.querySelector('.rm-menu'); if (m && !m.hidden) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); window.__ck.length = 0; });
    await L.sleep(1200);
    const b = await L.center(h, '.rm-menu-btn'); if (!b) { console.log('no menu button'); continue; }
    const t = Date.now(); await L.tap(h, b.x, b.y); const w = gap - (Date.now() - t); if (w > 0) await L.sleep(w); await L.tap(h, b.x, b.y);
    const took = Date.now() - t; await L.sleep(1200);
    const st = await P.evaluate(() => { const m = document.querySelector('.rm-menu'); return { menuOpen: !!(m && !m.hidden), clicks: window.__ck.slice() }; });
    /* a later tap on the backdrop still closes it */
    let later = null; if (st.menuOpen) { { const vp = await P.evaluate(() => ({ w: innerWidth, h: innerHeight })); await L.tap(h, 20, vp.h - 40); } await L.sleep(700); later = await P.evaluate(() => { const m = document.querySelector('.rm-menu'); return !!(m && m.hidden); }); }
    st.backdropClosesLater = later;
    const ok = st.menuOpen && later !== false; if (!ok) bad++;
    console.log((ok ? 'PASS' : 'FAIL') + ' gap' + gap + ' (' + took + 'ms) ' + JSON.stringify(st));
  }
  /* sanity: one tap on the menu, then one tap on People (a row) still opens the People list */
  { await L.sleep(1200); const b = await L.center(h, '.rm-menu-btn'); if (b) { await L.tap(h, b.x, b.y); await L.sleep(900); const r = await L.center(h, '.rm-menu [data-rmm="dir"]');
      if (r) { await L.tap(h, r.x, r.y); await L.sleep(1200); const ok = await P.evaluate(() => !!document.querySelector('.pd-ov') && document.querySelector('.rm-menu').hidden); console.log((ok ? 'PASS' : 'FAIL') + ' row People opens'); if (!ok) bad++; } else console.log('no People row'); } }
  const s = await L.snap(h); console.log('errors', JSON.stringify({ err: s.err, rej: s.rej, pe: h.log.pageerror }), bad ? 'RESULT FAIL ' + bad : 'RESULT PASS');
  await h.browser.close(); if (srv) srv.close(); process.exit(0);
})();
