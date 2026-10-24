'use strict';
/* Bug hunt 24 Oct 11:02: Swap ingredients tile label per language, and after a live language switch. node tools/hunt-swap-tile-1102.cjs <device> <lang> [url|root] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'Pixel 7', lang = process.argv[3] || 'es', where = process.argv[4] || 'https://therealetm.github.io/lowispike/index.html';
  const o = { device, engine: 'webkit', members: 4, messages: 4, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page;
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
  await R.goto(); await H.sleep(5000);
  const look = () => P.evaluate(() => { const t = document.querySelector('[data-b-open="swap"]'); const g = document.getElementById('g2cTiles'); return { lang: window.LowiLang && LowiLang.get(), tiles: !!g, n: g ? g.children.length : 0, swap: t ? t.textContent : null, beta: !!window.LowiBeta, x: (document.querySelector('#bSheet .b-x') || {}).ariaLabel || null }; });
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { goTab('shelf'); } catch (e) { } }); await H.sleep(2500);
  console.log('cook', JSON.stringify(await look()));
  for (const l of ['de', 'en', lang]) { await P.evaluate(l => LowiLang.set(l), l); await H.sleep(1200); console.log('switch ' + l, JSON.stringify(await look())); }
  /* open the swap sheet with a real tap, then back */
  const loc = P.locator('[data-b-open="swap"]').first();
  if (await loc.count()) { await loc.evaluate(e => e.scrollIntoView({ block: 'center' })); await H.sleep(300); await R.tapEl(loc); await H.sleep(1500);
    console.log('sheet', JSON.stringify(await P.evaluate(() => { const o = document.getElementById('bSheet'); return o ? { on: o.classList.contains('on'), title: o.querySelector('header b').textContent, x: o.querySelector('.b-x').getAttribute('aria-label') } : null; })));
    await P.evaluate(() => history.back()); await H.sleep(1500);
    console.log('after back', JSON.stringify(await P.evaluate(() => { const o = document.getElementById('bSheet'); return { on: !!(o && o.classList.contains('on')), inApp: !!document.getElementById('whPad') }; })));
  }
  console.log('ERRS', JSON.stringify(R.errs.slice(0, 6)), 'crashed', R.crashed);
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
