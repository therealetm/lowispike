'use strict';
/* Bug hunt 13:02: does the Weight & BMI sheet close with its close controls by a real tap? Lists every close-like control
   (top X, bottom round back button), taps each from a fresh open, reports whether #bsOv is gone after 1.5 s.
   node tools/hunt-weight-close-1302.cjs <device> [lang] [url] */
const H = require('./sim/harness.cjs');
(async () => {
  const A = process.argv.slice(2), device = A[0] || 'iPhone 13', lang = A[1] || 'en';
  const url = A[2] || 'https://therealetm.github.io/lowispike/index.html';
  const R = await H.open({ device, engine: /Pixel/.test(device) ? 'chromium' : 'webkit', url, probe: false, lang, members: 5, messages: 5 });
  const P = R.page; const errs = []; P.on('pageerror', e => errs.push('page: ' + String(e.message).slice(0, 200)));
  await R.goto(); await H.sleep(6000);
  const state = () => P.evaluate(() => { const o = document.getElementById('bsOv'); return o ? { there: true, cls: o.className, vis: getComputedStyle(o).visibility, op: getComputedStyle(o).opacity, h: Math.round(o.getBoundingClientRect().height) } : { there: false }; });
  const ctrls = async () => P.evaluate(() => [...document.querySelectorAll('button, [role=button]')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && /close|schlie|cerrar|zurück|back|atrás|volver|×|✕/i.test((e.getAttribute('aria-label') || '') + ' ' + (e.innerText || '') + ' ' + (e.getAttribute('data-bs') || '')); }).map(e => { const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { id: e.id, cls: String(e.className).slice(0, 40), ds: e.getAttribute('data-bs'), l: (e.getAttribute('aria-label') || e.innerText || '').slice(0, 25), xy: [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)], hit: t && (t === e || e.contains(t)) ? 'self' : (t ? (t.id || String(t.className)).slice(0, 40) : null), inOv: !!e.closest('#bsOv') }; }));
  await P.evaluate(() => LowiBodyStats.open()); await H.sleep(1200);
  const cs = await ctrls(); console.log('close controls', JSON.stringify(cs, null, 1));
  for (let i = 0; i < cs.length; i++) {
    if (i) { await P.evaluate(() => LowiBodyStats.open()); await H.sleep(1200); }
    const c = (await ctrls())[i]; if (!c) { console.log('gone', i); continue; }
    await P.touchscreen.tap(c.xy[0], c.xy[1]); await H.sleep(1500);
    console.log('tap', JSON.stringify(c), '->', JSON.stringify(await state()));
    await P.evaluate(() => { try { LowiBodyStats.close(); } catch (e) { } }); await H.sleep(400);
  }
  await P.evaluate(() => LowiBodyStats.open()); await H.sleep(1200); await P.keyboard.press('Escape'); await H.sleep(1200); console.log('escape ->', JSON.stringify(await state()));
  console.log('errs', JSON.stringify(errs)); await R.close(); process.exit(0);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
