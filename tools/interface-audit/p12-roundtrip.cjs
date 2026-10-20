'use strict';
/* P12: Settings > Workouts (or Community) and back: which controls lead back Home from there, use the first one like a person,
   then check that the Home ring and the Settings bubble work again. */
const L = require('./lib.cjs');
const ROW = process.argv[2] || 'workouts';
(async () => {
  const h = await L.launch({ device: 'iPhone 13' });
  const { page } = h; await L.openApp(h, { settle: 2500 });
  const ring = () => page.evaluate(() => { const b = document.querySelector('[data-orbit="settings"]'); if (!b) return 'no bubble'; const r = b.getBoundingClientRect(), s = getComputedStyle(b); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + ' op' + s.opacity + ' pe' + s.pointerEvents + ' vis' + s.visibility + ' hit=' + (t === b || b.contains(t) ? 'ok' : t ? t.tagName + '.' + String(t.className).split(' ')[0] + '#' + t.id : 'none') + ' tab=' + (document.querySelector('.tab.active') || {}).id; });
  console.log('rows at start', JSON.stringify(await page.evaluate(() => ({ zoom: !!document.querySelector('#whHud .wh-zoom'), vr: !!document.querySelector('#whHud .wh-vr'), gift: !!document.querySelector('.hs-gift') }))));
  await L.tap(page, '[data-orbit="settings"]'); await L.sleep(1800);
  const pos = await page.evaluate(id => { const b = document.querySelector('.ss2-page [data-ss2="' + id + '"]'); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, ROW);
  await L.sleep(400); await page.touchscreen.tap(pos[0], pos[1]); await L.sleep(3500);
  const exits = (await L.controls(page)).filter(c => !c.covered && /home|back|close|today|zur\u00fcck|schlie/i.test(c.name)).map(c => c.name + ' ' + c.w + 'x' + c.h + '@' + c.x + ',' + c.y + ' ' + c.tag + '.' + c.cls);
  console.log('on ' + ROW + ' exits:', JSON.stringify(exits));
  console.log('ring while away:', await ring());
  await L.shot(page, 'p12-' + ROW);
  const homeBtn = exits.find(e => /home|today/i.test(e)) || exits[0];
  if (homeBtn) { const m = homeBtn.match(/@(\d+),(\d+)/), wh = homeBtn.match(/ (\d+)x(\d+)@/); await page.touchscreen.tap(+m[1] + wh[1] / 2, +m[2] + wh[2] / 2); console.log('tapped', homeBtn); }
  for (const w of [800, 1500, 3000]) { await L.sleep(w); console.log('ring +' + w, await ring()); }
  const ok = await L.tap(page, '[data-orbit="settings"]'); await L.sleep(1800);
  console.log('settings reopened:', ok, JSON.stringify(await page.evaluate(() => ({ panel: !!document.querySelector('.ss2-page'), rows: [...document.querySelectorAll('.ss2-page [data-ss2]')].map(e => e.getAttribute('data-ss2')), zoom: !!document.querySelector('#whHud .wh-zoom'), vr: !!document.querySelector('#whHud .wh-vr'), gift: !!document.querySelector('.hs-gift'), hud: !!document.getElementById('whHud') }))));
  console.log('errors', JSON.stringify(h.errors));
  await h.browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
