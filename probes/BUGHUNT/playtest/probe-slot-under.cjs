/* Run 28: with Reduce Motion the Log meal slot sheet replaces the picker at rest in the same frame. What lands under each slot tile?
   RECENT=1 seeds three recent meals first (quick-log rows). Then a real double tap (DBL=1: mouse dblclick, or touch tap + tap the
   moment the next sheet exists) and reports whether a meal got logged / a scanner or camera opened.
   node probe-slot-under.cjs <url> [view] */
'use strict';
const L = require('./lib.cjs');
(async () => {
  const url = process.argv[2] || 'https://therealetm.github.io/lowispike/'; const view = process.argv[3] || 'chromium390';
  const h = await L.open({ url, view, reducedMotion: process.env.RM !== '0', settle: 7000 }); const P = h.page;
  await P.waitForFunction(() => window.LowiSpirit && window.LowiR2, null, { timeout: 60000 });
  await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); LowiR2.closeAll(); });
  const meals = () => P.evaluate(() => { const s = JSON.parse(localStorage.getItem('lowispike.v2') || '{}'); return (s.logs || []).filter(l => l.kind === 'meal' || l.t || l.macros).length + '/' + (s.ledger || []).length; });
  if (process.env.RECENT) { for (const t of ['Greek yogurt with berries', 'Chicken salad', 'Two boiled eggs']) {
      await P.evaluate(() => { LowiR2.closeAll(); window.LowiMealSlot = null; LowiSpirit.meal(); }); await P.waitForSelector('.sp-slot'); await P.click('.sp-slot'); await P.waitForSelector('#spMeal input[name=title]');
      await P.fill('#spMeal input[name=title]', t); await P.click('#spMeal button[type=submit]'); await L.sleep(2500); }
    console.log('seeded meals ' + await meals()); }
  await P.evaluate(() => { window.__clk = []; addEventListener('click', e => { if (!e.isTrusted) return; const c = e.target.closest('[data-sp],button,input,summary,a') || e.target; window.__clk.push((c.getAttribute('data-sp') || c.tagName) + ':' + (c.textContent || c.name || '').replace(/\s+/g, ' ').trim().slice(0, 24)); }, true); });
  await P.evaluate(() => { LowiR2.closeAll(); window.LowiMealSlot = null; LowiSpirit.meal(); }); await P.waitForSelector('.sp-slot'); const SL = await P.evaluate(() => [...document.querySelectorAll('.sp-slot')].map(e => e.dataset.slot)); console.log('slots ' + SL);
  for (const slot of SL) {
    await P.evaluate(() => { LowiR2.closeAll(); window.LowiMealSlot = null; }); await L.sleep(600);
    await P.evaluate(() => LowiSpirit.meal()); await P.waitForSelector('.sp-slots'); await L.sleep(1000);
    const c = await L.center(h, '.sp-slot-' + slot);
    await P.evaluate(([x, y]) => { window.__u = []; const mo = new MutationObserver(() => { const s = document.querySelector('.sp-slot-head'); if (!s) return; mo.disconnect(); const t0 = performance.now();
      for (const d of [0, 50, 120, 250]) setTimeout(() => { const e = document.elementFromPoint(x, y); const c = e && (e.closest('[data-sp],button,input,summary,a,label') || e); window.__u.push(Math.round(performance.now() - t0) + 'ms ' + (c ? (c.getAttribute('data-sp') || c.tagName) + ':' + (c.textContent || c.name || '').replace(/\s+/g, ' ').trim().slice(0, 24) : '-')); }, d); }); mo.observe(document.body, { childList: true, subtree: true }); }, [c.x, c.y]);
    await L.tap(h, c.x, c.y); await L.sleep(900);
    const under = await P.evaluate(() => window.__u);
    let dbl = null;
    if (process.env.DBL) { await P.evaluate(() => { LowiR2.closeAll(); window.LowiMealSlot = null; }); await L.sleep(600); await P.evaluate(() => LowiSpirit.meal()); await P.waitForSelector('.sp-slots'); await L.sleep(1000);
      const m0 = await meals(); await P.evaluate(() => { window.__clk = []; });
      if (h.touch) { await L.tap(h, c.x, c.y); await P.waitForSelector('.sp-slot-head', { timeout: 3000 }).catch(() => {}); if (process.env.SLOW) await L.sleep(+process.env.SLOW); await L.tap(h, c.x, c.y); } else await P.mouse.dblclick(c.x, c.y);
      await L.sleep(2500); const m1 = await meals();
      dbl = { clicks: await P.evaluate(() => window.__clk), mealsBefore: m0, mealsAfter: m1, sheet: await P.evaluate(() => { const o = [...document.querySelectorAll('.r2-ov')].pop(); return o ? o.innerText.replace(/\s+/g, ' ').slice(0, 70) : 'none'; }), scan: await P.evaluate(() => !!document.querySelector('.sc-ov.on,#scanSheet.on,video')) }; }
    console.log(JSON.stringify({ slot, at: [Math.round(c.x), Math.round(c.y)], under, dbl }));
  }
  const e = await L.snap(h); console.log('errors ' + JSON.stringify(e.err.concat(e.rej, h.log.pageerror)));
  await h.browser.close();
})();
