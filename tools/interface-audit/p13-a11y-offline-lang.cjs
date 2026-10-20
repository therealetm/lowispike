'use strict';
/* P13: (a) keyboard: where Tab goes on Home (does it reach controls hidden under the 3D world?); (b) the Home page in
   German: English left in Settings and Home labels; (c) going offline on Home: does anything tell the person? */
const L = require('./lib.cjs');
(async () => {
  const lang = process.argv[2] || 'de';
  const h = await L.launch({ device: 'iPhone 13', lang, locale: lang === 'de' ? 'de-DE' : 'es-ES' });
  const { page } = h; await L.openApp(h, { settle: 2500 });
  // (a) Tab order from the top of Home
  await page.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); });
  const order = [];
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    order.push(await page.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return 'body'; const r = e.getBoundingClientRect(); const t = document.elementFromPoint(Math.max(0, Math.min(innerWidth - 1, r.left + r.width / 2)), Math.max(0, Math.min(innerHeight - 1, r.top + r.height / 2))); const hidden = !(t === e || e.contains(t)) || r.bottom < 0 || r.top > innerHeight; return (e.getAttribute('aria-label') || e.innerText || e.id || e.className).toString().trim().replace(/\s+/g, ' ').slice(0, 40) + (hidden ? ' [NOT VISIBLE: ' + (t ? t.tagName.toLowerCase() + '.' + String(t.className).split(' ')[0] : 'off-screen') + ']' : ''); }));
  }
  console.log('TAB ORDER', JSON.stringify(order));
  // (b) English words left in German/Spanish Home + Settings
  const homeNames = (await L.controls(page)).filter(c => !c.covered).map(c => c.name);
  await L.tap(page, '[data-orbit="settings"]'); await L.sleep(1600);
  const setNames = await page.evaluate(() => [...document.querySelectorAll('.ss2-page button, .ss2-page h2, .ss2-page .ss2-gl, .ss2-page small')].map(e => (e.getAttribute('aria-label') || e.innerText || '').trim().replace(/\s+/g, ' ')).filter(Boolean));
  console.log('HOME NAMES', JSON.stringify(homeNames)); console.log('SETTINGS NAMES', JSON.stringify(setNames));
  await page.keyboard.press('Escape'); await L.sleep(600);
  // (c) offline
  await h.setOffline(true); await page.evaluate(() => window.dispatchEvent(new Event('offline'))); await L.sleep(3000);
  const off = await page.evaluate(() => { const vis = e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > .05 && r.width > 1 && r.height > 1 && r.bottom > 0 && r.top < innerHeight; }; return { online: navigator.onLine, banners: [...document.querySelectorAll('[role=status],[role=alert],.toast,[class*=offline],[class*=Offline]')].filter(vis).map(e => (e.className + ': ' + e.innerText).trim().replace(/\s+/g, ' ').slice(0, 120)), html: [...document.documentElement.classList].filter(c => /off/.test(c)) }; });
  console.log('OFFLINE', JSON.stringify(off));
  await L.shot(page, 'p13-offline-' + lang);
  // log water while offline: does it still count, does it say it will sync?
  await L.tap(page, '#whHud .wh-water'); await L.sleep(1500);
  console.log('OFFLINE water tap', JSON.stringify(await page.evaluate(() => { const b = document.querySelector('#whHud .wh-water'); return b && b.getAttribute('aria-label'); })), JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('[role=status],[role=alert],.toast')].map(e => e.innerText.trim()).filter(Boolean).slice(0, 4))));
  await h.setOffline(false); await page.evaluate(() => window.dispatchEvent(new Event('online'))); await L.sleep(2000);
  console.log('errors', JSON.stringify(h.errors));
  await h.browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
