'use strict';
/* Bug hunt 29 Oct 11:02: geometry of the fresh Scan sheet (photo buttons vs barcode / name rows) per device, and what a tap
   at the centre of each control actually hits. node tools/hunt-scan-geom-1102.cjs <device> [url] [lang] [outdir] */
const H = require('./sim/harness.cjs'), fs = require('fs'), path = require('path');
(async () => {
  const device = process.argv[2] || 'iPhone SE', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html';
  const lang = process.argv[4] || 'de', out = process.argv[5] || '/tmp/hunt-sg'; fs.mkdirSync(out, { recursive: true });
  const o = { device, engine: process.env.ENGINE || 'webkit', members: 10, messages: 20, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = device.replace(/\W/g, '') + '-' + lang;
  await R.ctx.addInitScript(([l]) => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [lang]);
  await R.goto(); await H.sleep(5000);
  const sc = await P.evaluate(() => { const e = document.querySelector('[data-orbit="scan"]'); const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await P.touchscreen.tap(sc[0], sc[1]); await H.sleep(Number(process.env.WAIT || 2500));
  const g = () => P.evaluate(() => { const s = document.getElementById('b3Cam'); return [...s.querySelectorAll('button,input')].filter(b => { const r = b.getBoundingClientRect(); return r.height > 0 && getComputedStyle(b).visibility !== 'hidden'; }).map(b => { const r = b.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); const hit = !t ? 'none' : (t === b || b.contains(t)) ? 'self' : ((t.closest('button') || t).getAttribute('aria-label') || (t.closest('button') || t).innerText || t.className || '').toString().replace(/\s+/g, ' ').slice(0, 30); return { l: (b.getAttribute('aria-label') || b.placeholder || b.innerText).replace(/\s+/g, ' ').trim().slice(0, 28), y: Math.round(r.top) + '-' + Math.round(r.bottom), hit }; }); });
  console.log(device, lang, 'vh', await P.evaluate(() => innerHeight), JSON.stringify(await g()));
  await R.shot(path.join(out, tag + '-fresh.png'));
  await H.sleep(3000); console.log('after +3s', JSON.stringify(await g()));
  await R.shot(path.join(out, tag + '-fresh3.png'));
  const scr = await P.evaluate(() => { const s = document.getElementById('b3Cam'); const out = []; let e = s.querySelector('.b3-ctype'); while (e && e !== document.body) { const cs = getComputedStyle(e); if (/auto|scroll/.test(cs.overflowY) || cs.position !== 'static' || cs.transform !== 'none') out.push((e.id || String(e.className).slice(0, 40)) + ' ov=' + cs.overflowY + ' pos=' + cs.position + ' tf=' + (cs.transform === 'none' ? '' : cs.transform.slice(0, 40)) + ' sh=' + e.scrollHeight + ' ch=' + e.clientHeight + ' st=' + e.scrollTop); e = e.parentElement; } return out; });
  console.log('ANCESTORS', JSON.stringify(scr, null, 1));
  console.log('ERRS', JSON.stringify(R.errs));
  await R.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
