'use strict';
/* Bug hunt 24 Oct 21:02: after My Recipe Book > Explore recipes, which layer does back's Escape go to, and does it close
   All recipes? node tools/hunt-book-escape-2102.cjs <device> [url|root] [lang] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'Pixel 7', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html', lang = process.argv[4] || 'en';
  const o = { device, engine: 'webkit', members: 6, messages: 6, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page;
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
  await R.goto(); await H.sleep(5000);
  await P.evaluate(() => { try { goTab('shelf'); } catch (e) { } }); await H.sleep(1500);
  const info = (w) => P.evaluate((w) => { const t = LowiBackSwipe.topLayer(); const d = e => e ? (e.id || String(e.className).slice(0, 40)) + ' parent=' + (e.parentElement ? String(e.parentElement.className).slice(0, 50) : '') + ' z=' + getComputedStyle(e).zIndex : null; return { w, top: d(t), modals: [...document.querySelectorAll('[aria-modal="true"], dialog[open]')].map(e => { const r = e.getBoundingClientRect(); return d(e) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' ovz=' + (e.closest('.r2-ov') ? getComputedStyle(e.closest('.r2-ov')).zIndex : '-'); }), on: [...document.querySelectorAll('.r2-ov.on')].map(e => String(e.className)), r2open: LowiR2.openCount ? LowiR2.openCount() : null, g2c: JSON.stringify(LowiG2C.state()).slice(0, 120), html: document.documentElement.className.slice(0, 200) }; }, w);
  const book = P.locator('#tab-shelf button, #tab-shelf [role=button], #tab-shelf [data-ck]').filter({ hasText: /My Recipe Book|Mein Rezeptbuch|Mi recetario/ }).first();
  await book.evaluate(e => e.scrollIntoView({ block: 'center' })); await H.sleep(500); await R.tapEl(book); await H.sleep(2500);
  console.log(JSON.stringify(await info('book')));
  const ex = P.locator('.r2-ov.on').last().locator('[data-mybook="browse"], button').filter({ hasText: /Browse recipes|Rezepte entdecken|Explorar recetas/ }).first();
  await R.tapEl(ex); await H.sleep(3000);
  console.log(JSON.stringify(await info('explore')));
  await P.evaluate(() => LowiBackSwipe.escape()); await H.sleep(2500);
  console.log(JSON.stringify(await info('after back-escape')));
  await P.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))); await H.sleep(2500);
  console.log(JSON.stringify(await info('after doc escape')));
  console.log('errs', JSON.stringify(R.errs));
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
