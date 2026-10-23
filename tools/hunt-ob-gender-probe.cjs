'use strict';
/* Bug hunt Oct 23 19:03: setup step 'What do you want most?' - what happens to the page when a gender chip is tapped:
   does the whole pane fade/slide in again, is the next chip tappable, does the scroll stay. node tools/hunt-ob-gender-probe.cjs <device> [url] */
const H = require('./sim/harness.cjs');
const device = process.argv[2] || 'iPhone 13';
const URL0 = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html';
const engine = /Pixel/.test(device) ? 'chromium' : 'webkit';
(async () => {
  let R;
  try {
    R = await H.open({ engine, device, lang: 'en', fresh: true, url: URL0 });
    const P = R.page;
    await R.goto(); await H.sleep(6000);
    const nm = await P.$('#r2obName'); if (nm) await nm.fill('Zoë');
    await P.fill('#r2obB', '1990-08-01');
    await P.evaluate(() => document.querySelector('[data-r2o=next]').click());
    for (let k = 0; k < 30 && !(await P.$('[data-r2o=initial]')); k++) { await H.sleep(1000); if (k >= 5) await P.evaluate(() => { const b = [...document.querySelectorAll('#r2obRev button')].pop(); if (b) b.click(); }); }
    await P.evaluate(() => document.querySelector('[data-r2o=initial]').click()); await H.sleep(1200);
    const state = () => P.evaluate(() => { const pn = document.querySelector('#r2ob .r2-obpane'); const sc = pn && pn.parentNode; const m = document.querySelector('[data-r2g=m]'); const r = m.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { paneOpacity: getComputedStyle(pn).opacity, paneTransform: getComputedStyle(pn).transform, anims: pn.getAnimations().map(a => a.animationName + ':' + a.playState + '@' + Math.round(a.currentTime)), scrollTop: Math.round((pn.scrollTop || 0) + (sc ? sc.scrollTop : 0)), mTop: Math.round(r.top), mHitIsChip: !!(top && top.closest('[data-r2g=m]')), hit: top ? (top.className || top.tagName).toString().slice(0, 40) : null }; });
    console.log(device, 'before', JSON.stringify(await state()));
    /* scroll the pane down a bit like a person would, then tap A woman */
    await P.evaluate(() => { const pn = document.querySelector('#r2ob .r2-obpane'); pn.scrollTop = 60; if (pn.parentNode) pn.parentNode.scrollTop = 60; });
    await H.sleep(300);
    console.log(device, 'scrolled', JSON.stringify(await state()));
    await P.evaluate(() => document.querySelector('[data-r2g=f]').click());
    await H.sleep(40); console.log(device, '+40ms', JSON.stringify(await state()));
    await H.sleep(160); console.log(device, '+200ms', JSON.stringify(await state()));
    await H.sleep(600); console.log(device, '+800ms', JSON.stringify(await state()));
    const t0 = Date.now(); let ok = true; try { await P.click('[data-r2g=m]', { timeout: 6000 }); } catch (e) { ok = false; console.log(device, 'click m failed', e.message.split('\n').slice(0, 6).join(' | ')); }
    console.log(device, 'click m', ok, (Date.now() - t0) + 'ms', 'aria', await P.getAttribute('[data-r2g=m]', 'aria-pressed'));
    console.log(device, 'errs', JSON.stringify(R.errs));
  } catch (e) { console.log('BROKEN', e.message.split('\n')[0]); }
  if (R) await R.close();
  process.exit(0);
})();
