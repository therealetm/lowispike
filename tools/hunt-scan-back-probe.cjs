'use strict';
/* Probe: fresh load, Scan > type a barcode > product result, then one back step (Android back / Safari swipe). The sheet must close and you stay in the app.
   node tools/hunt-scan-back-probe.cjs <device> [quickOpenCloseLoops] [url|root] */
const H = require('./sim/harness.cjs');
(async () => {
  const dev = process.argv[2]||'iPhone 13', loop = +process.argv[3]||0;
  const a4 = process.argv[4] || 'https://therealetm.github.io/lowispike/index.html'; const oo = { device: dev, engine: 'webkit', members: 10, messages: 20, probe: false, lang: 'en' }; if (/^http/.test(a4)) oo.url = a4; else oo.root = a4; const R = await H.open(oo); const P = R.page;
  await R.ctx.route(u => /(^|\.)openfoodfacts\.org$/.test(new URL(u).host), r => r.request().method() === 'GET' ? r.continue() : r.abort());
  await R.goto(); await H.sleep(5000);
  const vis = (w) => P.evaluate((w) => { const v = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > .05; }; const c = document.elementFromPoint(innerWidth/2, innerHeight/2); const sb = document.querySelector('[data-orbit="scan"]'); let sbHit = ''; if (sb) { const r = sb.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2); sbHit = t ? (t === sb || sb.contains(t) ? 'self' : String(t.className || t.tagName).slice(0, 40)) : 'none'; } return { w, b3: !!(document.getElementById('b3Cam') && v(document.getElementById('b3Cam'))), ov: [...document.querySelectorAll('.r2-ov.on')].filter(v).length, hit: c ? String(c.className).slice(0, 30) : '', sbHit, hl: history.length, st: JSON.stringify(history.state).slice(0, 80), url: location.href.slice(-12) }; }, w);
  const scanXY = () => P.evaluate(() => { const e = document.querySelector('[data-orbit="scan"]'); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  console.log(JSON.stringify(await vis('start')));
  for (let i = 0; i < loop; i++) { const sc = await scanXY(); await P.touchscreen.tap(sc[0], sc[1]); await H.sleep(250 + (i % 3) * 300); const closeB = P.locator('#b3Cam [aria-label="Close"], #b3Cam .b3-x, #whX').first(); if (await closeB.isVisible().catch(() => false)) await R.tapEl(closeB).catch(() => {}); else await P.keyboard.press('Escape'); await H.sleep(900); console.log(JSON.stringify(await vis('loop ' + i))); }
  const sc = await scanXY(); await P.touchscreen.tap(sc[0], sc[1]); await H.sleep(1800); console.log(JSON.stringify(await vis('scan open')));
  await P.locator('#b3Cam input').first().tap().catch(() => {}); await P.keyboard.type('5449000000996'); await P.keyboard.press('Enter'); await H.sleep(8000);
  console.log(JSON.stringify(await vis('result')));
  await P.evaluate(() => history.back()); await H.sleep(1800); console.log(JSON.stringify(await vis('after back 1')));
  if (/lowispike/.test(P.url())) { await P.evaluate(() => history.back()); await H.sleep(1800); console.log(JSON.stringify(await vis('after back 2'))); }
  console.log('final url', P.url(), 'errs', JSON.stringify(R.errs).slice(0, 800)); await R.close();
})().catch(e => { console.error('BROKEN', e.stack); process.exit(2); });
