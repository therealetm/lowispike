/* Run 33: for each Home bloom, which orb rests on top of a ring bubble / Misty? After the bloom is closed, what does
   elementFromPoint give at each orb's centre (what a 2nd tap of a double tap would hit once the bloom folds)?
   node probe-orb-under.cjs <url|dir> [view]   env RM=1 */
'use strict';
const L = require('./lib.cjs');
(async () => {
  let url = process.argv[2] || 'https://therealetm.github.io/lowispike/', srv = null; if (!/^https?:/.test(url)) { srv = await L.serve(url); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const view = process.argv[3] || 'chromium390';
  const h = await L.open({ url, view, reducedMotion: !!process.env.RM, lang: 'en', preInit: "try{localStorage.setItem('lowi.tutorial.done','1')}catch(e){}" });
  const P = h.page;
  await P.waitForFunction(() => document.getElementById('whPad') && document.querySelectorAll('[data-orbit]').length >= 8 && window.LowiHomeBloomsV2, null, { timeout: 120000 }).catch(() => {});
  await L.sleep(5000);
  await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); try { LowiR2.closeAll(); } catch (e) {} });
  for (const k of ['fuel', 'water', 'move', 'sleep']) {
    await P.evaluate(() => { try { LowiHomeBloomsV2.close(true); } catch (e) {} }); await L.sleep(500);
    const ok = await P.evaluate(k => LowiHomeBloomsV2.open(k), k); await L.sleep(1200);
    const orbs = await P.evaluate(() => [...document.querySelectorAll('.hb2-bloom.on [data-hb2=act]')].map(e => { const r = e.getBoundingClientRect(); return { id: e.dataset.id, keep: !!((document.querySelector('.hb2-bloom.on').__acts || []).find(a => a.id === e.dataset.id) || {}).keep, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; }));
    await P.evaluate(() => { try { LowiHomeBloomsV2.close(true); } catch (e) {} }); await L.sleep(400);
    const res = await P.evaluate(orbs => orbs.map(o => { const e = document.elementFromPoint(o.x, o.y); const c = e && e.closest('[data-orbit],[data-home-misty],#spBubble,button,[role=button],canvas'); return o.id + (o.keep ? '(keep)' : '') + ' @' + o.x + ',' + o.y + ' -> ' + (c ? (c.dataset.orbit ? 'BUBBLE ' + c.dataset.orbit : c.hasAttribute('data-home-misty') || c.id === 'spBubble' ? 'MISTY' : c.tagName.toLowerCase() + (c.id ? '#' + c.id : '') + '.' + (typeof c.className === 'string' ? c.className.split(' ')[0] : '')) : (e ? e.tagName + '#' + e.id : '-')); }), orbs);
    console.log(k + ' open=' + ok + '\n  ' + res.join('\n  '));
  }
  await h.browser.close(); if (srv) srv.close(); process.exit(0);
})();
