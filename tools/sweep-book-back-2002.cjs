'use strict';
/* Code error sweep Oct 24 20:02, bug queue (b) from the 11:02 hunt: after back (Safari edge swipe / Android back = history.back)
   from My Recipe Book, is an r2 sheet left open? Boot, one touch (so the back guard exists), Cook tab, open My Recipe Book,
   back, then read open sheets, tab, url. Also: open a recipe from the book, back twice.
   node tools/sweep-book-back-2002.cjs <device> [lang] [url|root] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone 15', lang = process.argv[3] || 'de', url = process.argv[4] || 'https://therealetm.github.io/lowispike/index.html';
  const o = { device, engine: /Pixel/.test(device) ? 'chromium' : 'webkit', members: 10, messages: 20, probe: false, lang }; if (/^https?:/.test(url)) o.url = url; else o.root = url;
  const R = await H.open(o); const P = R.page;
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
  await R.goto(); await H.sleep(8000);
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); });
  await P.touchscreen.tap(8, 420).catch(() => { }); await H.sleep(800);
  const appUrl = P.url().split('?')[0];
  const st = () => P.evaluate(() => ({ r2: [...document.querySelectorAll('.r2-ov.on')].map(e => (e.querySelector('h1,h2,h3') || {}).textContent || e.id || e.className).map(s => String(s).trim().slice(0, 40)), tab: (document.querySelector('.tab.on,[data-tab].on,[aria-current=page]') || {}).textContent || null, url: location.pathname }));
  const out = { device, lang, build: await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content), runs: [] };
  for (let i = 0; i < 3; i++) {
    await P.evaluate(() => goTab('shelf')); await H.sleep(1500);
    await P.evaluate(() => LowiBook.open()); await H.sleep(1500);
    const opened = await st();
    await P.evaluate(() => history.back()); await H.sleep(2000);
    const after = await st();
    out.runs.push({ opened: opened.r2, after: after.r2, url: after.url, left: P.url().split('?')[0] !== appUrl });
  }
  out.errs = R.errs; out.crashed = R.crashed; out.loads = R.loads; console.log(JSON.stringify(out, null, 1)); await R.close().catch(() => { }); process.exit(0);
})().catch(e => { console.log('ERR', e && e.stack); process.exit(1); });
