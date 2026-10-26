'use strict';
const pw = require('/tmp/pw/node_modules/playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const url = process.argv[2], rm = process.argv[3] === 'rm';
  const browser = await pw.webkit.launch();
  const ctx = await browser.newContext(Object.assign({}, pw.devices['iPad (gen 7)'], { serviceWorkers: 'block' }));
  const host = new URL(url).host;
  await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
  await ctx.addInitScript(() => { try {
    const t = new Date(); localStorage.setItem('lowi.daily.seen', t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'));
    sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowi.tutorial.done', '1');
    localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-000000000001', email: 'fixture@example.com' } }));
    localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], saved: [] }));
    localStorage.setItem('lowi.cook.src', 'products'); localStorage.setItem('lowi.cook.view', 'shuffle'); localStorage.setItem('lowispike.lang', 'en');
  } catch (e) { } });
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 90000 });
  await sleep(3000);
  if (rm) await page.evaluate(() => document.querySelectorAll('.r2-ov,.g2-ov,.tut-ov,[role=dialog]').forEach(n => { try { n.remove(); } catch (e) { } }));
  await page.evaluate(() => goTab('shelf'));
  for (const t of [1000, 2500, 5000]) { await sleep(t === 1000 ? 1000 : t === 2500 ? 1500 : 2500);
    console.log(t, JSON.stringify(await page.evaluate(() => { const r = n => { const e = document.querySelector(n); if (!e) return null; const b = e.getBoundingClientRect(); return Math.round(b.left) + '..' + Math.round(b.right) + ' ' + getComputedStyle(e).transform.slice(0, 40); }; return { W: innerWidth, shelf: r('#tab-shelf'), shuf: r('#r5Shuf'), active: (document.querySelector('.tab.active,section.active') || {}).id, cls: document.documentElement.className.slice(0, 200) }; }))); }
  console.log('errs', JSON.stringify(errs));
  await browser.close();
})();
