'use strict';
/* Run 13 (BH-012): two real taps on a Log meal slot tile with the second one GAP ms after the first, via CDP (Chromium only).
   Reports where the second tap landed and what it did. node probe-slot-dbl-timed.cjs <url> <gap,gap,...> [touch] */
const L = require('./lib.cjs');
(async () => { const h = await L.open({ view: 'chromium390', url: process.argv[2], settle: 7000 }); const P = h.page; const cdp = await h.ctx.newCDPSession(P); const touch = process.argv[4] === 'touch'; let bad = 0;
 await P.evaluate(() => { window.__ev = []; const t0 = () => Math.round(performance.now());
   new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.classList && n.classList.contains('r2-ov')) window.__ev.push(['sheet', t0()]); }))).observe(document.body, { childList: true });
   window.addEventListener('click', e => window.__ev.push(['click', t0(), (e.target.closest && e.target.closest('[data-sp],summary,input,button,a') || e.target).getAttribute('data-sp') || (e.target.closest('summary,input,button,a') || e.target).tagName + '.' + String(e.target.className).slice(0, 20)]), true); });
 const tapAt = async (x, y) => { if (touch) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); } else { await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }); await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }); } };
 for (const gap of (process.argv[3] || '150,250').split(',').map(Number)) for (const slot of ['breakfast', 'lunch', 'dinner', 'snack']) {
  await P.evaluate(() => { window.LowiR2.closeAll(); document.activeElement && document.activeElement.blur && document.activeElement.blur(); }); await L.sleep(500);
  await P.evaluate(() => window.LowiSpirit.meal()); await P.waitForSelector('.sp-slots'); await L.sleep(900);
  await P.evaluate(() => window.__ev.length = 0);
  const c = await L.center(h, '.sp-slot-' + slot); const t = Date.now(); await tapAt(c.x, c.y); const w = gap - (Date.now() - t); if (w > 0) await L.sleep(w); await tapAt(c.x, c.y); await L.sleep(1200);
  const ev = await P.evaluate(() => window.__ev), sh = ev.filter(e => e[0] === 'sheet'), cl = ev.filter(e => e[0] === 'click');
  const st = await P.evaluate(() => ({ sheets: [...document.querySelectorAll('.r2-ov:not(.off)')].map(e => e.innerText.replace(/\s+/g, ' ').slice(0, 400)), focus: (document.activeElement || {}).name || document.activeElement.tagName, details: [...document.querySelectorAll('.r2-ov:not(.off) details[open]')].length }));
  const ok = st.sheets.length === 1 && /Change/.test(st.sheets[0]) && st.focus !== 'title' && !st.details;
  if (!ok) bad++;
  console.log((ok ? 'PASS ' : 'FAIL ') + 'gap' + gap + ' ' + slot, JSON.stringify({ clicks: cl.map(x => x[2]), msSheetToSecond: sh[0] && cl[1] ? cl[1][1] - sh[0][1] : null, sheetsMade: sh.length, open: st.sheets.map(s => s.slice(0, 60)), focus: st.focus, details: st.details }));
 }
 const s = await L.snap(h); console.log('errors', JSON.stringify({ err: s.err, rej: s.rej, pageerror: h.log.pageerror }), bad ? 'RESULT FAIL ' + bad : 'RESULT PASS');
 await h.browser.close(); process.exit(0); })();
