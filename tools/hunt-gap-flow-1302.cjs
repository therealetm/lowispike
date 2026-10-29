'use strict';
/* Bug hunt 13:02: the meal gap bloom as a user runs it: Last meal > Now, reopen (running), First meal > a time, reopen,
   Last meal > Other time (time orb), reload in the middle, quick double taps. Logs bloom text + items after each step.
   node tools/hunt-gap-flow-1302.cjs <device> [lang] [url] */
const H = require('./sim/harness.cjs');
(async () => {
  const A = process.argv.slice(2), device = A[0] || 'iPhone 13', lang = A[1] || 'en';
  const url = A[2] || 'https://therealetm.github.io/lowispike/index.html';
  const R = await H.open({ device, engine: /Pixel/.test(device) ? 'chromium' : 'webkit', url, probe: false, lang, members: 5, messages: 5 });
  await R.ctx.addInitScript(([l]) => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [lang]);
  const P = R.page; const errs = []; P.on('pageerror', e => errs.push('page: ' + String(e.message).slice(0, 200)));
  P.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  await R.goto(); await H.sleep(6000);
  const tag = device.replace(/\W/g, '') + '-' + lang; let n = 0;
  const bloom = async (label) => { const d = await P.evaluate(() => { const b = document.getElementById('hb2Bloom'); const vw = innerWidth, vh = innerHeight; return { on: !!(b && b.classList.contains('on')), txt: b ? (b.innerText || '').replace(/\s+/g, ' ').slice(0, 200) : '', items: b ? [...b.querySelectorAll('[data-id], input, button')].filter(e => e.getBoundingClientRect().width > 0).map(e => { const r = e.getBoundingClientRect(); const t = document.elementFromPoint(Math.min(vw - 1, Math.max(0, r.left + r.width / 2)), Math.min(vh - 1, Math.max(0, r.top + r.height / 2))); return (e.getAttribute('data-id') || e.tagName + (e.type ? ':' + e.type : '')) + '@' + Math.round(r.left) + ',' + Math.round(r.top) + 'x' + Math.round(r.width) + (r.left < 0 || r.top < 0 || r.right > vw || r.bottom > vh ? ' OFFSCREEN' : '') + (t && (t === e || e.contains(t)) ? '' : ' COVERED:' + (t ? (t.id || String(t.className)).slice(0, 30) : 'none')); }) : [], gap: (() => { try { return { start: LowiFastStop.startOf(), st: LowiFastStop._st && LowiFastStop._st() }; } catch (e) { return String(e); } })(), toast: [...document.querySelectorAll('[class*=toast]')].filter(e => e.getBoundingClientRect().height > 0).map(e => e.innerText.slice(0, 120)) }; }); console.log('[' + label + ']', JSON.stringify(d)); await P.screenshot({ path: '/tmp/hfg13/gapflow-' + tag + '-' + (n++) + '-' + label.replace(/\W/g, '') + '.png' }); return d; };
  const tapOrbit = async () => { const xy = await P.evaluate(() => { const e = document.querySelector('[data-orbit="gap"]'); const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); await P.touchscreen.tap(xy[0], xy[1]); await H.sleep(1300); };
  const tapItem = async (id) => { const xy = await P.evaluate(id => { const e = document.querySelector('#hb2Bloom [data-id="' + id + '"]'); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, id); if (!xy) { console.log('NO ITEM', id); return false; } await P.touchscreen.tap(xy[0], xy[1]); await H.sleep(1300); return true; };
  const close = async () => { await P.keyboard.press('Escape'); await H.sleep(900); };
  await tapOrbit(); await bloom('open');
  await tapItem('g-first'); await bloom('first-while-off');
  await tapItem('g-last'); await bloom('last-pick');
  await tapItem('g-t0'); await bloom('after-now');
  await close(); await tapOrbit(); await bloom('reopen-running');
  await tapItem('g-first'); await bloom('first-pick');
  const firstIds = await P.evaluate(() => [...document.querySelectorAll('#hb2Bloom [data-id^="g-t"]')].map(e => e.getAttribute('data-id')));
  console.log('first options', firstIds);
  if (firstIds.length) { await tapItem(firstIds[0]); await bloom('after-first'); }
  else { await tapItem('g-other'); await bloom('first-other'); }
  await close(); await tapOrbit(); await bloom('reopen-after-first');
  await tapItem('g-last'); await bloom('last-pick2');
  await tapItem('g-other'); await bloom('other-time');
  await P.reload(); await H.sleep(6000); await tapOrbit(); await bloom('after-reload');
  /* double taps */
  await tapItem('g-last'); await tapItem('g-t30').catch(() => { }); await bloom('last-30');
  await close(); await tapOrbit(); await bloom('reopen-3');
  console.log('errs', JSON.stringify(errs)); await R.close(); process.exit(0);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
