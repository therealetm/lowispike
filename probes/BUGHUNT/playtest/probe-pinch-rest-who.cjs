/* Run 25: who opens Misty's hub during a resting-finger pinch (stack of LowiMistyHub.open + lowi:misty-open dispatch). */
'use strict';
const L = require('./lib.cjs');
(async () => {
  const url = process.argv[2] || 'https://therealetm.github.io/lowispike/';
  const h = await L.open({ view: 'chromium390', url, settle: 8000 }); const { page } = h; const cdp = await h.ctx.newCDPSession(page);
  const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i, radiusX: 4, radiusY: 4, force: 1 })) });
  await page.evaluate(() => { window.__w = []; const st = () => (new Error().stack || '').split('\n').slice(2, 9).map(s => s.trim().replace(/https?:\/\/[^/]+\/lowispike\//, '')).join(' | ');
    const H = window.LowiMistyHub; const o = H.open; H.open = function () { window.__w.push('hub.open ' + st()); return o.apply(this, arguments); };
    const d = window.dispatchEvent; window.dispatchEvent = function (ev) { if (ev && ev.type === 'lowi:misty-open') window.__w.push('misty-open ' + st()); return d.apply(this, arguments); };
    ['pointerdown', 'pointermove', 'pointercancel', 'pointerup'].forEach(n => document.addEventListener(n, e => (n !== 'pointermove' || (window.__pm = (window.__pm || 0) + 1) % 3 === 1) && window.__w.push(n + ' id' + e.pointerId + ' prim' + e.isPrimary + ' ' + (e.target.id || String(e.target.className).slice(0, 30)) + ' @' + (e.clientX | 0) + ',' + (e.clientY | 0)), true)); });
  const x = +(process.env.X || 324), y = +(process.env.Y || 388), bx = +(process.env.BX || 154), by = +(process.env.BY || 428), sgn = Math.sign(x - bx);
  await T('touchStart', [[x, y], [bx, by]]);
  for (let i = 1; i <= 24; i++) { await T('touchMove', [[x, y], [bx - sgn * i * 3 * -1, by]]); await L.sleep(50); }
  await T('touchEnd', []); await L.sleep(1300);
  console.log((await page.evaluate(() => window.__w)).join('\n'));
  await h.browser.close();
})().catch(e => { console.error(String(e).slice(0, 300)); process.exit(2); });
