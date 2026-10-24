'use strict';
/* Bug hunt 15:02: in the real Scan sheet, type a food name into the camera's name field (Enter = the full result) and read
   the verdict and the Best swap row. Spanish typed names had a verdict but no Best swap.
   node tools/hunt-es-swap-1502.cjs <device> [url|root] [lang] [outdir] name1 name2 ... */
const H = require('./sim/harness.cjs'), fs = require('fs'), path = require('path');
(async () => {
  const A = process.argv.slice(2), device = A[0] || 'iPhone 15', where = A[1] || 'https://therealetm.github.io/lowispike/index.html', lang = A[2] || 'es', out = A[3] || '/tmp/hunt-es-swap';
  const names = A.slice(4).length ? A.slice(4) : ['palomitas', 'barrita de proteína', 'espaguetis', 'batata', 'cruasán'];
  fs.mkdirSync(out, { recursive: true });
  const o = { device, engine: process.env.ENG || 'webkit', members: 6, messages: 6, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page;
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
  await R.goto(); await H.sleep(5000);
  console.log('build', await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content), device, lang);
  const reset = async () => { for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape').catch(() => { }); await H.sleep(100); } await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { goTab('home'); } catch (e) { } }); await H.sleep(600); };
  let bad = 0;
  for (const q of names) {
    await reset(); await P.evaluate(() => { try { LowiDex.scan(); } catch (e) { } }); await H.sleep(1500);
    const f = P.locator('#b3Cam #b3Nm').first();
    if (!await f.count()) { console.log('NOFIELD', q); bad++; continue; }
    await f.tap().catch(() => { }); await f.fill(''); await P.keyboard.type(q, { delay: 25 }); await H.sleep(700); await P.keyboard.press('Enter'); await H.sleep(5000);
    const s = await P.evaluate(() => { const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }; const top = [...document.querySelectorAll('.r2-ov:not(.off)')].filter(vis).pop() || document.body; const v = top.querySelector('.sc-verd'); const sw = top.querySelector('.ne-swap'); return { verd: v ? v.className : '', swap: sw ? sw.innerText.replace(/\s+/g, ' ') : '' }; });
    await R.shot(path.join(out, device.replace(/\W/g, '') + '-' + lang + '-' + q.replace(/\W+/g, '_') + '.png'));
    console.log('CASE', q, '| verd=', s.verd, '| swap=', s.swap || '(none)');
    if (!s.swap) bad++;
  }
  console.log('missing swaps', bad, 'errs', JSON.stringify(R.errs).slice(0, 500));
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
