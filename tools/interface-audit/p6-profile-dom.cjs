'use strict';
/* P6: where do the Cycle / Chat privacy / Blood pressure / Tab bar cards live, and what is inside #tab-profile? */
const L = require('./lib.cjs');
(async () => {
  const h = await L.launch({ device: 'iPhone 13' });
  const { page } = h; await L.openApp(h, { settle: 3000 });
  const dump = () => page.evaluate(() => {
    const path = e => { const p = []; while (e && e !== document.body) { p.push(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ').slice(0, 2).join('.') : '')); e = e.parentElement; } return p.reverse().join(' > '); };
    const tp = document.getElementById('tab-profile');
    const kids = tp ? [...tp.children].map(c => { const cs = getComputedStyle(c), r = c.getBoundingClientRect(); return (c.id || c.className.split(' ').slice(0, 2).join('.')) + ' ' + cs.display + ' h' + Math.round(r.height) + ' y' + Math.round(r.top); }) : null;
    const tpcs = tp ? getComputedStyle(tp) : null;
    return { cy: path(document.getElementById('cyProf')), priv: path(document.querySelector('.nm-privbtn')), bp: path([...document.querySelectorAll('button.toggle')].find(b => /Blood/.test(b.getAttribute('aria-label') || '')) || null), tabProfile: tp ? { display: tpcs.display, vis: tpcs.visibility, op: tpcs.opacity, z: tpcs.zIndex, pos: tpcs.position, cls: tp.className, kidsN: tp.children.length, kids: kids.slice(0, 30) } : null, active: [...document.querySelectorAll('.tab')].map(t => t.id + ':' + getComputedStyle(t).display + (t.classList.contains('active') ? '*' : '')).join(' '), html: document.documentElement.className };
  });
  console.log('HOME', JSON.stringify(await dump()));
  await page.evaluate(() => goTab('profile')); await L.sleep(2500);
  console.log('PROFILE', JSON.stringify(await dump()));
  console.log('errors', JSON.stringify(h.errors));
  await h.browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
