'use strict';
/* Bug hunt probe (live site): in de/es, does LowiLang.t know the Recipe Book names, and what does For You's recipe chip show?
   node tools/hunt-recname-lang-1902.cjs [lang] [url|root] */
const H = require('./sim/harness.cjs');
(async () => {
  const lang = process.argv[2] || 'de', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html';
  const o = { device: 'Pixel 7', engine: 'chromium', members: 10, messages: 20, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page;
  await R.ctx.addInitScript(([l]) => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [lang]);
  await R.goto(); await H.sleep(5000);
  const log = (k, v) => console.log('STEP', k, typeof v === 'string' ? v : JSON.stringify(v));
  log('build', await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content));
  log('dict', await P.evaluate(() => { const b = (typeof RECIPE_BOOK !== 'undefined' ? RECIPE_BOOK : []); const miss = b.filter(r => r && r.n && LowiLang.t(r.n) === r.n).map(r => r.n); return { book: b.length, translated: b.length - miss.length, missSample: miss.slice(0, 8) }; }));
  await P.evaluate(() => goTab('foryou')); await H.sleep(900);
  await R.tap('#cmPaneChat .rm-tab[data-rm="fy"]'); await H.sleep(1800);
  log('chips', await P.evaluate(() => [...document.querySelectorAll('.fyv-rec')].map(b => b.textContent.trim())));
  log('errs', R.errs);
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
