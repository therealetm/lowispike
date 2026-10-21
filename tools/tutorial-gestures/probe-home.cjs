'use strict';
/* Gesture audit probe (21 Oct 2026, tutorial covers every gesture): on a simulated iPhone 13, tap and hold every Home ring control
   and Misty, and record what each one opens. Uses the interface-audit harness (local files, no network writes). */
const L = require('../interface-audit/lib.cjs');
const SEL = {
  community: '[data-orbit="settings"]', water: '[data-orbit="water"]', move: '[data-orbit="move"]', scan: '[data-orbit="scan"]',
  joy: '#whPad', sleep: '[data-orbit="sleep"]', gap: '[data-orbit="gap"]', fuel: '[data-orbit="fuel"]', misty: '#spBubble'
};
async function center(page, sel) { return page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; }, sel); }
async function state(page) { const t = await L.top(page); return { tab: t.tab, layers: t.layers.map(l => (l.id || l.cls || l.tag).slice(0, 40)).join(' | '), cls: t.cls.slice(0, 140) }; }
async function reset(page) { await page.keyboard.press('Escape').catch(() => { }); await L.sleep(400); await page.keyboard.press('Escape').catch(() => { }); await page.evaluate(() => { try { if (window.LowiHomeBloomsV2) LowiHomeBloomsV2.close(); } catch (e) { } try { goTab('home'); } catch (e) { } }); await L.sleep(1200); }
(async () => {
  const h = await L.launch({ device: 'iPhone 13' });
  const { page } = h; await L.openApp(h, { settle: 4000 });
  console.log('home', JSON.stringify(await state(page)));
  for (const [k, sel] of Object.entries(SEL)) {
    for (const how of ['tap', 'hold']) {
      const c = await center(page, sel); if (!c) { console.log(k, how, 'MISSING'); continue; }
      await page.mouse.move(c.x, c.y); await page.mouse.down(); await L.sleep(how === 'hold' ? 900 : 60); await page.mouse.up(); await L.sleep(1300);
      console.log(k, how, JSON.stringify(await state(page)));
      await reset(page);
    }
  }
  console.log('errors', JSON.stringify(h.errors));
  await h.browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
