'use strict';
/* What does Home look like, what does each bubble open, is the tab bar visible, and does back keep Home? (exploration probe) */
const L = require('../interface-audit/lib.cjs');
(async () => {
  const h = await L.launch({ device: process.argv[2] || 'iPhone 13' });
  const p = h.page;
  await p.addInitScript(() => { window.__loadId = Math.random(); });
  await L.openApp(h);
  const info = await p.evaluate(() => {
    const vis = e => { if (!e) return false; const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 4 && r.height > 4; };
    const tb = document.getElementById('tabbar');
    const bubbles = [...document.querySelectorAll('[data-hb]')].map(b => ({ hb: b.dataset.hb, id: b.id, cls: String(b.className).slice(0, 80), ad: b.dataset.o8Adapter || '', vis: vis(b), txt: (b.innerText || '').replace(/\s+/g, ' ').slice(0, 40) }));
    return { html: document.documentElement.className.slice(0, 400), tab: (document.querySelector('.tab.active') || {}).id, tbVis: vis(tb), tbRect: tb && tb.getBoundingClientRect().toJSON(), bubbles, load: window.__loadId };
  });
  console.log(JSON.stringify(info, null, 1));
  for (const t of ['shelf', 'foryou', 'move', 'profile']) {
    await p.evaluate(t => window.goTab(t), t); await L.sleep(1500);
    const r = await p.evaluate(() => { const tb = document.getElementById('tabbar'); const s = getComputedStyle(tb); const r = tb.getBoundingClientRect(); return { tab: (document.querySelector('.tab.active') || {}).id, tb: s.display + '/' + s.visibility + '/' + s.opacity, r: [r.top, r.height, r.width].map(Math.round), html: document.documentElement.className.match(/\b(o8\S*|wh-\S+|away\S*)/g) }; });
    console.log(t, JSON.stringify(r));
  }
  await h.browser.close();
})();
