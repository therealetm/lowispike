'use strict';
/* Run 36 (P-CLOSING-STILL-LIVE): Shop (store-picks) closes with a 260 ms fade but stays clickable while it fades. A double tap on
   'Scan in the shop' / 'Shopping list' (both close Shop, then open something 200 ms later) and taps on other buttons of the
   fading panel: count what opens and catch errors. node probe-stp-dbl.cjs <url|dir> [view] [gaps]   env RM=1 */
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
    window.__n = { scan: 0, list: 0, err: [] };
    addEventListener('error', e => window.__n.err.push(String(e.message).slice(0, 120)));
    const S = window.LowiShopScan; if (S && S.open) { const o = S.open; S.open = function () { window.__n.scan++; return true; }; S.__o = o; }
    if (typeof window.tdShopOpen === 'function') { const o = window.tdShopOpen; window.tdShopOpen = function () { window.__n.list++; return o.apply(this, arguments); }; }
    window.__ck = []; addEventListener('click', e => { const b = e.target.closest && e.target.closest('button,[data-act],a'); window.__ck.push(Math.round(e.timeStamp) + ' ' + (e.isTrusted ? 'T ' : 's ') + (b ? (b.className + ' ' + (b.getAttribute('data-stp') || '')).slice(0, 50) : e.target.tagName + '.' + String(e.target.className).slice(0, 20))); }, true); });
  const reset = () => P.evaluate(() => { try { const s = document.getElementById('tdShop'); if (s) s.classList.remove('open'); } catch (e) {} try { LowiStorePicks.close(); } catch (e) {} try { LowiR2.closeAll(); } catch (e) {} window.__n.scan = 0; window.__n.list = 0; window.__n.err.length = 0; window.__ck.length = 0; });
  const openShop = async () => { await P.evaluate(() => { try { LowiStorePicks.setTab('shop'); LowiStorePicks.open('probe'); } catch (e) {} }); await L.sleep(1500); };
  for (const which of ['scanshop', 'mylist']) for (const gap of gaps) {
    await reset(); await L.sleep(500); await openShop();
    const c = await P.evaluate(w => { const b = document.querySelector('.stp-ov [data-stp="' + w + '"]'); if (!b) return null; b.scrollIntoView({ block: 'center' }); const q = b.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; }, which);
    if (!c) { console.log('SKIP no ' + which); continue; }
    await L.sleep(300); await P.evaluate(() => { window.__ck.length = 0; });
    const t = Date.now(); await L.tap(h, c.x, c.y); const w = gap - (Date.now() - t); if (w > 0) await L.sleep(w); await L.tap(h, c.x, c.y);
    const took = Date.now() - t; await L.sleep(1200);
    const st = await P.evaluate(() => ({ scan: window.__n.scan, list: window.__n.list, err: window.__n.err.slice(), ck: window.__ck.slice(), shopOpen: !!(window.LowiStorePicks && LowiStorePicks.isOpen()) }));
    const n = which === 'scanshop' ? st.scan : st.list;
    const ok = n === 1 && !st.err.length;
    if (!ok) bad++;
    console.log((ok ? 'PASS ' : 'FAIL ') + which + ' gap' + gap + ' (' + took + 'ms) opened x' + n + ' ' + JSON.stringify(st));
  }
  /* X, then a quick tap on another button of the fading panel (a tab / row) */
  for (const gap of gaps) {
    await reset(); await L.sleep(500); await openShop();
    const x = await L.center(h, '.stp-ov [data-stp="close"]');
    const o = await P.evaluate(() => { const b = document.querySelector('.stp-ov [data-stp-tab]:not(.on)') || document.querySelector('.stp-ov [data-stp-item]') || document.querySelector('.stp-ov [data-stp="pick"]'); if (!b) return null; const q = b.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2, what: b.className + ' ' + (b.getAttribute('data-stp-tab') || '') }; });
    if (!x || !o) { console.log('SKIP x/other', !!x, !!o); continue; }
    await P.evaluate(() => { window.__ck.length = 0; });
    const t = Date.now(); await L.tap(h, x.x, x.y); const w = gap - (Date.now() - t); if (w > 0) await L.sleep(w); await L.tap(h, o.x, o.y);
    const took = Date.now() - t; await L.sleep(1200);
    const st = await P.evaluate(() => ({ err: window.__n.err.slice(), ck: window.__ck.slice(), shopOpen: !!(window.LowiStorePicks && LowiStorePicks.isOpen()), ovs: document.querySelectorAll('.stp-ov').length }));
    const ok = !st.err.length && st.ovs === 0;
    if (!ok) bad++;
    console.log((ok ? 'PASS ' : 'FAIL ') + 'X-then-' + o.what + ' gap' + gap + ' (' + took + 'ms) ' + JSON.stringify(st));
  }
  const s = await L.snap(h); console.log('errors', JSON.stringify({ err: s.err, rej: s.rej, pe: h.log.pageerror }), bad ? 'RESULT FAIL ' + bad : 'RESULT PASS');
  await h.browser.close(); if (srv) srv.close(); process.exit(0);
})();
