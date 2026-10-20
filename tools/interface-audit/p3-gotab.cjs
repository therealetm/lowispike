'use strict';
/* P3: what happens to the Home ring when Home is asked to show again while it is already showing (goTab('home') on Home,
   which Back buttons and the menu bar's Home do). */
const L = require('./lib.cjs');
(async () => {
  const h = await L.launch({ device: process.argv[2] || 'iPhone 13' });
  const { page } = h; await L.openApp(h);
  const info = () => page.evaluate(() => [...document.querySelectorAll('[data-orbit]')].map(e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return [e.getAttribute('data-orbit'), Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height), cs.display, cs.visibility, cs.opacity, cs.pointerEvents, hit === e || e.contains(hit) ? 'hit-ok' : 'hit:' + (hit ? hit.tagName + '.' + String(hit.className).split(' ')[0] + '#' + hit.id : 'none'), e.className.split(' ').slice(0, 3).join('.'), e.closest('[hidden],[aria-hidden=true]') ? 'IN-HIDDEN' : '']; }));
  const T = page.evaluate.bind(page);
  console.log('before', JSON.stringify(await info()));
  console.log('classes', await T(() => document.documentElement.className));
  await T(() => goTab('home')); await L.sleep(400);
  console.log('0.4s', JSON.stringify(await info()));
  await L.sleep(3000);
  console.log('3.4s', JSON.stringify(await info()));
  console.log('classes', await T(() => document.documentElement.className));
  console.log('tab-home', await T(() => { const t = document.getElementById('tab-home'); return t ? t.className + ' ' + getComputedStyle(t).display : 'none'; }));
  await L.shot(page, 'p3-after-gotab-home');
  // does a real tap on Misty / scan work after?
  console.log('errors', JSON.stringify(h.errors));
  await h.browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
