'use strict';
/* P15: trace of the Home ring while coming back from Settings > Workouts via the tab bar: every 250 ms, is the ring on (o8),
   how big and where is Misty's bubble (the ring is fitted around it), and what does the ring's last layout say. */
const L = require('./lib.cjs');
(async () => {
  const h = await L.launch({ device: 'iPhone 13' });
  const { page } = h; await L.openApp(h, { settle: 2500 });
  await L.tap(page, '[data-orbit="settings"]');
  await page.waitForSelector('.ss2-page [data-ss2="workouts"]', { timeout: 8000 });
  await L.sleep(900);
  const pos = await page.evaluate(() => { const b = document.querySelector('.ss2-page [data-ss2="workouts"]'); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await L.sleep(400); await page.touchscreen.tap(pos[0], pos[1]);
  await page.waitForFunction(() => { const b = document.querySelector('#tabbar .tb[data-tab="home"]'); return b && b.getBoundingClientRect().height > 10; }, null, { timeout: 15000 });
  await L.sleep(1200);
  await L.tap(page, '#tabbar .tb[data-tab="home"]');
  const t0 = Date.now();
  for (let i = 0; i < 28; i++) {
    const s = await page.evaluate(() => { const H = document.documentElement, m = document.getElementById('spBubble'), r = m && m.getBoundingClientRect(); const c = window.LowiHomeOrbitV2 && LowiHomeOrbitV2.current(); return { o8: H.classList.contains('o8'), cls: [...H.classList].filter(c => /wh-|mf-|lw-|sp-/.test(c)).join(' '), misty: r ? Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) : 'none', mistyT: m ? getComputedStyle(m).transform.slice(0, 40) : '', last: c ? (c.ok + ' d' + Math.round(c.d || 0) + ' R' + Math.round(c.R || 0)) : 'none' }; });
    console.log('+' + (Date.now() - t0) + 'ms', JSON.stringify(s));
    await L.sleep(250);
  }
  await h.browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
