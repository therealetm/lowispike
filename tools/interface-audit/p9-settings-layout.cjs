'use strict';
/* P9: the Settings panel's layout on several phone/tablet sizes: how many rows a person can see and tap without scrolling,
   whether the footer (version + Close) sits over the list, and whether the list scrolls. */
const L = require('./lib.cjs');
(async () => {
  for (const dev of (process.argv[2] || 'iPhone SE,iPhone 13,iPhone 15 Pro Max,iPad Mini').split(',')) {
    const h = await L.launch({ device: dev });
    const { page } = h; await L.openApp(h, { settle: 2500 });
    await L.tap(page, '[data-orbit="settings"]'); await L.sleep(1600);
    const r = await page.evaluate(() => {
      const R = e => { if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
      const pg = document.querySelector('.ss2-page'), foot = document.querySelector('.ss2-page-foot');
      const sc = pg ? [pg, ...pg.querySelectorAll('*')].find(e => e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY)) : null;
      const rows = pg ? [...pg.querySelectorAll('.ss2-row')] : [];
      const ft = foot ? foot.getBoundingClientRect().top : innerHeight;
      const clip = sc ? sc.getBoundingClientRect() : null;
      const full = rows.filter(e => { const b = e.getBoundingClientRect(); return b.top >= (clip ? clip.top : 0) - 1 && b.bottom <= Math.min(ft, clip ? clip.bottom : innerHeight) + 1; }).map(e => e.innerText.trim());
      return { vp: innerWidth + 'x' + innerHeight, panel: R(pg), foot: R(foot), scroller: sc ? (sc.className.split(' ')[0] + ' ' + JSON.stringify(R(sc)) + ' scrollH=' + sc.scrollHeight + ' clientH=' + sc.clientHeight) : 'none', footOverScroller: !!(clip && foot && ft < clip.bottom - 2), rowsTotal: rows.length, fullyVisible: full, fade: sc ? getComputedStyle(sc).maskImage || getComputedStyle(sc).webkitMaskImage : '' };
    });
    console.log(dev + ' ' + JSON.stringify(r));
    await L.shot(page, 'p9-settings-' + dev.replace(/\W+/g, '_'));
    if (h.errors.length) console.log('errors', JSON.stringify(h.errors));
    await h.browser.close();
  }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
