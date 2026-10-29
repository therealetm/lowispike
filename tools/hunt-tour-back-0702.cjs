'use strict';
/* Bug hunt 29 Oct 07:02: does a back-swipe (history.back) or Escape leave the tutorial card, on each card? node tools/hunt-tour-back-0702.cjs <engine> <device> <lang> <how:back|esc> <stepId> */
const H = require('./tutorial-short/harness.cjs');
const [eng = 'chromium', dev = 'Pixel 7', lang = 'en', how = 'back', at = 'hello'] = process.argv.slice(2);
const URL0 = process.env.URL || 'https://therealetm.github.io/lowispike/index.html';
(async () => {
  const br = await H.pw[eng].launch(); const { page } = await H.newPage(br, dev, lang);
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await H.boot(page, URL0);
  const st = () => page.evaluate(() => { const T = window.LowiTutorial, c = document.querySelector('#ltTour .lt-card'); const r = c && c.getBoundingClientRect(); return { on: T.isOn(), step: T.step(), held: T.held(), demo: T.demo().at, card: !!(r && r.height > 10 && getComputedStyle(c).opacity > 0.1), pill: !!(document.querySelector('#ltResume') && !document.querySelector('#ltResume').hidden), hist: history.length, bloom: !!document.querySelector('#hb2Bloom button') }; });
  await page.evaluate(a => { window.__clipMs = 60000; document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); window.LowiTutorial.start({ from: 'check', at: a }); }, at);
  for (const t of [600, 1500, 3000]) { await H.sleep(t); console.log('t', t, JSON.stringify(await st())); }
  if (how === 'back') await page.evaluate(() => history.back()); else await page.keyboard.press('Escape');
  for (const t of [500, 2000]) { await H.sleep(t); console.log('after ' + how, t, JSON.stringify(await st())); }
  console.log('errs', JSON.stringify(errs.slice(0, 3)), 'ids', await page.evaluate(() => window.LowiTutorial.ids().join(',')));
  await br.close();
})().catch(e => { console.log('FAIL', e.message); process.exit(1); });
