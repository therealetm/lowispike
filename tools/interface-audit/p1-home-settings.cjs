'use strict';
/* P1: existing user on Home. Inventory of Home controls; open Settings by tapping its bubble; inventory of the panel;
   then tap each Settings row once (fresh return to Home between rows) and record what opened, whether Escape closes it,
   where focus goes, and whether anything is left covering Home. */
const L = require('./lib.cjs');
const out = { steps: [] };
const log = (k, v) => { out.steps.push({ k, v }); console.log('## ' + k + '\n' + JSON.stringify(v, null, 0).slice(0, 3000)); };
(async () => {
  const h = await L.launch({ device: process.argv[2] || 'iPhone 13' });
  const { page } = h;
  await L.openApp(h);
  log('home-top', await L.top(page));
  const homeCtl = await L.controls(page);
  log('home-controls', homeCtl.map(c => [c.name || '(NO NAME)', c.tag + (c.id ? '#' + c.id : '') + '.' + c.cls, c.w + 'x' + c.h, c.covered ? 'COVERED by ' + c.coveredBy : '']));
  await L.shot(page, 'p1-home');
  // Settings bubble
  if (!await L.tap(page, '[data-orbit="settings"]')) log('settings-tap-fail', 'no bubble');
  await L.sleep(1500);
  log('settings-top', await L.top(page));
  const rows = await L.controls(page, '.ss2-page');
  log('settings-controls', rows.map(c => [c.name || '(NO NAME)', c.tag + '.' + c.cls, c.w + 'x' + c.h, c.y, c.covered ? 'COVERED by ' + c.coveredBy : '']));
  const rowIds = await page.evaluate(() => [...document.querySelectorAll('.ss2-page [data-id],.ss2-page [data-ss2]')].map(e => e.getAttribute('data-id') || e.getAttribute('data-ss2')));
  log('row-ids', rowIds);
  await L.shot(page, 'p1-settings');
  // keyboard: Tab cycles inside panel?
  const tabs = [];
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Tab'); tabs.push((await L.top(page)).focus); }
  log('settings-tab-order', tabs);
  await page.keyboard.press('Escape'); await L.sleep(700);
  log('after-escape', await L.top(page));
  // each row
  for (const id of rowIds) {
    if (!id || id === 'close') continue;
    await page.evaluate(() => { try { goTab('home'); } catch (e) { } }); await L.sleep(1200);
    await L.tap(page, '[data-orbit="settings"]');
    await L.sleep(1200);
    const before = h.errors.length;
    const sel = '.ss2-page [data-id="' + id + '"],.ss2-page [data-ss2="' + id + '"]';
    await page.locator(sel).first().scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => { }); if (!await L.tap(page, sel)) log('row-click-fail ' + id, 'not visible');
    await L.sleep(2200);
    const t1 = await L.top(page);
    const ctl = await L.controls(page);
    t1.exits = ctl.filter(c => /close|back|done|cancel|\u00d7|^x$|later|not now/i.test(c.name)).map(c => c.name + ' ' + c.w + 'x' + c.h + '@' + c.x + ',' + c.y + (c.covered ? ' COVERED' : ''));
    t1.unnamed = ctl.filter(c => !c.name && !c.covered).map(c => c.tag + '.' + c.cls + ' ' + c.w + 'x' + c.h);
    t1.small = ctl.filter(c => !c.covered && c.name && (c.w < 32 || c.h < 32)).map(c => c.name + ' ' + c.w + 'x' + c.h);
    await L.shot(page, 'p1-row-' + id);
    await page.keyboard.press('Escape'); await L.sleep(900);
    const t2 = await L.top(page);
    for (let k = 0; k < 3 && (await L.top(page)).layers.length; k++) { await page.keyboard.press('Escape'); await L.sleep(500); }
    log('row ' + id, { opened: t1, afterEscape: t2, newErrors: h.errors.slice(before) });
  }
  log('errors', h.errors); log('console', h.consoleErr.slice(0, 20)); log('blocked', h.blocked);
  require('fs').writeFileSync('/home/sprite/ia-shots/p1-' + (process.argv[2] || 'iPhone 13').replace(/\W+/g, '_') + '.json', JSON.stringify(out, null, 1));
  await h.browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
