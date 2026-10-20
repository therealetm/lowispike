'use strict';
/* P2: open Settings, close it (Escape / close button / tap outside), and open it again. Records whether the second open works. */
const L = require('./lib.cjs');
(async () => {
  const h = await L.launch({ device: process.argv[2] || 'iPhone 13' });
  const { page } = h; await L.openApp(h);
  const st = async tag => { const t = await L.top(page); console.log(tag, JSON.stringify({ layers: t.layers.map(l => l.cls + ' ' + l.box.join(',')), cls: t.cls, focus: t.focus })); return t; };
  const bubble = page.locator('[data-orbit="settings"]').first();
  console.log('bubble count', await page.locator('[data-orbit="settings"]').count(), await bubble.evaluate(e => e.outerHTML.slice(0, 200)));
  for (const how of ['escape', 'x', 'outside', 'bubble-again']) {
    await bubble.click({ timeout: 8000 }).catch(e => console.log('open fail', how, e.message.slice(0, 160)));
    await L.sleep(1500); await st('open before ' + how);
    if (how === 'escape') await page.keyboard.press('Escape');
    if (how === 'x') await page.locator('.ss2-page-x').click({ timeout: 5000 }).catch(e => console.log('x fail', e.message.slice(0, 120)));
    if (how === 'outside') await page.mouse.click(195, 120);
    if (how === 'bubble-again') await bubble.click({ timeout: 5000, force: true }).catch(e => console.log('again fail', e.message.slice(0, 160)));
    await L.sleep(1500); await st('after ' + how);
  }
  // after goTab('home') while already home
  await page.evaluate(() => goTab('home')); await L.sleep(1200); await st('after goTab home');
  await bubble.click({ timeout: 8000 }).catch(e => console.log('open fail after goTab', e.message.slice(0, 300)));
  await L.sleep(1500); await st('open after goTab');
  console.log('errors', JSON.stringify(h.errors));
  await h.browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
