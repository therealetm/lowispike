'use strict';
/* Bug hunt 2026-10-24 09:02: setup step 0 in DE/ES, the birthday error and the star sign line after several edits; are they still translated?
   node tools/hunt-ob-err-lang.cjs <device> <lang> [url] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone SE', lang = process.argv[3] || 'de', url = process.argv[4] || 'https://therealetm.github.io/lowispike/index.html';
  const R = await H.open({ engine: /Pixel/.test(device) ? 'chromium' : 'webkit', device, lang, fresh: true, url });
  const P = R.page;
  await P.addInitScript(lg => { try { localStorage.setItem('lowispike.lang', lg); } catch (e) { } }, lang).catch(() => { });
  await R.goto(); await H.sleep(7000);
  if (!(await P.$('#r2obB'))) { console.log('NO STEP0'); process.exit(2); }
  const rd = async (tag) => { await H.sleep(1500); const d = await P.evaluate(() => ({ err: (document.getElementById('r2obErr') || {}).textContent, sign: (document.getElementById('r2obSign') || {}).innerText })); console.log(tag, JSON.stringify(d).replace(/\\n/g, ' | ')); return d; };
  const next = async () => { await P.click('[data-r2o=next]'); };
  const nm = await P.$('#r2obName'); if (nm) await nm.fill('Zoë');
  const lastMonth = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  await P.fill('#r2obB', lastMonth); await next(); await rd('baby');
  await P.fill('#r2obB', '1900-02-01'); await next(); await rd('1900');
  await P.fill('#r2obB', '1910-03-01'); await next(); await rd('1910');
  await P.fill('#r2obB', '1992-02-29'); await rd('filled');
  await P.fill('#r2obT', '23:59'); await rd('time');
  await P.fill('#r2obB', '1990-07-10'); await rd('again');
  console.log('ERRS', R.errs.length);
  await R.close().catch(() => { }); process.exit(0);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
