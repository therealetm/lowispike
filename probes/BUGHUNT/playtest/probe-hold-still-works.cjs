/* Run 24 (BH-023 check): one finger still works after the pinch fix: hold Move -> Move page, tap Water -> its panel, hold Fuel
   bloom path untouched. node probe-hold-still-works.cjs [url] */
'use strict';
const L = require('./lib.cjs');
(async () => {
  const url = process.argv[2] || 'https://therealetm.github.io/lowispike/';
  const h = await L.open({ view: 'chromium390', url, settle: 8000 }); const { page } = h; const cdp = await h.ctx.newCDPSession(page);
  const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i, radiusX: 4, radiusY: 4, force: 1 })) });
  const pos = k => page.evaluate(k => { const e = document.querySelector('[data-orbit="' + k + '"]'); const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, k);
  const st = () => page.evaluate(() => ({ tab: [...document.querySelectorAll('[id^="tab-"].active')].map(e => e.id).join(','), bloom: !!document.querySelector('#hb2Bloom.on'), sheet: !!document.querySelector('.r2-ov.on:not(.off)'), page: document.documentElement.classList.contains('rw-page') }));
  const home = async () => { for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape'); await L.sleep(250); } await page.evaluate(() => { try { LowiR2.closeAll(); } catch (e) {} window.goTab('home'); }); await L.sleep(1800); };
  let p = await pos('move'); await T('touchStart', [p]); await L.sleep(900); await T('touchEnd', []); await L.sleep(1200); console.log('hold move', JSON.stringify(await st()));
  await home(); p = await pos('water'); await T('touchStart', [p]); await L.sleep(60); await T('touchEnd', []); await L.sleep(1200); console.log('tap water', JSON.stringify(await st()));
  await home(); p = await pos('move'); await T('touchStart', [p]); await L.sleep(60); await T('touchEnd', []); await L.sleep(1200); console.log('tap move', JSON.stringify(await st()));
  await home(); p = await pos('fuel'); await T('touchStart', [p]); await L.sleep(900); await T('touchEnd', []); await L.sleep(1200); console.log('hold fuel', JSON.stringify(await st()));
  await h.browser.close();
})().catch(e => { console.error(String(e).slice(0, 300)); process.exit(2); });
