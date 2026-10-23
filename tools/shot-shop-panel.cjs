'use strict';
/* Oct 23 (Eman: "Wo ist der Seller Zone versteckt? Pack ihn mal auch in Shop."): screenshot of Fuel > Shop at a size.
   node tools/shot-shop-panel.cjs <w> <h> [url|root] [out.png] [lang] [tab shop|sz] */
const H = require('./sim/harness.cjs');
(async () => {
  const w = +process.argv[2] || 390, h = +process.argv[3] || 844, where = process.argv[4] || '.', out = process.argv[5] || '/tmp/shop.png', lang = process.argv[6] || 'de', tab = process.argv[7] || '';
  const o = { engine: process.env.ENG || 'chromium', members: 6, messages: 6, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page;
  await P.setViewportSize({ width: w, height: h });
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
  await R.goto(); await H.sleep(5000);
  await P.evaluate(() => { try { LowiStorePicks.open('home-bloom'); } catch (e) { } }); await H.sleep(1800);
  if (tab) { await R.tap('[data-stp-tab="' + tab + '"]').catch(() => { }); await H.sleep(900); }
  const info = await P.evaluate(() => { const c = document.querySelector('.stp-card'); return { build: (document.querySelector('meta[name="lowi-build"]') || {}).content, text: c ? c.innerText.replace(/\s+/g, ' ').slice(0, 600) : null }; });
  console.log(JSON.stringify(info));
  await R.shot(out);
  if (R.errs.length) console.log('ERRS', JSON.stringify(R.errs.slice(0, 5)));
  await R.close();
})().catch(e => { console.error(e); process.exit(1); });
