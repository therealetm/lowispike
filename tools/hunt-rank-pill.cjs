'use strict';
/* Probe: tap the rank pill in Misty's card (live), like a finger. Expect: the card closes, Community opens on Ranking with
   Your place visible. node tools/hunt-rank-pill.cjs <device> [lang] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone 13', lang = process.argv[3] || 'en', url = process.argv[4] || 'https://therealetm.github.io/lowispike/index.html';
  const o = { device, engine: /Pixel/.test(device) ? 'chromium' : 'webkit', members: 10, messages: 20, probe: false, lang }; if (/^https?:/.test(url)) o.url = url; else o.root = url;
  const R = await H.open(o);
  const P = R.page; await R.goto(); await H.sleep(5000);
  const st = () => P.evaluate(() => { const hub = [...document.querySelectorAll('#mistyHub')].find(e => !e.closest('.r2-ov.off')); const ov = hub && hub.closest('.r2-ov'); const rk = document.querySelector('.rk'); const me = document.querySelector('.rk .rk-me'); const act = document.querySelector('.tab.on,[data-tab].on,.nav .on'); let view = null; try { view = LowiRoomsUI.view(); } catch (e) { } return { build: (document.querySelector('meta[name="lowi-build"]') || {}).content, hubOpen: !!(ov && ov.classList.contains('on')), pill: !!document.querySelector('#mistyHub [data-mhrk]'), rkVisible: !!(rk && rk.getClientRects().length), meVisible: !!(me && me.getClientRects().length), view, tab: act ? (act.dataset.tab || act.id || act.textContent.trim().slice(0, 20)) : null }; });
  await P.evaluate(() => LowiMistyHub.open()); await H.sleep(3500);
  const out = { device, lang, before: await st() };
  const pos = await P.evaluate(() => { const b = document.querySelector('#mistyHub [data-mhrk]'); if (!b) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const t = document.elementFromPoint(x, y); return { x, y, top: t ? (t.className || t.tagName) + '' : null, hit: !!t && (t === b || b.contains(t)) }; });
  out.pos = pos; await H.sleep(600);
  await P.evaluate(() => { window.__clk = []; document.addEventListener('click', e => window.__clk.push((e.target.className || e.target.tagName) + ''), true); window.__ce = []; const oe = console.error; });
  if (pos) await P.touchscreen.tap(pos.x, pos.y);
  for (const t of [300, 1200, 2500]) { await H.sleep(t === 300 ? 300 : t - 300); out['after' + t] = await st(); }
  out.clicks = await P.evaluate(() => window.__clk);
  await P.screenshot({ path: '/tmp/h17/rank-' + device.replace(/\W/g, '') + '-' + lang + '.png' });
  out.errs = R.errs; console.log(JSON.stringify(out, null, 1)); await R.close().catch(() => { }); process.exit(0);
})().catch(e => { console.log('ERR', e && e.stack); process.exit(1); });
