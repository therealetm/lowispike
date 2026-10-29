'use strict';
/* Bug hunt 13:02: Gap > Last meal > Other time with the time picker (change on Android, blur on iPhone), then First meal > Now,
   then Last meal > Other time again while running (edit path), with times earlier/later. node tools/hunt-gap-other-1302.cjs <device> [lang] [url] */
const H = require('./sim/harness.cjs');
(async () => {
  const A = process.argv.slice(2), device = A[0] || 'iPhone 13', lang = A[1] || 'en';
  const url = A[2] || 'https://therealetm.github.io/lowispike/index.html';
  const R = await H.open({ device, engine: /Pixel/.test(device) ? 'chromium' : 'webkit', url, probe: false, lang, members: 5, messages: 5 });
  await R.ctx.addInitScript(([l]) => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [lang]);
  const P = R.page; const errs = []; P.on('pageerror', e => errs.push('page: ' + String(e.message).slice(0, 200)));
  P.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  await R.goto(); await H.sleep(6000);
  const st = async (label) => { const d = await P.evaluate(() => { const b = document.getElementById('hb2Bloom'); let g = null; try { g = { start: LowiFastStop.startOf() ? new Date(LowiFastStop.startOf()).toTimeString().slice(0, 5) : 0, last: LowiFastStop._st().last ? new Date(LowiFastStop._st().last).toTimeString().slice(0, 5) : 0, hist: (LowiFastStop._st().hist || []).map(h => new Date(h.s).toTimeString().slice(0, 5) + '-' + new Date(h.e).toTimeString().slice(0, 5)) }; } catch (e) { g = String(e); } return { on: !!(b && b.classList.contains('on')), txt: b ? (b.innerText || '').replace(/\s+/g, ' ').slice(0, 160) : '', g, toast: [...document.querySelectorAll('[class*=toast], [role=status], [aria-live]')].filter(e => e.getBoundingClientRect().height > 0 && e.innerText.trim()).map(e => e.innerText.replace(/\s+/g, ' ').slice(0, 140)) }; }); console.log('[' + label + ']', JSON.stringify(d)); return d; };
  const tapOrbit = async () => { const xy = await P.evaluate(() => { const e = document.querySelector('[data-orbit="gap"]'); const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); await P.touchscreen.tap(xy[0], xy[1]); await H.sleep(1300); };
  const tapItem = async (id) => { const xy = await P.evaluate(id => { const e = document.querySelector('#hb2Bloom [data-id="' + id + '"]'); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, id); if (!xy) { console.log('NO ITEM', id); return false; } await P.touchscreen.tap(xy[0], xy[1]); await H.sleep(1000); return true; };
  const pickTime = async (minsAgo) => { const v = await P.evaluate(m => { const d = new Date(Date.now() - m * 60000); return d.toTimeString().slice(0, 5); }, minsAgo); const ok = await P.evaluate(v => { const i = document.querySelector('#hb2Bloom .hb2-time'); if (!i) return false; i.focus(); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, v); i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); return true; }, v); await H.sleep(300); await P.evaluate(() => { const i = document.querySelector('#hb2Bloom .hb2-time'); if (i) i.blur(); }); await H.sleep(1200); console.log('picked', v, ok); };
  await tapOrbit(); await tapItem('g-last'); await tapItem('g-other'); await pickTime(180); await st('last 3h ago');
  await H.sleep(800); await tapOrbit(); await st('reopen');
  await tapItem('g-first'); await st('first pick'); await tapItem('g-t0'); await st('first now');
  await H.sleep(800); await tapOrbit(); await st('reopen2');
  await tapItem('g-last'); await tapItem('g-other'); await pickTime(60); await st('last 1h ago after stop');
  await H.sleep(800); await tapOrbit(); await st('reopen3');
  await tapItem('g-last'); await tapItem('g-other'); await pickTime(30); await st('edit last to 30 min ago while running');
  await H.sleep(800); await tapOrbit(); await st('reopen4');
  await tapItem('g-first'); await tapItem('g-other'); await pickTime(45); await st('first 45 min ago (before start) -> should refuse');
  await H.sleep(800); await tapOrbit(); await st('reopen5');
  await P.screenshot({ path: '/tmp/hfg13/gapother-' + device.replace(/\W/g, '') + '-' + lang + '.png' });
  console.log('errs', JSON.stringify(errs)); await R.close(); process.exit(0);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
