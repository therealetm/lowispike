'use strict';
/* Bug hunt 2026-10-25 05:01: Gap "After your meal" card arrows and Fuel stats > Log food, real taps on the live site.
   node tools/hunt-gap-arrows-0501.cjs <device> <lang> [url] */
const H = require('./sim/harness.cjs');
const dev = process.argv[2] || 'Pixel 7', lang = process.argv[3] || 'es';
const url = process.argv[4] || 'https://therealetm.github.io/lowispike/index.html';
(async () => {
  const R = await H.open({ device: dev, engine: 'webkit', probe: false, url, lang }); const P = R.page; const errs = [];
  P.on('pageerror', e => errs.push(String(e && e.message || e)));
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
  await R.goto(); await H.sleep(8000);
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); });
  const tap = async sel => { const sc = await P.evaluate(s => { const e = [...document.querySelectorAll(s)].filter(x => { const r = x.getBoundingClientRect(); return r.width; }).pop(); if (!e) return null; e.scrollIntoView({ block: 'center' }); return 1; }, sel); if (!sc) return 'missing'; await H.sleep(400); const sc2 = await P.evaluate(s => { const e = [...document.querySelectorAll(s)].filter(x => x.getBoundingClientRect().width).pop(); const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return [r.left + r.width / 2, r.top + r.height / 2, !!(t && (t === e || e.contains(t))), e.disabled]; }, sel); await P.touchscreen.tap(sc2[0], sc2[1]); await H.sleep(700); return sc2[2] ? (sc2[3] ? 'disabled' : 'ok') : 'covered'; };
  const card = () => P.evaluate(() => { const p = document.querySelector('[data-gv="mcprev"]'), n = document.querySelector('[data-gv="mcnext"]'); const on = [...document.querySelectorAll('[aria-pressed="true"],[aria-current],[aria-selected="true"]')].filter(e => e.closest('#gvSheet,.gv-sheet,[id^=gv]')).map(e => (e.getAttribute('aria-label') || e.textContent).trim().slice(0, 40)); const h = document.querySelector('.mc-title,.mc-h,.mc-card h3,.mc-card h4'); return { prevDis: p && p.disabled, nextDis: n && n.disabled, on, h: h && h.textContent.trim().slice(0, 50) }; });
  const out = { dev, lang, steps: [] };
  out.steps.push(['tap gap', await tap('[data-orbit="gap"]')]); await H.sleep(1500);
  out.steps.push(['open', await card()]);
  for (const a of ['mcnext', 'mcnext', 'mcprev', 'mcprev', 'mcprev']) { out.steps.push([a, await tap('[data-gv="' + a + '"]'), await card()]); }
  out.errs = errs; console.log(JSON.stringify(out, null, 1));
  await R.close?.(); process.exit(0);
})().catch(e => { console.log('BROKEN', e && e.message); process.exit(1); });
