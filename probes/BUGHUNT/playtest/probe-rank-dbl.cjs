'use strict';
/* Run 32: double tap Misty's ranking row ("Misty is number N worldwide") in her card. The first tap goes to Community, which shows
   the galaxy for a moment before Ranking; does the 2nd tap land on a person there and pick them as the one you talk to?
   node probe-rank-dbl.cjs <url> [view] [gaps]   env RM=1 */
const L = require('./lib.cjs');
(async () => {
  let url = process.argv[2] || 'https://therealetm.github.io/lowispike/', srv = null; if (!/^https?:/.test(url)) { srv = await L.serve(url); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const view = process.argv[3] || 'iphone13';
  const gaps = (process.argv[4] || '0,80,160,260').split(',').map(Number);
  const WT = require('fs').readFileSync('/home/sprite/BUGHUNT/.wt', 'utf8').trim();
  const h = await L.open({ url, view, reducedMotion: !!process.env.RM, lang: 'en', preInit: "try{localStorage.setItem('lowi.tutorial.done','1')}catch(e){}",
    ctxHook: async ctx => require(WT + '/tools/sim/mock-cloud.cjs').install(ctx, { members: 30, messages: 20, me: 'Fixture' }) });
  const P = h.page; let bad = 0;
  await P.waitForFunction(() => document.getElementById('whPad') && document.querySelectorAll('[data-orbit]').length >= 8, null, { timeout: 120000 }).catch(() => {});
  await L.sleep(4000);
  await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot');
    window.__ck = []; addEventListener('click', e => { const b = e.target.closest && e.target.closest('button,[data-act],a'); window.__ck.push(Math.round(e.timeStamp) + '/' + Math.round(performance.now()) + ' ' + (b ? (b.className + ' ' + (b.getAttribute('aria-label') || '')).slice(0, 60) : e.target.tagName)); }, true);
    const U = window.LowiRoomsUI; if (U && U.showView && !U.__w) { const o = U.showView; U.__w = 1; U.showView = function (v) { window.__ck.push(Math.round(performance.now()) + ' showView ' + v); return o.apply(this, arguments); }; }
    const gt = window.goTab; if (gt && !gt.__w) { window.goTab = function (t) { window.__ck.push(Math.round(performance.now()) + " goTab " + t); return gt.apply(this, arguments); }; window.goTab.__w = 1; } });
  for (const gap of gaps) {
    await P.evaluate(() => { try { LowiCommunity.select(''); } catch (e) {} try { goTab('home'); LowiWorldHome.openMisty('aura'); } catch (e) {} });
    await P.waitForSelector('#mistyHub .mh-rk', { timeout: 15000 }).catch(() => {});
    await L.sleep(1500);
    const c = await L.center(h, '#mistyHub .mh-rk'); if (!c) { console.log('no rank row'); continue; }
    await P.evaluate(() => { window.__ck.length = 0; });
    const t = Date.now(); await L.tap(h, c.x, c.y); const w = gap - (Date.now() - t); if (w > 0) await L.sleep(w); await L.tap(h, c.x, c.y);
    const took = Date.now() - t; await L.sleep(1800);
    const st = await P.evaluate(() => { const U = window.LowiRoomsUI; const v = U && U.view ? U.view() : '?';
      return { view: v, sel: [...document.querySelectorAll('.cg-body.sel')].map(e => e.getAttribute('aria-label') || e.textContent.trim().slice(0, 30)), announce: (document.getElementById('csAnnounce') || {}).textContent || '', clicks: window.__ck.slice() }; });
    if (st.view === 'rank') { await P.evaluate(() => { try { LowiRoomsUI.showView('chat'); } catch (e) {} }); await L.sleep(800);
      st.selInChat = await P.evaluate(() => [...document.querySelectorAll('.cg-body.sel')].map(e => e.getAttribute('aria-label') || '')); st.ph = await P.evaluate(() => { const i = document.getElementById('cmInput'); return i ? i.getAttribute('placeholder') : ''; }); }
    const ok = !st.sel.length && !(st.selInChat || []).length && !/stream|direct|talk/i.test(st.announce);
    if (!ok) bad++;
    console.log((ok ? 'PASS' : 'FAIL') + ' gap' + gap + ' (' + took + 'ms) ' + JSON.stringify(st));
  }
  const s = await L.snap(h); console.log('errors', JSON.stringify({ err: s.err, rej: s.rej, pe: h.log.pageerror }), bad ? 'RESULT FAIL ' + bad : 'RESULT PASS');
  await h.browser.close(); if (srv) srv.close(); process.exit(0);
})();
