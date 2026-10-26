'use strict';
/* Run 35: double tap "Profile" in Ranking's compare card. The first tap closes the card and opens the person's profile sheet; the
   one bottom-centre X (#whX, a body element made once and shown again for every sheet) can then sit under the finger, so the 2nd tap
   would close the profile at once. node probe-pf-dbl.cjs <url|dir> [view] [gaps]   env RM=1 */
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
    window.__ck = []; addEventListener('click', e => { const b = e.target.closest && e.target.closest('button,[data-act],a'); window.__ck.push(Math.round(e.timeStamp) + ' ' + (b ? ((b.id ? '#' + b.id + ' ' : '') + b.className + ' ' + (b.getAttribute('aria-label') || '')).slice(0, 60) : e.target.tagName)); }, true); });
  for (const gap of gaps) {
    await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) {} try { goTab('home'); LowiWorldHome.openMisty('aura'); } catch (e) {} });
    await P.waitForSelector('#mistyHub .mh-rk', { timeout: 15000 }).catch(() => {}); await L.sleep(1200);
    { const m = await L.center(h, '#mistyHub .mh-rk'); if (m) await L.tap(h, m.x, m.y); else await P.evaluate(() => { try { LowiRanking.open(); } catch (e) {} }); }
    for (let i = 0; i < 20; i++) { await L.sleep(1500); const ok = await P.evaluate(i => { if (document.querySelector('[data-rk="open"]:not([data-me])')) return true; const ks = ['w', 'm', 'a']; const b = document.querySelector('.rk-segb[data-k="' + ks[i % 3] + '"]'); b && b.click(); return false; }, i); if (ok) break; }
    await P.waitForSelector('[data-rk="open"]:not([data-me])', { timeout: 15000 }).catch(() => {});
    await L.sleep(1000);
    const row = await P.evaluate(() => { const r = document.querySelector('.rk-row[data-rk="open"]:not([data-me])') || document.querySelector('[data-rk="open"]:not([data-me])'); if (!r) return null; r.scrollIntoView({ block: 'center' }); const q = r.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
    if (!row) { console.log('no row', JSON.stringify(await P.evaluate(() => ({ tab: window.LowiHost && LowiHost.tab && LowiHost.tab(), view: window.LowiRoomsUI && LowiRoomsUI.view && LowiRoomsUI.view(), rows: document.querySelectorAll('.rk-row').length, open: document.querySelectorAll('[data-rk]').length, txt: ((document.querySelector('.rk-wrap,#rkPane,[class*=rk-]')||{}).textContent||'').slice(0,200), cls: [...new Set([...document.querySelectorAll('[class*="rk-"]')].map(e=>String(e.className.baseVal||e.className).split(' ')[0]))].slice(0,30).join(','), vis: [...document.querySelectorAll('.rk-row')].slice(0, 5).map(b => { const q = b.getBoundingClientRect(); return b.className + '@' + Math.round(q.top); }) })))); continue; }
    await L.tap(h, row.x, row.y); await P.waitForSelector('.rk-cmp-wrap.in .rk-pf', { timeout: 8000 }).catch(() => {}); await L.sleep(900);
    const c = await L.center(h, '.rk-cmp-wrap .rk-pf'); if (!c) { console.log('no profile button'); continue; }
    const xpos = await P.evaluate(() => { const x = document.getElementById('whX'); if (!x) return null; const q = x.getBoundingClientRect(); return { l: Math.round(q.left), t: Math.round(q.top), w: Math.round(q.width), h: Math.round(q.height) }; });
    await P.evaluate(() => { window.__ck.length = 0; });
    const t = Date.now(); await L.tap(h, c.x, c.y); const w = gap - (Date.now() - t); if (w > 0) await L.sleep(w); await L.tap(h, c.x, c.y);
    const took = Date.now() - t; await L.sleep(1800);
    const st = await P.evaluate(() => { const top = window.LowiR2 && LowiR2.top && LowiR2.top(); const open = !!(top && top.isConnected && !top.classList.contains('off'));
      const xb = document.getElementById('whX'); return { sheets: document.querySelectorAll('.r2-ov:not(.off), .r2-sheet:not(.off)').length, profileOpen: open, top: top ? (top.className + '').slice(0, 60) : '', whXon: document.documentElement.classList.contains('wh-x-on'), clicks: window.__ck.slice() }; });
    let closes = null; if (st.profileOpen) { const xc = await L.center(h, '#whX'); if (xc) { await L.tap(h, xc.x, xc.y); await L.sleep(900); closes = await P.evaluate(() => { const top = window.LowiR2 && LowiR2.top && LowiR2.top(); return !(top && top.isConnected && /r3-ov/.test(top.className) && !top.classList.contains('off')); }); } }
    st.xClosesLater = closes;
    const ok = st.profileOpen && st.sheets === 1 && closes !== false;
    if (!ok) bad++;
    console.log((ok ? 'PASS' : 'FAIL') + ' gap' + gap + ' (' + took + 'ms) pf@' + Math.round(c.x) + ',' + Math.round(c.y) + ' whX ' + JSON.stringify(xpos) + ' ' + JSON.stringify(st));
  }
  const s = await L.snap(h); console.log('errors', JSON.stringify({ err: s.err, rej: s.rej, pe: h.log.pageerror }), bad ? 'RESULT FAIL ' + bad : 'RESULT PASS');
  await h.browser.close(); if (srv) srv.close(); process.exit(0);
})();
