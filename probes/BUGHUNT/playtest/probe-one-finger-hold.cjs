/* Run 25 regression guard: ONE finger held still on Misty (Home) must still open her card; one finger on Scan must still open every
   bloom; a quick one-finger tap on Misty must not open the card. node probe-one-finger-hold.cjs [url] */
'use strict';
const L = require('./lib.cjs');
(async () => {
  const url = process.argv[2] || 'https://therealetm.github.io/lowispike/';
  const h = await L.open({ view: 'chromium390', url, settle: 8000 }); const { page } = h; const cdp = await h.ctx.newCDPSession(page);
  const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i, radiusX: 4, radiusY: 4, force: 1 })) });
  await page.evaluate(() => { window.__ho = 0; const H = window.LowiMistyHub; const o = H.open; H.open = function () { window.__ho++; return o.apply(this, arguments); }; });
  const pos = sel => page.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel);
  const reset = async () => { for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape'); await L.sleep(200); } await page.evaluate(() => { try { LowiHomeBloomsV2.close(); } catch (e) {} try { LowiMistyHub.close && LowiMistyHub.close(); } catch (e) {} }); await L.sleep(1500); };
  const out = {};
  const m = await pos('#spBubble');
  await T('touchStart', [m]); await L.sleep(900); await T('touchEnd', []); await L.sleep(900);
  out.holdMisty = await page.evaluate(() => window.__ho); await reset();
  await page.evaluate(() => { window.__ho = 0; });
  await T('touchStart', [m]); await L.sleep(90); await T('touchEnd', []); await L.sleep(900);
  out.tapMisty = await page.evaluate(() => window.__ho); await reset();
  const s = await pos('#whHud [data-orbit="scan"]');
  await T('touchStart', [s]); await L.sleep(800); await T('touchEnd', []); await L.sleep(900);
  out.holdScanAll = await page.evaluate(() => { const B = window.LowiHomeBloomsV2, R = window.LowiBloomRing; try { return !!((B && B.isAll && B.isAll()) || (R && R.state && R.state().all)); } catch (e) { return 'err ' + e; } });
  console.log(JSON.stringify(out), (out.holdMisty >= 1 && out.tapMisty === 0 && out.holdScanAll === true) ? 'PASS' : 'CHECK');
  console.log('pageerrors', JSON.stringify(h.log ? h.log.pageerror.slice(0, 5) : []));
  await h.browser.close();
})().catch(e => { console.error(String(e).slice(0, 300)); process.exit(2); });
