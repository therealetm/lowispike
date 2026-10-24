'use strict';
/* Bug hunt 2026-10-24 09:02: what each Home ring bubble really shows (innerText, visible children) per language. node tools/hunt-home-ring-text.cjs <device> <lang> [theme] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone SE', lang = process.argv[3] || 'es', theme = process.argv[4] || 'dark';
  const R = await H.open({ device, engine: /Pixel/.test(device) ? 'chromium' : 'webkit', url: 'https://therealetm.github.io/lowispike/index.html', probe: false, lang, members: 5, messages: 5 });
  await R.ctx.addInitScript(([l, t]) => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); localStorage.setItem('lowi.theme', t); } catch (e) { } }, [lang, theme]);
  const P = R.page; await R.goto(); await H.sleep(8000);
  const d = await P.evaluate(() => [...document.querySelectorAll('[data-orbit]')].map(b => { const r = b.getBoundingClientRect(); const over = [...b.querySelectorAll('*')].filter(e => e.scrollWidth > e.clientWidth + 2 && e.clientWidth > 0 && getComputedStyle(e).overflow !== 'visible').map(e => e.className).slice(0, 2); return { o: b.dataset.orbit, txt: b.innerText.replace(/\s+/g, ' ').trim(), aria: b.getAttribute('aria-label'), box: [Math.round(r.x), Math.round(r.y), Math.round(r.width)], over }; }));
  console.log(JSON.stringify({ device, lang, d }));
  await R.shot('/tmp/hunt0902/ring-' + device.replace(/\W/g, '') + '-' + lang + '.png');
  console.log('ERRS', R.errs.length, JSON.stringify(R.errs.slice(0, 3).map(e => e.m.slice(0, 120))));
  await R.close().catch(() => { }); process.exit(0);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
