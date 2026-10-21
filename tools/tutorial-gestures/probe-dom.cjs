'use strict';
/* Gesture audit probe: what is on screen in Community (each top tab) and in Scan, so tutorial steps can point at real controls. */
const L = require('../interface-audit/lib.cjs');
async function dump(page, label) {
  const out = await page.evaluate(() => {
    const vis = el => { const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight) return false; const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05; };
    const rows = [];
    for (const el of document.querySelectorAll('button,[role=button],[role=tab],input,textarea,iframe,canvas,#cgGalaxy,.ce-joy,[class*="rm-chip"],[class*="rm-room"]')) {
      if (!vis(el) || el.closest('#ltTour')) continue; const r = el.getBoundingClientRect();
      rows.push([el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''), (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || '').trim().slice(0, 30), Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)].join(' | '));
    }
    return rows;
  });
  console.log('=== ' + label + ' (' + out.length + ')'); out.slice(0, 60).forEach(r => console.log(r));
}
(async () => {
  const h = await L.launch({ device: 'iPhone 13' }); const { page } = h; await L.openApp(h, { settle: 4000 });
  await dump(page, 'home');
  await page.evaluate(() => goTab('foryou')); await L.sleep(3500); await dump(page, 'community');
  for (const t of ['chat', 'create', 'aff']) { await page.evaluate(t => { const b = document.querySelector('.rm-tab[data-rm="' + t + '"]'); if (b) b.click(); }, t); await L.sleep(2500); await dump(page, 'community ' + t); }
  await page.evaluate(() => { const b = document.querySelector('.rm-tab[data-rm="room"]'); if (b) b.click(); }); await L.sleep(800);
  await page.evaluate(() => goTab('scan')); await L.sleep(3000); await dump(page, 'scan');
  console.log('errors', JSON.stringify(h.errors).slice(0, 600));
  await h.browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
