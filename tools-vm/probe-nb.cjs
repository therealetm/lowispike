'use strict';
/* probe: does "nb.dataset" throw? args: url mode(plain|rmdialog) */
const pw = require('/tmp/pw/node_modules/playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const url = process.argv[2], mode = process.argv[3] || 'plain';
  const browser = await pw.webkit.launch();
  const ctx = await browser.newContext(Object.assign({}, pw.devices['iPhone 13'], { serviceWorkers: 'block' }));
  const host = new URL(url).host;
  await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
  await ctx.addInitScript(() => { try {
    const t = new Date(); localStorage.setItem('lowi.daily.seen', t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'));
    sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowi.tutorial.done', '1');
    localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-000000000001', email: 'fixture@example.com' } }));
    if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], saved: [] }));
    localStorage.setItem('lowispike.lang', 'en');
  } catch (e) { } });
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push((e.message || '') + ' @ ' + String(e.stack || '').split('\n').slice(0, 3).join(' | ')));
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 90000 });
  await sleep(3000);
  const before = await page.evaluate(() => ({ whToday: !!document.getElementById('whToday'), next: !!document.querySelector('#spHome .sp-next'), dialogs: [...document.querySelectorAll('.r2-ov,.g2-ov,.tut-ov,[role=dialog]')].map(n => n.id || String(n.className).slice(0, 30)) }));
  if (mode === 'rmdialog') await page.evaluate(() => { document.querySelectorAll('.r2-ov,.g2-ov,.tut-ov,[role=dialog]').forEach(n => { try { n.remove(); } catch (e) { } }); });
  await page.evaluate(() => goTab('shelf')); await sleep(2000);
  await page.evaluate(() => goTab('home')); await sleep(2500);
  await page.setViewportSize({ width: 391, height: 844 }); await sleep(800);
  await page.evaluate(() => { window.dispatchEvent(new Event('resize')); document.dispatchEvent(new Event('visibilitychange')); }); await sleep(1500);
  const after = await page.evaluate(() => ({ whToday: !!document.getElementById('whToday'), next: !!document.querySelector('#spHome .sp-next'), build: (document.documentElement.dataset.build || window.LOWI_BUILD || '') }));
  console.log(JSON.stringify({ url, mode, before, after, errs: [...new Set(errs)].slice(0, 6), nerr: errs.length }, null, 1));
  await browser.close();
})().catch(e => { console.error('PROBE FAIL', e); process.exit(1); });
