/* dump the visible buttons in Community (Circle tab), top 200 px and bottom nav, plus the Billiard page composer/chat buttons */
'use strict';
const H = require('../regress/harness.cjs');
const sleep = H.sleep;
(async () => {
  const R = await H.open({ engine: process.argv[2] || 'chromium', device: 'iPhone 13', probe: false });
  const p = R.page;
  try {
    await R.goto(); await p.evaluate(() => window.goTab && goTab('foryou')); await sleep(2500);
    const dump = () => p.evaluate(() => [...document.querySelectorAll('button,[role=button],a[href],input,textarea')].filter(b => { const r = b.getBoundingClientRect(), s = getComputedStyle(b); return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight && s.visibility !== 'hidden' && +s.opacity > 0.05; }).map(b => { const r = b.getBoundingClientRect(); return [b.tagName.toLowerCase() + (b.id ? '#' + b.id : '') + '.' + String(b.className).split(' ').slice(0, 2).join('.'), (b.getAttribute('aria-label') || b.placeholder || b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40), Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)].join(' | '); }));
    console.log('--- Circle tab'); (await dump()).forEach(l => console.log(l));
    console.log('--- html classes', await p.evaluate(() => document.documentElement.className));
    console.log('--- circle games', await p.evaluate(() => { const g = document.querySelector('.csp,[class*="csp-"]'); return g ? g.className + ' ' + g.textContent.replace(/\s+/g, ' ').slice(0, 200) : 'none'; }));
  } catch (e) { console.log('error', e.stack); }
  await R.close(); process.exit(0);
})();
