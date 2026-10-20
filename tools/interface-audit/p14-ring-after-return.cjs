'use strict';
/* P14: after Settings > Workouts and the tab bar's "Today" back to Home: are the Home bubbles there, and when do they come back?
   Compares with a direct goTab('move') -> Today round trip that never touched Settings. */
const L = require('./lib.cjs');
const MODE = process.argv[2] || 'settings';
(async () => {
  const h = await L.launch({ device: 'iPhone 13' });
  const { page } = h; await L.openApp(h, { settle: 2500 });
  const snap = () => page.evaluate(() => { const bs = [...document.querySelectorAll('[data-orbit]')]; const shown = bs.filter(b => { const r = b.getBoundingClientRect(), s = getComputedStyle(b); return r.width > 10 && +s.opacity > .1 && s.pointerEvents !== 'none'; }).map(b => b.getAttribute('data-orbit')); const ring = document.querySelector('.o8-ring,.o8-orbit,#o8Ring,[class*="o8-ring"]'); const tb = document.getElementById('tabbar'); return { bubbles: bs.length, shown: shown.join(','), tab: (document.querySelector('.tab.active') || {}).id, html: document.documentElement.className.split(' ').filter(c => /o8|wh-|tb|home|away|ss2|lb/.test(c)).join(' '), tabbar: tb ? getComputedStyle(tb).display + '/' + Math.round(tb.getBoundingClientRect().height) : 'none', ring: ring ? ring.className + ' ' + getComputedStyle(ring).opacity : 'none' }; });
  console.log('start', JSON.stringify(await snap()));
  if (MODE === 'settings') {
    await L.tap(page, '[data-orbit="settings"]');
    await page.waitForSelector('.ss2-page [data-ss2="workouts"]', { timeout: 8000 }).catch(() => console.log('panel did not open in 8s'));
    await L.sleep(900);
    const pos = await page.evaluate(() => { const b = document.querySelector('.ss2-page [data-ss2="workouts"]'); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    await L.sleep(400); await page.touchscreen.tap(pos[0], pos[1]);
  } else if (MODE === 'scan') { await L.tap(page, '[data-orbit="scan"]'); }
  else { await page.evaluate(() => goTab('move')); }
  await page.waitForFunction(() => { const b = document.querySelector('#tabbar .tb[data-tab="home"]'); return b && b.getBoundingClientRect().height > 10; }, null, { timeout: 15000 }).catch(() => console.log('tab bar never showed'));
  await L.sleep(1200);
  console.log('away', JSON.stringify(await snap()));
  const ok = await L.tap(page, '#tabbar .tb[data-tab="home"]');
  console.log('tapped Today', ok);
  for (const w of [1000, 3000, 6000, 10000]) { await L.sleep(w); console.log('+' + w, JSON.stringify(await snap())); }
  await L.shot(page, 'p14-home-after-return-' + MODE);
  console.log('errors', JSON.stringify(h.errors));
  await h.browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
