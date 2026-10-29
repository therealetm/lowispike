'use strict';
/* Bug hunt 13:02: dump the Home bubbles (data-orbit) on the live site, where they are and what covers their centre.
   node tools/hunt-home-orbits-1302.cjs <device> [lang] [url] */
const H = require('./sim/harness.cjs');
(async () => {
  const A = process.argv.slice(2), device = A[0] || 'iPhone 13', lang = A[1] || 'en';
  const url = A[2] || 'https://therealetm.github.io/lowispike/index.html';
  const R = await H.open({ device, engine: /Pixel/.test(device) ? 'chromium' : 'webkit', url, probe: false, lang, members: 5, messages: 5 });
  await R.ctx.addInitScript(([l]) => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [lang]);
  const P = R.page; const errs = []; P.on('pageerror', e => errs.push(String(e.message).slice(0, 200)));
  await R.goto(); await H.sleep(6000);
  const d = await P.evaluate(() => ({
    build: (document.querySelector('meta[name="lowi-build"]') || {}).content,
    vw: innerWidth, vh: innerHeight,
    tops: [...document.querySelectorAll('.r2-ov, [role=dialog], [id$="Ov"]')].filter(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; }).map(e => (e.id || String(e.className)).slice(0, 50) + ' :: ' + (e.innerText || '').replace(/\s+/g, ' ').slice(0, 120)),
    orbits: [...document.querySelectorAll('[data-orbit]')].map(e => { const r = e.getBoundingClientRect(); const t = r.width ? document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) : null; return { k: e.getAttribute('data-orbit'), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), hit: t ? (t === e || e.contains(t) ? 'self' : (t.id || t.className || t.tagName).toString().slice(0, 60)) : null, txt: (e.innerText || '').replace(/\s+/g, ' ').slice(0, 40) }; })
  }));
  console.log(JSON.stringify(d, null, 1));
  await P.screenshot({ path: '/tmp/hfg13/home-' + device.replace(/\W/g, '') + '-' + lang + '.png' });
  console.log('errs', JSON.stringify(errs)); await R.close(); process.exit(0);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
