'use strict';
/* P11: each lower Settings row, scrolled into the list's visible window and tapped by finger once the panel has settled.
   Records where the finger landed (which element), then the active tab / layers at 0.4 s, 1.5 s and 3 s. */
const L = require('./lib.cjs');
const ROWS = (process.argv[2] || 'workouts,map,vr,gift,weather,worldSound').split(',');
(async () => {
  const h = await L.launch({ device: 'iPhone 13' });
  const { page } = h; await L.openApp(h, { settle: 2500 });
  const state = () => page.evaluate(() => { const vis = e => { if (!e) return false; const s = getComputedStyle(e), r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > .05 && r.width > 20 && r.height > 20; }; const over = [...document.querySelectorAll('body > div, body > section, body > aside')].filter(e => { const z = +getComputedStyle(e).zIndex || 0; return z > 100 && vis(e); }).map(e => (e.id || String(e.className).split(' ')[0]) + ' z' + getComputedStyle(e).zIndex); return { tab: (document.querySelector('.tab.active') || {}).id, html: [...document.documentElement.classList].filter(c => !/^(g1-home|wh-on|o8|wh-world-live)$/.test(c)).join(' '), over: over.slice(0, 6) }; });
  for (const id of ROWS) {
    await page.evaluate(() => goTab('home')); await L.sleep(1500);
    await L.tap(page, '[data-orbit="settings"]'); await L.sleep(1800);
    const pos = await page.evaluate(id => { const b = document.querySelector('.ss2-page [data-ss2="' + id + '"]'); if (!b) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const t = document.elementFromPoint(x, y); return { x, y, hit: t === b || b.contains(t) ? 'row' : (t ? t.tagName + '.' + String(t.className).split(' ')[0] : 'none') }; }, id);
    if (!pos) { console.log(id, 'ROW NOT PRESENT'); continue; }
    await L.sleep(500);
    await page.touchscreen.tap(pos.x, pos.y);
    const seq = [];
    for (const w of [400, 1100, 1500]) { await L.sleep(w); seq.push(await state()); }
    await L.shot(page, 'p11-' + id);
    console.log(id, JSON.stringify({ tapHit: pos.hit, seq }));
    for (let k = 0; k < 3; k++) { await page.keyboard.press('Escape'); await L.sleep(300); }
  }
  console.log('errors', JSON.stringify(h.errors));
  await h.browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
