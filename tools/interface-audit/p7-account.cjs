'use strict';
/* P7: Settings > Account. Every control on the Account screen: visible? covered by what? Then Back, Close profile. */
const L = require('./lib.cjs');
(async () => {
  const h = await L.launch({ device: process.argv[2] || 'iPhone 13' });
  const { page } = h; await L.openApp(h, { settle: 3000 });
  await L.tap(page, '[data-orbit="settings"]'); await L.sleep(1300);
  await L.tap(page, '.ss2-page [data-ss2="account"]');
  for (const wait of [1500, 4000]) {
    await L.sleep(wait);
    const s = await page.evaluate(() => {
      const tp = document.getElementById('tab-profile');
      const all = [...tp.querySelectorAll('button,a[href],input,select,[role=button]')].map(e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); let hit = ''; if (r.width > 1 && r.height > 1) { const t = document.elementFromPoint(Math.max(0, Math.min(innerWidth - 1, r.left + r.width / 2)), Math.max(0, Math.min(innerHeight - 1, r.top + r.height / 2))); hit = !t ? 'none' : (t === e || e.contains(t)) ? 'ok' : t.tagName.toLowerCase() + '#' + t.id + '.' + String(t.className).split(' ')[0]; } return { n: (e.getAttribute('aria-label') || e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40), box: Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height), disp: cs.display, vis: cs.visibility, hit }; }).filter(x => x.box.indexOf(' 0x0') < 0);
      const head = document.getElementById('g2eHead'); const hcs = head ? getComputedStyle(head) : null;
      const txt = (tp.innerText || '').replace(/\s+/g, ' ').slice(0, 600);
      return { open: document.documentElement.getAttribute('data-g2e-k'), head: head ? hcs.display + ' ' + JSON.stringify(head.getBoundingClientRect()) : 'none', scrollTop: tp.scrollTop, scrollH: tp.scrollHeight, all: all.slice(0, 40), txt };
    });
    console.log('### account +' + wait + '\n' + JSON.stringify(s));
  }
  await L.shot(page, 'p7-account');
  console.log('errors', JSON.stringify(h.errors)); console.log('blocked', JSON.stringify(h.blocked));
  await h.browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
