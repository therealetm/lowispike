'use strict';
/* P10: the tutorial replayed from Settings. Since 21 Oct 2026 a tap on the Home bubble (data-orbit="settings", now called
   Community) opens Community; Settings opens by HOLDING it, so this holds it (pointer down, 700 ms still, up). Walks every step with Next and records: the count line, whether the spotlight
   found its target (hole size), whether the card covers the spotlit target, and what Skip / Back do. (The progress dots were removed 21 Oct 2026; it now flags any that come back.) */
const L = require('./lib.cjs');
(async () => {
  const h = await L.launch({ device: process.argv[2] || 'iPhone 13' });
  const { page } = h; await L.openApp(h, { settle: 2500 });
  const b = await page.evaluate(() => { const e = document.querySelector('[data-orbit="settings"]'); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  if (!b) { console.log('FAIL no Community bubble on Home'); process.exit(1); }
  await page.mouse.move(b[0], b[1]); await page.mouse.down(); await L.sleep(700); await page.mouse.up(); await L.sleep(1300);
  if (!(await page.locator('.ss2-page [data-ss2="tutorial"]').count())) { console.log('FAIL holding Community did not open Settings with a Tutorial row'); process.exit(1); }
  await page.locator('.ss2-page [data-ss2="tutorial"]').scrollIntoViewIfNeeded().catch(() => { });
  await L.tap(page, '.ss2-page [data-ss2="tutorial"]'); await L.sleep(2500);
  const read = () => page.evaluate(() => {
    const t = document.getElementById('ltTour'); if (!t || getComputedStyle(t).display === 'none') return null;
    const R = e => { if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
    const hole = t.querySelector('.lt-hole'), card = t.querySelector('.lt-card'), dots = t.querySelector('.lt-dots');  /* should be null: no dots any more */
    const hb = hole.getBoundingClientRect(), cb = card.getBoundingClientRect();
    const overlap = hb.width > 4 && !(cb.right <= hb.left || cb.left >= hb.right || cb.bottom <= hb.top || cb.top >= hb.bottom);
    const ov = overlap ? Math.round((Math.min(cb.right, hb.right) - Math.max(cb.left, hb.left)) * (Math.min(cb.bottom, hb.bottom) - Math.max(cb.top, hb.top)) / Math.max(1, hb.width * hb.height) * 100) : 0;
    return { id: t.getAttribute('data-step'), count: (t.querySelector('.lt-count') || {}).innerText, title: (t.querySelector('.lt-title') || {}).innerText, text: ((t.querySelector('.lt-text') || {}).innerText || '').slice(0, 140), hole: R(hole), holeVisible: getComputedStyle(hole).opacity + '/' + getComputedStyle(hole).display, card: R(card), cardOffscreen: cb.top < 0 || cb.bottom > innerHeight + 1, cardCoversTargetPct: ov, dotsBack: !!dots, btns: [...t.querySelectorAll('button')].map(b => b.innerText.trim() + ' ' + Math.round(b.getBoundingClientRect().width) + 'x' + Math.round(b.getBoundingClientRect().height)).join(' | '), focus: document.activeElement && document.activeElement.closest('#ltTour') ? 'in-tour' : 'outside' };
  });
  const seen = [];
  for (let k = 0; k < 60; k++) {
    const s = await read(); if (!s) { console.log('tour closed after', k, 'steps'); break; }
    console.log(JSON.stringify(s)); seen.push(s.id);
    if (k === 2) { await page.locator('#ltTour [data-lt="back"]').click({ force: true }); await L.sleep(900); const b = await read(); console.log('BACK ->', b && b.id); await page.locator('#ltTour [data-lt="next"],#ltTour [data-lt="claim"]').first().click({ force: true }); await L.sleep(900); }
    const go = page.locator('#ltTour [data-lt="next"]'); if (!(await go.count())) { console.log('no Next on step', s.id, '(claim/other)'); const c = page.locator('#ltTour .lt-go'); await c.click({ force: true }).catch(() => { }); }
    else await go.click({ force: true });
    await L.sleep(1100);
    if (k === 6) await L.shot(page, 'p10-tutorial-step7');
  }
  console.log('steps seen', seen.length, JSON.stringify(seen));
  console.log('after tour', JSON.stringify(await L.top(page)));
  console.log('errors', JSON.stringify(h.errors));
  await h.browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
