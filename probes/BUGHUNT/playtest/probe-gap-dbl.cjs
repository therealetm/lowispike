'use strict';
/* Run 37 (P-CLOSING-STILL-LIVE siblings): Gap (gap-view.js) fades 260 ms after close and stays clickable; the push ask card
   (lis-push.js) fades 260 ms after a choice and stays clickable. Double tap Gap's 'Log a meal' (close + meal() 60 ms later) and
   'Not now' on the push card (counts a 'no'; two 'no' = never asked again). node probe-gap-dbl.cjs <url|dir> [view] [gaps]  env RM=1 */
const L = require('./lib.cjs');
(async () => {
  let url = process.argv[2] || 'https://therealetm.github.io/lowispike/', srv = null; if (!/^https?:/.test(url)) { srv = await L.serve(url); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const view = process.argv[3] || 'iphone13';
  const gaps = (process.argv[4] || '0,120,200').split(',').map(Number);
  const WT = require('fs').readFileSync('/home/sprite/BUGHUNT/.wt', 'utf8').trim();
  const h = await L.open({ url, view, reducedMotion: !!process.env.RM, lang: 'en', preInit: "try{localStorage.setItem('lowi.tutorial.done','1')}catch(e){}",
    ctxHook: async ctx => require(WT + '/tools/sim/mock-cloud.cjs').install(ctx, { members: 30, messages: 20, me: 'Fixture' }) });
  const P = h.page; let bad = 0;
  await P.waitForFunction(() => document.getElementById('whPad') && document.querySelectorAll('[data-orbit]').length >= 8, null, { timeout: 120000 }).catch(() => {});
  await L.sleep(4000);
  await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot');
    window.__n = { meal: 0, move: 0, err: [] };
    addEventListener('error', e => window.__n.err.push(String(e.message).slice(0, 120)));
    const S = window.LowiSpirit; if (S && S.meal) { const o = S.meal; S.meal = function () { window.__n.meal++; return o.apply(this, arguments); }; }
    if (typeof window.lowiOpen === 'function') { const o = window.lowiOpen; window.lowiOpen = function (k) { if (k === 'move') window.__n.move++; return o.apply(this, arguments); }; }
    window.__ck = []; addEventListener('click', e => { const b = e.target.closest && e.target.closest('button,a'); window.__ck.push(Math.round(e.timeStamp) + ' ' + (e.isTrusted ? 'T ' : 's ') + (b ? (b.className + ' ' + (b.getAttribute('data-gv') || '')).slice(0, 40) : e.target.tagName + '.' + String(e.target.className).slice(0, 20))); }, true); });
  const reset = () => P.evaluate(() => { try { LowiGapView.close(true); } catch (e) {} try { LowiR2.closeAll(); } catch (e) {} document.querySelectorAll('.lisp-card').forEach(c => c.remove());
    try { document.querySelectorAll('.sheet.open,[aria-modal="true"]').forEach(s => { const x = s.querySelector('[data-close],.sheet-x,.x'); if (x) x.click(); }); } catch (e) {}
    window.__n.meal = 0; window.__n.move = 0; window.__n.err.length = 0; window.__ck.length = 0; });
  /* 1) Gap 'Log a meal' double tap */
  for (const gap of gaps) {
    await reset(); await L.sleep(800);
    await P.evaluate(() => LowiGapView.open()); await L.sleep(1200);
    const c = await P.evaluate(() => { const b = document.querySelector('.gv-ov [data-gv="log"]'); if (!b) return null; b.scrollIntoView({ block: 'center' }); const q = b.getBoundingClientRect(); const top = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return { x: q.left + q.width / 2, y: q.top + q.height / 2, top: top && (top.className || top.tagName) }; });
    if (c) console.log('log at', JSON.stringify(c));
    if (!c) { console.log('SKIP no gv log'); continue; }
    await P.evaluate(() => { window.__ck.length = 0; });
    const t = Date.now(); await L.tap(h, c.x, c.y); const w = gap - (Date.now() - t); if (w > 0) await L.sleep(w); await L.tap(h, c.x, c.y);
    const took = Date.now() - t; await L.sleep(1500);
    const st = await P.evaluate(() => ({ meal: window.__n.meal, err: window.__n.err.slice(), ck: window.__ck.slice(), gv: document.querySelectorAll('.gv-ov').length,
      sheets: [...document.querySelectorAll('.sheet.open,[aria-modal="true"]')].filter(s => s.getBoundingClientRect().width > 2).map(s => (s.id || s.className).slice(0, 30)) }));
    const ok = st.meal === 1 && !st.err.length && st.gv === 0;
    if (!ok) bad++;
    console.log((ok ? 'PASS ' : 'FAIL ') + 'gap-log gap' + gap + ' (' + took + 'ms) meal() x' + st.meal + ' ' + JSON.stringify(st));
  }
  /* 2) push ask 'Not now' double tap */
  for (const gap of gaps) {
    await reset(); await L.sleep(500);
    const ok0 = await P.evaluate(() => { localStorage.removeItem('lowi.pushAsk'); try { return LisPush.ask(true); } catch (e) { return String(e); } });
    await L.sleep(700);
    const c = await L.center(h, '.lisp-card .lisp-no');
    if (!c) { console.log('SKIP no push card', ok0); continue; }
    await P.evaluate(() => { window.__ck.length = 0; });
    const t = Date.now(); await L.tap(h, c.x, c.y); const w = gap - (Date.now() - t); if (w > 0) await L.sleep(w); await L.tap(h, c.x, c.y);
    const took = Date.now() - t; await L.sleep(900);
    const st = await P.evaluate(() => ({ ask: JSON.parse(localStorage.getItem('lowi.pushAsk') || '{}'), err: window.__n.err.slice(), ck: window.__ck.slice(), cards: document.querySelectorAll('.lisp-card').length }));
    const ok = (st.ask.no || 0) === 1 && !st.err.length && st.cards === 0;
    if (!ok) bad++;
    console.log((ok ? 'PASS ' : 'FAIL ') + 'push-notnow gap' + gap + ' (' + took + 'ms) no=' + (st.ask.no || 0) + ' ' + JSON.stringify(st));
  }
  const s = await L.snap(h); console.log('errors', JSON.stringify({ err: s.err, rej: s.rej, pe: h.log.pageerror }), bad ? 'RESULT FAIL ' + bad : 'RESULT PASS');
  await h.browser.close(); if (srv) srv.close(); process.exit(0);
})();
