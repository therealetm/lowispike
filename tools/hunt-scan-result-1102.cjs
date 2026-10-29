'use strict';
/* Bug hunt 29 Oct 11:02: real barcode result in the Scan sheet. Tap Warum?, then check Als gegessen eintragen / In den Wagen are
   tappable (not covered) after scrolling them into view, then tap Log as eaten. Records errors and screenshots.
   node tools/hunt-scan-result-1102.cjs <device> [url] [outdir] [lang] [code] */
const H = require('./sim/harness.cjs'), fs = require('fs'), path = require('path');
(async () => {
  const device = process.argv[2] || 'iPhone SE', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html';
  const out = process.argv[4] || '/tmp/hunt-sr', lang = process.argv[5] || 'de', code = process.argv[6] || '3017620422003';
  fs.mkdirSync(out, { recursive: true });
  const o = { device, engine: 'webkit', members: 10, messages: 20, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = device.replace(/\W/g, '') + '-' + lang;
  await R.ctx.addInitScript(([l]) => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [lang]);
  await R.goto(); await H.sleep(5000);
  const build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || null);
  const sc = await P.evaluate(() => { const e = document.querySelector('[data-orbit="scan"]'); const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await P.touchscreen.tap(sc[0], sc[1]); await H.sleep(2000);
  const inp = P.locator('#b3Cam input').first(); await inp.tap().catch(() => { }); await P.keyboard.type(code, { delay: 30 }); await P.keyboard.press('Enter'); await H.sleep(9000);
  const snap = (lbl) => P.evaluate((lbl) => { const s = document.getElementById('b3Cam'); const t = (s.innerText || '').replace(/\s+/g, ' ').slice(0, 400); return { lbl, t }; }, lbl);
  console.log('RESULT', JSON.stringify(await snap('result')));
  await R.shot(path.join(out, tag + '-0-result.png'));
  const info = await P.evaluate(() => { const s = document.getElementById('b3Cam'); return [...s.querySelectorAll('button')].filter(b => b.getBoundingClientRect().height > 0).map(b => { const r = b.getBoundingClientRect(); return { l: (b.getAttribute('aria-label') || b.innerText).replace(/\s+/g, ' ').trim().slice(0, 40), top: Math.round(r.top), bot: Math.round(r.bottom), cls: String(b.className).slice(0, 40), par: String(b.parentElement.className).slice(0, 30) }; }); });
  console.log('BUTTONS', JSON.stringify(info), 'vh', await P.evaluate(() => innerHeight));
  for (const re of [/Warum|Why|Por qu/i, /gegessen|eaten|comido/i, /Wagen|cart|carrito/i]) {
    const b = P.locator('#b3Cam button').filter({ hasText: re }).first();
    if (!await b.count()) { console.log('NO BUTTON', re); continue; }
    await b.evaluate(e => e.scrollIntoView({ block: 'center' })); await H.sleep(400);
    const cov = await b.evaluate(e => { const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { top: Math.round(r.top), h: Math.round(r.height), hit: t ? (t === e || e.contains(t) ? 'self' : (t.id || String(t.className).slice(0, 40)) + ' / ' + (t.innerText || '').slice(0, 30)) : 'none' }; });
    console.log('COVER', re, JSON.stringify(cov));
  }
  const w = P.locator('#b3Cam button').filter({ hasText: /Warum|Why|Por qu/i }).first();
  if (await w.count()) { const b0 = await snap('b'); await R.tapEl(w); await H.sleep(1500); const a = await snap('after why'); console.log('WHY', a.t === b0.t ? 'NO CHANGE' : 'changed', JSON.stringify(a).slice(0, 500)); await R.shot(path.join(out, tag + '-1-why.png')); const top = await P.evaluate(() => { const o = [...document.querySelectorAll('.r2-ov.on,[role=dialog]')].filter(e => e.getBoundingClientRect().height > 0); return o.map(e => e.id || e.className).slice(-3); }); console.log('TOP', JSON.stringify(top)); }
  console.log('ERRS', JSON.stringify(R.errs), 'build', build, 'crashed', R.crashed);
  await R.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
