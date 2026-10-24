'use strict';
/* Bug hunt 24 Oct 21:02: geometry of a Cook tile sheet (sheet box, scrim, transform, each control's box and what is on top of
   its middle) at 1 s, 3 s and 6 s after a real tap. node tools/hunt-cook-geo-2102.cjs <device> <tileRegex> [url|root] [lang] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone SE', tre = new RegExp(process.argv[3] || 'LOWiSPIKE GPT'), where = process.argv[4] || 'https://therealetm.github.io/lowispike/index.html', lang = process.argv[5] || 'es';
  const o = { device, engine: 'webkit', members: 6, messages: 6, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page;
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
  await R.goto(); await H.sleep(5000);
  await P.evaluate(() => { try { goTab('shelf'); } catch (e) { } }); await H.sleep(1500);
  const l = P.locator('#tab-shelf button, #tab-shelf [role=button], #tab-shelf [data-ck]').filter({ hasText: tre }).first();
  await l.evaluate(e => e.scrollIntoView({ block: 'center' })); await H.sleep(500); await R.tapEl(l);
  for (const t of [1000, 2000, 3000]) {
    await H.sleep(t);
    const g = await P.evaluate(() => { const ov = [...document.querySelectorAll('.r2-ov.on')].pop(); if (!ov) return null; const sh = ov.querySelector('.r2-sh'), sc = ov.querySelector('.r2-scrim'); const box = e => { if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; }; const cs = sh ? getComputedStyle(sh) : {}; return { vh: innerHeight, ov: box(ov), sh: box(sh), shTransform: cs.transform, shOverflow: cs.overflowY, shMaxH: cs.maxHeight, scroll: sh ? [sh.scrollTop, sh.scrollHeight, sh.clientHeight] : null, scrim: box(sc), ctrls: [...ov.querySelectorAll('button,[role=button],a[href]')].map(b => { const r = b.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { t: (b.textContent || b.getAttribute('aria-label') || '').trim().slice(0, 30), box: box(b), top: top ? (top.id || String(top.className).slice(0, 40)) : null, z: getComputedStyle(b).zIndex }; }) }; });
    console.log(JSON.stringify(g));
  }
  await R.shot('/tmp/hunt2102/geo-' + device.replace(/[^a-z0-9]/gi, '') + '.png');
  console.log('errs', JSON.stringify(R.errs));
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
