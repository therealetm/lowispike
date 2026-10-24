'use strict';
/* Bug hunt 13:02 (Scan): after a barcode result, can a user reach and tap Add to bucket / Skip (and the not-found card's last button)?
   Fresh result, no other taps first. Prints rects vs the viewport, scrolls the sheet, then lists what is hittable.
   node tools/hunt-scan-reach-1302.cjs <device> [url|root] [lang] [code] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'Pixel 7', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html', lang = process.argv[4] || 'en', code = process.argv[5] || '3017620422003';
  const o = { device, engine: 'webkit', members: 10, messages: 20, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page;
  await R.ctx.route(u => /(^|\.)openfoodfacts\.org$/.test(new URL(u).host), r => r.request().method() === 'GET' ? r.continue() : r.abort());
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
  await R.goto(); await H.sleep(5000);
  console.log('build', await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content));
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { goTab('home'); } catch (e) { } }); await H.sleep(900);
  for (let i = 0; i < 4; i++) { const sc = await P.evaluate(() => { const e = document.querySelector('[data-orbit="scan"]'); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); if (sc) await P.touchscreen.tap(sc[0], sc[1]); if (await P.waitForFunction(() => { const e = document.getElementById('b3Cam'); return e && e.getBoundingClientRect().height > 0; }, null, { timeout: 8000 }).then(() => true, () => false)) break; await H.sleep(1500); }
  await H.sleep(800);
  const inp = P.locator('#b3Cam input').first();
  if (!await inp.isVisible().catch(() => false)) { const t = P.locator('#b3Cam').getByText(/Type the number|Nummer|Escribe/i).first(); if (await t.count()) { await R.tapEl(t).catch(() => { }); await H.sleep(500); } }
  await inp.tap().catch(() => { }); await P.keyboard.type(code, { delay: 30 }); await P.keyboard.press('Enter'); await H.sleep(10000);
  const info = () => P.evaluate(() => {
    const out = { vh: innerHeight, items: [] };
    document.querySelectorAll('.r2-ov.on button, .r2-ov.on a').forEach(b => { const r = b.getBoundingClientRect(); if (r.width < 2) return; const t = (b.innerText || b.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); out.items.push([t, Math.round(r.top), Math.round(r.bottom), hit ? (hit === b || b.contains(hit) ? 'ok' : (hit.id || String(hit.className).slice(0, 30))) : 'none']); });
    out.scrollers = [...document.querySelectorAll('.r2-ov.on *')].filter(e => e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY)).map(e => (e.id || String(e.className).slice(0, 30)) + ' ' + e.scrollTop + '/' + (e.scrollHeight - e.clientHeight));
    return out; });
  console.log(JSON.stringify(await info()));
  for (let i = 0; i < 4; i++) { await P.evaluate(() => { const s = [...document.querySelectorAll('.r2-ov.on *')].find(e => e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY)); if (s) s.scrollTop += 500; }); await H.sleep(500); }
  console.log('after scroll', JSON.stringify(await info()));
  await R.shot('/tmp/h1302/reach-' + device.replace(/\W/g, '') + '-' + lang + '.png');
  console.log('errs', JSON.stringify(R.errs), 'crashed', R.crashed);
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
