'use strict';
/* P8: Profile > Settings tile: what it holds, and what "Reset demo data" does to a signed-in person's phone.
   Every request is blocked; this only records which writes the app TRIES to make after the reset. */
const L = require('./lib.cjs');
(async () => {
  const h = await L.launch({ device: 'iPhone 13', state: { logs: [{ id: 'l1', t: Date.now() - 3600e3, kind: 'meal', name: 'Fixture oats' }], setupDone: true } });
  const { page } = h; const writes = [];
  page.on('request', r => { const u = new URL(r.url()); if (u.host.endsWith('supabase.co') && r.method() !== 'GET') writes.push(r.method() + ' ' + u.pathname + ' ' + String(r.postData() || '').slice(0, 160)); });
  page.on('dialog', async d => { console.log('DIALOG', d.type(), JSON.stringify(d.message())); await d.accept(); });
  await L.openApp(h, { settle: 3000 });
  await page.evaluate(() => goTab('profile')); await L.sleep(2000);
  await page.evaluate(() => LowiG2E.open('app')); await L.sleep(1500);
  const s = await page.evaluate(() => { const tp = document.getElementById('tab-profile'); return [...tp.querySelectorAll('button,input,select,a[href]')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && getComputedStyle(e).visibility !== 'hidden'; }).map(e => { const r = e.getBoundingClientRect(); return (e.getAttribute('aria-label') || e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 50) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + '@' + Math.round(r.top); }); });
  console.log('APP TILE', JSON.stringify(s));
  console.log('APP TEXT', JSON.stringify(await page.evaluate(() => document.getElementById('tab-profile').innerText.replace(/\s+/g, ' ').slice(0, 900))));
  await L.shot(page, 'p8-app-tile');
  const before = writes.length;
  await page.locator('[data-act="reset"]').first().scrollIntoViewIfNeeded().catch(() => { });
  await page.locator('[data-act="reset"]').first().click({ force: true }).catch(e => console.log('reset click', e.message.slice(0, 100)));
  await L.sleep(12000);
  const after = await page.evaluate(() => ({ html: [...document.documentElement.classList].filter(c => /gate|home|ob/.test(c)).join(' '), keys: Object.keys(localStorage).sort(), r2ob: !!document.querySelector('#r2ob'), text: (document.querySelector('.r2-ov,.r2-start,#r2ob,[aria-modal=true]') || document.body).innerText.replace(/\s+/g, ' ').slice(0, 300) }));
  console.log('AFTER RESET', JSON.stringify(after));
  console.log('WRITES TRIED AFTER RESET', JSON.stringify(writes.slice(before)));
  await L.shot(page, 'p8-after-reset');
  console.log('errors', JSON.stringify(h.errors));
  await h.browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
