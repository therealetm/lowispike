'use strict';
/* Run 13 (BH-012): double click (trusted mouse events, fast) on each Log meal slot tile; reports ms from the new sheet to the second
   click and what the second click did. node probe-slot-dbl-mouse.cjs <view> <url> */
const L = require('./lib.cjs');
(async () => { const h = await L.open({ view: process.argv[2] || 'chromium390', url: process.argv[3], settle: 7000 }); const P = h.page; let bad = 0;
 await P.evaluate(() => { window.__ev = []; const t0 = () => Math.round(performance.now());
   new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.classList && n.classList.contains('r2-ov')) window.__ev.push(['sheet', t0()]); }))).observe(document.body, { childList: true });
   window.addEventListener('click', e => window.__ev.push(['click', t0(), (e.target.closest && e.target.closest('[data-sp],summary,input,button') || e.target).getAttribute('data-sp') || e.target.tagName]), true); });
 for (const slot of ['breakfast', 'lunch', 'dinner', 'snack']) {
  await P.evaluate(() => { window.LowiR2.closeAll(); document.activeElement && document.activeElement.blur && document.activeElement.blur(); }); await L.sleep(500);
  await P.evaluate(() => window.LowiSpirit.meal()); await P.waitForSelector('.sp-slots'); await L.sleep(900);
  await P.evaluate(() => window.__ev.length = 0);
  const c = await L.center(h, '.sp-slot-' + slot); await P.mouse.dblclick(c.x, c.y); await L.sleep(1000);
  const ev = await P.evaluate(() => window.__ev), sh = ev.find(e => e[0] === 'sheet'), c2 = ev.filter(e => e[0] === 'click')[1];
  const st = await P.evaluate(() => ({ sheets: [...document.querySelectorAll('.r2-ov:not(.off)')].map(e => e.innerText.replace(/\s+/g, ' ').slice(0, 400)), focus: (document.activeElement || {}).name || document.activeElement.tagName, details: [...document.querySelectorAll('.r2-ov:not(.off) details[open]')].length }));
  const ok = st.sheets.length === 1 && /Change/.test(st.sheets[0]) && st.focus !== 'title' && !st.details;
  if (!ok) bad++;
  console.log((ok ? 'PASS ' : 'FAIL ') + slot, JSON.stringify({ msSheetToSecondClick: sh && c2 ? c2[1] - sh[1] : null, second: c2 && c2[2], st }));
 }
 const s = await L.snap(h); console.log('errors', JSON.stringify({ err: s.err, rej: s.rej, pageerror: h.log.pageerror }), bad ? 'RESULT FAIL' : 'RESULT PASS');
 await h.browser.close(); process.exit(0); })();
