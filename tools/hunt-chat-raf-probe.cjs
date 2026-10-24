'use strict';
/* Bug hunt probe (item 29, live site): with the crash probe injected, read frame loops (rAF per second by script), live
   timers, listeners, nodes and canvases on Home, on Community, with the galaxy chat open by finger, and after 6 chat
   leave/return cycles. A loop that keeps running behind the chat or grows per cycle shows here.
   node tools/hunt-chat-raf-probe.cjs <device> [url|root] [lang] [theme] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html', lang = process.argv[4] || 'en', theme = process.argv[5] || 'dark';
  const o = { device, engine: 'webkit', members: 20, messages: 60, probe: true, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page;
  await R.ctx.addInitScript(([t, l]) => { try { localStorage.setItem('lowi.theme', t); localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [theme, lang]);
  await R.goto(); await H.sleep(6000);
  const log = (k, v) => console.log('STEP', k, typeof v === 'string' ? v : JSON.stringify(v));
  const snap = async (k) => { await P.evaluate(() => window.__cs && window.__cs.snap()); await H.sleep(4000); const s = await P.evaluate(() => { const s = window.__cs.snap(); return { raf: s.raf, rafBy: s.rafBy, iv: s.iv, to: s.to, lis: s.lis, nodes: s.nodes, canv: s.canv, canvMB: s.canvMB, ctxGL: s.ctxGL, ctxAll: s.ctxAll }; }); log(k, s); return s; };
  log('build', await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content));
  await snap('HOME');
  await P.evaluate(() => goTab('foryou')); await H.sleep(1500);
  await R.tap('#cmPaneChat .rm-tab[data-rm="room"]').catch(() => { }); await H.sleep(2000);
  await snap('COMMUNITY-ROOM');
  await R.tap('#cmPaneChat .rm-tab[data-rm="chat"]'); await H.sleep(2500);
  await snap('CHAT-OPEN');
  for (let i = 0; i < 6; i++) {
    await R.tap('#cmPaneChat .rm-tab[data-rm="room"]').catch(() => { }); await H.sleep(1200);
    await R.tap('#cmPaneChat .rm-tab[data-rm="chat"]').catch(() => { }); await H.sleep(1200);
  }
  await H.sleep(1500); await snap('CHAT-AFTER-6');
  await R.tap('#cmPaneChat .rm-tab[data-rm="room"]').catch(() => { }); await H.sleep(2000); await snap('ROOM-AGAIN');
  for (let i = 0; i < 4; i++) { await P.evaluate(() => { try { history.back(); } catch (e) { } }); await H.sleep(800); }
  await P.evaluate(() => goTab('home')).catch(() => { }); await H.sleep(2500);
  await snap('HOME-AFTER');
  log('errs', R.errs); log('crashed', R.crashed);
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
