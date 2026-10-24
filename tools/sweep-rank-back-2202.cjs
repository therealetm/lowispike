'use strict';
/* Probe (sweep 2026-10-24 22:02): open Community by TAPPING the Community bubble (#whHud .o8-settings) like a user, tap a
   Community tab (default Ranking), then press back (Safari swipe back / Android back) up to 3 times. After each back, log
   which tab/view is showing, whether Community is still open and whether we are still in the app.
   node tools/sweep-rank-back-2202.cjs <device> [lang] [tab=rank] [url|root] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'Pixel 7', lang = process.argv[3] || 'en', tab = process.argv[4] || 'rank', url = process.argv[5] || 'https://therealetm.github.io/lowispike/index.html';
  const o = { device, engine: /Pixel/.test(device) ? 'chromium' : 'webkit', members: 10, messages: 20, probe: false, lang }; if (/^https?:/.test(url)) o.url = url; else o.root = url;
  const R = await H.open(o); const P = R.page; await R.goto(); await H.sleep(6000);
  const host = new URL(P.url()).host;
  const st = () => P.evaluate(() => { let tab = null, view = null; try { tab = LowiRoomsUI.tab(); view = LowiRoomsUI.view(); } catch (e) { } const act = document.querySelector('.tab.on,[data-tab].on'); return { cur: (window.S && S.tab) || (document.body.dataset.tab) || null, activeNav: act ? act.dataset.tab || act.id : null, rmTabs: !!(document.querySelector('.rm-tabs') && document.querySelector('.rm-tabs').getBoundingClientRect().width), tab, view, sheets: [...document.querySelectorAll('.r2-ov.on')].filter(e => e.getClientRects().length).map(e => e.id || String(e.className).slice(0, 30)), hist: history.length + ' ' + JSON.stringify(history.state).slice(0, 80) }; });
  const tap = async sel => { const p = await P.evaluate(s => { const b = [...document.querySelectorAll(s)].filter(e => e.getClientRects().length && !e.closest('.r2-ov.off')).pop(); if (!b) return null; const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel); if (!p) return false; await P.touchscreen.tap(p[0], p[1]); await H.sleep(2200); return true; };
  const out = { device, lang, tab, build: await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content), steps: [] };
  await P.touchscreen.tap(20, 300); await H.sleep(500);
  out.steps.push(['start', await st()]);
  out.steps.push(['tap community ' + await tap('#whHud .o8-settings'), await st()]);
  out.steps.push(['tap ' + tab + ' ' + await tap('.rm-tab[data-rm="' + tab + '"]'), await st()]);
  for (let i = 1; i <= 3; i++) {
    await P.goBack({ timeout: 4000 }).catch(() => { }); await H.sleep(2000);
    const inApp = new URL(P.url()).host === host && await P.evaluate(() => !!window.goTab).catch(() => false);
    out.steps.push(['back ' + i, inApp ? await st() : 'LEFT THE APP: ' + P.url()]);
    if (!inApp) break;
  }
  out.errs = R.errs; out.crashed = R.crashed; console.log(JSON.stringify(out, null, 1)); await R.close().catch(() => { }); process.exit(0);
})().catch(e => { console.log('ERR', e && e.stack); process.exit(1); });
