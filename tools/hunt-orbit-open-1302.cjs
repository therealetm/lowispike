'use strict';
/* Bug hunt 13:02: tap one Home bubble the way a finger does and report what opened (sheets, blooms, their buttons), then tap
   an optional bloom item. node tools/hunt-orbit-open-1302.cjs <device> <orbit> [bloomItemRegex] [lang] [url] */
const H = require('./sim/harness.cjs');
(async () => {
  const A = process.argv.slice(2), device = A[0] || 'iPhone 13', orbit = A[1] || 'gap', item = A[2] || '', lang = A[3] || 'en';
  const url = A[4] || 'https://therealetm.github.io/lowispike/index.html';
  const R = await H.open({ device, engine: /Pixel/.test(device) ? 'chromium' : 'webkit', url, probe: false, lang, members: 5, messages: 5 });
  await R.ctx.addInitScript(([l]) => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [lang]);
  const P = R.page; const errs = []; P.on('pageerror', e => errs.push(String(e.message).slice(0, 200)));
  P.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await R.goto(); await H.sleep(6000);
  const vis = () => P.evaluate(() => [...document.querySelectorAll('.r2-ov, [role=dialog], [id$="Ov"], #hb2Bloom, [class*="bloom"]')].filter(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; }).map(e => ({ id: e.id, cls: String(e.className).slice(0, 60), z: getComputedStyle(e).zIndex, btns: [...e.querySelectorAll('button,[role=button],[data-id]')].filter(b => b.getBoundingClientRect().width > 0).slice(0, 14).map(b => (b.getAttribute('data-id') ? '[' + b.getAttribute('data-id') + '] ' : '') + (b.getAttribute('aria-label') || b.innerText || '').replace(/\s+/g, ' ').slice(0, 30)), txt: (e.innerText || '').replace(/\s+/g, ' ').slice(0, 160) })));
  const tapXY = async (fn, arg) => { const sc = await P.evaluate(fn, arg); if (!sc) return false; await P.touchscreen.tap(sc[0], sc[1]); return sc; };
  const ok = await tapXY(k => { const e = document.querySelector('[data-orbit="' + k + '"]'); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, orbit);
  console.log('tapped orbit', orbit, ok);
  for (const ms of [500, 1500]) { await H.sleep(ms); console.log('+' + ms, JSON.stringify(await vis(), null, 1)); }
  if (item) {
    const t = await tapXY(src => { const rx = new RegExp(src, 'i'); const b = [...document.querySelectorAll('#hb2Bloom [data-id], #hb2Bloom button, .r2-ov.on button')].filter(e => e.getBoundingClientRect().width > 0 && rx.test((e.getAttribute('data-id') || '') + ' ' + (e.getAttribute('aria-label') || '') + ' ' + e.innerText)).shift(); if (!b) return null; const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, item);
    console.log('tapped item', item, t); await H.sleep(1800); console.log('after item', JSON.stringify(await vis(), null, 1));
  }
  await P.screenshot({ path: '/tmp/hfg13/orbit-' + orbit + '-' + device.replace(/\W/g, '') + '-' + lang + '.png' });
  console.log('errs', JSON.stringify(errs)); await R.close(); process.exit(0);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
