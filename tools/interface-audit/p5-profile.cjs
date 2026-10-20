'use strict';
/* P5: Settings > Me / Look & sound / Account land on the Profile tab. What does a person see there, and how do they get back
   to Home when the menu bar is off (the default)? */
const L = require('./lib.cjs');
(async () => {
  const h = await L.launch({ device: process.argv[2] || 'iPhone 13', kv: process.argv[3] === 'menubar' ? { 'lowi.home.menubar': '1' } : {} });
  const { page } = h; await L.openApp(h, { settle: 3500 });
  for (const row of ['me', 'look', 'account']) {
    await page.evaluate(() => goTab('home')); await L.sleep(1200);
    await L.tap(page, '[data-orbit="settings"]'); await L.sleep(1300);
    await L.tap(page, '.ss2-page [data-ss2="' + row + '"]'); await L.sleep(2500);
    const s = await page.evaluate(() => {
      const vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 1 && r.height > 1 && r.bottom > 0 && r.top < innerHeight && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
      const hitOk = e => { const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; if (y < 0 || y > innerHeight) return false; const t = document.elementFromPoint(x, y); return t === e || e.contains(t); };
      const ctl = [...document.querySelectorAll('button,a[href],[role=button],input,select')].filter(vis).filter(hitOk).map(e => { const r = e.getBoundingClientRect(); return (e.getAttribute('aria-label') || e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + '@' + Math.round(r.left) + ',' + Math.round(r.top); });
      const heads = [...document.querySelectorAll('#tab-profile h1,#tab-profile h2,#tab-profile h3,#tab-profile .g2e-title')].filter(vis).map(e => e.innerText.trim().slice(0, 40));
      const G = window.LowiG2E && LowiG2E.state ? LowiG2E.state() : null;
      const tb = document.getElementById('tabbar'); const tbv = tb ? (vis(tb) ? 'tabbar visible' : 'tabbar hidden') : 'no tabbar';
      return { tab: (document.querySelector('.tab.active') || {}).id, g2e: G, heads, tbv, ctlCount: ctl.length, ctl: ctl.slice(0, 40), scrollY: scrollY, docH: document.scrollingElement.scrollHeight };
    });
    console.log('### ' + row + '\n' + JSON.stringify(s));
    await L.shot(page, 'p5-' + row + (process.argv[3] || ''));
    console.log('profile scroll', JSON.stringify(await page.evaluate(() => { const t = document.getElementById('tab-profile'); const sc = [t, ...t.querySelectorAll('*')].filter(e => e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY)).map(e => (e.id || e.className.split(' ')[0]) + ' top=' + Math.round(e.scrollTop) + ' h=' + e.scrollHeight); const cards = [...t.querySelectorAll('.card,section,[class*=card]')].filter(e => { const r = e.getBoundingClientRect(); return r.height > 30 && r.bottom > 0 && r.top < innerHeight; }).slice(0, 8).map(e => (e.querySelector('b,strong,h2,h3,.ttl,[class*=title]') || e).innerText.trim().split('\n')[0].slice(0, 50)); return { sc, cards, first: (t.querySelector('h1,h2,.pf-name,.g2e-name') || {}).innerText }; })));
  }
  console.log('errors', JSON.stringify(h.errors));
  await h.browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
